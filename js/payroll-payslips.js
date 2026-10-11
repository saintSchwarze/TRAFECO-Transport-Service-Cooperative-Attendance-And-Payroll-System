async function loadGeneratePayslip(c) {
    c.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title"><i class="fas fa-file-invoice-dollar"></i>Generate &amp; Submit Payslips</div>
                <button class="btn" onclick="openPayslipModal()"><i class="fas fa-plus"></i>Generate Payslip</button>
            </div>
            <div style="padding:1.4rem;">
            <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Click <strong>Generate Payslip</strong> to select an employee, compute pay, and submit for chairman approval.</div></div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Employee</th><th>Period</th><th>Gross Pay</th><th>Net Pay</th><th>Generated</th><th>Status</th></tr></thead>
                    <tbody id="payslipTableBody">
                        <tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">Loading payslips...</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="pager" id="payslipPager"></div>
            </div>
        </div>`;
    await refreshPayslipTable();
}

// ============================================================
//  GENERATE PAYROLL (treasurer, batch)
// ============================================================
function loadGeneratePayroll(c) {
    const now = new Date();
    let monthOptions = '';
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        monthOptions += `<option value="${value}"${i === 0 ? ' selected' : ''}>${d.toLocaleDateString('en-US',{year:'numeric',month:'long'})}</option>`;
    }

    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-people-group"></i>Generate Payroll</div></div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Attendance from the 26th of the previous month through the 10th is paid on the 15th. Attendance from the 11th through the 25th is paid on the 30th (or the month's last day when there is no 30th).</div></div>
        <div class="form-row" style="margin-bottom:1rem;">
            <div class="form-col"><div class="form-group"><label>Pay Month</label><select id="prMonth" class="form-control" onchange="prToggleCutoff()">${monthOptions}</select></div></div>
            <div class="form-col"><div class="form-group"><label>Cutoff</label><select id="prCutoff" class="form-control" disabled>
                <option value="first">Pay 15th: 26th previous month to 10th</option>
                <option value="second">Pay 30th / month-end: 11th to 25th</option>
            </select></div></div>
            <div class="form-col" style="display:flex;align-items:flex-end;"><button class="btn" style="width:100%;" onclick="prGenerate()"><i class="fas fa-play"></i> Generate Payroll</button></div>
        </div>
        <div id="prCutoffPreview" class="alert alert-info" style="display:none;"></div>
        <div id="prResult"></div>
        <div id="prNeedsRevision" style="margin-top:2rem;"></div>
        </div></div>`;
    document.getElementById('prCutoff').addEventListener('change', prToggleCutoff);
    prToggleCutoff();
    prLoadNeedsRevision();
}

function prToggleCutoff() {
    const period = document.getElementById('prMonth').value;
    const cutoff = document.getElementById('prCutoff');
    const preview = document.getElementById('prCutoffPreview');
    cutoff.disabled = !period;
    if (!period) { preview.style.display = 'none'; return; }
    const dates = prComputeCutoff(period, cutoff.value);
    preview.textContent = `Cutoff: ${dates.cutoffStart} to ${dates.cutoffEnd}. Scheduled pay date: ${dates.payDate}. This preview does not generate payroll.`;
    preview.style.display = 'block';
}

async function prLoadNeedsRevision() {
    const el = document.getElementById('prNeedsRevision');
    if (!el) return;
    const data = await apiCall(`${API.PAYSLIPS}?action=payroll-batches&status=declined&batchType=regular`);
    if (!data.success || !data.batches.length) { el.innerHTML = ''; return; }
    el.innerHTML = `
        <div style="font-weight:700;font-size:0.95rem;color:var(--danger);margin-bottom:0.75rem;border-bottom:2px solid #fde2e2;padding-bottom:0.5rem;"><i class="fas fa-rotate-left"></i> Needs Revision</div>
        <div class="table-container"><table><thead><tr><th>Cutoff</th><th>Reason</th><th>Sent Back By</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>${data.batches.map(b => {
            const currentSchedule = ['first', 'second'].some(half => {
                const dates = prComputeCutoff(b.pay_period, half);
                return dates.cutoffStart === b.cutoff_start && dates.cutoffEnd === b.cutoff_end;
            });
            return `<tr>
            <td>${escapeHtml(b.cutoff_start)} to ${escapeHtml(b.cutoff_end)}</td>
            <td style="max-width:260px;font-size:0.85rem;">${escapeHtml(b.remarks || '—')}</td>
            <td>${escapeHtml(b.approved_by_name || '—')}</td>
            <td>${new Date(b.approved_at || b.created_at).toLocaleDateString('en-PH')}</td>
            <td>${currentSchedule ? `<button class="action-btn btn-sm" data-cutoff-start="${escapeHtml(b.cutoff_start)}" data-cutoff-end="${escapeHtml(b.cutoff_end)}" data-pay-period="${escapeHtml(b.pay_period)}" data-pay-date="${escapeHtml(b.pay_date || '')}" onclick="prRegenerateBatchFromButton(this)"><i class="fas fa-rotate"></i> Regenerate</button>` : 'Previous cutoff; create a new payroll using the current schedule.'}</td>
        </tr>`;
        }).join('')}</tbody></table></div>
    `;
}

function prRegenerateBatchFromButton(button) {
    return prRegenerateBatch(button.dataset.cutoffStart, button.dataset.cutoffEnd, button.dataset.payPeriod, button.dataset.payDate || null);
}

