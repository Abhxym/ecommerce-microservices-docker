# E-Commerce Marketplace: Microservices with Docker

Case Study 9. A marketplace built from three services and a shared MySQL database, containerized with Docker and run with Docker Compose.

| Service | Stack | Port |
|---|---|---|
| user-service | Java 21, Spring Boot 3 | 8081 |
| product-service | Node.js 20, Express | 8082 |
| inventory-service | Python 3.12, Flask | 8083 |
| mysql | MySQL 8.0 | 3306 |

```
user-service/        Spring Boot service
product-service/     Node.js service (calls inventory-service)
inventory-service/   Flask service
db/init.sql          tables and sample data
docker-compose.yml   all services, network, volume, healthchecks
docs/api-contract.md endpoints and JSON for every service
```

## Run

```bash
cp .env.example .env        # then set the passwords
docker compose up -d
docker compose ps
```

## Case study questions

1. Dockerfiles for the three services
2. Docker Compose with service dependencies
3. Fix: product-service cannot connect to inventory-service
4. Upgrade MySQL without losing data

## How we work

- `main` is protected. Every change comes through a pull request with one approval.
- One branch per feature: `feature/<service>-<topic>`, for example `feature/user-service-api`.
- Each member changes only their own service folder (and their own block in `docker-compose.yml`).
- Pull `main` before starting a new branch.
