const express = require('express');
const { placeOrder, cancelOrder, OrderError } = require('./orders');
const { ServiceUnavailable } = require('./clients');

// deps = { db, users, products, inventory }, passed in so the tests can use fakes.
function createApp(deps) {
  const app = express();
  app.use(express.json({ limit: '50kb' }));

  app.get('/health', async (req, res) => {
    try {
      await deps.db.ping();
      res.json({ status: 'UP' });
    } catch (err) {
      console.error(`health check failed: ${err.message}`);
      res.status(503).json({ status: 'DOWN' });
    }
  });

  app.post('/api/orders', async (req, res, next) => {
    try {
      const order = await placeOrder(req.body, deps);
      console.log(`order ${order.id} placed by user ${order.userId}, total ${order.grandTotal}`);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/orders?userId=1
  app.get('/api/orders', async (req, res, next) => {
    const userId = Number(req.query.userId);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }
    try {
      res.json(await deps.db.findByUser(userId));
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/orders/:id', async (req, res, next) => {
    try {
      const order = await deps.db.findById(Number(req.params.id) || 0);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/orders/:id/cancel', async (req, res, next) => {
    try {
      const order = await cancelOrder(Number(req.params.id) || 0, deps);
      console.log(`order ${order.id} cancelled`);
      res.json(order);
    } catch (err) {
      next(err);
    }
  });

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof OrderError) return res.status(err.status).json({ error: err.message });
    if (err instanceof ServiceUnavailable) return res.status(503).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body must be JSON' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
