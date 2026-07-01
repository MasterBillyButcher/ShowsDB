/* ═══════════════════════════════════════════════════════════
   export.js  —  Reality TV Intel 2026
   CSV · JSON · Bulk import · Screenshot capture
═══════════════════════════════════════════════════════════ */

/* ─── JSON EXPORT (Save as data.js) ─────────────────────── */
function exportJSON() {
  const now    = new Date();
  const stamp  = now.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const header = `/* ═══════════════════════════════════════════════════════════
   data.js  —  Reality TV Intelligence Dashboard 2026
   Last saved: ${stamp}

   HOW TO UPDATE EVERYONE:
   Upload this file to GitHub at:  public/data/data.js
   Everyone sees your changes on their next page load.
═══════════════════════════════════════════════════════════ */\n\n`;

  const body = `window.SHOWS = ${JSON.stringify(window.SHOWS, null, 2)};\n\nwindow.DB = ${JSON.stringify(window.DB, null, 2)};\n\nwindow.HIDDEN_SHOWS_INIT = ${JSON.stringify([...(typeof HIDDEN_SHOWS !== 'undefined' ? HIDDEN_SHOWS : [])])};\n`;
  const blob = new Blob([header + body], { type: 'application/javascript' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'data.js';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✓ data.js downloaded — upload to GitHub to publish');
  if (typeof logActivity === 'function') logActivity('Exported data.js', Object.keys(window.SHOWS).length + ' shows', '📁');
}

/* ─── CSV HELPERS ───────────────────────────────────────── */
function csvRow(arr) {
  return arr.map(v => {
    const s = String(v ?? '').replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  }).join(',') + '\r\n';
}

function downloadCSV(filename, rows) {
  const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ─── SINGLE SHOW CSV ───────────────────────────────────── */
function exportCSV(key) {
  const s    = window.SHOWS[key];
  const data = (window.DB[key] || []).filter(c => !isH(key, c.id));
  if (!data.length) { toast('No visible contestants to export', 'warn'); return; }

  const hdrs = ['#','Name','Gender','Status','Tier','Profession','Instagram',
    'Followers Before','Before Date','Followers Last','Last Date',
    'Followers Current','Current Date','Known For','History'];
  let out = csvRow(hdrs);
  data.forEach((c, i) => {
    const g = calcGrowth(c.follLast, c.follCur);
    out += csvRow([
      i + 1, c.name, c.gender, c.status, c.tier, c.profession,
      c.ig, c.follBefore, c.follBeforeDate, c.follLast, c.follLastDate,
      c.follCur, c.follCurDate, c.knownFor, c.history
    ]);
  });
  downloadCSV(`${key}_roster_${_dateStamp()}.csv`, out);
  toast(`✓ ${s?.label || key} roster exported`);
}

/* ─── ALL SHOWS CSV ─────────────────────────────────────── */
function exportAllCSV() {
  const hdrs = ['Show','#','Name','Gender','Status','Tier','Profession','Instagram',
    'Followers Before','Followers Last','Followers Current','Known For'];
  let out = csvRow(hdrs);
  getShowKeys().filter(k => !isShowHidden(k)).forEach(k => {
    (window.DB[k] || []).filter(c => !isH(k, c.id)).forEach((c, i) => {
      out += csvRow([
        window.SHOWS[k]?.label || k,
        i + 1, c.name, c.gender, c.status, c.tier, c.profession,
        c.ig, c.follBefore, c.follLast, c.follCur, c.knownFor
      ]);
    });
  });
  downloadCSV(`all_rosters_${_dateStamp()}.csv`, out);
  toast('✓ All rosters exported');
}

/* ─── GROWTH CSV (single show) ──────────────────────────── */
function exportGrowthCSV(key) {
  const s    = window.SHOWS[key];
  const data = (window.DB[key] || []).filter(c => !isH(key, c.id));
  if (!data.length) { toast('No visible contestants to export', 'warn'); return; }

  const hdrs = ['#','Name','Before Show','Last Checked','Current',
    'Growth','Growth %','Total Growth','Total %'];
  let out = csvRow(hdrs);
  data.forEach((c, i) => {
    const g1 = calcGrowth(c.follLast,   c.follCur);
    const g2 = calcGrowth(c.follBefore, c.follCur);
    out += csvRow([i + 1, c.name, c.follBefore, c.follLast, c.follCur,
      g1.diff, g1.rate, g2.diff, g2.rate]);
  });
  downloadCSV(`${key}_growth_${_dateStamp()}.csv`, out);
  toast(`✓ ${s?.label || key} growth exported`);
}

/* ─── ALL GROWTH CSV ────────────────────────────────────── */
function exportAllGrowth() {
  const hdrs = ['Show','#','Name','Before Show','Last Checked','Current',
    'Growth','Growth %','Total Growth','Total %'];
  let out = csvRow(hdrs);
  getShowKeys().filter(k => !isShowHidden(k)).forEach(k => {
    (window.DB[k] || []).filter(c => !isH(k, c.id)).forEach((c, i) => {
      const g1 = calcGrowth(c.follLast,   c.follCur);
      const g2 = calcGrowth(c.follBefore, c.follCur);
      out += csvRow([window.SHOWS[k]?.label || k, i + 1, c.name,
        c.follBefore, c.follLast, c.follCur,
        g1.diff, g1.rate, g2.diff, g2.rate]);
    });
  });
  downloadCSV(`all_growth_${_dateStamp()}.csv`, out);
  toast('✓ All growth exported');
}

/* ─── RANKINGS CSV ──────────────────────────────────────── */
function exportRankCSV() {
  const hdrs = ['Rank','Name','Show','Status','Followers','Tier','Known For'];
  let out    = csvRow(hdrs);
  const all  = [];
  Object.keys(window.DB).filter(k => !isShowHidden(k)).forEach(k =>
    (window.DB[k] || []).filter(c => !isH(k, c.id)).forEach(c =>
      all.push({ ...c, _k: k, _sl: window.SHOWS[k]?.label })
    )
  );
  all.sort((a, b) => (parseF(b.follCur) ?? 0) - (parseF(a.follCur) ?? 0));
  all.forEach((c, i) => {
    out += csvRow([i + 1, c.name, c._sl, c.status, c.follCur, c.tier || c.profession, c.knownFor]);
  });
  downloadCSV(`rankings_${_dateStamp()}.csv`, out);
  toast('✓ Rankings exported');
}

function _dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

/* ─── EXPORT PANEL BUILDER ──────────────────────────────── */
function rebuildExportPanel() {
  const el = document.getElementById('per-show-exp');
  if (!el) return;
  el.innerHTML = getShowKeys().map(k =>
    `<button class="btn b-gld b-sm" onclick="capture('sw-${k}-tbl','${k}_Table')">📷 ${window.SHOWS[k].emoji || ''} ${window.SHOWS[k].label} Table</button>
     <button class="btn b-gh b-sm"  onclick="capture('sw-${k}-gtbl','${k}_Growth')">📈 ${window.SHOWS[k].label} Growth</button>`
  ).join('');
}

/* ─── SCREENSHOT / CAPTURE ──────────────────────────────── */
let _captureCanvas   = null;
let _captureFilename = 'capture';

const HIDE_IN_CAPTURE = [
  '.topbar', '.sidebar', '.tbar', '.tab-bar', '.save-bar',
  '.ph-act', '.tb-r', '.tb-l button', '.no-capture',
  '.hid-notice', '.hide-btn', '.btn.b-red', '.btn.b-xs',
  '#editBtn', '#save-bar', '.ccard-footer',
];

async function capture(elId, filename) {
  const el = document.getElementById(elId);
  if (!el) { toast('Element not found: ' + elId, 'err'); return; }
  _captureFilename = (filename || elId).replace(/[^a-z0-9_\-]/gi, '_');

  const bg      = document.getElementById('cap-modal-bg');
  const img     = document.getElementById('cap-preview-img');
  const spinner = document.getElementById('cap-spinner');
  const info    = document.getElementById('cap-info');
  const btns    = [
    document.getElementById('cap-save-png'),
    document.getElementById('cap-save-jpg'),
    document.getElementById('cap-copy'),
    document.getElementById('cap-print'),
  ];

  img.style.display     = 'none';
  spinner.style.display = 'flex';
  info.textContent      = 'Generating…';
  btns.forEach(b => { if (b) b.disabled = true; });
  bg.classList.add('open');
  _captureCanvas = null;

  let wasHidden  = false;
  let origStyle  = '';
  let hiddenEls  = [];

  try {
    wasHidden = getComputedStyle(el).display === 'none' || el.offsetParent === null;
    origStyle = el.getAttribute('style') || '';

    if (wasHidden) {
      el.style.cssText = 'position:fixed!important;left:-9999px!important;top:0!important;display:block!important;z-index:-1!important;min-width:1200px!important;background:var(--bg)!important;';
    }

    /* Hide UI chrome */
    HIDE_IN_CAPTURE.forEach(sel => {
      el.querySelectorAll(sel).forEach(node => {
        if (getComputedStyle(node).display !== 'none') {
          hiddenEls.push({ node, v: node.style.visibility });
          node.style.visibility = 'hidden';
        }
      });
    });

    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 200)));

    /* Measure AFTER chrome is hidden and layout has settled, so the
       width we snapshot at matches the width we crop to — prevents
       html2canvas reflowing the responsive grid into extra columns
       that then get sliced off. */
    const fullWidth  = el.scrollWidth;
    const fullHeight = el.scrollHeight;

    const canvas = await html2canvas(el, {
      backgroundColor: document.body.classList.contains('theme-light') ? '#F0F2F8' : '#08080F',
      scale:           2,
      useCORS:         true,
      logging:         false,
      width:           fullWidth,
      height:          fullHeight,
      windowWidth:     fullWidth,
      windowHeight:    fullHeight,
      ignoreElements:  node => {
        const tag = (node.tagName || '').toLowerCase();
        if (tag === 'button') return true;
        const cls = String(node.className || '');
        return cls.includes('no-capture') || cls.includes('tbar') ||
               cls.includes('tab-bar') || cls.includes('ph-act') ||
               cls.includes('tb-r') || cls.includes('hide-btn') ||
               cls.includes('save-bar') || cls.includes('topbar') ||
               cls.includes('sidebar');
      },
    });

    _captureCanvas = canvas;
    const dataURL  = canvas.toDataURL('image/png');
    const w = canvas.width / 2, h = canvas.height / 2;

    img.src           = dataURL;
    img.style.display = 'block';
    spinner.style.display = 'none';
    info.textContent  = `${Math.round(w)} × ${Math.round(h)}px · 2× retina`;
    btns.forEach(b => { if (b) b.disabled = false; });
    toast('✓ Preview ready — choose Save, Copy or Print');

  } catch (e) {
    spinner.style.display = 'none';
    info.textContent = 'Failed: ' + e.message;
    toast('Capture failed: ' + e.message + '. Try Ctrl+P for PDF.', 'err');
    console.error('[Capture]', e);

  } finally {
    /* ALWAYS restore hidden chrome — even if html2canvas threw.
       This is what was making tabs/buttons disappear permanently
       after a failed capture. */
    hiddenEls.forEach(({ node, v }) => { node.style.visibility = v; });
    if (wasHidden) el.setAttribute('style', origStyle);
  }
}

