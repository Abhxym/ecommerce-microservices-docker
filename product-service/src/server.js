const config = require('./config');
const db = require('./db');
const inventory = require('./inventoryClient');
const { createApp } = require('./app');

const app = createApp(db, inventory);

// 0.0.0.0 so other containers can reach it (127.0.0.1 would only accept calls from inside this container).
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`product-service listening on port ${config.port}`);
  console.log(`inventory-service URL: ${config.inventoryUrl}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
