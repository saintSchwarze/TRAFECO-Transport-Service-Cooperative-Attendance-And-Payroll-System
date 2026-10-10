async function loadRequestLeave(c) {
    const localToday = new Date();
    const today = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
    const profileResult = await apiCall(`${API.EMP}?action=get&id=${Number(currentUser?.id || 0)}`);
    const profile = profileResult.success ? profileResult.employee : {};
    const mineResult = await apiCall(`${API.LEAVE}?action=list`);
    const usedDeliveryNumbers = new Set((mineResult.requests || []).filter(r => ['pending','approved'].includes(r.status) && r.paternity_delivery_number).map(r => Number(r.paternity_delivery_number)));
    const gender = String(profile.gender || '').toLowerCase();
    const canMaternity = gender === 'female';
    const hasPayRate = profile.employment_type === 'Full-time' ? Number(profile.basic_salary) > 0 : Number(profile.hourly_rate) > 0;
    const canPaternity = gender === 'male' && profile.marital_status === 'married' && Number(profile.cohabiting_with_spouse) === 1 && hasPayRate && usedDeliveryNumbers.size < 4;
    const maternityOptions = canMaternity ? '<option>Maternity Leave - Childbirth</option><option>Maternity Leave - Miscarriage/ETP</option>' : '';
    const paternityOption = gender === 'male' ? `<option value="Paternity Leave" ${canPaternity ? '' : 'disabled'}>${canPaternity ? 'Paternity Leave' : `Paternity Leave — Locked (${!hasPayRate ? 'pay rate missing' : profile.marital_status !== 'married' ? 'not recorded as married' : Number(profile.cohabiting_with_spouse) !== 1 ? 'not recorded as living with spouse' : 'four deliveries already recorded'})`}</option>` : '';
    const noticeOptions = `${canMaternity ? '<option value="maternity">Maternity</option>' : ''}${gender === 'male' ? '<option value="paternity">Paternity</option>' : ''}`;
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-calendar-plus"></i>Request Leave</div></div>
        <div style="padding:1.4rem;">
        <div id="leaveReqMsg" class="message" style="display:none;"></div>
        <details style="margin-bottom:1rem;${noticeOptions ? '' : 'display:none;'}"><summary>Record pregnancy notification</summary><form id="pregnancyNoticeForm" onsubmit="submitPregnancyNotice(event)" style="padding:1rem;border:1px solid var(--border);margin-top:.5rem;border-radius:8px;">
            <div class="form-row"><div class="form-col"><label>Notice type</label><select class="form-control" name="notificationType" id="noticeType">${noticeOptions}</select></div><div class="form-col"><label>Expected delivery date</label><input class="form-control" name="expectedDeliveryDate" type="date" required></div><div class="form-col" id="noticeSpouseWrap" style="display:none"><label>Spouse name</label><input class="form-control" name="spouseName" maxlength="150"></div></div>
            <div class="form-group"><label>Note (optional)</label><textarea class="form-control" name="notificationText" rows="2" maxlength="2000"></textarea></div><button class="btn" type="submit">Record notification</button><small style="display:block;margin-top:.5rem">Recording here does not submit a notice to SSS or the employer’s external portal. Follow the official process promptly.</small>
        </form></details>
        <form id="leaveRequestForm" onsubmit="submitLeaveRequest(event)" style="margin-bottom:2rem;">
            <div class="form-row">
                <div class="form-col"><div class="form-group"><label>Leave Type</label><select class="form-control" name="leaveType" id="leaveTypeSelect"><option>Vacation Leave</option><option>Sick Leave</option><option>Emergency Leave</option>${maternityOptions}${paternityOption}</select></div></div>
                <div class="form-col"><div class="form-group"><label>Date From</label><input type="date" class="form-control" name="dateFrom" min="${today}" required></div></div>
                <div class="form-col"><div class="form-group"><label>Date To</label><input type="date" class="form-control" name="dateTo" min="${today}" required></div></div>
            </div>
            <div id="maternityFields" style="display:none;border:1px solid var(--border);padding:1rem;margin-bottom:1rem;border-radius:8px;">
                <h4>Maternity details</h4>
                <div class="form-row">
                    <div class="form-col"><label>Expected date of delivery</label><input class="form-control" type="date" name="expectedDeliveryDate" id="maternityEdd"></div>
                    <div class="form-col"><label>Contingency</label><select class="form-control" name="contingencyType" id="maternityContingency"><option value="live_birth">Live birth (105 days)</option><option value="miscarriage_etp">Miscarriage / emergency termination (60 days)</option></select></div>
                </div>
                <div class="form-row"><div class="form-col"><label>SSS number</label><input class="form-control" name="sssNumber" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" placeholder="10 digits"></div><div class="form-col"><label>Actual event date (if already occurred)</label><input class="form-control" type="date" name="maternityActualEventDate"></div></div>
                <label><input type="checkbox" name="soloParent" id="soloParent" value="1"> Qualified solo parent (+15 days; upload ID)</label><br>
                <label><input type="checkbox" name="unpaidExtension" id="unpaidExtension" value="1"> Add optional 30-day unpaid extension</label>
                <div class="form-row" style="margin-top:.8rem"><div class="form-col"><label>Allocate 1–7 days to caregiver</label><input class="form-control" type="number" name="allocatedLeaveDays" id="allocatedDays" min="0" max="7" value="0"></div><div class="form-col"><label>Recipient name</label><input class="form-control" name="allocationRecipientName" id="allocationName" maxlength="150"></div></div>
                <div class="form-row"><div class="form-col"><label>Relationship</label><input class="form-control" name="allocationRelationship" id="allocationRelationship" maxlength="100"></div><div class="form-col"><label>Recipient employer</label><input class="form-control" name="allocationEmployer" id="allocationEmployer" maxlength="150"></div></div>
                <div class="form-row"><div class="form-col"><label>Pregnancy proof (required)</label><input class="form-control" type="file" name="pregnancyProof" accept="image/jpeg,image/png,image/webp,application/pdf"></div><div class="form-col"><label>SSS maternity notification copy (MAT-1, required)</label><input class="form-control" type="file" name="mat1" accept="image/jpeg,image/png,image/webp,application/pdf"></div></div>
                <div class="form-group" id="maternityEventProofWrap" style="display:none"><label>Medical proof of miscarriage / emergency termination (required)</label><input class="form-control" type="file" name="maternityEventProof" id="maternityEventProof" accept="image/jpeg,image/png,image/webp,application/pdf"></div>
                <div class="form-row"><div class="form-col"><label>Solo Parent ID (if applicable)</label><input class="form-control" type="file" name="soloParentId" id="soloParentId" accept="image/jpeg,image/png,image/webp,application/pdf"></div><div class="form-col"><label>Signed allocation notice (if allocating days)</label><input class="form-control" type="file" name="allocationNotice" id="allocationNotice" accept="image/jpeg,image/png,image/webp,application/pdf"></div></div>
                <small>Record notification promptly. This system does not submit MAT-1 or verify SSS contribution remittances.</small>
            </div>
            <div id="paternityFields" style="display:none;border:1px solid var(--border);padding:1rem;margin-bottom:1rem;border-radius:8px;">
                <h4>Paternity details</h4>
                <div class="form-row"><div class="form-col"><label>Delivery number (first four)</label><select class="form-control" name="deliveryNumber"><option value="">Select</option><option>1</option><option>2</option><option>3</option><option>4</option></select></div><div class="form-col"><label>Contingency</label><select class="form-control" name="contingencyType"><option value="live_birth">Live birth</option><option value="miscarriage_etp">Miscarriage / pregnancy loss</option></select></div><div class="form-col"><label>Expected delivery date</label><input class="form-control" type="date" name="expectedDeliveryDate"></div><div class="form-col"><label>Actual event date (if known)</label><input class="form-control" type="date" name="actualEventDate"></div></div>
                <label>Schedule</label><select class="form-control" name="scheduleOption" id="paternitySchedule"><option value="consecutive">Seven consecutive days</option><option value="intermittent">Intermittent dates</option></select>
                <label>Select seven dates</label><div class="form-row" id="paternityDateInputs">${Array.from({length:7},(_,i)=>`<div class="form-col"><input class="form-control paternity-date" type="date" aria-label="Paternity leave date ${i+1}"></div>`).join('')}</div><input type="hidden" name="paternityDates" id="paternityDatesValue">
                <div class="form-row"><div class="form-col"><label>Marriage certificate (first request)</label><input class="form-control" type="file" name="marriageCertificate" accept="image/jpeg,image/png,image/webp,application/pdf"></div><div class="form-col"><label>Birth / contingency proof (required)</label><input class="form-control" type="file" name="eventProof" accept="image/jpeg,image/png,image/webp,application/pdf"></div></div>
                <small>Pregnancy notification should be recorded as soon as practicable. No fixed 30-day filing gate is applied.</small>
            </div>
            <div id="leavePolicyHint" class="alert alert-info" style="margin-bottom:1rem;"></div>
            <div class="form-group"><label id="leaveReasonLabel">Reason (optional)</label><textarea class="form-control" name="reason" rows="3" maxlength="2000"></textarea></div>
            <div class="form-group" id="leaveProofWrap" style="display:none;"><label id="leaveProofLabel">Proof file</label><input type="file" class="form-control" name="proof" id="leaveProofInput" accept="image/jpeg,image/png,image/webp,application/pdf"><small id="leaveProofHelp">JPG, PNG, WebP, or PDF; maximum 4 MB.</small></div>
            <button type="submit" class="btn">Submit Request</button>
        </form>
        <div style="font-size:1rem;font-weight:700;color:var(--green-800);margin-bottom:1rem;">My Leave Requests</div>
        <div class="table-container"><table><thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Remarks</th></tr></thead><tbody id="myLeaveBody"><tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="myLeavePager"></div>
        </div></div>`;
    const dateFromInput = c.querySelector('[name="dateFrom"]');
    const dateToInput = c.querySelector('[name="dateTo"]');
    const typeSelect = c.querySelector('#leaveTypeSelect');
    const hint = c.querySelector('#leavePolicyHint');
    const reasonLabel = c.querySelector('#leaveReasonLabel');
    const proofWrap = c.querySelector('#leaveProofWrap');
    const proofInput = c.querySelector('#leaveProofInput');
    const proofLabel = c.querySelector('#leaveProofLabel');
    const proofHelp = c.querySelector('#leaveProofHelp');
    const reasonInput = c.querySelector('[name="reason"]');
    const maternityFields = c.querySelector('#maternityFields');
    const paternityFields = c.querySelector('#paternityFields');
    const noticeType = c.querySelector('#noticeType');
    const updateNoticeType = () => { if (!noticeType) return; const isPaternity = noticeType.value === 'paternity'; c.querySelector('#noticeSpouseWrap').style.display = isPaternity ? 'block' : 'none'; c.querySelector('[name="spouseName"]').required = isPaternity; };
    noticeType?.addEventListener('change', updateNoticeType); updateNoticeType();
    const dateFrom = c.querySelector('[name="dateFrom"]');
    const dateTo = c.querySelector('[name="dateTo"]');
    const vacationMinDate = new Date(localToday);
    vacationMinDate.setDate(vacationMinDate.getDate() + 7);
    const vacationMin = `${vacationMinDate.getFullYear()}-${String(vacationMinDate.getMonth() + 1).padStart(2, '0')}-${String(vacationMinDate.getDate()).padStart(2, '0')}`;
    const updateLeavePolicy = () => {
        const t = typeSelect.value;
        const hints = {
            'Vacation Leave': 'Submit at least 7 days before leave. Up to 5 scheduled workdays are paid; additional days are unpaid.',
            'Sick Leave': 'A one-day sick leave is unpaid and needs no certificate. For a request longer than one day, upload a medical certificate; up to 5 scheduled workdays are paid, and any additional days are unpaid.',
            'Emergency Leave': 'One day only and unpaid. Enter a written explanation and attach a proof image.',
            'Maternity Leave - Childbirth': '105 days paid leave; eligible solo parents receive 15 additional days. Optional 30-day extension is unpaid. The manager records the confirmed payable benefit; no money is transferred by this app.',
            'Maternity Leave - Miscarriage/ETP': '60 days. Notification should be submitted promptly; no fixed 60-day advance filing deadline is imposed here.',
            'Paternity Leave': 'Up to 7 paid days for an eligible employee, limited to the first four deliveries. Marriage, cohabitation and evidence are checked.'
        };
        hint.textContent = hints[t] || '';
        const isMaternity = t.startsWith('Maternity Leave');
        const isPaternity = t === 'Paternity Leave';
        maternityFields.style.display = isMaternity ? 'block' : 'none';
        paternityFields.style.display = isPaternity ? 'block' : 'none';
        maternityFields.querySelectorAll('input,select').forEach(x => x.disabled = !isMaternity);
        paternityFields.querySelectorAll('input,select').forEach(x => x.disabled = !isPaternity);
        if (t === 'Vacation Leave') { dateFrom.min = vacationMin; dateFrom.max = ''; dateFrom.readOnly = false; }
        else if (isMaternity || isPaternity) { dateFrom.min = ''; dateFrom.max = ''; dateFrom.readOnly = false; }
        else { dateFrom.min = today; dateFrom.max = ''; dateFrom.readOnly = false; }
        const isEmergency = t === 'Emergency Leave';
        const isSickCertificate = t === 'Sick Leave' && dateFrom.value && dateTo.value && dateTo.value > dateFrom.value;
        proofWrap.style.display = isEmergency || isSickCertificate ? 'block' : 'none';
        proofInput.required = isEmergency || isSickCertificate;
        reasonInput.required = isEmergency;
        proofInput.accept = isEmergency ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf';
        proofLabel.textContent = isEmergency ? 'Proof image (required)' : 'Medical certificate (required for more than 1 day)';
        proofHelp.textContent = isEmergency ? 'JPG, PNG, or WebP; maximum 4 MB.' : 'JPG, PNG, WebP, or PDF; maximum 4 MB.';
        reasonLabel.textContent = isEmergency ? 'Written explanation (required)' : 'Reason (optional)';
        if (isMaternity) {
            c.querySelector('#maternityEdd').required = true;
            c.querySelector('[name="sssNumber"]').required = true;
            const contingency = c.querySelector('#maternityContingency').value;
            const isLoss = contingency === 'miscarriage_etp';
            c.querySelector('#maternityEventProofWrap').style.display = isLoss ? 'block' : 'none';
            c.querySelector('#maternityEventProof').required = isLoss;
            const paid = (contingency === 'live_birth' ? 105 : 60) + (contingency === 'live_birth' && c.querySelector('#soloParent').checked ? 15 : 0) - Math.min(7, Number(c.querySelector('#allocatedDays').value || 0));
            const total = paid + (c.querySelector('#unpaidExtension').checked ? 30 : 0);
            if (dateFrom.value) { const end = new Date(`${dateFrom.value}T12:00:00`); end.setDate(end.getDate()+total-1); dateTo.value = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`; }
            dateTo.readOnly = true;
            c.querySelector('#soloParentId').required = c.querySelector('#soloParent').checked;
            c.querySelector('#allocationNotice').required = Number(c.querySelector('#allocatedDays').value || 0) > 0;
            c.querySelector('#allocationName').required = c.querySelector('#allocationRelationship').required = c.querySelector('#allocationEmployer').required = Number(c.querySelector('#allocatedDays').value || 0) > 0;
        } else if (isPaternity) {
            const dates = [...c.querySelectorAll('.paternity-date')].map(x=>x.value).filter(Boolean).sort();
            c.querySelector('#paternityDatesValue').value = dates.join(',');
            if (dates.length) { dateFrom.value=dates[0]; dateTo.value=dates[dates.length-1]; }
            dateFrom.readOnly = dateTo.readOnly = true;
            paternityFields.querySelector('[name="expectedDeliveryDate"]').required = true;
            c.querySelector('[name="deliveryNumber"]').required = true;
            c.querySelectorAll('.paternity-date').forEach(input => input.required = true);
            c.querySelector('[name="marriageCertificate"]').required = false;
            c.querySelector('[name="eventProof"]').required = true;
        } else { dateTo.readOnly = false; }
        if (isEmergency) {
            dateFrom.value = today; dateFrom.min = today; dateFrom.max = today; dateFrom.readOnly = true;
            dateTo.value = today; dateTo.min = today; dateTo.max = today; dateTo.readOnly = true;
        } else if (isMaternity || isPaternity) dateTo.readOnly = true;
        else { dateFrom.readOnly = false; dateTo.readOnly = false; dateTo.max = ''; }
    };
    typeSelect?.addEventListener('change', updateLeavePolicy);
    ['#maternityContingency','#soloParent','#unpaidExtension','#allocatedDays','#maternityEdd'].forEach(sel=>c.querySelector(sel)?.addEventListener('change',updateLeavePolicy));
    c.querySelectorAll('.paternity-date').forEach(input=>input.addEventListener('change',updateLeavePolicy));
    updateLeavePolicy();
    c.querySelector('#leaveRequestForm')?.addEventListener('reset', () => setTimeout(updateLeavePolicy, 0));
    dateFromInput?.addEventListener('change', () => {
        if (dateToInput) {
            dateToInput.min = dateFromInput.value || today;
            if (typeSelect.value === 'Emergency Leave') dateToInput.value = dateFromInput.value;
        }
        updateLeavePolicy();
    });
    dateToInput?.addEventListener('change', updateLeavePolicy);
    await loadMyLeaveRequests();
}

