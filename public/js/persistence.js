/* ═══════════════════════════════════════════════════════════
   persistence.js  —  Reality TV Intel 2026
   LocalStorage · JSON import · Bulk follower import ·
   Activity log · Auto-save
═══════════════════════════════════════════════════════════ */

/* ─── SAVE BAR ──────────────────────────────────────────── */
let saveBarOpen = false;

function toggleSaveBar() {
  saveBarOpen = !saveBarOpen;
  document.getElementById('save-bar').classList.toggle('open', saveBarOpen);
}

/* ─── LOCAL STORAGE ─────────────────────────────────────── */
const LS_KEY      = 'realityTV2026_v2';
let autosaveTimer = null;

function setLSDot(state) {
  const dot = document.getElementById('ls-dot');
  if (!dot) return;
  dot.className = 'ls-dot' + (state === 'saved' ? ' saved' : state === 'saving' ? ' saving' : '');
}

function saveToLocalStorage(showToast = false) {
  try {
    const payload = JSON.stringify({
      shows:       window.SHOWS,
      db:          window.DB,
      hidden:      [...HIDDEN],
      hiddenShows: [...(typeof HIDDEN_SHOWS !== 'undefined' ? HIDDEN_SHOWS : [])],
      theme:       typeof getCurrentTheme === 'function' ? getCurrentTheme() : 'dark',
      ts:          Date.now(),
    });
    localStorage.setItem(LS_KEY, payload);
    setLSDot('saved');
    if (showToast) toast('✓ Saved to browser storage');
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
    if (!confirm(`Restore saved data from ${ago} minutes ago? This will overwrite the current session.`)) return;
    _applyImport(data);
    toast(`✓ Restored save from ${ago} minutes ago`);
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
    toast('✓ Auto-save ON — saves every 30 seconds');
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
      dot.title     = `Saved data exists (${ago} min ago). Click Restore to load.`;
    }
  } catch (e) { /* ignore */ }
}

/* ─── AUTO-RESTORE (runs at parse time, before DOMContentLoaded) ── */
(function _autoRestore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.shows) window.SHOWS = data.shows;
    if (data.db)    window.DB    = data.db;
    else if (data.contestants) window.DB = data.contestants;
    if (data.hidden && typeof HIDDEN !== 'undefined') {
      HIDDEN.clear();
      data.hidden.forEach(h => HIDDEN.add(h));
    }
    if (data.hiddenShows && typeof HIDDEN_SHOWS !== 'undefined') {
      HIDDEN_SHOWS.clear();
      data.hiddenShows.forEach(k => HIDDEN_SHOWS.add(k));
    }
    console.log('[Persistence] Auto-restored saved data');
  } catch (e) {
    console.warn('[Persistence] Auto-restore skipped:', e.message);
  }
})();

/* ─── APPLY IMPORT (shared by JSON file + localStorage restore) ── */
function _applyImport(data) {
  if (data.shows) window.SHOWS = data.shows;
  if (data.db)    window.DB    = data.db;
  else if (data.contestants) window.DB = data.contestants;
  if (data.hidden) { HIDDEN.clear(); data.hidden.forEach(h => HIDDEN.add(h)); }
  if (data.hiddenShows && typeof HIDDEN_SHOWS !== 'undefined') {
    HIDDEN_SHOWS.clear();
    data.hiddenShows.forEach(k => HIDDEN_SHOWS.add(k));
  }
  if (typeof setTheme === 'function') {
    setTheme(data.theme || localStorage.getItem('realityTV2026_theme') || 'dark', false);
  }
  if (typeof refreshShowUIs === 'function') {
    refreshShowUIs();
  } else {
    const dp = document.getElementById('dynamic-panels');
    if (dp) dp.innerHTML = '';
    (typeof getShowKeys === 'function' ? getShowKeys() : Object.keys(window.SHOWS))
      .forEach(k => { if (typeof buildShowPanel === 'function') buildShowPanel(k); });
    if (typeof rebuildSidebar === 'function') rebuildSidebar();
    if (typeof renderAll      === 'function') renderAll();
    if (typeof renderOverview === 'function') renderOverview();
    if (typeof updateStats    === 'function') updateStats();
  }
}

/* ─── JSON IMPORT MODAL ─────────────────────────────────── */
function openImportModal() {
  document.getElementById('modal-import').classList.add('open');
}

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
  if (!file || (!file.name.endsWith('.json') && !file.name.endsWith('.js'))) {
    toast('Please drop a data.js or .json file', 'err');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => importJSONData(ev.target.result);
  reader.readAsText(file);
}

