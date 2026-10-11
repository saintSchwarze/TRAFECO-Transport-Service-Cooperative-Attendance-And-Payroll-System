function toggleSidebar() {
    document.querySelector('.sidebar')?.classList.toggle('open');
    document.querySelector('.sidebar-overlay')?.classList.toggle('open');
}
function closeSidebar() {
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('open');
}

// ============================================================
//  RESPONSIVE TABLES (desktop table -> mobile stacked cards)
//  Reads each table's own <thead> and stamps every matching <td>
//  with data-label="<column name>", so the CSS card layout (see
//  styles.css) can show "Label: value" on narrow screens without
//  any table-rendering function needing to be touched individually.
// ============================================================
function generateDashboard() {
    const mainContent = document.querySelector('.main-content');
    generateSidebar(currentUser);
    const today = new Date().toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const initials = currentUser.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    mainContent.innerHTML = `
        <div class="header">
            <div style="display:flex;align-items:center;gap:0.85rem;min-width:0;">
                <button class="sidebar-toggle" onclick="toggleSidebar()" title="Menu" aria-label="Open navigation menu"><i class="fas fa-bars"></i></button>
                <div style="min-width:0;">
                    <h1 id="pageHeaderTitle">${escapeHtml(currentUser.role)} Dashboard</h1>
                    <div style="font-size:0.78rem;color:var(--text-light);margin-top:0.1rem;">${today}</div>
                </div>
            </div>
            <div class="user-info">
                <div class="notif-wrap">
                    <button class="notif-bell" onclick="toggleNotifPanel(event)" title="Notifications">
                        <i class="fas fa-bell"></i>
                        <span class="notif-badge" id="notifBadge">0</span>
                    </button>
                    <div class="notif-panel" id="notifPanel">
                        <div class="notif-panel-head">
                            <span>Notifications</span>
                            <div style="display:flex;gap:0.75rem;">
                                <a href="#" onclick="markAllNotifsRead(event)" style="font-size:0.75rem;font-weight:400;color:var(--green-700);">Mark all read</a>
                                <a href="#" onclick="clearAllNotifs(event)" style="font-size:0.75rem;font-weight:400;color:var(--danger,#c62828);">Clear all</a>
                            </div>
                        </div>
                        <div class="notif-list" id="notifList"><div class="notif-empty">Loading...</div></div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:600;font-size:0.9rem;" id="userRole">${escapeHtml(currentUser.role)}</div>
                    <div style="font-size:0.78rem;color:var(--text-light);" id="userName">${escapeHtml(currentUser.name)} · ${escapeHtml(currentUser.department)}</div>
                </div>
                <div id="headerAvatar" style="width:36px;height:36px;border-radius:50%;background:var(--gold);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;overflow:hidden;">${currentUser.profilePicture ? `<img src="${escapeHtml(currentUser.profilePicture)}" style="width:100%;height:100%;object-fit:cover;">` : escapeHtml(initials)}</div>
            </div>
        </div>
        <div id="pageContent" style="padding:1.5rem 1.75rem;flex:1;"></div>`;
    loadNotifications();
    startNotifPolling();
    document.getElementById('changePasswordForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const np  = document.getElementById('newPassword').value;
        const cnp = document.getElementById('confirmNewPassword').value;
        if (np !== cnp) { showToast('New passwords do not match.', 'error'); return; }
        const currentPassword = document.getElementById('currentPassword').value;
        const data = await apiCall(`${API.AUTH}?action=change-password`, 'POST', { currentPassword, newPassword: np });
        if (data.success) {
            showToast('Password changed successfully!');
            this.reset(); this.closest('.modal').style.display = 'none';
        } else {
            showToast(data.message || 'Failed to change password.', 'error');
        }
    });
    loadPageContent('dashboard');
    setupLogout();
}