async function loadMyLeaveRequests() {
    const tbody = document.getElementById('myLeaveBody');
    if (!tbody) return;
    const data = await apiCall(`${API.LEAVE}?action=list`);
    if (!data.success || !data.requests.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No leave requests yet.</td></tr>';
        document.getElementById('myLeavePager').innerHTML = '';
        return;
    }
    const rows = data.requests.map(r => {
        const sc = r.status === 'approved' ? 'status-approved' : r.status === 'declined' ? 'status-rejected' : 'status-pending';
        return `<tr>
            <td>${escapeHtml(r.leave_type)}</td>
            <td>${r.date_from}</td><td>${r.date_to}</td>
            <td>${Number(r.days || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
            <td><span class="status ${sc}">${r.status.charAt(0).toUpperCase()+r.status.slice(1)}</span></td>
            <td style="font-size:0.8rem;color:var(--text-light);">${escapeHtml(r.remarks||'—')}</td>
        </tr>`;
    });
    renderPaginated('myLeaveBody', 'myLeavePager', rows, 5);
}

async function submitLeaveRequest(e) {
    e.preventDefault();
    const dates = [...e.target.querySelectorAll('.paternity-date')].map(x => x.value).filter(Boolean).sort();
    const paternityDatesField = e.target.querySelector('#paternityDatesValue');
    if (paternityDatesField) paternityDatesField.value = dates.join(',');
    const formData = new FormData(e.target);
    const headers = {};
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    let result;
    try {
        const response = await fetch(`${API.LEAVE}?action=request`, { method: 'POST', headers, body: formData, credentials: 'same-origin' });
        result = await response.json();
    } catch (_) { result = { success: false, message: 'Network error. Please try again.' }; }
    if (result.success) {
        showMsg('leaveReqMsg', 'Leave request submitted successfully.', 'success');
        e.target.reset();
        await loadMyLeaveRequests();
    } else {
        showMsg('leaveReqMsg', result.message || 'Failed to submit request.', 'error');
    }
}