async function prRegenerateBatch(cutoffStart, cutoffEnd, payPeriod, payDate) {
    const confirmResult = await showAppConfirm({
        title: 'Regenerate Payroll',
        message: `Regenerate payroll for ${cutoffStart} to ${cutoffEnd}? This recomputes it fresh from the current DTR and sends it back to the chairman.`,
        confirmLabel: 'Regenerate',
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.PAYSLIPS}?action=generate-payroll`, 'POST', { payPeriod, cutoffStart, cutoffEnd, payDate });
    if (data.success) {
        showToast(data.message);
        prLoadNeedsRevision();
        document.getElementById('prResult').innerHTML = '';
    } else {
        showToast(data.message, 'error');
    }
}

function prComputeCutoff(period, half) {
    const [y, m] = period.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const formatDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (half === 'first') {
        const previousMonth26 = new Date(y, m - 2, 26);
        return { cutoffStart: formatDate(previousMonth26), cutoffEnd: `${period}-10`, payDate: `${period}-15` };
    }
    const payDay = Math.min(30, lastDay);
    return { cutoffStart: `${period}-11`, cutoffEnd: `${period}-25`, payDate: `${period}-${String(payDay).padStart(2,'0')}` };
}

async function prGenerate() {
    const period = document.getElementById('prMonth').value;
    const half   = document.getElementById('prCutoff').value;
    const resultEl = document.getElementById('prResult');
    if (!period) { showToast('Please select a month.', 'error'); return; }

    const { cutoffStart, cutoffEnd, payDate } = prComputeCutoff(period, half);

    const confirmResult = await showAppConfirm({
        title: 'Generate Payroll',
        message: `Generate payroll for all active employees from ${cutoffStart} to ${cutoffEnd}, scheduled for payment on ${payDate}?`,
        confirmLabel: 'Generate Payroll',
    });
    if (!confirmResult.confirmed) return;

    resultEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-light);">Computing payroll for all employees...</div>';

    const data = await apiCall(`${API.PAYSLIPS}?action=generate-payroll`, 'POST', { payPeriod: period, cutoffStart, cutoffEnd, payDate });
    if (!data.success) { resultEl.innerHTML = `<div class="alert alert-info">${escapeHtml(data.message)}</div>`; return; }

    const totalGross = data.created.reduce((s,r)=>s+parseFloat(r.grossPay),0);
    const totalNet    = data.created.reduce((s,r)=>s+parseFloat(r.netPay),0);
    resultEl.innerHTML = `
        <div class="alert alert-info"><i class="fas fa-check-circle"></i><div>${escapeHtml(data.message)}</div></div>
        <div class="table-container"><table><thead>
            <tr><th rowspan="2">ID</th><th rowspan="2">Name</th><th rowspan="2">Type</th><th rowspan="2">Rate/hr</th><th rowspan="2">Hours Rendered</th><th rowspan="2">Gross</th><th colspan="3">Deductions</th><th rowspan="2">Net Pay</th></tr>
            <tr><th>SSS</th><th>Pag-IBIG</th><th>PhilHealth</th></tr>
        </thead>
        <tbody>${data.created.map(r => `<tr>
            <td>${r.employeeUserId}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.employmentType)}</td>
            <td>${peso(r.hourlyRate)}</td>
            <td>${r.hoursRendered}</td>
            <td>${peso(r.grossPay)}</td>
            <td>${peso(r.sss)}</td>
            <td>${peso(r.pagibig)}</td>
            <td>${peso(r.philhealth)}</td>
            <td><strong>${peso(r.netPay)}</strong></td>
        </tr>`).join('')}</tbody>
        <tfoot><tr class="total-row"><td colspan="5"><strong>Total</strong></td><td><strong>${peso(totalGross)}</strong></td><td colspan="3"></td><td><strong>${peso(totalNet)}</strong></td></tr></tfoot>
        </table></div>
        <div style="margin-top:1rem;color:var(--text-light);font-size:0.85rem;">Submitted to the chairman for approval. Individual payslips become viewable once the chairman decides — see Payroll → Approve Payroll or Payroll History.</div>
    `;
    prLoadNeedsRevision();
}

// ============================================================
//  APPROVE PAYROLL (chairman, batch)
// ============================================================
function payrollBatchPeriodText(batch) {
    return batch.batch_type === '13th_month'
        ? `13th Month Pay ${String(batch.pay_period).slice(-4)}`
        : `${batch.cutoff_start} to ${batch.cutoff_end}`;
}

async function loadApprovePayroll(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-people-group"></i>Approve Payroll</div></div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Review a payroll batch, then approve or decline it for everyone included at once.</div></div>
        <div class="table-container"><table><thead><tr><th>Cutoff / Annual Period</th><th>Employees</th><th>Total Gross</th><th>Total Net</th><th>Submitted By</th><th>Date</th><th>Actions</th></tr></thead><tbody id="apPayrollBody"><tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        </div></div>`;

    const data = await apiCall(`${API.PAYSLIPS}?action=payroll-batches-pending`);
    const tbody = document.getElementById('apPayrollBody');
    if (!data.success || !data.batches.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">No payroll batches pending approval.</td></tr>';
        return;
    }
    tbody.innerHTML = data.batches.map(b => `<tr>
        <td>${escapeHtml(payrollBatchPeriodText(b))}</td>
        <td>${b.employee_count}</td>
        <td>${peso(b.total_gross)}</td>
        <td><strong>${peso(b.total_net)}</strong></td>
        <td>${escapeHtml(b.generated_by_name)}</td>
        <td>${new Date(b.created_at).toLocaleDateString('en-PH')}</td>
        <td><button class="action-btn btn-sm" onclick="openPayrollBatchDetail(${b.id}, true)"><i class="fas fa-eye"></i> Review</button></td>
    </tr>`).join('');
}

let payrollBatchEmployees = [];   // cached payslip rows for the currently open batch
let payrollBatchMeta = { id: null, canViewPayslips: false };

async function openPayrollBatchDetail(id, showActions) {
    const data = await apiCall(`${API.PAYSLIPS}?action=payroll-batch-detail&id=${id}`);
    if (!data.success) { showToast(data.message, 'error'); return; }

    payslipDocCache = data.payslips;
    payrollBatchEmployees = data.payslips;
    const b = data.batch;
    const sc = b.status==='approved'?'status-completed':b.status==='declined'?'status-rejected':'status-pending';

    const canViewPayslips = b.status !== 'pending'; // payslips only "real" once decided
    const isAnnual = b.batch_type === '13th_month';
    payrollBatchMeta = { id, canViewPayslips, isAnnual };
    const totalGross = data.payslips.reduce((s,p)=>s+parseFloat(p.gross_pay),0);
    const totalNet    = data.payslips.reduce((s,p)=>s+parseFloat(p.net_pay),0);
    const totalUnpaidDeductions = data.payslips.reduce((s,p)=>s+parseFloat(p.unpaid_deduction_amount || 0),0);

    document.getElementById('payrollBatchDetail').innerHTML = `
        <div class="payslip-doc-grid" style="margin-bottom:1rem;">
            <div><span>${isAnnual ? 'Annual period: ' : 'Cutoff: '}</span><strong>${escapeHtml(payrollBatchPeriodText(b))}</strong></div>
            <div><span>Pay Date: </span><strong>${escapeHtml(b.pay_date || '—')}</strong></div>
            <div><span>Submitted By: </span><strong>${escapeHtml(b.generated_by_name)}</strong></div>
            <div><span>Total Net: </span><strong>${peso(b.total_net)}</strong></div>
            ${isAnnual ? '' : `<div><span>Uncollected deductions (not carried forward): </span><strong>${peso(totalUnpaidDeductions)}</strong></div>`}
            <div><span>Status: </span><strong><span class="status ${sc}">${b.status.charAt(0).toUpperCase()+b.status.slice(1)}</span></strong></div>
            <div><span>Decided By: </span><strong>${escapeHtml(b.approved_by_name || '—')}</strong></div>
        </div>
        ${b.remarks ? `<div style="margin-bottom:1rem;color:var(--text-light);font-size:0.85rem;"><strong>Remarks:</strong> ${escapeHtml(b.remarks)}</div>` : ''}
        <div class="form-row" style="margin-bottom:0.85rem;">
            <div class="form-col"><input type="text" class="form-control" id="pbdSearch" placeholder="Search by name or staff ID..." oninput="renderPayrollBatchTable()"></div>
            <div class="form-col" style="max-width:220px;"><select class="form-control" id="pbdDeptFilter" onchange="renderPayrollBatchTable()"><option value="">All Departments</option></select></div>
        </div>
        <div class="table-container"><table><thead>
            ${isAnnual
                ? `<tr><th>Staff ID</th><th>Employee</th><th>Department</th><th>Approved basic pay</th><th>13th-month pay</th>${canViewPayslips ? '<th>Actions</th>' : ''}</tr>`
                : `<tr><th rowspan="2">ID</th><th rowspan="2">Name</th><th rowspan="2">Department</th><th rowspan="2">Type</th><th rowspan="2">Rate/hr</th><th rowspan="2">Hours Rendered</th><th rowspan="2">Gross</th><th colspan="3">Calculated deductions</th><th rowspan="2">Uncollected</th><th rowspan="2">Net Pay</th>${canViewPayslips ? '<th rowspan="2">Actions</th>' : ''}</tr><tr><th>SSS</th><th>Pag-IBIG</th><th>PhilHealth</th></tr>`}
        </thead>
        <tbody id="pbdBody"></tbody>
        <tfoot><tr class="total-row">${isAnnual
            ? `<td colspan="3"><strong>Total (${data.payslips.length} employees)</strong></td><td><strong>${peso(data.payslips.reduce((s,p)=>s+parseFloat(p.thirteenth_month_basis || 0),0))}</strong></td><td><strong>${peso(totalNet)}</strong></td>${canViewPayslips ? '<td></td>' : ''}`
            : `<td colspan="6"><strong>Total (all ${data.payslips.length})</strong></td><td><strong>${peso(totalGross)}</strong></td><td colspan="3"></td><td><strong>${peso(totalUnpaidDeductions)}</strong></td><td><strong>${peso(totalNet)}</strong></td>${canViewPayslips ? '<td></td>' : ''}`}</tr></tfoot>
        </table></div>
        <div class="pager" id="pbdPager"></div>
        ${showActions ? `
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.25rem;">
            <button class="action-btn danger" onclick="apDecideBatch(${id}, 'decline')"><i class="fas fa-rotate-left"></i> Send Back for Revision</button>
            <button class="action-btn" style="background:var(--success);" onclick="apDecideBatch(${id}, 'approve')"><i class="fas fa-check"></i> ${isAnnual ? 'Approve 13th-Month Batch' : 'Approve Payroll'}</button>
        </div>` : ''}
    `;

    // Department dropdown only lists departments actually present in this batch
    const depts = [...new Set(data.payslips.map(p => p.department).filter(Boolean))].sort();
    const deptSel = document.getElementById('pbdDeptFilter');
        depts.forEach(d => {
            const option = document.createElement('option');
            option.value = d;
            option.textContent = d;
            deptSel.appendChild(option);
        });

    renderPayrollBatchTable();
    document.getElementById('payrollBatchModal').style.display = 'flex';
}

function renderPayrollBatchTable() {
    const tbody = document.getElementById('pbdBody');
    if (!tbody) return;
    const term = (document.getElementById('pbdSearch')?.value || '').trim().toLowerCase();
    const dept = document.getElementById('pbdDeptFilter')?.value || '';
    const canViewPayslips = payrollBatchMeta.canViewPayslips;
    const isAnnual = payrollBatchMeta.isAnnual;

    const filtered = payrollBatchEmployees.filter(p => {
        if (dept && p.department !== dept) return false;
        if (term) {
            const haystack = `${p.employee_name} ${p.staff_id}`.toLowerCase();
            if (!haystack.includes(term)) return false;
        }
        return true;
    });

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="${isAnnual ? (canViewPayslips ? 6 : 5) : (canViewPayslips?13:12)}" style="text-align:center;padding:2rem;color:var(--text-light);">No employees match your filters.</td></tr>`;
        document.getElementById('pbdPager').innerHTML = '';
        return;
    }

    const rows = filtered.map(p => isAnnual ? `<tr>
        <td>${escapeHtml(p.staff_id)}</td><td>${escapeHtml(p.employee_name)}</td><td>${escapeHtml(p.department || '—')}</td>
        <td>${peso(p.thirteenth_month_basis)}</td><td><strong>${peso(p.net_pay)}</strong></td>
        ${canViewPayslips ? `<td><button class="action-btn btn-sm" onclick="viewPayslipDoc(${p.id})"><i class="fas fa-eye"></i> View Payslip</button></td>` : ''}
    </tr>` : `<tr>
        <td>${escapeHtml(p.staff_id)}</td>
        <td>${escapeHtml(p.employee_name)}</td>
        <td>${escapeHtml(p.department || '—')}</td>
        <td>${p.employment_type}</td>
        <td>${peso(p.hourly_rate_used)}</td>
        <td>${p.hours_rendered ?? 0}</td>
        <td>${peso(p.gross_pay)}</td>
        <td>${peso(p.sss_gsis)}</td>
        <td>${peso(p.pagibig)}</td>
        <td>${peso(p.philhealth)}</td>
        <td>${peso(p.unpaid_deduction_amount || 0)}</td>
        <td><strong>${peso(p.net_pay)}</strong></td>
        ${canViewPayslips ? `<td><button class="action-btn btn-sm" onclick="viewPayslipDoc(${p.id})"><i class="fas fa-eye"></i> View Payslip</button></td>` : ''}
    </tr>`);
    renderPaginated('pbdBody', 'pbdPager', rows, 10);
}

async function apDecideBatch(id, decision) {
    let remarks = '';
    if (decision === 'decline') {
        const confirmResult = await showAppConfirm({
            title: 'Send Back for Revision',
            message: 'Send this payroll batch back to the treasurer for revision?',
            confirmLabel: 'Send Back',
            danger: true,
            needsRemarks: true,
            remarksLabel: 'What needs to be fixed? (visible to the treasurer)',
        });
        if (!confirmResult.confirmed) return;
        remarks = confirmResult.remarks;
    } else {
        const confirmResult = await showAppConfirm({
            title: payrollBatchMeta.isAnnual ? 'Approve 13th-Month Batch' : 'Approve Payroll',
            message: payrollBatchMeta.isAnnual
                ? 'Approve this entire annual 13th-month batch? Every included employee payslip will be approved together.'
                : 'Approve this ENTIRE payroll batch? Every payslip in it will be marked approved.',
            confirmLabel: payrollBatchMeta.isAnnual ? 'Approve Annual Batch' : 'Approve',
        });
        if (!confirmResult.confirmed) return;
    }
    const data = await apiCall(`${API.PAYSLIPS}?action=${decision}-payroll-batch&id=${id}`, 'PUT', { remarks });
    if (data.success) {
        showToast(data.message);
        document.getElementById('payrollBatchModal').style.display = 'none';
        loadPageContent('approve-payroll');
    } else {
        showToast(data.message, 'error');
    }
}

function loadThirteenthMonth(c) {
    const yearNow = new Date().getFullYear();
    let yearOptions = '';
    for (let y = yearNow; y >= yearNow - 3; y--) yearOptions += `<option value="${y}">${y}</option>`;

    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-gift"></i>13th Month Pay</div></div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Preview and submit one annual batch for chairman approval. Amounts use approved regular payslips for the selected calendar year. Confirm payroll records and employee eligibility before submitting.</div></div>
        <div class="form-row" style="margin-bottom:1rem;">
            <div class="form-col"><div class="form-group"><label>Year</label><select id="tmYearSelect" class="form-control">${yearOptions}</select></div></div>
            <div class="form-col" style="display:flex;align-items:flex-end;"><button class="btn" style="width:100%;" onclick="tmPreview()"><i class="fas fa-calculator"></i> Preview Annual Batch</button></div>
        </div>
        <div id="tmResult"></div>
        </div></div>`;
}

async function tmPreview() {
    const year  = document.getElementById('tmYearSelect').value;
    const resultEl = document.getElementById('tmResult');
    resultEl.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-light);">Computing...</div>';
    const data = await apiCall(`${API.PAYSLIPS}?action=thirteenth-month-batch-preview&year=${year}`);
    if (!data.success) { resultEl.innerHTML = `<div class="alert alert-info">${escapeHtml(data.message)}</div>`; return; }
    const blocked = data.existingBatch;
    const rows = data.employees.map(e => `<tr>
        <td>${escapeHtml(e.staff_id)}</td><td>${escapeHtml(e.full_name)}</td><td>${escapeHtml(e.department || '—')}</td>
        <td style="text-align:right;">${peso(e.total_basic)}</td><td style="text-align:right;">${peso(e.thirteenth_month)}</td>
        <td>${e.can_generate ? 'Ready' : escapeHtml(e.existing_status || 'No eligible approved pay')}</td>
    </tr>`).join('');
    resultEl.innerHTML = `
        ${blocked ? `<div class="alert alert-info">A ${year} 13th-month batch is already ${escapeHtml(blocked.status)}. View it in Payroll History.</div>` : ''}
        <div class="table-container"><table><thead><tr><th>Staff ID</th><th>Employee</th><th>Department</th><th style="text-align:right;">Approved basic pay for year</th><th style="text-align:right;">Calculated 13th-month pay</th><th>Status</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:1.5rem;">No approved payroll records found for this year.</td></tr>'}</tbody>
        <tfoot><tr class="total-row"><td colspan="3"><strong>Batch total (${data.eligibleCount} employee(s) included)</strong></td><td style="text-align:right;"><strong>${peso(data.totalBasicPay)}</strong></td><td style="text-align:right;"><strong>${peso(data.totalThirteenthMonth)}</strong></td><td>${data.excludedCount} excluded</td></tr></tfoot></table></div>
        ${data.eligibleCount && !blocked ? `<button class="btn" style="margin-top:1rem;" onclick="tmGenerate(${year})"><i class="fas fa-paper-plane"></i> Submit Annual Batch for Approval</button>` : ''}
    `;
}

