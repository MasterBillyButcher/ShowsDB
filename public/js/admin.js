/* ═══════════════════════════════════════════════════════════
   admin.js  —  Reality TV Intel 2026
   Client-side admin auth. SHA-256 hashed password.
   Session stored in sessionStorage (8-hour expiry).
═══════════════════════════════════════════════════════════ */

const ADMIN_HASH        = '3735cf4bc639bebada2d3a5e56bf8da27741e2566cb8883ea1587f9251066922';
const ADMIN_SESSION_KEY = 'rtv_admin_session';
const SESSION_HOURS     = 8;

async function sha256(message) {
  const msgBuf  = new TextEncoder().encode(message);
  const hashBuf = await crypto.subtle.digest('SHA-256', msgBuf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

/* ── Session management ───────────────────────────────────── */
function saveAdminSession() {
  const expiry = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ expiry }));
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

function isAdminSessionValid() {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const { expiry } = JSON.parse(raw);
    return Date.now() < expiry;
  } catch {
    return false;
  }
}

/* ── Activate / deactivate admin UI ──────────────────────── */
function activateAdmin() {
  document.body.classList.add('admin-active');
  const btn = document.getElementById('admin-toggle-btn');
  if (btn) {
    btn.innerHTML = '🔓 Admin';
    btn.onclick   = deactivateAdmin;
    btn.title     = 'Click to log out of admin';
    btn.style.color       = 'var(--gld)';
    btn.style.borderColor = 'rgba(245,166,35,.4)';
  }
  const sw = document.getElementById('save-workflow');
  if (sw) sw.style.display = 'flex';
  toast('🔓 Admin mode active', 'warn');
}

function deactivateAdmin() {
  if (!confirm('Log out of admin mode?')) return;
  clearAdminSession();
  document.body.classList.remove('admin-active');
  editMode = false;
  const eb = document.getElementById('editBtn');
  if (eb) { eb.textContent = '✎ Edit: OFF'; eb.style.color = ''; eb.style.borderColor = ''; }
  document.body.classList.remove('edit-on');
  const btn = document.getElementById('admin-toggle-btn');
  if (btn) {
    btn.innerHTML = '🔒 Admin';
    btn.onclick   = openAdminLogin;
    btn.style.color       = '';
    btn.style.borderColor = '';
  }
  const sw = document.getElementById('save-workflow');
  if (sw) sw.style.display = 'none';
  toast('🔒 Logged out of admin mode');
}

/* ── Login modal ──────────────────────────────────────────── */
function openAdminLogin() {
  if (isAdminSessionValid()) { activateAdmin(); return; }
  document.getElementById('admin-modal').classList.add('open');
  document.getElementById('admin-pw-input').value = '';
  document.getElementById('admin-login-err').textContent = '';
  setTimeout(() => document.getElementById('admin-pw-input').focus(), 80);
}

function closeAdminLogin() {
  document.getElementById('admin-modal').classList.remove('open');
}

async function submitAdminLogin() {
  const pw  = document.getElementById('admin-pw-input').value;
  const err = document.getElementById('admin-login-err');
  const btn = document.getElementById('admin-login-btn');

  if (!pw) { err.textContent = 'Password required.'; return; }

  btn.disabled    = true;
  btn.textContent = 'Checking…';
  err.textContent = '';

  try {
    const hash    = await sha256(pw);
    const isValid = hash === ADMIN_HASH;

    if (isValid) {
      saveAdminSession();
      closeAdminLogin();
      activateAdmin();
    } else {
      err.textContent = 'Incorrect password.';
      document.getElementById('admin-pw-input').value = '';
      document.getElementById('admin-pw-input').focus();
    }
  } catch (e) {
    err.textContent = 'Auth error: ' + e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Unlock Admin Mode';
  }
}

/* ── Enter key on password field ──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('admin-pw-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAdminLogin();
  });

  if (isAdminSessionValid()) {
    activateAdmin();
  }
});
