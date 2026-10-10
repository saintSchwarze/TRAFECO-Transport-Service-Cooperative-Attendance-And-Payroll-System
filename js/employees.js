async function uploadProfilePhoto(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB.'); return; }

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const res = await fetch(`${API.EMP}?action=upload-photo`, { method: 'POST', body: formData, credentials: 'same-origin', headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {} });
        const result = await res.json();
        if (result.success) {
            if (result.path) currentUser.profilePicture = result.path;
            refreshUserDisplay();
            input.value = '';
            loadPageContent('my-profile');
        } else {
            showToast(result.message || 'Upload failed.');
        }
    } catch (err) {
        showToast('Upload failed. Please try again.');
    }
}

async function loadMyProfile(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-id-card"></i>My Profile</div></div>
        <div style="padding:1.4rem;" id="myProfileBody"><div style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</div></div>
        </div>`;

    const data = await apiCall(`${API.EMP}?action=get&id=${currentUser.id}`);
    const body = document.getElementById('myProfileBody');
    if (!data.success) { body.innerHTML = `<div class="alert alert-info">${escapeHtml(data.message)}</div>`; return; }
    const e = data.employee;
    const initials = ((e.first_name?.[0]||'')+(e.last_name?.[0]||'')).toUpperCase();
    const isManager = currentUser.role === 'Manager';

    const rateLine = e.employment_type === 'Full-time'
        ? `₱${parseFloat(e.basic_salary||0).toLocaleString('en-PH',{minimumFractionDigits:2})} / day`
        : `₱${parseFloat(e.hourly_rate||0).toLocaleString('en-PH',{minimumFractionDigits:2})} / hour`;

    const contribBadge = (on, label) => `<span class="status ${on ? 'status-completed' : 'status-rejected'}" style="margin-right:0.5rem;"><i class="fas ${on?'fa-check':'fa-times'}"></i> ${label}</span>`;

    const avatarInner = e.profile_picture
        ? `<img src="${e.profile_picture}?t=${Date.now()}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : (initials || '—');

    body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:1.75rem;">
            <div style="position:relative;width:96px;height:96px;margin-bottom:0.75rem;">
                <div style="width:96px;height:96px;border-radius:50%;background:var(--green-600);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;overflow:hidden;">${avatarInner}</div>
                <button onclick="document.getElementById('profilePhotoInput').click()" title="Change photo" style="position:absolute;bottom:0;right:0;width:30px;height:30px;border-radius:50%;background:#fff;border:2px solid var(--green-600);color:var(--green-700);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);"><i class="fas fa-camera" style="font-size:0.8rem;"></i></button>
                <input type="file" id="profilePhotoInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadProfilePhoto(this)">
            </div>
            <div style="font-size:1.2rem;font-weight:700;">${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)}</div>
            <div style="color:var(--text-light);font-size:0.9rem;">${escapeHtml(e.staff_id)} · ${escapeHtml(e.position)}</div>
        </div>

        <div style="font-weight:700;font-size:0.85rem;color:var(--text-mid);text-transform:uppercase;letter-spacing:0.04em;border-bottom:2px solid var(--green-100);padding-bottom:0.5rem;margin-bottom:1rem;">Employment Details${isManager ? '' : ' <span style="font-weight:400;text-transform:none;color:var(--text-light);">(editable only by a manager)</span>'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.75rem;">
                <div><label style="font-size:0.78rem;color:var(--text-light);">First Name</label><div style="font-weight:600;">${escapeHtml(e.first_name)}</div></div>
                <div><label style="font-size:0.78rem;color:var(--text-light);">Last Name</label><div style="font-weight:600;">${escapeHtml(e.last_name)}</div></div>
                <div><label style="font-size:0.78rem;color:var(--text-light);">Department</label><div style="font-weight:600;">${escapeHtml(e.department)}</div></div>
                <div><label style="font-size:0.78rem;color:var(--text-light);">Position</label><div style="font-weight:600;">${escapeHtml(e.position)}</div></div>
                <div><label style="font-size:0.78rem;color:var(--text-light);">Employment Type</label><div style="font-weight:600;">${escapeHtml(e.employment_type)}</div></div>
            <div><label style="font-size:0.78rem;color:var(--text-light);">Rate</label><div style="font-weight:600;">${rateLine}</div></div>
        </div>

        <div style="margin-bottom:1.75rem;">
            <label style="font-size:0.78rem;color:var(--text-light);display:block;margin-bottom:0.5rem;">Government Contributions</label>
            ${contribBadge(!!Number(e.sss_enabled ?? 1), 'SSS')}
            ${contribBadge(!!Number(e.philhealth_enabled ?? 1), 'PhilHealth')}
            ${contribBadge(!!Number(e.pagibig_enabled ?? 1), 'Pag-IBIG')}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--green-100);padding-bottom:0.5rem;margin-bottom:1rem;">
            <div style="font-weight:700;font-size:0.85rem;color:var(--text-mid);text-transform:uppercase;letter-spacing:0.04em;">Contact Information</div>
            ${isManager
                ? `<button class="action-btn btn-sm" onclick="openEditEmployeeModal(${currentUser.id}, 'my-profile')"><i class="fas fa-pen"></i> Edit Profile</button>`
                : '<button class="action-btn btn-sm" onclick="openEditContactModal()"><i class="fas fa-pen"></i> Edit</button>'}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.75rem;">
            <div>
                <label style="font-size:0.78rem;color:var(--text-light);">Email</label>
                <div style="display:flex;align-items:center;gap:0.6rem;">
                    <div style="font-weight:600;" id="mpEmailDisplay">${escapeHtml(e.email || '—')}</div>
                    <button class="action-btn btn-sm" onclick="openChangeEmailModal()" title="Change email"><i class="fas fa-pen"></i></button>
                </div>
            </div>
            <div><label style="font-size:0.78rem;color:var(--text-light);">Phone</label><div style="font-weight:600;" id="mpPhoneDisplay">${escapeHtml(e.phone || '—')}</div></div>
            <div><label style="font-size:0.78rem;color:var(--text-light);">Address</label><div style="font-weight:600;" id="mpAddressDisplay">${escapeHtml(e.address || '—')}</div></div>
            <div><label style="font-size:0.78rem;color:var(--text-light);">Emergency Contact Name</label><div style="font-weight:600;" id="mpEmNameDisplay">${escapeHtml(e.emergency_contact_name || '—')}</div></div>
            <div><label style="font-size:0.78rem;color:var(--text-light);">Emergency Contact Phone</label><div style="font-weight:600;" id="mpEmPhoneDisplay">${escapeHtml(e.emergency_contact_phone || '—')}</div></div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:1.25rem;display:flex;gap:0.75rem;">
            <button class="btn" onclick="document.getElementById('changePasswordModal').style.display='flex';"><i class="fas fa-key"></i> Change Password</button>
            <button class="action-btn btn-sm" onclick="openChangeUsernameModal()"><i class="fas fa-user-pen"></i> Change Username</button>
        </div>
    `;
}

function openEditContactModal() {
    const val = id => { const t = document.getElementById(id).textContent.trim(); return t === '—' ? '' : t; };
    document.getElementById('ecPhone').value   = val('mpPhoneDisplay');
    document.getElementById('ecAddress').value = val('mpAddressDisplay');
    document.getElementById('ecEmName').value  = val('mpEmNameDisplay');
    document.getElementById('ecEmPhone').value = val('mpEmPhoneDisplay');
    document.getElementById('editContactModal').style.display = 'flex';
}

async function submitEditContact(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const result = await apiCall(`${API.EMP}?action=update-contact`, 'PUT', data);
    if (result.success) {
        showMsg('editContactMsg', 'Contact info updated.', 'success');
        setTimeout(() => { document.getElementById('editContactModal').style.display = 'none'; loadPageContent('my-profile'); }, 800);
    } else {
        showMsg('editContactMsg', result.message || 'Update failed.', 'error');
    }
}

async function viewEmployeeProfile(id) {
    const data = await apiCall(`${API.EMP}?action=get&id=${id}`);
    if (!data.success) { showToast(data.message, 'error'); return; }
    const e = data.employee;
    const initials = ((e.first_name?.[0]||'')+(e.last_name?.[0]||'')).toUpperCase();
    const avatarInner = e.profile_picture
        ? `<img src="${e.profile_picture}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : (initials || '—');
    const rateLine = e.employment_type === 'Full-time'
        ? `₱${parseFloat(e.basic_salary||0).toLocaleString('en-PH',{minimumFractionDigits:2})} / day`
        : `₱${parseFloat(e.hourly_rate||0).toLocaleString('en-PH',{minimumFractionDigits:2})} / hour`;
    const contribBadge = (on, label) => `<span class="status ${on ? 'status-completed' : 'status-rejected'}" style="margin-right:0.5rem;"><i class="fas ${on?'fa-check':'fa-times'}"></i> ${label}</span>`;

    document.getElementById('viewProfileBody').innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:1.5rem;">
            <div style="width:80px;height:80px;border-radius:50%;background:var(--green-600);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.7rem;font-weight:700;overflow:hidden;margin-bottom:0.6rem;">${avatarInner}</div>
            <div style="font-size:1.1rem;font-weight:700;">${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)}</div>
            <div style="color:var(--text-light);font-size:0.85rem;">${escapeHtml(e.staff_id)} · ${escapeHtml(e.position)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.9rem;margin-bottom:1.25rem;">
            <div><label style="font-size:0.75rem;color:var(--text-light);">Department</label><div style="font-weight:600;">${escapeHtml(e.department)}</div></div>
            <div><label style="font-size:0.75rem;color:var(--text-light);">Employment Type</label><div style="font-weight:600;">${escapeHtml(e.employment_type)}</div></div>
            <div><label style="font-size:0.75rem;color:var(--text-light);">Rate</label><div style="font-weight:600;">${rateLine}</div></div>
            <div><label style="font-size:0.75rem;color:var(--text-light);">Hired</label><div style="font-weight:600;">${escapeHtml(e.hire_date || '—')}</div></div>
            <div><label style="font-size:0.75rem;color:var(--text-light);">Phone</label><div style="font-weight:600;">${escapeHtml(e.phone || '—')}</div></div>
            <div><label style="font-size:0.75rem;color:var(--text-light);">Address</label><div style="font-weight:600;">${escapeHtml(e.address || '—')}</div></div>
            <div><label style="font-size:0.75rem;color:var(--text-light);">Emergency Contact</label><div style="font-weight:600;">${escapeHtml(e.emergency_contact_name || '—')}</div></div>
            <div><label style="font-size:0.75rem;color:var(--text-light);">Emergency Phone</label><div style="font-weight:600;">${escapeHtml(e.emergency_contact_phone || '—')}</div></div>
        </div>
        <div style="margin-bottom:0.5rem;">
            ${contribBadge(!!Number(e.sss_enabled ?? 1), 'SSS')}
            ${contribBadge(!!Number(e.philhealth_enabled ?? 1), 'PhilHealth')}
            ${contribBadge(!!Number(e.pagibig_enabled ?? 1), 'Pag-IBIG')}
        </div>
    `;
    document.getElementById('viewProfileModal').style.display = 'flex';
}

let empListCache = [];

async function loadEmployeeList(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-users"></i>Employee List</div>${currentUser.permissions.createEditEmployees?'<button class="btn" onclick="loadPageContent(\'add-employee\')"><i class="fas fa-user-plus"></i>Add Employee</button>':''}</div>
        <div style="padding:1.4rem;">
        <div class="form-group" style="max-width:320px;margin-bottom:1rem;"><input type="text" class="form-control" id="empListSearch" placeholder="Search by name..." oninput="filterEmployeeList()"></div></div>
        <div class="table-container"><table><thead><tr><th>Staff ID</th><th>Name</th><th>Email</th><th>Department</th><th>Position</th><th>Type</th><th>Status</th>${currentUser.permissions.createEditEmployees?'<th>Actions</th>':''}</tr></thead><tbody id="empListBody"><tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="empListPager"></div>
        </div></div>`;
    const data = await apiCall(`${API.EMP}?action=list`);
    if (!data.success) {
        document.getElementById('empListBody').innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">${escapeHtml(data.message || 'No employees found.')}</td></tr>`;
        return;
    }
    empListCache = data.employees;
    renderEmployeeListRows(empListCache);
}

