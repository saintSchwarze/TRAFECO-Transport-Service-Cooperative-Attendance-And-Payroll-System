<?php
require_once __DIR__ . '/../config/helpers.php';

commonHeaders();
$action = $_GET['action'] ?? 'users';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
apiMutationGuard([
    'toggle-user' => 'PUT', 'update-settings' => 'PUT', 'archive-run' => 'POST', 'dashboard-stats' => 'GET',
    'mark-notification-read' => 'PUT', 'mark-all-notifications-read' => 'PUT',
    'delete-notification' => 'DELETE', 'clear-notifications' => 'DELETE',
]);

// ============================================================
//  Shared archiving engine. Never deletes anything - only
//  flags old rows with archived_at and writes a CSV export
//  (kept on the server, one file per run) as an offline copy.
// ============================================================
function runArchiveProcess(PDO $db, int $triggeredByUserId, string $triggerType): array {
    $st = $db->prepare('SELECT setting_value FROM system_settings WHERE setting_key="archive_after_years" LIMIT 1');
    $st->execute();
    $years  = (float)($st->fetchColumn() ?: 3);
    $cutoff = date('Y-m-d', strtotime("-{$years} years"));

    $csvRows = [['table', 'id', 'employee', 'date', 'details']];

    // Attendance logs
    $st = $db->prepare('
        SELECT al.id, u.full_name, u.staff_id, al.scan_type, al.scanned_at
        FROM attendance_logs al JOIN users u ON al.user_id = u.id
        WHERE al.scanned_at < ? AND al.archived_at IS NULL
    ');
    $st->execute([$cutoff]);
    $attRows = $st->fetchAll();
    foreach ($attRows as $r) {
        $csvRows[] = ['attendance_logs', $r['id'], "{$r['full_name']} ({$r['staff_id']})", $r['scanned_at'], $r['scan_type']];
    }
    $attCount = count($attRows);
    if ($attCount) {
        $db->prepare('UPDATE attendance_logs SET archived_at=NOW() WHERE scanned_at < ? AND archived_at IS NULL')->execute([$cutoff]);
    }

    // Leave requests
    $st = $db->prepare('
        SELECT lr.id, u.full_name, u.staff_id, lr.leave_type, lr.date_from, lr.date_to, lr.status
        FROM leave_requests lr JOIN users u ON lr.user_id = u.id
        WHERE lr.date_to < ? AND lr.archived_at IS NULL
    ');
    $st->execute([$cutoff]);
    $leaveRows = $st->fetchAll();
    foreach ($leaveRows as $r) {
        $csvRows[] = ['leave_requests', $r['id'], "{$r['full_name']} ({$r['staff_id']})", "{$r['date_from']} to {$r['date_to']}", "{$r['leave_type']} - {$r['status']}"];
    }
    $leaveCount = count($leaveRows);
    if ($leaveCount) {
        $db->prepare('UPDATE leave_requests SET archived_at=NOW() WHERE date_to < ? AND archived_at IS NULL')->execute([$cutoff]);
    }

    // Payslips - only ones already decided; a pending payslip is never archived regardless of age
    $st = $db->prepare('
        SELECT p.id, u.full_name, u.staff_id, p.pay_period, p.cutoff_end, p.status, p.net_pay
        FROM payslips p JOIN users u ON p.employee_user_id = u.id
        WHERE p.cutoff_end < ? AND p.status != "pending" AND p.archived_at IS NULL
    ');
    $st->execute([$cutoff]);
    $paySlipRows = $st->fetchAll();
    foreach ($paySlipRows as $r) {
        $csvRows[] = ['payslips', $r['id'], "{$r['full_name']} ({$r['staff_id']})", $r['cutoff_end'], "{$r['pay_period']} - {$r['status']} - Net: {$r['net_pay']}"];
    }
    $paySlipCount = count($paySlipRows);
    if ($paySlipCount) {
        $db->prepare('UPDATE payslips SET archived_at=NOW() WHERE cutoff_end < ? AND status != "pending" AND archived_at IS NULL')->execute([$cutoff]);
    }

    $csvPath = null;
    if ($attCount + $leaveCount + $paySlipCount > 0) {
        $dir = __DIR__ . '/../uploads/archive_exports/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $filename = 'archive_' . date('Y-m-d_His') . '.csv';
        $fp = fopen($dir . $filename, 'w');
        foreach ($csvRows as $row) {
            $safeRow = array_map(static function ($value) {
                if (is_string($value) && preg_match('/^[\x00-\x20\xEF\xBB\xBF]*[=+@-]/', $value)) return "'" . $value;
                return $value;
            }, $row);
            fputcsv($fp, $safeRow);
        }
        fclose($fp);
        $csvPath = 'uploads/archive_exports/' . $filename;
    }

    $insert = $db->prepare('INSERT INTO archive_runs (triggered_by, trigger_type, cutoff_date, attendance_count, leave_count, payslip_count, csv_path) VALUES (?,?,?,?,?,?,?)');
    $insert->execute([$triggeredByUserId, $triggerType, $cutoff, $attCount, $leaveCount, $paySlipCount, $csvPath]);
    $runId = (int)$db->lastInsertId();

    return [
        'runId'           => $runId,
        'cutoff'          => $cutoff,
        'attendanceCount' => $attCount,
        'leaveCount'      => $leaveCount,
        'payslipCount'    => $paySlipCount,
        'csvAvailable'    => $csvPath !== null,
    ];
}

switch ($action) {

    // --------------------------------------------------------
    //  GET ?action=users  (manager)
    // --------------------------------------------------------
    case 'users': {
        $user = requirePermission('userManagement');
        $db   = getDB();
                $rows = $db->query('
            SELECT u.id, u.username, u.full_name, u.email, u.role, u.staff_id,
                   u.department, u.status, u.last_login, u.created_at
            FROM users u
            ORDER BY u.created_at DESC
        ')->fetchAll();
        jsonOk(['users' => $rows]);
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=toggle-user&id=X  (manager — activate/deactivate)
    // --------------------------------------------------------
    case 'toggle-user': {
        $user = requirePermission('userManagement');
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('User ID required.');
        if ($id === $user['id']) jsonError('Cannot deactivate yourself.');

        $db  = getDB();
        $st  = $db->prepare('SELECT status, role FROM users WHERE id=? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) jsonError('User not found.', 404);

        // Protect system accounts
        if (in_array($row['role'], ['chairman','manager','treasurer'], true)) {
            jsonError('System accounts cannot be deactivated from here.');
        }
        if ($row['status'] === 'pending') jsonError('This employee must complete email registration before the account can be activated.');

        $newStatus = $row['status'] === 'active' ? 'inactive' : 'active';
        $db->prepare('UPDATE users SET status=? WHERE id=?')->execute([$newStatus, $id]);

        auditLog($user['id'], "set_user_{$newStatus}", 'system', "User id=$id set to $newStatus");
        jsonOk(['status' => $newStatus], "User set to $newStatus");
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=settings
    // --------------------------------------------------------
    case 'settings': {
        requireLogin();
        $db   = getDB();
        $rows = $db->query('SELECT setting_key, setting_value FROM system_settings')->fetchAll();
        $settings = [];
        foreach ($rows as $r) $settings[$r['setting_key']] = $r['setting_value'];
        // Legacy values remain in the database for old backups, but statutory
        // schedules are fixed in payroll code and are not exposed as settings.
        foreach (['sss_rate', 'philhealth_rate', 'pagibig_rate', 'pagibig_cap', 'tax_brackets'] as $key) {
            unset($settings[$key]);
        }
        jsonOk(['settings' => $settings]);
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=settings  (manager/chairman)
    // --------------------------------------------------------
    case 'update-settings': {
        $user = requirePermission('configureSystem');
        $db   = getDB();

        $allowedSettings = [
            'company_name', 'company_address', 'company_phone', 'company_email',
            'pay_frequency', 'work_hours_per_day', 'overtime_rate',
            'archive_after_years', 'auto_archive',
        ];
        foreach (array_keys($body) as $key) {
            if (!in_array($key, $allowedSettings, true)) {
                jsonError('This setting is not editable.');
            }
        }
        if (isset($body['work_hours_per_day']) && (!is_numeric($body['work_hours_per_day']) || $body['work_hours_per_day'] <= 0)) {
            jsonError('Work hours per day must be a positive number.');
        }

        foreach ($body as $key => $val) {
            $db->prepare('UPDATE system_settings SET setting_value=?, updated_by=? WHERE setting_key=?')
               ->execute([$val, $user['id'], $key]);
        }

        auditLog($user['id'], 'update_settings', 'system', 'System settings updated');
        jsonOk([], 'Settings saved');
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=audit-logs  (manager/chairman)
    // --------------------------------------------------------
    case 'audit-logs': {
        $user = requirePermission('accessAuditTrail');
        $db   = getDB();

        $limit  = min((int)($_GET['limit'] ?? 200), 500);
        $where  = ['1=1'];
        $params = [];

        if (!empty($_GET['module'])) {
            $where[]  = 'al.module = ?';
            $params[] = $_GET['module'];
        }
        if (!empty($_GET['role'])) {
            $where[]  = 'u.role = ?';
            $params[] = $_GET['role'];
        }
        if (!empty($_GET['name'])) {
            $where[]  = 'u.full_name LIKE ?';
            $params[] = '%' . $_GET['name'] . '%';
        }
        if (!empty($_GET['dateFrom'])) {
            $where[]  = 'DATE(al.created_at) >= ?';
            $params[] = $_GET['dateFrom'];
        }
        if (!empty($_GET['dateTo'])) {
            $where[]  = 'DATE(al.created_at) <= ?';
            $params[] = $_GET['dateTo'];
        }

        $sql = 'SELECT al.id, al.action, al.module, al.details, al.ip_address, al.created_at,
                       u.full_name AS user_name, u.role, u.username
                FROM audit_logs al
                JOIN users u ON al.user_id = u.id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY al.created_at DESC
                LIMIT ' . (int)$limit;
        $st = $db->prepare($sql);
        $st->execute($params);

        $modules = $db->query('SELECT DISTINCT module FROM audit_logs ORDER BY module')->fetchAll();
        jsonOk(['logs' => $st->fetchAll(), 'modules' => array_column($modules, 'module')]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=dashboard-stats  (various roles)
    // --------------------------------------------------------
    case 'dashboard-stats': {
        $user = requireLogin();
        $db   = getDB();

        $stats = [];
        $today = date('Y-m-d');

        if (in_array($user['role'], ['manager','chairman'], true)) {
            $stats['total_employees'] = (int)$db->query('SELECT COUNT(*) FROM employees WHERE status="active"')->fetchColumn();
        }

        if ($user['role'] === 'manager') {
            $stats['pending_leave']    = (int)$db->query('SELECT COUNT(*) FROM leave_requests WHERE status="pending"')->fetchColumn();
            $stats['pending_payslips'] = (int)$db->query('SELECT COUNT(*) FROM payslips WHERE status="pending"')->fetchColumn();
            $stats['qr_issued']        = (int)$db->query('SELECT COUNT(DISTINCT user_id) FROM qr_tokens WHERE is_active=1')->fetchColumn();
            $st = $db->prepare('SELECT COUNT(*) FROM attendance_logs WHERE DATE(scanned_at)=?');
            $st->execute([$today]);
            $stats['scans_today'] = (int)$st->fetchColumn();

            // Opportunistic auto-archive: checked whenever a manager loads
            // their dashboard, since there's no server cron to rely on.
            $autoSt = $db->prepare('SELECT setting_value FROM system_settings WHERE setting_key="auto_archive" LIMIT 1');
            $autoSt->execute();
            if ($autoSt->fetchColumn()) {
                $yrSt = $db->prepare('SELECT setting_value FROM system_settings WHERE setting_key="archive_after_years" LIMIT 1');
                $yrSt->execute();
                $years  = (float)($yrSt->fetchColumn() ?: 3);
                $cutoff = date('Y-m-d', strtotime("-{$years} years"));
                $chk = $db->prepare('SELECT COUNT(*) FROM attendance_logs WHERE scanned_at < ? AND archived_at IS NULL');
                $chk->execute([$cutoff]);
                if ((int)$chk->fetchColumn() > 0) {
                    runArchiveProcess($db, $user['id'], 'auto');
                }
            }
        }

        if ($user['role'] === 'chairman') {
            $stats['pending_payslips']        = (int)$db->query('SELECT COUNT(*) FROM payslips WHERE status="pending"')->fetchColumn();
            $stats['pending_leave']           = (int)$db->query('SELECT COUNT(*) FROM leave_requests WHERE status="pending"')->fetchColumn();
            $stats['pending_payroll_batches'] = (int)$db->query('SELECT COUNT(*) FROM payroll_batches WHERE status="pending"')->fetchColumn();
        }

        if ($user['role'] === 'treasurer') {
            $stats['pending_payslips']        = (int)$db->query('SELECT COUNT(*) FROM payslips WHERE status="pending"')->fetchColumn();
            $stats['pending_payroll_batches'] = (int)$db->query('SELECT COUNT(*) FROM payroll_batches WHERE status="pending"')->fetchColumn();
            $stats['revision_needed']         = (int)$db->query('SELECT COUNT(*) FROM payroll_batches WHERE status="declined"')->fetchColumn();
            $st = $db->prepare('SELECT COALESCE(SUM(net_pay),0) FROM payslips WHERE payslip_type="regular" AND status="approved" AND DATE_FORMAT(COALESCE(pay_date,cutoff_start),"%Y-%m")=?');
            $st->execute([date('Y-m')]);
            $stats['net_this_month'] = (float)$st->fetchColumn();
        }

        if ($user['role'] === 'employee') {
            $st = $db->prepare('SELECT COALESCE(SUM(net_pay),0) FROM payslips WHERE employee_user_id=? AND payslip_type="regular" AND status="approved" AND DATE_FORMAT(COALESCE(pay_date,cutoff_start),"%Y-%m")=?');
            $st->execute([$user['id'], date('Y-m')]);
            $stats['net_this_month'] = (float)$st->fetchColumn();

            $st = $db->prepare('SELECT COUNT(DISTINCT DATE(scanned_at)) FROM attendance_logs WHERE user_id=? AND scan_type="time_in" AND DATE_FORMAT(scanned_at,"%Y-%m")=?');
            $st->execute([$user['id'], date('Y-m')]);
            $stats['days_present_this_month'] = (int)$st->fetchColumn();

            $stats['pending_leave_mine'] = (int)$db->prepare('SELECT COUNT(*) FROM leave_requests WHERE user_id=? AND status="pending"')->execute([$user['id']]);
            $st = $db->prepare('SELECT COUNT(*) FROM leave_requests WHERE user_id=? AND status="pending"');
            $st->execute([$user['id']]);
            $stats['pending_leave_mine'] = (int)$st->fetchColumn();
        }

        jsonOk(['stats' => $stats]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=archive-preview  — counts only, no changes made
    // --------------------------------------------------------
    case 'archive-preview': {
        $user = requirePermission('configureSystem');
        $db   = getDB();

        $st = $db->prepare('SELECT setting_value FROM system_settings WHERE setting_key="archive_after_years" LIMIT 1');
        $st->execute();
        $years  = (float)($st->fetchColumn() ?: 3);
        $cutoff = date('Y-m-d', strtotime("-{$years} years"));

        $st = $db->prepare('SELECT COUNT(*) FROM attendance_logs WHERE scanned_at < ? AND archived_at IS NULL');
        $st->execute([$cutoff]); $attCount = (int)$st->fetchColumn();

        $st = $db->prepare('SELECT COUNT(*) FROM leave_requests WHERE date_to < ? AND archived_at IS NULL');
        $st->execute([$cutoff]); $leaveCount = (int)$st->fetchColumn();

        $st = $db->prepare('SELECT COUNT(*) FROM payslips WHERE cutoff_end < ? AND status != "pending" AND archived_at IS NULL');
        $st->execute([$cutoff]); $paySlipCount = (int)$st->fetchColumn();

        jsonOk(['cutoff' => $cutoff, 'attendanceCount' => $attCount, 'leaveCount' => $leaveCount, 'payslipCount' => $paySlipCount]);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=archive-run  — actually archive now
    // --------------------------------------------------------
    case 'archive-run': {
        $user   = requirePermission('configureSystem');
        $db     = getDB();
        $result = runArchiveProcess($db, $user['id'], 'manual');

        auditLog($user['id'], 'run_archive', 'system',
            "Manually archived {$result['attendanceCount']} attendance, {$result['leaveCount']} leave, {$result['payslipCount']} payslip records");
        jsonOk($result, 'Archiving complete');
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=download-archive&id=X (authorized CSV download)
    // --------------------------------------------------------
    case 'download-archive': {
        $user = requirePermission('configureSystem');
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Archive ID required.');
        $st = getDB()->prepare('SELECT csv_path FROM archive_runs WHERE id=? LIMIT 1');
        $st->execute([$id]);
        $relative = $st->fetchColumn();
        if (!$relative || !str_starts_with($relative, 'uploads/archive_exports/')) jsonError('Archive not found.', 404);

        $root = realpath(__DIR__ . '/../uploads/archive_exports');
        $file = realpath(__DIR__ . '/../' . $relative);
        if (!$root || !$file || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_file($file)) {
            jsonError('Archive not found.', 404);
        }
        header_remove('Content-Type');
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . basename($file) . '"');
        header('X-Content-Type-Options: nosniff');
        readfile($file);
        exit;
    }

    // --------------------------------------------------------
    //  GET ?action=archive-history  — past archive runs + CSV links
    // --------------------------------------------------------
    case 'archive-history': {
        $user = requirePermission('configureSystem');
        $db   = getDB();
        $st = $db->query('
            SELECT ar.id, ar.trigger_type, ar.run_at, ar.attendance_count, ar.leave_count,
                   ar.payslip_count, u.full_name AS triggered_by_name
            FROM archive_runs ar LEFT JOIN users u ON ar.triggered_by = u.id
            ORDER BY ar.run_at DESC LIMIT 50
        ');
        jsonOk(['runs' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=notifications  — own notifications, newest first
    // --------------------------------------------------------
    case 'notifications': {
        $user = requireLogin();
        $db   = getDB();
        $st = $db->prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30');
        $st->execute([$user['id']]);
        $unreadSt = $db->prepare('SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0');
        $unreadSt->execute([$user['id']]);
        jsonOk(['notifications' => $st->fetchAll(), 'unreadCount' => (int)$unreadSt->fetchColumn()]);
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=mark-notification-read&id=X
    // --------------------------------------------------------
    case 'mark-notification-read': {
        $user = requireLogin();
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Notification ID required.');
        $db = getDB();
        $db->prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?')->execute([$id, $user['id']]);
        jsonOk([], 'Marked as read');
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=mark-all-notifications-read
    // --------------------------------------------------------
    case 'mark-all-notifications-read': {
        $user = requireLogin();
        $db   = getDB();
        $db->prepare('UPDATE notifications SET is_read=1 WHERE user_id=? AND is_read=0')->execute([$user['id']]);
        jsonOk([], 'All notifications marked as read');
        break;
    }

    // --------------------------------------------------------
    //  DELETE ?action=delete-notification&id=X  — dismiss one
    // --------------------------------------------------------
    case 'delete-notification': {
        $user = requireLogin();
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Notification ID required.');
        $db = getDB();
        $db->prepare('DELETE FROM notifications WHERE id=? AND user_id=?')->execute([$id, $user['id']]);
        jsonOk([], 'Notification dismissed');
        break;
    }

    // --------------------------------------------------------
    //  DELETE ?action=clear-notifications  — clear all of MY OWN
    // --------------------------------------------------------
    case 'clear-notifications': {
        $user = requireLogin();
        $db   = getDB();
        $db->prepare('DELETE FROM notifications WHERE user_id=?')->execute([$user['id']]);
        jsonOk([], 'All notifications cleared');
        break;
    }

    default:
        jsonError('Unknown action', 404);
}
