/* ═══════════════════════════════════════════════════════════
   persistence.js  —  Reality TV Intelligence Dashboard 2026
   Save / load (localStorage + JSON), CSV / JSON export,
   bulk follower import, screenshot capture.
═══════════════════════════════════════════════════════════ */

/* ─── SAVE BAR ──────────────────────────────────────────── */
let saveBarOpen = false;

function toggleSaveBar() {
  saveBarOpen = !saveBarOpen;
  document.getElementById('save-bar').classList.toggle('open', saveBarOpen);
}

/* ─── LOCAL STORAGE ─────────────────────────────────────── */
const LS_KEY = 'realityTV2026_v2';
let autosaveTimer = null;

function setLSDot(state) {
  const dot = document.getElementById('ls-dot');
  if (!dot) return;
  dot.className = 'ls-dot' + (state === 'saved' ? ' saved' : state === 'saving' ? ' saving' : '');
}

function saveToLocalStorage(showToast = false) {
  try {
    const payload = JSON.stringify({
      shows:  window.SHOWS,
      db:     window.DB,
      hidden: [...HIDDEN],
      theme:  typeof getCurrentTheme === 'function' ? getCurrentTheme() : 'dark',
      ts:     Date.now(),
    });
    localStorage.setItem(LS_KEY, payload);
    setLSDot('saved');
    if (showToast) toast('\u2713 Saved to browser storage');
    setTimeout(() => setLSDot('idle'), 2000);
  } catch (e) {
    toast('Save failed: ' + e.message, 'err');
    setLSDot('idle');
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) { toast('No saved data found', 'warn'); return; }
    const data = JSON.parse(raw);
    const ago  = Math.round((Date.now() - (data.ts || 0)) / 60000);
    if (!confirm('Restore saved data from ' + ago + ' minutes ago? This will overwrite the current session.')) return;
    _applyImport(data);
    toast('\u2713 Restored save from ' + ago + ' minutes ago');
  } catch (e) {
    toast('Restore failed: ' + e.message, 'err');
  }
}

function clearLocalStorage() {
  if (!confirm('Clear all saved browser data? Cannot be undone.')) return;
  localStorage.removeItem(LS_KEY);
  setLSDot('idle');
  toast('Browser storage cleared', 'warn');
}

function toggleAutosave(on) {
  document.getElementById('autosave-lbl').textContent = 'Auto-save ' + (on ? 'ON' : 'OFF');
  clearInterval(autosaveTimer);
  if (on) {
    autosaveTimer = setInterval(() => { setLSDot('saving'); saveToLocalStorage(false); }, 30000);
    saveToLocalStorage(true);
    toast('\u2713 Auto-save ON \u2014 saves every 30 seconds');
  } else {
    setLSDot('idle');
    toast('Auto-save OFF', 'warn');
  }
}

function checkSavedData() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const ago  = Math.round((Date.now() - (data.ts || 0)) / 60000);
    const dot  = document.getElementById('ls-dot');
    if (dot) {
      dot.className = 'ls-dot saved';
      dot.title = 'Saved data exists (' + ago + ' min ago). Click Restore to load.';
    }
  } catch (e) { /* ignore */ }
}

/* ─── JSON IMPORT ───────────────────────────────────────── */
function openImportModal() { document.getElementById('modal-import').classList.add('open'); }

function handleJSONFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => importJSONData(e.target.result);
  reader.readAsText(file);
}

function handleJSONDrop(e) {
  e.preventDefault();
  document.getElementById('import-drop').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file || !file.name.endsWith('.json')) { toast('Please drop a .json file', 'err'); return; }
  const reader = new FileReader();
  reader.onload = ev => importJSONData(ev.target.result);
  reader.readAsText(file);
}

function importJSONData(raw) {
  try {
    const data = JSON.parse(raw);
    if (!confirm('Import this file? It will replace all current data.')) return;
    _applyImport(data);
    closeModal('modal-import');
    toast('\u2713 Data imported successfully');
    logActivity('Imported JSON backup', Object.keys(data.shows || {}).length + ' shows', '📥');
  } catch (e) {
    toast('Import failed: ' + e.message, 'err');
  }
}

