const paginationCache = {}; // { [pagerId]: { rows: [...html strings], pageSize, page } }

function renderPaginated(tbodyId, pagerId, rows, pageSize = 5) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const state = paginationCache[pagerId] || { page: 1 };
    state.rows = rows; state.pageSize = pageSize;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    paginationCache[pagerId] = state;

    const start = (state.page - 1) * pageSize;
    tbody.innerHTML = rows.slice(start, start + pageSize).join('');
    renderPager(tbodyId, pagerId);
}

function renderPager(tbodyId, pagerId) {
    const pager = document.getElementById(pagerId);
    if (!pager) return;
    const state = paginationCache[pagerId];
    if (!state || !state.rows.length) { pager.innerHTML = ''; return; }
    const totalPages = Math.max(1, Math.ceil(state.rows.length / state.pageSize));
    if (totalPages <= 1) { pager.innerHTML = ''; return; }
    const page = totalPages ? Math.min(state.page, totalPages) : 1;

    let startP = Math.max(1, page - 2);
    let endP   = Math.min(totalPages, startP + 4);
    startP = Math.max(1, endP - 4);

    let html = `<button class="pager-btn" ${page===1?'disabled':''} onclick="goToPage('${tbodyId}','${pagerId}',${page-1})"><i class="fas fa-chevron-left"></i> Prev</button>`;
    for (let p = startP; p <= endP; p++) {
        html += `<button class="pager-btn ${p===page?'active':''}" onclick="goToPage('${tbodyId}','${pagerId}',${p})">${p}</button>`;
    }
    html += `<button class="pager-btn" ${page===totalPages?'disabled':''} onclick="goToPage('${tbodyId}','${pagerId}',${page+1})">Next <i class="fas fa-chevron-right"></i></button>`;
    pager.innerHTML = html;
}

function goToPage(tbodyId, pagerId, page) {
    const state = paginationCache[pagerId];
    if (!state) return;
    const totalPages = Math.max(1, Math.ceil(state.rows.length / state.pageSize));
    state.page = Math.min(Math.max(1, page), totalPages);
    const tbody = document.getElementById(tbodyId);
    const start = (state.page - 1) * state.pageSize;
    tbody.innerHTML = state.rows.slice(start, start + state.pageSize).join('');
    renderPager(tbodyId, pagerId);
}

// ============================================================
//  GENERATE PAYSLIP PAGE & MODAL
// ============================================================
