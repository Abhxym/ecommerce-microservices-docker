# API contract

All services read their database settings from environment variables
(`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, see `.env.example`).
Inside Docker Compose, services reach each other by **service name**, never `localhost`.

| Service | Folder | Stack | Port | Health endpoint |
|---|---|---|---|---|
| user-service | `user-service/` | Java 21, Spring Boot 3 | 8081 | `GET /actuator/health` |
| product-service | `product-service/` | Node.js 20, Express | 8082 | `GET /health` |
| inventory-service | `inventory-service/` | Python 3.12, Flask | 8083 | `GET /health` |
| order-service | `order-service/` | Node.js 20, Express | 8085 | `GET /health` |
| mysql | - | MySQL 8.4 | 3306 (host 3307) | `mysqladmin ping` |

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
| POST | `/api/inventory/{productId}/reserve` | `{"quantity": 2}` | `200` stock after reserving, `409` `{"error","available"}` if not enough, `400`, `404` |
| POST | `/api/inventory/{productId}/release` | `{"quantity": 2}` | `200` stock after giving it back, `400`, `404` |

`reserve` and `release` are used by order-service. `reserve` is one SQL statement
(`UPDATE ... SET quantity = quantity - n WHERE product_id = ? AND quantity >= n`), so two orders can never take the same units.

Stock JSON:
```json
{ "productId": 1, "quantity": 120, "warehouse": "Pune", "inStock": true }
```

## order-service (8085)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/orders` | `{"userId": 1, "items": [{"productId": 1, "quantity": 2}]}` | `201` order, `400` invalid or unknown user/product, `409` not enough stock, `503` a service is down |
| GET | `/api/orders?userId={id}` | - | `200` orders of the user, newest first (max 50) |
| GET | `/api/orders/{id}` | - | `200` order, `404` |
| POST | `/api/orders/{id}/cancel` | - | `200` cancelled order (stock given back), `409` if already cancelled, `404` |

Order JSON:
```json
{ "id": 2, "userId": 1, "status": "CONFIRMED",
  "items": [ { "productId": 1, "name": "Cotton T-Shirt", "price": 499, "quantity": 2, "lineTotal": 998 } ],
  "itemTotal": 998, "handlingFee": 5, "deliveryFee": 0, "grandTotal": 1003,
  "deliveryCity": "Pune", "createdAt": "2026-11-02T08:17:24.000Z" }
```

Rules:
- The client sends only product ids and quantities. Names and prices come from product-service, so a client cannot change a price.
- At most 10 of one product per order. The same product listed twice is merged into one line.
- Charges: handling Rs. 5, delivery Rs. 30, free delivery from Rs. 499 of items.
- Placing an order is a small **Saga**: check user, read prices, reserve stock item by item, save. If an item cannot be
  reserved or saving fails, everything already reserved is released again.
- Statuses: `CONFIRMED`, `CANCELLED`.

## Database tables

Defined in `db/init.sql`: `users` (user-service), `products` (product-service), `inventory` (inventory-service), `orders` and `order_items` (order-service).
Each service only reads and writes its own table.
