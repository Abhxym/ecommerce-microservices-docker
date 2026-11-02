const config = require('./config');
const db = require('./db');
const { users, products, inventory } = require('./clients');
const { createApp } = require('./app');

const app = createApp({ db, users, products, inventory });

// 0.0.0.0 so other containers (web-ui) can reach it
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`order-service listening on port ${config.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
