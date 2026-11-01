# user-service

Java 21, Spring Boot 3. Port 8081. Table: `users`.

See `docs/api-contract.md` for the endpoints. Work arrives through pull requests:

1. REST API with MySQL (`feature/user-service-api`)
2. Multi-stage Dockerfile (`feature/user-service-docker`)
3. Docker Compose service with healthcheck (`feature/user-service-compose`)
