-- Shared database for the marketplace services.
-- Runs once, when the MySQL volume is empty.

CREATE DATABASE IF NOT EXISTS marketplace;
USE marketplace;

-- user-service
CREATE TABLE IF NOT EXISTS users (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  city        VARCHAR(60),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- product-service
CREATE TABLE IF NOT EXISTS products (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  sku         VARCHAR(30) NOT NULL UNIQUE,
  name        VARCHAR(150) NOT NULL,
  category    VARCHAR(60) NOT NULL,
  price       DECIMAL(10, 2) NOT NULL,
  seller      VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- inventory-service
CREATE TABLE IF NOT EXISTS inventory (
  product_id  BIGINT PRIMARY KEY,
  quantity    INT NOT NULL DEFAULT 0,
  warehouse   VARCHAR(60) NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products (id)
);

INSERT INTO users (name, email, city) VALUES
  ('Priya Sharma', 'priya.sharma@example.com', 'Pune'),
  ('Rohan Patil', 'rohan.patil@example.com', 'Mumbai'),
  ('Ananya Iyer', 'ananya.iyer@example.com', 'Bengaluru');

INSERT INTO products (sku, name, category, price, seller) VALUES
  ('TSH-001', 'Cotton T-Shirt', 'Clothing', 499.00, 'ShopEase'),
  ('BOT-002', 'Steel Water Bottle', 'Home', 349.00, 'ShopEase'),
  ('MOU-003', 'Wireless Mouse', 'Electronics', 799.00, 'TechKart'),
  ('KUR-004', 'Printed Kurti', 'Clothing', 899.00, 'Desi Threads'),
  ('LMP-005', 'LED Desk Lamp', 'Home', 1199.00, 'BrightHome');

INSERT INTO inventory (product_id, quantity, warehouse) VALUES
  (1, 120, 'Pune'),
  (2, 60, 'Pune'),
  (3, 0, 'Mumbai'),
  (4, 35, 'Pune'),
  (5, 18, 'Mumbai');

-- order-service (same as db/migrations/001-orders.sql)
CREATE TABLE IF NOT EXISTS orders (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT NOT NULL,
  status         VARCHAR(20) NOT NULL,
  item_total     DECIMAL(10, 2) NOT NULL,
  handling_fee   DECIMAL(10, 2) NOT NULL,
  delivery_fee   DECIMAL(10, 2) NOT NULL,
  grand_total    DECIMAL(10, 2) NOT NULL,
  delivery_city  VARCHAR(60),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT chk_orders_status CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  INDEX idx_orders_user (user_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id      BIGINT NOT NULL,
  product_id    BIGINT NOT NULL,
  product_name  VARCHAR(150) NOT NULL,
  unit_price    DECIMAL(10, 2) NOT NULL,
  quantity      INT NOT NULL,
  line_total    DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders (id),
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT chk_items_quantity CHECK (quantity > 0)
);

-- application user with access to this database only
CREATE USER IF NOT EXISTS 'marketplace'@'%' IDENTIFIED BY 'change_me_app';
GRANT ALL PRIVILEGES ON marketplace.* TO 'marketplace'@'%';
FLUSH PRIVILEGES;
