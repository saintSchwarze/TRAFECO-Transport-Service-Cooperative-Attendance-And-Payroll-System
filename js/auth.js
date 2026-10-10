let activeResetToken = '';
let activeRegistrationToken = '';

document.addEventListener('DOMContentLoaded', function () {
    window.addEventListener('storage', event => {
        if (event.key === 'trafeco_auth_sync' && event.newValue !== event.oldValue) {
            window.location.reload();
        }
    });
    localStorage.removeItem('trafeco_rememberedUser');
    setupEventListeners();
    renderLoginTurnstile();
    openResetLinkIfPresent();
    openRegistrationLinkIfPresent();
    restoreExistingSession();
    populatePayPeriods();
    setupResponsiveTableObserver();
});

function notifyOtherTabsOfAuthChange() {
    try {
        localStorage.setItem('trafeco_auth_sync', `${Date.now()}-${Math.random()}`);
    } catch (error) {
        // Session enforcement remains server-side if browser storage is unavailable.
    }
}

// ============================================================
//  MOBILE SIDEBAR (hamburger drawer)
// ============================================================
function populatePayPeriods() {
    const sel = document.getElementById('psPayPeriod');
    if (!sel) return;
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
        const val   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const opt   = document.createElement('option');
        opt.value = val; opt.textContent = label;
        sel.appendChild(opt);
    }
}

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('forgotPassword').addEventListener('click', e => { e.preventDefault(); document.getElementById('forgotPasswordModal').style.display = 'flex'; });
    document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', function () { this.closest('.modal').style.display = 'none'; }));
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', function (e) { if (e.target === this) this.style.display = 'none'; }));
    document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPassword);
    document.getElementById('resetPasswordForm')?.addEventListener('submit', handleResetPassword);
    document.getElementById('registrationForm')?.addEventListener('submit', handleCompleteRegistration);
    document.getElementById('newPassword').addEventListener('input', checkNewPasswordStrength);
    document.getElementById('psCalcNDCheck')?.addEventListener('change', function () { document.getElementById('psCalcNDSub')?.classList.toggle('visible', this.checked); });
    document.getElementById('psCalcOTCheck')?.addEventListener('change', function () { document.getElementById('psCalcOTSub')?.classList.toggle('visible', this.checked); });
}

let loginTurnstileWidgetId = null;
let loginTurnstileToken = '';

async function renderLoginTurnstile() {
    const message = document.getElementById('loginTurnstileMessage');
    try {
        const result = await apiCall(`${API.AUTH}?action=turnstile-config`);
        if (!result.success || !result.siteKey) throw new Error(result.message || 'Turnstile configuration is missing.');
        await window.turnstileScriptReady;
        loginTurnstileWidgetId = window.turnstile.render('#loginTurnstileWidget', {
            sitekey: result.siteKey,
            action: 'login',
            callback: token => { loginTurnstileToken = token; if (message) message.textContent = ''; },
            'expired-callback': () => { loginTurnstileToken = ''; },
            'error-callback': () => { loginTurnstileToken = ''; if (message) message.textContent = 'Security check unavailable. Reload the page and try again.'; },
        });
    } catch (error) {
        if (message) message.textContent = error.message || 'Security check could not be loaded.';
    }
}

async function restoreExistingSession() {
    if (activeRegistrationToken) return;
    const result = await apiCall(`${API.AUTH}?action=me`);
    if (!result.success || !result.user) return;
    currentUser = result.user;
    csrfToken = result.csrfToken || '';
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'flex';
    generateDashboard();
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();
    const result = await apiCall(`${API.AUTH}?action=forgot-password`, 'POST', { email });
    if (result.success) {
        showToast(result.message || 'If an account uses that email, a reset link has been sent.');
        e.target.reset();
        e.target.closest('.modal').style.display = 'none';
    } else {
        showToast(result.message || 'Unable to send the reset email.', 'error');
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const token = activeResetToken;
    const password = document.getElementById('resetNewPassword').value;
    const confirm = document.getElementById('resetConfirmPassword').value;
    if (password.length < 15 || new TextEncoder().encode(password).length > 72) { showMsg('resetPasswordMsg', 'Use a password between 15 and 72 characters.', 'error'); return; }
    if (password !== confirm) { showMsg('resetPasswordMsg', 'Passwords do not match.', 'error'); return; }
    const result = await apiCall(`${API.AUTH}?action=reset-password`, 'POST', { token, password });
    if (result.success) {
        showMsg('resetPasswordMsg', result.message, 'success');
        activeResetToken = '';
        setTimeout(() => { document.getElementById('resetPasswordModal').style.display = 'none'; }, 1500);
    } else showMsg('resetPasswordMsg', result.message || 'This reset link is invalid or expired.', 'error');
}

function openResetLinkIfPresent() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('token')) return;
    activeResetToken = params.get('token') || '';
    window.history.replaceState({}, document.title, window.location.pathname);
    document.getElementById('resetPasswordModal').style.display = 'flex';
}

async function openRegistrationLinkIfPresent() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('register');
    if (!token) return;
    activeRegistrationToken = token;
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    document.getElementById('registrationModal').style.display = 'flex';
    const result = await apiCall(`${API.AUTH}?action=registration-info`, 'POST', { token });
    if (result.success) {
        document.getElementById('registrationAccount').textContent = `Set up the account for ${result.account.full_name} (${result.account.email}).`;
    } else {
        showMsg('registrationMsg', result.message || 'This registration link is invalid or expired.', 'error');
        document.getElementById('registrationForm').style.display = 'none';
    }
}