/** Shared logic for applying any imported data object (JSON file or localStorage). */
function _applyImport(data) {
  // Support both { shows, db } and { shows, contestants } shapes
  if (data.shows)       window.SHOWS = data.shows;
  if (data.db)          window.DB    = data.db;
  else if (data.contestants) window.DB = data.contestants;
  if (data.hidden) { HIDDEN.clear(); data.hidden.forEach(h => HIDDEN.add(h)); }
  if (typeof setTheme === 'function') setTheme(data.theme || localStorage.getItem('realityTV2026_theme') || 'dark', false);

  // Rebuild all dynamic panels in release-date order
  if (typeof refreshShowUIs === 'function') {
    refreshShowUIs();
  } else {
    document.getElementById('dynamic-panels').innerHTML = '';
    (typeof getShowKeys === 'function' ? getShowKeys() : Object.keys(window.SHOWS)).forEach(k => buildShowPanel(k));
    rebuildSidebar();
    renderAll();
    renderOverview();
    updateStats();
  }
}

/* ─── BULK FOLLOWER IMPORT ──────────────────────────────── */
function bulkImportFollowers() {
  const lines   = document.getElementById('bulk-import-txt').value.trim().split('\n');
  const today   = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  let updated   = 0;
  const skipped = [];

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    const parts = line.split(',').map(s => s.trim());
    if (parts.length < 3) { skipped.push(line); return; }
    const [nameRaw, showKey, follRaw] = parts;
    const name = nameRaw.toLowerCase();
    const k    = showKey.toLowerCase().replace(/\s/g, '');
    if (!window.DB[k]) { skipped.push(line + ' (show "' + k + '" not found)'); return; }

    // Fuzzy name match: full name or first token match
    const c = window.DB[k].find(x =>
      x.name.toLowerCase().includes(name) ||
      name.includes(x.name.toLowerCase().split(' ')[0])
    );
    if (!c) { skipped.push(line + ' (contestant not found)'); return; }

    // Shift current → last before overwriting
    if (c.follCur && c.follCur !== 'N/V') {
      c.follLast     = c.follCur;
      c.follLastDate = c.follCurDate || today;
    }
    c.follCur     = follRaw;
    c.follCurDate = today;
    updated++;
  });

  renderAll();
  let msg = '\u2713 Updated ' + updated + ' contestants';
  if (skipped.length) msg += ' | Skipped ' + skipped.length + ': ' + skipped.slice(0, 3).join('; ');
  toast(msg, updated > 0 ? '' : 'warn');
  if (updated > 0) {
    saveToLocalStorage(false);
    logActivity('Bulk follower update', updated + ' contestants updated', '📊');
  }
}

/* ─── EXPORTS ── moved to js/export.js ──────────────────── */


/* ─── EXPORT PANEL ──────────────────────────────────────── */
function rebuildExportPanel() {
  const el = document.getElementById('per-show-exp');
  if (!el) return;
  el.innerHTML = (typeof getShowKeys === 'function' ? getShowKeys() : Object.keys(window.SHOWS)).map(k =>
    `<button class="btn b-gld b-sm" onclick="capture('sw-${k}-tbl','${k}_Table')">&#128248; ${window.SHOWS[k].emoji || ''} ${window.SHOWS[k].label} Table</button>
     <button class="btn b-gh b-sm"  onclick="capture('sw-${k}-gtbl','${k}_Growth')">&#128200; ${window.SHOWS[k].label} Growth</button>`
  ).join('');
}

/* ─── SCREENSHOT / CAPTURE ──────────────────────────────── */
let _captureCanvas  = null;
let _captureFilename = 'capture';

// UI elements to hide before taking a screenshot
const HIDE_IN_CAPTURE = [
  '.topbar', '.sidebar', '.tbar', '.tab-bar', '.save-bar',
  '.ph-act', '.tb-r', '.tb-l button',
  '.hid-notice', '.hide-btn', '.btn.b-red', '.btn.b-xs',
  '#editBtn', '#save-bar', '.ccard-footer .btn',
];