function renderEmployeeListRows(rows) {
    const tbody = document.getElementById('empListBody');
    if (!tbody) return;
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">No matching employees.</td></tr>';
        document.getElementById('empListPager').innerHTML = '';
        return;
    }
    const htmlRows = rows.map(e => {
        const statusBadge = e.account_status === 'pending'
            ? '<span class="badge badge-neutral">Pending registration</span>'
            : e.emp_status === 'active' && e.account_status === 'active'
                ? '<span class="badge badge-success">Active</span>'
                : '<span class="badge badge-danger">Inactive</span>';
        const actions = currentUser.permissions.createEditEmployees ? `<td>
            <button class="action-btn btn-sm" onclick="openEditEmployeeModal(${e.id})"><i class="fas fa-pen"></i> Edit</button>
            ${e.account_status === 'pending' ? `<button class="action-btn btn-sm" onclick="resendRegistrationInvite(${Number(e.id)})"><i class="fas fa-envelope"></i> Resend Invitation</button>` : ''}
        </td>` : '';
        return `<tr>
            <td><strong>${escapeHtml(e.staff_id)}</strong></td>
        <td>${escapeHtml(e.full_name)}</td>
            <td>${escapeHtml(e.email)}</td>
            <td>${escapeHtml(e.department)}</td>
            <td>${escapeHtml(e.position)}</td>
            <td>${escapeHtml(e.employment_type)}</td>
            <td>${statusBadge}</td>
            ${actions}
        </tr>`;
    });
    renderPaginated('empListBody', 'empListPager', htmlRows, 10);
}

