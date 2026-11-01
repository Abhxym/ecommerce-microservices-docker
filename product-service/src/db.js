const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 5,
  decimalNumbers: true, // price comes back as 499 instead of "499.00"
});

async function findAll() {
  const [rows] = await pool.query(
    'SELECT id, sku, name, category, price, seller FROM products ORDER BY id'
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, sku, name, category, price, seller FROM products WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function ping() {
  await pool.query('SELECT 1');
}

module.exports = { pool, findAll, findById, ping };
