<?php
// ============================================================
//  Database connection — singleton PDO
// ============================================================
function trafecoConfig(): array {
    static $config = null;
    if ($config === null) {
        $config = [];
        $configFile = __DIR__ . '/hosting.php';
        if (is_file($configFile)) {
            $loaded = require $configFile;
            if (!is_array($loaded)) throw new RuntimeException('config/hosting.php must return an array.');
            $config = $loaded;
        }
    }
    return $config;
}

function trafecoSetting(string $name, $default = null) {
    $value = getenv($name);
    if ($value !== false && $value !== '') return $value;
    return trafecoConfig()[$name] ?? $default;
}

function trafecoIsProduction(): bool {
    $environment = strtolower(trim((string)trafecoSetting('TRAFECO_ENV', 'development')));
    if (!in_array($environment, ['development', 'production'], true)) {
        throw new RuntimeException('TRAFECO_ENV must be either development or production.');
    }
    return $environment === 'production';
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $isProduction = trafecoIsProduction();
        $hostEnv = trafecoSetting('TRAFECO_DB_HOST', false);
        $nameEnv = trafecoSetting('TRAFECO_DB_NAME', false);
        $userEnv = trafecoSetting('TRAFECO_DB_USER', false);
        $passEnv = trafecoSetting('TRAFECO_DB_PASSWORD', false);

        if ($isProduction && ($hostEnv === false || $nameEnv === false || $userEnv === false || $passEnv === false
            || $hostEnv === '' || $nameEnv === '' || $userEnv === '' || $passEnv === ''
            || strtolower($userEnv) === 'root')) {
            throw new RuntimeException('Production requires explicit database settings and a dedicated database user with a password.');
        }

        $host   = $hostEnv !== false && $hostEnv !== '' ? $hostEnv : 'localhost';
        $dbname = $nameEnv !== false && $nameEnv !== '' ? $nameEnv : 'trafeco_db';
        $user   = $userEnv !== false && $userEnv !== '' ? $userEnv : 'root';
        $pass   = $passEnv !== false ? $passEnv : '';
        $pdo = new PDO(
            "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
            $user, $pass,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}
