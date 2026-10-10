async function populateDeptDropdown(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const data = await apiCall(`${API.EMP}?action=departments`);
    if (data.success) {
        data.departments.forEach(d => {
            const option = document.createElement('option');
            option.value = d;
            option.textContent = d;
            sel.appendChild(option);
        });
    }
}

function exportReportCsv(filename, headers, rows) {
    const cell = value => {
        let text = String(value ?? '');
        if (/^[\x00-\x20\uFEFF]*[=+@-]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

let attRptCache = [];
let payRptCache = [];

async function loadAttendanceReport(c) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfMonth = `${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-${String(first.getDate()).padStart(2,'0')}`;
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-chart-bar"></i>Attendance Report</div></div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Shows employees’ recorded time in and time out scans for the selected dates. Export downloads the results as a CSV file.</div></div>
        <div class="form-row" style="align-items:flex-end;"><div class="form-col"><div class="form-group"><label>From</label><input type="date" class="form-control" id="attRptFrom" value="${firstOfMonth}"></div></div><div class="form-col"><div class="form-group"><label>To</label><input type="date" class="form-control" id="attRptTo" value="${today}"></div></div><div class="form-col"><div class="form-group"><label>Department</label><select class="form-control" id="attRptDept"><option value="">All Departments</option></select></div></div><div class="form-col" style="display:flex;gap:.5rem;align-items:flex-end;"><button class="btn" onclick="fetchAttendanceReport()"><i class="fas fa-search"></i> Generate</button><button class="action-btn btn-sm" onclick="exportAttendanceReport()"><i class="fas fa-file-csv"></i> Export CSV</button></div></div>
        <div class="table-container"><table><thead><tr><th>Employee</th><th>Staff ID</th><th>Department</th><th>Days Present</th><th>Days Out</th><th>First Scan</th><th>Last Scan</th></tr></thead><tbody id="attRptBody"><tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="attRptPager"></div>
        </div></div>`;
    await populateDeptDropdown('attRptDept');
    await fetchAttendanceReport();
}

async function fetchAttendanceReport() {
    const from = document.getElementById('attRptFrom')?.value || '';
    const to   = document.getElementById('attRptTo')?.value || '';
    const dept = document.getElementById('attRptDept')?.value || '';
    const tbody = document.getElementById('attRptBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">Loading...</td></tr>';
    const data = await apiCall(`${API.REPORTS}?action=attendance&dateFrom=${from}&dateTo=${to}&department=${encodeURIComponent(dept)}`);
    if (!data.success || !data.report.length) {
        attRptCache = [];
        document.getElementById('attRptPager').innerHTML = '';
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">No data found for the selected period.</td></tr>';
        return;
    }
    attRptCache = data.report;
    const rows = data.report.map(r=>`<tr>
        <td>${escapeHtml(r.full_name)}</td>
        <td>${escapeHtml(r.staff_id)}</td>
        <td>${escapeHtml(r.department||'—')}</td>
        <td>${r.days_present}</td>
        <td>${r.days_out}</td>
        <td style="font-size:0.82rem;">${r.first_scan ? new Date(r.first_scan).toLocaleDateString('en-PH') : '—'}</td>
        <td style="font-size:0.82rem;">${r.last_scan ? new Date(r.last_scan).toLocaleDateString('en-PH') : '—'}</td>
    </tr>`);
    renderPaginated('attRptBody', 'attRptPager', rows, 10);
}

function exportAttendanceReport() {
    if (!attRptCache.length) { showToast('Generate a report with results first.', 'error'); return; }
    exportReportCsv('trafeco_attendance_report.csv',
        ['Employee', 'Staff ID', 'Department', 'Days Present', 'Days Out', 'First Scan', 'Last Scan'],
        attRptCache.map(r => [r.full_name, r.staff_id, r.department, r.days_present, r.days_out, r.first_scan, r.last_scan]));
}

async function loadPayrollReport(c) {
    const year = new Date().getFullYear();
    let yearOpts = '<option value="">All Years</option>';
    for (let y = year; y >= year - 4; y--) yearOpts += `<option value="${y}" ${y===year?'selected':''}>${y}</option>`;
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-chart-line"></i>Payroll Report</div><button class="btn btn-sm" onclick="exportPayrollReport()"><i class="fas fa-file-csv"></i> Export CSV</button></div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Summarizes generated payslips by calendar week, month, quarter, or year. Includes pending, approved, and declined payslips, shown separately by status.</div></div>
        <div class="form-row" style="align-items:flex-end;"><div class="form-col" style="max-width:200px;"><div class="form-group"><label>Group results by</label><select class="form-control" id="payRptGroup"><option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option></select></div></div><div class="form-col" style="max-width:200px;"><div class="form-group"><label>Year</label><select class="form-control" id="payRptYear">${yearOpts}</select></div></div><div class="form-col" style="padding-top:1.6rem;"><button class="btn" onclick="fetchPayrollReport()"><i class="fas fa-search"></i> Generate</button></div></div>
        <div class="table-container"><table><thead><tr><th>Period</th><th>Employees</th><th>Total Gross</th><th>SSS</th><th>PhilHealth</th><th>Pag-IBIG</th><th>Tax</th><th>Net Pay</th><th>Status</th></tr></thead><tbody id="payRptBody"><tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="payRptPager"></div>
        </div></div>`;
    fetchPayrollReport();   
}

async function fetchPayrollReport() {
    const year = document.getElementById('payRptYear')?.value || '';
    const group = document.getElementById('payRptGroup')?.value || 'monthly';
    const tbody = document.getElementById('payRptBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;">Loading...</td></tr>';
    const data = await apiCall(`${API.REPORTS}?action=payroll&group=${encodeURIComponent(group)}${year ? '&year='+year : ''}`);
    if (!data.success || !data.report.length) {
        payRptCache = [];
        document.getElementById('payRptPager').innerHTML = '';
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light);">No payroll data available.</td></tr>';
        return;
    }
    payRptCache = data.report;
    const fmt = n => '₱' + parseFloat(n||0).toLocaleString('en-PH',{minimumFractionDigits:2});
    const rows = data.report.map(r=>`<tr>
        <td>${escapeHtml(r.pay_period)}</td>
        <td>${r.employee_count}</td>
        <td>${fmt(r.total_gross)}</td>
        <td>${fmt(r.total_sss)}</td>
        <td>${fmt(r.total_philhealth)}</td>
        <td>${fmt(r.total_pagibig)}</td>
        <td>${fmt(r.total_tax)}</td>
        <td><strong>${fmt(r.total_net)}</strong></td>
        <td><span class="badge badge-${r.status==='approved'?'success':r.status==='declined'?'danger':'neutral'}">${escapeHtml(r.status)}</span></td>
    </tr>`);
    renderPaginated('payRptBody', 'payRptPager', rows, 10);
}

function exportPayrollReport() {
    if (!payRptCache.length) { showToast('Generate a report with results first.', 'error'); return; }
    const group = document.getElementById('payRptGroup')?.value || 'monthly';
    exportReportCsv(`trafeco_payroll_report_${group}_${document.getElementById('payRptYear')?.value || 'all'}.csv`,
        ['Period', 'Employees', 'Total Gross', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Tax', 'Net Pay', 'Status'],
        payRptCache.map(r => [r.pay_period, r.employee_count, r.total_gross, r.total_sss, r.total_philhealth, r.total_pagibig, r.total_tax, r.total_net, r.status]));
}

async function loadFinancialReport(c) {
    const year = new Date().getFullYear();
    let yearOpts = '';
    for (let y = year; y >= year - 4; y--) yearOpts += `<option value="${y}" ${y===year?'selected':''}>${y}</option>`;
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-chart-pie"></i>Financial Report</div>
        <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-sm" onclick="printFinancialReport()"><i class="fas fa-print"></i> Print</button>
            <button class="btn btn-sm" onclick="exportFinancialReportCSV()"><i class="fas fa-file-csv"></i> Export CSV</button>
        </div>
        </div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Use this report to review approved payroll costs: gross pay, deductions, net payroll, and department totals. Employer contribution amounts are estimates for budgeting, not official remittance figures. Choose how the detailed results are grouped.</div></div>
        <div class="form-row" style="align-items:flex-end;"><div class="form-col" style="max-width:200px;"><div class="form-group"><label>Group results by</label><select class="form-control" id="finRptGroup"><option value="monthly" selected>Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div></div><div class="form-col" style="max-width:200px;"><div class="form-group"><label>Year</label><select class="form-control" id="finRptYear">${yearOpts}</select></div></div><div class="form-col" style="padding-top:1.6rem;"><button class="btn" onclick="fetchFinancialReport()"><i class="fas fa-search"></i> Generate</button></div></div>

        <div id="finRptContent">
            <div id="finRptStats" class="stats-grid" style="margin:1rem 0;"></div>

            <div style="font-weight:700;color:var(--green-800);margin:1.25rem 0 0.6rem;">Gross-to-Net Breakdown</div>
            <div class="table-container"><table><thead><tr><th>Total Gross Pay</th><th>Total Allowances / Bonuses</th><th>Total Deductions</th><th>Total Withholding Tax</th><th>Final Net Payable</th></tr></thead><tbody id="finRptBreakdownBody"><tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>

            <div style="font-weight:700;color:var(--green-800);margin:1.25rem 0 0.6rem;">Estimated Employer Government Contributions</div>
            <div class="alert alert-info" style="margin-bottom:0.75rem;"><i class="fas fa-info-circle"></i><div>These are <strong>estimates</strong> based on standard SSS / PhilHealth / Pag-IBIG / EC contribution-sharing ratios — this system only stores the employee's deducted share. Confirm against your actual remittance tables before filing.</div></div>
            <div class="table-container"><table><thead><tr><th>SSS (Employer Share)</th><th>PhilHealth (Employer Share)</th><th>Pag-IBIG (Employer Share)</th><th>EC Premium</th><th>Total Employer Liability</th></tr></thead><tbody id="finRptEmployerBody"><tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>

            <div style="font-weight:700;color:var(--green-800);margin:1.25rem 0 0.6rem;">Breakdown by Department</div>
            <div class="table-container"><table><thead><tr><th>Department</th><th>Employees Paid</th><th>Total Gross</th><th>Total Deductions</th><th>Total Net</th></tr></thead><tbody id="finRptDeptBody"><tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>

            <div style="font-weight:700;color:var(--green-800);margin:1.25rem 0 0.6rem;">Detailed Breakdown</div>
            <div class="table-container"><table><thead><tr><th>Period</th><th>Payslips</th><th>Gross</th><th>Allowances</th><th>Deductions</th><th>Tax</th><th>Net Pay</th></tr></thead><tbody id="finRptBody"><tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
            <div class="pager" id="finRptPager"></div>
        </div>
        </div></div>`;
    fetchFinancialReport();
}

let finRptCache = null;

async function fetchFinancialReport() {
    const year = document.getElementById('finRptYear')?.value || new Date().getFullYear();
    const group = document.getElementById('finRptGroup')?.value || 'monthly';
    const tbody = document.getElementById('finRptBody');
    const statsEl = document.getElementById('finRptStats');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">Loading...</td></tr>';
    const data = await apiCall(`${API.REPORTS}?action=financial&year=${year}&group=${encodeURIComponent(group)}`);
    if (!data.success) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">Error loading data.</td></tr>'; return; }
    finRptCache = data;

    const fmt = n => '₱' + parseFloat(n||0).toLocaleString('en-PH',{minimumFractionDigits:2});
    const t = data.totals || {};

    if (statsEl) statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-value">${fmt(data.totalPayroll)}</div><div class="stat-label">Total Net Payroll (${year})</div></div>
        <div class="stat-card"><div class="stat-value">${fmt(t.total_gross)}</div><div class="stat-label">Total Gross Pay (${year})</div></div>
        <div class="stat-card"><div class="stat-value">${t.payslip_count || 0}</div><div class="stat-label">Approved Payslips (${year})</div>
    `;

    document.getElementById('finRptBreakdownBody').innerHTML = `<tr>
        <td>${fmt(t.total_gross)}</td>
        <td>${fmt(t.total_allowances)}</td>
        <td>${fmt(t.total_deductions)}</td>
        <td>${fmt(t.total_tax)}</td>
        <td><strong>${fmt(t.total_net)}</strong></td>
    </tr>`;

    const ec = data.employerContributions || {};
    document.getElementById('finRptEmployerBody').innerHTML = `<tr>
        <td>${fmt(ec.sss)}</td>
        <td>${fmt(ec.philhealth)}</td>
        <td>${fmt(ec.pagibig)}</td>
        <td>${fmt(ec.ec)}</td>
        <td><strong>${fmt(ec.total)}</strong></td>
    </tr>`;

    const deptBody = document.getElementById('finRptDeptBody');
    if (!data.departments || !data.departments.length) {
        deptBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-light);">No department data for this year.</td></tr>';
    } else {
        deptBody.innerHTML = data.departments.map(d => `<tr>
            <td>${escapeHtml(d.department)}</td>
            <td>${d.employee_count}</td>
            <td>${fmt(d.total_gross)}</td>
            <td>${fmt(d.total_deductions)}</td>
            <td><strong>${fmt(d.total_net)}</strong></td>
        </tr>`).join('');
    }

    if (!data.report.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">No approved payslips for this year.</td></tr>';
        document.getElementById('finRptPager').innerHTML = '';
        return;
    }
    const rows = data.report.map(r=>`<tr>
        <td>${escapeHtml(r.report_period)}</td>
        <td>${r.payslip_count}</td>
        <td>${fmt(r.total_gross)}</td>
        <td>${fmt(r.total_allowances)}</td>
        <td>${fmt(r.total_deductions)}</td>
        <td>${fmt(r.total_tax)}</td>
        <td><strong>${fmt(r.total_net)}</strong></td>
    </tr>`);
    renderPaginated('finRptBody', 'finRptPager', rows, 12);
}

function printFinancialReport() {
    const content = document.getElementById('finRptContent');
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Financial Report</title><style>
        body{font-family:sans-serif;padding:1.5rem;font-size:12px;color:#222;}
        table{width:100%;border-collapse:collapse;margin-bottom:1.25rem;}
        th,td{padding:6px 8px;border:1px solid #ddd;font-size:11px;text-align:left;}
        thead{background:#f1f3f1;}
        .stats-grid{display:flex;gap:1rem;margin-bottom:1rem;}
        .stat-card{border:1px solid #ddd;border-radius:6px;padding:0.75rem 1rem;}
        .stat-value{font-size:1.1rem;font-weight:700;}
        .stat-label{font-size:0.75rem;color:#666;}
        .alert{display:none;}
        .pager{display:none;}
    </style></head><body><h2>Financial Report</h2>${content.innerHTML}<script>window.print();<\\/script></body></html>`);
    win.document.close();
}

function exportFinancialReportCSV() {
    if (!finRptCache) { showToast('Generate the report first.', 'error'); return; }
    const csvCell = value => {
        let text = String(value ?? '');
        if (/^[\x00-\x20\uFEFF]*[=+@-]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    };
    const t = finRptCache.totals || {};
    const ec = finRptCache.employerContributions || {};
    const group = document.getElementById('finRptGroup')?.value || 'monthly';
    let csv = `Financial Report,${finRptCache.year},Grouped by ${group}\n\n`;
    csv += 'Gross-to-Net Breakdown\n';
    csv += 'Total Gross,Total Allowances,Total Deductions,Total Tax,Final Net Payable\n';
    csv += `${t.total_gross},${t.total_allowances},${t.total_deductions},${t.total_tax},${t.total_net}\n\n`;
    csv += 'Estimated Employer Contributions\n';
    csv += 'SSS,PhilHealth,Pag-IBIG,EC,Total\n';
    csv += `${ec.sss},${ec.philhealth},${ec.pagibig},${ec.ec},${ec.total}\n\n`;
    csv += 'Department Breakdown\n';
    csv += 'Department,Employees,Gross,Deductions,Net\n';
    (finRptCache.departments||[]).forEach(d => { csv += `${csvCell(d.department)},${d.employee_count},${d.total_gross},${d.total_deductions},${d.total_net}\n`; });
    csv += `\n${group[0].toUpperCase()+group.slice(1)} Breakdown\n`;
    csv += 'Period,Payslips,Gross,Allowances,Deductions,Tax,Net\n';
    (finRptCache.report||[]).forEach(r => { csv += `${csvCell(r.report_period)},${r.payslip_count},${r.total_gross},${r.total_allowances},${r.total_deductions},${r.total_tax},${r.total_net}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trafeco_financial_report_${group}_${finRptCache.year}.csv`;
    a.click();
}

