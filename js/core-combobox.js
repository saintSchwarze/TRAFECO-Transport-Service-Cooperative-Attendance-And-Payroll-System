const comboboxState = {};

function initCombobox(hiddenInputId, textInputId, listId, items, onSelect, allLabel = 'All') {
    const textInput = document.getElementById(textInputId);
    const list = document.getElementById(listId);
    if (!textInput || !list) return;

    // Read the previous listener BEFORE the state object is replaced —
    // the old code reset comboboxState[hiddenInputId] first and only
    // then checked it for a _clickAway reference, so that reference was
    // always undefined and the old document listener was never removed,
    // leaking a new one every time the combobox got re-initialized.
    const prevClickAway = comboboxState[hiddenInputId] && comboboxState[hiddenInputId]._clickAway;
    if (prevClickAway) document.removeEventListener('mousedown', prevClickAway);

    comboboxState[hiddenInputId] = { items, activeIndex: -1, onSelect, allLabel };

    // Close on 'mousedown' rather than 'click'. A mousedown outside the
    // input/list is the earliest reliable signal of an outside
    // interaction, and checking it here — rather than reacting after
    // focus/blur has already run — keeps the list open through the
    // entire click gesture on an option, so the option's own click
    // handler always gets to fire normally (no more click-and-hold).
    const clickAway = (e) => {
        if (!textInput.contains(e.target) && !list.contains(e.target)) list.style.display = 'none';
    };
    comboboxState[hiddenInputId]._clickAway = clickAway;
    document.addEventListener('mousedown', clickAway);

    textInput.oninput   = () => renderComboList(hiddenInputId, textInputId, listId, textInput.value);
    textInput.onfocus   = () => renderComboList(hiddenInputId, textInputId, listId, textInput.value);
    textInput.onkeydown = (e) => handleComboKeydown(e, hiddenInputId, textInputId, listId);
}

function comboHighlight(label, query) {
    if (!query) return escapeHtml(label);
    const idx = label.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(label);
    return escapeHtml(label.slice(0, idx)) + '<mark>' + escapeHtml(label.slice(idx, idx + query.length)) + '</mark>' + escapeHtml(label.slice(idx + query.length));
}

function renderComboList(hiddenInputId, textInputId, listId, query) {
    const state = comboboxState[hiddenInputId];
    const list  = document.getElementById(listId);
    if (!state || !list) return;
    const q = query.trim().toLowerCase();
    const filtered = q ? state.items.filter(it => it.label.toLowerCase().includes(q)) : state.items;
    state.activeIndex = -1;

    let html = '';
    if (!q) {
        html += `<div class="combobox-item combobox-all" onclick="comboboxSelect('${hiddenInputId}','${textInputId}','${listId}',this.dataset.id,this.dataset.label)" data-id="" data-label="${escapeHtml(state.allLabel)}"><i class="fas fa-users" style="margin-right:0.5rem;color:var(--text-light);"></i>${escapeHtml(state.allLabel)}</div>`;
    }
    if (filtered.length) {
        html += filtered.map(it => `<div class="combobox-item" data-id="${escapeHtml(it.id)}" data-label="${escapeHtml(it.label)}" onclick="comboboxSelect('${hiddenInputId}','${textInputId}','${listId}',this.dataset.id,this.dataset.label)">${comboHighlight(it.label, query)}</div>`).join('');
    } else if (q) {
        html += `<div class="combobox-empty">No matches found</div>`;
    }
    list.innerHTML = html;
    list.style.display = 'block';
}

function comboboxSelect(hiddenInputId, textInputId, listId, id, label) {
    document.getElementById(hiddenInputId).value = id;
    document.getElementById(textInputId).value = label;
    document.getElementById(listId).style.display = 'none';
    const state = comboboxState[hiddenInputId];
    if (state && state.onSelect) state.onSelect(id);
}

function handleComboKeydown(e, hiddenInputId, textInputId, listId) {
    const list = document.getElementById(listId);
    if (!list || list.style.display === 'none') return;
    const items = Array.from(list.querySelectorAll('.combobox-item'));
    const state = comboboxState[hiddenInputId];
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.activeIndex = Math.min(state.activeIndex + 1, items.length - 1);
        updateComboActive(items, state.activeIndex);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.activeIndex = Math.max(state.activeIndex - 1, 0);
        updateComboActive(items, state.activeIndex);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.activeIndex >= 0 && items[state.activeIndex]) items[state.activeIndex].click();
    } else if (e.key === 'Escape') {
        list.style.display = 'none';
    }
}

function updateComboActive(items, idx) {
    items.forEach((it, i) => it.classList.toggle('active', i === idx));
    if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
}

// ============================================================
//  IN-APP NOTIFICATIONS
// ============================================================