function filterEmployeeList() {
    const q = document.getElementById('empListSearch').value.trim().toLowerCase();
    renderEmployeeListRows(q ? empListCache.filter(e => e.full_name.toLowerCase().includes(q)) : empListCache);
}

function editEmpToggleRate() {
    const isPartTime = document.getElementById('editEmpType').value === 'Part-time';
    document.getElementById('editEmpSalaryGroup').style.display = isPartTime ? 'none' : 'block';
    document.getElementById('editEmpHourlyGroup').style.display = isPartTime ? 'block' : 'none';
}

function editEmpToggleMarital() {
    const married = document.getElementById('editEmpMarital').value === 'married';
    document.getElementById('editEmpCohabitingWrap').style.display = married ? 'block' : 'none';
    if (!married) document.getElementById('editEmpCohabiting').value = '';
}

let editEmployeeReturnPage = 'employee-list';

async function openEditEmployeeModal(id, returnPage = 'employee-list') {
    editEmployeeReturnPage = returnPage;
    const data = await apiCall(`${API.EMP}?action=get&id=${id}`);
    if (!data.success) { showToast(data.message, 'error'); return; }
    const e = data.employee;
    document.getElementById('editEmpId').value = id;
    document.getElementById('editEmpFirstName').value = e.first_name;
    document.getElementById('editEmpLastName').value  = e.last_name;
    document.getElementById('editEmpGender').value = e.gender || 'prefer_not_to_say';
    document.getElementById('editEmpMarital').value = e.marital_status || 'single';
    document.getElementById('editEmpCohabiting').value = e.cohabiting_with_spouse === null ? '' : String(e.cohabiting_with_spouse);
    editEmpToggleMarital();
    document.getElementById('editEmpDept').value      = e.department;
    document.getElementById('editEmpPosition').value  = e.position;
    document.getElementById('editEmpPhone').value     = e.phone || '';
    document.getElementById('editEmpAddress').value   = e.address || '';
    document.getElementById('editEmpEmName').value    = e.emergency_contact_name || '';
    document.getElementById('editEmpEmPhone').value   = e.emergency_contact_phone || '';
    document.getElementById('editEmpType').value      = e.employment_type;
    document.getElementById('editEmpSalaryInput').value = e.basic_salary || 0;
    document.getElementById('editEmpHourlyInput').value = e.hourly_rate || 0;
    document.getElementById('editEmpStatus').value    = e.emp_status;
    document.getElementById('editEmpSss').checked  = !!Number(e.sss_enabled ?? 1);
    document.getElementById('editEmpPhil').checked = !!Number(e.philhealth_enabled ?? 1);
    document.getElementById('editEmpPag').checked  = !!Number(e.pagibig_enabled ?? 1);
    document.getElementById('editEmpSssNum').value  = e.gov_sss || '';
    document.getElementById('editEmpPhilNum').value = e.gov_philhealth || '';
    document.getElementById('editEmpPagNum').value  = e.gov_pagibig || '';
    toggleGovIdField('editEmpSss','editEmpSssNum');
    toggleGovIdField('editEmpPhil','editEmpPhilNum');
    toggleGovIdField('editEmpPag','editEmpPagNum');
    editEmpToggleRate();
    document.getElementById('editEmployeeModal').style.display = 'flex';
}

