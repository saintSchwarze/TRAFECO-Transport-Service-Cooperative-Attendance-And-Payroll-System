function generateToken() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

function loadQRAttendance(c) {
    if (currentUser.permissions.qrManage) {
        loadManagerQRView(c);
    } else {
        loadStaffQRView(c);
    }
}

async function loadManagerQRView(c) {
    c.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title"><i class="fas fa-qrcode"></i>QR Attendance Management</div>
                <button class="btn btn-sm" onclick="openQRScanner()"><i class="fas fa-camera"></i> Scan QR Code</button>
            </div>
            <div style="padding:1.4rem;">
            <div class="tab-container">
                <div class="tabs">
                    <div class="tab active" data-qrtab="qr-codes">QR Code Registry</div>
                    <div class="tab" data-qrtab="att-logs">Attendance log</div>
                    <div class="tab" data-qrtab="my-qr">My QR Code</div>
                </div>
                <div class="qr-tab-content active" id="qrtab-qr-codes">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;gap:0.75rem;flex-wrap:wrap;">
                        <span style="font-size:0.88rem;color:var(--text-light);" id="staffCountLabel">Loading staff...</span>
                        <div style="display:flex;gap:0.6rem;align-items:center;">
                            <input type="text" class="form-control" id="qrRegistrySearch" placeholder="Filter by name..." style="width:220px;" oninput="renderQRStaffGrid()">
                            <button class="btn btn-sm" onclick="generateAllQRCodes()"><i class="fas fa-bolt"></i> Generate All Missing</button>
                        </div>
                    </div>
                    <div class="qr-staff-grid" id="qrStaffGrid"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading staff...</p></div></div>
                </div>
                <div class="qr-tab-content" id="qrtab-att-logs" style="display:none;">
                    <div class="log-filters">
                        <input type="month" id="logFilterDate" title="Filter by month" onchange="renderAttLogs()" value="">
                        <div class="combobox">
                            <input type="text" id="logFilterStaffSearch" class="combobox-input" placeholder="All Staff" autocomplete="off">
                            <div id="staffComboList" class="combobox-list"></div>
                            <input type="hidden" id="logFilterStaff" value="">
                        </div>
                        <button class="action-btn secondary btn-sm" onclick="exportLogs()"><i class="fas fa-download"></i> Export CSV</button>
                        <button class="action-btn danger btn-sm" onclick="clearAllLeaveRecords()"><i class="fas fa-calendar-xmark"></i> Clear Leave Records</button>
                        <button class="action-btn danger btn-sm" onclick="clearAllLogs()" style="margin-left:auto;"><i class="fas fa-trash"></i> Clear All Logs</button>
                    </div>
                    <div class="table-container">
                        <table class="dtr-table">
                            <thead id="attLogsTableHead">
                                <tr><th rowspan="2">Date</th><th rowspan="2">Name</th><th colspan="2">A.M.</th><th colspan="2">P.M.</th></tr>
                                <tr><th>Time In</th><th>Time Out</th><th>Time In</th><th>Time Out</th></tr>
                            </thead>
                            <tbody id="attLogsTableBody"><tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">Loading logs...</td></tr></tbody>
                        </table>
                    </div>
                    <div class="pager" id="attLogsPager"></div>
                    <div id="attLogsEmpty" class="empty-state" style="display:none;">
                        <i class="fas fa-clipboard-list"></i><p>No DTR records yet.</p>
                        <small>Logs will appear here when staff scan their QR codes.</small>
                    </div>
                </div>
                <div class="qr-tab-content" id="qrtab-my-qr" style="display:none;">
                    <div id="myQRSectionMgr" style="text-align:center;padding:1rem;color:var(--text-light);">Loading QR code...</div>
                </div>
            </div>
            </div>
        </div>`;
    let myQRMgrLoaded = false;
    document.querySelectorAll('[data-qrtab]').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('[data-qrtab]').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.qr-tab-content').forEach(ct => ct.style.display = 'none');
            this.classList.add('active');
            document.getElementById('qrtab-' + this.getAttribute('data-qrtab')).style.display = 'block';
            if (this.getAttribute('data-qrtab') === 'att-logs') renderAttLogs();
            if (this.getAttribute('data-qrtab') === 'my-qr' && !myQRMgrLoaded) {
                myQRMgrLoaded = true;
                loadMyQRIntoSection('myQRSectionMgr', 'myQRCodeWrapperMgr');
            }
        });
    });
    await renderQRStaffGrid();
}

async function loadStaffQRView(c) {
    c.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title"><i class="fas fa-qrcode"></i>My QR Attendance</div>
                ${currentUser.permissions.qrScanStation ? '<button class="btn btn-sm" onclick="openQRScanner()"><i class="fas fa-camera"></i> Scan QR</button>' : ''}
            </div>
            <div style="padding:1.4rem;">
            <div class="tab-container">
                <div class="tabs">
                    <div class="tab active" data-qrtab="my-qr">My QR Code</div>
                    <div class="tab" data-qrtab="my-logs">My Attendance History</div>
                </div>
                <div class="qr-tab-content active" id="qrtab-my-qr">
                    <div id="myQRSection" style="text-align:center;padding:1rem;color:var(--text-light);">Loading QR code...</div>
                </div>
                <div class="qr-tab-content" id="qrtab-my-logs" style="display:none;">
                    <div style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;">
                        <input type="month" id="myLogsMonth" onchange="loadMyAttLogs()" style="padding:0.5rem 0.75rem;border:1.5px solid var(--border);border-radius:6px;">
                        <select id="myLogsType" onchange="loadMyAttLogs()" style="padding:0.5rem 0.75rem;border:1.5px solid var(--border);border-radius:6px;">
                            <option value="">All Types</option>
                            <option value="time_in">Time In</option>
                            <option value="time_out">Time Out</option>
                        </select>
                        <button class="action-btn btn-sm" onclick="document.getElementById('myLogsMonth').value='';document.getElementById('myLogsType').value='';loadMyAttLogs();"><i class="fas fa-rotate-left"></i> Reset</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Date &amp; Time</th><th>Type</th></tr></thead>
                            <tbody id="myLogsBody"><tr><td colspan="2" style="text-align:center;color:var(--text-light);padding:2rem;">Loading...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
            </div>
        </div>`;
    document.querySelectorAll('[data-qrtab]').forEach(tab => {
        tab.addEventListener('click', async function () {
            document.querySelectorAll('[data-qrtab]').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.qr-tab-content').forEach(ct => ct.style.display = 'none');
            this.classList.add('active');
            document.getElementById('qrtab-' + this.getAttribute('data-qrtab')).style.display = 'block';
            if (this.getAttribute('data-qrtab') === 'my-logs') await loadMyAttLogs();
        });
    });
    // Load QR code
    await loadMyQRIntoSection('myQRSection', 'myQRCodeWrapper');
}

