# Stage 1: Build the Spring Boot executable JAR
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Cache dependencies first
COPY pom.xml ./
RUN mvn dependency:go-offline -B

# Copy source code and build package
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Lightweight runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as a dedicated non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy JAR from build stage
COPY --from=build --chown=appuser:appgroup /app/target/*.jar app.jar

ENV PORT=8081 \
    SPRING_PROFILES_ACTIVE=prod

EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=3s --start-period=25s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8081/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]

