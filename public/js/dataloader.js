/* ═══════════════════════════════════════════════════════════
   dataloader.js  —  Reality TV Intel 2026
   Fetches the latest data.js from GitHub on every page load.
   No tokens. No server. No API keys. Zero config beyond:

   HOW TO CONFIGURE:
   Set your GitHub username and repo name below — that's it.
═══════════════════════════════════════════════════════════ */

const DATA_CONFIG = {
  owner:  'BobMasterBillie',
  repo:   'realitytv2026',
  file:   'public/data/data.js',
  branch: 'main',
};

function _rawUrl() {
  const { owner, repo, file, branch } = DATA_CONFIG;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file}`;
}

/* ─── LOAD FROM GITHUB ──────────────────────────────────── */
async function loadDataFromGitHub() {
  const url = _rawUrl();

  try {
    const res = await fetch(url + '?cb=' + Date.now(), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);

    const code = await res.text();
    // eslint-disable-next-line no-new-func
    new Function(code)();

    console.log('[DataLoader] ✓ Loaded from GitHub:', url);
    return true;

  } catch (err) {
    console.warn('[DataLoader] GitHub fetch failed, using bundled data.js:', err.message);
    return false;
  }
}

/* ─── BOOT SEQUENCE ─────────────────────────────────────── */
window._dataReady = false;

async function bootApp() {
  await loadDataFromGitHub();
  window._dataReady = true;

  if (typeof getShowKeys !== 'function') return;

  /* Restore hidden shows from data.js if present */
  if (Array.isArray(window.HIDDEN_SHOWS_INIT) && typeof HIDDEN_SHOWS !== 'undefined') {
    HIDDEN_SHOWS.clear();
    window.HIDDEN_SHOWS_INIT.forEach(k => HIDDEN_SHOWS.add(k));
  }

  /* Clear panels built from bundled data, rebuild with fresh data */
  const dp = document.getElementById('dynamic-panels');
  if (dp) dp.innerHTML = '';

  Object.keys(window.SHOWS || {}).forEach(k => {
    if (typeof buildShowPanel === 'function') buildShowPanel(k);
  });

  if (typeof rebuildSidebar       === 'function') rebuildSidebar();
  if (typeof renderAll            === 'function') renderAll();
  if (typeof renderOverview       === 'function') renderOverview();
  if (typeof updateStats          === 'function') updateStats();
  if (typeof rebuildExportPanel   === 'function') rebuildExportPanel();
  if (typeof renderActivityFeed   === 'function') renderActivityFeed();
  if (typeof _populateRankFilters === 'function') _populateRankFilters();

  /* Restore theme */
  try {
    const t = localStorage.getItem('realityTV2026_theme') || 'dark';
    if (typeof setTheme === 'function') setTheme(t, false);
  } catch {}
}
