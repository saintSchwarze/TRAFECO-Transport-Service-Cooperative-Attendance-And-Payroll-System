<?php
require_once __DIR__ . '/../config/helpers.php';

commonHeaders();
$action = $_GET['action'] ?? 'list';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
apiMutationGuard([
    'generate' => 'POST', 'approve' => 'PUT', 'decline' => 'PUT',
    'thirteenth-month-generate' => 'POST', 'generate-payroll' => 'POST',
    'approve-payroll-batch' => 'PUT', 'decline-payroll-batch' => 'PUT',
]);

// ============================================================
//  Shared DTR -> pay computation. Used by the single-employee
//  preview AND the batch payroll generator, so the numbers can
//  never drift apart between the two flows.
// ============================================================
function computeDtrForEmployee(PDO $db, int $empUserId, string $cutoffStart, string $cutoffEnd, array $settings): ?array {
    $st = $db->prepare('SELECT e.*, u.full_name FROM employees e JOIN users u ON e.user_id=u.id WHERE e.user_id=? LIMIT 1');
    $st->execute([$empUserId]);
    $emp = $st->fetch();
    if (!$emp) return null;

    $st = $db->prepare('SELECT * FROM attendance_logs WHERE user_id=? AND DATE(scanned_at) BETWEEN ? AND ? ORDER BY scanned_at ASC');
    $st->execute([$empUserId, $cutoffStart, $cutoffEnd]);
    $logs = $st->fetchAll();

    $st = $db->prepare('SELECT leave_type,date_from,date_to,paid_amount,maternity_paid_days,paternity_dates_json FROM leave_requests WHERE user_id=? AND status="approved" AND date_from <= ? AND date_to >= ?');
    $st->execute([$empUserId, $cutoffEnd, $cutoffStart]);
    $leaveDays = []; $maternityPayByDate = []; $paternityPaidDates = [];
    foreach ($st->fetchAll() as $lv) {
        $leaveStart = new DateTime($lv['date_from']);
        $leaveEnd = new DateTime($lv['date_to']);
        $d = clone $leaveStart;
        $paidWorkdays = 0;
        $isMaternity = str_starts_with($lv['leave_type'], 'Maternity Leave');
        $totalCalendarDays = (int)$leaveStart->diff($leaveEnd)->days + 1;
        $totalCents = $isMaternity ? (int)round((float)($lv['paid_amount'] ?? 0) * 100) : 0;
        $maternityPaidDays = $isMaternity ? min($totalCalendarDays, max(0, (int)($lv['maternity_paid_days'] ?? $totalCalendarDays))) : 0;
        $baseCents = $isMaternity && $maternityPaidDays > 0 ? intdiv($totalCents, $maternityPaidDays) : 0;
        $remainderCents = $isMaternity && $maternityPaidDays > 0 ? $totalCents % $maternityPaidDays : 0;
        $paternityDates = !empty($lv['paternity_dates_json']) ? json_decode($lv['paternity_dates_json'], true) : null;
        $calendarOffset = 0;
        while ($d <= $leaveEnd) {
            $dateKey = $d->format('Y-m-d');
            $isPaternityDay = $lv['leave_type'] !== 'Paternity Leave' || ($paternityDates ? in_array($dateKey, $paternityDates, true) : $calendarOffset < 7);
            if ($isPaternityDay && $dateKey >= $cutoffStart && $dateKey <= $cutoffEnd) $leaveDays[$dateKey] = $lv['leave_type'];
            if ($isMaternity && $calendarOffset < $maternityPaidDays && $dateKey >= $cutoffStart && $dateKey <= $cutoffEnd) {
                $cents = $baseCents + ($calendarOffset < $remainderCents ? 1 : 0);
                $maternityPayByDate[$dateKey] = ($maternityPayByDate[$dateKey] ?? 0) + $cents;
            }
            if ($lv['leave_type'] === 'Paternity Leave' && ($paternityDates ? in_array($dateKey, $paternityDates, true) : $calendarOffset < 7) && $dateKey >= $cutoffStart && $dateKey <= $cutoffEnd) {
                $paternityPaidDates[$dateKey] = true;
            }
            $weekday = (int)$d->format('N') < 6;
            if ($weekday && $dateKey >= $cutoffStart && $dateKey <= $cutoffEnd) {
                if (($lv['leave_type'] === 'Vacation Leave' || ($lv['leave_type'] === 'Sick Leave' && $totalCalendarDays > 1)) && $paidWorkdays < 5) {
                    $leaveDays[$dateKey] = ['type' => $lv['leave_type'], 'paid' => true];
                }
            }
            if ($weekday) $paidWorkdays++;
            $calendarOffset++;
            $d->modify('+1 day');
        }
    }

    $byDate = [];
    foreach ($logs as $log) {
        $d = date('Y-m-d', strtotime($log['scanned_at']));
        $byDate[$d][] = $log;
    }

    $isFullTime = ($emp['employment_type'] === 'Full-time');
    $dailyRate  = $isFullTime ? round((float)$emp['basic_salary'], 2) : 0;
    // Standard shift: 8am-12pm and 1pm-5pm = 8 worked hours/day
    $hourlyRate = $isFullTime ? round($dailyRate / $settings['workHoursPerDay'], 2) : (float)($emp['hourly_rate'] ?? 0);
    // Employees may clock in up to 10 minutes after the 8:00 AM / 1:00 PM shift starts without a late deduction.
    $GRACE_MIN  = 10;

    $sssOn  = (bool)($emp['sss_enabled']       ?? 1);
    $philOn = (bool)($emp['philhealth_enabled'] ?? 1);
    $pagOn  = (bool)($emp['pagibig_enabled']   ?? 1);

    $daysPresent = 0; $daysAbsent = 0; $daysLeave = 0;
    $lateDeduction = 0; $absenceDeduction = 0; $earnedBasic = 0; $hoursRendered = 0;
    $dailyPaidRate = $isFullTime ? $dailyRate : round($hourlyRate * $settings['workHoursPerDay'], 2);
    $maternityLeavePay = round(array_sum($maternityPayByDate) / 100, 2);
    $paidLeavePay = round($maternityLeavePay + count($paternityPaidDates) * $dailyPaidRate, 2);
    $taxablePaidLeavePay = round(count($paternityPaidDates) * $dailyPaidRate, 2);

    $cur = new DateTime($cutoffStart);
    $end = new DateTime($cutoffEnd);
    while ($cur <= $end) {
        $ds  = $cur->format('Y-m-d');
        $dow = (int)$cur->format('N');

        if ($dow >= 6) { $cur->modify('+1 day'); continue; }

        if (isset($leaveDays[$ds])) {
            $daysLeave++;
            $leaveEntry = $leaveDays[$ds];
            if (is_array($leaveEntry) && !empty($leaveEntry['paid'])) {
                $dayPaidRate = $isFullTime ? $dailyRate : round($hourlyRate * $settings['workHoursPerDay'], 2);
                $paidLeavePay += $dayPaidRate;
                $taxablePaidLeavePay += $dayPaidRate;
            }
            $cur->modify('+1 day');
            continue;
        }

        $dayLogs = $byDate[$ds] ?? [];
        $amIn = null; $pmIn = null; $timeIn = null; $timeOut = null;

        foreach ($dayLogs as $lg) {
            $t  = strtotime($lg['scanned_at']);
            $hr = (int)date('G', $t);
            if ($lg['scan_type'] === 'time_in') {
                if ($hr < 12) { if (!$amIn || $t < $amIn['t']) $amIn = ['t'=>$t,'row'=>$lg]; }
                else          { if (!$pmIn || $t < $pmIn['t']) $pmIn = ['t'=>$t,'row'=>$lg]; }
                if (!$timeIn || $t < $timeIn) $timeIn = $t;
            } else {
                if (!$timeOut || $t > $timeOut) $timeOut = $t;
            }
        }

        if (!$amIn && !$pmIn) {
            $daysAbsent++;
            if ($isFullTime) $absenceDeduction += $dailyRate;
            $cur->modify('+1 day');
            continue;
        }

        $daysPresent++;

        // Real worked hours today, from actual clock-in to clock-out,
        // minus the lunch hour if they clocked both an AM and PM segment.
        $hoursToday = 0;
        if ($timeIn && $timeOut && $timeOut > $timeIn) {
            $hoursToday = ($timeOut - $timeIn) / 3600;
            if ($amIn && $pmIn) $hoursToday -= 1; // lunch break, not worked
            $hoursToday = max(0, round($hoursToday, 2));
        }
        $hoursRendered += $hoursToday;

        if ($isFullTime) {
            $dayDeduction = 0;
            foreach ([['entry'=>$amIn,'cutoff'=>strtotime($ds.' 08:00:00')], ['entry'=>$pmIn,'cutoff'=>strtotime($ds.' 13:00:00')]] as $seg) {
                if (!$seg['entry']) continue;
                if (($seg['entry']['row']['status_override'] ?? null) === 'on_time') continue;
                $lateMin = max(0, ($seg['entry']['t'] - $seg['cutoff']) / 60);
                $billableLateMin = max(0, $lateMin - $GRACE_MIN);
                if ($billableLateMin > 0) {
                    $dayDeduction += min($dailyRate, round($billableLateMin * ($hourlyRate/60), 2));
                }
            }
            $lateDeduction += $dayDeduction;
            $earnedBasic   += max(0, $dailyRate - $dayDeduction);
        } else {
            $earnedBasic += round($hoursToday * $hourlyRate, 2);
        }

        $cur->modify('+1 day');
    }

    $WORKDAYS_PER_MONTH = 22;
    // Full-time records store a daily rate. For hourly employees, use this
    // cutoff's actual earnings as a monthly estimate because no fixed PT
    // schedule or monthly salary is stored in the employee record.
    $monthlyCompensation = $isFullTime
        ? round($dailyRate * $WORKDAYS_PER_MONTH, 2)
        : round($earnedBasic * 2, 2);
    $sss        = $sssOn  ? round(calculateSssEmployeeShare($monthlyCompensation) / 2, 2) : 0;
    $philhealth = $philOn ? round(min(100000, max(10000, $monthlyCompensation)) * 0.025 / 2, 2) : 0;
    $pagibigRate = $monthlyCompensation <= 1500 ? 0.01 : 0.02;
    $pagibig     = $pagOn ? round(min(10000, $monthlyCompensation) * $pagibigRate / 2, 2) : 0;

    return [
        'employee'   => ['name' => $emp['full_name'], 'employmentType' => $emp['employment_type']],
        'daysPresent' => $daysPresent,
        'daysAbsent'  => $daysAbsent,
        'daysLeave'   => $daysLeave,
        'dailyRate'   => $dailyRate,
        'hourlyRate'  => $hourlyRate,
        'hoursRendered'    => round($hoursRendered, 2),
        'earnedBasic'      => round($earnedBasic, 2),
        'paidLeavePay'     => round($paidLeavePay, 2),
        'taxablePaidLeavePay' => round($taxablePaidLeavePay, 2),
        'lateDeduction'    => round($lateDeduction, 2),
        'absenceDeduction' => round($absenceDeduction, 2),
        'sss'        => $sss,
        'philhealth' => $philhealth,
        'pagibig'    => $pagibig,
    ];
}

