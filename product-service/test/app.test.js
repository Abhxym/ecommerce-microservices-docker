const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

const shirt = { id: 1, sku: 'TSH-001', name: 'Cotton T-Shirt', category: 'Clothing', price: 499, seller: 'ShopEase' };

const fakeDb = {
  ping: async () => {},
  findAll: async () => [shirt],
  findById: async (id) => (id === 1 ? { ...shirt } : null),
};

async function call(app, path) {
  const server = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

test('GET /health returns UP', async () => {
  const res = await call(createApp(fakeDb, { getStock: async () => null }), '/health');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { status: 'UP' });
});

test('GET /health returns 503 when the database is down', async () => {
  const db = { ...fakeDb, ping: async () => { throw new Error('ECONNREFUSED'); } };
  const res = await call(createApp(db, { getStock: async () => null }), '/health');
  assert.strictEqual(res.status, 503);
});

test('GET /api/products returns the list', async () => {
  const res = await call(createApp(fakeDb, { getStock: async () => null }), '/api/products');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.length, 1);
});

test('GET /api/products/1 includes stock from inventory-service', async () => {
  const stock = { quantity: 120, warehouse: 'Pune', inStock: true };
  const res = await call(createApp(fakeDb, { getStock: async () => stock }), '/api/products/1');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.stock, stock);
});

test('GET /api/products/1 returns stock null when inventory-service is down', async () => {
  const res = await call(createApp(fakeDb, { getStock: async () => null }), '/api/products/1');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.stock, null);
});

test('GET /api/products/99 returns 404', async () => {
  const res = await call(createApp(fakeDb, { getStock: async () => null }), '/api/products/99');
  assert.strictEqual(res.status, 404);
});