async function capture(elId, filename) {
  const el = document.getElementById(elId);
  if (!el) { toast('Element not found: ' + elId, 'err'); return; }
  _captureFilename = (filename || elId).replace(/[^a-z0-9_-]/gi, '_');

  // Show modal in loading state
  const bg      = document.getElementById('cap-modal-bg');
  const img     = document.getElementById('cap-preview-img');
  const spinner = document.getElementById('cap-spinner');
  const info    = document.getElementById('cap-info');
  const btnPng  = document.getElementById('cap-save-png');
  const btnJpg  = document.getElementById('cap-save-jpg');
  const btnCopy = document.getElementById('cap-copy');
  const btnPrint= document.getElementById('cap-print');

  img.style.display = 'none';
  spinner.style.display = 'flex';
  info.textContent = 'Generating\u2026';
  [btnPng, btnJpg, btnCopy, btnPrint].forEach(b => { if (b) b.disabled = true; });
  bg.classList.add('open');
  _captureCanvas = null;

  try {
    // Temporarily reveal hidden element if needed for off-screen capture
    const wasHidden  = getComputedStyle(el).display === 'none' || el.offsetParent === null;
    const origStyle  = el.getAttribute('style') || '';
    if (wasHidden) {
      el.style.cssText = 'position:fixed!important;left:-9999px!important;top:0!important;display:block!important;z-index:-1!important;min-width:1200px!important;background:#0A0A12!important;';
    }

    // Hide UI chrome before capture
    const hiddenEls = [];
    HIDE_IN_CAPTURE.forEach(sel => {
      el.querySelectorAll(sel).forEach(node => {
        if (getComputedStyle(node).display !== 'none') {
          hiddenEls.push({ node, visibility: node.style.visibility });
          node.style.visibility = 'hidden';
        }
      });
    });
    // Also hide any action/export buttons inside the target
    el.querySelectorAll('[onclick*="capture"],[onclick*="exportCSV"],[onclick*="openAdd"],[onclick*="openHideMgr"],[onclick*="openShowMgr"]').forEach(node => {
      hiddenEls.push({ node, visibility: node.style.visibility });
      node.style.visibility = 'hidden';
    });

    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 180)));

    const canvas = await html2canvas(el, {
      backgroundColor: '#0A0A12',
      scale:           2,
      useCORS:         true,
      allowTaint:      true,
      logging:         false,
      width:           el.scrollWidth,
      height:          el.scrollHeight,
      windowWidth:     Math.max(el.scrollWidth + 100, 1400),
      ignoreElements:  node => {
        const tag = node.tagName?.toLowerCase();
        if (tag === 'button') return true;
        const cls = node.className || '';
        if (typeof cls === 'string') {
          if (cls.includes('tbar') || cls.includes('tab-bar') || cls.includes('ph-act') ||
              cls.includes('tb-r') || cls.includes('hide-btn') || cls.includes('save-bar') ||
              cls.includes('hid-notice') || cls.includes('topbar') ||
              cls.includes('sidebar') || cls.includes('no-capture')) return true;
        }
        return false;
      },
    });

    // Restore visibility
    hiddenEls.forEach(({ node, visibility }) => { node.style.visibility = visibility; });
    if (wasHidden) el.setAttribute('style', origStyle);

    _captureCanvas = canvas;
    const dataURL  = canvas.toDataURL('image/png');
    const w = canvas.width / 2, h = canvas.height / 2;

    img.src = dataURL;
    img.style.display   = 'block';
    spinner.style.display = 'none';
    info.textContent    = `${Math.round(w)} \u00d7 ${Math.round(h)}px \u00b7 2\u00d7 retina`;
    [btnPng, btnJpg, btnCopy, btnPrint].forEach(b => { if (b) b.disabled = false; });
    toast('\u2713 Preview ready \u2014 choose Save, Copy or Print');

  } catch (e) {
    spinner.style.display = 'none';
    info.textContent = 'Failed: ' + e.message;
    toast('Capture failed: ' + e.message + '. Try Ctrl+P for PDF.', 'err');
    console.error(e);
  }
}

function captureCurrentPanel() {
  const active = document.querySelector('.panel.active');
  if (!active) { toast('No active panel found', 'err'); return; }
  capture(active.id, 'CurrentView');
}

function closeCaptureModal() {
  document.getElementById('cap-modal-bg').classList.remove('open');
  const img = document.getElementById('cap-preview-img');
  img.src = ''; img.style.display = 'none';
  document.getElementById('cap-spinner').style.display = 'flex';
  _captureCanvas = null;
}

function saveCapture(fmt) {
  if (!_captureCanvas) { toast('No capture ready', 'err'); return; }
  const date = new Date().toISOString().slice(0, 10);
  const a    = document.createElement('a');
  if (fmt === 'jpg') {
    a.href     = _captureCanvas.toDataURL('image/jpeg', 0.95);
    a.download = _captureFilename + '_' + date + '.jpg';
  } else {
    a.href     = _captureCanvas.toDataURL('image/png');
    a.download = _captureFilename + '_' + date + '.png';
  }
  a.click();
  toast('\u2713 Saved: ' + a.download);
}

