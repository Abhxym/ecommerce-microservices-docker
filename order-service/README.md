# order-service

Node.js 20, Express. Port 8085. Tables: `orders`, `order_items`.
Endpoints: see the order-service section of `docs/api-contract.md`.

## How an order is placed

```
POST /api/orders  {"userId": 1, "items": [{"productId": 1, "quantity": 2}, ...]}

 1. check the body (ids, quantity 1 to 10, same product merged)
 2. user-service      GET  /api/users/{id}            user exists? delivery city
 3. product-service   GET  /api/products/{id}         real name and price (client price is ignored)
 4. inventory-service POST /api/inventory/{id}/reserve   one item at a time
       409 for an item  -> release the items already reserved, answer 409
 5. MySQL             INSERT orders + order_items in one transaction
       error            -> release all reserved items, answer 500
 6. 201 with the order
```

Steps 4 and 5 are a small **Saga**: there is no transaction across services, so every step that
changed another service has a compensating step (`release`) that runs when a later step fails.

Cancel (`POST /api/orders/{id}/cancel`) changes the status with
`UPDATE ... WHERE status = 'CONFIRMED'`, so an order cannot be cancelled twice, then releases the stock.

## Files

```
src/server.js     starts the server on 0.0.0.0:8085
src/app.js        routes and error handling (400, 404, 409, 503)
src/orders.js     placeOrder (Saga) and cancelOrder
src/clients.js    HTTP calls to user-service, product-service, inventory-service (3 s timeout)
src/db.js         MySQL pool, order saved in one transaction
src/config.js     settings from environment variables, charges
test/orders.test.js  11 tests with fake services and an in-memory database
```

## Run without Docker

The other services and MySQL from `docker compose up -d` must be running.

```bash
npm install
npm test
DB_HOST=127.0.0.1 DB_PORT=3307 DB_PASSWORD=<from .env> \
USER_SERVICE_URL=http://localhost:8081 PRODUCT_SERVICE_URL=http://localhost:8082 \
INVENTORY_SERVICE_URL=http://localhost:8083 npm start
```

```bash
curl -X POST localhost:8085/api/orders -H "Content-Type: application/json" \
  -d '{"userId":1,"items":[{"productId":1,"quantity":2},{"productId":2,"quantity":1}]}'
curl "localhost:8085/api/orders?userId=1"
curl -X POST localhost:8085/api/orders/1/cancel
```

## Existing database

The tables are in `db/init.sql`, which only runs on an empty volume. On a database that already exists:

```bash
docker exec -i marketplace-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < db/migrations/001-orders.sql
```