async function submitEditEmployee(e) {
    e.preventDefault();
    const id = document.getElementById('editEmpId').value;
    const data = Object.fromEntries(new FormData(e.target));
    data.sssEnabled        = document.getElementById('editEmpSss').checked ? 1 : 0;
    data.philhealthEnabled = document.getElementById('editEmpPhil').checked ? 1 : 0;
    data.pagibigEnabled    = document.getElementById('editEmpPag').checked ? 1 : 0;
    const result = await apiCall(`${API.EMP}?action=update&id=${id}`, 'PUT', data);
    if (result.success) {
        showMsg('editEmpMsg', 'Employee updated.', 'success');
        employeeList = [];
        if (Number(id) === Number(currentUser.id) && result.fullName) {
            currentUser.name = result.fullName;
            refreshUserDisplay();
        }
        setTimeout(() => { document.getElementById('editEmployeeModal').style.display = 'none'; loadPageContent(editEmployeeReturnPage); }, 800);
    } else {
        showMsg('editEmpMsg', result.message || 'Update failed.', 'error');
    }
}

async function deactivateEmployee(id, name) {
    const confirmResult = await showAppConfirm({
        title: 'Deactivate Employee',
        message: `Deactivate ${name}? They will no longer be able to log in.`,
        confirmLabel: 'Deactivate',
        danger: true,
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.EMP}?action=delete&id=${id}`, 'DELETE');
    if (data.success) { showToast(`${name} deactivated.`); loadPageContent('employee-list'); }
    else showToast(data.message, 'error');
}

let profilesCache = [];

async function loadEmployeeProfiles(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-id-card"></i>Employee Profiles</div></div>
        <div style="padding:1.4rem;">
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value" id="pfTotal">—</div><div class="stat-label">Total Employees</div></div>
            <div class="stat-card"><div class="stat-value" id="pfActive">—</div><div class="stat-label">Active</div></div>
            <div class="stat-card"><div class="stat-value" id="pfDepts">—</div><div class="stat-label">Departments</div></div>
        </div>
        <div class="form-group" style="max-width:320px;margin-bottom:1rem;"><input type="text" class="form-control" id="profilesSearch" placeholder="Search by name..." oninput="filterEmployeeProfiles()"></div></div>
        <div class="table-container"><table><thead><tr><th>Staff ID</th><th>Name</th><th>Hired</th><th>Actions</th></tr></thead><tbody id="profilesBody"><tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="profilesPager"></div>
        </div></div>`;
    const data = await apiCall(`${API.EMP}?action=list`);
    const tbody = document.getElementById('profilesBody');
    if (!data.success || !data.employees.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light);">No employees found.</td></tr>`;
        return;
    }
    profilesCache = data.employees;
    document.getElementById('pfTotal').textContent  = profilesCache.length;
    document.getElementById('pfActive').textContent = profilesCache.filter(e=>e.emp_status==='active').length;
    document.getElementById('pfDepts').textContent  = new Set(profilesCache.map(e=>e.department)).size;
    renderProfilesRows(profilesCache);
}

