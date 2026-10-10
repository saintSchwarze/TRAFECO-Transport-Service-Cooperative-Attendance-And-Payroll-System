ALTER TABLE `payslips`
  ADD COLUMN `unpaid_deduction_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00
  AFTER `total_deductions`;

-- Correct old negative net amounts while preserving each payslip's status and approval fields.
UPDATE `payslips`
SET `unpaid_deduction_amount` = GREATEST(COALESCE(`total_deductions`, 0) - GREATEST(COALESCE(`gross_pay`, 0), 0), 0),
    `net_pay` = GREATEST(COALESCE(`gross_pay`, 0) - COALESCE(`total_deductions`, 0), 0);

UPDATE `payroll_batches`
SET `total_net` = (
  SELECT COALESCE(SUM(p.`net_pay`), 0)
  FROM `payslips` p
  WHERE p.`payroll_batch_id` = `payroll_batches`.`id`
);
