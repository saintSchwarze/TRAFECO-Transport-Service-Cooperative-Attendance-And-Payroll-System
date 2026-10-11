<?php
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/registration.php';

commonHeaders();
$action = $_GET['action'] ?? 'list';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
apiMutationGuard([
    'create' => 'POST', 'resend-invite' => 'POST', 'update' => 'PUT', 'delete' => 'DELETE',
    'update-contact' => 'PUT', 'upload-photo' => 'POST',
]);

switch ($action) {

    // --------------------------------------------------------
    //  GET ?action=list
    // --------------------------------------------------------
    case 'list': {
        $user = requirePermission('viewOtherEmployees');

        $db = getDB();

        // Employees have role='employee' in users table plus a record in employees table
        $sql = '
            SELECT u.id, u.username, u.staff_id, u.email, u.status AS account_status, u.last_login,
                   e.id AS emp_id, e.first_name, e.last_name,
                   CONCAT(e.first_name," ",e.last_name) AS full_name,
                   e.department, e.position, e.employment_type,
                   e.basic_salary, e.hourly_rate, e.phone, e.hire_date, e.status AS emp_status,
                   e.gender, e.marital_status, e.cohabiting_with_spouse
            FROM employees e
            JOIN users u ON e.user_id = u.id
            ORDER BY e.last_name, e.first_name
        ';
        $rows = $db->query($sql)->fetchAll();
        jsonOk(['employees' => $rows]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=get&id=USER_ID
    // --------------------------------------------------------
    case 'get': {
        $user  = requireLogin();
        $empId = (int)($_GET['id'] ?? 0);
        if (!$empId) jsonError('Employee ID required.');

        // Allow self-service for every role; other employee records require an explicit view permission.
        if ((int)$user['id'] !== $empId && !hasPermission('viewOtherEmployees')) {
            jsonError('Access denied', 403);
        }

        $db = getDB();
        $st = $db->prepare('
            SELECT u.id, u.username, u.staff_id, u.email, u.status AS account_status,
                   e.first_name, e.last_name, e.department, e.position, e.employment_type,
                   e.basic_salary, e.hourly_rate, e.phone, e.address, e.emergency_contact_name, e.emergency_contact_phone,
                   e.profile_picture,
                   e.hire_date, e.status AS emp_status, e.gender, e.marital_status, e.cohabiting_with_spouse,
                   e.gov_sss, e.gov_philhealth, e.gov_pagibig, e.gov_tin,
                   e.sss_enabled, e.philhealth_enabled, e.pagibig_enabled
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE u.id = ?
        ');
        $st->execute([$empId]);
        $emp = $st->fetch();
        if (!$emp) jsonError('Employee not found.', 404);

        jsonOk(['employee' => $emp]);
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=create  (manager only)
    //  Body: email, department, position, employmentType, salary/hourlyRate
    // --------------------------------------------------------
    case 'create': {
        $user = requirePermission('createEditEmployees');

        $required = ['department','position','employmentType','email'];
        foreach ($required as $f) {
            if (empty($body[$f])) jsonError("Field '$f' is required.");
        }

        $department = trim($body['department']);
        $position   = trim($body['position']);
        $empType    = $body['employmentType'];
        $salary     = (float)($body['salary'] ?? 0);
        $hourlyRate = (float)($body['hourlyRate'] ?? 0);
        if (!in_array($empType, ['Full-time','Part-time'], true)) jsonError('Select a valid employment type.');
        if ($empType === 'Full-time' && $salary <= 0) jsonError('Enter a salary greater than zero.');
        if ($empType === 'Part-time' && $hourlyRate <= 0) jsonError('Enter an hourly rate greater than zero.');
        $emailInput = $body['email'];
        if (!is_string($emailInput) || strlen($emailInput) > 150) jsonError('Enter a valid email address.');
        $email = trim($emailInput);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Enter a valid email address.');
        $db = getDB();

        $chk = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $chk->execute([$email]);
        if ($chk->fetch()) jsonError('An account with that email already exists.');

        $cnt = (int)$db->query('SELECT COUNT(*) FROM users WHERE role="employee"')->fetchColumn();
        $staffIdCheck = $db->prepare('SELECT id FROM users WHERE staff_id=? LIMIT 1');
        do {
            $cnt++;
            $staffId = 'EMP' . str_pad($cnt, 3, '0', STR_PAD_LEFT);
            $staffIdCheck->execute([$staffId]);
        } while ($staffIdCheck->fetchColumn());

        $db->beginTransaction();
        try {
            $db->prepare('INSERT INTO users (full_name,email,role,staff_id,department,status) VALUES (?,?,?,?,?,"pending")')
               ->execute(['Registration pending', $email, 'employee', $staffId, $department]);
            $newUserId = (int)$db->lastInsertId();
            $db->prepare('INSERT INTO employees (user_id,first_name,last_name,department,position,employment_type,basic_salary,hourly_rate,hire_date,created_by) VALUES (?,?,?,?,?,?,?,?,CURRENT_DATE(),?)')
               ->execute([$newUserId, '', '', $department, $position, $empType, $empType === 'Full-time' ? $salary : 0, $empType === 'Part-time' ? $hourlyRate : 0, $user['id']]);
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            error_log('Employee creation failed: ' . $e->getMessage());
            jsonError('Could not create the employee. Please check the information and try again.', 500);
        }

        $invitationSent = sendRegistrationInvite($db, ['id' => $newUserId, 'full_name' => 'New employee', 'email' => $email]);
        auditLog($user['id'], 'create_employee', 'employees', "Created pending employee invitation for $email (staff: $staffId), invitation sent=" . ($invitationSent ? 'yes' : 'no'));
        jsonOk(['staffId' => $staffId, 'userId' => $newUserId, 'invitationSent' => $invitationSent],
            $invitationSent ? 'Employee created and registration link emailed.' : 'Employee created, but the registration email could not be sent. Use Resend Invitation from the employee list.');
        break;
    }

    case 'resend-invite': {
        $user = requirePermission('createEditEmployees');
        $id = (int)($body['userId'] ?? 0);
        if ($id <= 0) jsonError('Employee ID required.');
        if (!rateLimitAllow('registration-resend-user', (string)$id, 5, 3600)) jsonError('Too many invitations sent. Try again later.', 429);
        $db = getDB();
        $st = $db->prepare('SELECT u.id, u.full_name, u.email FROM users u JOIN employees e ON e.user_id=u.id WHERE u.id=? AND u.role="employee" AND u.status="pending" LIMIT 1');
        $st->execute([$id]);
        $recipient = $st->fetch();
        if (!$recipient) jsonError('This employee is not awaiting registration.', 404);
        if (!sendRegistrationInvite($db, $recipient)) jsonError('The registration email could not be sent. Check SMTP settings and try again.', 503);
        auditLog($user['id'], 'resend_registration_invite', 'employees', "Resent registration invitation for user id=$id");
        jsonOk([], 'A new registration link has been emailed. The previous link no longer works.');
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=update&id=USER_ID  (manager only)
    // --------------------------------------------------------
    case 'update': {
        $user  = requirePermission('createEditEmployees');
        $empId = (int)($_GET['id'] ?? 0);
        if (!$empId) jsonError('Employee ID required.');

        $db = getDB();
        $st = $db->prepare('SELECT * FROM employees WHERE user_id = ? LIMIT 1');
        $st->execute([$empId]);
        $emp = $st->fetch();
        if (!$emp) jsonError('Employee not found.', 404);

        $newMarital = $body['maritalStatus'] ?? $body['marital_status'] ?? null;
        if ($newMarital !== null && !in_array($newMarital, ['single','married','separated','widowed','other'], true)) jsonError('Select a valid marital status.');
        $newGender = $body['gender'] ?? null;
        if ($newGender !== null && !in_array($newGender, ['male','female','other','prefer_not_to_say'], true)) jsonError('Select a valid gender option.');
        $cohabitingValue = $body['cohabitingWithSpouse'] ?? $body['cohabiting_with_spouse'] ?? null;
        if ($newMarital === 'married' && !in_array((string)$cohabitingValue, ['0','1'], true)) jsonError('Select whether the employee lives together with their spouse.');
        if ($newMarital !== null && $newMarital !== 'married') {
            $body['cohabitingWithSpouse'] = null;
            $body['cohabiting_with_spouse'] = null;
        }

        $fields = [];
        $vals   = [];
        foreach (['first_name','last_name','gender','marital_status','cohabiting_with_spouse','department','position','employment_type','basic_salary','hourly_rate','phone','address','emergency_contact_name','emergency_contact_phone','sss_enabled','philhealth_enabled','pagibig_enabled','hire_date','status','gov_sss','gov_philhealth','gov_pagibig','gov_tin'] as $f) {
            $bodyKey = lcfirst(str_replace('_', '', ucwords($f, '_')));
            if (array_key_exists($f, $body)) {
                $fields[] = "$f = ?";
                $vals[]   = $body[$f];
            } elseif (array_key_exists($bodyKey, $body)) {
                $fields[] = "$f = ?";
                $vals[]   = $body[$bodyKey];
            }
        }

        if ($fields) {
            $vals[] = $empId;
            $db->prepare('UPDATE employees SET ' . implode(', ', $fields) . ' WHERE user_id = ?')->execute($vals);
        }

        // Update department on users table too
        if (!empty($body['department'])) {
            $db->prepare('UPDATE users SET department = ? WHERE id = ?')->execute([$body['department'], $empId]);
        }

        // Keep users.full_name in sync whenever the name changes - login,
        // session, header, and sidebar all read from users.full_name, not
        // employees.first_name/last_name.
        $newFullName = null;
        if (isset($body['firstName']) || isset($body['lastName']) || isset($body['first_name']) || isset($body['last_name'])) {
            $nameSt = $db->prepare('SELECT first_name, last_name FROM employees WHERE user_id=? LIMIT 1');
            $nameSt->execute([$empId]);
            $updatedEmp = $nameSt->fetch();
            $newFullName = trim($updatedEmp['first_name'] . ' ' . $updatedEmp['last_name']);
            $db->prepare('UPDATE users SET full_name = ? WHERE id = ?')->execute([$newFullName, $empId]);

            // If the manager just edited their own record, update their live session too
            if ($empId === $user['id']) {
                $_SESSION['trafeco_user']['full_name'] = $newFullName;
            }
        }

        auditLog($user['id'], 'update_employee', 'employees', "Updated employee id=$empId");
        jsonOk(['fullName' => $newFullName], 'Employee updated');
        break;
    }

    // --------------------------------------------------------
    //  DELETE ?action=delete&id=USER_ID  (manager only)
    // --------------------------------------------------------
    case 'delete': {
        $user  = requirePermission('createEditEmployees');
        $empId = (int)($_GET['id'] ?? 0);
        if (!$empId) jsonError('Employee ID required.');

        $db = getDB();
        // Soft-delete: set status inactive
        $db->prepare('UPDATE users SET status="inactive" WHERE id=?')->execute([$empId]);
        $db->prepare('UPDATE employees SET status="inactive" WHERE user_id=?')->execute([$empId]);

        auditLog($user['id'], 'deactivate_employee', 'employees', "Deactivated employee id=$empId");
        jsonOk([], 'Employee deactivated');
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=departments  — distinct departments currently
    //  in use, for populating filter dropdowns
    // --------------------------------------------------------
    case 'departments': {
        $user = requireLogin();
        $db   = getDB();
        $rows = $db->query('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department <> "" ORDER BY department')->fetchAll();
        jsonOk(['departments' => array_column($rows, 'department')]);
        break;
    }


    
    // --------------------------------------------------------
    //  PUT ?action=update-contact  — self-service: any logged-in
    //  user can update their OWN phone/address/emergency contact
    // --------------------------------------------------------
    case 'update-contact': {
        $user = requireLogin();
        $db   = getDB();

        $st = $db->prepare('SELECT id FROM employees WHERE user_id=? LIMIT 1');
        $st->execute([$user['id']]);
        if (!$st->fetch()) jsonError('Employee profile not found.', 404);

        $phone   = trim($body['phone']   ?? '');
        $address = trim($body['address'] ?? '');
        $emName  = trim($body['emergencyContactName']  ?? '');
        $emPhone = trim($body['emergencyContactPhone'] ?? '');

        $db->prepare('UPDATE employees SET phone=?, address=?, emergency_contact_name=?, emergency_contact_phone=? WHERE user_id=?')
           ->execute([$phone, $address, $emName, $emPhone, $user['id']]);

        auditLog($user['id'], 'update_own_contact', 'employees', 'Updated own contact information');
        jsonOk([], 'Contact information updated');
        break;
    }

    // --------------------------------------------------------
    //  POST ?action=upload-photo  — self-service, multipart/form-data
    //  Field name: "photo"
    // --------------------------------------------------------
    case 'upload-photo': {
        $user = requireLogin();

        if (empty($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            jsonError('No valid file uploaded.');
        }

        $file = $_FILES['photo'];
        if ($file['size'] > 2 * 1024 * 1024) jsonError('Image must be under 2MB.');

        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $mime = mime_content_type($file['tmp_name']);
        if (!isset($allowed[$mime])) jsonError('Only JPG, PNG, or WEBP images are allowed.');

        $db = getDB();
        $chk = $db->prepare('SELECT profile_picture FROM employees WHERE user_id=? LIMIT 1');
        $chk->execute([$user['id']]);
        $existing = $chk->fetch();
        if (!$existing) jsonError('Employee profile not found.', 404);

        $uploadDir = __DIR__ . '/../uploads/profile_pictures/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        $filename = 'user_' . $user['id'] . '_' . time() . '.' . $allowed[$mime];
        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            jsonError('Failed to save uploaded image.');
        }

        // Clean up the old picture file, if any
        if (!empty($existing['profile_picture'])) {
            $oldFile = $uploadDir . basename($existing['profile_picture']);
            if (file_exists($oldFile)) @unlink($oldFile);
        }

        $relPath = 'uploads/profile_pictures/' . $filename;
        $db->prepare('UPDATE employees SET profile_picture=? WHERE user_id=?')->execute([$relPath, $user['id']]);

        auditLog($user['id'], 'update_profile_picture', 'employees', 'Uploaded a new profile picture');
        jsonOk(['path' => $relPath], 'Profile picture updated');
        break;
    }

    default:
        jsonError('Unknown action', 404);
}
