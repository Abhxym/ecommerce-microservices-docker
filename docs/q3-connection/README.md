# Q3: product-service fails to connect to inventory-service

## Symptom

`GET /api/products/{id}` returns the product with `"stock": null`, and the product-service log shows:

```
cannot reach inventory-service at http://.../api/inventory/1 (attempt 3/3): ECONNREFUSED
```

product-service does not crash (it returns the product without stock), so the problem is easy to miss.
Every cause below was reproduced with a small Compose override file in this folder.

## How to reproduce a cause

```bash
docker compose -f docker-compose.yml -f docs/q3-connection/broken-1-localhost.yml up -d inventory-service product-service
curl localhost:8082/api/products/1          # "stock": null
docker logs product-service --tail 3        # the error
docker compose up -d                        # back to the working setup
```

## Causes and fixes

| # | Override file | Cause | What we saw | Fix |
|---|---|---|---|---|
| 1 | `broken-1-localhost.yml` | `INVENTORY_URL=http://localhost:8083` | `ECONNREFUSED` on `localhost:8083` | Use the service name: `http://inventory-service:8083`. In a container `localhost` is the container itself. |
| 2 | `broken-2-bind-127.yml` | Flask/gunicorn bound to `127.0.0.1` | `ECONNREFUSED`, but the inventory container still shows **healthy** | Bind to `0.0.0.0` (`HOST=0.0.0.0` in `gunicorn.conf.py` and Compose). |
| 3 | `broken-3-network.yml` | inventory-service on another network | DNS fails: `nslookup inventory-service` gives `NXDOMAIN`, requests time out | Put both services on `marketplace-net`. |
| 4 | `broken-4-port.yml` | Wrong port (`5000`, the Flask default) | `ECONNREFUSED` on `inventory-service:5000` | Use port `8083`, the port in the API contract and `EXPOSE`. |
| 5 | `broken-5-startup-order.yml` | No `depends_on` on inventory-service, no retry | During an inventory restart: `ECONNRESET`, `"stock": null` | `depends_on: inventory-service: condition: service_healthy` plus 3 attempts with a short delay in `inventoryClient.js`. |

### Why cause 2 is tricky

The healthcheck runs **inside** the inventory container, where `127.0.0.1` works:

```
$ docker exec inventory-service python -c "...urlopen('http://127.0.0.1:8083/health')..."
{"status":"UP"}
$ docker logs inventory-service | grep Listening
[INFO] Listening at: http://127.0.0.1:8083
$ docker compose ps inventory-service
Up 20 seconds (healthy)
```

So Docker reports the container as healthy, but other containers get `ECONNREFUSED`.
Check the address in the "Listening at" log line.

### Cause 3 in detail

```
$ docker exec product-service nslookup inventory-service
** server can't find inventory-service: NXDOMAIN
$ docker inspect inventory-service --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
marketplace_isolated-net
$ docker inspect product-service ...
marketplace_marketplace-net
```

After the fix both containers are on `marketplace_marketplace-net` and `nslookup` returns the container IP.

### Cause 5: startup order and retry

Without the fix (1 attempt, no dependency), a request during an inventory restart fails:

```
"stock":null
cannot reach inventory-service ... (attempt 1/1): ECONNRESET
```

With the fix, the third attempt succeeds:

```
"stock":{"quantity":120,"warehouse":"Pune","inStock":true}
cannot reach inventory-service ... (attempt 1/3): ECONNRESET
cannot reach inventory-service ... (attempt 2/3): The operation was aborted due to timeout
```

And `docker compose up -d` starts the containers in the right order:

```
Container marketplace-mysql  Healthy
Container user-service  Started
Container inventory-service  Started
Container inventory-service  Waiting
Container inventory-service  Healthy
Container product-service  Started
```

## Checklist for "service A cannot reach service B"

1. Does A use B's **service name**, not `localhost`? (`docker exec A env | grep URL`)
2. Does B listen on **0.0.0.0**? (look for the "Listening at" line in B's log)
3. Are A and B on the **same network**? (`docker exec A nslookup B`)
4. Is the **port** the one B listens on? (`docker compose ps`, `EXPOSE` in B's Dockerfile)
5. Is B **healthy before A starts**, and does A **retry**? (`depends_on: condition: service_healthy`)