async function submitPregnancyNotice(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const result = await apiCall(`${API.LEAVE}?action=notify-pregnancy`, 'POST', data);
    if (result.success) { showToast('Pregnancy notification recorded. Please complete any required official submission.', 'success'); e.target.reset(); }
    else showToast(result.message || 'Could not record notification.', 'error');
}

async function loadApproveLeave(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-calendar-check"></i>Approve Leave</div></div>
        <div style="padding:1.4rem;">
        <div class="table-container"><table><thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Proof</th><th>Actions</th></tr></thead><tbody id="pendingLeaveBody"><tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="pendingLeavePager"></div>
        </div></div>`;
    const data = await apiCall(`${API.LEAVE}?action=pending`);
    const tbody = document.getElementById('pendingLeaveBody');
    if (!data.success || !data.requests.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">No pending leave requests.</td></tr>';
        document.getElementById('pendingLeavePager').innerHTML = '';
        return;
    }
    window.pendingLeaveRequestsById = Object.fromEntries(data.requests.map(r => [r.id, r]));
    const rows = data.requests.map(r => {
        let maternityDue = '';
        if (r.leave_type?.startsWith('Maternity Leave') && r.created_at) {
            const due = new Date(`${String(r.created_at).slice(0,10)}T12:00:00`);
            due.setDate(due.getDate() + 30);
            maternityDue = `${due.getFullYear()}-${String(due.getMonth()+1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}`;
        }
        let paternityDateList = '';
        try { paternityDateList = JSON.parse(r.paternity_dates_json || '[]').join(', '); } catch (_) {}
        return `<tr>
        <td><strong>${escapeHtml(r.employee_name)}</strong><br><small>${escapeHtml(r.department||'')}</small></td>
        <td>${escapeHtml(r.leave_type)}</td>
        <td>${r.date_from}</td>
        <td>${r.date_to}</td>
        <td>${Number(r.days || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
        <td style="max-width:240px;font-size:0.85rem;">${escapeHtml(r.reason || '—')}${r.expected_delivery_date ? `<br><small>EDD: ${escapeHtml(r.expected_delivery_date)} · ${escapeHtml(r.contingency_type||'')}</small>` : ''}${maternityDue ? `<br><small>30-day advance processing reminder: ${maternityDue}</small>` : ''}${r.pregnancy_notice_recorded_at ? `<br><small>Notice recorded: ${escapeHtml(r.pregnancy_notice_recorded_at)}</small>` : ''}${r.solo_parent ? '<br><small>Solo parent</small>' : ''}${Number(r.allocated_leave_days||0) ? `<br><small>Allocated: ${Number(r.allocated_leave_days)} days</small>` : ''}${r.sss_recorded_months !== null && r.sss_recorded_months !== undefined ? `<br><small>Payroll records show SSS deductions in ${Number(r.sss_recorded_months)}/12 months; verify actual remittances in SSS.</small>` : ''}${r.paternity_delivery_number ? `<br><small>Delivery ${Number(r.paternity_delivery_number)} · ${escapeHtml(r.paternity_schedule_option||'')} · ${escapeHtml(paternityDateList)}</small>` : ''}</td>
        <td>${[...(r.proof_path ? [`<a href="${API.LEAVE}?action=proof&id=${Number(r.id)}" target="_blank" rel="noopener">Proof</a>`] : []), ...(r.documents||[]).map(d=>`<a style="display:block" href="${API.LEAVE}?action=document&id=${Number(d.id)}" target="_blank" rel="noopener">${escapeHtml(d.document_type.replaceAll('_',' '))}</a>`)].join('') || '—'}</td>
        <td>
            <button class="action-btn btn-sm" style="background:var(--success);" onclick="approveLeave(${r.id})"><i class="fas fa-check"></i> Approve</button>
            <button class="action-btn danger btn-sm" onclick="declineLeave(${r.id})"><i class="fas fa-times"></i> Decline</button>
        </td>
    </tr>`;
    });
    renderPaginated('pendingLeaveBody', 'pendingLeavePager', rows, 5);
}

async function approveLeave(id) {
    const request = window.pendingLeaveRequestsById?.[id];
    let payload = {};
    if (request?.leave_type?.startsWith('Maternity Leave')) {
        const amountText = prompt('For the payroll record, enter the confirmed total maternity benefit/pay amount (PHP) after verifying SSS eligibility and any employer salary differential. This records a calculation only; payment is handled offline. Enter 0 if none is payable.');
        if (amountText === null) return;
        const amount = Number(amountText);
        if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) { showToast('Enter a valid amount from PHP 0 to PHP 1,000,000.', 'error'); return; }
        payload.paidAmount = amount;
    }
    const data = await apiCall(`${API.LEAVE}?action=approve&id=${id}`, 'PUT', payload);
    if (data.success) { showToast('Leave request approved.'); loadPageContent('approve-leave'); }
    else showToast(data.message, 'error');
}

async function declineLeave(id) {
    const confirmResult = await showAppConfirm({
        title: 'Decline Leave Request',
        message: 'Decline this leave request?',
        confirmLabel: 'Decline',
        danger: true,
        needsRemarks: true,
        remarksLabel: 'Reason (optional)',
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.LEAVE}?action=decline&id=${id}`, 'PUT', { remarks: confirmResult.remarks });
    if (data.success) { showToast('Leave request declined.'); loadPageContent('approve-leave'); }
    else showToast(data.message, 'error');
}