function renderProfilesRows(rows) {
    const tbody = document.getElementById('profilesBody');
    if (!tbody) return;
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light);">No matching employees.</td></tr>';
        document.getElementById('profilesPager').innerHTML = '';
        return;
    }
    const htmlRows = rows.map(e=>`<tr>
        <td>${escapeHtml(e.staff_id)}</td>
        <td><strong>${escapeHtml(e.full_name)}</strong></td>
        <td>${escapeHtml(e.hire_date||'—')}</td>
        <td><button class="action-btn btn-sm" onclick="viewEmployeeProfile(${e.id})"><i class="fas fa-eye"></i> View Profile</button></td>
    </tr>`);
    renderPaginated('profilesBody', 'profilesPager', htmlRows, 10);
}

function filterEmployeeProfiles() {
    const q = document.getElementById('profilesSearch').value.trim().toLowerCase();
    renderProfilesRows(q ? profilesCache.filter(e => e.full_name.toLowerCase().includes(q)) : profilesCache);
}

function toggleGovIdField(checkboxId, inputId) {
    const checkbox = document.getElementById(checkboxId);
    const input = document.getElementById(inputId);
    if (!checkbox || !input) return;
    input.disabled = !checkbox.checked;
    if (!checkbox.checked) input.value = '';
}