async function loadMyQRIntoSection(sectionId, wrapperId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.innerHTML = '<div style="padding:1rem;color:var(--text-light);">Loading QR code...</div>';
    const qrData = await apiCall(`${API.QR}?action=my-qr`);
    if (qrData.success && qrData.qr) {
        const qr = qrData.qr;
        section.innerHTML = `
            <p style="color:var(--text-light);margin-bottom:0.5rem;font-size:0.9rem;">This is your personal attendance QR code.</p>
            <div class="qr-code-wrapper" id="${wrapperId}" style="display:inline-block;"></div>
            <div style="margin-top:0.5rem;font-size:0.95rem;"><strong>Employee ID:</strong> ${escapeHtml(currentUser.staffId)}</div>
            <div style="margin-top:0.75rem;font-size:0.8rem;color:var(--text-light);">Generated: ${new Date(qr.generatedAt).toLocaleString('en-PH')}</div>
            <div style="margin-top:1rem;"><button class="btn btn-sm" onclick="printMyQR('${wrapperId}')"><i class="fas fa-print"></i> Print My QR</button></div>`;
        setTimeout(() => {
            const wrapper = document.getElementById(wrapperId);
            if (wrapper) renderQRInto(wrapper, qr.qrData, 180);
        }, 100);
        section._qrData = qr.qrData;
    } else {
        section.innerHTML = `<div class="my-qr-no-code"><i class="fas fa-exclamation-triangle" style="font-size:2rem;display:block;margin-bottom:0.75rem;"></i><strong>No QR Code Generated Yet</strong><p style="margin-top:0.5rem;font-size:0.88rem;">Please ask your manager to generate a QR code for you.</p><p style="margin-top:0.75rem;font-size:0.95rem;color:var(--text);"><strong>Employee ID:</strong> ${escapeHtml(currentUser.staffId)}</p></div>`;
    }
}

