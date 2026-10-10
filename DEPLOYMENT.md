# Deploying TRAFECO to InfinityFree

This guide puts the current PHP/MySQL app online using an InfinityFree free subdomain. It is suitable for a school demo with sample data. Do not upload real payroll, employee, or personal records to a free demo host. Keep an encrypted backup outside the hosting account.

## 1. Create the hosted site

1. Create an account at [InfinityFree](https://www.infinityfree.com/).
2. Create a hosting account and choose a free subdomain, for example `trafeco.rf.gd`.
3. Free InfinityFree subdomains receive SSL automatically. Once the site is created, try `https://YOUR-HOSTNAME`; no certificate request is needed for a free subdomain.
4. Write down the full hostname and the database details shown in the control panel. The database host is not necessarily `localhost`.

## 2. Prepare app settings

1. Copy `config/hosting.example.php` to `config/hosting.php`.
2. In `hosting.php`, replace every example value with the site's exact hostname, HTTPS URL, database credentials, Turnstile keys, and Gmail SMTP details.
3. Use a new unique database password and a newly generated Gmail app password. Do not put these values in chat or commit the completed file.
4. Add the chosen hostname to the Cloudflare Turnstile widget's allowed hostnames. Put that widget's matching site and secret keys in `hosting.php`.
5. The root `.htaccess` denies web requests to `/config`, `/database`, and `/deployment`; the PHP app can still load its config internally. After upload, check that visiting `https://YOUR-HOST/config/hosting.php` shows a forbidden/not-found page, never PHP source.

## 3. Create and fill the hosted database

1. In local XAMPP phpMyAdmin, export the TRAFECO database as SQL. Use a separate sample-data database for the demo; remove real people and payroll data before exporting.
2. In the InfinityFree control panel, create a MySQL database.
3. Open that database's phpMyAdmin and import the SQL export.
4. If the exported database does not already contain `password_reset_tokens`, import `database/migrations/20261008_password_reset_tokens.sql` as well.
5. Import `database/migrations/20261008_payslip_unpaid_deductions.sql` once to add the uncollected-deduction field, cap existing payslips at ₱0 payable, and recalculate payroll batch totals. Payslip statuses and approval fields are preserved.
6. Put the exact database host, name, username, and password from the control panel into `config/hosting.php`.

## 4. Upload the app

1. Open the site's `htdocs` folder using the InfinityFree File Manager or FTP.
2. Upload the app's files and folders into `htdocs`, keeping their folder structure. Upload `.htaccess` too. Do not upload local SQL exports, backups, `httpd.conf`, or the DuckDNS Apache vhost file.
3. Upload `config/hosting.php` only after filling it out. Do not overwrite it with `hosting.example.php` afterward.
4. Confirm the uploaded `uploads/profile_pictures` folder is writable if the app needs profile-photo uploads.

## 5. Test before sharing

1. Open the site's **HTTPS** address. If HTTPS is not ready, wait for SSL activation; do not send people an HTTP link.
2. Test Turnstile login, account login/logout, employee list, sample payroll features, and profile image upload.
3. Request a password reset and confirm the email arrives and its link points to the HTTPS hostname.
4. Check `https://YOUR-HOST/config/hosting.php` and `https://YOUR-HOST/database/`; neither should show source files or database content.
5. Export a fresh database backup and store it somewhere other than the hosting account.

## Important limits

- InfinityFree free hosting does not allow remote MySQL clients such as MySQL Workbench. Use the hosted PHP app and the host's phpMyAdmin.
- The free host does not provide email accounts. The app uses Gmail SMTP; test password reset end to end after deployment.
- Free hosting does not guarantee backups. Keep independent backups and use fake data for this public demo.
- `deployment/httpd-vhosts.example.conf` and DuckDNS are for self-hosting on your own Apache server; you do not need them for InfinityFree.
- Review InfinityFree's [terms](https://www.infinityfree.com/terms/) before deploying, and use a paid managed host with backups and appropriate privacy protections before handling real payroll records.
