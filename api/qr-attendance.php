<?php
require_once __DIR__ . '/../config/helpers.php';

commonHeaders();
$action = $_GET['action'] ?? 'staff';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
apiMutationGuard([
    'generate' => 'POST', 'delete' => 'POST', 'scan' => 'POST', 'scan-by-id' => 'POST',
    'clear-logs' => 'DELETE', 'set-status' => 'PUT',
]);

function generateToken(): string {
    return bin2hex(random_bytes(16));
}

function recordAttendanceForShift(PDO $db, int $employeeId, int $scannerId, string $scanType, ?string $qrToken): array {
    $hour = (int)date('G');
    $segment = $hour < 12 ? 'AM' : 'PM';
    $startHour = $segment === 'AM' ? 7 : 13;
    $endHour = $segment === 'AM' ? 12 : 17;
    $today = date('Y-m-d');
    $lockName = 'trafeco_att_' . $employeeId . '_' . str_replace('-', '', $today) . '_' . $segment;
    $lock = $db->prepare('SELECT GET_LOCK(?, 3)');
    $lock->execute([$lockName]);
    if ((int)$lock->fetchColumn() !== 1) return ['error' => 'Another attendance scan is being processed. Try again.'];

    try {
        $st = $db->prepare('SELECT scan_type FROM attendance_logs
                            WHERE user_id=? AND DATE(scanned_at)=? AND HOUR(scanned_at) BETWEEN ? AND ? AND archived_at IS NULL');
        $st->execute([$employeeId, $today, $startHour, $endHour]);
        $hasIn = false;
        $hasOut = false;
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $existingType) {
            if ($existingType === 'time_in') $hasIn = true;
            if ($existingType === 'time_out') $hasOut = true;
        }

        $shiftName = $segment === 'AM' ? 'morning' : 'afternoon';
        if ($scanType === 'time_in' && $hasIn) return ['error' => "Already clocked in for the $shiftName shift today."];
        if ($scanType === 'time_in' && $hasOut) return ['error' => "A time-out is already recorded for the $shiftName shift today."];
        if ($scanType === 'time_out' && !$hasIn) return ['error' => "Record a time-in before clocking out for the $shiftName shift."];
        if ($scanType === 'time_out' && $hasOut) return ['error' => "Already clocked out for the $shiftName shift today."];

        $db->prepare('INSERT INTO attendance_logs (user_id, scan_type, scanned_by, qr_token) VALUES (?,?,?,?)')
           ->execute([$employeeId, $scanType, $scannerId, $qrToken]);
        return ['id' => $db->lastInsertId()];
    } finally {
        $release = $db->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lockName]);
    }
}

