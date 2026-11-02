# E-Commerce Marketplace: Microservices with Docker

Case Study 9. A marketplace built from three services and a shared MySQL database, containerized with Docker and run with Docker Compose.

| Service | Stack | Port | Health |
|---|---|---|---|
| user-service | Java 21, Spring Boot 3 | 8081 | `/actuator/health` |
| product-service | Node.js 20, Express | 8082 | `/health` |
| inventory-service | Python 3.12, Flask (gunicorn) | 8083 | `/health` |
| mysql | MySQL 8.4 | 3306 (host 3307) | `mysqladmin ping` |
| web-ui | React 18 (Vite), nginx | 8080 | `/healthz` |

```
user-service/          Spring Boot service, web console at http://localhost:8081
product-service/       Node.js service (calls inventory-service for stock)
inventory-service/     Flask service
web-ui/                React storefront and seller panel, http://localhost:8080
db/init.sql            tables and sample data
db/upgrade/            backup, test, rollback scripts for the MySQL upgrade
docker-compose.yml     all services, network, volume, healthchecks
docs/api-contract.md   endpoints and JSON for every service
docs/q3-connection/    Q3: why product-service could not reach inventory-service
docs/q4-mysql-upgrade.md  Q4: MySQL 8.0 to 8.4 upgrade
```

## Run

```bash
cp .env.example .env        # then set the passwords
docker compose up -d --build
docker compose ps           # all five containers should be (healthy)
```

Open http://localhost:8080 for the storefront. The APIs can also be called directly:

```bash
curl localhost:8081/api/users
curl localhost:8082/api/products/1      # product with stock from inventory-service
curl -X PUT -H "Content-Type: application/json" -d '{"quantity": 50}' localhost:8083/api/inventory/1
```

MySQL tools (Workbench) connect to `127.0.0.1:3307`. Containers use `mysql:3306`.

## Case study questions

| # | Question | Where |
|---|---|---|
| 1 | Dockerfiles for the three services | `user-service/Dockerfile`, `product-service/Dockerfile`, `inventory-service/Dockerfile` |
| 2 | Docker Compose with service dependencies | `docker-compose.yml` |
| 3 | Fix: product-service cannot connect to inventory-service | `docs/q3-connection/` |
| 4 | Upgrade MySQL without losing data | `docs/q4-mysql-upgrade.md`, `db/upgrade/` |

All three Dockerfiles are multi-stage, run the tests during the build, run as a non-root user and have a `HEALTHCHECK`.

Startup order in Compose (each step waits for `service_healthy`):

```
mysql  ->  user-service -------------------------------+
       ->  inventory-service  ->  product-service  ->  web-ui
```

All services are on the `marketplace-net` network and MySQL data is in the `mysql-data` volume.
Do not use `docker compose down -v`, it deletes the data volume.

## How we work

- Every change comes through a pull request into `main`, reviewed before merging.
- One branch per feature: `feature/<service>-<topic>`, for example `feature/user-service-api`.
- Each member changes only their own service folder (and their own block in `docker-compose.yml`).
- Pull `main` before starting a new branch.
