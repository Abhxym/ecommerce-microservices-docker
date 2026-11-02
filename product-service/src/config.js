// All settings come from environment variables (see .env.example).
module.exports = {
  port: Number(process.env.PORT || 8082),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'marketplace',
    user: process.env.DB_USER || 'marketplace',
    password: process.env.DB_PASSWORD || '',
  },
  // Inside Docker Compose this is the service name, never localhost.
  inventoryUrl: process.env.INVENTORY_URL || 'http://inventory-service:8083',
  inventoryTimeoutMs: Number(process.env.INVENTORY_TIMEOUT_MS || 2000),
  inventoryRetries: Number(process.env.INVENTORY_RETRIES || 3),
  inventoryRetryDelayMs: Number(process.env.INVENTORY_RETRY_DELAY_MS || 300),
};
