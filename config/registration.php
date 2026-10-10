<?php
require_once __DIR__ . '/db.php';

function sendRegistrationInvite(PDO $db, array $recipient): bool {
    try {
        $cfg = require __DIR__ . '/mail.php';
        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $db->prepare('INSERT INTO registration_invites (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 48 HOUR)) ON DUPLICATE KEY UPDATE token_hash=VALUES(token_hash), expires_at=VALUES(expires_at), created_at=CURRENT_TIMESTAMP')
            ->execute([(int)$recipient['id'], $hash]);

        $url = rtrim((string)$cfg['app_base_url'], '/') . '/#register=' . rawurlencode($token);
        $safeName = htmlspecialchars((string)$recipient['full_name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeUrl = htmlspecialchars($url, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $html = '<p>Hello ' . $safeName . ',</p><p>Set up your TRAFECO account using the link below. The link expires in 48 hours and can be used once.</p><p><a href="' . $safeUrl . '">Complete your registration</a></p><p>If you were not expecting this invitation, please contact your manager.</p>';

        sendAppEmail($cfg, (string)$recipient['email'], (string)$recipient['full_name'], 'Complete your TRAFECO registration', $html);
        return true;
    } catch (Throwable $e) {
        error_log('Registration invitation email failed for user id=' . (int)$recipient['id'] . ': ' . $e->getMessage());
        return false;
    }
}
