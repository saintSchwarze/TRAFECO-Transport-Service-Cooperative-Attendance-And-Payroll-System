-- Run once to distinguish annual 13th-month batches from regular payroll batches.
ALTER TABLE payroll_batches
    ADD COLUMN batch_type ENUM('regular','13th_month') NOT NULL DEFAULT 'regular' AFTER id;

CREATE INDEX idx_payroll_batches_type_period_status
    ON payroll_batches (batch_type, pay_period, status);

ALTER TABLE payslips
    ADD COLUMN thirteenth_month_basis DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER basic_pay;
