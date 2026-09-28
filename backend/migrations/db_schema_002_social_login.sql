-- Adds Google / Telegram social login support and password-reset tokens.
-- Safe to run on an existing database: only adds columns/tables, changes no data.

ALTER TABLE users
  MODIFY COLUMN email VARCHAR(191) NULL,
  MODIFY COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN google_id VARCHAR(64) NULL AFTER password_hash,
  ADD COLUMN telegram_id BIGINT NULL AFTER google_id,
  ADD UNIQUE KEY uq_users_google_id (google_id),
  ADD UNIQUE KEY uq_users_telegram_id (telegram_id);

CREATE TABLE password_resets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_resets_user (user_id),
  KEY idx_password_resets_token_hash (token_hash),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;