async function tmGenerate(year) {
    const confirmResult = await showAppConfirm({
        title: 'Submit 13th-Month Batch',
        message: `Submit the ${year} 13th-month batch for the employees shown in the preview for chairman approval? The batch will be calculated again from approved payroll records.`,
        confirmLabel: 'Submit',
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.PAYSLIPS}?action=thirteenth-month-batch-generate`, 'POST', { year });
    if (data.success) {
        showToast(data.message || 'Annual batch submitted for approval.');
        tmPreview();
    } else {
        showToast(data.message, 'error');
    }
}

async function refreshPayslipTable() {
    const tbody = document.getElementById('payslipTableBody');
    if (!tbody) return;
    const data = await apiCall(`${API.PAYSLIPS}?action=list`);
    if (!data.success || !data.payslips.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No payslips have been generated yet.</td></tr>';
        document.getElementById('payslipPager').innerHTML = '';
        return;
    }
    const rows = data.payslips.map(p => {
        const statusClass = p.status === 'approved' ? 'status-completed' : p.status === 'declined' ? 'status-rejected' : 'status-pending';
        return `<tr>
            <td><strong>${escapeHtml(p.employee_name)}</strong><br><small style="color:var(--text-light);">${escapeHtml(p.staff_id)}</small></td>
            <td>${escapeHtml(p.pay_period)}</td>
            <td>${peso(p.gross_pay)}</td>
            <td>${peso(p.net_pay)}</td>
            <td>${new Date(p.created_at).toLocaleDateString('en-PH')}</td>
            <td><span class="status ${statusClass}">${escapeHtml(p.status.charAt(0).toUpperCase()+p.status.slice(1))}</span>${p.remarks ? `<br><small style="color:var(--text-light);">${escapeHtml(p.remarks)}</small>` : ''}</td>
        </tr>`;
    });
    renderPaginated('payslipTableBody', 'payslipPager', rows, 5);
}

async function openPayslipModal(preselectedEmpId) {
    psCurrentStep = 1; psSelectedEmpId = preselectedEmpId || null; psCalcResults = {}; psDtr = {};
    const periodSel = document.getElementById('psPayPeriod');
    if (periodSel && periodSel.options.length <= 1) {
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const label = d.toLocaleDateString('en-US', {year:'numeric', month:'long'});
            periodSel.insertAdjacentHTML('beforeend', `<option value="${value}">${label}</option>`);
        }
    }
    if (periodSel && !periodSel.value && periodSel.options.length > 1) periodSel.selectedIndex = 1;
    psUpdateCutoff();
    const grid = document.getElementById('employeePickerGrid');
    if (grid) {
        grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-light);">Loading employees...</div>';
        document.getElementById('generatePayslipModal').style.display = 'flex';
        // Fetch employees
        if (!employeeList.length) {
            const data = await apiCall(`${API.EMP}?action=list`);
            if (data.success) {
                employeeList = data.employees.map(e => ({
                    id: e.id,
                    name: e.full_name,
                    position: e.position,
                    dept: e.department,
                    defaultPay: parseFloat(e.basic_salary) || 0,
                    initials: e.full_name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase(),
                }));
            }
        }
        grid.innerHTML = employeeList.length ? employeeList.map(emp => `
            <div class="employee-pick-card ${preselectedEmpId === emp.id ? 'selected' : ''}" data-empid="${emp.id}" onclick="psSelectEmployee(${emp.id})">
                <div class="emp-avatar">${emp.initials}</div>
                <div class="emp-card-info"><div class="emp-card-name">${escapeHtml(emp.name)}</div><div class="emp-card-sub">${escapeHtml(emp.position)} · ${escapeHtml(emp.dept)}</div></div>
                <div class="emp-check"></div>
            </div>`).join('')
            : '<div style="text-align:center;padding:2rem;color:var(--text-light);">No employees found. Add employees via Employee Management.</div>';
    }
    renderPsStep();
}

function closePayslipModal() { document.getElementById('generatePayslipModal').style.display = 'none'; }

function psUpdateCutoff() {
    const period = document.getElementById('psPayPeriod').value; // YYYY-MM
    const half   = document.getElementById('psCutoffHalf').value; // first or second payday
    document.getElementById('psCutoffHalf').disabled = !period;
    if (!period) return;
    const schedule = prComputeCutoff(period, half);
    psCutoffStart = schedule.cutoffStart;
    psCutoffEnd = schedule.cutoffEnd;
    document.getElementById('psPayDate').value = schedule.payDate;
}

async function psLoadDtrSummary() {
    if (!psSelectedEmpId || !psCutoffStart || !psCutoffEnd) return;
    document.getElementById('psDtrLoading').style.display = 'block';
    document.getElementById('psDtrSummary').style.display = 'none';

    const data = await apiCall(`${API.PAYSLIPS}?action=compute-dtr&employeeUserId=${psSelectedEmpId}&cutoffStart=${psCutoffStart}&cutoffEnd=${psCutoffEnd}`);

    document.getElementById('psDtrLoading').style.display = 'none';
    document.getElementById('psDtrSummary').style.display = 'block';
    if (!data.success) { alert(data.message || 'Could not load attendance data.'); return; }

    psDtr = data;
    document.getElementById('psDtrEmpType').textContent = psDtr.employee.employmentType;
    document.getElementById('psDtrPresent').textContent = psDtr.daysPresent;
    document.getElementById('psDtrAbsent').textContent  = psDtr.daysAbsent;
    document.getElementById('psDtrLeave').textContent   = psDtr.daysLeave;
    document.getElementById('psDtrRate').textContent    = psDtr.employee.employmentType === 'Full-time'
        ? `${peso(psDtr.dailyRate)} / day` : `${peso(psDtr.hourlyRate)} / hr`;
    document.getElementById('psDtrEarnedBasic').textContent = peso(psDtr.earnedBasic);
    document.getElementById('psDtrPaidLeavePay').textContent = peso(psDtr.paidLeavePay || 0);
    document.getElementById('psDtrLateDed').textContent     = peso(psDtr.lateDeduction);
    document.getElementById('psDtrAbsenceDed').textContent  = peso(psDtr.absenceDeduction);

    psComputeCalc();
}

function psSelectEmployee(empId) {
    psSelectedEmpId = empId;
    document.querySelectorAll('.employee-pick-card').forEach(c => c.classList.remove('selected'));
    const card = document.querySelector(`.employee-pick-card[data-empid="${empId}"]`);
    if (card) card.classList.add('selected');
}

function renderPsStep() {
    [1,2,3].forEach(n => {
        document.getElementById(`pStep${n}`).classList.remove('active');
        document.getElementById(`sdot${n}`).classList.remove('active','done');
        document.getElementById(`slabel${n}`).classList.remove('active');
        if (n < 3) document.getElementById(`sline${n}`).classList.remove('done');
    });
    document.getElementById(`pStep${psCurrentStep}`).classList.add('active');
    for (let n = 1; n <= 3; n++) {
        if (n < psCurrentStep) { document.getElementById(`sdot${n}`).classList.add('done'); if (n<3) document.getElementById(`sline${n}`).classList.add('done'); }
        else if (n === psCurrentStep) document.getElementById(`sdot${n}`).classList.add('active');
    }
    document.getElementById(`slabel${psCurrentStep}`).classList.add('active');
    const footer = document.getElementById('psFooterBtns');
    if (psCurrentStep === 1) footer.innerHTML = `<button class="mfb-back" onclick="closePayslipModal()">Cancel</button><button class="mfb-next" onclick="psGoToStep2()">Next <i class="fas fa-arrow-right"></i></button>`;
    else if (psCurrentStep === 2) footer.innerHTML = `<button class="mfb-back" onclick="psGoStep(1)">Back</button><button class="mfb-next" onclick="psGoToStep3()">Preview <i class="fas fa-arrow-right"></i></button>`;
    else footer.innerHTML = `<button class="mfb-back" onclick="psGoStep(2)">Back</button><button class="mfb-download" onclick="psDownloadPayslip()"><i class="fas fa-download"></i> Download PDF</button><button class="mfb-finalize" onclick="psFinalizePayslip()"><i class="fas fa-check"></i> Finalize</button>`;
}

function psGoStep(n) { psCurrentStep = n; renderPsStep(); }

function psGoToStep2() {
    if (!psSelectedEmpId) { showToast('Please select an employee first.', 'error'); return; }
    if (!document.getElementById('psPayPeriod').value) { showToast('Please select a month.', 'error'); return; }
    const emp = employeeList.find(e => e.id === psSelectedEmpId);
    document.getElementById('calcForName').textContent   = emp ? emp.name : '—';
    document.getElementById('calcForCutoff').textContent = `${psCutoffStart} to ${psCutoffEnd}`;
    psGoStep(2);
    psLoadDtrSummary();
}

function psHandleNext() {
    if (psCurrentStep === 1) psGoToStep2();
    else if (psCurrentStep === 2) psGoToStep3();
}

async function psGoToStep3() {
    if (!psDtr || psDtr.earnedBasic === undefined) { showToast('Please wait for attendance data to finish loading.', 'error'); return; }
    psComputeCalc(); await buildPayslipPreview(); psGoStep(3);
}

async function buildPayslipPreview() {
    const emp = employeeList.find(e => e.id === psSelectedEmpId);
    const payDate = document.getElementById('psPayDate').value;
    const r = psCalcResults;
    const d = psDtr;
    const ci = await getCompanyInfo();
    document.getElementById('payslipDocPreview').innerHTML = `
        <div class="payslip-doc-header"><h2>${escapeHtml(ci.company_name || 'TRAFECO COMPANY')}</h2><p>${escapeHtml(ci.company_address || 'Payroll & Employee Management System')}</p></div>
        <div class="payslip-doc-title">PAYSLIP</div>
        <div class="payslip-doc-grid" style="margin-top:1rem;">
            <div><span>Employee Name: </span><strong>${escapeHtml(emp?emp.name:'—')}</strong></div>
            <div><span>Cutoff: </span><strong>${psCutoffStart} to ${psCutoffEnd}</strong></div>
            <div><span>Employee ID: </span><strong>${emp?emp.id:'—'}</strong></div>
            <div><span>Pay Date: </span><strong>${payDate||'—'}</strong></div>
            <div><span>Department: </span><strong>${escapeHtml(emp?emp.dept:'—')}</strong></div>
            <div><span>Position: </span><strong>${escapeHtml(emp?emp.position:'—')}</strong></div>
        </div>
        <table class="payslip-earnings-table" style="margin-top:1rem;"><thead><tr><th colspan="4">Attendance (DTR)</th></tr></thead>
        <tbody><tr>
            <td>Days Present: <strong>${d.daysPresent}</strong></td>
            <td>Days Absent: <strong>${d.daysAbsent}</strong></td>
            <td>On Leave: <strong>${d.daysLeave}</strong></td>
            <td>Late Deduction: <strong>${peso(d.lateDeduction)}</strong></td>
        </tr></tbody></table>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
            <table class="payslip-earnings-table"><thead><tr><th colspan="2">Earnings</th></tr></thead><tbody>
                <tr><td>Basic Pay (DTR-computed)</td><td style="text-align:right;">${peso(r.basic||0)}</td></tr>
                <tr><td>Paid Leave Pay</td><td style="text-align:right;">${peso(r.paidLeavePay||0)}</td></tr>
                <tr><td>Taxable Allow.</td><td style="text-align:right;">${peso(r.taxAllow||0)}</td></tr>
                <tr><td>Non-Taxable Allow.</td><td style="text-align:right;">${peso(r.nonTaxAllow||0)}</td></tr>
            </tbody><tfoot><tr class="total-row"><td><strong>Gross Pay</strong></td><td style="text-align:right;"><strong>${peso(r.gross||0)}</strong></td></tr></tfoot></table>
            <table class="payslip-earnings-table"><thead><tr><th colspan="2">Deductions</th></tr></thead><tbody>
                <tr><td>Withholding Tax</td><td style="text-align:right;">${peso(r.withholding||0)}</td></tr>
                <tr><td>SSS</td><td style="text-align:right;">${peso(r.sss||0)}</td></tr>
                <tr><td>PhilHealth</td><td style="text-align:right;">${peso(r.philhealth||0)}</td></tr>
                <tr><td>Pag-IBIG</td><td style="text-align:right;">${peso(r.pagibig||0)}</td></tr>
            </tbody><tfoot><tr class="total-row"><td><strong>Total Deductions</strong></td><td style="text-align:right;color:var(--danger);"><strong>${peso(r.totalDed||0)}</strong></td></tr></tfoot></table>
        </div>
        <div class="payslip-net">NET PAY: ${peso(r.netPay||0)}</div>
        <div class="payslip-footer">Computer-generated payslip. Generated: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</div>`;
}

async function psFinalizePayslip() {
    const emp = employeeList.find(e => e.id === psSelectedEmpId);
    if (!emp || !psDtr) return;
    const r       = psCalcResults;
    const period  = document.getElementById('psPayPeriod').value;
    const payDate = document.getElementById('psPayDate').value;

    const payload = {
        employeeUserId:   emp.id,
        payPeriod:        period,
        cutoffStart:      psCutoffStart,
        cutoffEnd:        psCutoffEnd,
        payDate:          payDate || null,
        employmentType:   psDtr.employee.employmentType,
        daysPresent:      psDtr.daysPresent,
        daysAbsent:       psDtr.daysAbsent,
        daysLeave:        psDtr.daysLeave,
        lateDeduction:    psDtr.lateDeduction,
        absenceDeduction: psDtr.absenceDeduction,
        basicPay:         r.basic        || 0,
        paidLeavePay:     r.paidLeavePay || 0,
        taxAllow:         r.taxAllow     || 0,
        nonTaxAllow:      r.nonTaxAllow  || 0,
        grossPay:         r.gross        || 0,
        withholdingTax:   r.withholding  || 0,
        sssGsis:          r.sss          || 0,
        philhealth:       r.philhealth   || 0,
        pagibig:          r.pagibig      || 0,
        totalDeductions:  r.totalDed     || 0,
        netPay:           r.netPay       || 0,
    };

    const data = await apiCall(`${API.PAYSLIPS}?action=generate`, 'POST', payload);
    if (data.success) {
        closePayslipModal();
        showToast(`Payslip for ${emp.name} submitted for chairman approval.`);
        employeeList = [];
        await refreshPayslipTable();
    } else {
        showToast(data.message || 'Failed to save payslip.', 'error');
    }
}

function psDownloadPayslip() {
    // Print the preview as PDF via browser print dialog
    const preview = document.getElementById('payslipDocPreview');
    if (!preview) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Payslip</title><style>body{font-family:sans-serif;padding:2rem;font-size:13px;}table{width:100%;border-collapse:collapse;}th,td{padding:6px 8px;border:1px solid #ddd;font-size:12px;}tfoot td{font-weight:bold;background:#f8f9fa;}.payslip-net{text-align:center;font-weight:bold;font-size:1.1rem;background:#2e7d32;color:white;padding:12px;border-radius:6px;margin-top:12px;}</style></head><body>${preview.innerHTML}<script>window.print();<\/script></body></html>`);
    win.document.close();
}

