<?php
require_once __DIR__ . '/../config/helpers.php';

commonHeaders();
$action = $_GET['action'] ?? 'list';
$body   = json_decode(file_get_contents('php://input'), true) ?? $_POST ?? [];
apiMutationGuard([
    'request' => 'POST', 'notify-pregnancy' => 'POST', 'approve' => 'PUT', 'decline' => 'PUT', 'clear-all' => 'DELETE',
]);

function enforceLeaveReviewer(PDO $db, int $requesterId, array $reviewer): void {
    if ($requesterId === (int)$reviewer['id']) jsonError('You cannot approve or decline your own leave request.', 403);
    $st = $db->prepare('SELECT role FROM users WHERE id=? LIMIT 1');
    $st->execute([$requesterId]);
    $requesterRole = $st->fetchColumn();
    if ($requesterRole === 'manager' && $reviewer['role'] !== 'chairman') {
        jsonError('A manager’s leave request must be reviewed by the chairman.', 403);
    }
    if ($requesterRole === 'chairman' && $reviewer['role'] !== 'manager') {
        jsonError('The chairman’s leave request must be reviewed by the manager.', 403);
    }
}

switch ($action) {

    // --------------------------------------------------------
    //  GET ?action=list  — own requests (all roles)
    // --------------------------------------------------------
    case 'list': {
        $user = requireLogin();
        $db   = getDB();
        $st   = $db->prepare('
            SELECT lr.*, u.full_name AS employee_name, u.staff_id,
                   r.full_name AS reviewed_by_name
            FROM leave_requests lr
            JOIN users u ON lr.user_id = u.id
            LEFT JOIN users r ON lr.reviewed_by = r.id
            WHERE lr.user_id = ?
            ORDER BY lr.created_at DESC
        ');
        $st->execute([$user['id']]);
        jsonOk(['requests' => $st->fetchAll()]);
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=pending  — pending requests (manager/chairman)
    // --------------------------------------------------------
    case 'pending': {
        $user = requirePermission('approveLeave');
        $db   = getDB();
        $st   = $db->prepare(<<<'SQL'
            SELECT lr.*, u.full_name AS employee_name, u.staff_id, u.department, u.role AS requester_role,
                   (SELECT MAX(n.created_at) FROM leave_notifications n WHERE n.user_id=lr.user_id AND n.expected_delivery_date=lr.expected_delivery_date AND n.notification_type=CASE WHEN lr.leave_type LIKE 'Maternity Leave%' THEN 'maternity' ELSE 'paternity' END) AS pregnancy_notice_recorded_at
            FROM leave_requests lr
            JOIN users u ON lr.user_id = u.id
            WHERE lr.status = "pending"
            ORDER BY lr.created_at ASC
        SQL);
        $st->execute();
        $requests = array_values(array_filter($st->fetchAll(), static function(array $request) use ($user): bool {
            if ((int)$request['user_id'] === (int)$user['id']) return false;
            if ($request['requester_role'] === 'manager') return $user['role'] === 'chairman';
            if ($request['requester_role'] === 'chairman') return $user['role'] === 'manager';
            return in_array($user['role'], ['manager', 'chairman'], true);
        }));
        $docs = $db->prepare('SELECT id,document_type FROM leave_request_attachments WHERE leave_request_id=? ORDER BY id');
        foreach ($requests as &$request) { $docs->execute([$request['id']]); $request['documents'] = $docs->fetchAll(); }
        unset($request);
        jsonOk(['requests' => $requests]);
        break;
    }

    case 'my-notifications': {
        $user = requirePermission('requestLeave');
        $st = getDB()->prepare('SELECT id,notification_type,expected_delivery_date,spouse_name,notification_text,created_at FROM leave_notifications WHERE user_id=? ORDER BY created_at DESC');
        $st->execute([$user['id']]);
        jsonOk(['notifications' => $st->fetchAll()]);
        break;
    }

    case 'notifications': {
        requirePermission('approveLeave');
        $st = getDB()->query('SELECT n.id,n.notification_type,n.expected_delivery_date,n.spouse_name,n.notification_text,n.created_at,u.full_name AS employee_name,u.staff_id,u.department FROM leave_notifications n JOIN users u ON u.id=n.user_id ORDER BY n.created_at DESC');
        jsonOk(['notifications' => $st->fetchAll()]);
        break;
    }

    case 'notify-pregnancy': {
        $user = requirePermission('requestLeave');
        $type = $body['notificationType'] ?? '';
        $edd = $body['expectedDeliveryDate'] ?? '';
        $spouse = trim($body['spouseName'] ?? '');
        $text = trim($body['notificationText'] ?? '');
        if (!in_array($type, ['maternity', 'paternity'], true)) jsonError('Select maternity or paternity notification.');
        $date = DateTime::createFromFormat('!Y-m-d', $edd);
        if (!$date || $date->format('Y-m-d') !== $edd) jsonError('Enter a valid expected delivery date.');
        $st = getDB()->prepare('SELECT e.gender,e.marital_status,e.cohabiting_with_spouse FROM employees e WHERE e.user_id=? LIMIT 1');
        $st->execute([$user['id']]); $profile = $st->fetch();
        if ($type === 'maternity' && (!$profile || strtolower($profile['gender']) !== 'female')) jsonError('Maternity notification is only available to female employees.');
        if ($type === 'paternity') {
            if (!$profile || strtolower($profile['gender']) !== 'male') jsonError('Paternity notification is only available to male employees.');
            if ($spouse === '') jsonError('Enter your spouse’s name.');
        }
        getDB()->prepare('INSERT INTO leave_notifications (user_id,notification_type,expected_delivery_date,spouse_name,notification_text) VALUES (?,?,?,?,?)')
            ->execute([$user['id'], $type, $edd, $spouse ?: null, $text ?: null]);
        auditLog($user['id'], 'pregnancy_leave_notification', 'leave', "Recorded $type pregnancy notification; EDD $edd");
        jsonOk([], 'Notification recorded. Submit any required employer/SSS notice through the applicable official process.');
        break;
    }

    case 'proof': {
        requirePermission('approveLeave');
        $id = (int)($_GET['id'] ?? 0);
        $st = getDB()->prepare('SELECT proof_path FROM leave_requests WHERE id=? LIMIT 1');
        $st->execute([$id]);
        $path = $st->fetchColumn();
        if (!$path || !preg_match('~^uploads/leave-proofs/[a-f0-9]{40}\\.(jpg|png|webp|pdf)$~', $path)) jsonError('Proof file not found.', 404);
        $fullPath = __DIR__ . '/../' . $path;
        if (!is_file($fullPath)) jsonError('Proof image not found.', 404);
        $mime = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'pdf' => 'application/pdf'][pathinfo($fullPath, PATHINFO_EXTENSION)];
        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="leave-proof.' . pathinfo($fullPath, PATHINFO_EXTENSION) . '"');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        readfile($fullPath);
        exit;
    }

    case 'document': {
        requirePermission('approveLeave');
        $id = (int)($_GET['id'] ?? 0);
        $st = getDB()->prepare('SELECT file_path FROM leave_request_attachments WHERE id=? LIMIT 1');
        $st->execute([$id]); $path = $st->fetchColumn();
        if (!$path || !preg_match('~^uploads/leave-proofs/[a-f0-9]{40}\\.(jpg|png|webp|pdf)$~', $path)) jsonError('Document not found.',404);
        $fullPath = __DIR__.'/../'.$path; if (!is_file($fullPath)) jsonError('Document file not found.',404);
        $ext = pathinfo($fullPath,PATHINFO_EXTENSION); $mime=['jpg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','pdf'=>'application/pdf'][$ext];
        header('Content-Type: '.$mime); header('Content-Disposition: inline; filename="leave-document.'.$ext.'"'); header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff'); readfile($fullPath); exit;
    }

    

    // --------------------------------------------------------
    //  POST ?action=request
    // --------------------------------------------------------
    case 'request': {
        $user = requirePermission('requestLeave');

        $leaveType = trim($body['leaveType'] ?? '');
        $dateFrom  = $body['dateFrom'] ?? '';
        $dateTo    = $body['dateTo']   ?? '';
        $reason    = trim($body['reason'] ?? '');

        if (!$leaveType || !$dateFrom || !$dateTo) {
            jsonError('Leave type and both dates are required.');
        }
        $allowedTypes = ['Vacation Leave', 'Sick Leave', 'Emergency Leave', 'Maternity Leave - Childbirth', 'Maternity Leave - Childbirth (Solo Parent)', 'Maternity Leave - Miscarriage/ETP', 'Paternity Leave'];
        if (!in_array($leaveType, $allowedTypes, true)) {
            jsonError('Please select a valid leave type.');
        }
        if (strlen($reason) > 2000) jsonError('Reason must be 2,000 characters or fewer.');
        $from = DateTime::createFromFormat('!Y-m-d', $dateFrom);
        $to   = DateTime::createFromFormat('!Y-m-d', $dateTo);
        if (!$from || !$to || $from->format('Y-m-d') !== $dateFrom || $to->format('Y-m-d') !== $dateTo) {
            jsonError('Please enter valid leave dates.');
        }
        $today = new DateTimeImmutable('today', new DateTimeZone('Asia/Manila'));
        $isStatutoryLeave = str_starts_with($leaveType, 'Maternity Leave') || $leaveType === 'Paternity Leave';
        if (!$isStatutoryLeave && $from < $today) jsonError('Leave start date must be today or a future date.');
        if ($to < $from) jsonError('End date must be on or after start date.');

        $days = (int)$from->diff($to)->days + 1;

        if ($leaveType === 'Vacation Leave' && $from < $today->modify('+7 days')) {
            jsonError('Vacation leave must be requested at least 7 days in advance.');
        }
        if ($leaveType === 'Emergency Leave' && $days !== 1) jsonError('Emergency leave is limited to one day.');
        if ($leaveType === 'Emergency Leave' && $dateFrom !== $today->format('Y-m-d')) jsonError('Emergency leave can only be requested for today.');
        $isMaternity = str_starts_with($leaveType, 'Maternity Leave');
        $isPaternity = $leaveType === 'Paternity Leave';
        $expectedDeliveryDate = null;
        $contingency = $body['contingencyType'] ?? ($leaveType === 'Maternity Leave - Miscarriage/ETP' ? 'miscarriage_etp' : 'live_birth');
        $soloParent = !empty($body['soloParent']) && $isMaternity && $contingency === 'live_birth';
        $allocatedDays = (int)($body['allocatedLeaveDays'] ?? 0);
        if ($allocatedDays < 0 || $allocatedDays > 7) jsonError('Allocated leave days must be between 0 and 7.');
        $unpaidExtension = !empty($body['unpaidExtension']) && $isMaternity;
        $maternityPaidDays = null;
        $sssRecordedMonths = null;
        if ($isMaternity) {
            $genderSt = getDB()->prepare('SELECT gender FROM employees WHERE user_id=? LIMIT 1'); $genderSt->execute([$user['id']]);
            if (strtolower((string)$genderSt->fetchColumn()) !== 'female') jsonError('Maternity leave is only available to female employees.');
            if (!in_array($contingency, ['live_birth', 'miscarriage_etp'], true)) jsonError('Select live birth or miscarriage/emergency termination.');
            if (($leaveType === 'Maternity Leave - Childbirth' && $contingency !== 'live_birth') || ($leaveType === 'Maternity Leave - Miscarriage/ETP' && $contingency !== 'miscarriage_etp')) jsonError('The maternity leave type and contingency do not match.');
            if ($contingency === 'miscarriage_etp' && ($allocatedDays > 0 || !empty($body['soloParent']) || !empty($body['unpaidExtension']))) {
                jsonError('Solo-parent days, allocated leave credits, and the unpaid extension apply only to live childbirth.');
            }
            $edd = trim($body['expectedDeliveryDate'] ?? '');
            $eddDate = $edd !== '' ? DateTime::createFromFormat('!Y-m-d', $edd) : false;
            if ($contingency === 'live_birth') {
                if (!$eddDate || $eddDate->format('Y-m-d') !== $edd) jsonError('Enter the expected delivery date.');
                $expectedDeliveryDate = $edd;
                if ($eddDate < $today && empty($body['maternityActualEventDate'])) {
                    jsonError('If the expected delivery date has passed, enter the actual delivery date for review.');
                }
                if ($from < (clone $eddDate)->modify('-45 days')) jsonError('Maternity leave can begin no earlier than 45 days before the expected delivery date.');
            } elseif ($edd !== '' && (!$eddDate || $eddDate->format('Y-m-d') !== $edd)) {
                jsonError('Enter a valid expected delivery date.');
            }
            if ($allocatedDays && (trim($body['allocationRecipientName'] ?? '') === '' || trim($body['allocationRelationship'] ?? '') === '' || trim($body['allocationEmployer'] ?? '') === '')) jsonError('Complete the recipient name, relationship, and employer for allocated leave.');
            $basePaidDays = $contingency === 'live_birth' ? 105 + ($soloParent ? 15 : 0) : 60;
            $maternityPaidDays = max(0, $basePaidDays - $allocatedDays);
            $expectedDays = $maternityPaidDays + ($unpaidExtension ? 30 : 0);
            if ($days !== $expectedDays) jsonError("For the selected maternity options, the requested date range must cover $expectedDays calendar days.");
            $sssSt = getDB()->prepare('SELECT gov_sss FROM employees WHERE user_id=? LIMIT 1'); $sssSt->execute([$user['id']]);
            $storedSss = (string)$sssSt->fetchColumn();
            if (!$storedSss || !hash_equals($storedSss, preg_replace('/\D/', '', $body['sssNumber'] ?? ''))) jsonError('Enter the SSS number recorded in your employee profile.');
            $eventDate = trim($body['maternityActualEventDate'] ?? '') ?: $edd;
            $event = DateTime::createFromFormat('!Y-m-d', $eventDate);
            if (!$event || $event->format('Y-m-d') !== $eventDate) jsonError('Enter a valid actual event date, or leave it blank.');
            if ($contingency === 'live_birth' && $from < $today && empty($body['maternityActualEventDate'])) {
                jsonError('For a retroactive childbirth leave request, enter the actual delivery date.');
            }
            if ($contingency === 'miscarriage_etp') {
                if (empty($body['maternityActualEventDate'])) jsonError('Enter the actual miscarriage or emergency termination date.');
                if ($event > new DateTime('today', new DateTimeZone('Asia/Manila'))) jsonError('The actual pregnancy-loss date cannot be in the future.');
                if ($dateFrom !== $eventDate) jsonError('For miscarriage or emergency termination, maternity leave must start on the actual event date.');
            } elseif (!empty($body['maternityActualEventDate'])) {
                if ($event > new DateTime('today', new DateTimeZone('Asia/Manila'))) jsonError('The actual delivery date cannot be in the future.');
                $earliestStart = (clone $event)->modify('-45 days');
                $minimumPostnatalEnd = (clone $event)->modify('+59 days');
                if ($from < $earliestStart) jsonError('Maternity leave may begin no earlier than 45 days before the actual delivery date.');
                if ($to < $minimumPostnatalEnd) jsonError('Maternity leave must include at least 60 days after delivery. Adjust the leave start date.');
            }
            $semesterStart = new DateTime($event->format('Y') . ((int)$event->format('n') <= 6 ? '-01-01' : '-07-01'));
            $periodStart = (clone $semesterStart)->modify('-12 months');
            $monthSt = getDB()->prepare('SELECT COUNT(*) FROM payslips WHERE employee_user_id=? AND payslip_type="regular" AND status="approved" AND sss_gsis>0 AND cutoff_start<=? AND cutoff_end>=?');
            $sssRecordedMonths = 0;
            for ($month = clone $periodStart; $month < $semesterStart; $month->modify('+1 month')) {
                $monthSt->execute([$user['id'], $month->format('Y-m-t'), $month->format('Y-m-01')]);
                if ((int)$monthSt->fetchColumn() > 0) $sssRecordedMonths++;
            }
        }
        $paternityNumber = null; $paternityActualDate = null; $paternitySchedule = null; $paternityDatesJson = null;
        if ($isPaternity) {
            $profileSt = getDB()->prepare('SELECT gender,marital_status,cohabiting_with_spouse,basic_salary,hourly_rate,employment_type FROM employees WHERE user_id=? LIMIT 1'); $profileSt->execute([$user['id']]); $profile = $profileSt->fetch();
            if (!$profile || strtolower($profile['gender']) !== 'male') jsonError('Paternity leave is only available to male employees.');
            if ($profile['marital_status'] !== 'married') jsonError('Paternity leave requires the employee to be legally married.');
            if ((int)$profile['cohabiting_with_spouse'] !== 1) jsonError('Paternity leave requires the employee to be recorded as living with his spouse.');
            $rate = $profile['employment_type'] === 'Full-time' ? (float)$profile['basic_salary'] : (float)$profile['hourly_rate'];
            if ($rate <= 0) jsonError('Paternity leave is locked until a valid employee pay rate is recorded for the employer-paid leave calculation.');
            $paternityNumber = (int)($body['deliveryNumber'] ?? 0);
            if ($paternityNumber < 1 || $paternityNumber > 4) jsonError('Paternity leave is limited to the first four deliveries.');
            if (!in_array($contingency, ['live_birth', 'miscarriage_etp'], true)) jsonError('Select the paternity contingency.');
            $edd = trim($body['expectedDeliveryDate'] ?? '');
            if ($contingency === 'live_birth') {
                $eddDate = DateTime::createFromFormat('!Y-m-d', $edd);
                if (!$eddDate || $eddDate->format('Y-m-d') !== $edd) jsonError('Enter the expected delivery date.');
                $expectedDeliveryDate = $edd;
            } elseif ($edd !== '') {
                $eddDate = DateTime::createFromFormat('!Y-m-d', $edd);
                if (!$eddDate || $eddDate->format('Y-m-d') !== $edd) jsonError('Enter a valid expected delivery date or leave it blank for miscarriage / pregnancy loss.');
                $expectedDeliveryDate = $edd;
            }
            $paternityActualDate = $body['actualEventDate'] ?? null;
            if ($paternityActualDate === null || $paternityActualDate === '') jsonError('Enter the actual childbirth or pregnancy-loss date shown by the supporting document.');
            $actual = DateTime::createFromFormat('!Y-m-d', $paternityActualDate);
            if (!$actual || $actual->format('Y-m-d') !== $paternityActualDate) jsonError('Enter a valid actual event date.');
            if ($actual > new DateTime('today', new DateTimeZone('Asia/Manila'))) jsonError('The actual childbirth or pregnancy-loss date cannot be in the future.');
            if ($contingency === 'live_birth') {
                $noticeCheck = getDB()->prepare('SELECT id FROM leave_notifications WHERE user_id=? AND notification_type="paternity" AND expected_delivery_date=? LIMIT 1');
                $noticeCheck->execute([$user['id'], $edd]);
                if (!$noticeCheck->fetch()) jsonError('Record the pregnancy notification before submitting a paternity leave request for childbirth.');
            }
            $paternitySchedule = $body['scheduleOption'] ?? '';
            if (!in_array($paternitySchedule, ['consecutive', 'intermittent'], true)) jsonError('Select consecutive or intermittent leave dates.');
            $paternityDates = array_values(array_unique(array_filter(array_map('trim', explode(',', $body['paternityDates'] ?? '')))));
            sort($paternityDates);
            if (count($paternityDates) !== 7 || $dateFrom !== $paternityDates[0] || $dateTo !== $paternityDates[6]) jsonError('Select exactly seven paternity dates and make From/To match the first and last selected dates.');
            foreach ($paternityDates as $paternityDate) {
                $parsed = DateTime::createFromFormat('!Y-m-d', $paternityDate);
                if (!$parsed || $parsed->format('Y-m-d') !== $paternityDate) jsonError('One or more paternity dates are invalid.');
                if ((int)$parsed->format('N') > 5) jsonError('Paternity leave dates must be scheduled workdays (Monday to Friday).');
            }
            if ($paternitySchedule === 'consecutive') {
                for ($i = 1; $i < 7; $i++) {
                    $nextWorkday = new DateTime($paternityDates[$i - 1]);
                    do { $nextWorkday->modify('+1 day'); } while ((int)$nextWorkday->format('N') > 5);
                    if ($nextWorkday->format('Y-m-d') !== $paternityDates[$i]) jsonError('Consecutive paternity leave must use seven consecutive workdays.');
                }
            }
            $days = 7;
            $used = getDB()->prepare('SELECT id FROM leave_requests WHERE user_id=? AND leave_type="Paternity Leave" AND paternity_delivery_number=? AND status IN ("pending","approved") LIMIT 1');
            $used->execute([$user['id'], $paternityNumber]); if ($used->fetch()) jsonError('That delivery number already has a pending or approved paternity request.');
            $paternityDatesJson = json_encode($paternityDates);
        }

        $needsMedicalCertificate = $leaveType === 'Sick Leave' && $days > 1;
        $proofPath = null;
        $overlap = getDB()->prepare('SELECT id FROM leave_requests WHERE user_id=? AND status IN ("pending","approved") AND date_from <= ? AND date_to >= ? LIMIT 1');
        if ($isPaternity) {
            foreach ($paternityDates as $paternityDate) { $overlap->execute([$user['id'],$paternityDate,$paternityDate]); if ($overlap->fetch()) jsonError('A selected paternity date overlaps another pending or approved leave request.'); }
        } else {
            $overlap->execute([$user['id'], $dateTo, $dateFrom]);
            if ($overlap->fetch()) jsonError('You already have a pending or approved leave request overlapping these dates.');
        }
        $hasUpload = isset($_FILES['proof']) && $_FILES['proof']['error'] !== UPLOAD_ERR_NO_FILE;
        if ($hasUpload && $_FILES['proof']['error'] !== UPLOAD_ERR_OK) jsonError('Proof file upload failed or exceeded the server limit.');
        if ($hasUpload) {
            $file = $_FILES['proof'];
            if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > 4 * 1024 * 1024) jsonError('Proof image must be 4 MB or smaller.');
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
            $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
            if ($leaveType === 'Sick Leave') $extensions['application/pdf'] = 'pdf';
            if (!isset($extensions[$mime])) jsonError($leaveType === 'Sick Leave' ? 'Medical certificate must be a JPG, PNG, WebP, or PDF file.' : 'Proof must be a JPG, PNG, or WebP image.');
            $proofDir = __DIR__ . '/../uploads/leave-proofs';
            if (!is_dir($proofDir) && !mkdir($proofDir, 0750, true)) jsonError('Could not save proof image.');
            $proofName = bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
            if (!move_uploaded_file($file['tmp_name'], $proofDir . '/' . $proofName)) jsonError('Could not save proof image.');
            $proofPath = 'uploads/leave-proofs/' . $proofName;
        }
        if ($leaveType === 'Emergency Leave' && $reason === '') jsonError('Emergency leave requires a written explanation.');
        if ($leaveType === 'Emergency Leave' && !$proofPath) jsonError('Emergency leave requires a proof image.');
        if ($needsMedicalCertificate && !$proofPath) jsonError('Sick leave longer than one day requires a medical certificate.');

        // Private supporting documents for statutory leave. File type is checked from
        // its content, and files are served only through the permission checked endpoint.
        $documents = [];
        if ($isMaternity) {
            $documents = $contingency === 'live_birth'
                ? ['pregnancyProof'=>'pregnancy_proof', 'mat1'=>'mat1']
                : ['maternityEventProof'=>'contingency_proof'];
            if ($soloParent) $documents['soloParentId'] = 'solo_parent_id';
            if ($allocatedDays > 0) $documents['allocationNotice'] = 'allocation_notice';
        } elseif ($isPaternity) {
            $documents = ['eventProof'=>'event_proof'];
            $prior = getDB()->prepare('SELECT id FROM leave_requests WHERE user_id=? AND leave_type="Paternity Leave" AND status="approved" LIMIT 1');
            $prior->execute([$user['id']]);
            if (!$prior->fetch()) $documents['marriageCertificate'] = 'marriage_certificate';
        }
        $documentPaths = [];
        foreach ($documents as $field => $documentType) {
            if (!isset($_FILES[$field]) || $_FILES[$field]['error'] === UPLOAD_ERR_NO_FILE) jsonError("Required document missing: $documentType.");
            $file = $_FILES[$field];
            if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > 5 * 1024 * 1024) jsonError('Each supporting document must be 5 MB or smaller.');
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
            $extensions = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','application/pdf'=>'pdf'];
            if (!isset($extensions[$mime])) jsonError('Supporting documents must be JPG, PNG, WebP, or PDF.');
            $proofDir = __DIR__ . '/../uploads/leave-proofs';
            if (!is_dir($proofDir) && !mkdir($proofDir, 0750, true)) jsonError('Could not create private document storage.');
            $name = bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
            if (!move_uploaded_file($file['tmp_name'], $proofDir . '/' . $name)) jsonError('Could not save a supporting document.');
            $documentPaths[$documentType] = 'uploads/leave-proofs/' . $name;
        }

        $db = getDB();
        $noticeDate = null;
        if ($isStatutoryLeave && $expectedDeliveryDate) {
            $noticeSt = $db->prepare('SELECT DATE(MAX(created_at)) FROM leave_notifications WHERE user_id=? AND notification_type=? AND expected_delivery_date=?');
            $noticeSt->execute([$user['id'],$isMaternity?'maternity':'paternity',$expectedDeliveryDate]);
            $noticeDate = $noticeSt->fetchColumn() ?: null;
        }
        $db->beginTransaction();
        try {
            $db->prepare('INSERT INTO leave_requests (user_id,leave_type,date_from,date_to,days,reason,proof_path,expected_delivery_date,contingency_type,solo_parent,allocated_leave_days,allocation_recipient_name,allocation_relationship,allocation_employer,unpaid_extension,notification_date,sss_recorded_months,paternity_delivery_number,paternity_actual_date,paternity_schedule_option,paternity_dates_json,maternity_paid_days) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([$user['id'],$leaveType,$dateFrom,$dateTo,$days,$reason,$proofPath,$expectedDeliveryDate,$isStatutoryLeave?$contingency:null,(int)$soloParent,$allocatedDays,$isMaternity?($body['allocationRecipientName']??null):null,$isMaternity?($body['allocationRelationship']??null):null,$isMaternity?($body['allocationEmployer']??null):null,(int)$unpaidExtension,$noticeDate,$sssRecordedMonths,$paternityNumber,$paternityActualDate,$paternitySchedule,$paternityDatesJson,$maternityPaidDays]);
            $id = (int)$db->lastInsertId();
            foreach ($documentPaths as $documentType => $path) $db->prepare('INSERT INTO leave_request_attachments (leave_request_id,document_type,file_path) VALUES (?,?,?)')->execute([$id,$documentType,$path]);
            $db->commit();
        } catch (Throwable $e) { $db->rollBack(); error_log('Leave request save failed: '.$e->getMessage()); jsonError('Could not save leave request.', 500); }
        auditLog($user['id'], 'request_leave', 'leave', "Submitted $leaveType request for $dateFrom to $dateTo");
        jsonOk(['id' => $id], 'Leave request submitted');
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=approve&id=X  (manager/chairman)
    // --------------------------------------------------------
    case 'approve': {
        $user = requirePermission('approveLeave');
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Request ID required.');

        $db = getDB();
        $st = $db->prepare('SELECT id,status,user_id,leave_type,date_from,date_to,contingency_type,paternity_actual_date,paternity_dates_json FROM leave_requests WHERE id=? LIMIT 1');
        $st->execute([$id]);
        $req = $st->fetch();
        if (!$req) jsonError('Leave request not found.', 404);
        if ($req['status'] !== 'pending') jsonError('Request is already ' . $req['status'] . '.');
        enforceLeaveReviewer($db, (int)$req['user_id'], $user);

        if ($req['leave_type'] === 'Paternity Leave') {
            $dates = json_decode($req['paternity_dates_json'] ?: '[]', true) ?: [];
            $hasPreEventDates = false;
            foreach ($dates as $leaveDate) if ($req['paternity_actual_date'] && $leaveDate <= $req['paternity_actual_date']) $hasPreEventDates = true;
            if ($hasPreEventDates && empty($body['allowBeforeEvent'])) jsonError('This request includes leave before or on the birth or miscarriage date. Confirm that the employer permits these dates before approving.');
            if ($hasPreEventDates && trim($body['remarks'] ?? '') === '') jsonError('Add a brief approval note explaining the employer-approved dates before or on the event date.');
        }

        $paidAmount = null;
        if (str_starts_with($req['leave_type'], 'Maternity Leave')) {
            $paidAmount = filter_var($body['paidAmount'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($paidAmount === false || $paidAmount < 0 || $paidAmount > 1000000) jsonError('Enter the confirmed maternity benefit/pay amount before approving.');
            $paidAmount = round($paidAmount, 2);
        }
        $db->prepare('UPDATE leave_requests SET status="approved", paid_amount=?, reviewed_by=?, reviewed_at=NOW(), remarks=? WHERE id=?')
           ->execute([$paidAmount, $user['id'], $body['remarks'] ?? null, $id]);

        notifyUser($req['user_id'], 'leave_approved', 'Leave Request Approved',
            "Your {$req['leave_type']} request ({$req['date_from']} to {$req['date_to']}) was approved.", 'request-leave');

        auditLog($user['id'], 'approve_leave', 'leave', "Approved leave request id=$id");
        jsonOk([], 'Leave request approved');
        break;
    }

    // --------------------------------------------------------
    //  PUT ?action=decline&id=X  (manager/chairman)
    // --------------------------------------------------------
    case 'decline': {
        $user = requirePermission('approveLeave');
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) jsonError('Request ID required.');

        $db = getDB();
        $st = $db->prepare('SELECT id,status,user_id,leave_type,date_from,date_to FROM leave_requests WHERE id=? LIMIT 1');
        $st->execute([$id]);
        $req = $st->fetch();
        if (!$req) jsonError('Leave request not found.', 404);
        if ($req['status'] !== 'pending') jsonError('Request is already ' . $req['status'] . '.');
        enforceLeaveReviewer($db, (int)$req['user_id'], $user);

        $remarks = $body['remarks'] ?? 'Declined';
        $db->prepare('UPDATE leave_requests SET status="declined", reviewed_by=?, reviewed_at=NOW(), remarks=? WHERE id=?')
           ->execute([$user['id'], $remarks, $id]);

        notifyUser($req['user_id'], 'leave_declined', 'Leave Request Declined',
            "Your {$req['leave_type']} request ({$req['date_from']} to {$req['date_to']}) was declined: $remarks", 'request-leave');

        auditLog($user['id'], 'decline_leave', 'leave', "Declined leave request id=$id");
        jsonOk([], 'Leave request declined');
        break;
    }

    // --------------------------------------------------------
    //  GET ?action=approved-days  (manager) — dates covered by
    //  approved leave, used to mark "On Leave" in the DTR
    //  Params: month (YYYY-MM), userId (optional)
    // --------------------------------------------------------
    case 'approved-days': {
        $user = requirePermission('qrManage');
        $db   = getDB();

        $where  = ['lr.status = "approved"'];
        $params = [];

        if (!empty($_GET['month'])) {
            $monthStart = $_GET['month'] . '-01';
            $where[]  = 'lr.date_from <= LAST_DAY(?)';
            $params[] = $monthStart;
            $where[]  = 'lr.date_to >= ?';
            $params[] = $monthStart;
        }
        if (!empty($_GET['userId'])) {
            $where[]  = 'lr.user_id = ?';
            $params[] = (int)$_GET['userId'];
        }

        $st = $db->prepare('SELECT lr.user_id,lr.date_from,lr.date_to,lr.leave_type,lr.paternity_dates_json,u.full_name FROM leave_requests lr JOIN users u ON lr.user_id=u.id WHERE ' . implode(' AND ', $where));
        $st->execute($params);
        $leaves = [];
        foreach ($st->fetchAll() as $leave) {
            $specificDates = $leave['leave_type'] === 'Paternity Leave' ? json_decode($leave['paternity_dates_json'] ?? '[]', true) : null;
            if (is_array($specificDates) && $specificDates) {
                foreach ($specificDates as $day) {
                    if (empty($_GET['month']) || str_starts_with($day, $_GET['month'])) $leaves[] = ['user_id'=>$leave['user_id'],'date_from'=>$day,'date_to'=>$day,'full_name'=>$leave['full_name']];
                }
            } else $leaves[] = ['user_id'=>$leave['user_id'],'date_from'=>$leave['date_from'],'date_to'=>$leave['date_to'],'full_name'=>$leave['full_name']];
        }
        jsonOk(['leaves' => $leaves]);
        break;
    }

    // --------------------------------------------------------
    //  DELETE ?action=clear-all  (manager only) — testing utility
    // --------------------------------------------------------
    case 'clear-all': {
        $user = requirePermission('qrManage');
        $db   = getDB();
        $db->exec('DELETE FROM leave_requests');
        auditLog($user['id'], 'clear_leave_requests', 'leave', 'All leave requests cleared');
        jsonOk([], 'All leave records cleared');
        break;
    }

    default:
        jsonError('Unknown action', 404);
}