async function loadMyAttLogs() {
    const tbody = document.getElementById('myLogsBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-light);padding:2rem;">Loading...</td></tr>';

    const params = new URLSearchParams({ action: 'my-logs' });
    const month = document.getElementById('myLogsMonth')?.value || '';
    const type  = document.getElementById('myLogsType')?.value || '';
    if (month) params.set('month', month);
    if (type)  params.set('scanType', type);

    const data = await apiCall(`${API.QR}?${params.toString()}`);
    if (!data.success || !data.logs.length) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-light);padding:2rem;">No attendance records match these filters.</td></tr>';
        return;
    }
    tbody.innerHTML = data.logs.map(l => `
        <tr>
            <td>${new Date(l.scanned_at).toLocaleString('en-PH')}</td>
            <td><span class="status ${l.scan_type==='time_in'?'scan-type-in':'scan-type-out'}">${l.scan_type==='time_in'?'Time In':'Time Out'}</span></td>
        </tr>`).join('');
}

function printMyQR(wrapperId) {
    wrapperId = wrapperId || 'myQRCodeWrapper';
    const sectionId = wrapperId === 'myQRCodeWrapperMgr' ? 'myQRSectionMgr' : 'myQRSection';
    const section = document.getElementById(sectionId);
    if (!section || !section._qrData) { showToast('QR code not loaded.', 'error'); return; }
    const canvas = document.querySelector(`#${wrapperId} canvas`);
    if (!canvas) { showToast('QR image not ready. Please wait a moment.', 'error'); return; }
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>QR - ${escapeHtml(currentUser.name)}</title><style>body{font-family:sans-serif;text-align:center;padding:2rem;}img{display:block;margin:1rem auto;border:1px solid #ddd;padding:0.5rem;}h2{margin:0;}p{margin:0.25rem 0;color:#666;font-size:0.85rem;}</style></head><body><h2>${escapeHtml(currentUser.name)}</h2><p>${escapeHtml(currentUser.role)} · ${escapeHtml(currentUser.department)} · ID: ${Number(currentUser.staffId) || escapeHtml(currentUser.staffId)}</p><img src="${escapeHtml(dataUrl)}" width="200"><p>Trafeco QR Attendance Code</p><script>window.print();<\/script></body></html>`);
    win.document.close();
}

async function renderQRStaffGrid() {
    const grid = document.getElementById('qrStaffGrid');
    if (!grid) return;
    // Only re-fetch from the API if we don't already have the staff list cached
    // (so typing in the filter box doesn't re-hit the server on every keystroke)
    if (!staffList.length || !grid.dataset.loaded) {
        const data = await apiCall(`${API.QR}?action=staff`);
        if (!data.success) { grid.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>${escapeHtml(data.message)}</p></div>`; return; }
        staffList = data.staff;
        grid.dataset.loaded = '1';
        // Wire up the searchable staff combobox (attendance log filter)
        initCombobox('logFilterStaff', 'logFilterStaffSearch', 'staffComboList',
            staffList.map(s => ({ id: s.id, label: s.name })),
            () => renderAttLogs(),
            'All Staff'
        );
    }
    const lbl = document.getElementById('staffCountLabel');
    if (lbl) lbl.textContent = `${staffList.length} staff members`;

    const searchTerm = (document.getElementById('qrRegistrySearch')?.value || '').trim().toLowerCase();
    const filtered = searchTerm ? staffList.filter(s => s.name.toLowerCase().includes(searchTerm)) : staffList;

    if (!filtered.length) {
        grid.innerHTML = searchTerm
            ? '<div class="empty-state"><i class="fas fa-users"></i><p>No staff match that name.</p></div>'
            : '<div class="empty-state"><i class="fas fa-users"></i><p>No staff found.</p></div>';
        return;
    }
    grid.innerHTML = filtered.map(staff => `
        <div class="qr-staff-card" id="staffcard-${staff.id}">
            <div class="qr-staff-avatar" style="overflow:hidden;">${staff.photo ? `<img src="${escapeHtml(staff.photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : escapeHtml(staff.initials.substring(0,2))}</div>
            <div class="qr-staff-info">
                <div class="qr-staff-name">${escapeHtml(staff.name)}</div>
                <div class="qr-staff-role">${escapeHtml(staff.role)} · ${escapeHtml(staff.dept)}</div>
                <span class="qr-status-badge ${staff.hasQR ? 'qr-status-generated' : 'qr-status-none'}">
                    ${staff.hasQR ? '<i class="fas fa-check-circle"></i> QR Generated' : '<i class="fas fa-times-circle"></i> No QR'}
                </span>
            </div>
            <div class="qr-card-actions">
                ${staff.hasQR ? `
                    <button class="action-btn secondary btn-sm" onclick="viewStaffQR(${staff.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="action-btn warning btn-sm" data-staff-name="${escapeHtml(staff.name)}" onclick="regenerateQR(${Number(staff.id)},this.dataset.staffName)"><i class="fas fa-rotate"></i> Regen</button>
                    <button class="action-btn danger btn-sm" data-staff-name="${escapeHtml(staff.name)}" onclick="deleteQR(${Number(staff.id)},this.dataset.staffName)"><i class="fas fa-trash"></i> Delete</button>
                ` : `
                    <button class="action-btn btn-sm" onclick="generateQRForStaff(${staff.id})"><i class="fas fa-qrcode"></i> Generate</button>
                `}
            </div>
        </div>`).join('');
}

function renderAttInCell(entry, cutoffHour) {
    const scheduledMinutes = (cutoffHour * 60) + 10; // 10-minute grace after 8:00 AM / 1:00 PM
    const actualMinutes = (entry.time.getHours() * 60) + entry.time.getMinutes();
    const autoLate = actualMinutes > scheduledMinutes;
    const effective = entry.status || (autoLate ? 'late' : 'on_time');
    const tagClass  = effective === 'late' ? 'att-tag-late' : 'att-tag-ontime';
    const tagLabel  = effective === 'late' ? 'Late' : 'On Time';
    return `${entry.str} <span class="att-tag ${tagClass}" onclick="toggleLogStatus(${entry.id}, '${effective}')" title="Click to change">${tagLabel}</span>`;
}

async function toggleLogStatus(logId, currentStatus) {
    const newStatus = currentStatus === 'late' ? 'on_time' : 'late';
    const data = await apiCall(`${API.QR}?action=set-status&id=${logId}`, 'PUT', { status: newStatus });
    if (data.success) renderAttLogs();
    else showToast(data.message, 'error');
}

async function renderAttLogs() {
    const tbody  = document.getElementById('attLogsTableBody');
    const thead  = document.getElementById('attLogsTableHead');
    const emptyEl = document.getElementById('attLogsEmpty');
    if (!tbody || !thead) return;
    
    // filterDate is YYYY-MM
    let filterDate = document.getElementById('logFilterDate')?.value;
    if (!filterDate) {
        const today = new Date();
        filterDate = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0');
        document.getElementById('logFilterDate').value = filterDate;
    }
    
    const filterStaff = document.getElementById('logFilterStaff')?.value || '';
    let url = `${API.QR}?action=logs&month=${filterDate}`;
    
    if (filterStaff) {
        url += `&userId=${filterStaff}`;
    }
    
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1rem;color:var(--text-light);">Loading...</td></tr>';

    let leaveUrl = `${API.LEAVE}?action=approved-days&month=${filterDate}`;
    if (filterStaff) leaveUrl += `&userId=${filterStaff}`;
    const [data, leavesData] = await Promise.all([apiCall(url), apiCall(leaveUrl)]);

    const leaves = (leavesData.success && leavesData.leaves) ? leavesData.leaves : [];
    const leaveDaySet = new Set();     // "userId_YYYY-MM-DD"
    const leaveNameMap = {};
    for (const lv of leaves) {
        leaveNameMap[lv.user_id] = lv.full_name;
        let d = new Date(lv.date_from + 'T00:00:00');
        const end = new Date(lv.date_to + 'T00:00:00');
        while (d <= end) {
            const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            leaveDaySet.add(lv.user_id + '_' + ds);
            d.setDate(d.getDate() + 1);
        }
    }
    if (!filterStaff) {
        // Monthly Summary View (All Staff)
        thead.innerHTML = `
            <tr><th rowspan="2">Date</th><th rowspan="2">Name</th><th colspan="2">A.M.</th><th colspan="2">P.M.</th></tr>
            <tr><th>Time In</th><th>Time Out</th><th>Time In</th><th>Time Out</th></tr>
        `;
    } else {
        // DTR 31-Day View (Single Staff)
        thead.innerHTML = `
            <tr><th rowspan="2">Day</th><th colspan="2">A.M.</th><th colspan="2">P.M.</th><th colspan="2">Undertime</th></tr>
            <tr><th>Time In</th><th>Time Out</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Minutes</th></tr>
        `;
    }

    if ((!data.success || !data.logs.length) && !leaveDaySet.size) {
        tbody.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    if (!filterStaff) {
        
        // Group by user_id and date
        const userLogs = {};
        for (const log of (data.logs || [])) {
            const dt = new Date(log.scanned_at);
            const dateStr = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
            const uid = log.user_id || log.staff_id;
            const key = uid + '_' + dateStr;
            
            if (!userLogs[key]) {
                userLogs[key] = {
                    date: dateStr,
                    name: log.full_name,
                    amIn: null, amOut: null, pmIn: null, pmOut: null
                };
            }
            
            const hour = dt.getHours();
            const timeStr = dt.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
            const r = userLogs[key];
            
            if (hour < 12 || (hour === 12 && log.scan_type === 'time_out')) {
                if (log.scan_type === 'time_in') {
                    if (!r.amIn || dt < r.amIn.time) r.amIn = { time: dt, str: timeStr, id: log.id, status: log.status_override };
                } else {
                    if (!r.amOut || dt > r.amOut.time) r.amOut = { time: dt, str: timeStr };
                }
            } else {
                if (log.scan_type === 'time_in') {
                    if (!r.pmIn || dt < r.pmIn.time) r.pmIn = { time: dt, str: timeStr, id: log.id, status: log.status_override };
                } else {
                    if (!r.pmOut || dt > r.pmOut.time) r.pmOut = { time: dt, str: timeStr };
                }
            }
        }
        
        // Fold in approved leave days that have no attendance scans of their own
        for (const key of leaveDaySet) {
            const idx = key.lastIndexOf('_');
            const uid = key.substring(0, idx);
            const dateStr = key.substring(idx + 1);
            if (!userLogs[key]) {
                userLogs[key] = { date: dateStr, name: leaveNameMap[uid] || '', amIn: null, amOut: null, pmIn: null, pmOut: null, onLeave: true };
            } else {
                userLogs[key].onLeave = true;
            }
        }

        const rows = [];

        // Sort by date descending
        const sortedKeys = Object.keys(userLogs).sort((a,b) => userLogs[b].date.localeCompare(userLogs[a].date));

        for (const key of sortedKeys) {
            const r = userLogs[key];

            if (r.onLeave && !r.amIn && !r.amOut && !r.pmIn && !r.pmOut) {
                rows.push(`
                    <tr>
                        <td class="day-col">${r.date}</td>
                        <td style="text-align:left;font-weight:600;">${escapeHtml(r.name)}</td>
                        <td colspan="4"><span class="att-tag att-tag-leave">On Leave</span></td>
                    </tr>
                `);
                continue;
            }

            const amInHtml = r.amIn ? renderAttInCell(r.amIn, 8) : '';
            const pmInHtml = r.pmIn ? renderAttInCell(r.pmIn, 13) : '';

            rows.push(`
                <tr>
                    <td class="day-col">${r.date}</td>
                    <td style="text-align:left;font-weight:600;">${escapeHtml(r.name)}</td>
                    <td>${amInHtml}</td><td>${r.amOut ? r.amOut.str : ''}</td>
                    <td>${pmInHtml}</td><td>${r.pmOut ? r.pmOut.str : ''}</td>
                </tr>
            `);
        }
        renderPaginated('attLogsTableBody', 'attLogsPager', rows, 10);
    } else {
        const daysInMonth = 31;
        let dtr = Array.from({length: daysInMonth}, (_, i) => ({ day: i + 1, amIn: null, amOut: null, pmIn: null, pmOut: null }));
        const sortedLogs = [...(data.logs || [])].sort((a,b) => new Date(a.scanned_at) - new Date(b.scanned_at));
        for (const log of sortedLogs) {
            const dt = new Date(log.scanned_at);
            const day = dt.getDate();
            const hour = dt.getHours();
            const timeStr = dt.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
            const row = dtr[day - 1];
            if (hour < 12 || (hour === 12 && log.scan_type === 'time_out')) {
                if (log.scan_type === 'time_in') {
                    if (!row.amIn) row.amIn = { time: dt, str: timeStr, id: log.id, status: log.status_override };
                } else {
                    row.amOut = { time: dt, str: timeStr };
                }
            } else {
                if (log.scan_type === 'time_in') {
                    if (!row.pmIn) row.pmIn = { time: dt, str: timeStr, id: log.id, status: log.status_override };
                } else {
                    row.pmOut = { time: dt, str: timeStr };
                }
            }
        }
        // Mark on-leave days for this staff member
        for (let i = 0; i < daysInMonth; i++) {
            const dateStr = filterDate + '-' + String(i + 1).padStart(2,'0');
            if (leaveDaySet.has(filterStaff + '_' + dateStr)) dtr[i].onLeave = true;
        }

        const rows = [];
        for (let i = 0; i < daysInMonth; i++) {
            const r = dtr[i];

            if (r.onLeave && !r.amIn && !r.amOut && !r.pmIn && !r.pmOut) {
                rows.push(`
                    <tr><td class="day-col">${r.day}</td>
                    <td colspan="6"><span class="att-tag att-tag-leave">On Leave</span></td></tr>
                `);
                continue;
            }

            const amInHtml = r.amIn ? renderAttInCell(r.amIn, 8) : '';
            const pmInHtml = r.pmIn ? renderAttInCell(r.pmIn, 13) : '';
            let totalUndertimeMins = 0;
            if (r.amIn && r.amOut && r.amOut.time.getHours() < 11) {
                totalUndertimeMins += (11 - r.amOut.time.getHours()) * 60 - r.amOut.time.getMinutes();
            }
            if (r.pmIn && r.pmOut && r.pmOut.time.getHours() < 17) {
                totalUndertimeMins += (17 - r.pmOut.time.getHours()) * 60 - r.pmOut.time.getMinutes();
            }
            let uHrs = '', uMins = '';
            if (totalUndertimeMins > 0) {
                uHrs = Math.floor(totalUndertimeMins / 60) || '';
                uMins = totalUndertimeMins % 60 || '';
            }
            rows.push(`
                <tr><td class="day-col">${r.day}</td>
                <td>${amInHtml}</td><td>${r.amOut ? r.amOut.str : ''}</td>
                <td>${pmInHtml}</td><td>${r.pmOut ? r.pmOut.str : ''}</td>
                <td>${uHrs}</td><td>${uMins}</td></tr>
            `);
        }
        renderPaginated('attLogsTableBody', 'attLogsPager', rows, 10);
    }
}

async function generateQRForStaff(userId) {
    const staff = staffList.find(s => s.id === userId);
    if (staff && staff.hasQR) { showToast('QR code already exists. Use Regenerate to replace it.', 'error'); return; }
    const data = await apiCall(`${API.QR}?action=generate`, 'POST', { userId });
    if (data.success) { document.getElementById('qrStaffGrid').dataset.loaded = ''; await renderQRStaffGrid(); viewStaffQRFromData(data.qrData, staff); }
    else showToast(data.message, 'error');
}

async function regenerateQR(userId, staffName) {
    const confirmResult = await showAppConfirm({
        title: 'Regenerate QR Code',
        message: `Regenerate QR for ${staffName}? The old code will be invalidated.`,
        confirmLabel: 'Regenerate',
        danger: true,
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.QR}?action=generate`, 'POST', { userId });
    if (data.success) { document.getElementById('qrStaffGrid').dataset.loaded = ''; await renderQRStaffGrid(); showToast('QR code regenerated for ' + staffName + '.'); }
    else showToast(data.message, 'error');
}

async function deleteQR(userId, staffName) {
    const confirmResult = await showAppConfirm({
        title: 'Delete QR Code',
        message: `Delete QR code for ${staffName}?`,
        confirmLabel: 'Delete',
        danger: true,
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.QR}?action=delete`, 'POST', { userId });
    if (data.success) { document.getElementById('qrStaffGrid').dataset.loaded = ''; await renderQRStaffGrid(); }
    else showToast(data.message, 'error');
}

async function generateAllQRCodes() {
    const missing = staffList.filter(s => !s.hasQR);
    if (!missing.length) { showToast('All staff already have QR codes.'); return; }

    const confirmResult = await showAppConfirm({
        title: 'Generate All Missing QR Codes',
        message: `Generate QR codes for ${missing.length} staff member(s) without one?`,
        confirmLabel: 'Generate All',
    });
    if (!confirmResult.confirmed) return;

    let count = 0;
    for (const s of missing) {
        const r = await apiCall(`${API.QR}?action=generate`, 'POST', { userId: s.id });
        if (r.success) count++;
    }
    document.getElementById('qrStaffGrid').dataset.loaded = '';
    await renderQRStaffGrid();
    showToast(`Generated ${count} new QR code(s).`);
}

async function viewStaffQR(userId) {
    const data = await apiCall(`${API.QR}?action=generate`, 'POST', { userId });
    // Re-fetch after generate (it upserts); get via re-render and show modal
    await renderQRStaffGrid();
    const staff = staffList.find(s => s.id === userId);
    // Need QR data — generate re-issues it
    const r = await apiCall(`${API.QR}?action=generate`, 'POST', { userId });
    if (r.success) viewStaffQRFromData(r.qrData, staff);
}

function viewStaffQRFromData(qrDataStr, staff) {
    if (!staff) return;
    document.getElementById('qrDisplayName').textContent = staff.name;
    document.getElementById('qrDisplaySub').textContent = `${staff.role} · ${staff.dept} · ID: ${staff.staffId}`;
    const wrapper = document.getElementById('qrCodeDisplay');
    wrapper.innerHTML = '';
    renderQRInto(wrapper, qrDataStr, 200);
    document.getElementById('qrDisplayModal').style.display = 'flex';
}

// viewStaffQR is now handled by viewStaffQRFromData above (kept for API compat)
function _viewStaffQR_legacy(staffId) { /* replaced */ }

function closeQRDisplayModal() { document.getElementById('qrDisplayModal').style.display = 'none'; }

function renderQRInto(container, data, size) {
    container.innerHTML = '';
    try {
        new QRCode(container, { text: data, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
        // qrcodejs sets the container's title (and the generated <img>'s
        // alt/title) to the raw encoded JSON payload — staff ID, name,
        // department, and the attendance token. Overwrite it so hovering
        // the QR code doesn't leak that data via a browser tooltip.
        container.removeAttribute('title');
        container.title = 'Employee QR Code';
        const img = container.querySelector('img');
        if (img) { img.alt = 'Employee QR Code'; img.title = 'Employee QR Code'; }
    } catch (e) {
        container.innerHTML = `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#f8f9fa;border:1px solid #ddd;border-radius:4px;font-size:0.75rem;color:var(--text-light);text-align:center;padding:0.5rem;">QR library error.<br>Check console.</div>`;
        console.error('QR generation error:', e);
    }
}

function printQRCodeFromReg(staffId) {
    // Legacy: show the modal then print
    document.getElementById('qrDisplayModal').style.display = 'flex';
    setTimeout(printQRCode, 600);
}

function printQRCode() {
    const name = document.getElementById('qrDisplayName').textContent;
    const sub  = document.getElementById('qrDisplaySub').textContent;
    const canvas = document.querySelector('#qrCodeDisplay canvas');
    if (!canvas) { showToast('QR image not ready. Please wait a moment and try again.', 'error'); return; }
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>QR - ${name}</title><style>
        body{font-family:sans-serif;text-align:center;padding:2rem;}
        img{display:block;margin:1rem auto;border:1px solid #ddd;padding:0.5rem;}
        h2{margin:0;}p{margin:0.25rem 0;color:#666;font-size:0.85rem;}
    </style></head><body>
        <h2>${name}</h2><p>${sub}</p>
        <img src="${dataUrl}" width="200"><p>Trafeco QR Attendance Code</p>
    <script>window.print();<\/script></body></html>`);
    win.document.close();
}

async function clearAllLogs() {
    const confirmResult = await showAppConfirm({
        title: 'Clear All DTR Records',
        message: 'Delete ALL DTR records? This cannot be undone.',
        confirmLabel: 'Delete All',
        danger: true,
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.QR}?action=clear-logs`, 'DELETE');
    if (data.success) { showToast('All DTR records cleared.'); renderAttLogs(); }
    else showToast(data.message, 'error');
}

async function clearAllLeaveRecords() {
    const confirmResult = await showAppConfirm({
        title: 'Clear All Leave Records',
        message: 'Delete ALL leave records (pending, approved, declined)? This cannot be undone and will remove "On Leave" tags from the DTR.',
        confirmLabel: 'Delete All',
        danger: true,
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.LEAVE}?action=clear-all`, 'DELETE');
    if (data.success) { showToast('All leave records cleared.'); renderAttLogs(); }
    else showToast(data.message, 'error');
}

async function exportLogs() {
    const data = await apiCall(`${API.QR}?action=logs`);
    if (!data.success || !data.logs.length) { showToast('No logs to export.', 'error'); return; }
    const csvCell = value => {
        let text = String(value ?? '');
        if (/^[\x00-\x20\uFEFF]*[=+@-]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    };
    const header = ['DateTime','StaffID','Name','Role','Department','ScanType'].map(csvCell).join(',') + '\n';
    const rows = data.logs.map(l => [
        new Date(l.scanned_at).toLocaleString('en-PH'), l.staff_id, l.full_name, l.role, l.department, l.scan_type,
    ].map(csvCell).join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trafeco_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// ============================================================
//  QR SCANNER
// ============================================================
function openQRScanner() {
    document.getElementById('qrScannerModal').style.display = 'flex';
    document.getElementById('scanResultBox').style.display = 'none';
    document.getElementById('manualQRInput').value = '';
    setScanType('time_in', document.getElementById('scanTypeIn'));
    startQRCamera();
}

function closeQRScanner() {
    document.getElementById('qrScannerModal').style.display = 'none';
    stopQRCamera();
}

function startQRCamera() {
    if (!window.Html5Qrcode) { console.warn('html5-qrcode not loaded'); return; }
    const readerEl = document.getElementById('html5-qr-code-reader');
    if (!readerEl) return;
    try {
        html5QrScanner = new Html5Qrcode('html5-qr-code-reader');
        html5QrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => { processQRScan(decodedText); },
            () => {}
        ).catch(err => {
            readerEl.innerHTML = `<div style="padding:1rem;background:var(--warning-bg);border-radius:8px;font-size:0.82rem;color:#e65100;text-align:center;"><i class="fas fa-exclamation-triangle"></i> Camera access denied or unavailable.<br>Use manual input below.<br><small>${err}</small></div>`;
        });
    } catch (e) {
        console.error('Scanner init error:', e);
    }
}

function stopQRCamera() {
    if (html5QrScanner) {
        html5QrScanner.stop().catch(() => {}).finally(() => {
            try { html5QrScanner.clear(); } catch (e) {}
            html5QrScanner = null;
            const el = document.getElementById('html5-qr-code-reader');
            if (el) el.innerHTML = '';
        });
    }
}

function setScanType(type, btn) {
    activeScanType = type;
    document.querySelectorAll('.scan-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function processManualQR() {
    const input = document.getElementById('manualQRInput').value.trim();
    if (!input) { showToast('Enter an employee ID first.', 'error'); return; }
    processIdScan(input);
}

async function processIdScan(staffId) {
    const data = await apiCall(`${API.QR}?action=scan-by-id`, 'POST', { staffId, scanType: activeScanType });
    if (data.success) {
        const log = data.log;
        const typeLabel = activeScanType === 'time_in' ? '✅ Time In' : '🔵 Time Out';
        showScanResult(true, `${typeLabel} recorded for <strong>${escapeHtml(log.name)}</strong> (${escapeHtml(log.role)})<br><small>${new Date().toLocaleString('en-PH')}</small>`);
        document.getElementById('manualQRInput').value = '';
        if (document.getElementById('attLogsTableBody')) renderAttLogs();
    } else {
        showScanResult(false, escapeHtml(data.message || 'ID scan failed.'));
    }
}

async function processQRScan(rawData) {
    let parsed;
    try { parsed = JSON.parse(rawData); } catch {
        showScanResult(false, 'Invalid QR code. Not a Trafeco attendance code.');
        return;
    }
    if (!parsed.trafeco_qr) {
        showScanResult(false, 'This QR code is not from Trafeco attendance system.');
        return;
    }
    const data = await apiCall(`${API.QR}?action=scan`, 'POST', { qrData: rawData, scanType: activeScanType });
    if (data.success) {
        const log = data.log;
        const typeLabel = activeScanType === 'time_in' ? '✅ Time In' : '🔵 Time Out';
        showScanResult(true, `${typeLabel} recorded for <strong>${escapeHtml(log.name)}</strong> (${escapeHtml(log.role)})<br><small>${new Date().toLocaleString('en-PH')}</small>`);
        if (document.getElementById('attLogsTableBody')) renderAttLogs();
    } else {
        showScanResult(false, escapeHtml(data.message || 'Scan failed.'));
    }
}

function showScanResult(success, msg) {
    const box = document.getElementById('scanResultBox');
    box.className = `scan-result-box ${success ? 'success' : 'error'}`;
    box.innerHTML = msg;
    box.style.display = 'block';
    if (success) setTimeout(() => { box.style.display = 'none'; }, 4000);
}


// ============================================================
//  GENERIC TABLE PAGINATION
// ============================================================
