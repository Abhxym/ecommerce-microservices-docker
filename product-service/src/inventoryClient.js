const config = require('./config');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Returns { quantity, warehouse, inStock } or null.
// Never throws: if inventory-service is down the product is still returned.
// Connection errors (service still starting, container restarting) are retried a few times.
async function getStock(productId) {
  const url = `${config.inventoryUrl}/api/inventory/${productId}`;
  for (let attempt = 1; attempt <= config.inventoryRetries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(config.inventoryTimeoutMs) });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        console.error(`inventory-service returned HTTP ${res.status} for ${url}`);
        return null;
      }
      const body = await res.json();
      return { quantity: body.quantity, warehouse: body.warehouse, inStock: body.inStock };
    } catch (err) {
      const reason = err.cause ? err.cause.code || err.cause.message : err.message;
      console.error(`cannot reach inventory-service at ${url} (attempt ${attempt}/${config.inventoryRetries}): ${reason}`);
      if (attempt < config.inventoryRetries) {
        await sleep(config.inventoryRetryDelayMs * attempt);
      }
    }
  }
  return null;
}

module.exports = { getStock };
