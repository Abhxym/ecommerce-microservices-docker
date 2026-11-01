# product-service

Node.js 20, Express. Port 8082. Table: `products`.
Calls inventory-service for stock (`INVENTORY_URL`, default `http://inventory-service:8083`).

See `docs/api-contract.md` for the endpoints. Work arrives through pull requests:

1. REST API with MySQL and the inventory call (`feature/product-service-api`)
2. Multi-stage Dockerfile (`feature/product-service-docker`)
3. Docker Compose service with healthcheck (`feature/product-service-compose`)
