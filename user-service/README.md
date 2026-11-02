# user-service

**Stack:** Java 21, Spring Boot 3.2.5  
**Port:** `8081`  
**Database Table:** `users` in MySQL `marketplace` database  
**Healthcheck:** `GET /actuator/health`  
**Web Console:** `http://localhost:8081`  

---

## 1. Overview & Purpose

The **User Service** is the user management microservice in the E-Commerce Marketplace architecture. It provides a RESTful interface for registering users, retrieving user profiles, validating input data, and preventing duplicate registrations.

It has been implemented strictly adhering to the marketplace contract defined in [`docs/api-contract.md`](../docs/api-contract.md) and designed to run as a containerized service within the Docker Compose network.

---

## 2. What Has Been Implemented

### A. Core Components & Clean Architecture
```
user-service/
├── src/
│   ├── main/
│   │   ├── java/com/marketplace/userservice/
│   │   │   ├── UserServiceApplication.java       # Spring Boot main entry point
│   │   │   ├── entity/
│   │   │   │   └── User.java                     # JPA Entity mapped to MySQL 'users' table
│   │   │   ├── dto/
│   │   │   │   ├── CreateUserRequest.java        # Record with validation (@NotBlank, @Email)
│   │   │   │   ├── UserResponse.java             # Contract-compliant JSON response record
│   │   │   │   └── ErrorResponse.java            # Standardized error payload (400, 409, 500)
│   │   │   ├── repository/
│   │   │   │   └── UserRepository.java           # Spring Data JPA repository with derived queries
│   │   │   ├── exception/
│   │   │   │   ├── DuplicateEmailException.java  # Custom exception for 409 Conflict
│   │   │   │   └── GlobalExceptionHandler.java   # Centralized @RestControllerAdvice exception handler
│   │   │   └── controller/
│   │   │       └── UserController.java           # REST endpoints with @CrossOrigin support
│   │   └── resources/
│   │       ├── application.properties            # Database and Actuator configuration
│   │       └── static/
│   │           └── index.html                    # Interactive browser-based Web Console UI
│   └── test/
│       ├── java/com/marketplace/userservice/controller/
│       │   └── UserControllerTest.java           # Full test suite (200, 201, 400, 404, 409, Health)
│       └── resources/
│           └── application.properties            # In-memory H2 configuration for fast test execution
├── Dockerfile                                    # Production multi-stage Docker build
├── .dockerignore                                 # Excludes build caches and local IDE configs
├── user-service.postman_collection.json          # Pre-configured Postman test suite
└── pom.xml                                       # Maven configuration with Spring Boot 3
```

### B. REST API Endpoints & Contract Compliance

| Method | Endpoint | Request Body | Status Codes | Description |
|---|---|---|---|---|
| `GET` | `/actuator/health` | _None_ | `200 OK` (or `503`) | Healthcheck verifying service and MySQL database connection (`{"status": "UP"}`). |
| `GET` | `/api/users` | _None_ | `200 OK` | Retrieves all registered users. |
| `GET` | `/api/users/{id}` | _None_ | `200 OK`<br>`404 Not Found` | Retrieves single user details by ID. |
| `POST` | `/api/users` | JSON object | `201 Created`<br>`400 Bad Request`<br>`409 Conflict` | Creates a new user. Returns `409` if email is already registered, or `400` if input is invalid. |

#### Request / Response JSON Specifications:

* **Create User Request (`POST /api/users`):**
  ```json
  {
    "name": "Priya Sharma",
    "email": "priya.sharma@example.com",
    "city": "Pune"
  }
  ```

* **User Response (`200` or `201`):**
  ```json
  {
    "id": 1,
    "name": "Priya Sharma",
    "email": "priya.sharma@example.com",
    "city": "Pune"
  }
  ```

* **Conflict Response (`409 Conflict` when email already exists):**
  ```json
  {
    "error": "Email already exists",
    "message": "User with email 'priya.sharma@example.com' already exists"
  }
  ```

* **Validation Error Response (`400 Bad Request` when required fields are missing/malformed):**
  ```json
  {
    "error": "Validation failed",
    "message": "Invalid input parameters",
    "details": {
      "name": "Name is required",
      "email": "Email must be a valid email address"
    }
  }
  ```

---

### C. Interactive Web Console UI (`index.html`)
To enable immediate manual testing without needing third-party tools, an interactive web console is built into the service:
- Access URL: `http://localhost:8081`
- **Live Health Status:** Automatically queries `/actuator/health` and displays real-time connection status with the MySQL database.
- **Live Users Table:** Dynamically displays all users stored in MySQL.
- **Create User Form:** Submit user details with instant visual alerts for `201 Created`, `400 Bad Request`, or `409 Conflict`.
- **Search by ID:** Query specific users to test `200 OK` or `404 Not Found`.
- **API & Postman Cheat Sheet:** Built-in copy-paste cURL commands and JSON payloads.

---

### D. Production Multi-Stage Dockerfile
The container configuration follows cloud-native best practices:
1. **Stage 1 (Builder):** Uses `maven:3.9.9-eclipse-temurin-21-alpine` to cache dependencies (`dependency:go-offline`) and compile the application.
2. **Stage 2 (Runtime):** Uses a minimal `eclipse-temurin:21-jre-alpine` base image (~180MB).
3. **Security:** Runs as a dedicated non-root user (`appuser`).
4. **Healthcheck:** Uses container healthcheck `wget -qO- http://127.0.0.1:8081/actuator/health || exit 1`.

---

## 3. How to Run

### Method 1: Docker Compose (Recommended)
From the project root:
```bash
# 1. Start MySQL and User Service
docker compose up -d mysql user-service

# 2. Check running status and health
docker compose ps
```

### Method 2: Local Run (without Docker)
If you have MySQL running on your machine (e.g. on host port `3307` from `docker compose up -d mysql`):
```bash
# In the user-service directory:
mvn clean spring-boot:run
```
Or build and execute the JAR:
```bash
mvn clean package -DskipTests
java -jar target/user-service-1.0.0.jar
```

---

## 4. How to Test

### 1. In Browser (UI)
Open:
```
http://localhost:8081
```

### 2. In Postman
1. Open Postman.
2. Click **Import** $\rightarrow$ Select `user-service/user-service.postman_collection.json`.
3. Execute the 7 pre-built requests:
   - `Health Check (Actuator)`
   - `Get All Users`
   - `Get User By ID (Found)`
   - `Get User By ID (Not Found)`
   - `Create User - Success (201)`
   - `Create User - Duplicate Email Conflict (409)`
   - `Create User - Validation Error (400)`

### 3. Using cURL
```bash
# Check service health
curl http://localhost:8081/actuator/health

# List all users
curl http://localhost:8081/api/users

# Get user with ID 1
curl http://localhost:8081/api/users/1

# Create a valid user
curl -X POST http://localhost:8081/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Anil Mehta", "email": "anil.mehta@example.com", "city": "Jaipur"}'

# Test duplicate email (expects 409 Conflict)
curl -i -X POST http://localhost:8081/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Priya Sharma", "email": "priya.sharma@example.com", "city": "Pune"}'
```