function getPayrollSettings(PDO $db): array {
    $st = $db->query('SELECT setting_value FROM system_settings WHERE setting_key="work_hours_per_day" LIMIT 1');
    $workHoursPerDay = $st->fetchColumn();

    return [
        'taxBrackets'     => [
            ['threshold'=>0,'rate'=>0], ['threshold'=>20833,'rate'=>15], ['threshold'=>33333,'rate'=>20],
            ['threshold'=>66667,'rate'=>25], ['threshold'=>166667,'rate'=>30], ['threshold'=>666667,'rate'=>35],
        ],
        'workHoursPerDay' => ($workHoursPerDay !== false && (float)$workHoursPerDay > 0) ? (float)$workHoursPerDay : 8,
    ];
}

function calculateSssEmployeeShare(float $monthlyCompensation): float {
    // SSS Circular 2024-006: salary-credit schedule effective January 2025.
    // The employee funds 5% of the total MSC (regular SS + MPF).
    $msc = max(5000, min(35000, (int)(floor(($monthlyCompensation + 250) / 500) * 500)));
    return round($msc * 0.05, 2);
}

function scheduledPayDateForCutoff(string $payPeriod, string $cutoffStart, string $cutoffEnd): ?string {
    $monthStart = DateTime::createFromFormat('!Y-m-d', $payPeriod . '-01');
    if (!$monthStart || $monthStart->format('Y-m') !== $payPeriod) return null;

    $previousMonthStart = (clone $monthStart)->modify('-1 month');
    $month = $monthStart->format('Y-m');
    if ($cutoffStart === $previousMonthStart->format('Y-m') . '-26' && $cutoffEnd === $month . '-10') {
        return $month . '-15';
    }

    $lastDay = (int)$monthStart->format('t');
    if ($cutoffStart === $month . '-11' && $cutoffEnd === $month . '-25') {
        return $month . '-' . str_pad((string)min(30, $lastDay), 2, '0', STR_PAD_LEFT);
    }
    return null;
}

