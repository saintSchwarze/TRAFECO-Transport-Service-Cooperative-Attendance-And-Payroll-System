ALTER TABLE `payslips`
  ADD COLUMN `daily_rate_used` decimal(10,2) NOT NULL DEFAULT 0.00
  AFTER `hourly_rate_used`;

-- Existing full-time payslips stored their hourly equivalent. Reconstruct the
-- daily rate using the standard 8-hour workday; new payrolls save it directly.
UPDATE `payslips`
SET `daily_rate_used` = ROUND(COALESCE(`hourly_rate_used`, 0) * 8, 2)
WHERE `employment_type` = 'Full-time'
  AND `payslip_type` = 'regular'
  AND COALESCE(`daily_rate_used`, 0) = 0;
