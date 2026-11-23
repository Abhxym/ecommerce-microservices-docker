# auth-service

Java 21, Spring Boot 3.3. Port: **8084**. MySQL Table: `credentials`.

The Authentication Service handles user signup, login, and identity verification (`/api/auth/me`) using JWT tokens for the E-Commerce Marketplace.

---

## 1. Features

- **Signup (`POST /api/auth/signup`)**:
  - Checks if the email already exists in `credentials` (returns `409`).
  - Calls `user-service` (`POST /api/users`) to create the profile.
  - Hashes the password with `BCryptPasswordEncoder` (strength 10).
  - Saves the credentials (`user_id`, `email`, `password_hash`, `role`).
  - Generates and returns a signed HS256 JWT token.
- **Login (`POST /api/auth/login`)**:
  - Validates email and password against stored BCrypt hash.
  - Returns `401 {"error": "Invalid email or password"}` on any failure (without disclosing which was wrong).
  - Updates `last_login_at` on successful authentication.
  - Fetches the user profile from `user-service` and returns it with the JWT token.
- **Identity (`GET /api/auth/me`)**:
  - Validates `Authorization: Bearer <token>`.
  - Verifies signature, expiry, and issuer (`shopease-auth`).
  - Returns `{ "user": {...}, "role": "CUSTOMER" }`.
- **Health Check (`GET /actuator/health`)**:
  - Returns `200` `{"status":"UP"}` when both the service and MySQL connection are healthy.
- **Multi-Stage Dockerfile**:
  - Compiles with Maven 3.9 + Temurin 21 Alpine, runs unit tests during the build, and executes as non-root `appuser` on a minimal JRE image.

---

## 2. API Reference

| Method | Path | Request Body / Header | Response |
|---|---|---|---|
| POST | `/api/auth/signup` | `{"name","email","city","password"}` | `201` `{user, role, token, expiresIn}`, `400` invalid, `409` email exists |
| POST | `/api/auth/login` | `{"email","password"}` | `200` `{user, role, token, expiresIn}`, `401` wrong email or password |
| GET | `/api/auth/me` | `Authorization: Bearer <token>` | `200` `{user, role}`, `401` missing, bad or expired token |
| GET | `/actuator/health` | - | `200` `{"status":"UP"}` |

### Response Example (`POST /api/auth/signup` and `POST /api/auth/login`):

```json
{
  "user": {
    "id": 6,
    "name": "Neha Kulkarni",
    "email": "neha.k@example.com",
    "city": "Nashik"
  },
  "role": "CUSTOMER",
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 3600
}
```

---

## 3. Configuration

Configured in `src/main/resources/application.properties`:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8084` | HTTP port |
| `DB_HOST` | `localhost` | MySQL host (`mysql` inside Docker Compose) |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | `marketplace` | Database name |
| `DB_USER` | `marketplace` | Application database user |
| `DB_PASSWORD` | _(none)_ | Must come from environment |
| `USER_SERVICE_URL` | `http://user-service:8081` | URL of `user-service` |
| `JWT_SECRET` | _(none)_ | Secret key (min 32 characters, no default) |
| `JWT_EXPIRY_SECONDS`| `3600` | Token validity in seconds |

---

## 4. How to Test

```bash
# 1. Signup a new user
curl -s -X POST localhost:8084/api/auth/signup -H "Content-Type: application/json" \
  -d '{"name":"Neha Kulkarni","email":"neha.k@example.com","city":"Nashik","password":"Shop2026pass"}'

# 2. Login and extract token
TOKEN=$(curl -s -X POST localhost:8084/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"neha.k@example.com","password":"Shop2026pass"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')

# 3. Check identity
curl -s localhost:8084/api/auth/me -H "Authorization: Bearer $TOKEN"

# 4. Wrong password (expects 401)
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8084/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"neha.k@example.com","password":"wrong123"}'

# 5. Verify BCrypt hash in MySQL
docker exec marketplace-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT user_id, email, LEFT(password_hash,7), role FROM marketplace.credentials" 2>/dev/null'
```