function addEmpToggleRate() {
    const isPartTime = document.getElementById('addEmpType').value === 'Part-time';
    document.getElementById('addEmpSalaryGroup').style.display = isPartTime ? 'none' : 'block';
    document.getElementById('addEmpHourlyGroup').style.display = isPartTime ? 'block' : 'none';
    document.getElementById('addEmpSalaryInput').disabled = isPartTime;
    document.getElementById('addEmpHourlyInput').disabled = !isPartTime;
}

// Department -> allowed positions. Adjust freely to match your org chart.
const DEPT_POSITIONS = {
    'Operations':    ['Bus Driver', 'Conductor', 'Dispatcher', 'Terminal Supervisor'],
    'Maintenance':   ['Mechanic', 'Maintenance Supervisor', 'Parts Clerk'],
    'Finance':       ['Accountant', 'Cashier', 'Bookkeeper'],
    'Administration':['Admin Assistant', 'HR Officer', 'Records Officer'],
    'Security':      ['Security Guard', 'Security Supervisor'],
};

function addEmpPopulatePositions() {
    const dept = document.getElementById('addEmpDept').value;
    const posSel = document.getElementById('addEmpPosition');
    const options = DEPT_POSITIONS[dept] || [];
    posSel.innerHTML = options.length
        ? options.map(p => `<option value="${p}">${p}</option>`).join('')
        : '<option value="">Select a department first</option>';
}

