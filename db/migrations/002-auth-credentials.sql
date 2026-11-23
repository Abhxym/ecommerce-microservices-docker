USE marketplace;

CREATE TABLE IF NOT EXISTS credentials (
  user_id        BIGINT PRIMARY KEY,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(100) NOT NULL,
  role           VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at  TIMESTAMP NULL,
  CONSTRAINT fk_credentials_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT chk_role CHECK (role IN ('CUSTOMER', 'SELLER', 'ADMIN'))
);

