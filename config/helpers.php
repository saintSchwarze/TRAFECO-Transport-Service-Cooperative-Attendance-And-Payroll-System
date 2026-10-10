<?php
date_default_timezone_set('Asia/Manila');
ini_set('display_errors', '0');
ini_set('log_errors', '1');
require_once __DIR__ . '/db.php';

// ============================================================
//  Role-based permission map
// ============================================================
function getRolePermissions(string $role): array {
    $map = [
        'manager' => [
            'viewOwnProfile'         => true,
            'viewOtherEmployees'     => true,
            'createEditEmployees'    => true,
            'viewOwnTimesheet'       => true,
            'manageBenefits'         => true,
            'initiatePayroll'        => true,
            'validatePayroll'        => false,  // chairman only
            'manageEmployeeRecords'  => true,
            'viewOwnPaystubs'        => true,
            'manageEmployeeBonuses'  => true,
            'requestLeave'           => true,
            'approveLeave'           => true,
            'generateReports'        => true,
            'generateFinancialReports' => true,
            'accessAuditTrail'       => true,
            'userManagement'         => true,
            'configureSystem'        => true,
            'generatePayslips'       => false,  // treasurer only
            'manageDeductions'       => true,
            'manageAttendance'       => true,
            'qrManage'               => true,
            'qrScan'                 => true,
            'qrScanStation'          => true,
        ],
        'treasurer' => [
            'viewOwnProfile'         => true,
            'viewOtherEmployees'     => true,
            'createEditEmployees'    => false,
            'viewOwnTimesheet'       => true,
            'manageBenefits'         => false,
            'initiatePayroll'        => true,
            'validatePayroll'        => false,
            'manageEmployeeRecords'  => false,
            'viewOwnPaystubs'        => true,
            'manageEmployeeBonuses'  => false,
            'requestLeave'           => true,
            'approveLeave'           => false,
            'generateReports'        => true,
            'generateFinancialReports' => true,
            'accessAuditTrail'       => false,
            'userManagement'         => false,
            'configureSystem'        => false,
            'generatePayslips'       => true,   // EXCLUSIVE to treasurer
            'manageDeductions'       => true,
            'manageAttendance'       => false,
            'qrManage'               => false,
            'qrScan'                 => true,
            'qrScanStation'          => true,
        ],
        'chairman' => [
            'viewOwnProfile'         => true,
            'viewOtherEmployees'     => true,
            'createEditEmployees'    => false,
            'viewOwnTimesheet'       => true,
            'manageBenefits'         => false,
            'initiatePayroll'        => false,
            'validatePayroll'        => true,   // EXCLUSIVE to chairman
            'manageEmployeeRecords'  => false,
            'viewOwnPaystubs'        => true,
            'manageEmployeeBonuses'  => false,
            'requestLeave'           => true,
            'approveLeave'           => true,
            'generateReports'        => true,
            'generateFinancialReports' => true,
            'accessAuditTrail'       => true,
            'userManagement'         => false,
            'configureSystem'        => false,
            'generatePayslips'       => false,
            'manageDeductions'       => false,
            'manageAttendance'       => false,
            'qrManage'               => false,
            'qrScan'                 => true,
            'qrScanStation'          => true,
        ],
        'employee' => [
            'viewOwnProfile'         => true,
            'viewOtherEmployees'     => false,
            'createEditEmployees'    => false,
            'viewOwnTimesheet'       => true,
            'manageBenefits'         => false,
            'initiatePayroll'        => false,
            'validatePayroll'        => false,
            'manageEmployeeRecords'  => false,
            'viewOwnPaystubs'        => true,
            'manageEmployeeBonuses'  => false,
            'requestLeave'           => true,
            'approveLeave'           => false,
            'generateReports'        => false,
            'generateFinancialReports' => false,
            'accessAuditTrail'       => false,
            'userManagement'         => false,
            'configureSystem'        => false,
            'generatePayslips'       => false,
            'manageDeductions'       => false,
            'manageAttendance'       => false,
            'qrManage'               => false,
            'qrScan'                 => true,
            'qrScanStation'          => false,
        ],
    ];
    return $map[$role] ?? $map['employee'];
}

// ============================================================
//  JSON response helpers
// ============================================================
function jsonOk(array $data = [], string $message = 'Success'): void {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => $message] + $data);
    exit;
}

function jsonError(string $message, int $code = 400): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

