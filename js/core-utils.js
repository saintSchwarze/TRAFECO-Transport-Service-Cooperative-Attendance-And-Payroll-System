async function apiCall(url, method = 'GET', body = null) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
        const opts = { method, headers, credentials: 'same-origin' };
        if (body) opts.body = JSON.stringify(body);
        const r = await fetch(url, opts);
        return await r.json();
    } catch (e) {
        return { success: false, message: 'Network error. Please try again.' };
    }
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[ch]);
}

function showMsg(elId, msg, type) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg; el.className = `message ${type}`; el.style.display = 'block';
    if (type !== 'error') setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ============================================================
//  INIT
// ============================================================
function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr.replace(' ', 'T')).getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
    return new Date(dateStr.replace(' ', 'T')).toLocaleDateString('en-PH');
}

function peso(n) {
    const num = parseFloat(n) || 0;
    return '₱' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function computeWithholdingTax(t, periodsPerMonth = 1) {
    const monthly = t * periodsPerMonth;
    let tax;
    if (monthly<=20833) tax=0;
    else if (monthly<=33333) tax=(monthly-20833)*0.15;
    else if (monthly<=66667) tax=1875+(monthly-33333)*0.20;
    else if (monthly<=166667) tax=8541.80+(monthly-66667)*0.25;
    else if (monthly<=666667) tax=33541.80+(monthly-166667)*0.30;
    else tax=183541.80+(monthly-666667)*0.35;
    return tax / periodsPerMonth;
}

function emptyTableHTML(cols, apiEndpoint) {
    return `<div class="empty-state"><i class="fas fa-database"></i><p>No data yet.</p><small>Backend: Connect to <code>${apiEndpoint}</code></small></div>`;
}

function showToast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `app-toast ${type === 'error' ? 'error' : ''}`;
    const icon = document.createElement('i');
    icon.className = `fas ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`;
    icon.style.cssText = `color:${type === 'error' ? 'var(--danger)' : 'var(--green-600)'};margin-top:0.1rem;`;
    const text = document.createElement('div');
    text.textContent = message;
    el.append(icon, text);
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

let _appConfirmResolve = null;
function showAppConfirm({ title, message, confirmLabel = 'Confirm', danger = false, needsRemarks = false, remarksLabel = 'Remarks' }) {
    return new Promise(resolve => {
        _appConfirmResolve = resolve;
        document.getElementById('appConfirmTitle').textContent = title;
        document.getElementById('appConfirmMessage').textContent = message;
        const remarksWrap  = document.getElementById('appConfirmRemarksWrap');
        const remarksInput = document.getElementById('appConfirmRemarks');
        remarksInput.value = '';
        if (needsRemarks) {
            remarksWrap.style.display = 'block';
            document.getElementById('appConfirmRemarksLabel').textContent = remarksLabel;
        } else {
            remarksWrap.style.display = 'none';
        }
        const btn = document.getElementById('appConfirmBtn');
        btn.textContent = confirmLabel;
        btn.className = danger ? 'action-btn danger' : 'btn';
        btn.onclick = () => {
            document.getElementById('appConfirmModal').style.display = 'none';
            resolve({ confirmed: true, remarks: needsRemarks ? remarksInput.value.trim() : '' });
        };
        document.getElementById('appConfirmModal').style.display = 'flex';
    });
}

function closeAppConfirm() {
    document.getElementById('appConfirmModal').style.display = 'none';
    if (_appConfirmResolve) _appConfirmResolve({ confirmed: false, remarks: '' });
}
// JAVASCRIPT END: Line 4862
