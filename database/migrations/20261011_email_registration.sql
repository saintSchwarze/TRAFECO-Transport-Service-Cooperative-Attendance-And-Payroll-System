-- Run once on existing installations before using email invitations.
ALTER TABLE users
    MODIFY username VARCHAR(60) NULL DEFAULT NULL,
    MODIFY password VARCHAR(255) NULL DEFAULT NULL,
    MODIFY status ENUM('active','inactive','pending') NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS registration_invites (
    user_id INT UNSIGNED NOT NULL PRIMARY KEY,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT registration_invites_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
