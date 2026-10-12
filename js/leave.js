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
            <div class="form-row"><div class="form-col"><label>Notice type</label><select class="form-control" name="notificationType" id="noticeType">${noticeOptions}</select></div><div class="form-col"><label>Expected delivery date</label><input class="form-control" name="expectedDeliveryDate" id="noticeEdd" type="date" required><small id="noticeEddHelp">Enter the original estimated due date. If the event has already happened, enter its actual date separately in the leave request. This form records when you submit the notice.</small></div><div class="form-col" id="noticeSpouseWrap" style="display:none"><label>Spouse name</label><input class="form-control" name="spouseName" maxlength="150"></div></div>
            <div class="form-group"><label>Note (optional)</label><textarea class="form-control" name="notificationText" rows="2" maxlength="2000"></textarea></div><button class="btn" type="submit">Record notification</button><small style="display:block;margin-top:.5rem">Recording here does not submit a notice to SSS or the employer’s external portal. Follow the official process promptly.</small>
        </form></details>
        <details id="myPregnancyNotifications" style="margin-bottom:1rem;${noticeOptions ? '' : 'display:none;'}"><summary>My recorded notifications</summary><div class="table-container" style="margin-top:.5rem;"><table><thead><tr><th>Type</th><th>Expected date</th><th>Spouse</th><th>Recorded</th><th>Note</th></tr></thead><tbody id="myPregnancyNoticeBody"><tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div></details>
        <form id="leaveRequestForm" onsubmit="submitLeaveRequest(event)" style="margin-bottom:2rem;">
            <div class="form-row">
                <div class="form-col"><div class="form-group"><label>Leave Type</label><select class="form-control" name="leaveType" id="leaveTypeSelect"><option>Vacation Leave</option><option>Sick Leave</option><option>Emergency Leave</option>${maternityOptions}${paternityOption}</select></div></div>
                <div class="form-col"><div class="form-group"><label>Date From</label><input type="date" class="form-control" name="dateFrom" min="${today}" required></div></div>
                <div class="form-col"><div class="form-group"><label>Date To</label><input type="date" class="form-control" name="dateTo" min="${today}" required></div></div>
            </div>
            <div id="maternityFields" style="display:none;border:1px solid var(--border);padding:1rem;margin-bottom:1rem;border-radius:8px;">
                <h4>Maternity details</h4>
                <div class="form-row">
                    <div class="form-col" id="maternityEddWrap"><label>Expected date of delivery</label><input class="form-control" type="date" name="expectedDeliveryDate" id="maternityEdd"></div>
                    <div class="form-col"><label>Contingency</label><select class="form-control" name="contingencyType" id="maternityContingency"><option value="live_birth">Live birth (105 days)</option><option value="miscarriage_etp">Miscarriage / emergency termination (60 days)</option></select></div>
                </div>
                <div class="form-row"><div class="form-col"><label>SSS number</label><input class="form-control" name="sssNumber" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" placeholder="10 digits" value="${escapeHtml(profile.gov_sss || '')}" ${profile.gov_sss ? 'readonly' : ''}><small>${profile.gov_sss ? 'Filled from your employee profile. Update your profile if it is incorrect.' : 'Add your SSS number to your employee profile before submitting.'}</small></div><div class="form-col"><label>Actual event date (required for miscarriage / ETP; for retroactive childbirth)</label><input class="form-control" type="date" name="maternityActualEventDate" max="${today}"></div></div>
                <label id="soloParentOption"><input type="checkbox" name="soloParent" id="soloParent" value="1"> Qualified solo parent (+15 days; upload ID)</label><br>
                <label id="unpaidExtensionOption"><input type="checkbox" name="unpaidExtension" id="unpaidExtension" value="1"> Add optional 30-day unpaid extension</label>
                <div class="form-row" id="maternityAllocationFields" style="margin-top:.8rem"><div class="form-col"><label>Days to allocate (0 if none; maximum 7)</label><input class="form-control" type="number" name="allocatedLeaveDays" id="allocatedDays" min="0" max="7" value="0"></div><div class="form-col"><label>Recipient name (required if allocating)</label><input class="form-control" name="allocationRecipientName" id="allocationName" maxlength="150"></div></div>
                <div class="form-row" id="maternityAllocationDetails"><div class="form-col"><label>Relationship (required if allocating)</label><input class="form-control" name="allocationRelationship" id="allocationRelationship" maxlength="100"></div><div class="form-col"><label>Recipient employer (required if allocating)</label><input class="form-control" name="allocationEmployer" id="allocationEmployer" maxlength="150"></div></div>
                <div class="form-row" id="maternityPregnancyDocs"><div class="form-col"><label>Pregnancy proof (required for childbirth)</label><input class="form-control" type="file" name="pregnancyProof" accept="image/jpeg,image/png,image/webp,application/pdf"></div><div class="form-col"><label>SSS maternity notification copy (MAT-1, required for childbirth)</label><input class="form-control" type="file" name="mat1" accept="image/jpeg,image/png,image/webp,application/pdf"></div></div>
                <div class="form-group" id="maternityEventProofWrap" style="display:none"><label>Medical proof of miscarriage / emergency termination (required)</label><input class="form-control" type="file" name="maternityEventProof" id="maternityEventProof" accept="image/jpeg,image/png,image/webp,application/pdf"></div>
                <div class="form-row" id="maternityConditionalDocuments"><div class="form-col"><label>Solo Parent ID (required if selected)</label><input class="form-control" type="file" name="soloParentId" id="soloParentId" accept="image/jpeg,image/png,image/webp,application/pdf"></div><div class="form-col"><label>Signed allocation notice (required if allocating days)</label><input class="form-control" type="file" name="allocationNotice" id="allocationNotice" accept="image/jpeg,image/png,image/webp,application/pdf"></div></div>
                <small>Record notification promptly. This system does not submit MAT-1 or verify SSS contribution remittances.</small>
            </div>
            <div id="paternityFields" style="display:none;border:1px solid var(--border);padding:1rem;margin-bottom:1rem;border-radius:8px;">
                <h4>Paternity details</h4>
                <div class="form-row"><div class="form-col"><label>Delivery number (first four)</label><select class="form-control" name="deliveryNumber"><option value="">Select</option><option>1</option><option>2</option><option>3</option><option>4</option></select></div><div class="form-col"><label>Contingency</label><select class="form-control" name="contingencyType" id="paternityContingency"><option value="live_birth">Live birth</option><option value="miscarriage_etp">Miscarriage / pregnancy loss</option></select></div><div class="form-col" id="paternityEddWrap"><label>Expected delivery date (live birth)</label><input class="form-control" type="date" name="expectedDeliveryDate"></div><div class="form-col"><label>Actual event date (required)</label><input class="form-control" type="date" name="actualEventDate" max="${today}"></div></div>
                <label>Schedule</label><select class="form-control" name="scheduleOption" id="paternitySchedule"><option value="consecutive">Seven consecutive workdays</option><option value="intermittent">Intermittent workdays</option></select>
                <label>Select seven workdays (Monday–Friday)</label><div class="form-row" id="paternityDateInputs">${Array.from({length:7},(_,i)=>`<div class="form-col"><input class="form-control paternity-date" type="date" aria-label="Paternity leave workday ${i+1}"></div>`).join('')}</div><input type="hidden" name="paternityDates" id="paternityDatesValue">
                <div class="form-row"><div class="form-col"><label>Marriage certificate (first request)</label><input class="form-control" type="file" name="marriageCertificate" accept="image/jpeg,image/png,image/webp,application/pdf"></div><div class="form-col"><label>Birth / contingency proof (required)</label><input class="form-control" type="file" name="eventProof" accept="image/jpeg,image/png,image/webp,application/pdf"></div></div>
                <small>Normally, choose seven workdays after the birth or miscarriage. Dates before or on the event date need employer approval. Pregnancy notification is required for live birth; miscarriage can be reported after it happens.</small>
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
    const maternityContingency = c.querySelector('#maternityContingency');
    const noticeType = c.querySelector('#noticeType');
    const noticeEdd = c.querySelector('#noticeEdd');
    const noticeEddHelp = c.querySelector('#noticeEddHelp');
    const updateNoticeEddHelp = () => {
        if (!noticeEdd || !noticeEddHelp) return;
        noticeEddHelp.textContent = noticeEdd.value && noticeEdd.value < today
            ? 'This is a past expected date. The system records this as a notice submitted today; it does not backdate or send the notice to SSS. Enter the actual event date separately in the leave request.'
            : 'Enter the original estimated due date. If the event has already happened, enter its actual date separately in the leave request. This form records when you submit the notice.';
    };
    noticeEdd?.addEventListener('change', updateNoticeEddHelp);
    c.querySelector('#pregnancyNoticeForm')?.addEventListener('reset', () => setTimeout(updateNoticeEddHelp, 0));
    updateNoticeEddHelp();
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
            'Paternity Leave': 'Seven paid workdays for an eligible employee, limited to the first four deliveries. Normally schedule leave after the event. Dates before or on the event date require employer permission at approval.'
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
            const contingency = c.querySelector('#maternityContingency').value;
            const isLoss = contingency === 'miscarriage_etp';
            const maternityEddInput = c.querySelector('#maternityEdd');
            const pregnancyDocs = c.querySelector('#maternityPregnancyDocs');
            const pregnancyProof = c.querySelector('[name="pregnancyProof"]');
            const mat1 = c.querySelector('[name="mat1"]');
            c.querySelector('#maternityEddWrap').style.display = isLoss ? 'none' : '';
            maternityEddInput.disabled = isLoss;
            maternityEddInput.required = !isLoss;
            c.querySelector('[name="sssNumber"]').required = true;
            pregnancyDocs.style.display = isLoss ? 'none' : '';
            [pregnancyProof, mat1].forEach(input => {
                input.disabled = isLoss;
                input.required = !isLoss;
            });
            const maternityEventDate = c.querySelector('[name="maternityActualEventDate"]');
            maternityEddInput.min = !isLoss && !maternityEventDate.value ? today : '';
            maternityEventDate.required = isLoss;
            dateFrom.min = today;
            dateFrom.max = '';
            if (isLoss && maternityEventDate.value) {
                dateFrom.value = maternityEventDate.value;
                dateFrom.min = maternityEventDate.value;
                dateFrom.max = maternityEventDate.value;
                dateFrom.readOnly = true;
            } else if (isLoss) {
                dateFrom.readOnly = false;
            } else if (maternityEventDate.value) {
                const earliestRetroDate = new Date(`${maternityEventDate.value}T12:00:00`);
                earliestRetroDate.setDate(earliestRetroDate.getDate() - 45);
                dateFrom.min = `${earliestRetroDate.getFullYear()}-${String(earliestRetroDate.getMonth()+1).padStart(2,'0')}-${String(earliestRetroDate.getDate()).padStart(2,'0')}`;
                dateFrom.readOnly = false;
            } else dateFrom.readOnly = false;
            const childbirthOptions = ['#soloParentOption', '#unpaidExtensionOption', '#maternityAllocationFields', '#maternityAllocationDetails', '#maternityConditionalDocuments'];
            const hideChildbirthOptions = !isMaternity || isLoss;
            childbirthOptions.forEach(selector => {
                const section = c.querySelector(selector);
                if (!section) return;
                section.style.display = hideChildbirthOptions ? 'none' : '';
                section.querySelectorAll('input').forEach(input => input.disabled = hideChildbirthOptions);
            });
            c.querySelector('#maternityEventProofWrap').style.display = isLoss ? 'block' : 'none';
            c.querySelector('#maternityEventProof').required = isLoss;
            const allocated = contingency === 'live_birth' ? Math.min(7, Number(c.querySelector('#allocatedDays').value || 0)) : 0;
            const paid = (contingency === 'live_birth' ? 105 : 60) + (contingency === 'live_birth' && c.querySelector('#soloParent').checked ? 15 : 0) - allocated;
            const total = paid + (contingency === 'live_birth' && c.querySelector('#unpaidExtension').checked ? 30 : 0);
            if (dateFrom.value) { const end = new Date(`${dateFrom.value}T12:00:00`); end.setDate(end.getDate()+total-1); dateTo.value = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`; }
            dateTo.readOnly = true;
            const soloParentSelected = c.querySelector('#soloParent').checked && !hideChildbirthOptions;
            const allocationSelected = allocated > 0 && !hideChildbirthOptions;
            const soloParentId = c.querySelector('#soloParentId');
            const allocationNotice = c.querySelector('#allocationNotice');
            soloParentId.disabled = !soloParentSelected;
            soloParentId.required = soloParentSelected;
            allocationNotice.disabled = !allocationSelected;
            allocationNotice.required = allocationSelected;
            ['#allocationName', '#allocationRelationship', '#allocationEmployer'].forEach(selector => {
                const field = c.querySelector(selector);
                field.disabled = !allocationSelected;
                field.required = allocationSelected;
            });
        } else if (isPaternity) {
            const dates = [...c.querySelectorAll('.paternity-date')].map(x=>x.value).filter(Boolean).sort();
            c.querySelector('#paternityDatesValue').value = dates.join(',');
            if (dates.length) { dateFrom.value=dates[0]; dateTo.value=dates[dates.length-1]; }
            dateFrom.readOnly = dateTo.readOnly = true;
            const needsEdd = c.querySelector('#paternityContingency').value === 'live_birth';
            const paternityEdd = paternityFields.querySelector('[name="expectedDeliveryDate"]');
            c.querySelector('#paternityEddWrap').style.display = needsEdd ? '' : 'none';
            paternityEdd.required = needsEdd;
            paternityEdd.disabled = !isPaternity || !needsEdd;
            paternityFields.querySelector('[name="actualEventDate"]').required = true;
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
    typeSelect?.addEventListener('change', () => {
        if (typeSelect.value === 'Maternity Leave - Childbirth') maternityContingency.value = 'live_birth';
        if (typeSelect.value === 'Maternity Leave - Miscarriage/ETP') maternityContingency.value = 'miscarriage_etp';
        updateLeavePolicy();
    });
    maternityContingency?.addEventListener('change', () => {
        if (typeSelect.value.startsWith('Maternity Leave')) typeSelect.value = maternityContingency.value === 'live_birth' ? 'Maternity Leave - Childbirth' : 'Maternity Leave - Miscarriage/ETP';
        updateLeavePolicy();
    });
    c.querySelector('#paternityContingency')?.addEventListener('change', updateLeavePolicy);
    ['#soloParent','#unpaidExtension','#allocatedDays','#maternityEdd','[name="maternityActualEventDate"]'].forEach(sel=>c.querySelector(sel)?.addEventListener('change',updateLeavePolicy));
    c.querySelectorAll('.paternity-date').forEach(input=>input.addEventListener('change', () => {
        if (!input.value) { updateLeavePolicy(); return; }
        const weekday = new Date(`${input.value}T12:00:00`).getDay();
        if (weekday === 0 || weekday === 6) {
            input.value = '';
            showMsg('leaveReqMsg', 'Paternity leave dates must be weekdays (Monday to Friday).', 'error');
        }
        updateLeavePolicy();
    }));
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
    if (noticeOptions) await loadMyPregnancyNotifications();
}

async function loadMyPregnancyNotifications() {
    const tbody = document.getElementById('myPregnancyNoticeBody');
    if (!tbody) return;
    const data = await apiCall(`${API.LEAVE}?action=my-notifications`);
    if (!data.success || !data.notifications?.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--text-light);">No notifications recorded yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.notifications.map(n => `<tr><td>${n.notification_type === 'maternity' ? 'Maternity' : 'Paternity'}</td><td>${escapeHtml(n.expected_delivery_date)}</td><td>${escapeHtml(n.spouse_name || '—')}</td><td>${escapeHtml(n.created_at || '—')}</td><td>${escapeHtml(n.notification_text || '—')}</td></tr>`).join('');
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
    if (e.target.querySelector('#leaveTypeSelect')?.value === 'Paternity Leave') {
        if (dates.length !== 7 || dates.some(value => {
            const day = new Date(`${value}T12:00:00`).getDay();
            return day === 0 || day === 6;
        })) {
            showMsg('leaveReqMsg', 'Select exactly seven workdays from Monday to Friday for paternity leave.', 'error');
            return;
        }
        if (e.target.querySelector('#paternitySchedule')?.value === 'consecutive') {
            for (let i = 1; i < dates.length; i++) {
                const nextWorkday = new Date(`${dates[i - 1]}T12:00:00`);
                do { nextWorkday.setDate(nextWorkday.getDate() + 1); } while (nextWorkday.getDay() === 0 || nextWorkday.getDay() === 6);
                const expected = `${nextWorkday.getFullYear()}-${String(nextWorkday.getMonth() + 1).padStart(2, '0')}-${String(nextWorkday.getDate()).padStart(2, '0')}`;
                if (dates[i] !== expected) {
                    showMsg('leaveReqMsg', 'Consecutive paternity leave must use seven consecutive workdays, skipping weekends.', 'error');
                    return;
                }
            }
        }
    }
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
    if (result.success) { showToast('Notification recorded in the system. Complete any required official submission separately.', 'success'); e.target.reset(); await loadMyPregnancyNotifications(); }
    else showToast(result.message || 'Could not record notification.', 'error');
}

async function loadApproveLeave(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-calendar-check"></i>Approve Leave</div></div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info" style="margin-bottom:1rem;"><i class="fas fa-info-circle"></i><div>For statutory leave, review the uploaded evidence and eligibility details before approval. Paternity dates are normally after the event. Dates before or on the event date require employer permission and an approval note. Miscarriage requests do not require advance pregnancy notification. Maternity approval records the verified full-pay payroll amount; the app does not submit SSS claims or record money transfers.</div></div>
        <h4 style="margin-bottom:.5rem;">Recorded pregnancy notifications</h4><div class="table-container" style="margin-bottom:1.25rem;"><table><thead><tr><th>Employee</th><th>Type</th><th>Expected date</th><th>Spouse</th><th>Recorded</th><th>Note</th></tr></thead><tbody id="leaveNotificationsBody"><tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="table-container"><table><thead><tr><th>Employee</th><th>Leave Type</th><th>Dates</th><th>Days</th><th>Submitted</th><th>Actions</th></tr></thead><tbody id="pendingLeaveBody"><tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="pendingLeavePager"></div>
        </div></div>`;
    const notificationsData = await apiCall(`${API.LEAVE}?action=notifications`);
    const notificationsBody = document.getElementById('leaveNotificationsBody');
    if (notificationsBody) {
        notificationsBody.innerHTML = notificationsData.success && notificationsData.notifications?.length
            ? notificationsData.notifications.map(n => `<tr><td>${escapeHtml(n.employee_name)}${n.staff_id ? ` (${escapeHtml(n.staff_id)})` : ''}</td><td>${n.notification_type === 'maternity' ? 'Maternity' : 'Paternity'}</td><td>${escapeHtml(n.expected_delivery_date)}</td><td>${escapeHtml(n.spouse_name || '—')}</td><td>${escapeHtml(n.created_at || '—')}</td><td>${escapeHtml(n.notification_text || '—')}</td></tr>`).join('')
            : '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-light);">No notifications recorded.</td></tr>';
    }
    const data = await apiCall(`${API.LEAVE}?action=pending`);
    const tbody = document.getElementById('pendingLeaveBody');
    if (!data.success || !data.requests.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No leave requests waiting for your review.</td></tr>';
        document.getElementById('pendingLeavePager').innerHTML = '';
        return;
    }
    window.pendingLeaveRequestsById = Object.fromEntries(data.requests.map(r => [r.id, r]));
    const rows = data.requests.map(r => {
        return `<tr>
        <td><strong>${escapeHtml(r.employee_name)}</strong><br><small>${escapeHtml(r.department||'')}</small></td>
        <td>${escapeHtml(r.leave_type)}</td>
        <td>${escapeHtml(r.date_from)} – ${escapeHtml(r.date_to)}</td>
        <td>${Number(r.days || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
        <td>${r.created_at ? new Date(r.created_at).toLocaleDateString('en-PH') : '—'}</td>
        <td><button class="action-btn btn-sm" onclick="viewLeaveRequest(${Number(r.id)})"><i class="fas fa-eye"></i> View</button></td>
    </tr>`;
    });
    renderPaginated('pendingLeaveBody', 'pendingLeavePager', rows, 5);
}

