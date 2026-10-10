function applyResponsiveTableLabels(root) {
    (root || document).querySelectorAll('.table-container table').forEach(table => {
        const headerRows = table.querySelectorAll('thead tr');
        if (headerRows.length !== 1) return; // skip multi-row/complex headers (e.g. DTR AM/PM tables) - those keep horizontal scroll instead
        const labels = Array.from(headerRows[0].children).map(th => th.textContent.trim());
        if (!labels.length) return;
        table.querySelectorAll('tbody tr, tfoot tr').forEach(tr => {
            Array.from(tr.children).forEach((td, i) => {
                if (td.tagName !== 'TD') return;
                if ((parseInt(td.getAttribute('colspan') || '1', 10)) > 1) { td.removeAttribute('data-label'); return; }
                if (labels[i]) td.setAttribute('data-label', labels[i]);
            });
        });
        const wrap = table.closest('.table-container');
        if (wrap) wrap.classList.add('responsive');
    });
}

function setupResponsiveTableObserver() {
    applyResponsiveTableLabels();
    autoPairFormLabels();
    let pending = false;
    const observer = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { applyResponsiveTableLabels(); autoPairFormLabels(); pending = false; });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// ============================================================
//  ACCESSIBILITY: auto-pair <label> with its form field
//  Most of this app's forms are built as "<label>Text</label><input...>"
//  siblings inside a .form-group, with no id/for pairing - that's an
//  accessibility issue (DevTools "No label associated with a form field").
//  Rather than hand-editing id/for into every one of the ~50 affected
//  fields across every page, this runs once per render (via the same
//  observer that drives the responsive table labels above) and wires
//  up any label it finds that isn't already paired.
// ============================================================
let _autoLabelSeq = 0;
function autoPairFormLabels(root) {
    (root || document).querySelectorAll('label:not([for])').forEach(label => {
        if (label.querySelector('input, select, textarea')) return; // label already wraps its control - no 'for' needed
        const group = label.closest('.form-group') || label.parentElement;
        if (!group) return;
        const control = group.querySelector('input, select, textarea');
        if (!control || control.hasAttribute('aria-hidden')) return;
        if (!control.id) control.id = `fld_${control.name || 'auto'}_${_autoLabelSeq++}`;
        label.setAttribute('for', control.id);
    });
}

