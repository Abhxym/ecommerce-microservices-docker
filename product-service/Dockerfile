# Stage 1: install all dependencies and run the tests
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test

# Stage 2: production dependencies only
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 3: small runtime image, runs as the non-root "node" user
FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=8082
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/src ./src
USER node
EXPOSE 8082
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8082/health || exit 1
CMD ["node", "src/server.js"]
