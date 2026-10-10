<?php
// Set these in the Apache/PHP environment. The site key is public; the secret must stay server-side.
return [
    'site_key' => trafecoSetting('TRAFECO_TURNSTILE_SITE_KEY', ''),
    'secret_key' => trafecoSetting('TRAFECO_TURNSTILE_SECRET_KEY', ''),
];