function isLegacyPayrollCutoff(string $payPeriod, string $cutoffStart, string $cutoffEnd): bool {
    $monthStart = DateTime::createFromFormat('!Y-m-d', $payPeriod . '-01');
    if (!$monthStart || $monthStart->format('Y-m') !== $payPeriod) return false;
    $lastDay = (int)$monthStart->format('t');
    $month = $monthStart->format('Y-m');
    return ($cutoffStart === $month . '-01' && $cutoffEnd === $month . '-15')
        || ($cutoffStart === $month . '-16' && $cutoffEnd === $month . '-' . str_pad((string)$lastDay, 2, '0', STR_PAD_LEFT));
}

function computeProgressiveTax(float $income, array $brackets): float {
    usort($brackets, fn($a,$b) => $a['threshold'] <=> $b['threshold']);
    $tax = 0;
    for ($i = 0; $i < count($brackets); $i++) {
        $lower = (float)$brackets[$i]['threshold'];
        $upper = $i + 1 < count($brackets) ? (float)$brackets[$i+1]['threshold'] : PHP_FLOAT_MAX;
        $rate  = (float)$brackets[$i]['rate'] / 100;
        if ($income > $lower) {
            $tax += (min($income, $upper) - $lower) * $rate;
        }
    }
    return round($tax, 2);
}

function computeWithholdingTaxServer(float $t, float $periodsPerMonth, array $brackets): float {
    $monthly = $t * $periodsPerMonth;
    $tax = computeProgressiveTax($monthly, $brackets);
    return round($tax / $periodsPerMonth, 2);
}

