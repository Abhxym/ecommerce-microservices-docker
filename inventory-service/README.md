# inventory-service

Python 3.12, Flask. Port 8083. Table: `inventory`.

See `docs/api-contract.md` for the endpoints. Work arrives through pull requests:

1. REST API with MySQL (`feature/inventory-service-api`)
2. Dockerfile (`feature/inventory-service-docker`)
3. Docker Compose service with healthcheck (`feature/inventory-service-compose`)

## Files

```
app.py              routes: /health, GET and PUT /api/inventory/<productId>
db.py               MySQL queries (PyMySQL), settings from environment variables
gunicorn.conf.py    production server, binds to HOST:PORT (0.0.0.0:8083)
tests/test_app.py   tests with a fake store, no database needed
requirements.txt    flask, pymysql, gunicorn
requirements-dev.txt  adds pytest
```

## Run without Docker

MySQL from `docker compose up -d mysql` is on host port 3307.

```bash
pip install -r requirements-dev.txt
pytest -q
DB_HOST=127.0.0.1 DB_PORT=3307 DB_PASSWORD=<from .env> python app.py
curl localhost:8083/api/inventory/1
curl -X PUT -H "Content-Type: application/json" -d '{"quantity": 50}' localhost:8083/api/inventory/1
```

| Variable | Default |
|---|---|
| `HOST` | `0.0.0.0` (must not be `127.0.0.1` inside a container) |
| `PORT` | `8083` |
| `DB_HOST` / `DB_PORT` | `localhost` / `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `marketplace` / `marketplace` / empty |
| `WORKERS` | `2` (gunicorn worker processes) |