switch ($action) {

    // --------------------------------------------------------
    //  GET ?action=staff  — all staff with QR status (manager)
    // --------------------------------------------------------
    case 'staff': {
        $user = requirePermission('qrManage');
        $db   = getDB();

        $sql = '
            SELECT u.id, u.staff_id, u.full_name, u.role, u.department,
                   qt.id AS qr_id, qt.token, qt.generated_at, qt.is_active,
                   e.profile_picture
            FROM users u
            LEFT JOIN qr_tokens qt ON qt.user_id = u.id AND qt.is_active = 1
            LEFT JOIN employees e ON e.user_id = u.id
            WHERE u.status = "active"
            ORDER BY FIELD(u.role,"manager","treasurer","chairman","employee"), u.full_name
        ';
        $rows = $db->query($sql)->fetchAll();

        $staff = array_map(function($r) {
            return [
                'id'          => $r['id'],
                'staffId'     => $r['staff_id'],
                'name'        => $r['full_name'],
                'role'        => ucfirst($r['role']),
                'dept'        => $r['department'] ?? '',
                'initials'    => mb_strtoupper(implode('', array_map(fn($w) => $w[0], explode(' ', $r['full_name'])))),
                'hasQR'       => !empty($r['qr_id']),
                'qrGeneratedAt' => $r['generated_at'],
                'photo'       => $r['profile_picture'] ?: null,
            ];
        }, $rows);

        jsonOk(['staff' => $staff]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=my-qr  — logged-in user's own QR data
    // --------------------------------------------------------
    case 'my-qr': {
        $user = requireLogin();
        $db   = getDB();
        $st   = $db->prepare('SELECT * FROM qr_tokens WHERE user_id=? AND is_active=1 LIMIT 1');
        $st->execute([$user['id']]);
        $qr = $st->fetch();
        if (!$qr) jsonOk(['qr' => null]);

        jsonOk([
            'qr' => [
                'qrData'      => $qr['qr_data'],
                'generatedAt' => $qr['generated_at'],
            ]
        ]);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=generate  — manager generates QR for user
    //  Body: { userId }
    // --------------------------------------------------------
    case 'generate': {
        $user   = requirePermission('qrManage');
        $userId = (int)($body['userId'] ?? 0);
        if (!$userId) jsonError('userId required.');

        $db = getDB();
        $st = $db->prepare('SELECT id,staff_id,full_name,role,department FROM users WHERE id=? AND status="active" LIMIT 1');
        $st->execute([$userId]);
        $target = $st->fetch();
        if (!$target) jsonError('User not found.', 404);

        // Deactivate existing QR
        $db->prepare('UPDATE qr_tokens SET is_active=0 WHERE user_id=?')->execute([$userId]);

        $token  = generateToken();
        $qrData = json_encode([
            'trafeco_qr' => true,
            'userId'     => $target['id'],
            'staffId'    => $target['staff_id'],
            'name'       => $target['full_name'],
            'role'       => ucfirst($target['role']),
            'dept'       => $target['department'] ?? '',
            'token'      => $token,
        ]);

        $db->prepare('INSERT INTO qr_tokens (user_id,token,qr_data,generated_by) VALUES (?,?,?,?)')
           ->execute([$userId, $token, $qrData, $user['id']]);

        auditLog($user['id'], 'generate_qr', 'qr_attendance', "Generated QR for user_id=$userId");
        jsonOk(['qrData' => $qrData, 'token' => $token], 'QR code generated');
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=delete  — manager deletes QR for user
    //  Body: { userId }
    // --------------------------------------------------------
    case 'delete': {
        $user   = requirePermission('qrManage');
        $userId = (int)($body['userId'] ?? 0);
        if (!$userId) jsonError('userId required.');

        $db = getDB();
        $db->prepare('UPDATE qr_tokens SET is_active=0 WHERE user_id=?')->execute([$userId]);

        auditLog($user['id'], 'delete_qr', 'qr_attendance', "Deleted QR for user_id=$userId");
        jsonOk([], 'QR code deleted');
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=scan  — record a time-in/time-out scan
    //  Body: { qrData (raw JSON string), scanType }
    // --------------------------------------------------------
    case 'scan': {
        $user     = requirePermission('qrScanStation');
        $rawData  = $body['qrData']   ?? '';
        $scanType = $body['scanType'] ?? 'time_in';

        if (!in_array($scanType, ['time_in','time_out'], true)) {
            jsonError('Invalid scanType.');
        }

        $currentHour = (int)date('G');
        $isMorning = ($currentHour >= 7 && $currentHour <= 11);
        $isAfternoon = ($currentHour >= 13 && $currentHour <= 17);

        if (!$isMorning && !$isAfternoon) {
            if ($currentHour >= 18 || $currentHour < 7) {
                jsonError('scan tomorrow 7am');
            } else {
                jsonError('scan at 1pm');
            }
        }

        $parsed = json_decode($rawData, true);
        if (!$parsed || empty($parsed['trafeco_qr']) || empty($parsed['token'])) {
            jsonError('Invalid QR code. Not a Trafeco attendance code.');
        }

        $db = getDB();
        $st = $db->prepare('SELECT qt.*, u.full_name, u.staff_id, u.role, u.department FROM qr_tokens qt JOIN users u ON qt.user_id=u.id WHERE qt.token=? AND qt.is_active=1 LIMIT 1');
        $st->execute([$parsed['token']]);
        $qr = $st->fetch();

        if (!$qr) {
            jsonError('Invalid or expired QR code. Ask manager to regenerate.');
        }

        $recorded = recordAttendanceForShift($db, (int)$qr['user_id'], (int)$user['id'], $scanType, $parsed['token']);
        if (isset($recorded['error'])) jsonError($recorded['error'], 409);
        $logId = $recorded['id'];
        jsonOk([
            'log' => [
                'id'        => $logId,
                'staffId'   => $qr['staff_id'],
                'name'      => $qr['full_name'],
                'role'      => ucfirst($qr['role']),
                'dept'      => $qr['department'],
                'scanType'  => $scanType,
                'timestamp' => date('c'),
            ]
        ], ($scanType === 'time_in' ? 'Time In' : 'Time Out') . ' recorded for ' . $qr['full_name']);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=scan-by-id — manual attendance by staff ID
    //  Restricted to authorized scanner-station users.
    // --------------------------------------------------------
    case 'scan-by-id': {
        $user = requirePermission('qrScanStation');
        $staffId = strtoupper(trim((string)($body['staffId'] ?? '')));
        $scanType = $body['scanType'] ?? 'time_in';
        if (!preg_match('/^[A-Z0-9-]{2,30}$/', $staffId)) jsonError('Enter a valid employee ID.');
        if (!in_array($scanType, ['time_in','time_out'], true)) jsonError('Invalid scanType.');

        $currentHour = (int)date('G');
        $isMorning = ($currentHour >= 7 && $currentHour <= 11);
        $isAfternoon = ($currentHour >= 13 && $currentHour <= 17);
        if (!$isMorning && !$isAfternoon) {
            if ($currentHour >= 18 || $currentHour < 7) jsonError('scan tomorrow 7am');
            jsonError('scan at 1pm');
        }

        $db = getDB();
        $st = $db->prepare('SELECT u.id, u.staff_id, u.full_name, u.role, u.department
                            FROM users u JOIN employees e ON e.user_id=u.id
                            WHERE UPPER(u.staff_id)=? AND u.status="active" AND e.status="active" LIMIT 1');
        $st->execute([$staffId]);
        $employee = $st->fetch();
        if (!$employee) jsonError('Employee ID not found or inactive.', 404);

        $recorded = recordAttendanceForShift($db, (int)$employee['id'], (int)$user['id'], $scanType, null);
        if (isset($recorded['error'])) jsonError($recorded['error'], 409);
        $logId = $recorded['id'];
        jsonOk(['log' => [
            'id' => $logId,
            'staffId' => $employee['staff_id'],
            'name' => $employee['full_name'],
            'role' => ucfirst($employee['role']),
            'dept' => $employee['department'],
            'scanType' => $scanType,
            'timestamp' => date('c'),
        ]], ($scanType === 'time_in' ? 'Time In' : 'Time Out') . ' recorded for ' . $employee['full_name']);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=logs  — attendance logs (manager)
    //  Query params: date, userId, scanType
    // --------------------------------------------------------
    case 'logs': {
        $user = requirePermission('qrManage');
        $db   = getDB();

        $where  = ['al.archived_at IS NULL'];
        $params = [];

        if (!empty($_GET['date'])) {
            $where[]  = 'DATE(al.scanned_at) = ?';
            $params[] = $_GET['date'];
        }
        if (!empty($_GET['month'])) {
            $where[]  = 'DATE_FORMAT(al.scanned_at, "%Y-%m") = ?';
            $params[] = $_GET['month'];
        }
        if (!empty($_GET['userId'])) {
            $where[]  = 'al.user_id = ?';
            $params[] = (int)$_GET['userId'];
        }
        if (!empty($_GET['scanType'])) {
            $where[]  = 'al.scan_type = ?';
            $params[] = $_GET['scanType'];
        }

         $sql = 'SELECT al.id, al.scan_type, al.scanned_at, al.qr_token, al.status_override,
                       u.staff_id, u.full_name, u.role, u.department,
                       sb.full_name AS scanned_by_name
                FROM attendance_logs al
                JOIN users u ON al.user_id = u.id
                LEFT JOIN users sb ON al.scanned_by = sb.id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY al.scanned_at DESC
                LIMIT 500';
        $st = $db->prepare($sql);
        $st->execute($params);
        jsonOk(['logs' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=my-logs  — own attendance history
    // --------------------------------------------------------
    case 'my-logs': {
        $user = requireLogin();
        $db   = getDB();

        $where  = ['al.user_id = ?', 'al.archived_at IS NULL'];
        $params = [$user['id']];

        if (!empty($_GET['month'])) {
            $where[]  = 'DATE_FORMAT(al.scanned_at, "%Y-%m") = ?';
            $params[] = $_GET['month'];
        }
        if (!empty($_GET['scanType'])) {
            $where[]  = 'al.scan_type = ?';
            $params[] = $_GET['scanType'];
        }

        $st = $db->prepare('
            SELECT al.id, al.scan_type, al.scanned_at
            FROM attendance_logs al
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY al.scanned_at DESC
            LIMIT 300
        ');
        $st->execute($params);
        jsonOk(['logs' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  DELETE ?action=clear-logs  (manager only)
    // --------------------------------------------------------
    case 'clear-logs': {
        $user = requirePermission('qrManage');
        $db   = getDB();
        $db->exec('DELETE FROM attendance_logs');
        auditLog($user['id'], 'clear_attendance_logs', 'qr_attendance', 'All attendance logs cleared');
        jsonOk([], 'All attendance logs cleared');
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=set-status&id=X  (manager) — override On Time / Late
    //  Body: { status: 'on_time' | 'late' }
    // --------------------------------------------------------
    case 'set-status': {
        $user   = requirePermission('qrManage');
        $id     = (int)($_GET['id'] ?? 0);
        $status = $body['status'] ?? '';

        if (!$id) jsonError('Log ID required.');
        if (!in_array($status, ['on_time','late'], true)) jsonError('Invalid status.');

        $db = getDB();
        $st = $db->prepare('SELECT id FROM attendance_logs WHERE id=? LIMIT 1');
        $st->execute([$id]);
        if (!$st->fetch()) jsonError('Attendance record not found.', 404);

        $db->prepare('UPDATE attendance_logs SET status_override=? WHERE id=?')->execute([$status, $id]);
        auditLog($user['id'], 'override_attendance_status', 'qr_attendance', "Set log id=$id to $status");
        jsonOk([], 'Attendance status updated');
        break;
    }

    

     // --------------------------------------------------------
    //  GET ?action=daily-summary  (manager) — distinct headcount
    //  per day for a given month, used by the dashboard chart
    // --------------------------------------------------------
    case 'daily-summary': {
        $user  = requirePermission('qrManage');
        $db    = getDB();
        $month = $_GET['month'] ?? date('Y-m');

        $st = $db->prepare('
            SELECT DATE(scanned_at) AS d, COUNT(DISTINCT user_id) AS cnt
            FROM attendance_logs
            WHERE scan_type="time_in" AND DATE_FORMAT(scanned_at,"%Y-%m")=?
            GROUP BY DATE(scanned_at)
            ORDER BY d ASC
        ');
        $st->execute([$month]);
        jsonOk(['days' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=archived-logs  (manager) — browse archived attendance
    // --------------------------------------------------------
    case 'archived-logs': {
        $user = requirePermission('qrManage');
        $db   = getDB();

        $where  = ['al.archived_at IS NOT NULL'];
        $params = [];
        if (!empty($_GET['userId'])) {
            $where[]  = 'al.user_id = ?';
            $params[] = (int)$_GET['userId'];
        }

        $sql = 'SELECT al.id, al.scan_type, al.scanned_at, al.archived_at,
                       u.staff_id, u.full_name
                FROM attendance_logs al
                JOIN users u ON al.user_id = u.id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY al.scanned_at DESC
                LIMIT 500';
        $st = $db->prepare($sql);
        $st->execute($params);
        jsonOk(['logs' => $st->fetchAll()]);
        break;
    }

    default:
        jsonError('Unknown action', 404);
}