function viewLeaveRequest(id) {
    const r = window.pendingLeaveRequestsById?.[id];
    if (!r) return;
    let selectedDates = [];
    try { selectedDates = JSON.parse(r.paternity_dates_json || '[]'); } catch (_) {}
    const fields = [
        ['Employee', `${r.employee_name || ''}${r.staff_id ? ` (${r.staff_id})` : ''}`],
        ['Department', r.department || '—'], ['Leave type', r.leave_type || '—'],
        ['Date from', r.date_from || '—'], ['Date to', r.date_to || '—'],
        ['Days requested', Number(r.days || 0)], ['Reason / explanation', r.reason || '—'],
    ];
    if (r.leave_type?.startsWith('Maternity Leave')) fields.push(
        ['Contingency', r.contingency_type || '—'], ['Expected delivery date', r.expected_delivery_date || '—'],
        ['Paid leave days', r.maternity_paid_days == null ? '—' : Number(r.maternity_paid_days)],
        ['Solo parent', Number(r.solo_parent) ? 'Yes' : 'No'],
        ['Allocated leave days', Number(r.allocated_leave_days || 0)],
        ['Allocation recipient', r.allocation_recipient_name || '—'],
        ['Relationship', r.allocation_relationship || '—'], ['Recipient employer', r.allocation_employer || '—'],
        ['Unpaid extension', Number(r.unpaid_extension) ? '30 days' : 'No'],
        ['Payroll SSS deduction months found', r.sss_recorded_months == null ? 'Not checked' : `${Number(r.sss_recorded_months)} / 12`],
        ['Pregnancy notification recorded', r.pregnancy_notice_recorded_at || 'Not recorded']
    );
    if (r.leave_type === 'Paternity Leave') fields.push(
        ['Contingency', r.contingency_type === 'miscarriage_etp' ? 'Miscarriage / pregnancy loss' : 'Live birth'],
        ['Delivery number', r.paternity_delivery_number || '—'],
        ['Expected delivery date', r.expected_delivery_date || 'Not required for miscarriage'],
        ['Actual event date', r.paternity_actual_date || '—'],
        ['Schedule', r.paternity_schedule_option || '—'], ['Selected workdays', selectedDates.join(', ') || '—'],
        ['Pregnancy notification recorded', r.pregnancy_notice_recorded_at || 'Not recorded']
    );
    const documentLabels = {
        event_proof: 'Birth / Contingency Proof', marriage_certificate: 'Marriage Certificate',
        pregnancy_proof: 'Pregnancy Proof', mat1: 'SSS Maternity Notification (MAT-1)',
        contingency_proof: 'Miscarriage / ETP Medical Proof', solo_parent_id: 'Solo Parent ID',
        allocation_notice: 'Signed Allocation Notice'
    };
    const proofLabel = r.leave_type === 'Sick Leave' ? 'Medical Certificate'
        : r.leave_type === 'Emergency Leave' ? 'Emergency Proof Image' : 'Supporting Proof';
    const fileLinks = [
        ...(r.proof_path ? [`<div style="margin:.35rem 0"><strong>${proofLabel}:</strong> <a href="${API.LEAVE}?action=proof&id=${Number(r.id)}" target="_blank" rel="noopener">View File</a></div>`] : []),
        ...(r.documents || []).map(d => {
            const type = String(d.document_type || '');
            const label = documentLabels[type] || type.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
            return `<div style="margin:.35rem 0"><strong>${escapeHtml(label)}:</strong> <a href="${API.LEAVE}?action=document&id=${Number(d.id)}" target="_blank" rel="noopener">View File</a></div>`;
        })
    ];
    let modal = document.getElementById('leaveReviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'leaveReviewModal'; modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content" style="max-width:760px"><div class="modal-header"><div class="modal-title">Leave Request</div><button class="close-modal" type="button" onclick="closeLeaveReviewModal()">&times;</button></div><div id="leaveReviewBody" style="padding:1.25rem"></div><div class="modal-footer" id="leaveReviewActions" style="display:flex;justify-content:flex-end;gap:.6rem;padding:1rem 1.25rem;border-top:1px solid var(--border)"></div></div>';
        document.body.appendChild(modal);
    }
    modal.querySelector('#leaveReviewBody').innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.7rem 1.2rem">${fields.map(([label, value]) => `<div><small style="display:block;color:var(--text-light)">${escapeHtml(label)}</small><strong>${escapeHtml(String(value ?? '—'))}</strong></div>`).join('')}</div><div style="margin-top:1.2rem"><strong>Uploaded files</strong><div style="margin-top:.45rem">${fileLinks.join('') || '<span style="color:var(--text-light)">No files attached</span>'}</div></div>`;
    modal.querySelector('#leaveReviewActions').innerHTML = `<button class="action-btn danger" onclick="closeLeaveReviewModal(); declineLeave(${Number(id)})"><i class="fas fa-times"></i> Deny</button><button class="action-btn" style="background:var(--success)" onclick="closeLeaveReviewModal(); approveLeave(${Number(id)})"><i class="fas fa-check"></i> Approve</button>`;
    modal.style.display = 'flex';
}

