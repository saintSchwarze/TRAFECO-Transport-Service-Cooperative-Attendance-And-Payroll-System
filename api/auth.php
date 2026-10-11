<?php
require_once __DIR__ . '/../config/helpers.php';

commonHeaders();
startAppSession();

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
apiMutationGuard([
    'forgot-password' => 'POST', 'reset-password' => 'POST', 'login' => 'POST',
    'registration-info' => 'POST', 'complete-registration' => 'POST',
    'logout' => 'POST', 'change-password' => 'POST', 'change-username' => 'POST', 'change-email' => 'POST',
], ['forgot-password', 'reset-password', 'login', 'registration-info', 'complete-registration']);

function verifyTurnstileToken(string $token, string $secret, string $expectedHost): bool {
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query([
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]),
            'timeout' => 10,
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $context);
    if ($response === false) return false;
    $result = json_decode($response, true);
    return is_array($result)
        && !empty($result['success'])
        && ($result['action'] ?? '') === 'login'
        && strtolower((string)($result['hostname'] ?? '')) === strtolower($expectedHost);
}

switch ($action) {

    case 'registration-info': {
        $token = $body['token'] ?? '';
        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) jsonError('This registration link is invalid or expired.');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (!rateLimitAllow('registration-info-ip', $ip, 30, 3600)) jsonError('Too many requests. Please try again later.', 429);
        $db = getDB();
        $st = $db->prepare('SELECT u.email, u.staff_id FROM registration_invites ri JOIN users u ON u.id=ri.user_id WHERE ri.token_hash=? AND ri.expires_at>UTC_TIMESTAMP() AND u.status="pending" LIMIT 1');
        $st->execute([hash('sha256', $token)]);
        $account = $st->fetch();
        if (!$account) jsonError('This registration link is invalid or expired. Ask your manager to resend it.', 404);
        jsonOk(['account' => $account]);
        break;
    }

    case 'complete-registration': {
        $token = $body['token'] ?? '';
        $usernameInput = $body['username'] ?? '';
        $password = $body['password'] ?? '';
        $firstName = trim((string)($body['firstName'] ?? ''));
        $lastName = trim((string)($body['lastName'] ?? ''));
        $gender = $body['gender'] ?? '';
        $maritalStatus = $body['maritalStatus'] ?? '';
        $cohabiting = $body['cohabitingWithSpouse'] ?? null;
        $phone = preg_replace('/\D+/', '', (string)($body['phone'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $emergencyName = trim((string)($body['emergencyContactName'] ?? ''));
        $emergencyPhone = preg_replace('/\D+/', '', (string)($body['emergencyContactPhone'] ?? ''));
        $sss = preg_replace('/\D+/', '', (string)($body['sss'] ?? ''));
        $pagibig = preg_replace('/\D+/', '', (string)($body['pagibig'] ?? ''));
        $philhealth = preg_replace('/\D+/', '', (string)($body['philhealth'] ?? ''));

        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) jsonError('This registration link is invalid or expired.');
        if (!is_string($usernameInput) || !is_string($password)) jsonError('Enter a valid username and password.');
        $username = strtolower(trim($usernameInput));
        if (strlen($username) < 3 || strlen($username) > 60 || !preg_match('/^[a-z0-9._]+$/', $username)) jsonError('Username must be 3 to 60 characters and use only letters, numbers, dots, or underscores.');
        if (strlen($password) < 15 || strlen($password) > 72) jsonError('Password must be 15 to 72 bytes long.');
        if (strlen($firstName) < 1 || strlen($firstName) > 80 || strlen($lastName) < 1 || strlen($lastName) > 80) jsonError('Enter a first and last name (maximum 80 characters each).');
        if (!in_array($gender, ['male','female','other','prefer_not_to_say'], true)) jsonError('Select a valid gender.');
        if (!in_array($maritalStatus, ['single','married','separated','widowed','other'], true)) jsonError('Select a valid marital status.');
        if ($maritalStatus === 'married' && !in_array((string)$cohabiting, ['0','1'], true)) jsonError('Select whether you live with your spouse.');
        if (!preg_match('/^[0-9]{11}$/', $phone) || !preg_match('/^[0-9]{11}$/', $emergencyPhone)) jsonError('Enter phone numbers using 11 digits.');
        if ($address === '' || strlen($address) > 500 || $emergencyName === '' || strlen($emergencyName) > 120) jsonError('Enter a valid address and emergency contact name.');
        if (!preg_match('/^[0-9]{10}$/', $sss) || !preg_match('/^[0-9]{12}$/', $pagibig) || !preg_match('/^[0-9]{12}$/', $philhealth)) jsonError('Enter valid SSS (10 digits), Pag-IBIG (12 digits), and PhilHealth (12 digits) numbers.');

        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (!rateLimitAllow('registration-complete-ip', $ip, 20, 3600)
            || !rateLimitAllow('registration-complete-token', hash('sha256', $token), 10, 3600)) jsonError('Too many attempts. Please try again later.', 429);

        $db = getDB();
        $db->beginTransaction();
        try {
            $st = $db->prepare('SELECT u.id FROM registration_invites ri JOIN users u ON u.id=ri.user_id WHERE ri.token_hash=? AND ri.expires_at>UTC_TIMESTAMP() AND u.status="pending" LIMIT 1 FOR UPDATE');
            $st->execute([hash('sha256', $token)]);
            $account = $st->fetch();
            if (!$account) { $db->rollBack(); jsonError('This registration link is invalid or expired. Ask your manager to resend it.', 404); }
            $st = $db->prepare('SELECT id FROM users WHERE username=? AND id!=? LIMIT 1');
            $st->execute([$username, $account['id']]);
            if ($st->fetch()) { $db->rollBack(); jsonError('That username is already taken.', 409); }
            $db->prepare('UPDATE employees SET first_name=?,last_name=?,gender=?,marital_status=?,cohabiting_with_spouse=?,phone=?,address=?,emergency_contact_name=?,emergency_contact_phone=?,gov_sss=?,gov_pagibig=?,gov_philhealth=? WHERE user_id=?')
                ->execute([$firstName,$lastName,$gender,$maritalStatus,$maritalStatus === 'married' ? (int)$cohabiting : null,$phone,$address,$emergencyName,$emergencyPhone,$sss,$pagibig,$philhealth,$account['id']]);
            $fullName = trim($firstName . ' ' . $lastName);
            $db->prepare('UPDATE users SET full_name=?,username=?,password=?,status="active" WHERE id=? AND status="pending"')
                ->execute([$fullName,$username,password_hash($password, PASSWORD_DEFAULT),$account['id']]);
            $db->prepare('DELETE FROM registration_invites WHERE user_id=?')->execute([$account['id']]);
            $db->commit();
        } catch (PDOException $e) {
            if ($db->inTransaction()) $db->rollBack();
            if ($e->getCode() === '23000') jsonError('That username is already taken.', 409);
            error_log('Registration completion failed: ' . $e->getMessage());
            jsonError('Could not complete registration. Please try again.', 500);
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('Registration completion failed: ' . $e->getMessage());
            jsonError('Could not complete registration. Please try again.', 500);
        }
        auditLog((int)$account['id'], 'complete_registration', 'auth', 'Employee profile completed through emailed invitation');
        jsonOk([], 'Registration complete. You can now sign in.');
        break;
    }

    case 'turnstile-config': {
        $cfg = require __DIR__ . '/../config/turnstile.php';
        if (!$cfg['site_key'] || !$cfg['secret_key']) jsonError('Turnstile is not configured on the server.', 503);
        jsonOk(['siteKey' => $cfg['site_key']]);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=forgot-password
    // --------------------------------------------------------
    case 'forgot-password': {
        $emailInput = $body['email'] ?? '';
        if (!is_string($emailInput) || strlen($emailInput) > 254) jsonError('Please enter a valid email address.');
        $email = trim($emailInput);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Please enter a valid email address.');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $canRequest = rateLimitAllow('reset-ip', $ip, 20, 3600)
            && rateLimitAllow('reset-email-ip', strtolower($email) . '|' . $ip, 3, 3600);

        $db = getDB();
        $st = $db->prepare('SELECT id, full_name, email FROM users WHERE email = ? AND status = "active" LIMIT 1');
        $st->execute([$email]);
        $user = $st->fetch();
        if ($user && $canRequest) {
            $cfg = require __DIR__ . '/../config/mail.php';
            $token = bin2hex(random_bytes(32));
            $hash = hash('sha256', $token);
            $db->prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')->execute([$user['id']]);
            $db->prepare('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))')
                ->execute([$user['id'], $hash]);
            $baseUrl = rtrim($cfg['app_base_url'], '/');
            $url = $baseUrl . '/?token=' . rawurlencode($token);
            $safeName = htmlspecialchars($user['full_name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $html = '<p>Hello ' . $safeName . ',</p><p>Use the link below to choose a new TRAFECO password. This link expires in one hour and can only be used once.</p><p><a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>';
            try {
                sendAppEmail($cfg, $user['email'], $user['full_name'], 'TRAFECO password reset', $html);
            } catch (Throwable $e) {
                $db->prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')->execute([$user['id']]);
                error_log('Password reset email failed: ' . $e->getMessage());
            }
        }
        jsonOk([], 'If an active account uses that email, a password reset link has been sent.');
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=reset-password
    // --------------------------------------------------------
    case 'reset-password': {
        $token = $body['token'] ?? '';
        $password = $body['password'] ?? '';
        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) jsonError('This reset link is invalid or expired.');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (!rateLimitAllow('reset-attempt-ip', $ip, 30, 3600) || !rateLimitAllow('reset-attempt-token', $token, 10, 3600)) jsonError('Too many reset attempts. Please request a new link later.', 429);
        if (!is_string($password) || strlen($password) < 15 || strlen($password) > 72) jsonError('Password must be 15 to 72 bytes long.');
        $db = getDB();
        $db->beginTransaction();
        $st = $db->prepare('SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() LIMIT 1 FOR UPDATE');
        $st->execute([hash('sha256', $token)]);
        $row = $st->fetch();
        if (!$row) { $db->rollBack(); jsonError('This reset link is invalid or expired.'); }
        try {
            $db->prepare('UPDATE users SET password = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $row['user_id']]);
            $db->prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')->execute([$row['user_id']]);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }
        auditLog((int)$row['user_id'], 'reset_password', 'auth', 'Password reset by email');
        jsonOk([], 'Your password has been reset. You can now sign in.');
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=login
    // --------------------------------------------------------
    case 'login': {
        if (currentUser()) jsonError('An account is already signed in in this browser. Sign out before using another account.', 409);
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (!rateLimitAllow('login-ip', $ip, 30, 900)) jsonError('Too many sign-in attempts. Please wait and try again.', 429);
        $turnstileToken = $body['turnstileToken'] ?? '';
        $turnstileCfg = require __DIR__ . '/../config/turnstile.php';
        if (!$turnstileCfg['site_key'] || !$turnstileCfg['secret_key']) jsonError('Login verification is not configured on the server.', 503);
        if (!is_string($turnstileToken) || $turnstileToken === '' || strlen($turnstileToken) > 2048) jsonError('Complete the security check and try again.', 400);
        $requestHost = strtolower((string)parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST));
        $isProduction = trafecoIsProduction();
        $allowedHost = strtolower(trim((string)trafecoSetting('TRAFECO_ALLOWED_HOST', '')));
        if ($isProduction && (!$allowedHost || !filter_var($allowedHost, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME))) {
            jsonError('Login host is not configured on the server.', 503);
        }
        if ($isProduction && $requestHost !== $allowedHost) {
            jsonError('This hostname is not configured for login.', 400);
        }
        $host = $isProduction ? $allowedHost : $requestHost;
        if (!$host || !verifyTurnstileToken($turnstileToken, $turnstileCfg['secret_key'], $host)) {
            jsonError('Security check failed or expired. Please try again.', 400);
        }
        $usernameInput = $body['username'] ?? '';
        $password = $body['password'] ?? '';

        if (!is_string($usernameInput) || !is_string($password) || strlen($usernameInput) > 60 || strlen($password) > 1024) jsonError('Invalid username or password.');
        $username = trim($usernameInput);

        if (!$username || !$password) {
            jsonError('Username and password are required.');
        }
        $attemptKey = strtolower($username) . '|' . $ip;
        if (!rateLimitAllow('login-pair', $attemptKey, 10, 900)) {
            jsonError('Too many sign-in attempts. Please wait and try again.', 429);
        }

        $db = getDB();
        $st = $db->prepare('SELECT * FROM users WHERE username = ? AND status = "active" LIMIT 1');
        $st->execute([$username]);
        $user = $st->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            jsonError('Invalid username or password.');
        }
        clearRateLimit('login-pair', $attemptKey);
        clearRateLimit('login-ip', $ip);

        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['auth_started_at'] = time();
        $_SESSION['auth_last_activity_at'] = time();

        $picSt = $db->prepare('SELECT profile_picture FROM employees WHERE user_id=? LIMIT 1');
        $picSt->execute([$user['id']]);
        $profilePicture = $picSt->fetchColumn() ?: null;

        // Update last login
        $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

        $permissions = getRolePermissions($user['role']);
        $sessionData = [
            'id'         => $user['id'],
            'username'   => $user['username'],
            'full_name'  => $user['full_name'],
            'email'      => $user['email'],
            'role'       => $user['role'],
            'staff_id'   => $user['staff_id'],
            'department' => $user['department'],
        ];
        $_SESSION['trafeco_user'] = $sessionData;

        auditLog($user['id'], 'login', 'auth', 'User logged in');

        jsonOk([
            'csrfToken' => $_SESSION['csrf_token'],
            'user' => [
                'staffId'        => $user['staff_id'],
                'role'           => ucfirst($user['role']),
                'name'           => $user['full_name'],
                'department'     => $user['department'] ?? '',
                'email'          => $user['email'],
                'username'       => $user['username'],
                'id'             => $user['id'],
                'permissions'    => $permissions,
                'profilePicture' => $profilePicture,
            ]
        ], 'Login successful');
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=logout
    // --------------------------------------------------------
    case 'logout': {
        $user = currentUser();
        if ($user) auditLog($user['id'], 'logout', 'auth', 'User logged out');
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $cookie = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $cookie['path'],
                'domain' => $cookie['domain'],
                'secure' => $cookie['secure'],
                'httponly' => $cookie['httponly'],
                'samesite' => $cookie['samesite'] ?? 'Lax',
            ]);
        }
        session_unset();
        session_destroy();
        jsonOk([], 'Logged out');
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=change-password
    // --------------------------------------------------------
    case 'change-password': {
        $user    = requireLogin();
        $current = $body['currentPassword'] ?? '';
        $newPw   = $body['newPassword']     ?? '';

        if (!is_string($current) || !is_string($newPw)) jsonError('All fields are required.');
        if (!$current || !$newPw) jsonError('All fields are required.');
        if (strlen($newPw) < 15 || strlen($newPw) > 72) jsonError('New password must be 15 to 72 bytes long.');

        $db = getDB();
        $st = $db->prepare('SELECT password FROM users WHERE id = ? LIMIT 1');
        $st->execute([$user['id']]);
        $row = $st->fetch();

        if (!password_verify($current, $row['password'])) {
            jsonError('Current password is incorrect.');
        }

        $hash = password_hash($newPw, PASSWORD_BCRYPT);
        $db->prepare('UPDATE users SET password = ? WHERE id = ?')->execute([$hash, $user['id']]);
        auditLog($user['id'], 'change_password', 'auth', 'Password changed');
        jsonOk([], 'Password changed successfully');
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=me
    // --------------------------------------------------------
    case 'me': {
        $user = currentUser();
        if (!$user) jsonError('Not logged in', 401);
        if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $permissions = getRolePermissions($user['role']);
        $picSt = getDB()->prepare('SELECT profile_picture FROM employees WHERE user_id=? LIMIT 1');
        $picSt->execute([$user['id']]);
        $profilePicture = $picSt->fetchColumn() ?: null;
        jsonOk([
            'csrfToken' => $_SESSION['csrf_token'],
            'user' => [
                'staffId'        => $user['staff_id'],
                'role'           => ucfirst($user['role']),
                'name'           => $user['full_name'],
                'department'     => $user['department'] ?? '',
                'email'          => $user['email'],
                'username'       => $user['username'],
                'id'             => $user['id'],
                'permissions'    => $permissions,
                'profilePicture' => $profilePicture,
            ]
        ]);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=change-username
    // --------------------------------------------------------
    case 'change-username': {
        $user = requireLogin();
        $usernameInput = $body['newUsername'] ?? '';
        $password    = $body['password'] ?? '';

        if (!is_string($usernameInput) || !is_string($password) || strlen($usernameInput) > 60 || strlen($password) > 1024) jsonError('All fields are required.');
        $newUsername = strtolower(trim($usernameInput));
        if (!$newUsername || !$password) jsonError('All fields are required.');
        if (strlen($newUsername) < 3) jsonError('Username must be at least 3 characters.');
        if (!preg_match('/^[a-z0-9._]+$/', $newUsername)) jsonError('Username can only contain lowercase letters, numbers, dots, and underscores.');

        $db = getDB();
        $st = $db->prepare('SELECT password FROM users WHERE id = ? LIMIT 1');
        $st->execute([$user['id']]);
        $row = $st->fetch();
        if (!password_verify($password, $row['password'])) jsonError('Password is incorrect.');

        $chk = $db->prepare('SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1');
        $chk->execute([$newUsername, $user['id']]);
        if ($chk->fetch()) jsonError('That username is already taken.');

        $db->prepare('UPDATE users SET username = ? WHERE id = ?')->execute([$newUsername, $user['id']]);
        $_SESSION['trafeco_user']['username'] = $newUsername;

        auditLog($user['id'], 'change_username', 'auth', "Changed username to $newUsername");
        jsonOk(['username' => $newUsername], 'Username changed successfully.');
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=change-email
    // --------------------------------------------------------
    case 'change-email': {
        $user     = requireLogin();
        $emailInput = $body['newEmail'] ?? '';
        $password = $body['password'] ?? '';

        if (!is_string($emailInput) || !is_string($password) || strlen($emailInput) > 254 || strlen($password) > 1024) jsonError('All fields are required.');
        $newEmail = trim($emailInput);
        if (!$newEmail || !$password) jsonError('All fields are required.');
        if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) jsonError('Please enter a valid email address.');

        $db = getDB();
        $st = $db->prepare('SELECT password FROM users WHERE id = ? LIMIT 1');
        $st->execute([$user['id']]);
        $row = $st->fetch();
        if (!password_verify($password, $row['password'])) jsonError('Password is incorrect.');

        $chk = $db->prepare('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1');
        $chk->execute([$newEmail, $user['id']]);
        if ($chk->fetch()) jsonError('That email is already in use.');

        $db->prepare('UPDATE users SET email = ? WHERE id = ?')->execute([$newEmail, $user['id']]);
        $_SESSION['trafeco_user']['email'] = $newEmail;

        auditLog($user['id'], 'change_email', 'auth', "Changed email to $newEmail");
        jsonOk(['email' => $newEmail], 'Email changed successfully.');
        break;
    }

    default:
        jsonError('Unknown action', 404);
}
