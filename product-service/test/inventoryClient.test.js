const test = require('node:test');
const assert = require('node:assert');

process.env.INVENTORY_RETRY_DELAY_MS = '1';
const { getStock } = require('../src/inventoryClient');

const refused = () => Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
const okResponse = { ok: true, status: 200, json: async () => ({ productId: 1, quantity: 120, warehouse: 'Pune', inStock: true }) };

test('retries when inventory-service is not up yet', async (t) => {
  let calls = 0;
  t.mock.method(global, 'fetch', async () => {
    calls++;
    if (calls === 1) throw refused();
    return okResponse;
  });
  t.mock.method(console, 'error', () => {});
  const stock = await getStock(1);
  assert.strictEqual(calls, 2);
  assert.deepStrictEqual(stock, { quantity: 120, warehouse: 'Pune', inStock: true });
});

test('returns null after all retries fail', async (t) => {
  let calls = 0;
  t.mock.method(global, 'fetch', async () => {
    calls++;
    throw refused();
  });
  t.mock.method(console, 'error', () => {});
  assert.strictEqual(await getStock(1), null);
  assert.strictEqual(calls, 3);
});

test('does not retry a 404', async (t) => {
  let calls = 0;
  t.mock.method(global, 'fetch', async () => {
    calls++;
    return { ok: false, status: 404 };
  });
  assert.strictEqual(await getStock(99), null);
  assert.strictEqual(calls, 1);
});
