# inventory-service

Python 3.12, Flask. Port 8083. Table: `inventory`.

See `docs/api-contract.md` for the endpoints. Work arrives through pull requests:

1. REST API with MySQL (`feature/inventory-service-api`)
2. Dockerfile (`feature/inventory-service-docker`)
3. Docker Compose service with healthcheck (`feature/inventory-service-compose`)