function captureCurrentPanel() {
  const active = document.querySelector('.panel.active');
  if (!active) { toast('No active panel', 'err'); return; }
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
  const date = _dateStamp();
  const a    = document.createElement('a');
  if (fmt === 'jpg') {
    a.href     = _captureCanvas.toDataURL('image/jpeg', 0.95);
    a.download = _captureFilename + '_' + date + '.jpg';
  } else {
    a.href     = _captureCanvas.toDataURL('image/png');
    a.download = _captureFilename + '_' + date + '.png';
  }
  a.click();
  toast('✓ Saved: ' + a.download);
}

async function copyCapture() {
  if (!_captureCanvas) { toast('No capture ready', 'err'); return; }
  try {
    _captureCanvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast('✓ Image copied to clipboard — paste anywhere');
      } catch (e) {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast('Clipboard blocked — image opened in new tab (right-click to save)', 'warn');
      }
    }, 'image/png');
  } catch (e) {
    toast('Copy failed: ' + e.message, 'err');
  }
}

function printCapture() {
  if (!_captureCanvas) { toast('No capture ready', 'err'); return; }
  const dataURL = _captureCanvas.toDataURL('image/png');
  const win     = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Print — Reality TV Intel</title>
    <style>*{margin:0;padding:0}body{background:#fff}img{max-width:100%;height:auto;display:block}
    @media print{img{max-width:100%;page-break-inside:avoid}}</style>
    </head><body><img src="${dataURL}" onload="window.print();setTimeout(()=>window.close(),500)"></body></html>`);
  win.document.close();
}

/* init capture modal backdrop */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cap-modal-bg')?.addEventListener('click', function (e) {
    if (e.target === this) closeCaptureModal();
  });
});