// ============================================================
//  PAYROLL CALCULATOR ENGINE
// ============================================================
function psComputeCalc() {
    if (!psDtr || psDtr.earnedBasic === undefined) return;
    const ta  = parseFloat(document.getElementById('psCalcTaxableAllow').value)||0;
    const nta = parseFloat(document.getElementById('psCalcNonTaxableAllow').value)||0;
    const basic = psDtr.earnedBasic;
    const paidLeavePay = parseFloat(psDtr.paidLeavePay) || 0;
    const gross = basic + paidLeavePay + ta + nta;
    const sss = psDtr.sss, ph = psDtr.philhealth, pi = psDtr.pagibig;
    const taxableLeavePay = parseFloat(psDtr.taxablePaidLeavePay) || 0;
    const taxableIncome = Math.max(0, basic + taxableLeavePay + ta - sss - ph - pi);
    const wt = computeWithholdingTax(taxableIncome, 2); // semi-monthly cutoff
    const totalDed = wt + sss + ph + pi;
    const netPay = gross - totalDed;

    document.getElementById('psRBasicPay').textContent    = peso(basic);
    document.getElementById('psRPaidLeavePay').textContent = peso(paidLeavePay);
    document.getElementById('psRTaxAllow').textContent    = peso(ta);
    document.getElementById('psRNonTaxAllow').textContent = peso(nta);
    document.getElementById('psRGrossPay').textContent    = peso(gross);
    document.getElementById('psRWithholding').textContent = peso(wt);
    document.getElementById('psRSSSLabel').textContent    = 'SSS Contribution';
    document.getElementById('psRSSS').textContent         = peso(sss);
    document.getElementById('psRPhilHealth').textContent  = peso(ph);
    document.getElementById('psRPagIBIG').textContent     = peso(pi);
    document.getElementById('psRTotalDed').textContent    = peso(totalDed);
    document.getElementById('psRNetPay').textContent      = peso(netPay);

    psCalcResults = { basic, paidLeavePay, taxAllow: ta, nonTaxAllow: nta, gross, withholding: wt, sss, philhealth: ph, pagibig: pi, totalDed, netPay };
}