function loadAddEmployee(c) {
    const today = new Date().toISOString().slice(0, 10);
    const deptOptions = Object.keys(DEPT_POSITIONS).map(d => `<option value="${d}">${d}</option>`).join('');

    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-user-plus"></i>Add New Employee</div></div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Enter the employee's details and email. They will receive a one-time link to choose their own username and password.</div></div>
        <div id="addEmpMsg" class="message" style="display:none;"></div>
        <form id="addEmployeeForm" onsubmit="submitAddEmployee(event)">
            <div style="font-weight:700;font-size:0.9rem;color:var(--green-800);margin-bottom:1rem;border-bottom:2px solid var(--green-100);padding-bottom:0.5rem;">Employee Information</div>
            <div class="form-row"><div class="form-col"><div class="form-group"><label>First Name</label><input type="text" class="form-control" name="firstName" autocomplete="given-name" required></div></div><div class="form-col"><div class="form-group"><label>Last Name</label><input type="text" class="form-control" name="lastName" autocomplete="family-name" required></div></div></div>
            <div class="alert alert-info"><i class="fas fa-lock"></i><div>These details support leave eligibility checks. “Living with spouse” includes employees temporarily away because of work.</div></div>
            <div class="form-row">
                <div class="form-col"><div class="form-group"><label>Gender</label><select class="form-control" name="gender" required><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></div></div>
                <div class="form-col"><div class="form-group"><label>Marital Status</label><select class="form-control" name="maritalStatus" id="addEmpMarital" required><option value="">Select</option><option value="single">Single</option><option value="married">Married</option><option value="separated">Separated</option><option value="widowed">Widowed</option><option value="other">Other</option></select></div></div>
                <div class="form-col" id="addEmpCohabitingWrap" style="display:none;"><div class="form-group"><label>Do you live together with your spouse?</label><select class="form-control" name="cohabitingWithSpouse" id="addEmpCohabiting"><option value="">Select</option><option value="1">Yes</option><option value="0">No</option></select><small>Temporary separation for work may still meet the legal cohabitation rule; verify eligibility before approval.</small></div></div>
            </div>
            <div class="form-row">
                <div class="form-col"><div class="form-group"><label>Department</label><select class="form-control" name="department" id="addEmpDept" autocomplete="off" required onchange="addEmpPopulatePositions()"><option value="">Select Department</option>${deptOptions}</select></div></div>
                <div class="form-col"><div class="form-group"><label>Position</label><select class="form-control" name="position" id="addEmpPosition" autocomplete="off" required><option value="">Select a department first</option></select></div></div>
            </div>
            <div class="form-row"><div class="form-col"><div class="form-group"><label>Email</label><input type="email" class="form-control" name="email" autocomplete="email" required></div></div><div class="form-col"><div class="form-group"><label>Phone</label><input type="tel" class="form-control" name="phone" id="addEmpPhone" inputmode="numeric" maxlength="11" placeholder="09171234567" autocomplete="tel" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,11)"></div></div></div>
            <div class="form-group"><label>Address</label><input type="text" class="form-control" name="address" autocomplete="street-address" placeholder="Complete address"></div>
            <div class="form-row"><div class="form-col"><div class="form-group"><label>Emergency Contact Name</label><input type="text" class="form-control" name="emergencyContactName" autocomplete="off"></div></div><div class="form-col"><div class="form-group"><label>Emergency Contact Phone</label><input type="tel" class="form-control" name="emergencyContactPhone" maxlength="11" autocomplete="off" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,11)"></div></div></div>
            <div class="form-row">
                <div class="form-col"><div class="form-group"><label>Employment Type</label><select class="form-control" name="employmentType" id="addEmpType" autocomplete="off" onchange="addEmpToggleRate()"><option>Full-time</option><option>Part-time</option></select></div></div>
                <div class="form-col">
                    <div class="form-group" id="addEmpSalaryGroup"><label>Basic Salary (₱ / day)</label><input type="number" class="form-control" name="salary" id="addEmpSalaryInput" min="0" step="0.01" value="575" autocomplete="off"></div>
                    <div class="form-group" id="addEmpHourlyGroup" style="display:none;"><label>Hourly Rate (₱ / hour)</label><input type="number" class="form-control" name="hourlyRate" id="addEmpHourlyInput" min="0" step="0.01" autocomplete="off" disabled></div>
                </div>
            </div>
            <div class="form-row"><div class="form-col"><div class="form-group"><label>Hire Date</label><input type="date" class="form-control" name="hireDate" value="${today}" autocomplete="off"></div></div></div>
            <div style="font-weight:700;font-size:0.9rem;color:var(--green-800);margin-bottom:1rem;margin-top:1rem;border-bottom:2px solid var(--green-100);padding-bottom:0.5rem;">Government Contributions</div>
            <div class="alert alert-info" style="margin-bottom:0.85rem;"><i class="fas fa-info-circle"></i><div>All three are enabled by default. Uncheck any the employee opts out of — in exchange, they won't receive that benefit and it won't be deducted from their pay.</div></div>
            <div style="display:flex;gap:1.5rem;margin-bottom:1.25rem;">
                <label style="display:flex;align-items:center;gap:0.4rem;font-weight:600;"><input type="checkbox" name="sssEnabled" id="addEmpSss" checked onchange="toggleGovIdField('addEmpSss','addEmpSssNum')"> SSS</label>
                <label style="display:flex;align-items:center;gap:0.4rem;font-weight:600;"><input type="checkbox" name="philhealthEnabled" id="addEmpPhil" checked onchange="toggleGovIdField('addEmpPhil','addEmpPhilNum')"> PhilHealth</label>
                <label style="display:flex;align-items:center;gap:0.4rem;font-weight:600;"><input type="checkbox" name="pagibigEnabled" id="addEmpPag" checked onchange="toggleGovIdField('addEmpPag','addEmpPagNum')"> Pag-IBIG</label>
            </div>
            <div class="form-row">
                <div class="form-col"><div class="form-group"><label>SSS Number</label><input type="text" class="form-control" name="govSss" id="addEmpSssNum" inputmode="numeric" maxlength="10" placeholder="10 digits" autocomplete="off" oninput="this.value=this.value.replace(/\D/g,'').slice(0,10)"></div></div>
                <div class="form-col"><div class="form-group"><label>PhilHealth ID Number</label><input type="text" class="form-control" name="govPhilhealth" id="addEmpPhilNum" inputmode="numeric" maxlength="12" placeholder="12 digits" autocomplete="off" oninput="this.value=this.value.replace(/\D/g,'').slice(0,12)"></div></div>
                <div class="form-col"><div class="form-group"><label>Pag-IBIG MID Number</label><input type="text" class="form-control" name="govPagibig" id="addEmpPagNum" inputmode="numeric" maxlength="12" placeholder="12 digits" autocomplete="off" oninput="this.value=this.value.replace(/\D/g,'').slice(0,12)"></div></div>
            </div>
            <button type="submit" class="btn"><i class="fas fa-envelope"></i> Create Employee &amp; Send Invitation</button>
        </form>
        </div></div>`;
        ['addEmpSss','addEmpPhil','addEmpPag'].forEach(id => {
        const pair = { addEmpSss: 'addEmpSssNum', addEmpPhil: 'addEmpPhilNum', addEmpPag: 'addEmpPagNum' };
        toggleGovIdField(id, pair[id]);
    });
    const maritalSelect = document.getElementById('addEmpMarital');
    maritalSelect?.addEventListener('change', () => {
        const married = maritalSelect.value === 'married';
        document.getElementById('addEmpCohabitingWrap').style.display = married ? 'block' : 'none';
        document.getElementById('addEmpCohabiting').required = married;
        if (!married) document.getElementById('addEmpCohabiting').value = '';
    });
}

async function submitAddEmployee(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.sssEnabled       = document.getElementById('addEmpSss').checked ? 1 : 0;
    data.philhealthEnabled = document.getElementById('addEmpPhil').checked ? 1 : 0;
    data.pagibigEnabled   = document.getElementById('addEmpPag').checked ? 1 : 0;
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Creating and sending...';
    const result = await apiCall(`${API.EMP}?action=create`, 'POST', data);
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-envelope"></i> Create Employee &amp; Send Invitation';
    if (result.success) {
        showMsg('addEmpMsg', `${result.message} Staff ID: ${result.staffId}`, result.invitationSent ? 'success' : 'error');
        e.target.reset();
        employeeList = []; // reset cache
    } else {
        showMsg('addEmpMsg', result.message || 'Failed to create employee.', 'error');
    }
}

async function resendRegistrationInvite(userId) {
    const result = await apiCall(`${API.EMP}?action=resend-invite`, 'POST', { userId });
    showToast(result.message || (result.success ? 'Invitation sent.' : 'Could not send invitation.'), result.success ? 'success' : 'error');
}
