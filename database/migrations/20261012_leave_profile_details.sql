ALTER TABLE employees
    ADD COLUMN gender VARCHAR(30) NULL AFTER last_name,
    ADD COLUMN marital_status VARCHAR(30) NULL AFTER gender,
    ADD COLUMN cohabiting_with_spouse TINYINT(1) NULL AFTER marital_status;

ALTER TABLE leave_requests
    ADD COLUMN expected_delivery_date DATE NULL AFTER paid_amount,
    ADD COLUMN contingency_type VARCHAR(40) NULL AFTER expected_delivery_date,
    ADD COLUMN solo_parent TINYINT(1) NOT NULL DEFAULT 0 AFTER contingency_type,
    ADD COLUMN allocated_leave_days TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER solo_parent,
    ADD COLUMN allocation_recipient_name VARCHAR(150) NULL AFTER allocated_leave_days,
    ADD COLUMN allocation_relationship VARCHAR(100) NULL AFTER allocation_recipient_name,
    ADD COLUMN allocation_employer VARCHAR(150) NULL AFTER allocation_relationship,
    ADD COLUMN unpaid_extension TINYINT(1) NOT NULL DEFAULT 0 AFTER allocation_employer,
    ADD COLUMN notification_date DATE NULL AFTER unpaid_extension,
    ADD COLUMN sss_recorded_months TINYINT UNSIGNED NULL AFTER notification_date,
    ADD COLUMN paternity_delivery_number TINYINT UNSIGNED NULL AFTER sss_recorded_months,
    ADD COLUMN paternity_actual_date DATE NULL AFTER paternity_delivery_number,
    ADD COLUMN paternity_schedule_option VARCHAR(20) NULL AFTER paternity_actual_date,
    ADD COLUMN paternity_dates_json MEDIUMTEXT NULL AFTER paternity_schedule_option,
    ADD COLUMN maternity_paid_days SMALLINT UNSIGNED NULL AFTER paternity_dates_json;

CREATE TABLE leave_request_attachments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    leave_request_id INT UNSIGNED NOT NULL,
    document_type VARCHAR(40) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_leave_attachment_request (leave_request_id),
    CONSTRAINT fk_leave_attachment_request FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE leave_notifications (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    notification_type ENUM('maternity','paternity') NOT NULL,
    expected_delivery_date DATE NOT NULL,
    spouse_name VARCHAR(150) NULL,
    notification_text TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_leave_notice_user (user_id),
    INDEX idx_leave_notice_edd (expected_delivery_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
