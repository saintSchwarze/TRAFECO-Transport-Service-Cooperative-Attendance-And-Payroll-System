<?php
require_once __DIR__ . '/../config/helpers.php';

commonHeaders();
$action = $_GET['action'] ?? 'attendance';

switch ($action) {

    // --------------------------------------------------------
    //  GET ?action=attendance
    //  Params: dateFrom, dateTo, department
    // --------------------------------------------------------
    case 'attendance': {
        $user = requirePermission('generateReports');
        $db   = getDB();

        $dateFrom   = $_GET['dateFrom']   ?? date('Y-m-01');
        $dateTo     = $_GET['dateTo']     ?? date('Y-m-d');
        $department = $_GET['department'] ?? '';

        // Join condition only covers the date range (decides which attendance
        // rows match) - it must NOT contain the department filter, since a
        // LEFT JOIN's ON clause can't remove rows from the left-hand table.
        $joinWhere  = ['al.scanned_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)'];
        $joinParams = [$dateFrom, $dateTo];

        // Row-level filter - this is what actually determines which
        // employees appear in the report at all.
        $userWhere  = ['u.status = "active"'];
        $userParams = [];
        if ($department) {
            $userWhere[]  = 'u.department = ?';
            $userParams[] = $department;
        }

        $sql = '
            SELECT u.id, u.full_name, u.staff_id, u.department,
                   COUNT(CASE WHEN al.scan_type="time_in" THEN 1 END) AS days_present,
                   COUNT(CASE WHEN al.scan_type="time_out" THEN 1 END) AS days_out,
                   MIN(al.scanned_at) AS first_scan, MAX(al.scanned_at) AS last_scan
            FROM users u
            LEFT JOIN attendance_logs al ON al.user_id = u.id AND ' . implode(' AND ', $joinWhere) . '
            WHERE ' . implode(' AND ', $userWhere) . '
            GROUP BY u.id, u.full_name, u.staff_id, u.department
            ORDER BY u.department, u.full_name
        ';

        $st = $db->prepare($sql);
        $st->execute(array_merge($joinParams, $userParams));
        jsonOk(['report' => $st->fetchAll(), 'dateFrom' => $dateFrom, 'dateTo' => $dateTo]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=payroll
    // --------------------------------------------------------
    case 'payroll': {
        $user = requirePermission('generateReports');
        $db   = getDB();

        $year = $_GET['year'] ?? '';
        $group = $_GET['group'] ?? 'monthly';
        $payDateExpr = 'COALESCE(p.pay_date, p.cutoff_start)';
        $periodExpressions = [
            'monthly' => "DATE_FORMAT($payDateExpr, '%Y-%m')",
            'yearly' => "CAST(YEAR($payDateExpr) AS CHAR)",
        ];
        if (!isset($periodExpressions[$group])) $group = 'monthly';
        $periodExpr = $periodExpressions[$group];
        $where = [];
        $params = [];
        if ($year !== '') {
            $where[]  = "YEAR($payDateExpr) = ?";
            $params[] = (int)$year;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT $periodExpr AS pay_period, MIN(p.cutoff_start) AS cutoff_start, MAX(p.cutoff_end) AS cutoff_end, p.payslip_type,
                   COUNT(p.id) AS employee_count,
                   SUM(p.gross_pay) AS total_gross,
                   SUM(p.sss_gsis) AS total_sss,
                   SUM(p.philhealth) AS total_philhealth,
                   SUM(p.pagibig) AS total_pagibig,
                   SUM(p.withholding_tax) AS total_tax,
                   SUM(p.net_pay) AS total_net,
                   p.status
            FROM payslips p
            $whereSql
            GROUP BY pay_period, p.payslip_type, p.status
            ORDER BY MIN($payDateExpr) DESC, pay_period DESC
        ";
        $st = $db->prepare($sql);
        $st->execute($params);
        jsonOk(['report' => $st->fetchAll(), 'group' => $group, 'year' => $year]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=financial
    // --------------------------------------------------------
    case 'financial': {
        $user = requirePermission('generateFinancialReports');
        $db   = getDB();

        $year = (int)($_GET['year'] ?? date('Y'));
        $group = $_GET['group'] ?? 'monthly';
        $payDateExpr = 'COALESCE(p.pay_date, p.cutoff_start)';
        $periodExpressions = [
            'monthly' => "DATE_FORMAT($payDateExpr, '%Y-%m')",
            'quarterly' => "CONCAT(YEAR($payDateExpr), '-Q', QUARTER($payDateExpr))",
            'yearly' => "CAST(YEAR($payDateExpr) AS CHAR)",
        ];
        if (!isset($periodExpressions[$group])) $group = 'monthly';
        $periodExpr = $periodExpressions[$group];

        // Detailed breakdown grouped at the selected calendar interval.
        $sql = "
            SELECT $periodExpr AS report_period,
                   COUNT(p.id) AS payslip_count,
                   SUM(p.gross_pay) AS total_gross,
                   SUM(p.taxable_allow + p.non_tax_allow) AS total_allowances,
                   SUM(p.total_deductions) AS total_deductions,
                   SUM(p.withholding_tax) AS total_tax,
                   SUM(p.net_pay) AS total_net
            FROM payslips p
            WHERE YEAR($payDateExpr) = ? AND p.status = 'approved'
            GROUP BY report_period
            ORDER BY MIN($payDateExpr)
        ";
        $st = $db->prepare($sql);
        $st->execute([$year]);
        $periodReport = $st->fetchAll();

        // Whole-year totals (Gross → Net breakdown)
        $totSt = $db->prepare('
            SELECT COUNT(id) AS payslip_count,
                   COALESCE(SUM(gross_pay),0) AS total_gross,
                   COALESCE(SUM(taxable_allow + non_tax_allow),0) AS total_allowances,
                   COALESCE(SUM(total_deductions),0) AS total_deductions,
                   COALESCE(SUM(withholding_tax),0) AS total_tax,
                   COALESCE(SUM(sss_gsis),0) AS total_sss,
                   COALESCE(SUM(philhealth),0) AS total_philhealth,
                   COALESCE(SUM(pagibig),0) AS total_pagibig,
                   COALESCE(SUM(net_pay),0) AS total_net
            FROM payslips WHERE status="approved" AND YEAR(COALESCE(pay_date, cutoff_start))=?
        ');
        $totSt->execute([$year]);
        $totals = $totSt->fetch();
        $totalPayroll = (float)$totals['total_net'];

        // Employer-side government contributions are NOT stored anywhere in
        // this system - only the employee's deducted share is (sss_gsis,
        // philhealth, pagibig). These are ESTIMATES using standard
        // contribution-sharing ratios, for internal budgeting only - verify
        // against your actual SSS/PhilHealth/Pag-IBIG tables before filing.
        $employerContributions = [
            'sss'        => round(((float)$totals['total_sss']) * 2, 2),               // employer share ≈ 2x employee share under current SSS tables
            'philhealth' => round((float)$totals['total_philhealth'], 2),               // 50/50 employer-employee split
            'pagibig'    => round((float)$totals['total_pagibig'], 2),                  // matching employer contribution
            'ec'         => round(((int)$totals['payslip_count']) * 10, 2),             // flat EC premium per payslip, lower salary bracket
        ];
        $employerContributions['total'] = round(array_sum($employerContributions), 2);

        // Department breakdown
        $deptSt = $db->prepare('
            SELECT COALESCE(NULLIF(u.department,""),"Unassigned") AS department,
                   COUNT(DISTINCT p.employee_user_id) AS employee_count,
                   SUM(p.gross_pay) AS total_gross,
                   SUM(p.total_deductions) AS total_deductions,
                   SUM(p.net_pay) AS total_net
            FROM payslips p
            JOIN users u ON p.employee_user_id = u.id
            WHERE YEAR($payDateExpr) = ? AND p.status = "approved"
            GROUP BY department
            ORDER BY total_gross DESC
        ');
        $deptSt->execute([$year]);
        $departments = $deptSt->fetchAll();

        jsonOk([
            'report'                => $periodReport,
            'totals'                => $totals,
            'employerContributions' => $employerContributions,
            'departments'           => $departments,
            'totalPayroll'          => $totalPayroll,
            'year'                  => $year,
            'group'                 => $group,
        ]);
        break;
    }

    default:
        jsonError('Unknown action', 404);
}