function importJSONData(raw) {
  try {
    /* New data.js format (window.SHOWS = …; window.DB = …;) */
    if (raw.includes('window.SHOWS') && raw.includes('window.DB')) {
      if (!confirm('Import this data.js file? It will replace all current data.')) return;
      // eslint-disable-next-line no-new-func
      const fn = new Function(raw);
      fn();
      if (typeof refreshShowUIs === 'function') {
        refreshShowUIs();
      } else {
        const dp = document.getElementById('dynamic-panels');
        if (dp) dp.innerHTML = '';
        Object.keys(window.SHOWS).forEach(k => {
          if (typeof buildShowPanel === 'function') buildShowPanel(k);
        });
        if (typeof rebuildSidebar === 'function') rebuildSidebar();
        if (typeof renderAll      === 'function') renderAll();
        if (typeof renderOverview === 'function') renderOverview();
        if (typeof updateStats    === 'function') updateStats();
      }
      closeModal('modal-import');
      toast('✓ data.js imported successfully');
      logActivity('Imported data.js', Object.keys(window.SHOWS).length + ' shows', '📥');
      return;
    }

    /* Legacy JSON format { shows, db } or { shows, contestants } */
    const data = JSON.parse(raw);
    if (!confirm('Import this JSON file? It will replace all current data.')) return;
    _applyImport(data);
    closeModal('modal-import');
    toast('✓ Data imported successfully');
    logActivity('Imported JSON', Object.keys(data.shows || {}).length + ' shows', '📥');

  } catch (e) {
    toast('Import failed: ' + e.message, 'err');
    console.error('[Import]', e);
  }
}

/* ─── BULK FOLLOWER IMPORT ──────────────────────────────── */
function bulkImportFollowers() {
  const lines   = document.getElementById('bulk-import-txt').value.trim().split('\n');
  const today   = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
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
    if (!window.DB[k]) { skipped.push(`${line} (show "${k}" not found)`); return; }

    const c = window.DB[k].find(x =>
      x.name.toLowerCase().includes(name) ||
      name.includes(x.name.toLowerCase().split(' ')[0])
    );
    if (!c) { skipped.push(`${line} (contestant not found)`); return; }

    /* Shift current → last */
    if (c.follCur && c.follCur !== 'N/V') {
      c.follLast     = c.follCur;
      c.follLastDate = c.follCurDate || today;
    }
    c.follCur     = normalizeFollowerInput(follRaw);
    c.follCurDate = today;
    updated++;
  });

  if (typeof renderAll === 'function') renderAll();

  let msg = `✓ Updated ${updated} contestant${updated !== 1 ? 's' : ''}`;
  if (skipped.length) msg += ` | Skipped ${skipped.length}: ${skipped.slice(0, 3).join('; ')}`;
  toast(msg, updated > 0 ? '' : 'warn');

  if (updated > 0) {
    saveToLocalStorage(false);
    logActivity('Bulk follower update', `${updated} contestants updated`, '📊');
  }
}

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
  } catch { return []; }
}

function renderActivityFeed() {
  const el = document.getElementById('recent-activity-list');
  if (!el) return;
  const log = getActivityLog();
  if (!log.length) {
    el.innerHTML = '<div class="activity-empty">No activity yet — add or edit a contestant to get started</div>';
    return;
  }
  el.innerHTML = log.slice(0, 20).map(item => `
    <div class="activity-item">
      <span class="activity-icon">${item.icon || '📝'}</span>
      <div class="activity-body">
        <span class="activity-action">${sanitizeHTML(item.action)}</span>
        ${item.detail ? `<span class="activity-detail"> — ${sanitizeHTML(item.detail)}</span>` : ''}
      </div>
      <span class="activity-time">${_agoLabel(item.ts)}</span>
    </div>`).join('');
}

function _agoLabel(ts) {
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 60)    return diff + 's ago';
  if (diff < 3600)  return Math.round(diff / 60) + 'm ago';
  if (diff < 86400) return Math.round(diff / 3600) + 'h ago';
  return Math.round(diff / 86400) + 'd ago';
}

/* ─── AUTO-PERSIST (called after any data mutation) ─────── */
function _autoPersist() {
  try { saveToLocalStorage(false); } catch (e) { /* ignore */ }
}

/* ─── INIT ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Restore theme */
  try {
    const raw    = localStorage.getItem(LS_KEY);
    const saved  = raw ? JSON.parse(raw) : null;
    const theme  = saved?.theme || localStorage.getItem('realityTV2026_theme') || 'dark';
    if (typeof setTheme === 'function') setTheme(theme, false);
  } catch (e) {
    if (typeof setTheme === 'function') setTheme('dark', false);
  }

  checkSavedData();
  setTimeout(renderActivityFeed, 250);
});
