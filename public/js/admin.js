/* ═══════════════════════════════════════════════════════════
   admin.js  —  Reality TV Intelligence Dashboard 2026
   Password-protected admin mode + GitHub global save.

   HOW TO CHANGE PASSWORD:
   1. Open browser console
   2. Run:  await adminHash('your-new-password')
   3. Copy the hash
   4. Set it as the ADMIN_HASH environment variable in Vercel
      (Settings → Environment Variables → ADMIN_HASH)
   5. You never store the raw password anywhere.
═══════════════════════════════════════════════════════════ */

const ADMIN_SESSION_KEY = 'realityTV2026_admin_v1';
const ADMIN_SESSION_TTL = 4 * 60 * 60 * 1000; // 4 hours

/* ─── HASH HELPER ────────────────────────────────────────── */
async function adminHash(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  console.log('[Admin] Hash:', hex);
  return hex;
}

/* ─── SESSION ────────────────────────────────────────────── */
function _isAdminSession() {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const { ts, hash } = JSON.parse(raw);
    return (Date.now() - ts) < ADMIN_SESSION_TTL && !!hash;
  } catch { return false; }
}
function _getSessionHash() {
  try { return JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || '{}').hash || ''; }
  catch { return ''; }
}
function _setAdminSession(hash) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ ts: Date.now(), hash }));
}
function _clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

/* ─── ADMIN STATE ────────────────────────────────────────── */
let _isAdmin = false;
function isAdmin() { return _isAdmin; }

/* ─── VERIFY PASSWORD AGAINST SERVER ────────────────────── */
async function verifyPassword(pw) {
  const hash = await adminHash(pw);
  // Verify by attempting a test save to the API — if 401, wrong password
  // We send an empty probe; the server checks only the hash header.
  try {
    const r = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Hash': hash },
      body: JSON.stringify({ probe: true }),
    });
    if (r.ok) return hash;
    if (r.status === 401) return null;
    // If /api/verify doesn't exist (local dev), fall back to env hash comparison
    return null;
  } catch {
    return null;
  }
}

/* ─── LOGIN MODAL ────────────────────────────────────────── */
function openAdminLogin() {
  document.getElementById('admin-modal').classList.add('open');
  setTimeout(() => document.getElementById('admin-pw-input')?.focus(), 80);
}
function closeAdminLogin() {
  document.getElementById('admin-modal').classList.remove('open');
  const inp = document.getElementById('admin-pw-input');
  if (inp) inp.value = '';
  const err = document.getElementById('admin-login-err');
  if (err) err.textContent = '';
}

async function submitAdminLogin() {
  const pw  = document.getElementById('admin-pw-input')?.value || '';
  const err = document.getElementById('admin-login-err');
  const btn = document.getElementById('admin-login-btn');

  if (!pw) { if (err) err.textContent = 'Enter your password.'; return; }

  if (btn) { btn.textContent = 'Verifying…'; btn.disabled = true; }
  if (err) err.textContent = '';

  const hash = await verifyPassword(pw);

  if (btn) { btn.textContent = 'Unlock Admin Mode'; btn.disabled = false; }

  if (hash) {
    _setAdminSession(hash);
    _isAdmin = true;
    closeAdminLogin();
    applyAdminUI(true);
    toast('✓ Admin mode unlocked — edits save globally');
  } else {
    if (err) err.textContent = 'Incorrect password. Try again.';
    const inp = document.getElementById('admin-pw-input');
    if (inp) { inp.value = ''; inp.focus(); }
  }
}

function adminLogout() {
  _clearAdminSession();
  _isAdmin = false;
  if (typeof editMode !== 'undefined' && editMode) {
    editMode = false;
    document.body.classList.remove('edit-on');
    if (typeof renderAll === 'function') renderAll();
  }
  applyAdminUI(false);
  toast('Logged out of admin mode', 'warn');
}

/* ─── APPLY ADMIN UI ─────────────────────────────────────── */
function applyAdminUI(on) {
  document.body.classList.toggle('admin-active', on);

  const btn = document.getElementById('admin-toggle-btn');
  if (btn) {
    btn.textContent = on ? '🔓 Admin: ON' : '🔒 Admin';
    btn.style.color       = on ? 'var(--grn)' : '';
    btn.style.borderColor = on ? 'var(--grn)' : '';
    btn.onclick = on ? adminLogout : openAdminLogin;
    btn.title   = on ? 'Click to log out' : 'Admin login';
  }

  const vb = document.getElementById('viewer-banner');
  const as = document.getElementById('activity-section');
  if (vb) vb.style.display = on ? 'none' : '';
  if (as) as.style.display = on ? '' : 'none';

  document.dispatchEvent(new CustomEvent('adminStateChange', { detail: { admin: on } }));

  if (typeof renderAll === 'function') {
    setTimeout(() => {
      renderAll();
      _fixShowPanelButtons(on);
      _fixSaveButton(on);
    }, 50);
  }
}

