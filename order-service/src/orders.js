const config = require('./config');

// Error with an HTTP status, turned into a JSON response by app.js.
class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function charges(itemTotal) {
  const handlingFee = itemTotal > 0 ? config.handlingFee : 0;
  const deliveryFee = itemTotal >= config.freeDeliveryFrom ? 0 : config.deliveryFee;
  return { handlingFee, deliveryFee, grandTotal: itemTotal + handlingFee + deliveryFee };
}

// Checks the request body and adds up quantities if the same product is listed twice.
function readItems(body) {
  if (!body || !Number.isInteger(body.userId) || body.userId < 1) {
    throw new OrderError(400, 'userId must be a positive whole number');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new OrderError(400, 'items must be a non-empty list');
  }
  const merged = new Map();
  for (const item of body.items) {
    if (!item || !Number.isInteger(item.productId) || item.productId < 1
        || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new OrderError(400, 'each item needs a productId and a quantity of 1 or more');
    }
    merged.set(item.productId, (merged.get(item.productId) || 0) + item.quantity);
  }
  for (const [productId, quantity] of merged) {
    if (quantity > config.maxQuantityPerItem) {
      throw new OrderError(400, `at most ${config.maxQuantityPerItem} of product ${productId} per order`);
    }
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

// Places an order. This is a small Saga over three services:
//   1. check the user (user-service) and read the real prices (product-service)
//   2. reserve stock item by item (inventory-service)
//   3. save the order (own database)
// If step 2 or 3 fails, the stock already reserved is released again (compensation),
// so a failed order never leaves stock missing.
async function placeOrder(body, { db, users, products, inventory }) {
  const wanted = readItems(body);

  const user = await users.get(body.userId);
  if (!user) throw new OrderError(400, `user ${body.userId} does not exist`);

  const items = [];
  for (const { productId, quantity } of wanted) {
    const product = await products.get(productId);
    if (!product) throw new OrderError(400, `product ${productId} does not exist`);
    items.push({ productId, name: product.name, price: product.price, quantity, lineTotal: product.price * quantity });
  }

  const reserved = [];
  const undo = async () => {
    for (const r of reserved) {
      try {
        await inventory.release(r.productId, r.quantity);
      } catch (err) {
        console.error(`could not release ${r.quantity} of product ${r.productId}: ${err.message}`);
      }
    }
  };

  try {
    for (const item of items) {
      const result = await inventory.reserve(item.productId, item.quantity);
      if (!result.ok) {
        throw new OrderError(409, `Only ${result.available} of ${item.name} left`);
      }
      reserved.push(item);
    }
    const itemTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return await db.createOrder({
      userId: user.id,
      status: 'CONFIRMED',
      items,
      itemTotal,
      ...charges(itemTotal),
      deliveryCity: user.city || null,
    });
  } catch (err) {
    await undo();
    if (reserved.length) console.log(`order for user ${user.id} failed, released stock of ${reserved.length} item(s)`);
    throw err;
  }
}

// Cancels a CONFIRMED order and gives its stock back.
async function cancelOrder(id, { db, inventory }) {
  const order = await db.findById(id);
  if (!order) throw new OrderError(404, 'Order not found');
  // the status check in changeStatus makes a double cancel impossible
  if (!(await db.changeStatus(id, 'CONFIRMED', 'CANCELLED'))) {
    throw new OrderError(409, `Order is ${order.status.toLowerCase()} and cannot be cancelled`);
  }
  for (const item of order.items) {
    try {
      await inventory.release(item.productId, item.quantity);
    } catch (err) {
      console.error(`order ${id} cancelled but stock of product ${item.productId} not released: ${err.message}`);
    }
  }
  return db.findById(id);
}

module.exports = { placeOrder, cancelOrder, charges, OrderError };
