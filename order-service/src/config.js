// All settings come from environment variables (see .env.example).
// Other services are called by their Compose service names, never localhost.
module.exports = {
  port: Number(process.env.PORT || 8085),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'marketplace',
    user: process.env.DB_USER || 'marketplace',
    password: process.env.DB_PASSWORD || '',
  },
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://user-service:8081',
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://product-service:8082',
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8083',
  timeoutMs: Number(process.env.HTTP_TIMEOUT_MS || 3000),
  // charges, the same rules the storefront shows in the cart
  freeDeliveryFrom: 499,
  deliveryFee: 30,
  handlingFee: 5,
  maxQuantityPerItem: 10,
};
