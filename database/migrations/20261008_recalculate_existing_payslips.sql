-- Run this on an existing database after
-- 20261008_payslip_unpaid_deductions.sql has added the new column.
-- Recalculate all historical records without changing their approval statuses.
UPDATE `payslips`
SET `unpaid_deduction_amount` = GREATEST(COALESCE(`total_deductions`, 0) - GREATEST(COALESCE(`gross_pay`, 0), 0), 0),
    `net_pay` = GREATEST(COALESCE(`gross_pay`, 0) - COALESCE(`total_deductions`, 0), 0);

UPDATE `payroll_batches`
SET `total_net` = (
  SELECT COALESCE(SUM(p.`net_pay`), 0)
  FROM `payslips` p
  WHERE p.`payroll_batch_id` = `payroll_batches`.`id`
);
