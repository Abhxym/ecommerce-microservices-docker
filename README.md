# E-Commerce Marketplace: Microservices with Docker

**Case Study 9**: A polyglot microservices marketplace built from three distinct services and a shared MySQL database, containerized with Docker, orchestrated with Docker Compose, and designed for cloud-native DevOps practices.

---

## Service Overview & Implementation Status

| Service | Technology Stack | Port | Status | Responsibility |
|---|---|---|---|---|
| **`user-service`** | Java 21, Spring Boot 3 | `8081` | ✅ **Completed** | User profiles, registration, duplicate checks & Web Console UI |
| **`product-service`** | Node.js 20, Express | `8082` | ✅ **Completed** | Product catalog & aggregator (calls inventory-service for stock) |
| **`inventory-service`** | Python 3.12, Flask | `8083` | ⏳ **To Do** | Warehouse stock tracking & stock updates |
| **`mysql`** | MySQL 8.0 / 8.4 | `3306` (host: `3307`) | ✅ **Configured** | Shared relational persistence with schema isolation |

```
ecommerce-microservices-docker-main/
├── user-service/        # [COMPLETED] Spring Boot 3 REST API, Actuator, Web UI & Dockerfile
├── product-service/     # [COMPLETED] Node.js 20 Express service (calls inventory-service)
├── inventory-service/   # [TO DO] Python 3.12 Flask service (stock tracking)
├── db/init.sql          # Shared database schema, tables & seed data
├── docker-compose.yml   # Multi-container orchestration, healthchecks & bridge network
├── docs/api-contract.md # Unified REST API contract and JSON schemas
└── .env.example         # Environment variables template
```

---

## What Has Been Done: Detailed Breakdown

### 1. `user-service` (Java 21, Spring Boot 3) — Completed
* **Complete REST Architecture**:
  * `GET /actuator/health`: Spring Actuator health endpoint verifying service and database status.
  * `GET /api/users`: Fetches all marketplace users from MySQL.
  * `GET /api/users/{id}`: Fetches individual user profiles with `404 Not Found` handling.
  * `POST /api/users`: Creates users with `@NotBlank` and `@Email` validation (`400 Bad Request`) and duplicate email conflict protection (`409 Conflict`).
* **Built-in Web Console UI** (`http://localhost:8081`): Interactive browser interface to view live database records, monitor health, submit users, and review Postman/cURL snippets.
* **Testing & Tools**:
  * Unit and integration test suite (`UserControllerTest.java`) with MockMvc.
  * Ready-to-import Postman collection (`user-service.postman_collection.json`).
* **Containerization**:
  * 2-stage multi-stage `Dockerfile` (Maven build $\rightarrow$ Eclipse Temurin 21 JRE Alpine runtime with non-root user).
  * Wired into `docker-compose.yml` with healthcheck dependencies.

### 2. `product-service` (Node.js 20, Express) — Completed
* **Product Catalog & Aggregator API**:
  * `GET /health`: Healthcheck verifying connection to MySQL.
  * `GET /api/products`: Lists products.
  * `GET /api/products/:id`: Retrieves product and queries `inventory-service` (`INVENTORY_URL`) to stitch real-time stock details.
* **Resilience Pattern**:
  * Implemented in `src/inventoryClient.js` with a 2-second timeout (`AbortSignal.timeout`).
  * If `inventory-service` is offline or unreachable, the error is handled gracefully: the product is returned with `"stock": null` instead of crashing.
* **Containerization & Tests**:
  * 3-stage multi-stage `Dockerfile` (build + test stage $\rightarrow$ production deps $\rightarrow$ node:20-alpine runtime).
  * Unit tests in `test/app.test.js` using Node's native test runner (`node --test`).
  * Wired into `docker-compose.yml`.

---

## What Has to Be Done for Each Service: Step-by-Step Guide

### A. For `inventory-service` (Python 3.12, Flask) — Task Guide

This service needs to be built to complete the case study. Follow these steps:

1. **Step 1: Set Up Python Project & Dependencies**:
   * Create `requirements.txt`:
     ```text
     Flask==3.0.3
     PyMySQL==1.1.1
     cryptography==42.0.8
     pytest==8.2.2
     ```
