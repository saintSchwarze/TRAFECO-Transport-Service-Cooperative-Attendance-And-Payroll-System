async function previewArchive() {
    const el = document.getElementById('archivePreviewResult');
    el.innerHTML = '<div style="color:var(--text-light);">Checking...</div>';
    const data = await apiCall(`${API.SYS}?action=archive-preview`);
    if (!data.success) { el.innerHTML = `<div class="alert alert-info">${escapeHtml(data.message)}</div>`; return; }

    const total = data.attendanceCount + data.leaveCount + data.payslipCount;
    if (!total) {
        el.innerHTML = `<div class="alert alert-info">Nothing to archive — no records older than ${data.cutoff} yet.</div>`;
        return;
    }
    el.innerHTML = `
        <div class="alert alert-info">
            <i class="fas fa-triangle-exclamation"></i>
            <div>Found <strong>${data.attendanceCount}</strong> attendance logs, <strong>${data.leaveCount}</strong> leave requests, and <strong>${data.payslipCount}</strong> payslips older than ${data.cutoff}.
            <br><button class="btn btn-sm" style="margin-top:0.6rem;" onclick="confirmArchive()"><i class="fas fa-check"></i> Confirm &amp; Archive Now</button></div>
        </div>`;
}

async function confirmArchive() {
    const el = document.getElementById('archivePreviewResult');
    el.innerHTML = '<div style="color:var(--text-light);">Archiving...</div>';
    const data = await apiCall(`${API.SYS}?action=archive-run`, 'POST', {});
    if (!data.success) { el.innerHTML = `<div class="alert alert-info">${escapeHtml(data.message)}</div>`; return; }
    el.innerHTML = `<div class="alert alert-info"><i class="fas fa-check-circle"></i><div>Archived ${data.attendanceCount} attendance logs, ${data.leaveCount} leave requests, ${data.payslipCount} payslips. ${data.csvAvailable ? `<a href="${API.SYS}?action=download-archive&id=${Number(data.runId)}">Download the CSV backup</a>` : ''}</div></div>`;
    loadArchiveHistory();
}

async function loadArchiveHistory() {
    const tbody = document.getElementById('archiveHistoryBody');
    if (!tbody) return;
    const data = await apiCall(`${API.SYS}?action=archive-history`);
    if (!data.success || !data.runs.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-light);">No archive runs yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.runs.map(r => `<tr>
        <td>${new Date(r.run_at).toLocaleString('en-PH')}</td>
        <td>${r.trigger_type === 'auto' ? 'Automatic' : 'Manual'}</td>
        <td>${escapeHtml(r.triggered_by_name || '—')}</td>
        <td>${r.attendance_count}</td>
        <td>${r.leave_count}</td>
        <td>${r.payslip_count}</td>
        <td>${r.id ? `<a href="${API.SYS}?action=download-archive&id=${Number(r.id)}">Download</a>` : '—'}</td>
    </tr>`).join('');
}

async function loadArchivedRecords() {
    const data = await apiCall(`${API.QR}?action=archived-logs`);
    let rowsHtml = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light);">No archived attendance records.</td></tr>';
    if (data.success && data.logs.length) {
        rowsHtml = data.logs.map(l => `<tr>
            <td>${escapeHtml(l.full_name)} (${escapeHtml(l.staff_id)})</td>
            <td>${l.scan_type === 'time_in' ? 'Time In' : 'Time Out'}</td>
            <td>${new Date(l.scanned_at).toLocaleString('en-PH')}</td>
            <td>${new Date(l.archived_at).toLocaleDateString('en-PH')}</td>
        </tr>`).join('');
    }
    document.getElementById('pageContent').innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-box-archive"></i>Archived Attendance Records</div><button class="action-btn btn-sm" onclick="loadPageContent('system-settings')"><i class="fas fa-arrow-left"></i> Back to Settings</button></div>
        <div class="table-container"><table><thead><tr><th>Employee</th><th>Type</th><th>Scanned At</th><th>Archived On</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
        </div>`;
}


let userMgmtCache = [];

