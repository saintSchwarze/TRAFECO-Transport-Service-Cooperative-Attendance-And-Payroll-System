<?php
// Copy this file to config/hosting.php on the host and enter values from its
// control panel. Never commit or share the completed hosting.php file.
return [
    'TRAFECO_ENV' => 'production',
    'TRAFECO_ALLOWED_HOST' => 'your-site-subdomain.example',
    'TRAFECO_APP_BASE_URL' => 'https://your-site-subdomain.example',

    'TRAFECO_DB_HOST' => 'database-host-from-control-panel',
    'TRAFECO_DB_NAME' => 'database-name-from-control-panel',
    'TRAFECO_DB_USER' => 'database-user-from-control-panel',
    'TRAFECO_DB_PASSWORD' => 'replace-with-a-unique-database-password',

    'TRAFECO_TURNSTILE_SITE_KEY' => 'your-production-turnstile-site-key',
    'TRAFECO_TURNSTILE_SECRET_KEY' => 'your-production-turnstile-secret-key',

    'TRAFECO_SMTP_HOST' => 'smtp.gmail.com',
    'TRAFECO_SMTP_PORT' => '587',
    'TRAFECO_SMTP_ENCRYPTION' => 'tls',
    'TRAFECO_SMTP_USERNAME' => 'your-sender@gmail.com',
    'TRAFECO_SMTP_PASSWORD' => 'your-new-gmail-app-password',
    'TRAFECO_MAIL_FROM' => 'your-sender@gmail.com',
    'TRAFECO_MAIL_FROM_NAME' => 'TRAFECO',
];
