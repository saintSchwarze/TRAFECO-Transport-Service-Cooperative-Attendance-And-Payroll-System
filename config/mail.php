<?php
// Configure SMTP credentials in the PHP environment. Never commit real credentials.
$isProduction = trafecoIsProduction();
$appBaseUrl = trafecoSetting('TRAFECO_APP_BASE_URL');
if ($appBaseUrl === false || $appBaseUrl === '') {
    $appBaseUrl = $isProduction ? '' : 'http://localhost/capstoneee';
}
if (!$isProduction) {
    $localBaseUrl = trafecoLocalAppBaseUrl();
    if ($localBaseUrl !== null) $appBaseUrl = $localBaseUrl;
}

return [
    'host' => trafecoSetting('TRAFECO_SMTP_HOST', ''),
    'port' => (int)trafecoSetting('TRAFECO_SMTP_PORT', 587),
    'encryption' => strtolower((string)trafecoSetting('TRAFECO_SMTP_ENCRYPTION', 'tls')), // tls (STARTTLS) or ssl
    'username' => trafecoSetting('TRAFECO_SMTP_USERNAME', ''),
    'password' => trafecoSetting('TRAFECO_SMTP_PASSWORD', ''),
    'from_email' => trafecoSetting('TRAFECO_MAIL_FROM', ''),
    'from_name' => trafecoSetting('TRAFECO_MAIL_FROM_NAME', 'TRAFECO'),
    // Production must set this to the public HTTPS origin.
    'app_base_url' => $appBaseUrl,
];

function trafecoLocalAppBaseUrl(): ?string {
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    $script = (string)($_SERVER['SCRIPT_NAME'] ?? '');
    if (!preg_match('/^(?:localhost|127\.0\.0\.1|\[::1\])(?::([0-9]{1,5}))?$/i', $host, $hostMatch)
        || !preg_match('#^(.*)/api/[^/]+\.php$#', $script, $scriptMatch)) return null;
    if (isset($hostMatch[1]) && ((int)$hostMatch[1] < 1 || (int)$hostMatch[1] > 65535)) return null;
    $scheme = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
    return $scheme . '://' . $host . $scriptMatch[1];
}

function sendAppEmail(array $cfg, string $to, string $toName, string $subject, string $html): void {
    foreach (['host', 'username', 'password', 'from_email', 'app_base_url'] as $key) {
        if (empty($cfg[$key])) throw new RuntimeException('Missing SMTP setting: ' . $key);
    }
    if (trafecoIsProduction()) {
        $url = parse_url($cfg['app_base_url']);
        if (!is_array($url) || strtolower((string)($url['scheme'] ?? '')) !== 'https'
            || empty($url['host']) || isset($url['user']) || isset($url['pass'])) {
            throw new RuntimeException('Production email links require a valid HTTPS application URL.');
        }
    }
    if (!filter_var($cfg['from_email'], FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Invalid sender email.');
    $host = $cfg['host'];
    $port = $cfg['port'];
    $transport = $cfg['encryption'] === 'ssl' ? 'ssl://' : 'tcp://';
    $socket = @stream_socket_client($transport . $host . ':' . $port, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
    if (!$socket) throw new RuntimeException('SMTP connection failed: ' . $errstr);
    stream_set_timeout($socket, 15);
    try {
        smtpExpect($socket, [220]);
        smtpCommand($socket, 'EHLO trafeco.local', [250]);
        if ($cfg['encryption'] === 'tls') {
            smtpCommand($socket, 'STARTTLS', [220]);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('SMTP TLS negotiation failed.');
            smtpCommand($socket, 'EHLO trafeco.local', [250]);
        } elseif ($cfg['encryption'] !== 'ssl') throw new RuntimeException('SMTP encryption must be tls or ssl.');
        smtpCommand($socket, 'AUTH LOGIN', [334]);
        smtpCommand($socket, base64_encode($cfg['username']), [334]);
        smtpCommand($socket, base64_encode($cfg['password']), [235]);
        smtpCommand($socket, 'MAIL FROM:<' . $cfg['from_email'] . '>', [250]);
        smtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtpCommand($socket, 'DATA', [354]);
        $cleanName = str_replace(["\r", "\n", '"'], '', $cfg['from_name']);
        $toName = str_replace(["\r", "\n", '"'], '', $toName);
        $headers = [
            'From: "' . $cleanName . '" <' . $cfg['from_email'] . '>',
            'To: "' . $toName . '" <' . $to . '>',
            'Subject: ' . $subject,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        $message = implode("\r\n", $headers) . "\r\n\r\n" . str_replace("\n.", "\n..", str_replace("\r\n.", "\r\n..", $html));
        fwrite($socket, preg_replace('/(?<!\r)\n/', "\r\n", $message) . "\r\n.\r\n");
        smtpExpect($socket, [250]);
        smtpCommand($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

function smtpCommand($socket, string $command, array $expected): string {
    if (fwrite($socket, $command . "\r\n") === false) throw new RuntimeException('SMTP write failed.');
    return smtpExpect($socket, $expected);
}

function smtpExpect($socket, array $expected): string {
    $response = '';
    do {
        $line = fgets($socket, 515);
        if ($line === false) throw new RuntimeException('SMTP server closed the connection.');
        $response .= $line;
    } while (strlen($line) >= 4 && $line[3] === '-');
    $code = (int)substr($response, 0, 3);
    if (!in_array($code, $expected, true)) throw new RuntimeException('SMTP rejected request (' . trim($response) . ').');
    return $response;
}
