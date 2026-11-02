const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');
const { ServiceUnavailable } = require('../src/clients');

// In-memory fakes for the database and the three services.
function setup({ stock = { 1: 120, 2: 60, 3: 0 }, failSave = false } = {}) {
  const orders = new Map();
  let nextId = 1;
  const calls = { release: [] };
  const deps = {
    db: {
      ping: async () => {},
      createOrder: async (o) => {
        if (failSave) throw new Error('disk full');
        const saved = { ...o, id: nextId++ };
        orders.set(saved.id, saved);
        return saved;
      },
      findById: async (id) => (orders.has(id) ? { ...orders.get(id) } : null),
      findByUser: async (userId) => [...orders.values()].filter((o) => o.userId === userId),
      changeStatus: async (id, from, to) => {
        const o = orders.get(id);
        if (!o || o.status !== from) return false;
        o.status = to;
        return true;
      },
    },
    users: { get: async (id) => (id === 1 ? { id: 1, name: 'Priya Sharma', city: 'Pune' } : null) },
    products: {
      get: async (id) => ({ 1: { id: 1, name: 'Cotton T-Shirt', price: 499 }, 2: { id: 2, name: 'Steel Water Bottle', price: 349 }, 3: { id: 3, name: 'Wireless Mouse', price: 799 } }[id] || null),
    },
    inventory: {
      reserve: async (id, qty) => {
        if (stock[id] < qty) return { ok: false, available: stock[id] };
        stock[id] -= qty;
        return { ok: true };
      },
      release: async (id, qty) => {
        calls.release.push([id, qty]);
        stock[id] += qty;
        return true;
      },
    },
  };
  return { app: createApp(deps), deps, stock, calls };
}

async function call(app, method, path, body) {
  const server = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

test('places an order with prices from product-service and reserves stock', async () => {
  const { app, stock } = setup();
  const res = await call(app, 'POST', '/api/orders', { userId: 1, items: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }] });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.status, 'CONFIRMED');
  assert.strictEqual(res.body.itemTotal, 499 * 2 + 349);
  assert.strictEqual(res.body.deliveryFee, 0);
  assert.strictEqual(res.body.handlingFee, 5);
  assert.strictEqual(res.body.grandTotal, 1352);
  assert.strictEqual(res.body.deliveryCity, 'Pune');
  assert.strictEqual(stock[1], 118);
  assert.strictEqual(stock[2], 59);
});

test('ignores a price sent by the client', async () => {
  const { app } = setup();
  const res = await call(app, 'POST', '/api/orders', { userId: 1, items: [{ productId: 2, quantity: 1, price: 1 }] });
  assert.strictEqual(res.body.items[0].price, 349);
  assert.strictEqual(res.body.deliveryFee, 30);
});

test('not enough stock: 409 and the stock already reserved is released (Saga)', async () => {
  const { app, stock, calls } = setup();
  const res = await call(app, 'POST', '/api/orders', { userId: 1, items: [{ productId: 1, quantity: 2 }, { productId: 3, quantity: 1 }] });
  assert.strictEqual(res.status, 409);
  assert.match(res.body.error, /Only 0 of Wireless Mouse left/);
  assert.deepStrictEqual(calls.release, [[1, 2]]);
  assert.strictEqual(stock[1], 120);
});

test('saving fails: 500 and all reserved stock is released', async () => {
  const { app, stock } = setup({ failSave: true });
  const res = await call(app, 'POST', '/api/orders', { userId: 1, items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 3 }] });
  assert.strictEqual(res.status, 500);
  assert.strictEqual(stock[1], 120);
  assert.strictEqual(stock[2], 60);
});

test('unknown user or product: 400', async () => {
  const { app } = setup();
  assert.strictEqual((await call(app, 'POST', '/api/orders', { userId: 9, items: [{ productId: 1, quantity: 1 }] })).status, 400);
  assert.strictEqual((await call(app, 'POST', '/api/orders', { userId: 1, items: [{ productId: 99, quantity: 1 }] })).status, 400);
});

test('invalid bodies: 400', async () => {
  const { app } = setup();
  for (const body of [{}, { userId: 1 }, { userId: 1, items: [] }, { userId: 1, items: [{ productId: 1, quantity: 0 }] }, { userId: 1, items: [{ productId: 1, quantity: 11 }] }]) {
    assert.strictEqual((await call(app, 'POST', '/api/orders', body)).status, 400, JSON.stringify(body));
  }
});

test('same product twice is merged into one line', async () => {
  const { app } = setup();
  const res = await call(app, 'POST', '/api/orders', { userId: 1, items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }] });
  assert.strictEqual(res.body.items.length, 1);
  assert.strictEqual(res.body.items[0].quantity, 3);
});

test('a service that is down gives 503', async () => {
  const { app, deps } = setup();
  deps.products.get = async () => { throw new ServiceUnavailable('product-service', 'ECONNREFUSED'); };
  const res = await call(app, 'POST', '/api/orders', { userId: 1, items: [{ productId: 1, quantity: 1 }] });
  assert.strictEqual(res.status, 503);
  assert.match(res.body.error, /product-service/);
});

test('cancel gives the stock back, a second cancel is 409', async () => {
  const { app, stock } = setup();
  const placed = await call(app, 'POST', '/api/orders', { userId: 1, items: [{ productId: 2, quantity: 4 }] });
  assert.strictEqual(stock[2], 56);
  const cancelled = await call(app, 'POST', `/api/orders/${placed.body.id}/cancel`);
  assert.strictEqual(cancelled.status, 200);
  assert.strictEqual(cancelled.body.status, 'CANCELLED');
  assert.strictEqual(stock[2], 60);
  assert.strictEqual((await call(app, 'POST', `/api/orders/${placed.body.id}/cancel`)).status, 409);
});

test('list orders of a user, get one, 404 for unknown', async () => {
  const { app } = setup();
  await call(app, 'POST', '/api/orders', { userId: 1, items: [{ productId: 1, quantity: 1 }] });
  const list = await call(app, 'GET', '/api/orders?userId=1');
  assert.strictEqual(list.body.length, 1);
  assert.strictEqual((await call(app, 'GET', '/api/orders')).status, 400);
  assert.strictEqual((await call(app, 'GET', `/api/orders/${list.body[0].id}`)).status, 200);
  assert.strictEqual((await call(app, 'GET', '/api/orders/999')).status, 404);
});

test('health is UP', async () => {
  const { app } = setup();
  const res = await call(app, 'GET', '/health');
  assert.deepStrictEqual(res.body, { status: 'UP' });
});
