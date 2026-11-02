const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 5,
  decimalNumbers: true,
});

function toOrder(row, items) {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    items: items.map((i) => ({
      productId: i.product_id,
      name: i.product_name,
      price: i.unit_price,
      quantity: i.quantity,
      lineTotal: i.line_total,
    })),
    itemTotal: row.item_total,
    handlingFee: row.handling_fee,
    deliveryFee: row.delivery_fee,
    grandTotal: row.grand_total,
    deliveryCity: row.delivery_city,
    createdAt: row.created_at,
  };
}

// Saves the order and its items in one transaction: either all rows are written or none.
async function createOrder(order) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.query(
      `INSERT INTO orders (user_id, status, item_total, handling_fee, delivery_fee, grand_total, delivery_city)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [order.userId, order.status, order.itemTotal, order.handlingFee, order.deliveryFee, order.grandTotal, order.deliveryCity]
    );
    for (const item of order.items) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [res.insertId, item.productId, item.name, item.price, item.quantity, item.lineTotal]
      );
    }
    await conn.commit();
    return findById(res.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function itemsFor(orderIds) {
  if (orderIds.length === 0) return [];
  const [rows] = await pool.query(
    'SELECT * FROM order_items WHERE order_id IN (?) ORDER BY id',
    [orderIds]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
  if (!rows[0]) return null;
  return toOrder(rows[0], await itemsFor([id]));
}

async function findByUser(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 50',
    [userId]
  );
  const items = await itemsFor(rows.map((r) => r.id));
  return rows.map((r) => toOrder(r, items.filter((i) => i.order_id === r.id)));
}

// Changes the status only if it still has the expected value, so an order cannot be cancelled twice.
async function changeStatus(id, from, to) {
  const [res] = await pool.query('UPDATE orders SET status = ? WHERE id = ? AND status = ?', [to, id, from]);
  return res.affectedRows === 1;
}

async function ping() {
  await pool.query('SELECT 1');
}

module.exports = { pool, createOrder, findById, findByUser, changeStatus, ping };
