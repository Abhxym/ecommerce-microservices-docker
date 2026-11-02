const config = require('./config');

// Thrown when another service cannot be reached or answers with an unexpected error.
class ServiceUnavailable extends Error {
  constructor(service, reason) {
    super(`${service} is not available (${reason})`);
    this.service = service;
  }
}

async function call(service, url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (err) {
    const reason = err.cause ? err.cause.code || err.cause.message : err.message;
    console.error(`cannot reach ${service} at ${url}: ${reason}`);
    throw new ServiceUnavailable(service, reason);
  }
  const body = await res.json().catch(() => null);
  if (res.status >= 500) {
    console.error(`${service} returned HTTP ${res.status} for ${url}`);
    throw new ServiceUnavailable(service, `HTTP ${res.status}`);
  }
  return { status: res.status, body };
}

const users = {
  // returns the user or null if it does not exist
  async get(id) {
    const { status, body } = await call('user-service', `${config.userServiceUrl}/api/users/${id}`);
    return status === 200 ? body : null;
  },
};

const products = {
  async get(id) {
    const { status, body } = await call('product-service', `${config.productServiceUrl}/api/products/${id}`);
    return status === 200 ? body : null;
  },
};

const inventory = {
  // returns { ok: true } or { ok: false, available }
  async reserve(productId, quantity) {
    const { status, body } = await call('inventory-service',
      `${config.inventoryServiceUrl}/api/inventory/${productId}/reserve`,
      { method: 'POST', body: JSON.stringify({ quantity }) });
    if (status === 200) return { ok: true };
    return { ok: false, available: body && body.available !== undefined ? body.available : 0 };
  },
  async release(productId, quantity) {
    const { status } = await call('inventory-service',
      `${config.inventoryServiceUrl}/api/inventory/${productId}/release`,
      { method: 'POST', body: JSON.stringify({ quantity }) });
    return status === 200;
  },
};

module.exports = { users, products, inventory, ServiceUnavailable };
