# API contract

All services read their database settings from environment variables
(`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, see `.env.example`).
Inside Docker Compose, services reach each other by **service name**, never `localhost`.

| Service | Folder | Stack | Port | Health endpoint |
|---|---|---|---|---|
| user-service | `user-service/` | Java 21, Spring Boot 3 | 8081 | `GET /actuator/health` |
| product-service | `product-service/` | Node.js 20, Express | 8082 | `GET /health` |
| inventory-service | `inventory-service/` | Python 3.12, Flask | 8083 | `GET /health` |
| mysql | - | MySQL 8.0 | 3306 | `mysqladmin ping` |

Every health endpoint returns HTTP 200 with `{"status": "UP"}` when the service and its database connection work.

## user-service (8081)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/users` | - | `200` list of users |
| GET | `/api/users/{id}` | - | `200` user, `404` if not found |
| POST | `/api/users` | `{"name": "...", "email": "...", "city": "..."}` | `201` created user, `400` if invalid, `409` if email exists |

User JSON:
```json
{ "id": 1, "name": "Priya Sharma", "email": "priya.sharma@example.com", "city": "Pune" }
```

## product-service (8082)

| Method | Path | Response |
|---|---|---|
| GET | `/api/products` | `200` list of products |
| GET | `/api/products/{id}` | `200` product **with stock from inventory-service**, `404` if not found |

Product JSON (`/api/products/{id}`):
```json
{ "id": 1, "sku": "TSH-001", "name": "Cotton T-Shirt", "category": "Clothing", "price": 499.0,
  "seller": "ShopEase", "stock": { "quantity": 120, "warehouse": "Pune", "inStock": true } }
```

product-service calls inventory-service at `INVENTORY_URL` (default `http://inventory-service:8083`).
If inventory-service cannot be reached, it returns the product with `"stock": null` and logs the error
(it must not crash).

## inventory-service (8083)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/inventory/{productId}` | - | `200` stock, `404` if unknown product |
| PUT | `/api/inventory/{productId}` | `{"quantity": 50}` | `200` updated stock, `400` if quantity < 0 |

Stock JSON:
```json
{ "productId": 1, "quantity": 120, "warehouse": "Pune", "inStock": true }
```

## Database tables

Defined in `db/init.sql`: `users` (user-service), `products` (product-service), `inventory` (inventory-service).
Each service only reads and writes its own table.