// ============================================================
//  Session helpers
// ============================================================
function startAppSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_name('trafeco_session');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        $scriptPath = $_SERVER['SCRIPT_NAME'] ?? '/';
        $appPath = rtrim(dirname(dirname($scriptPath)), '/\\');
        if ($appPath === '') $appPath = '/';
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => $appPath,
            'secure' => trafecoIsProduction()
                || (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function apiMutationGuard(array $methods, array $csrfExempt = []): void {
    $action = $_GET['action'] ?? ($_POST['action'] ?? '');
    if (!isset($methods[$action])) return;
    $expected = $methods[$action];
    $actual = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($actual !== $expected) jsonError('Method not allowed.', 405);
    if (in_array($action, $csrfExempt, true)) return;

    $user = currentUser();
    if (!$user) return; // The action's normal authentication check will reject anonymous callers.
    $known = $_SESSION['csrf_token'] ?? '';
    $given = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$known || !$given || !hash_equals($known, $given)) {
        jsonError('Request verification failed. Refresh the page and try again.', 403);
    }
}

function rateLimitAllow(string $scope, string $identifier, int $limit, int $windowSeconds): bool {
    $path = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'trafeco_rate_' . hash('sha256', $scope . '|' . $identifier) . '.json';
    $handle = @fopen($path, 'c+');
    if (!$handle) {
        error_log('Unable to open rate-limit storage.');
        return false;
    }
    try {
        if (!flock($handle, LOCK_EX)) return false;
        $raw = stream_get_contents($handle);
        $times = json_decode($raw ?: '[]', true);
        if (!is_array($times)) $times = [];
        $cutoff = time() - $windowSeconds;
        $times = array_values(array_filter($times, static fn($t) => is_int($t) && $t > $cutoff));
        if (count($times) >= $limit) return false;
        $times[] = time();
        if (!ftruncate($handle, 0)) return false;
        rewind($handle);
        if (fwrite($handle, json_encode($times)) === false || !fflush($handle)) return false;
        return true;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function clearRateLimit(string $scope, string $identifier): void {
    $path = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'trafeco_rate_' . hash('sha256', $scope . '|' . $identifier) . '.json';
    @unlink($path);
}

function currentUser(): ?array {
    startAppSession();
    $user = $_SESSION['trafeco_user'] ?? null;
    if (!$user) return null;

    $now = time();
    $startedAt = (int)($_SESSION['auth_started_at'] ?? $now);
    $lastActivityAt = (int)($_SESSION['auth_last_activity_at'] ?? $now);
    if (($now - $lastActivityAt) > 1800 || ($now - $startedAt) > 43200) {
        $_SESSION = [];
        session_regenerate_id(true);
        return null;
    }

    $_SESSION['auth_started_at'] = $startedAt;
    $_SESSION['auth_last_activity_at'] = $now;
    return $user;
}

function requireLogin(): array {
    $user = currentUser();
    if (!$user) jsonError('Unauthorized. Please log in.', 401);
    return $user;
}

function requireRole(string ...$roles): array {
    $user = requireLogin();
    if (!in_array($user['role'], $roles, true)) {
        jsonError('Access denied. Insufficient permissions.', 403);
    }
    return $user;
}

function hasPermission(string $perm): bool {
    $user = currentUser();
    if (!$user) return false;
    $perms = getRolePermissions($user['role']);
    return !empty($perms[$perm]);
}

function requirePermission(string $perm): array {
    $user = requireLogin();
    if (!hasPermission($perm)) {
        jsonError('Access denied. You do not have permission to do this.', 403);
    }
    return $user;
}

// ============================================================
//  Audit log helper
// ============================================================
function auditLog(int $userId, string $action, string $module, string $details = ''): void {
    try {
        $db = getDB();
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $st = $db->prepare('INSERT INTO audit_logs (user_id, action, module, details, ip_address) VALUES (?,?,?,?,?)');
        $st->execute([$userId, $action, $module, $details, $ip]);
    } catch (\Throwable $e) {
        error_log('Audit log write failed: ' . $e->getMessage());
    }
}

// ============================================================
//  In-app notification helper
// ============================================================
function notifyUser(int $userId, string $type, string $title, string $message, ?string $linkPage = null): void {
    try {
        $db = getDB();
        $st = $db->prepare('INSERT INTO notifications (user_id, type, title, message, link_page) VALUES (?,?,?,?,?)');
        $st->execute([$userId, $type, $title, $message, $linkPage]);
    } catch (\Throwable $e) {
        // notifications should never crash the main flow
    }
}

// ============================================================
//  CORS / common headers
// ============================================================
function commonHeaders(): void {
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: camera=(self), microphone=(), geolocation=()');
}
