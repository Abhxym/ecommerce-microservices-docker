const express = require('express');

// db and inventory are passed in so the tests can use fakes.
function createApp(db, inventory) {
  const app = express();

  app.get('/health', async (req, res) => {
    try {
      await db.ping();
      res.json({ status: 'UP' });
    } catch (err) {
      console.error(`health check failed: ${err.message}`);
      res.status(503).json({ status: 'DOWN' });
    }
  });

  app.get('/api/products', async (req, res, next) => {
    try {
      res.json(await db.findAll());
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/products/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    try {
      const product = await db.findById(id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      product.stock = await inventory.getStock(id);
      res.json(product);
    } catch (err) {
      next(err);
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
