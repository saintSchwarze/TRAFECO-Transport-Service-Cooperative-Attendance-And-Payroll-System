<?php
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/payroll_cutoff.php';

commonHeaders();
$action = $_GET['action'] ?? 'list';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
apiMutationGuard([
    'approve' => 'PUT', 'decline' => 'PUT',
    'thirteenth-month-batch-generate' => 'POST', 'generate-payroll' => 'POST',
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
            $weekday = (int)$d->format('N') < 6;
            $isPaternityDay = $lv['leave_type'] !== 'Paternity Leave' || ($weekday && ($paternityDates ? in_array($dateKey, $paternityDates, true) : $calendarOffset < 7));
            if ($isPaternityDay && $dateKey >= $cutoffStart && $dateKey <= $cutoffEnd) $leaveDays[$dateKey] = $lv['leave_type'];
            if ($isMaternity && $calendarOffset < $maternityPaidDays && $dateKey >= $cutoffStart && $dateKey <= $cutoffEnd) {
                $cents = $baseCents + ($calendarOffset < $remainderCents ? 1 : 0);
                $maternityPayByDate[$dateKey] = ($maternityPayByDate[$dateKey] ?? 0) + $cents;
            }
            if ($lv['leave_type'] === 'Paternity Leave' && $weekday && ($paternityDates ? in_array($dateKey, $paternityDates, true) : $calendarOffset < 7) && $dateKey >= $cutoffStart && $dateKey <= $cutoffEnd) {
                $paternityPaidDates[$dateKey] = true;
            }
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

function findOverlappingPayrollBatch(PDO $db, string $cutoffStart, string $cutoffEnd, ?int $excludeId = null, bool $approvedOnly = false): ?array {
    $statusFilter = $approvedOnly ? 'status="approved"' : 'status IN ("pending","approved")';
    $sql = 'SELECT id, cutoff_start, cutoff_end, status FROM payroll_batches WHERE batch_type="regular" AND cutoff_start<=? AND cutoff_end>=? AND ' . $statusFilter;
    $params = [$cutoffEnd, $cutoffStart];
    if ($excludeId !== null) {
        $sql .= ' AND id!=?';
        $params[] = $excludeId;
    }
    $st = $db->prepare($sql . ' ORDER BY cutoff_start DESC LIMIT 1');
    $st->execute($params);
    return $st->fetch() ?: null;
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
            WHERE p.status = "pending" AND p.payroll_batch_id IS NULL
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
    //  PUT ?action=approve&id=PAYSLIP_ID  (chairman only)
    // --------------------------------------------------------
    case 'approve': {
        $user = requirePermission('validatePayroll');
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Payslip ID required.');

        $db = getDB();
        $st = $db->prepare('SELECT id, status, employee_user_id, pay_period, payslip_type, payroll_batch_id, cutoff_start, cutoff_end, pay_date FROM payslips WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $slip = $st->fetch();
        if (!$slip) jsonError('Payslip not found.', 404);
        if ($slip['status'] !== 'pending') jsonError('Only pending payslips can be approved.');
        if ($slip['payroll_batch_id'] !== null) jsonError('This payslip belongs to a batch. Review and decide the entire batch from Approve Payroll.', 409);

        if ($slip['payslip_type'] === 'regular') {
            $expectedPayDate = $slip['cutoff_start'] !== null && $slip['cutoff_end'] !== null
                ? scheduledPayDateForCutoff($slip['pay_period'], $slip['cutoff_start'], $slip['cutoff_end']) : null;
            if ($expectedPayDate === null || $slip['pay_date'] !== $expectedPayDate) {
                jsonError('This payslip does not follow the current cutoff and payday schedule. Decline it and generate a new payslip.', 409);
            }
            $overlapSt = $db->prepare('SELECT id,cutoff_start,cutoff_end FROM payslips WHERE employee_user_id=? AND payslip_type="regular" AND status="approved" AND cutoff_start<=? AND cutoff_end>=? AND id!=? LIMIT 1');
            $overlapSt->execute([$slip['employee_user_id'], $slip['cutoff_end'], $slip['cutoff_start'], $id]);
            if ($overlap = $overlapSt->fetch()) {
                jsonError("This employee already has an approved payslip covering {$overlap['cutoff_start']} to {$overlap['cutoff_end']}.", 409);
            }
        }

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
        $st = $db->prepare('SELECT id, status, employee_user_id, pay_period, payroll_batch_id FROM payslips WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $slip = $st->fetch();
        if (!$slip) jsonError('Payslip not found.', 404);
        if ($slip['status'] !== 'pending') jsonError('Only pending payslips can be declined.');
        if ($slip['payroll_batch_id'] !== null) jsonError('This payslip belongs to a batch. Review and decide the entire batch from Approve Payroll.', 409);

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
    //  GET ?action=thirteenth-month-batch-preview&year=YYYY
    // --------------------------------------------------------
    case 'thirteenth-month-batch-preview': {
        $user = requirePermission('generatePayslips');
        $year = (int)($_GET['year'] ?? date('Y'));
        if ($year < 2000 || $year > (int)date('Y')) jsonError('Choose a valid calendar year.');
        $db = getDB();
        $st = $db->prepare('
            SELECT u.id AS employee_user_id, u.full_name, u.staff_id, e.department, e.employment_type,
                   COALESCE(earn.total_basic,0) AS total_basic,
                   COALESCE(earn.pay_count,0) AS approved_pay_count,
                   (SELECT p.status FROM payslips p WHERE p.employee_user_id=u.id AND p.payslip_type="13th_month" AND p.pay_period=? ORDER BY p.id DESC LIMIT 1) AS existing_status
            FROM users u
            JOIN employees e ON e.user_id=u.id
            JOIN (
                SELECT employee_user_id, SUM(basic_pay + taxable_leave_pay) AS total_basic, COUNT(*) AS pay_count
                FROM payslips
                WHERE payslip_type="regular" AND status="approved" AND cutoff_start IS NOT NULL AND YEAR(cutoff_start)=?
                GROUP BY employee_user_id
            ) earn ON earn.employee_user_id=u.id
            WHERE u.role IN ("employee","manager","chairman","treasurer")
              AND u.status IN ("active","inactive")
            ORDER BY u.full_name
        ');
        $st->execute(["13th Month Pay $year", $year]);
        $rows = $st->fetchAll();
        $included = 0; $excluded = 0; $totalBasic = 0.0; $totalPay = 0.0;
        foreach ($rows as &$row) {
            $row['total_basic'] = round((float)$row['total_basic'], 2);
            $row['thirteenth_month'] = round($row['total_basic'] / 12, 2);
            $locked = in_array($row['existing_status'], ['pending','approved'], true);
            $row['can_generate'] = !$locked && $row['thirteenth_month'] > 0;
            if ($row['can_generate']) { $included++; $totalBasic += $row['total_basic']; $totalPay += $row['thirteenth_month']; }
            else $excluded++;
        }
        unset($row);
        $batchSt = $db->prepare('SELECT id,status FROM payroll_batches WHERE batch_type="13th_month" AND pay_period=? AND status IN ("pending","approved") ORDER BY id DESC LIMIT 1');
        $batchSt->execute(["13th Month Pay $year"]);
        $existingBatch = $batchSt->fetch() ?: null;
        jsonOk([
            'year' => $year,
            'employees' => $rows,
            'eligibleCount' => $included,
            'excludedCount' => $excluded,
            'totalBasicPay' => round($totalBasic, 2),
            'totalThirteenthMonth' => round($totalPay, 2),
            'existingBatch' => $existingBatch,
        ]);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=thirteenth-month-batch-generate
    //  Recalculates from approved regular payslips on the server.
    // --------------------------------------------------------
    case 'thirteenth-month-batch-generate': {
        $user = requirePermission('generatePayslips');
        $year = (int)($body['year'] ?? 0);
        if ($year < 2000 || $year > (int)date('Y')) jsonError('Choose a valid calendar year.');
        $db = getDB();
        $periodLabel = "13th Month Pay $year";
        $db->beginTransaction();
        try {
            $batchLock = $db->prepare('SELECT id FROM payroll_batches WHERE batch_type="13th_month" AND pay_period=? AND status IN ("pending","approved") LIMIT 1 FOR UPDATE');
            $batchLock->execute([$periodLabel]);
            if ($batchLock->fetch()) {
                $db->rollBack();
                jsonError("A 13th-month batch for $year is already pending or approved.", 409);
            }
            $st = $db->prepare('
                SELECT u.id AS employee_user_id, u.full_name, e.employment_type,
                       SUM(p.basic_pay + p.taxable_leave_pay) AS total_basic,
                       (SELECT p2.status FROM payslips p2 WHERE p2.employee_user_id=u.id AND p2.payslip_type="13th_month" AND p2.pay_period=? ORDER BY p2.id DESC LIMIT 1) AS existing_status
                FROM users u
                JOIN employees e ON e.user_id=u.id
                JOIN payslips p ON p.employee_user_id=u.id
                WHERE u.role IN ("employee","manager","chairman","treasurer")
                  AND u.status IN ("active","inactive")
                  AND p.payslip_type="regular" AND p.status="approved" AND p.cutoff_start IS NOT NULL AND YEAR(p.cutoff_start)=?
                GROUP BY u.id,u.full_name,e.employment_type
                ORDER BY u.id
            ');
            $st->execute([$periodLabel, $year]);
            $employees = $st->fetchAll();
            $items = [];
            foreach ($employees as $employee) {
                if (in_array($employee['existing_status'], ['pending','approved'], true)) continue;
                $basic = round((float)$employee['total_basic'], 2);
                $amount = round($basic / 12, 2);
                if ($amount <= 0) continue;
                $items[] = ['employee' => $employee, 'basic' => $basic, 'amount' => $amount];
            }
            if (!$items) {
                $db->rollBack();
                jsonError('No eligible employees with approved payroll records are available for this batch.', 409);
            }
            $total = array_sum(array_column($items, 'amount'));
            $db->prepare('INSERT INTO payroll_batches (batch_type,pay_period,cutoff_start,cutoff_end,pay_date,employee_count,total_gross,total_deductions,total_net,status,generated_by) VALUES ("13th_month",?,?,?,?,?,?,0,?,"pending",?)')
                ->execute([$periodLabel, "$year-01-01", "$year-12-31", "$year-12-24", count($items), $total, $total, $user['id']]);
            $batchId = (int)$db->lastInsertId();
            $insert = $db->prepare('INSERT INTO payslips (employee_user_id,pay_period,payslip_type,payroll_batch_id,cutoff_start,cutoff_end,pay_date,employment_type,basic_pay,thirteenth_month_basis,gross_pay,total_deductions,net_pay,status,generated_by) VALUES (?, ?, "13th_month", ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, "pending", ?)');
            foreach ($items as $item) {
                $employee = $item['employee']; $amount = $item['amount'];
                $insert->execute([$employee['employee_user_id'],$periodLabel,$batchId,"$year-01-01","$year-12-31","$year-12-24",$employee['employment_type'],$amount,$item['basic'],$amount,$amount,$user['id']]);
            }
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('13th-month batch generation failed: ' . $e->getMessage());
            jsonError('Could not generate the 13th-month batch. Please try again.', 500);
        }
        auditLog($user['id'], 'generate_13th_month_batch', 'payslips', "Generated 13th-month batch id=$batchId for year=$year with " . count($items) . ' employees; total=' . number_format($total, 2, '.', ''));
        jsonOk(['batchId' => $batchId, 'employeeCount' => count($items), 'total' => round($total, 2)], "13th-month batch for $year submitted for chairman approval.");
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
        $existingSt = $db->prepare('SELECT id, status FROM payroll_batches WHERE batch_type="regular" AND cutoff_start=? AND cutoff_end=? LIMIT 1');
        $existingSt->execute([$cutoffStart, $cutoffEnd]);
        $existingBatch = $existingSt->fetch();

        $scheduledPayDate = scheduledPayDateForCutoff($payPeriod, $cutoffStart, $cutoffEnd);
        if ($scheduledPayDate === null) {
            jsonError('Use the 26th–10th cutoff for payday on the 15th, or the 11th–25th cutoff for payday on the 30th (month-end in shorter months).');
        }
        $payDate = $scheduledPayDate;

        if ($existingBatch) {
            if ($existingBatch['status'] === 'pending') {
                jsonError('A payroll for this cutoff is already pending chairman approval.');
            }
            if ($existingBatch['status'] === 'approved') {
                jsonError('This cutoff has already been approved. It cannot be regenerated.');
            }
            // status === 'declined' -> falls through, we regenerate this same entity
        }

        $overlap = findOverlappingPayrollBatch($db, $cutoffStart, $cutoffEnd, $existingBatch ? (int)$existingBatch['id'] : null);
        if ($overlap) {
            jsonError("This cutoff overlaps payroll batch #{$overlap['id']} ({$overlap['cutoff_start']} to {$overlap['cutoff_end']}, {$overlap['status']}). Review that batch before generating another payroll.", 409);
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

                // Keep an employee's attendance days from being paid again by
                // a separate regular payslip or batch with overlapping dates.
                $dupChk = $db->prepare('SELECT id FROM payslips WHERE employee_user_id=? AND payslip_type="regular" AND cutoff_start<=? AND cutoff_end>=? AND status!="declined" AND (payroll_batch_id IS NULL OR payroll_batch_id!=?) LIMIT 1');
                $dupChk->execute([$empUserId, $cutoffEnd, $cutoffStart, $batchId]);
                if ($dupChk->fetch()) { $skipped++; continue; }

                $dtr = computeDtrForEmployee($db, $empUserId, $cutoffStart, $cutoffEnd, $settings);
                if (!$dtr) { $skipped++; continue; }

                // Keep basic_pay as earned basic salary for the 13th-month
                // calculation. Gross pay adds back attendance adjustments so
                // the payslip can show them explicitly as deductions.
                $basic = $dtr['earnedBasic'];
                $paidLeavePay = $dtr['paidLeavePay'];
                $taxableLeavePay = $dtr['taxablePaidLeavePay'];
                $otherDeductions = round($dtr['lateDeduction'] + $dtr['absenceDeduction'], 2);
                $gross = round($basic + $paidLeavePay + $otherDeductions, 2);
                $sss = $dtr['sss']; $ph = $dtr['philhealth']; $pi = $dtr['pagibig'];
                $taxableIncome = max(0, $basic + $dtr['taxablePaidLeavePay'] - $sss - $ph - $pi);
                $wt = computeWithholdingTaxServer($taxableIncome, 2, $settings['taxBrackets']);
                $empTotalDed = round($wt + $sss + $ph + $pi + $otherDeductions, 2);
                $unpaidDeductionAmount = round(max(0, $empTotalDed - max(0, $gross)), 2);
                $net = round(max(0, $gross - $empTotalDed), 2);

                $db->prepare('
                    INSERT INTO payslips
                      (employee_user_id, pay_period, payslip_type, payroll_batch_id, cutoff_start, cutoff_end, pay_date, employment_type,
                       days_present, days_absent, days_leave, hours_rendered, hourly_rate_used, daily_rate_used, late_deduction, absence_deduction,
                       basic_pay, paid_leave_pay, taxable_leave_pay, taxable_allow, non_tax_allow, gross_pay,
                       withholding_tax, sss_gsis, philhealth, pagibig, total_deductions, unpaid_deduction_amount, net_pay,
                       status, generated_by)
                    VALUES (?, ?, "regular", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, "pending", ?)
                ')->execute([
                    $empUserId, $payPeriod, $batchId, $cutoffStart, $cutoffEnd, $payDate ?: null, $dtr['employee']['employmentType'],
                    $dtr['daysPresent'], $dtr['daysAbsent'], $dtr['daysLeave'], $dtr['hoursRendered'], $dtr['hourlyRate'], $dtr['dailyRate'], $dtr['lateDeduction'], $dtr['absenceDeduction'],
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
                jsonError('Every active employee already has a payslip covering some or all of this cutoff. Nothing to generate.');
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
            'Payroll ' . $verb . ' for ' . count($created) . ' employee(s)' . ($skipped ? " ($skipped had an overlapping payslip or missing payroll details)" : ''));
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
        if (!empty($_GET['batchType']) && in_array($_GET['batchType'], ['regular','13th_month'], true)) {
            $where[] = 'pb.batch_type = ?';
            $params[] = $_GET['batchType'];
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

        $st = $db->prepare('SELECT id,batch_type,status,generated_by,pay_period,cutoff_start,cutoff_end,pay_date FROM payroll_batches WHERE id=? LIMIT 1');
        $st->execute([$id]);
        $batch = $st->fetch();
        if (!$batch) jsonError('Payroll batch not found.', 404);
        if ($batch['status'] !== 'pending') jsonError('This payroll batch is already ' . $batch['status'] . '.');

        if ($batch['batch_type'] === 'regular') {
            $expectedPayDate = scheduledPayDateForCutoff($batch['pay_period'], $batch['cutoff_start'], $batch['cutoff_end']);
            if ($expectedPayDate === null || $batch['pay_date'] !== $expectedPayDate) {
                jsonError('This batch does not follow the current cutoff and payday schedule. Decline it and generate a new batch.', 409);
            }
            $overlap = findOverlappingPayrollBatch($db, $batch['cutoff_start'], $batch['cutoff_end'], $id, true);
            if ($overlap) {
                jsonError("Cannot approve this batch: payroll batch #{$overlap['id']} already covers {$overlap['cutoff_start']} to {$overlap['cutoff_end']}.", 409);
            }
            $overlapSt = $db->prepare('SELECT p.id,p.cutoff_start,p.cutoff_end FROM payslips p JOIN payslips current_slip ON current_slip.employee_user_id=p.employee_user_id AND current_slip.payroll_batch_id=? WHERE p.payslip_type="regular" AND p.status="approved" AND p.cutoff_start<=current_slip.cutoff_end AND p.cutoff_end>=current_slip.cutoff_start AND (p.payroll_batch_id IS NULL OR p.payroll_batch_id!=?) LIMIT 1');
            $overlapSt->execute([$id, $id]);
            if ($overlap = $overlapSt->fetch()) {
                jsonError("Cannot approve this batch: approved payslip #{$overlap['id']} already covers {$overlap['cutoff_start']} to {$overlap['cutoff_end']}.", 409);
            }
        } elseif ($batch['batch_type'] === '13th_month') {
            $expectedStart = substr($batch['pay_period'], -4) . '-01-01';
            $expectedEnd = substr($batch['pay_period'], -4) . '-12-31';
            $expectedPayDate = substr($batch['pay_period'], -4) . '-12-24';
            if ($batch['cutoff_start'] !== $expectedStart || $batch['cutoff_end'] !== $expectedEnd || $batch['pay_date'] !== $expectedPayDate) {
                jsonError('This annual batch has inconsistent year or payment dates.', 409);
            }
            $countSt = $db->prepare('SELECT COUNT(*) FROM payslips WHERE payroll_batch_id=? AND payslip_type="13th_month" AND status="pending"');
            $countSt->execute([$id]);
        if ((int)$countSt->fetchColumn() !== (int)$db->query('SELECT employee_count FROM payroll_batches WHERE id=' . (int)$id)->fetchColumn()) {
                jsonError('This annual batch is incomplete. Decline it and regenerate it.', 409);
            }
        } else {
            jsonError('Unknown payroll batch type.', 409);
        }

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