// ============================================================
//  Generic searchable combobox (reusable anywhere a name-list
//  filter is needed - styled dropdown, no native browser UI)
// ============================================================
function refreshUserDisplay() {
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    if (nameEl) nameEl.textContent = `${currentUser.name} · ${currentUser.department}`;
    if (roleEl) roleEl.textContent = currentUser.role;

    const pillName = document.querySelector('.user-pill-name');
    if (pillName) pillName.textContent = currentUser.name;

    const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatarTargets = [document.getElementById('headerAvatar'), document.querySelector('.user-avatar')].filter(Boolean);
    avatarTargets.forEach(container => {
        container.replaceChildren();
        if (!currentUser.profilePicture) {
            container.textContent = initials;
            return;
        }
        const img = document.createElement('img');
        const separator = currentUser.profilePicture.includes('?') ? '&' : '?';
        img.src = `${currentUser.profilePicture}${separator}t=${Date.now()}`;
        img.alt = `${currentUser.name} profile picture`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        img.addEventListener('error', () => { container.textContent = initials; }, { once: true });
        container.appendChild(img);
    });
}

// ============================================================
//  SIDEBAR
// ============================================================
function generateSidebar(user) {
    const existing = document.querySelector('.sidebar');
    if (existing) existing.remove();

    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    const initials = user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    let menu = `
        <div class="sidebar-header">
            <h2>TRAFECO</h2>
            <div class="app-sub">Payroll &amp; HR System</div>
        </div>
        <div class="user-pill">
            <div class="user-avatar" style="overflow:hidden;">${user.profilePicture ? `<img src="${escapeHtml(user.profilePicture)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : escapeHtml(initials)}</div>
            <div>
                    <div class="user-pill-name">${escapeHtml(user.name)}</div>
                <div class="user-pill-role">${escapeHtml(user.role)} · ${escapeHtml(user.department)}</div>
            </div>
        </div>
        <div class="sidebar-menu"><ul>
        <li><a href="#" class="nav-link" data-page="dashboard"><i class="fas fa-tachometer-alt"></i> <span>Dashboard</span></a></li>`;

    if (user.permissions.viewOwnProfile) {
        menu += `<li><a href="#" class="nav-link" data-page="my-profile"><i class="fas fa-id-card"></i> <span>My Profile</span></a></li>`;
    }

    if (user.permissions.viewOtherEmployees) {
        menu += `<li><a href="#" class="nav-link has-submenu" data-page="employees"><i class="fas fa-users"></i> <span>Employees</span> <i class="fas fa-chevron-right nav-arrow" style="margin-left:auto;font-size:0.7rem;transition:transform 0.2s;"></i></a>
            <ul class="submenu">
                ${user.permissions.viewOtherEmployees ? '<li><a href="#" class="nav-link" data-page="employee-list">Employee List</a></li>' : ''}
                ${user.permissions.viewOtherEmployees ? '<li><a href="#" class="nav-link" data-page="employee-profiles">Employee Profiles</a></li>' : ''}
                ${user.permissions.createEditEmployees ? '<li><a href="#" class="nav-link" data-page="add-employee">Add Employee</a></li>' : ''}
            </ul></li>`;
    }

    if (user.permissions.initiatePayroll || user.permissions.validatePayroll || user.permissions.viewOwnPaystubs) {
        menu += `<li><a href="#" class="nav-link has-submenu" data-page="payroll"><i class="fas fa-money-check"></i> <span>Payroll</span> <i class="fas fa-chevron-right nav-arrow" style="margin-left:auto;font-size:0.7rem;transition:transform 0.2s;"></i></a>
            <ul class="submenu">
                ${user.permissions.viewOtherEmployees ? '<li><a href="#" class="nav-link" data-page="payroll-history">Payroll History</a></li>' : ''}
                <li><a href="#" class="nav-link" data-page="payslips">Payslips</a></li>
                ${user.permissions.generatePayslips ? '<li><a href="#" class="nav-link" data-page="generate-payroll">Generate Payroll</a></li>' : ''}
                ${user.permissions.validatePayroll ? '<li><a href="#" class="nav-link" data-page="approve-payroll">Approve Payroll</a></li>' : ''}
                ${user.permissions.validatePayroll ? '<li><a href="#" class="nav-link" data-page="validate-payroll">Validate Payslip</a></li>' : ''}
                ${user.permissions.generatePayslips ? '<li><a href="#" class="nav-link" data-page="thirteenth-month">13th Month Pay</a></li>' : ''}
            </ul></li>`;
    }

    if (user.permissions.requestLeave) {
        menu += `<li><a href="#" class="nav-link has-submenu" data-page="leave-benefits"><i class="fas fa-calendar-check"></i> <span>Leave</span> <i class="fas fa-chevron-right nav-arrow" style="margin-left:auto;font-size:0.7rem;transition:transform 0.2s;"></i></a>
            <ul class="submenu">
                ${user.permissions.requestLeave ? '<li><a href="#" class="nav-link" data-page="request-leave">Request Leave</a></li>' : ''}
                ${user.permissions.approveLeave ? '<li><a href="#" class="nav-link" data-page="approve-leave">Approve Leave</a></li>' : ''}
            </ul></li>`;
    }

    if (user.permissions.generateReports || user.permissions.generateFinancialReports) {
        menu += `<li><a href="#" class="nav-link has-submenu" data-page="reports"><i class="fas fa-chart-bar"></i> <span>Reports</span> <i class="fas fa-chevron-right nav-arrow" style="margin-left:auto;font-size:0.7rem;transition:transform 0.2s;"></i></a>
            <ul class="submenu">
                <li><a href="#" class="nav-link" data-page="attendance-report">Attendance Report</a></li>
                <li><a href="#" class="nav-link" data-page="payroll-report">Payroll Report</a></li>
                ${user.permissions.generateFinancialReports ? '<li><a href="#" class="nav-link" data-page="financial-report">Financial Report</a></li>' : ''}
            </ul></li>`;
    }



    if (user.permissions.userManagement || user.permissions.configureSystem || user.permissions.accessAuditTrail) {
        menu += `<li><a href="#" class="nav-link has-submenu" data-page="system"><i class="fas fa-cog"></i> <span>System</span> <i class="fas fa-chevron-right nav-arrow" style="margin-left:auto;font-size:0.7rem;transition:transform 0.2s;"></i></a>
            <ul class="submenu">
                ${user.permissions.userManagement ? '<li><a href="#" class="nav-link" data-page="user-management">User Management</a></li>' : ''}
                ${user.permissions.configureSystem ? '<li><a href="#" class="nav-link" data-page="system-settings">System Settings</a></li>' : ''}
                ${user.permissions.accessAuditTrail ? '<li><a href="#" class="nav-link" data-page="audit-logs">Audit Logs</a></li>' : ''}
            </ul></li>`;
    }

    if (user.permissions.qrScan || user.permissions.qrManage) {
        menu += `<li><a href="#" class="nav-link" data-page="qr-attendance"><i class="fas fa-qrcode"></i> <span>QR Attendance</span></a></li>`;
    }

    menu += `</ul></div>
        <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> <span>Sign Out</span></a>`;
    sidebar.innerHTML = menu;
    document.getElementById('dashboardPage').insertBefore(sidebar, document.querySelector('.main-content'));

    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeSidebar;
        document.getElementById('dashboardPage').insertBefore(overlay, sidebar.nextSibling);
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (this.classList.contains('has-submenu')) {
                const sub = this.nextElementSibling;
                const arrow = this.querySelector('.nav-arrow');
                if (sub) sub.classList.toggle('active');
                if (arrow) arrow.style.transform = sub && sub.classList.contains('active') ? 'rotate(90deg)' : '';
            } else if (page) {
                loadPageContent(page);
                activePage = page;
                document.querySelectorAll('.nav-link').forEach(l => { l.classList.remove('active'); l.parentElement.classList.remove('active'); });
                this.classList.add('active');
                this.parentElement.classList.add('active');
                // Update header title
                const titleEl = document.getElementById('pageHeaderTitle');
                if (titleEl) titleEl.textContent = this.textContent.trim();
                closeSidebar(); // no-op on desktop, where the drawer classes are never shown anyway
            }
        });
    });
}

// ============================================================
//  PAGE ROUTING
// ============================================================
function loadPageContent(page) {
    const pc = document.getElementById('pageContent');
    switch (page) {
        case 'dashboard':          loadDashboardContent(pc); break;
        case 'employees':
        case 'my-profile':         loadMyProfile(pc); break;
        case 'employee-list':      loadEmployeeList(pc); break;
        case 'employee-profiles':  loadEmployeeProfiles(pc); break;
        case 'add-employee':       loadAddEmployee(pc); break;
        case 'payroll':
        case 'payroll-history':    loadPayrollHistory(pc); break;
        case 'generate-payroll':   loadGeneratePayroll(pc); break;
        case 'approve-payroll':    loadApprovePayroll(pc); break;
        case 'payslips':           loadPayslips(pc); break;
        case 'validate-payroll':   loadValidatePayroll(pc); break;
        case 'thirteenth-month':   loadThirteenthMonth(pc); break;
        case 'leave-benefits':
        case 'request-leave':      loadRequestLeave(pc); break;
        case 'approve-leave':      loadApproveLeave(pc); break;
        case 'reports':
        case 'attendance-report':  loadAttendanceReport(pc); break;
        case 'payroll-report':     loadPayrollReport(pc); break;
        case 'financial-report':   loadFinancialReport(pc); break;
        case 'management':
        case 'system':
        case 'user-management':    loadUserManagement(pc); break;
        case 'system-settings':    loadSystemSettings(pc); break;
        case 'audit-logs':         loadAuditLogs(pc); break;
        case 'qr-attendance':      loadQRAttendance(pc); break;
        default:                   loadDashboardContent(pc);
    }
}

// ============================================================
//  DASHBOARD CONTENT
// ============================================================
function widget(id, title, icon, color) {
    return `<div class="widget"><div class="widget-header"><div class="widget-title">${title}</div><i class="fas ${icon}" style="color:${color};"></i></div><div class="widget-value" id="${id}">—</div></div>`;
}

async function loadDashboardContent(c) {
    const role = currentUser.role;
    let widgets = '', extra = '';

    if (role === 'Manager') {
        widgets = `<div class="dashboard-widgets">
            ${widget('wgTotalEmp', 'Total Employees', 'fa-users', 'var(--green-500)')}
            ${widget('wgPendingLeave', 'Pending Leave', 'fa-clock', 'var(--warning)')}
            ${widget('wgPendingSlips', 'Pending Payslips', 'fa-file-invoice-dollar', 'var(--gold)')}
            ${widget('wgQrIssued', 'QR Codes Issued', 'fa-qrcode', 'var(--green-600)')}
            ${widget('wgScansToday', 'Scans Today', 'fa-camera', 'var(--green-500)')}
        </div>
        <div class="dashboard-grid" style="display:grid;grid-template-columns:1.3fr 1fr;gap:1.25rem;margin-top:1.25rem;">
            <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-chart-column"></i>Attendance This Month</div></div>
                <div style="padding:1.25rem;"><canvas id="dashAttChart" height="110"></canvas></div></div>
            <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-user-clock"></i>Pending Leave Requests</div></div>
                <div style="padding:1rem;" id="dashLeaveList"><div style="text-align:center;color:var(--text-light);padding:1.5rem;">Loading...</div></div></div>
        </div>
        <div class="card" style="margin-top:1.25rem;"><div class="card-header"><div class="card-title"><i class="fas fa-list"></i>Recent Attendance Activity</div></div>
            <div class="table-container"><table><thead><tr><th>Name</th><th>Type</th><th>Time</th></tr></thead><tbody id="dashRecentLogs"><tr><td colspan="3" style="text-align:center;padding:1.5rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
            <div class="pager" id="dashRecentLogsPager" style="padding-bottom:1rem;"></div></div>`;
    } else if (role === 'Treasurer') {
        widgets = `<div class="dashboard-widgets">
            ${widget('wgPendingSlips', 'Pending Payslips', 'fa-file-invoice-dollar', 'var(--gold)')}
            ${widget('wgPendingBatches', 'Payroll Awaiting Approval', 'fa-people-group', 'var(--warning)')}
            ${widget('wgRevisionNeeded', 'Needs Revision', 'fa-rotate-left', 'var(--danger)')}
            ${widget('wgNetThisMonth', "This Month's Net Payroll", 'fa-sack-dollar', 'var(--green-600)')}
        </div>
        <div class="card" style="margin-top:1.25rem;"><div class="card-header"><div class="card-title"><i class="fas fa-chart-line"></i>Payroll Trend (Last 6 Months)</div></div>
            <div style="padding:1.25rem;"><canvas id="dashPayrollChart" height="90"></canvas></div></div>
        <div class="card" style="margin-top:1.25rem;"><div class="card-header"><div class="card-title"><i class="fas fa-history"></i>Recent Payroll Batches</div></div>
            <div class="table-container"><table><thead><tr><th>Cutoff</th><th>Employees</th><th>Total Net</th><th>Status</th></tr></thead><tbody id="dashRecentBatches"><tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div></div>`;
    } else if (role === 'Chairman') {
        widgets = `<div class="dashboard-widgets">
            ${widget('wgTotalEmp', 'Total Employees', 'fa-users', 'var(--green-500)')}
            ${widget('wgPendingSlips', 'Payslips Awaiting Approval', 'fa-file-invoice-dollar', 'var(--gold)')}
            ${widget('wgPendingBatches', 'Payroll Awaiting Approval', 'fa-people-group', 'var(--warning)')}
            ${widget('wgPendingLeave', 'Leave Awaiting Approval', 'fa-clock', 'var(--danger)')}
        </div>
        <div class="card" style="margin-top:1.25rem;"><div class="card-header"><div class="card-title"><i class="fas fa-chart-line"></i>Payroll Trend (Last 6 Months)</div></div>
            <div style="padding:1.25rem;"><canvas id="dashPayrollChart" height="90"></canvas></div></div>
        <div class="dashboard-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-top:1.25rem;">
            <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-people-group"></i>Pending Payroll Batches</div></div>
                <div style="padding:1rem;" id="dashPendingBatchesList"><div style="text-align:center;color:var(--text-light);padding:1.5rem;">Loading...</div></div></div>
            <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-user-clock"></i>Pending Leave Requests</div></div>
                <div style="padding:1rem;" id="dashLeaveList"><div style="text-align:center;color:var(--text-light);padding:1.5rem;">Loading...</div></div></div>
        </div>`;
    } else {
        widgets = `
            <div class="alert alert-info"><i class="fas fa-info-circle"></i><div><strong>Welcome back, ${escapeHtml(currentUser.name)}!</strong></div></div>
            <div class="dashboard-widgets">
                <div class="widget"><div class="widget-header"><div class="widget-title">My QR Status</div><i class="fas fa-qrcode" style="color:var(--green-500);"></i></div><div class="widget-value" id="wgMyQR">—</div><div style="font-size:0.85rem;margin-top:0.5rem;" id="wgMyQRLink"></div></div>
                ${widget('wgDaysPresent', 'Days Present This Month', 'fa-calendar-check', 'var(--green-600)')}
                ${widget('wgNetThisMonth', "This Month's Net Pay", 'fa-sack-dollar', 'var(--gold)')}
            </div>
            <div class="dashboard-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-top:1.25rem;">
                <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-clock-rotate-left"></i>Recent Attendance</div></div>
                    <div class="table-container"><table><thead><tr><th>Type</th><th>Time</th></tr></thead><tbody id="dashMyLogs"><tr><td colspan="2" style="text-align:center;padding:1.5rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div></div>
                <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-file-invoice-dollar"></i>Recent Payslips</div></div>
                    <div class="table-container"><table><thead><tr><th>Period</th><th>Net Pay</th><th>Status</th></tr></thead><tbody id="dashMyPayslips"><tr><td colspan="3" style="text-align:center;padding:1.5rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div></div>
            </div>`;
    }
    c.innerHTML = widgets;

    // Live stats
    const data = await apiCall(`${API.SYS}?action=dashboard-stats`);
    if (data.success && data.stats) {
        const s = data.stats;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('wgTotalEmp', s.total_employees ?? '—');
        set('wgPendingLeave', s.pending_leave ?? '—');
        set('wgPendingSlips', s.pending_payslips ?? '—');
        set('wgScansToday', s.scans_today ?? '—');
        set('wgQrIssued', s.qr_issued ?? '—');
        set('wgPendingBatches', s.pending_payroll_batches ?? '—');
        set('wgRevisionNeeded', s.revision_needed ?? '—');
        set('wgNetThisMonth', s.net_this_month !== undefined ? peso(s.net_this_month) : '—');
        set('wgDaysPresent', s.days_present_this_month ?? '—');
    }

    // Employee QR status
    if (document.getElementById('wgMyQR')) {
        const qrData = await apiCall(`${API.QR}?action=my-qr`);
        if (qrData.success) {
            const hasQR = !!qrData.qr;
            document.getElementById('wgMyQR').textContent = hasQR ? 'Active' : 'Not Generated';
            const lnk = document.getElementById('wgMyQRLink');
            if (lnk) lnk.innerHTML = hasQR ? '<a href="#" style="color:var(--green-700);" onclick="loadPageContent(\'qr-attendance\')">View My QR Code</a>' : 'Ask manager to generate';
        }
    }

    // Role-specific widgets
    if (role === 'Manager') {
        loadDashAttendanceChart();
        loadDashLeaveList();
        loadDashRecentLogs();
    } else if (role === 'Treasurer') {
        loadDashPayrollChart();
        loadDashRecentBatches();
    } else if (role === 'Chairman') {
        loadDashPayrollChart();
        loadDashPendingBatchesList();
        loadDashLeaveList();
    } else {
        loadDashMyLogs();
        loadDashMyPayslips();
    }
}

async function loadDashAttendanceChart() {
    const el = document.getElementById('dashAttChart');
    if (!el) return;
    const month = new Date().toISOString().slice(0, 7);
    const data = await apiCall(`${API.QR}?action=daily-summary&month=${month}`);
    if (!data.success) return;
    const labels = data.days.map(d => new Date(d.d).getDate());
    const values = data.days.map(d => parseInt(d.cnt));
    new Chart(el, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Employees Present', data: values, backgroundColor: '#2E7D32' }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

async function loadDashPayrollChart() {
    const el = document.getElementById('dashPayrollChart');
    if (!el) return;
    const data = await apiCall(`${API.PAYSLIPS}?action=monthly-totals`);
    if (!data.success) return;
    const labels = data.months.map(m => new Date(m.ym + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    new Chart(el, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Gross Pay', data: data.months.map(m => m.total_gross), borderColor: '#81C784', backgroundColor: 'transparent', tension: 0.3 },
                { label: 'Net Pay', data: data.months.map(m => m.total_net), borderColor: '#2E7D32', backgroundColor: 'transparent', tension: 0.3 },
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

async function loadDashLeaveList() {
    const el = document.getElementById('dashLeaveList');
    if (!el) return;
    const data = await apiCall(`${API.LEAVE}?action=pending`);
    if (!data.success || !data.requests.length) { el.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:1.5rem;">No pending leave requests.</div>'; return; }
    el.innerHTML = data.requests.slice(0, 5).map(r => `
        <div style="display:flex;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
            <span><strong>${escapeHtml(r.employee_name)}</strong> — ${escapeHtml(r.leave_type)}</span>
            <span style="color:var(--text-light);">${escapeHtml(r.date_from)} to ${escapeHtml(r.date_to)}</span>
        </div>`).join('') + '<div style="text-align:right;margin-top:0.75rem;"><a href="#" onclick="loadPageContent(\'approve-leave\')" style="color:var(--green-700);font-size:0.85rem;">View all →</a></div>';
}

async function loadDashRecentLogs() {
    const el = document.getElementById('dashRecentLogs');
    if (!el) return;
    const data = await apiCall(`${API.QR}?action=logs`);
    if (!data.success || !data.logs.length) {
        el.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:var(--text-light);">No attendance activity yet.</td></tr>';
        document.getElementById('dashRecentLogsPager').innerHTML = '';
        return;
    }
    const rows = data.logs.map(l => `<tr>
        <td>${escapeHtml(l.full_name)}</td>
        <td>${l.scan_type === 'time_in' ? 'Time In' : 'Time Out'}</td>
        <td>${new Date(l.scanned_at).toLocaleString('en-PH')}</td>
    </tr>`);
    renderPaginated('dashRecentLogs', 'dashRecentLogsPager', rows, 5);
}

async function loadDashRecentBatches() {
    const el = document.getElementById('dashRecentBatches');
    if (!el) return;
    const data = await apiCall(`${API.PAYSLIPS}?action=payroll-batches`);
    if (!data.success || !data.batches.length) { el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-light);">No payroll batches yet.</td></tr>'; return; }
    el.innerHTML = data.batches.slice(0, 5).map(b => {
        const sc = b.status==='approved'?'status-completed':b.status==='declined'?'status-rejected':'status-pending';
        return `<tr>
            <td>${escapeHtml(b.cutoff_start)} to ${escapeHtml(b.cutoff_end)}</td>
            <td>${b.employee_count}</td>
            <td>${peso(b.total_net)}</td>
            <td><span class="status ${sc}">${escapeHtml(b.status.charAt(0).toUpperCase()+b.status.slice(1))}</span></td>
        </tr>`;
    }).join('');
}

async function loadDashPendingBatchesList() {
    const el = document.getElementById('dashPendingBatchesList');
    if (!el) return;
    const data = await apiCall(`${API.PAYSLIPS}?action=payroll-batches-pending`);
    if (!data.success || !data.batches.length) { el.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:1.5rem;">Nothing pending.</div>'; return; }
    el.innerHTML = data.batches.slice(0, 5).map(b => `
        <div style="display:flex;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
            <span>${escapeHtml(b.cutoff_start)} to ${escapeHtml(b.cutoff_end)}</span>
            <span style="color:var(--text-light);">${peso(b.total_net)}</span>
        </div>`).join('') + '<div style="text-align:right;margin-top:0.75rem;"><a href="#" onclick="loadPageContent(\'approve-payroll\')" style="color:var(--green-700);font-size:0.85rem;">Review →</a></div>';
}

async function loadDashMyLogs() {
    const el = document.getElementById('dashMyLogs');
    if (!el) return;
    const data = await apiCall(`${API.QR}?action=my-logs`);
    if (!data.success || !data.logs.length) { el.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:1.5rem;color:var(--text-light);">No attendance yet.</td></tr>'; return; }
    el.innerHTML = data.logs.slice(0, 5).map(l => `<tr>
        <td>${l.scan_type === 'time_in' ? 'Time In' : 'Time Out'}</td>
        <td>${new Date(l.scanned_at).toLocaleString('en-PH')}</td>
    </tr>`);
}

async function loadDashMyPayslips() {
    const el = document.getElementById('dashMyPayslips');
    if (!el) return;
    const data = await apiCall(`${API.PAYSLIPS}?action=my-list`);
    if (!data.success || !data.payslips.length) { el.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:var(--text-light);">No payslips yet.</td></tr>'; return; }
    el.innerHTML = data.payslips.slice(0, 3).map(p => {
        const sc = p.status==='approved'?'status-completed':p.status==='declined'?'status-rejected':'status-pending';
        return `<tr>
            <td>${escapeHtml(p.pay_period)}</td>
            <td>${peso(p.net_pay)}</td>
            <td><span class="status ${sc}">${escapeHtml(p.status.charAt(0).toUpperCase()+p.status.slice(1))}</span></td>
        </tr>`;
    });
}

// ============================================================
//  QR ATTENDANCE — Core Functions
// ============================================================