function closeLeaveReviewModal() {
    const modal = document.getElementById('leaveReviewModal');
    if (modal) modal.style.display = 'none';
}

async function approveLeave(id) {
    const request = window.pendingLeaveRequestsById?.[id];
    let payload = {};
    if (request?.leave_type === 'Paternity Leave') {
        let dates = [];
        try { dates = JSON.parse(request.paternity_dates_json || '[]'); } catch (_) {}
        const hasPreEventDates = dates.some(date => request.paternity_actual_date && date <= request.paternity_actual_date);
        if (hasPreEventDates) {
            const decision = await showAppConfirm({
                title: 'Approve dates before event?',
                message: 'This request includes leave before or on the recorded birth or miscarriage date. Approve only if the employer permits leave before or during the event.',
                confirmLabel: 'Confirm approval',
                needsRemarks: true,
                remarksLabel: 'Approval note (required)',
            });
            if (!decision.confirmed) return;
            if (!decision.remarks?.trim()) { showToast('Enter an approval note for the employer-approved dates.', 'error'); return; }
            payload.allowBeforeEvent = true;
            payload.remarks = decision.remarks.trim();
        }
    }
    if (request?.leave_type?.startsWith('Maternity Leave')) {
        const amountText = prompt('Enter the confirmed full-pay amount for the entire paid maternity leave period (PHP), including the SSS maternity benefit and any employer salary differential where applicable. This is a payroll record only; the system does not submit an SSS claim or transfer money.');
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
