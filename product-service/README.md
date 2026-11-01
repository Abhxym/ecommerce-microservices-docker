# product-service

Node.js 20, Express. Port 8082. Table: `products`.
Calls inventory-service for stock (`INVENTORY_URL`, default `http://inventory-service:8083`).

See `docs/api-contract.md` for the endpoints. Work arrives through pull requests:

1. REST API with MySQL and the inventory call (`feature/product-service-api`)
2. Multi-stage Dockerfile (`feature/product-service-docker`)
3. Docker Compose service with healthcheck (`feature/product-service-compose`)

## Files

```
src/server.js           starts the server on 0.0.0.0:8082
src/app.js              routes: /health, /api/products, /api/products/:id
src/db.js               MySQL pool (mysql2)
src/inventoryClient.js  calls inventory-service, returns null if it cannot be reached
src/config.js           settings from environment variables
test/app.test.js        tests with a fake database and fake inventory
```

## Run without Docker

MySQL from `docker compose up -d mysql` is on host port 3307.

```bash
npm install
npm test
DB_HOST=127.0.0.1 DB_PORT=3307 DB_PASSWORD=<from .env> INVENTORY_URL=http://localhost:8083 npm start
curl localhost:8082/health
curl localhost:8082/api/products/1
```

| Variable | Default |
|---|---|
| `PORT` | `8082` |
| `DB_HOST` / `DB_PORT` | `localhost` / `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `marketplace` / `marketplace` / empty |
| `INVENTORY_URL` | `http://inventory-service:8083` |
| `INVENTORY_TIMEOUT_MS` | `2000` |
