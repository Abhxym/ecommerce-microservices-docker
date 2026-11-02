-- order-service tables. Also at the end of db/init.sql for fresh installs.
-- Apply on an existing database:
--   docker exec -i marketplace-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < db/migrations/001-orders.sql
USE marketplace;

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