function _fixShowPanelButtons(on) {
  if (typeof getShowKeys !== 'function') return;
  getShowKeys().forEach(k => {
    const panel = document.getElementById('panel-show-' + k);
    if (!panel) return;
    panel.querySelectorAll('.ph-act .btn, .tb-r .btn').forEach(b => {
      const txt = b.textContent || '';
      if (!txt.includes('Capture') && !txt.includes('📷')) {
        b.style.display = on ? '' : 'none';
      }
    });
  });
}
function _fixSaveButton(on) {
  document.querySelectorAll('.tb-btns .btn.b-grn').forEach(b => {
    if ((b.innerHTML || '').includes('💾') || (b.textContent || '').includes('Save')) {
      b.style.display = on ? '' : 'none';
    }
  });
}

/* ─── GLOBAL SAVE TO GITHUB ─────────────────────────────── */
let _saveInProgress = false;

async function globalSave() {
  if (!_isAdmin) { openAdminLogin(); return; }
  if (_saveInProgress) { toast('Save already in progress…', 'warn'); return; }

  const hash = _getSessionHash();
  if (!hash) { toast('Session expired — please log in again', 'err'); adminLogout(); return; }

  _saveInProgress = true;
  _setSaveStatus('saving', 'Saving to GitHub…');
  toast('💾 Saving to GitHub…');

  try {
    const payload = {
      shows: window.SHOWS,
      db:    window.DB,
    };

    const r = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-Admin-Hash':  hash,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (r.ok && data.ok) {
      _setSaveStatus('synced', 'Saved — Vercel rebuilding (~30s)');
      toast('✓ Saved to GitHub! Everyone will see updates in ~30 seconds');
      if (typeof logActivity === 'function') {
        logActivity('Global save to GitHub', Object.keys(window.DB).length + ' shows', '🌐');
      }
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (e) {
    _setSaveStatus('error', 'Save failed: ' + e.message);
    toast('Save failed: ' + e.message, 'err');
    console.error('[Admin] Global save error:', e);
  } finally {
    _saveInProgress = false;
  }
}

/* ─── SAVE STATUS BAR ────────────────────────────────────── */
function _setSaveStatus(state, msg) {
  const dot = document.getElementById('global-save-dot');
  const txt = document.getElementById('global-save-txt');
  if (dot) { dot.className = 'save-status-dot' + (state ? ' ' + state : ''); }
  if (txt) { txt.innerHTML = msg || ''; }
}

/* ─── INIT ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Auto-restore session */
  if (_isAdminSession()) {
    _isAdmin = true;
    applyAdminUI(true);
  } else {
    applyAdminUI(false);
  }

  /* Enter key on password input */
  document.getElementById('admin-pw-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAdminLogin();
  });

  /* Guard toggleEdit */
  const _origToggleEdit = window.toggleEdit;
  window.toggleEdit = function() {
    if (!_isAdmin) { openAdminLogin(); return; }
    _origToggleEdit?.();
  };

  /* Guard write operations */
  _guardFn('openAdd',      fn => function(dk)      { if (!_isAdmin) { openAdminLogin(); return; } fn(dk); });
  _guardFn('openEdit',     fn => function(k, id)   { if (!_isAdmin) { openAdminLogin(); return; } fn(k, id); });
  _guardFn('delRow',       fn => function(k, id)   { if (!_isAdmin) { openAdminLogin(); return; } fn(k, id); });
  _guardFn('openShowMgr',  fn => function()        { if (!_isAdmin) { openAdminLogin(); return; } fn(); });
  _guardFn('openHideMgr',  fn => function(k)       { if (!_isAdmin) { openAdminLogin(); return; } fn(k); });
  _guardFn('toggleH',      fn => function(k, id)   { if (!_isAdmin) return; fn(k, id); });
  _guardFn('toggleSaveBar',fn => function()        { if (!_isAdmin) { openAdminLogin(); return; } fn(); });
  _guardFn('showAll',      fn => function()        { if (!_isAdmin) return; fn(); });
  _guardFn('hideRumoured', fn => function()        { if (!_isAdmin) return; fn(); });
  _guardFn('hideAllVisible',fn => function()       { if (!_isAdmin) return; fn(); });

  /* Patch renderTable/renderCards to hide edit buttons for public */
  _patchRender('renderTable',  key => {
    if (_isAdmin) return;
    const tbody = document.getElementById('tb-' + key);
    if (tbody) tbody.querySelectorAll('.hide-btn, .btn.b-xs').forEach(b => b.style.display = 'none');
  });
  _patchRender('renderCards', key => {
    if (_isAdmin) return;
    const grid = document.getElementById('sw-' + key + '-cgrid');
    if (grid) grid.querySelectorAll('.ccard-footer').forEach(f => f.style.display = 'none');
  });
});

function _guardFn(name, wrap) {
  const orig = window[name];
  if (typeof orig === 'function') window[name] = wrap(orig);
}
function _patchRender(name, afterFn) {
  const orig = window[name];
  if (typeof orig !== 'function') return;
  window[name] = function(key) {
    orig(key);
    afterFn(key);
  };
}
