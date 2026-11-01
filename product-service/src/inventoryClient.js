const config = require('./config');

// Returns { quantity, warehouse, inStock } or null.
// Never throws: if inventory-service is down the product is still returned.
async function getStock(productId) {
  const url = `${config.inventoryUrl}/api/inventory/${productId}`;
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
    console.error(`cannot reach inventory-service at ${url}: ${reason}`);
    return null;
  }
}

module.exports = { getStock };