2. **Step 2: Database Connection**:
   * Connect to the `inventory` table in the shared `marketplace` database using environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
3. **Step 3: Implement Endpoints According to Contract**:
   * `GET /health`: Checks MySQL connection and returns `{"status": "UP"}` with HTTP 200.
   * `GET /api/inventory/<productId>`:
     * Returns stock JSON:
       ```json
       { "productId": 1, "quantity": 120, "warehouse": "Pune", "inStock": true }
       ```
     * If product ID is not found, return HTTP `404`.
     * Note: `inStock` must be boolean `true` if `quantity > 0`, otherwise `false`.
   * `PUT /api/inventory/<productId>`:
     * Request body: `{"quantity": 50}`.
     * Validate `quantity >= 0` (return HTTP `400` if negative).
     * Update quantity in MySQL and return updated stock JSON.
4. **Step 4: Create Dockerfile**:
   * Base image: `python:3.12-slim`.
   * Install dependencies from `requirements.txt`.
   * Bind Flask/Gunicorn to `0.0.0.0:8083`.
   * Run as non-root user.
   * Add healthcheck `CMD wget -qO- http://127.0.0.1:8083/health || exit 1`.
5. **Step 5: Wire into Docker Compose**:
   * Add `inventory-service` container in `docker-compose.yml` with port `8083:8083` and `depends_on: mysql: condition: service_healthy`.
   * Update `product-service` in `docker-compose.yml` to depend on `inventory-service: condition: service_healthy`.

---

### B. For `product-service` — Verification & Observation

1. **Verify Stock Aggregation**:
   * When `inventory-service` is down: `GET /api/products/1` should return `"stock": null`.
   * When `inventory-service` is up: `GET /api/products/1` should return `"stock": { "quantity": 120, "warehouse": "Pune", "inStock": true }`.
2. **Verify Port & Network Configuration**:
   * Container connects to MySQL using `mysql:3306` inside the Docker network `marketplace-net`.
   * Connects to inventory using `INVENTORY_URL=http://inventory-service:8083`.

---

### C. Case Study Challenge: Fix `product-service` $\rightarrow$ `inventory-service` Connection

* **The Problem**: A common microservice failure occurs when `product-service` tries to call `http://localhost:8083/api/inventory/...`. Inside a container, `localhost` resolves to the container itself, resulting in `ECONNREFUSED`.
* **The Solution**:
  1. Ensure both containers share the bridge network (`marketplace-net`).
  2. Use Docker's built-in DNS service name: `INVENTORY_URL=http://inventory-service:8083`.
  3. Ensure `inventory-service` binds to `0.0.0.0:8083` (not `127.0.0.1`).

---

### D. Case Study Challenge: Zero-Downtime MySQL Upgrade (8.0 $\rightarrow$ 8.4 LTS)

To upgrade MySQL without losing existing data:
1. **Take a logical backup before touching containers**:
   ```bash
   docker exec -i marketplace-mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --all-databases > backup_mysql_8_0.sql
   ```
2. **Stop running containers gracefully**:
   ```bash
   docker compose down
   ```
3. **Update image version in `docker-compose.yml`**:
   Change `image: mysql:8.0` to `image: mysql:8.4`.
4. **Start the upgraded database**:
   ```bash
   docker compose up -d mysql
   ```
5. **Verify data persistence**:
   MySQL 8.4 will automatically read the existing InnoDB data from the named volume `mysql-data` and perform dictionary upgrades without data loss. Check logs with `docker compose logs mysql`.

---

## Quick Start: Running the Current Services

1. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
2. **Start Containers**:
   ```bash
   docker compose up -d --build
   docker compose ps
   ```
3. **Access Services**:
   * **User Service Web Console**: [http://localhost:8081](http://localhost:8081)
   * **Product Catalog API**: [http://localhost:8082/api/products](http://localhost:8082/api/products)
   * **User Service Healthcheck**: [http://localhost:8081/actuator/health](http://localhost:8081/actuator/health)
   * **Product Service Healthcheck**: [http://localhost:8082/health](http://localhost:8082/health)
   * **MySQL Port (Host Tools)**: `127.0.0.1:3307`