// ============================================================
//  PAGE LOADERS
// ============================================================
function buildMonthYearFilterOptions() {
    const now = new Date();
    let monthOpts = '<option value="">All Months</option>';
    for (let m = 1; m <= 12; m++) monthOpts += `<option value="${m}">${new Date(2000,m-1,1).toLocaleDateString('en-US',{month:'long'})}</option>`;
    let yearOpts = '<option value="">All Years</option>';
    for (let y = now.getFullYear(); y >= now.getFullYear()-3; y--) yearOpts += `<option value="${y}">${y}</option>`;
    return { monthOpts, yearOpts };
}

async function loadPayrollHistory(c) {
    const { monthOpts, yearOpts } = buildMonthYearFilterOptions();
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-history"></i>Payroll History</div></div>
        <div style="padding:1.4rem;">
        <div class="form-row" style="margin-bottom:1rem;max-width:500px;">
            <div class="form-col"><div class="form-group"><label>Month</label><select id="phMonthFilter" class="form-control" onchange="fetchPayrollHistory()">${monthOpts}</select></div></div>
            <div class="form-col"><div class="form-group"><label>Year</label><select id="phYearFilter" class="form-control" onchange="fetchPayrollHistory()">${yearOpts}</select></div></div>
        </div>
        <div class="table-container"><table><thead><tr><th>Cutoff / Annual Period</th><th>Employees</th><th>Total Gross</th><th>Calculated Deductions</th><th>Uncollected</th><th>Total Net</th><th>Status</th><th>Decided By</th><th>Actions</th></tr></thead><tbody id="payrollHistBody"><tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></table></div>
        <div class="pager" id="payrollHistPager"></div>
        </div></div>`;
    await fetchPayrollHistory();
}

async function fetchPayrollHistory() {
    const month = document.getElementById('phMonthFilter')?.value || '';
    const year  = document.getElementById('phYearFilter')?.value || '';
    let url = `${API.PAYSLIPS}?action=payroll-batches`;
    if (month) url += `&month=${month}`;
    if (year)  url += `&year=${year}`;
    const data = await apiCall(url);
    const tbody = document.getElementById('payrollHistBody');
    if (!data.success || !data.batches.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light);">No payroll history yet.</td></tr>';
        document.getElementById('payrollHistPager').innerHTML = '';
        return;
    }
    const rows = data.batches.map(b => {
        const sc = b.status==='approved'?'status-completed':b.status==='declined'?'status-rejected':'status-pending';
        return `<tr>
        <td>${escapeHtml(payrollBatchPeriodText(b))}</td>
            <td>${b.employee_count}</td>
            <td>${peso(b.total_gross)}</td>
            <td>${peso(b.total_deductions)}</td>
            <td>${peso(b.unpaid_deduction_total || 0)}</td>
            <td><strong>${peso(b.total_net)}</strong></td>
            <td><span class="status ${sc}">${escapeHtml(b.status.charAt(0).toUpperCase()+b.status.slice(1))}</span></td>
            <td>${escapeHtml(b.approved_by_name || '—')}</td>
            <td><button class="action-btn btn-sm" onclick="openPayrollBatchDetail(${b.id}, false)"><i class="fas fa-eye"></i> View</button></td>
        </tr>`;
    });
    renderPaginated('payrollHistBody', 'payrollHistPager', rows, 10);
}

let payslipDocCache = [];

let companyInfoCache = null;
async function getCompanyInfo() {
    if (companyInfoCache) return companyInfoCache;
    const data = await apiCall(`${API.SYS}?action=settings`);
    companyInfoCache = data.success ? data.settings : {};
    return companyInfoCache;
}

async function loadPayslips(c) {
    const { monthOpts, yearOpts } = buildMonthYearFilterOptions();
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-file-invoice-dollar"></i>My Payslips</div></div>
        <div style="padding:1.4rem;">
        <div class="form-row" style="margin-bottom:1rem;max-width:500px;">
            <div class="form-col"><div class="form-group"><label>Month</label><select id="mpMonthFilter" class="form-control" onchange="fetchMyPayslips()">${monthOpts}</select></div></div>
            <div class="form-col"><div class="form-group"><label>Year</label><select id="mpYearFilter" class="form-control" onchange="fetchMyPayslips()">${yearOpts}</select></div></div>
        </div>
        <div class="table-container"><table><thead><tr><th>Period</th><th>Gross Pay</th><th>Calculated Deductions</th><th>Uncollected</th><th>Net Pay</th><th>Pay Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="myPayslipsBody"><tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        </div></div>`;
    await fetchMyPayslips();
}