async function loadUserManagement(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-user-cog"></i>User Management</div><button class="btn" onclick="loadPageContent('add-employee')"><i class="fas fa-user-plus"></i> Add Employee</button></div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>To add a new employee account, use the <strong>Add Employee</strong> button. System accounts (Manager, Treasurer, Chairman) cannot be deleted here.</div></div>
        <div class="form-row" style="margin-bottom:1rem;">
            <div class="form-col"><div class="form-group"><label>Search</label><input type="text" class="form-control" id="userMgmtSearch" placeholder="Name, staff ID, username, or email..." oninput="renderUserMgmtTable()"></div></div>
            <div class="form-col"><div class="form-group"><label>Role</label><select class="form-control" id="userMgmtRoleFilter" onchange="renderUserMgmtTable()">
                <option value="">All Roles</option>
                <option value="manager">Manager</option>
                <option value="treasurer">Treasurer</option>
                <option value="chairman">Chairman</option>
                <option value="employee">Employee</option>
            </select></div></div>
            <div class="form-col"><div class="form-group"><label>Department</label><select class="form-control" id="userMgmtDeptFilter" onchange="renderUserMgmtTable()"><option value="">All Departments</option></select></div></div>
        </div>
        <div class="table-container"><table><thead><tr><th>Staff ID</th><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead><tbody id="userMgmtBody"><tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="userMgmtPager"></div>
        </div></div>`;

    const [data, deptData] = await Promise.all([
        apiCall(`${API.SYS}?action=users`),
        apiCall(`${API.EMP}?action=departments`)
    ]);

    if (deptData.success) {
        const sel = document.getElementById('userMgmtDeptFilter');
        deptData.departments.forEach(d => {
            const option = document.createElement('option');
            option.value = d;
            option.textContent = d;
            sel.appendChild(option);
        });
    }

    if (!data.success) {
        document.getElementById('userMgmtBody').innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">Failed to load users.</td></tr>';
        return;
    }
    userMgmtCache = data.users;
    renderUserMgmtTable();
}

function renderUserMgmtTable() {
    const tbody = document.getElementById('userMgmtBody');
    if (!tbody) return;

    const term = (document.getElementById('userMgmtSearch')?.value || '').trim().toLowerCase();
    const roleFilter = document.getElementById('userMgmtRoleFilter')?.value || '';
    const deptFilter = document.getElementById('userMgmtDeptFilter')?.value || '';

    const filtered = userMgmtCache.filter(u => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (deptFilter && u.department !== deptFilter) return false;
        if (term) {
            const haystack = `${u.full_name} ${u.staff_id} ${u.username} ${u.email}`.toLowerCase();
            if (!haystack.includes(term)) return false;
        }
        return true;
    });

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">No users match your filters.</td></tr>';
        document.getElementById('userMgmtPager').innerHTML = '';
        return;
    }

    const rows = filtered.map(u => {
        const isSystem = ['manager','treasurer','chairman'].includes(u.role);
        const statusBadge = u.status === 'pending' ? '<span class="badge badge-neutral">Pending registration</span>'
            : u.status === 'active' ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>';
        const actions = isSystem ? '<span style="font-size:0.78rem;color:var(--text-light);">System Account</span>'
            : u.status === 'pending' ? `<button class="action-btn btn-sm" onclick="resendRegistrationInvite(${Number(u.id)})">Resend Invitation</button>`
            : `<button class="action-btn ${u.status==='active'?'danger':'btn-sm'} btn-sm" data-user-name="${escapeHtml(u.full_name)}" data-user-status="${escapeHtml(u.status)}" onclick="toggleUser(${Number(u.id)},this.dataset.userName,this.dataset.userStatus)">${u.status==='active'?'Deactivate':'Activate'}</button>`;
        return `<tr>
            <td>${escapeHtml(u.staff_id)}</td>
            <td>${u.status === 'pending' ? '—' : escapeHtml(u.username)}</td>
            <td>${escapeHtml(u.full_name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td><span class="badge badge-neutral">${u.role.charAt(0).toUpperCase()+u.role.slice(1)}</span></td>
            <td>${statusBadge}</td>
            <td style="font-size:0.82rem;">${u.last_login ? new Date(u.last_login).toLocaleDateString('en-PH') : 'Never'}</td>
            <td>${actions}</td>
        </tr>`;
    });
    renderPaginated('userMgmtBody', 'userMgmtPager', rows, 5);
}

async function toggleUser(id, name, currentStatus) {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate';
    const confirmResult = await showAppConfirm({
        title: `${action.charAt(0).toUpperCase()+action.slice(1)} User`,
        message: `${action.charAt(0).toUpperCase()+action.slice(1)} ${name}?`,
        confirmLabel: action.charAt(0).toUpperCase()+action.slice(1),
        danger: action === 'deactivate',
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.SYS}?action=toggle-user&id=${id}`, 'PUT');
    if (data.success) loadPageContent('user-management');
    else showToast(data.message, 'error');
}

async function loadSystemSettings(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-cog"></i>System Settings</div></div>
        <div style="padding:1.4rem;">
        <div id="settingsMsg"></div>
        <div class="tab-container">
            <div class="tabs"><div class="tab active" data-tab="general">General</div><div class="tab" data-tab="payroll-settings">Payroll</div><div class="tab" data-tab="data-archiving">Archiving</div></div>
            <div class="tab-content active" id="general-tab"><form id="generalSettingsForm" style="padding-top:1rem;">
                <div class="form-group"><label>Company Name</label><input type="text" class="form-control" name="company_name" placeholder="e.g. Trafeco Corporation"></div></div>
                <div class="form-group"><label>Address</label><textarea class="form-control" name="company_address" rows="3" placeholder="Company Address"></textarea></div>
                <div class="form-row"><div class="form-col"><div class="form-group"><label>Phone</label><input type="tel" class="form-control" name="company_phone" placeholder="+63 ..."></div></div><div class="form-col"><div class="form-group"><label>Email</label><input type="email" class="form-control" name="company_email" placeholder="hr@company.com"></div></div></div>
                <button type="submit" class="btn">Save Settings</button></form>
            </div>
            <div class="tab-content" id="payroll-settings-tab"><form id="payrollSettingsForm" style="padding-top:1rem;">
                <div class="alert alert-info"><i class="fas fa-calendar-days"></i><div><strong>Payroll schedule: Semi-monthly</strong><br>26th of the previous month through the 10th is paid on the 15th. The 11th through the 25th is paid on the 30th, or the last day in a shorter month.</div></div>
                <div class="form-group"><label>Paid Work Hours/Day (8 for 8 AM–12 PM and 1 PM–5 PM; used to convert daily rate to hourly rate)</label><input type="number" class="form-control" name="work_hours_per_day" min="1" max="24" step="0.5"></div> 
                <div class="form-group"><label>Overtime Rate Multiplier</label><input type="number" class="form-control" name="overtime_rate" value="1.25" step="0.01" min="1"></div>
                <button type="submit" class="btn">Save Settings</button></form>
            </div>
            <div class="tab-content" id="data-archiving-tab">
                <form id="archiveSettingsForm" style="padding-top:1rem;">
                    <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Archiving never deletes anything — it just moves old records out of the everyday views. They stay fully searchable under "View Archived Records," and every run saves a CSV backup you can download below.</div></div>
                    <div class="form-group"><label>Archive Records Older Than</label><select class="form-control" name="archive_after_years"><option value="1">1 Year</option><option value="2">2 Years</option><option value="3">3 Years</option></select></div>
                    <div class="checkbox-group"><input type="checkbox" name="auto_archive" id="autoArchive"><label for="autoArchive">Enable Auto-Archiving (checked automatically whenever a manager opens the Dashboard)</label></div>
                    <button type="submit" class="btn" style="margin-top:1rem;">Save</button>
                </form>

                <div style="border-top:1px solid var(--border);margin-top:1.5rem;padding-top:1.25rem;">
                    <button class="btn" onclick="previewArchive()"><i class="fas fa-box-archive"></i> Archive Now</button>
                    <button class="action-btn btn-sm" onclick="loadArchivedRecords()"><i class="fas fa-eye"></i> View Archived Records</button>
                    <div id="archivePreviewResult" style="margin-top:1rem;"></div>
                </div>

                <div style="font-weight:700;font-size:0.9rem;color:var(--green-800);margin:1.75rem 0 1rem;border-bottom:2px solid var(--green-100);padding-bottom:0.5rem;">Archive Run History</div>
                <div class="table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Triggered By</th><th>Attendance</th><th>Leave</th><th>Payslips</th><th>Export</th></tr></thead><tbody id="archiveHistoryBody"><tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
            </div>
        </div>
        </div></div>`;

    // Load current settings from DB
    const data = await apiCall(`${API.SYS}?action=settings`);
    if (data.success && data.settings) {
        const s = data.settings;
        ['company_name','company_address','company_phone','company_email','work_hours_per_day','overtime_rate','archive_after_years'].forEach(k => {
            const el = c.querySelector(`[name="${k}"]`);
            if (el && s[k] !== undefined) el.value = s[k];
        });
        const workHoursInput = c.querySelector('[name="work_hours_per_day"]');
        if (workHoursInput && (s.work_hours_per_day === undefined || Number(s.work_hours_per_day) <= 0)) workHoursInput.value = '8';

        ['auto_archive'].forEach(k => {
            const el = c.querySelector(`[name="${k}"]`);
            if (el) el.checked = s[k] === '1' || s[k] === 'true';
        });
    }

    loadArchiveHistory();

    // Attach save handlers to all forms
    ['generalSettingsForm','payrollSettingsForm','archiveSettingsForm'].forEach(formId => {
        const form = document.getElementById(formId);
        if (!form) return;
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const payload = {};
            form.querySelectorAll('[name]').forEach(el => {
                payload[el.name] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
            });
            const res = await apiCall(`${API.SYS}?action=update-settings`, 'PUT', payload);
            showMsg('settingsMsg', res.message || (res.success ? 'Settings saved.' : 'Failed to save settings.'), res.success ? 'success' : 'error');
        });
    });

    // Tab switching
    c.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', function () {
        const id = this.getAttribute('data-tab');
        c.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        c.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        this.classList.add('active');
        c.querySelector(`#${id}-tab`).classList.add('active');
    }));
}