async function handleCompleteRegistration(e) {
    e.preventDefault();
    const username = document.getElementById('registrationUsername').value.trim().toLowerCase();
    const password = document.getElementById('registrationPassword').value;
    const confirm = document.getElementById('registrationConfirmPassword').value;
    if (!/^[a-z0-9._]{3,60}$/.test(username)) { showMsg('registrationMsg', 'Username must be 3–60 characters and use only letters, numbers, dots, or underscores.', 'error'); return; }
    if (password.length < 15 || new TextEncoder().encode(password).length > 72) { showMsg('registrationMsg', 'Use a password between 15 and 72 bytes.', 'error'); return; }
    if (password !== confirm) { showMsg('registrationMsg', 'Passwords do not match.', 'error'); return; }
    const button = e.target.querySelector('button[type="submit"]');
    button.disabled = true;
    const result = await apiCall(`${API.AUTH}?action=complete-registration`, 'POST', { token: activeRegistrationToken, username, password });
    button.disabled = false;
    if (result.success) {
        activeRegistrationToken = '';
        showMsg('registrationMsg', result.message, 'success');
        e.target.reset();
        setTimeout(() => { document.getElementById('registrationModal').style.display = 'none'; }, 1800);
    } else {
        showMsg('registrationMsg', result.message || 'Could not complete registration.', 'error');
    }
}

// ============================================================
//  AUTH
// ============================================================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const msgDiv   = document.getElementById('loginMessage');

    msgDiv.textContent = 'Signing in...'; msgDiv.className = 'message'; msgDiv.style.display = 'block';

    if (!loginTurnstileToken) {
        msgDiv.textContent = 'Complete the Cloudflare security check first.';
        msgDiv.className = 'message error';
        return;
    }
    const data = await apiCall(`${API.AUTH}?action=login`, 'POST', { username, password, turnstileToken: loginTurnstileToken });
    if (data.success) {
        notifyOtherTabsOfAuthChange();
        msgDiv.textContent = 'Login successful! Loading...'; msgDiv.className = 'message success';
        currentUser = data.user;
        csrfToken = data.csrfToken || '';
        setTimeout(() => {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('dashboardPage').style.display = 'flex';
            generateDashboard();
        }, 400);
    } else {
        loginTurnstileToken = '';
        if (loginTurnstileWidgetId !== null && window.turnstile) window.turnstile.reset(loginTurnstileWidgetId);
        msgDiv.textContent = data.message || 'Invalid username or password.';
        msgDiv.className = 'message error';
        setTimeout(() => { msgDiv.style.display = 'none'; }, 4000);
    }
}


function checkNewPasswordStrength() {
    const pw = document.getElementById('newPassword').value;
    const el = document.getElementById('newPasswordStrength');
    if (!pw) { el.textContent = ''; return; }
    let cls = 'weak', msg = 'Weak password';
    if (pw.length >= 15) { cls = 'medium'; msg = 'Good length'; if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)) { cls = 'strong'; msg = 'Strong password'; } }
    el.textContent = msg; el.className = `password-strength ${cls}`;
}

function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async function (e) {
        e.preventDefault();
        closeQRScanner();
        const result = await apiCall(`${API.AUTH}?action=logout`, 'POST');
        if (!result.success) {
            showToast(result.message || 'Sign out failed. Please try again.', 'error');
            return;
        }
        notifyOtherTabsOfAuthChange();
        document.getElementById('dashboardPage').style.display = 'none';
        document.getElementById('dashboardPage').innerHTML = '<div class="main-content"></div>';
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('loginForm').reset();
        stopNotifPolling();
        currentUser = null; activePage = 'dashboard';
        csrfToken = '';
        staffList = []; employeeList = [];
    });
}

// ============================================================
//  DASHBOARD GENERATION
// ============================================================
function openChangeEmailModal() {
    document.getElementById('changeEmailForm').reset();
    document.getElementById('changeEmailModal').style.display = 'flex';
}

async function submitChangeEmail(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const result = await apiCall(`${API.AUTH}?action=change-email`, 'POST', data);
    if (result.success) {
        document.getElementById('mpEmailDisplay').textContent = result.email;
        showMsg('changeEmailMsg', result.message, 'success');
        setTimeout(() => { document.getElementById('changeEmailModal').style.display = 'none'; }, 1200);
    } else {
        showMsg('changeEmailMsg', result.message || 'Failed to change email.', 'error');
    }
}

function openChangeUsernameModal() {
    document.getElementById('changeUsernameForm').reset();
    document.getElementById('cuCurrentUsername').value = currentUser.username;
    document.getElementById('changeUsernameModal').style.display = 'flex';
}

async function submitChangeUsername(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const result = await apiCall(`${API.AUTH}?action=change-username`, 'POST', data);
    if (result.success) {
        currentUser.username = result.username;
        showMsg('changeUsernameMsg', result.message, 'success');
        setTimeout(() => { document.getElementById('changeUsernameModal').style.display = 'none'; }, 1200);
    } else {
        showMsg('changeUsernameMsg', result.message || 'Failed to change username.', 'error');
    }
}
