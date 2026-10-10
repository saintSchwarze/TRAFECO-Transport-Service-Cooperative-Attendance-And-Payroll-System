ALTER TABLE leave_requests
    ADD COLUMN proof_path VARCHAR(255) NULL AFTER reason,
    ADD COLUMN paid_amount DECIMAL(12,2) NULL AFTER proof_path;

ALTER TABLE payslips
    ADD COLUMN paid_leave_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER basic_pay,
    ADD COLUMN taxable_leave_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER paid_leave_pay;