switch ($action) {

    // --------------------------------------------------------
    //  GET ?action=list  — all payslips (treasurer/chairman/manager)
    //  GET ?action=list  — own payslips only (employee)
    // --------------------------------------------------------
    case 'list': {
        // Company-wide view — for pages like "Generate Payslip" and Payroll History
        // that need to see everyone's submissions, not just the caller's own.
        $user = requirePermission('viewOtherEmployees');
        $db   = getDB();
        $st = $db->prepare('
            SELECT p.*, u.full_name AS employee_name, u.staff_id,
                   g.full_name AS generated_by_name,
                   a.full_name AS approved_by_name
            FROM payslips p
            JOIN users u ON p.employee_user_id = u.id
            JOIN users g ON p.generated_by = g.id
            LEFT JOIN users a ON p.approved_by = a.id
            ORDER BY p.created_at DESC
        ');
        $st->execute();
        jsonOk(['payslips' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=my-list  — ALWAYS just the logged-in
    //  person's own payslips, regardless of role
    // --------------------------------------------------------
    case 'my-list': {
        $user = requireLogin();
        $db   = getDB();

        $where  = ['p.employee_user_id = ?'];
        $params = [$user['id']];
        if (!empty($_GET['year'])) {
            $where[] = 'YEAR(COALESCE(p.pay_date, p.cutoff_start)) = ?';
            $params[] = (int)$_GET['year'];
        }
        if (!empty($_GET['month'])) {
            $where[] = 'MONTH(COALESCE(p.pay_date, p.cutoff_start)) = ?';
            $params[] = (int)$_GET['month'];
        }

        $st = $db->prepare('
            SELECT p.*, u.full_name AS employee_name, u.staff_id,
                   g.full_name AS generated_by_name,
                   a.full_name AS approved_by_name
            FROM payslips p
            JOIN users u ON p.employee_user_id = u.id
            JOIN users g ON p.generated_by = g.id
            LEFT JOIN users a ON p.approved_by = a.id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY p.created_at DESC
        ');
        $st->execute($params);
        jsonOk(['payslips' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=pending  — pending-approval payslips (chairman)
    // --------------------------------------------------------
    case 'pending': {
        $user = requirePermission('validatePayroll');
        $db   = getDB();
        $st   = $db->prepare('
            SELECT p.*, u.full_name AS employee_name, u.staff_id,
                   g.full_name AS generated_by_name
            FROM payslips p
            JOIN users u ON p.employee_user_id = u.id
            JOIN users g ON p.generated_by = g.id
            WHERE p.status = "pending"
            ORDER BY p.created_at ASC
        ');
        $st->execute();
        jsonOk(['payslips' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=compute-dtr  (treasurer) — reads attendance
    //  + approved leave for the cutoff and computes pay
    //  Params: employeeUserId, cutoffStart (YYYY-MM-DD), cutoffEnd (YYYY-MM-DD)
    // --------------------------------------------------------
    case 'compute-dtr': {
        $user = requirePermission('generatePayslips');

        $empUserId   = (int)($_GET['employeeUserId'] ?? 0);
        $cutoffStart = $_GET['cutoffStart'] ?? '';
        $cutoffEnd   = $_GET['cutoffEnd']   ?? '';

        if (!$empUserId || !$cutoffStart || !$cutoffEnd) {
            jsonError('employeeUserId, cutoffStart and cutoffEnd are required.');
        }

        $db = getDB();
        $settings = getPayrollSettings($db);
        $result = computeDtrForEmployee($db, $empUserId, $cutoffStart, $cutoffEnd, $settings);
        if (!$result) jsonError('Employee not found.', 404);
        jsonOk($result);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=generate  (treasurer only)
    // --------------------------------------------------------
    case 'generate': {
        $user = requirePermission('generatePayslips');

        $required = ['employeeUserId','payPeriod','cutoffStart','cutoffEnd'];
        foreach ($required as $f) {
            if (empty($body[$f])) jsonError("Field '$f' is required.");
        }

        $empUserId    = (int)$body['employeeUserId'];
        $payPeriod    = $body['payPeriod'];
        $cutoffStart  = $body['cutoffStart'];
        $cutoffEnd    = $body['cutoffEnd'];
        $payDate      = $body['payDate']      ?? null;
        if (!is_string($payPeriod) || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $payPeriod)) {
            jsonError('Enter a valid pay period.');
        }
        $empType      = $body['employmentType'] ?? 'Full-time';
        $daysPresent  = (float)($body['daysPresent'] ?? 0);
        $daysAbsent   = (float)($body['daysAbsent']  ?? 0);
        $daysLeave    = (float)($body['daysLeave']   ?? 0);
        $lateDed      = (float)($body['lateDeduction']    ?? 0);
        $absenceDed   = (float)($body['absenceDeduction'] ?? 0);
        $basicPay     = (float)($body['basicPay']      ?? 0);
        $taxAllow     = (float)($body['taxAllow']       ?? 0);
        $nonTaxAllow  = (float)($body['nonTaxAllow']    ?? 0);
        $grossPay     = (float)($body['grossPay']       ?? 0);
        $withTax      = (float)($body['withholdingTax'] ?? 0);
        $sssGsis      = (float)($body['sssGsis']        ?? 0);
        $philhealth   = (float)($body['philhealth']     ?? 0);
        $pagibig      = (float)($body['pagibig']        ?? 0);
        $totalDed     = (float)($body['totalDeductions'] ?? 0);
        $netPay       = (float)($body['netPay']         ?? 0);

        $db = getDB();

        // Verify the person exists and is active (any role — everyone on payroll counts)
        $chk = $db->prepare('SELECT id FROM users WHERE id = ? AND status = "active" LIMIT 1');
        $chk->execute([$empUserId]);
        if (!$chk->fetch()) jsonError('Employee not found.');

        $startDate = DateTime::createFromFormat('!Y-m-d', $cutoffStart);
        $endDate = DateTime::createFromFormat('!Y-m-d', $cutoffEnd);
        if (!$startDate || !$endDate || $startDate->format('Y-m-d') !== $cutoffStart || $endDate->format('Y-m-d') !== $cutoffEnd || $endDate < $startDate || $startDate->diff($endDate)->days > 31) {
            jsonError('Enter a valid pay period.');
        }
        $payDate = scheduledPayDateForCutoff($payPeriod, $cutoffStart, $cutoffEnd);
        if ($payDate === null) jsonError('Use the 26th–10th cutoff for payday on the 15th, or the 11th–25th cutoff for payday on the 30th.');
        foreach (['taxAllow' => $taxAllow, 'nonTaxAllow' => $nonTaxAllow] as $field => $amount) {
            if (!is_numeric($body[$field] ?? null) || !is_finite($amount) || $amount < 0 || $amount > 1000000) {
                jsonError('Allowances must be valid non-negative amounts.');
            }
        }

        // Recompute attendance and statutory amounts server-side. The browser
        // preview is not an authority for payroll values.
        $payrollSettings = getPayrollSettings($db);
        $computedDtr = computeDtrForEmployee($db, $empUserId, $cutoffStart, $cutoffEnd, $payrollSettings);
        if (!$computedDtr) jsonError('Employee payroll details are unavailable.', 404);
        $taxAllow = round($taxAllow, 2);
        $nonTaxAllow = round($nonTaxAllow, 2);
        $basicPay = (float)$computedDtr['earnedBasic'];
        $paidLeavePay = (float)$computedDtr['paidLeavePay'];
        $taxableLeavePay = (float)$computedDtr['taxablePaidLeavePay'];
        $lateDed = (float)$computedDtr['lateDeduction'];
        $absenceDed = (float)$computedDtr['absenceDeduction'];
        $daysPresent = (float)$computedDtr['daysPresent'];
        $daysAbsent = (float)$computedDtr['daysAbsent'];
        $daysLeave = (float)$computedDtr['daysLeave'];
        $sssGsis = (float)$computedDtr['sss'];
        $philhealth = (float)$computedDtr['philhealth'];
        $pagibig = (float)$computedDtr['pagibig'];
        $grossPay = round($basicPay + $paidLeavePay + $taxAllow + $nonTaxAllow, 2);
        $taxableIncome = max(0, $basicPay + $computedDtr['taxablePaidLeavePay'] + $taxAllow - $sssGsis - $philhealth - $pagibig);
        $withTax = computeWithholdingTaxServer($taxableIncome, 2, $payrollSettings['taxBrackets']);
        $totalDed = round($withTax + $sssGsis + $philhealth + $pagibig, 2);
        $unpaidDeductionAmount = round(max(0, $totalDed - max(0, $grossPay)), 2);
        $netPay = round(max(0, $grossPay - $totalDed), 2);
        $empType = $computedDtr['employee']['employmentType'];

        // Block generating two payslips for the same employee + same cutoff
        $dupChk = $db->prepare('SELECT id FROM payslips WHERE employee_user_id=? AND cutoff_start=? AND cutoff_end=? AND status != "declined" LIMIT 1');
        $dupChk->execute([$empUserId, $cutoffStart, $cutoffEnd]);
        if ($dupChk->fetch()) jsonError('A payslip for this employee and cutoff already exists.');

        $db->prepare('
            INSERT INTO payslips
              (employee_user_id, pay_period, cutoff_start, cutoff_end, pay_date, employment_type,
               days_present, days_absent, days_leave, late_deduction, absence_deduction,
               basic_pay, paid_leave_pay, taxable_leave_pay, taxable_allow, non_tax_allow,
               gross_pay, withholding_tax, sss_gsis, philhealth, pagibig,
               total_deductions, unpaid_deduction_amount, net_pay, status, generated_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ')->execute([
            $empUserId, $payPeriod, $cutoffStart, $cutoffEnd, $payDate ?: null, $empType,
            $daysPresent, $daysAbsent, $daysLeave, $lateDed, $absenceDed,
            $basicPay, $paidLeavePay, $taxableLeavePay, $taxAllow, $nonTaxAllow,
            $grossPay, $withTax, $sssGsis, $philhealth, $pagibig,
            $totalDed, $unpaidDeductionAmount, $netPay, 'pending', $user['id']
        ]);

        $newId = $db->lastInsertId();
        auditLog($user['id'], 'generate_payslip', 'payslips', "Generated payslip id=$newId for employee=$empUserId, cutoff=$cutoffStart to $cutoffEnd");
        jsonOk([
            'payslipId' => $newId,
            'unpaidDeductionAmount' => $unpaidDeductionAmount,
        ], 'Payslip submitted for approval');
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=approve&id=PAYSLIP_ID  (chairman only)
    // --------------------------------------------------------
    case 'approve': {
        $user = requirePermission('validatePayroll');
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Payslip ID required.');

        $db = getDB();
        $st = $db->prepare('SELECT id, status, employee_user_id, pay_period FROM payslips WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $slip = $st->fetch();
        if (!$slip) jsonError('Payslip not found.', 404);
        if ($slip['status'] !== 'pending') jsonError('Only pending payslips can be approved.');

        $db->prepare('UPDATE payslips SET status="approved", approved_by=?, approved_at=NOW(), remarks=? WHERE id=?')
           ->execute([$user['id'], $body['remarks'] ?? null, $id]);

        notifyUser($slip['employee_user_id'], 'payslip_approved', 'Payslip Approved',
            "Your payslip for {$slip['pay_period']} was approved.", 'payslips');

        auditLog($user['id'], 'approve_payslip', 'payslips', "Approved payslip id=$id");
        jsonOk([], 'Payslip approved');
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=decline&id=PAYSLIP_ID  (chairman only)
    // --------------------------------------------------------
    case 'decline': {
        $user = requirePermission('validatePayroll');
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Payslip ID required.');

        $db = getDB();
        $st = $db->prepare('SELECT id, status, employee_user_id, pay_period FROM payslips WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $slip = $st->fetch();
        if (!$slip) jsonError('Payslip not found.', 404);
        if ($slip['status'] !== 'pending') jsonError('Only pending payslips can be declined.');

        $remarks = $body['remarks'] ?? 'Declined by chairman';
        $db->prepare('UPDATE payslips SET status="declined", approved_by=?, approved_at=NOW(), remarks=? WHERE id=?')
           ->execute([$user['id'], $remarks, $id]);

        notifyUser($slip['employee_user_id'], 'payslip_declined', 'Payslip Declined',
            "Your payslip for {$slip['pay_period']} was declined: $remarks", 'payslips');

        auditLog($user['id'], 'decline_payslip', 'payslips', "Declined payslip id=$id");
        jsonOk([], 'Payslip declined');
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=thirteenth-month-preview
    //  Params: employeeUserId, year
    // --------------------------------------------------------
    case 'thirteenth-month-preview': {
        $user = requirePermission('generatePayslips');
        $empUserId = (int)($_GET['employeeUserId'] ?? 0);
        $year      = (int)($_GET['year'] ?? date('Y'));
        if (!$empUserId) jsonError('employeeUserId required.');

        $db = getDB();
        $st = $db->prepare('SELECT full_name FROM users WHERE id=? LIMIT 1');
        $st->execute([$empUserId]);
        $emp = $st->fetch();
        if (!$emp) jsonError('Employee not found.', 404);

        $st = $db->prepare('
            SELECT id, pay_period, cutoff_start, cutoff_end, (basic_pay + taxable_leave_pay) AS basic_pay
            FROM payslips
            WHERE employee_user_id = ? AND payslip_type = "regular" AND status = "approved"
              AND cutoff_start IS NOT NULL AND YEAR(cutoff_start) = ?
            ORDER BY cutoff_start ASC
        ');
        $st->execute([$empUserId, $year]);
        $rows = $st->fetchAll();

        $total = 0;
        foreach ($rows as $r) $total += (float)$r['basic_pay'];
        $thirteenthMonth = round($total / 12, 2);

        $periodLabel = "13th Month Pay $year";
        $chk = $db->prepare('SELECT id, status FROM payslips WHERE employee_user_id=? AND payslip_type="13th_month" AND pay_period=? LIMIT 1');
        $chk->execute([$empUserId, $periodLabel]);
        $existing = $chk->fetch();

        jsonOk([
            'employeeName'     => $emp['full_name'],
            'year'             => $year,
            'payslips'         => $rows,
            'totalBasicPay'    => round($total, 2),
            'thirteenthMonth'  => $thirteenthMonth,
            'alreadyGenerated' => $existing ? $existing['status'] : null,
        ]);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=thirteenth-month-generate
    //  Body: { employeeUserId, year }
    // --------------------------------------------------------
    case 'thirteenth-month-generate': {
        $user = requirePermission('generatePayslips');
        $empUserId = (int)($body['employeeUserId'] ?? 0);
        $year      = (int)($body['year'] ?? 0);
        if (!$empUserId || !$year) jsonError('employeeUserId and year are required.');

        $db = getDB();

        $chk = $db->prepare('SELECT id FROM users WHERE id=? AND status="active" LIMIT 1');
        $chk->execute([$empUserId]);
        if (!$chk->fetch()) jsonError('Employee not found.');

        $periodLabel = "13th Month Pay $year";

        $dup = $db->prepare('SELECT id FROM payslips WHERE employee_user_id=? AND payslip_type="13th_month" AND pay_period=? AND status != "declined" LIMIT 1');
        $dup->execute([$empUserId, $periodLabel]);
        if ($dup->fetch()) jsonError("A 13th month payslip for $year already exists for this employee.");

        // Recompute server-side - never trust a client-submitted total for money
        $st = $db->prepare('
            SELECT (basic_pay + taxable_leave_pay) AS basic_pay FROM payslips
            WHERE employee_user_id=? AND payslip_type="regular" AND status="approved"
              AND cutoff_start IS NOT NULL AND YEAR(cutoff_start)=?
        ');
        $st->execute([$empUserId, $year]);
        $total = 0;
        foreach ($st->fetchAll() as $r) $total += (float)$r['basic_pay'];
        $thirteenthMonth = round($total / 12, 2);

        if ($thirteenthMonth <= 0) jsonError('No approved payslips found for this employee in ' . $year . '.');

        $etSt = $db->prepare('SELECT employment_type FROM employees WHERE user_id=? LIMIT 1');
        $etSt->execute([$empUserId]);
        $et = $etSt->fetchColumn() ?: 'Full-time';

        $db->prepare('
            INSERT INTO payslips
              (employee_user_id, pay_period, payslip_type, cutoff_start, cutoff_end, pay_date, employment_type,
               basic_pay, taxable_allow, non_tax_allow, gross_pay,
               withholding_tax, sss_gsis, philhealth, pagibig, total_deductions, net_pay,
               status, generated_by)
            VALUES (?,?,"13th_month",?,?,?,?,?,0,0,?,0,0,0,0,0,?,"pending",?)
        ')->execute([
            $empUserId, $periodLabel, "$year-01-01", "$year-12-31", "$year-12-24", $et,
            $thirteenthMonth, $thirteenthMonth, $thirteenthMonth, $user['id']
        ]);

        $newId = $db->lastInsertId();
        auditLog($user['id'], 'generate_13th_month', 'payslips', "Generated 13th month pay id=$newId for employee=$empUserId, year=$year, amount=$thirteenthMonth");
        jsonOk(['payslipId' => $newId, 'amount' => $thirteenthMonth], '13th month pay submitted for approval');
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=periods  — simple 12-month list
    // --------------------------------------------------------
    case 'periods': {
        requireLogin();
        $periods = [];
        $now = new DateTime();
        for ($i = 0; $i < 12; $i++) {
            $d = clone $now;
            if ($i > 0) $d->modify("-$i months");
            $periods[] = [
                'value' => $d->format('Y-m'),
                'label' => $d->format('F Y'),
            ];
        }
        jsonOk(['periods' => $periods]);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=generate-payroll  (treasurer) — batch
    //  Body: { payPeriod, cutoffStart, cutoffEnd, payDate }
    // --------------------------------------------------------
    case 'generate-payroll': {
        $user = requirePermission('generatePayslips');

        $payPeriod   = $body['payPeriod']   ?? '';
        $cutoffStart = $body['cutoffStart'] ?? '';
        $cutoffEnd   = $body['cutoffEnd']   ?? '';
        $payDate     = $body['payDate']     ?? null;

        if (!$payPeriod || !$cutoffStart || !$cutoffEnd) {
            jsonError('payPeriod, cutoffStart and cutoffEnd are required.');
        }
        if (!is_string($payPeriod) || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $payPeriod)) {
            jsonError('Enter a valid pay period.');
        }

        $db = getDB();

        // A payroll batch is ONE persistent entity per cutoff. If one already
        // exists for this exact cutoff, we either block or regenerate it in
        // place - we never create a second entity for the same period.
        $existingSt = $db->prepare('SELECT id, status FROM payroll_batches WHERE cutoff_start=? AND cutoff_end=? LIMIT 1');
        $existingSt->execute([$cutoffStart, $cutoffEnd]);
        $existingBatch = $existingSt->fetch();

        $scheduledPayDate = scheduledPayDateForCutoff($payPeriod, $cutoffStart, $cutoffEnd);
        if ($scheduledPayDate !== null) {
            $payDate = $scheduledPayDate;
        } elseif (!$existingBatch || $existingBatch['status'] !== 'declined' || !isLegacyPayrollCutoff($payPeriod, $cutoffStart, $cutoffEnd)) {
            jsonError('Use the 26th–10th cutoff for payday on the 15th, or the 11th–25th cutoff for payday on the 30th.');
        }

        if ($existingBatch) {
            if ($existingBatch['status'] === 'pending') {
                jsonError('A payroll for this cutoff is already pending chairman approval.');
            }
            if ($existingBatch['status'] === 'approved') {
                jsonError('This cutoff has already been approved. It cannot be regenerated.');
            }
            // status === 'declined' -> falls through, we regenerate this same entity
        }

        $employees = $db->query('
            SELECT e.user_id FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE u.status = "active"
        ')->fetchAll();

        if (!$employees) jsonError('No active employees found.');

        $settings = getPayrollSettings($db);

        $created = []; $skipped = 0;
        $totalGross = 0; $totalDed = 0; $totalNet = 0;
        $batchId = null;
        $isRegeneration = (bool)$existingBatch;

        $db->beginTransaction();
        try {
            if ($existingBatch) {
                $batchId = (int)$existingBatch['id'];
                // Wipe this entity's previous payslips - they're being replaced, not accumulated
                $db->prepare('DELETE FROM payslips WHERE payroll_batch_id=?')->execute([$batchId]);
                $db->prepare('UPDATE payroll_batches SET pay_period=?, pay_date=?, status="pending", generated_by=?, approved_by=NULL, approved_at=NULL, remarks=NULL WHERE id=?')
                   ->execute([$payPeriod, $payDate ?: null, $user['id'], $batchId]);
            } else {
                $db->prepare('INSERT INTO payroll_batches (pay_period,cutoff_start,cutoff_end,pay_date,status,generated_by) VALUES (?,?,?,?,"pending",?)')
                   ->execute([$payPeriod, $cutoffStart, $cutoffEnd, $payDate ?: null, $user['id']]);
                $batchId = (int)$db->lastInsertId();
            }

            foreach ($employees as $row) {
                $empUserId = (int)$row['user_id'];

                // Only skip if this employee has a DIFFERENT non-declined payslip for this
                // cutoff (e.g. one generated individually, outside this batch entity).
                $dupChk = $db->prepare('SELECT id FROM payslips WHERE employee_user_id=? AND cutoff_start=? AND cutoff_end=? AND status != "declined" AND (payroll_batch_id IS NULL OR payroll_batch_id != ?) LIMIT 1');
                $dupChk->execute([$empUserId, $cutoffStart, $cutoffEnd, $batchId]);
                if ($dupChk->fetch()) { $skipped++; continue; }

                $dtr = computeDtrForEmployee($db, $empUserId, $cutoffStart, $cutoffEnd, $settings);
                if (!$dtr) { $skipped++; continue; }

                $basic = $dtr['earnedBasic'];
                $paidLeavePay = $dtr['paidLeavePay'];
                $taxableLeavePay = $dtr['taxablePaidLeavePay'];
                $gross = round($basic + $paidLeavePay, 2);
                $sss = $dtr['sss']; $ph = $dtr['philhealth']; $pi = $dtr['pagibig'];
                $taxableIncome = max(0, $basic + $dtr['taxablePaidLeavePay'] - $sss - $ph - $pi);
                $wt = computeWithholdingTaxServer($taxableIncome, 2, $settings['taxBrackets']);
                $empTotalDed = round($wt + $sss + $ph + $pi, 2);
                $unpaidDeductionAmount = round(max(0, $empTotalDed - max(0, $gross)), 2);
                $net = round(max(0, $gross - $empTotalDed), 2);

                $db->prepare('
                    INSERT INTO payslips
                      (employee_user_id, pay_period, payslip_type, payroll_batch_id, cutoff_start, cutoff_end, pay_date, employment_type,
                       days_present, days_absent, days_leave, hours_rendered, hourly_rate_used, late_deduction, absence_deduction,
                       basic_pay, paid_leave_pay, taxable_leave_pay, taxable_allow, non_tax_allow, gross_pay,
                       withholding_tax, sss_gsis, philhealth, pagibig, total_deductions, unpaid_deduction_amount, net_pay,
                       status, generated_by)
                    VALUES (?, ?, "regular", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, "pending", ?)
                ')->execute([
                    $empUserId, $payPeriod, $batchId, $cutoffStart, $cutoffEnd, $payDate ?: null, $dtr['employee']['employmentType'],
                    $dtr['daysPresent'], $dtr['daysAbsent'], $dtr['daysLeave'], $dtr['hoursRendered'], $dtr['hourlyRate'], $dtr['lateDeduction'], $dtr['absenceDeduction'],
                    $basic, $paidLeavePay, $taxableLeavePay, $gross,
                    $wt, $sss, $ph, $pi, $empTotalDed, $unpaidDeductionAmount, $net,
                    $user['id']
                ]);

                $created[] = [
                    'payslipId'      => (int)$db->lastInsertId(),
                    'employeeUserId' => $empUserId,
                    'name'           => $dtr['employee']['name'],
                    'employmentType' => $dtr['employee']['employmentType'],
                    'hourlyRate'     => $dtr['hourlyRate'],
                    'hoursRendered'  => $dtr['hoursRendered'],
                    'sss'            => $sss,
                    'philhealth'     => $ph,
                    'pagibig'        => $pi,
                    'grossPay'       => $gross,
                    'unpaidDeductionAmount' => $unpaidDeductionAmount,
                    'netPay'         => $net,
                ];
                $totalGross += $gross; $totalDed += $empTotalDed; $totalNet += $net;
            }

            if (!$created) {
                $db->rollBack();
                jsonError('Every active employee already has a payslip for this cutoff. Nothing to generate.');
            }

            $db->prepare('UPDATE payroll_batches SET employee_count=?, total_gross=?, total_deductions=?, total_net=? WHERE id=?')
               ->execute([count($created), $totalGross, $totalDed, $totalNet, $batchId]);

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            error_log('Payroll generation failed: ' . $e->getMessage());
            jsonError('Could not generate payroll. Please try again.', 500);
        }

        $verb = $isRegeneration ? 'regenerated' : 'generated';
        auditLog($user['id'], $isRegeneration ? 'regenerate_payroll' : 'generate_payroll', 'payslips', ucfirst($verb)." payroll batch id=$batchId, ".count($created)." payslip(s), cutoff $cutoffStart to $cutoffEnd");
        jsonOk(['batchId' => $batchId, 'created' => $created, 'skippedCount' => $skipped, 'regenerated' => $isRegeneration],
            'Payroll ' . $verb . ' for ' . count($created) . ' employee(s)' . ($skipped ? " ($skipped already had a payslip for this cutoff)" : ''));
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=payroll-batches  — full history (manager/treasurer/chairman)
    // --------------------------------------------------------
    case 'payroll-batches': {
        $user = requirePermission('viewOtherEmployees');
        $db   = getDB();

        $where  = ['1=1'];
        $params = [];
        if (!empty($_GET['year'])) {
            $where[] = 'YEAR(COALESCE(pb.pay_date, pb.cutoff_start)) = ?';
            $params[] = (int)$_GET['year'];
        }
        if (!empty($_GET['month'])) {
            $where[] = 'MONTH(COALESCE(pb.pay_date, pb.cutoff_start)) = ?';
            $params[] = (int)$_GET['month'];
        }
        if (!empty($_GET['status'])) {
            $where[] = 'pb.status = ?';
            $params[] = $_GET['status'];
        }

        $st = $db->prepare('
            SELECT pb.*, g.full_name AS generated_by_name, a.full_name AS approved_by_name,
                   COALESCE((SELECT SUM(p.unpaid_deduction_amount) FROM payslips p WHERE p.payroll_batch_id=pb.id),0) AS unpaid_deduction_total
            FROM payroll_batches pb
            JOIN users g ON pb.generated_by = g.id
            LEFT JOIN users a ON pb.approved_by = a.id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY pb.created_at DESC
        ');
        $st->execute($params);
        jsonOk(['batches' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=payroll-batches-pending  (chairman approval queue)
    // --------------------------------------------------------
    case 'payroll-batches-pending': {
        $user = requirePermission('validatePayroll');
        $db   = getDB();
        $st = $db->prepare('
            SELECT pb.*, g.full_name AS generated_by_name,
                   COALESCE((SELECT SUM(p.unpaid_deduction_amount) FROM payslips p WHERE p.payroll_batch_id=pb.id),0) AS unpaid_deduction_total
            FROM payroll_batches pb
            JOIN users g ON pb.generated_by = g.id
            WHERE pb.status = "pending"
            ORDER BY pb.created_at ASC
        ');
        $st->execute();
        jsonOk(['batches' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=payroll-batch-detail&id=X
    // --------------------------------------------------------
    case 'payroll-batch-detail': {
        $user = requireLogin();
        if (!hasPermission('viewOtherEmployees') && !hasPermission('validatePayroll')) {
            jsonError('Access denied. You do not have permission to review payroll batches.', 403);
        }
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Batch ID required.');
        $db = getDB();

        $st = $db->prepare('SELECT pb.*, g.full_name AS generated_by_name, a.full_name AS approved_by_name FROM payroll_batches pb JOIN users g ON pb.generated_by=g.id LEFT JOIN users a ON pb.approved_by=a.id WHERE pb.id=? LIMIT 1');
        $st->execute([$id]);
        $batch = $st->fetch();
        if (!$batch) jsonError('Payroll batch not found.', 404);

        $st = $db->prepare('
            SELECT p.*, u.full_name AS employee_name, u.staff_id, u.department
            FROM payslips p
            JOIN users u ON p.employee_user_id=u.id
            WHERE p.payroll_batch_id=?
            ORDER BY u.full_name
        ');
        $st->execute([$id]);

        jsonOk(['batch' => $batch, 'payslips' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=approve-payroll-batch&id=X  (chairman)
    // --------------------------------------------------------
    case 'approve-payroll-batch': {
        $user = requirePermission('validatePayroll');
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Batch ID required.');
        $db = getDB();

        $st = $db->prepare('SELECT id,status,generated_by,pay_period FROM payroll_batches WHERE id=? LIMIT 1');
        $st->execute([$id]);
        $batch = $st->fetch();
        if (!$batch) jsonError('Payroll batch not found.', 404);
        if ($batch['status'] !== 'pending') jsonError('This payroll batch is already ' . $batch['status'] . '.');

        $empSt = $db->prepare('SELECT employee_user_id FROM payslips WHERE payroll_batch_id=? AND status="pending"');
        $empSt->execute([$id]);
        $employeeIds = array_column($empSt->fetchAll(), 'employee_user_id');

        $db->beginTransaction();
        try {
            $db->prepare('UPDATE payroll_batches SET status="approved", approved_by=?, approved_at=NOW(), remarks=? WHERE id=?')
               ->execute([$user['id'], $body['remarks'] ?? null, $id]);
            $db->prepare('UPDATE payslips SET status="approved", approved_by=?, approved_at=NOW() WHERE payroll_batch_id=? AND status="pending"')
               ->execute([$user['id'], $id]);
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            error_log('Payroll approval failed: ' . $e->getMessage());
            jsonError('Could not approve payroll. Please try again.', 500);
        }

        foreach ($employeeIds as $empId) {
            notifyUser($empId, 'payslip_approved', 'Payslip Approved',
                "Your payslip for {$batch['pay_period']} was approved.", 'payslips');
        }
        notifyUser($batch['generated_by'], 'payroll_approved', 'Payroll Approved',
            "The payroll batch for {$batch['pay_period']} you submitted was approved.", 'payroll-history');

        auditLog($user['id'], 'approve_payroll', 'payslips', "Approved payroll batch id=$id");
        jsonOk([], 'Payroll approved');
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=decline-payroll-batch&id=X  (chairman)
    // --------------------------------------------------------
    case 'decline-payroll-batch': {
        $user = requirePermission('validatePayroll');
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Batch ID required.');
        $db = getDB();

        $st = $db->prepare('SELECT id,status,generated_by,pay_period FROM payroll_batches WHERE id=? LIMIT 1');
        $st->execute([$id]);
        $batch = $st->fetch();
        if (!$batch) jsonError('Payroll batch not found.', 404);
        if ($batch['status'] !== 'pending') jsonError('This payroll batch is already ' . $batch['status'] . '.');

        $remarks = $body['remarks'] ?? 'Declined by chairman';

        $db->beginTransaction();
        try {
            $db->prepare('UPDATE payroll_batches SET status="declined", approved_by=?, approved_at=NOW(), remarks=? WHERE id=?')
               ->execute([$user['id'], $remarks, $id]);
            $db->prepare('UPDATE payslips SET status="declined", approved_by=?, approved_at=NOW(), remarks=? WHERE payroll_batch_id=? AND status="pending"')
               ->execute([$user['id'], $remarks, $id]);
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            error_log('Payroll decline failed: ' . $e->getMessage());
            jsonError('Could not decline payroll. Please try again.', 500);
        }

        notifyUser($batch['generated_by'], 'payroll_declined', 'Payroll Sent Back for Revision',
            "Your payroll batch for {$batch['pay_period']} needs revision: $remarks", 'generate-payroll');

        auditLog($user['id'], 'decline_payroll', 'payslips', "Sent payroll batch id=$id back for revision");
        jsonOk([], 'Payroll sent back to the treasurer for revision');
        break;
    }


    // --------------------------------------------------------
    //  GET ?action=monthly-totals  — last 6 months of approved
    //  payroll, for the treasurer/chairman dashboard chart
    // --------------------------------------------------------
    case 'monthly-totals': {
        $user = requirePermission('viewOtherEmployees');
        $db   = getDB();
        $st = $db->query('
            SELECT DATE_FORMAT(cutoff_start, "%Y-%m") AS ym,
                   SUM(gross_pay) AS total_gross, SUM(net_pay) AS total_net
            FROM payslips
            WHERE payslip_type="regular" AND status="approved" AND cutoff_start IS NOT NULL
            GROUP BY DATE_FORMAT(cutoff_start, "%Y-%m")
            ORDER BY ym DESC
            LIMIT 6
        ');
        $rows = array_reverse($st->fetchAll());
        jsonOk(['months' => $rows]);
        break;
    }
    default:
        jsonError('Unknown action', 404);
}