async function fetchMyPayslips() {
    const month = document.getElementById('mpMonthFilter')?.value || '';
    const year  = document.getElementById('mpYearFilter')?.value || '';
    let url = `${API.PAYSLIPS}?action=my-list`;
    if (month) url += `&month=${month}`;
    if (year)  url += `&year=${year}`;
    const data = await apiCall(url);
    const tbody = document.getElementById('myPayslipsBody');
    if (!data.success || !data.payslips.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">No payslips found.</td></tr>';
        return;
    }
    payslipDocCache = data.payslips;
    tbody.innerHTML = data.payslips.map(p => {
        const sc = p.status === 'approved' ? 'status-completed' : p.status === 'declined' ? 'status-rejected' : 'status-pending';
        return `<tr>
            <td>${escapeHtml(p.pay_period)}</td>
            <td>${peso(p.gross_pay)}</td>
            <td>${peso(p.total_deductions)}</td>
            <td>${peso(p.unpaid_deduction_amount || 0)}</td>
            <td><strong>${peso(p.net_pay)}</strong></td>
            <td>${p.pay_date || '—'}</td>
            <td><span class="status ${sc}">${p.status.charAt(0).toUpperCase()+p.status.slice(1)}</span></td>
            <td><button class="action-btn btn-sm" onclick="viewPayslipDoc(${p.id})"><i class="fas fa-eye"></i> View</button></td>
        </tr>`;
    }).join('');
}