async function loadAuditLogs(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-clipboard-list"></i>Audit Logs</div></div>
        <div style="padding:1.4rem;">
        <div class="form-row" style="align-items:flex-end;">
            <div class="form-col" style="max-width:150px;"><div class="form-group"><label>From</label><input type="date" class="form-control" id="auditFrom"></div></div>
            <div class="form-col" style="max-width:150px;"><div class="form-group"><label>To</label><input type="date" class="form-control" id="auditTo"></div></div>
            <div class="form-col" style="max-width:160px;"><div class="form-group"><label>Module</label><select class="form-control" id="auditModule"><option value="">All Modules</option></select></div></div>
            <div class="form-col" style="max-width:160px;"><div class="form-group"><label>Role</label><select class="form-control" id="auditRole"><option value="">All Roles</option><option value="manager">Manager</option><option value="treasurer">Treasurer</option><option value="chairman">Chairman</option><option value="employee">Employee</option></select></div></div>
            <div class="form-col" style="max-width:160px;"><div class="form-group"><label>User Name</label>
                <div style="display:flex;gap:0.5rem;">
                    <input type="text" class="form-control" id="auditName" placeholder="Search by name..." onkeydown="if(event.key==='Enter') fetchAuditLogs();">
                    <button class="btn btn-sm" onclick="fetchAuditLogs()" title="Search"><i class="fas fa-search"></i></button>
                </div>
            </div></div>
            <div class="form-col" style="max-width:110px;padding-top:1.6rem;"><button class="action-btn btn-sm" onclick="resetAuditFilters()"><i class="fas fa-rotate-left"></i> Reset</button></div>
        </div>
        <div class="table-container"><table><thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Module</th><th>Details</th><th>IP</th></tr></thead><tbody id="auditBody"><tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="auditPager"></div>
        </div></div>`;
    ['auditFrom','auditTo','auditModule','auditRole'].forEach(id => {
        document.getElementById(id).addEventListener('change', fetchAuditLogs);
    });
    fetchAuditLogs(true);
}

function resetAuditFilters() {
    ['auditFrom','auditTo','auditName'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('auditModule').value = '';
    document.getElementById('auditRole').value = '';
    fetchAuditLogs();
}

async function fetchAuditLogs(isFirstLoad = false) {
    const tbody = document.getElementById('auditBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">Loading...</td></tr>';

    const params = new URLSearchParams({ action: 'audit-logs' });
    const from = document.getElementById('auditFrom').value;
    const to   = document.getElementById('auditTo').value;
    const mod  = document.getElementById('auditModule').value;
    const role = document.getElementById('auditRole').value;
    const name = document.getElementById('auditName').value.trim();
    if (from) params.set('dateFrom', from);
    if (to)   params.set('dateTo', to);
    if (mod)  params.set('module', mod);
    if (role) params.set('role', role);
    if (name) params.set('name', name);

    const data = await apiCall(`${API.SYS}?${params.toString()}`);

    if (isFirstLoad && data.success && data.modules) {
        const sel = document.getElementById('auditModule');
        data.modules.forEach(m => {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = m;
            sel.appendChild(option);
        });
    }

    if (!data.success || !data.logs.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">No audit logs match these filters.</td></tr>';
        document.getElementById('auditPager').innerHTML = '';
        return;
    }
    const rows = data.logs.map(l=>`<tr>
        <td style="font-size:0.82rem;">${new Date(l.created_at).toLocaleString('en-PH')}</td>
        <td>${escapeHtml(l.user_name)}</td>
        <td><span class="badge badge-neutral">${escapeHtml(l.role)}</span></td>
        <td>${escapeHtml(l.action)}</td>
        <td>${escapeHtml(l.module)}</td>
        <td style="font-size:0.82rem;max-width:200px;">${escapeHtml(l.details||'—')}</td>
        <td style="font-size:0.78rem;">${escapeHtml(l.ip_address||'—')}</td>
    </tr>`);
    renderPaginated('auditBody', 'auditPager', rows, 15);
}