async function copyCapture() {
  if (!_captureCanvas) { toast('No capture ready', 'err'); return; }
  try {
    _captureCanvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast('\u2713 Image copied to clipboard \u2014 paste anywhere');
      } catch (e) {
        // Clipboard API blocked — open in new tab as fallback
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast('Clipboard blocked \u2014 image opened in new tab (right-click to save)', 'warn');
      }
    }, 'image/png');
  } catch (e) {
    toast('Copy failed: ' + e.message, 'err');
  }
}

function printCapture() {
  if (!_captureCanvas) { toast('No capture ready', 'err'); return; }
  const dataURL = _captureCanvas.toDataURL('image/png');
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Print</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}
    img{max-width:100%;height:auto;display:block}
    @media print{img{max-width:100%;page-break-inside:avoid}}</style>
    </head><body><img src="${dataURL}" onload="window.print();setTimeout(()=>window.close(),500)"></body></html>`);
  win.document.close();
}

/* ─── INIT PERSISTENCE ──────────────────────────────────── */
/* ─── ACTIVITY LOG ──────────────────────────────────────── */
const ACTIVITY_KEY = 'realityTV2026_activity';
const MAX_ACTIVITY = 50;

function logActivity(action, detail, icon) {
  try {
    const raw  = localStorage.getItem(ACTIVITY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({ action, detail: detail || '', icon: icon || '📝', ts: Date.now() });
    if (list.length > MAX_ACTIVITY) list.length = MAX_ACTIVITY;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list));
    renderActivityFeed();
  } catch (e) { /* ignore */ }
}

function getActivityLog() {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function renderActivityFeed() {
  const el = document.getElementById('recent-activity-list');
  if (!el) return;
  const log = getActivityLog();
  if (!log.length) {
    el.innerHTML = '<div class="activity-empty">No activity yet — add or edit a contestant to get started</div>';
    return;
  }
  el.innerHTML = log.slice(0, 20).map(item => {
    const ago = _agoLabel(item.ts);
    return `<div class="activity-item">
      <span class="activity-icon">${item.icon || '📝'}</span>
      <div class="activity-body">
        <span class="activity-action">${item.action}</span>
        ${item.detail ? `<span class="activity-detail"> — ${item.detail}</span>` : ''}
      </div>
      <span class="activity-time">${ago}</span>
    </div>`;
  }).join('');
}

function _agoLabel(ts) {
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 60)   return diff + 's ago';
  if (diff < 3600) return Math.round(diff / 60) + 'm ago';
  if (diff < 86400)return Math.round(diff / 3600) + 'h ago';
  return Math.round(diff / 86400) + 'd ago';
}

/* ─── AUTO-SAVE WRAPPER ─────────────────────────────────── */
function _autoPersist() {
  try { saveToLocalStorage(false); } catch(e) {}
}

/* ─── AUTO-RESTORE (runs at script parse time, before DOMContentLoaded) ── */
(function _autoRestore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.shows) window.SHOWS = data.shows;
    if (data.db)    window.DB    = data.db;
    else if (data.contestants) window.DB = data.contestants;
    if (data.hidden && typeof HIDDEN !== 'undefined') {
      HIDDEN.clear(); data.hidden.forEach(h => HIDDEN.add(h));
    }
    console.log('[Persistence] Auto-restored saved data');
  } catch (e) { console.warn('[Persistence] Auto-restore failed:', e.message); }
})();

/* ─── INIT ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('realityTV2026_theme') || 'dark';
  if (typeof setTheme === 'function') {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      setTheme((saved?.theme) || savedTheme, false);
    } catch(e) { setTheme(savedTheme, false); }
  }

  checkSavedData();

  // Inject Save button into topbar
  const tb = document.querySelector('.tb-btns');
  if (tb) {
    const btn = document.createElement('button');
    btn.className = 'btn b-grn b-sm';
    btn.innerHTML = '&#128190; Save';
    btn.onclick   = toggleSaveBar;
    tb.insertBefore(btn, tb.firstChild);
  }

  // Capture modal backdrop click
  document.getElementById('cap-modal-bg')?.addEventListener('click', function(e) {
    if (e.target === this) closeCaptureModal();
  });

  // Render activity feed on load
  setTimeout(renderActivityFeed, 200);
});

/* ─── ADMIN GUARD: hide Save bar injection for non-admins ── */
/* Persistence already injects a Save button in topbar.
   We override toggleSaveBar to require admin. */
const _origToggleSaveBar = window.toggleSaveBar;
window.toggleSaveBar = function() {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    if (typeof openAdminLogin === 'function') openAdminLogin();
    return;
  }
  _origToggleSaveBar?.();
};
