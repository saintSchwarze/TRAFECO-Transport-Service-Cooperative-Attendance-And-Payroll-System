// ============================================================
//  core-state.js - global state, API config
// ============================================================
const API_BASE = new URL('api/', document.baseURI).pathname.replace(/\/$/, '');
const API = {
    AUTH:     `${API_BASE}/auth.php`,
    EMP:      `${API_BASE}/employees.php`,
    PAYSLIPS: `${API_BASE}/payslips.php`,
    LEAVE:    `${API_BASE}/leave.php`,
    QR:       `${API_BASE}/qr-attendance.php`,
    SYS:      `${API_BASE}/system.php`,
    REPORTS:  `${API_BASE}/reports.php`,
};
// Legacy compat for page loaders
const API_CONFIG = {
    BASE_URL: API_BASE,
    EMPLOYEES: API.EMP,
    PAYROLL: API.PAYSLIPS,
    PAYROLL_PERIODS: `${API.PAYSLIPS}?action=periods`,
    LEAVE: API.LEAVE,
    REPORTS: API.REPORTS,
    QR_STAFF_LIST: `${API.QR}?action=staff`,
    QR_GENERATE: `${API.QR}?action=generate`,
    QR_DELETE: `${API.QR}?action=delete`,
    QR_LOGS: `${API.QR}?action=logs`,
    QR_MY_LOGS: `${API.QR}?action=my-logs`,
    QR_SCAN_LOG: `${API.QR}?action=scan`,
    SYSTEM_USERS: `${API.SYS}?action=users`,
    SYSTEM_SETTINGS: `${API.SYS}?action=settings`,
    AUDIT_LOGS: `${API.SYS}?action=audit-logs`,
};

// ============================================================
//  STATE
// ============================================================
let currentUser    = null;
let csrfToken      = '';
let activePage     = 'dashboard';
let html5QrScanner = null;
let activeScanType = 'time_in';
let psCurrentStep  = 1;
let psSelectedEmpId = null;
let psCalcResults  = {};
let psDtr           = {};
let psCutoffStart   = null;
let psCutoffEnd     = null;
let calcViewMode   = 'monthly';
let staffList      = [];

let employeeList   = [];

// ============================================================
//  API HELPER
// ============================================================