async function viewPayslipDoc(id) {
    const p = payslipDocCache.find(x => x.id === id);
    if (!p) return;
    const isRegular = p.payslip_type === 'regular';
    const calculatedDeductions = Math.max(0, Number(p.total_deductions || 0));
    const unpaidDeductions = Math.max(0, Number(p.unpaid_deduction_amount || 0));
    const deductionsWithheld = Math.max(0, calculatedDeductions - unpaidDeductions);
    const ci = await getCompanyInfo();
    document.getElementById('payslipViewDocPreview').innerHTML = `
        <div class="payslip-doc-header"><h2>${escapeHtml(ci.company_name || 'TRAFECO COMPANY')}</h2><p>${escapeHtml(ci.company_address || 'Payroll & Employee Management System')}</p></div>
        <div class="payslip-doc-title">${isRegular ? 'PAYSLIP' : '13TH MONTH PAYSLIP'}</div>
        <div class="payslip-doc-grid" style="margin-top:1rem;">
            <div><span>Employee Name: </span><strong>${escapeHtml(p.employee_name)}</strong></div>
            <div><span>${isRegular ? 'Cutoff: ' : 'Period: '}</span><strong>${isRegular && p.cutoff_start ? `${escapeHtml(p.cutoff_start)} to ${escapeHtml(p.cutoff_end)}` : escapeHtml(p.pay_period)}</strong></div>
            <div><span>Staff ID: </span><strong>${escapeHtml(p.staff_id)}</strong></div>
            <div><span>Pay Date: </span><strong>${p.pay_date || '—'}</strong></div>
            <div><span>Generated By: </span><strong>${escapeHtml(p.generated_by_name || '—')}</strong></div>
            <div><span>Status: </span><strong>${escapeHtml(p.status.charAt(0).toUpperCase()+p.status.slice(1))}${p.approved_by_name ? ' by '+escapeHtml(p.approved_by_name) : ''}</strong></div>
        </div>
        ${isRegular ? `
        <table class="payslip-earnings-table" style="margin-top:1rem;"><thead><tr><th colspan="4">Attendance (DTR)</th></tr></thead>
        <tbody><tr>
            <td>Days Present: <strong>${p.days_present}</strong></td>
            <td>Days Absent: <strong>${p.days_absent}</strong></td>
            <td>On Leave: <strong>${p.days_leave}</strong></td>
            <td>Late Deduction: <strong>${peso(p.late_deduction)}</strong></td>
        </tr></tbody></table>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
            <table class="payslip-earnings-table"><thead><tr><th colspan="2">Earnings</th></tr></thead><tbody>
                <tr><td>${isRegular ? 'Basic Pay' : '13th Month Pay'}</td><td style="text-align:right;">${peso(p.basic_pay)}</td></tr>
                ${isRegular ? '' : `<tr><td>Basic salary used for calculation</td><td style="text-align:right;">${peso(p.thirteenth_month_basis || 0)}</td></tr>`}
                <tr><td>Paid Leave Pay</td><td style="text-align:right;">${peso(p.paid_leave_pay || 0)}</td></tr>
                <tr><td>Taxable Allow.</td><td style="text-align:right;">${peso(p.taxable_allow)}</td></tr>
                <tr><td>Non-Taxable Allow.</td><td style="text-align:right;">${peso(p.non_tax_allow)}</td></tr>
            </tbody><tfoot><tr class="total-row"><td><strong>Gross Pay</strong></td><td style="text-align:right;"><strong>${peso(p.gross_pay)}</strong></td></tr></tfoot></table>
            <table class="payslip-earnings-table"><thead><tr><th colspan="2">Deductions</th></tr></thead><tbody>
                <tr><td>Withholding Tax</td><td style="text-align:right;">${peso(p.withholding_tax)}</td></tr>
                <tr><td>SSS</td><td style="text-align:right;">${peso(p.sss_gsis)}</td></tr>
                <tr><td>PhilHealth</td><td style="text-align:right;">${peso(p.philhealth)}</td></tr>
                <tr><td>Pag-IBIG</td><td style="text-align:right;">${peso(p.pagibig)}</td></tr>
                <tr><td>Calculated deductions</td><td style="text-align:right;">${peso(calculatedDeductions)}</td></tr>
                <tr><td>Uncollected this period (not carried forward)</td><td style="text-align:right;">${peso(unpaidDeductions)}</td></tr>
            </tbody><tfoot><tr class="total-row"><td><strong>Actually withheld</strong></td><td style="text-align:right;color:var(--danger);"><strong>${peso(deductionsWithheld)}</strong></td></tr></tfoot></table>
        </div>
        ${unpaidDeductions > 0 ? `<div class="alert alert-info" style="margin-top:1rem;"><i class="fas fa-info-circle"></i><div>${peso(unpaidDeductions)} of calculated deductions was not collected from this pay because earnings were insufficient. This amount is recorded for this payslip only and is not automatically carried forward.</div></div>` : ''}
        <div class="payslip-net">NET PAY: ${peso(p.net_pay)}</div>
        ${p.remarks ? `<div style="margin-top:0.75rem;color:var(--text-light);font-size:0.85rem;"><strong>Remarks:</strong> ${escapeHtml(p.remarks)}</div>` : ''}
        <div class="payslip-footer">Computer-generated payslip.</div>`;
    document.getElementById('payslipViewModal').style.display = 'flex';
}

async function loadValidatePayroll(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-check-double"></i>Approve / Decline Payslips</div></div>
        <div style="padding:1.4rem;">
        <div class="alert alert-info"><i class="fas fa-info-circle"></i><div>Review payslips submitted by the treasurer and approve or decline each one.</div></div>
        <div class="table-container"><table><thead><tr><th>Employee</th><th>Period</th><th>Gross Pay</th><th>Uncollected</th><th>Net Pay</th><th>Submitted By</th><th>Date</th><th>Actions</th></tr></thead><tbody id="validatePayrollBody"><tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">Loading...</td></tr></tbody></table></div>
        <div class="pager" id="validatePayrollPager"></div>
        </div></div>`;
    const data = await apiCall(`${API.PAYSLIPS}?action=pending`);
    const tbody = document.getElementById('validatePayrollBody');
    if (!data.success || !data.payslips.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light);">No payslips pending approval.</td></tr>';
        document.getElementById('validatePayrollPager').innerHTML = '';
        return;
    }
    payslipDocCache = data.payslips;
    const rows = data.payslips.map(p => `<tr>
        <td><strong>${escapeHtml(p.employee_name)}</strong><br><small>${escapeHtml(p.staff_id)}</small></td>
        <td>${escapeHtml(p.pay_period)}</td>
        <td>${peso(p.gross_pay)}</td>
        <td>${peso(p.unpaid_deduction_amount || 0)}</td>
        <td>${peso(p.net_pay)}</td>
        <td>${escapeHtml(p.generated_by_name)}</td>
        <td>${new Date(p.created_at).toLocaleDateString('en-PH')}</td>
        <td>
            <button class="action-btn btn-sm" onclick="viewPayslipDoc(${p.id})"><i class="fas fa-eye"></i> View</button>
            <button class="action-btn btn-sm" style="background:var(--success);" onclick="approvePayslip(${p.id})"><i class="fas fa-check"></i> Approve</button>
            <button class="action-btn danger btn-sm" onclick="declinePayslip(${p.id})"><i class="fas fa-times"></i> Decline</button>
        </td>
    </tr>`);
    renderPaginated('validatePayrollBody', 'validatePayrollPager', rows, 10);
}

async function approvePayslip(id) {
    const confirmResult = await showAppConfirm({
        title: 'Approve Payslip',
        message: 'Approve this payslip?',
        confirmLabel: 'Approve',
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.PAYSLIPS}?action=approve&id=${id}`, 'PUT');
    if (data.success) { showToast('Payslip approved.'); loadPageContent('validate-payroll'); }
    else showToast(data.message, 'error');
}

async function declinePayslip(id) {
    const confirmResult = await showAppConfirm({
        title: 'Decline Payslip',
        message: 'Decline this payslip?',
        confirmLabel: 'Decline',
        danger: true,
        needsRemarks: true,
        remarksLabel: 'Reason (optional)',
    });
    if (!confirmResult.confirmed) return;

    const data = await apiCall(`${API.PAYSLIPS}?action=decline&id=${id}`, 'PUT', { remarks: confirmResult.remarks });
    if (data.success) { showToast('Payslip declined.'); loadPageContent('validate-payroll'); }
    else showToast(data.message, 'error');
}
