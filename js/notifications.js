let notifCache = [];

async function loadNotifications() {
    const data = await apiCall(`${API.SYS}?action=notifications`);
    if (!data.success) {
        const list = document.getElementById('notifList');
        if (list) list.innerHTML = `<div class="notif-empty">Couldn't load notifications.<br><small>${escapeHtml(data.message || 'Please try again.')}</small></div>`;
        return;
    }
    notifCache = data.notifications;

    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.textContent = data.unreadCount > 9 ? '9+' : data.unreadCount;
        badge.classList.toggle('visible', data.unreadCount > 0);
    }

    const list = document.getElementById('notifList');
    if (!list) return;
    if (!notifCache.length) {
        list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
        return;
    }
    list.innerHTML = notifCache.map(n => `
        <div class="notif-item ${Number(n.is_read) ? '' : 'unread'}" data-link-page="${escapeHtml(n.link_page || '')}" onclick="openNotification(${Number(n.id)}, this.dataset.linkPage)" style="position:relative;cursor:pointer;">
            <div class="notif-item-title" style="padding-right:1.2rem;">${escapeHtml(n.title)}</div>
            <div class="notif-item-msg">${escapeHtml(n.message)}</div>
            <div class="notif-item-time">${timeAgo(n.created_at)}</div>
            <button onclick="event.stopPropagation(); dismissNotification(${Number(n.id)});" title="Dismiss" style="position:absolute;top:0.4rem;right:0.4rem;border:none;background:none;color:var(--text-light);cursor:pointer;font-size:0.8rem;padding:0.2rem 0.4rem;line-height:1;">&times;</button>
        </div>
    `).join('');
}

async function dismissNotification(id) {
    await apiCall(`${API.SYS}?action=delete-notification&id=${id}`, 'DELETE');
    loadNotifications();
}

async function clearAllNotifs(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!notifCache.length) return;
    const confirmResult = await showAppConfirm({
        title: 'Clear All Notifications',
        message: 'Delete all of your notifications? This cannot be undone.',
        confirmLabel: 'Clear All',
        danger: true,
    });
    if (!confirmResult.confirmed) return;
    await apiCall(`${API.SYS}?action=clear-notifications`, 'DELETE');
    showToast('Notifications cleared.');
    loadNotifications();
}

function toggleNotifPanel(e) {
    e.stopPropagation();
    const panel = document.getElementById('notifPanel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) loadNotifications();
}

async function openNotification(id, linkPage) {
    const n = notifCache.find(x => Number(x.id) === Number(id));
    if (n && !Number(n.is_read)) {
        await apiCall(`${API.SYS}?action=mark-notification-read&id=${id}`, 'PUT');
        n.is_read = 1;
    }
    document.getElementById('notifPanel').classList.remove('open');
    if (linkPage) loadPageContent(linkPage);
    loadNotifications();
}

async function markAllNotifsRead(e) {
    e.preventDefault();
    e.stopPropagation();
    await apiCall(`${API.SYS}?action=mark-all-notifications-read`, 'PUT');
    loadNotifications();
}

document.addEventListener('click', e => {
    const panel = document.getElementById('notifPanel');
    const wrap  = e.target.closest('.notif-wrap');
    if (panel && !wrap) panel.classList.remove('open');
});

// Refresh the unread badge periodically so new notifications appear
// without needing a page reload. Skipped while the panel is open so
// the list doesn't shuffle under the user's cursor mid-click.
let notifPollTimer = null;
function startNotifPolling() {
    if (notifPollTimer) clearInterval(notifPollTimer);
    notifPollTimer = setInterval(() => {
        if (!currentUser) return;
        const panel = document.getElementById('notifPanel');
        if (panel && panel.classList.contains('open')) return;
        loadNotifications();
    }, 60000);
}
function stopNotifPolling() {
    if (notifPollTimer) { clearInterval(notifPollTimer); notifPollTimer = null; }
}
