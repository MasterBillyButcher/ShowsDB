/* ═══════════════════════════════════════════════════════════
   export.js  —  Reality TV Intelligence Dashboard 2026
   All CSV / JSON download helpers.
   Depends on: utils.js (sanitizeFilename), app.js (calcGrowth, isH, getCurrentTheme)
═══════════════════════════════════════════════════════════ */

/* ─── FILE DOWNLOAD HELPER ──────────────────────────────── */
function dlFile(content, mimeType, filename) {
  const b = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(b);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ─── ROSTER CSV ────────────────────────────────────────── */
const CSV_FIELDS = ['id','name','gender','profession','tier','status','ig',
  'follBefore','follBeforeDate','follLast','follLastDate','follCur','follCurDate',
  'knownFor','history'];

function exportCSV(key) {
  const rows = [CSV_FIELDS.join(','),
    ...(window.DB[key] || []).map(c =>
      CSV_FIELDS.map(f => '"' + (c[f] || '').toString().replace(/"/g, '""') + '"').join(',')
    )
  ].join('\n');
  dlFile(rows, 'text/csv', sanitizeFilename(key) + '_roster.csv');
  toast('CSV: ' + window.SHOWS[key]?.label);
}

/* ─── GROWTH CSV ─────────────────────────────────────────── */
function exportGrowthCSV(key) {
  const h = ['name','ig','follBefore','follLast','follCur','growthLastNow','growthRate','totalGrowth','totalRate'];
  const rows = [h.join(','),
    ...(window.DB[key] || []).filter(c => !isH(key, c.id)).map(c => {
      const g1 = calcGrowth(c.follLast, c.follCur);
      const g2 = calcGrowth(c.follBefore, c.follCur);
      return [c.name, c.ig || '', c.follBefore || 'N/V',
        c.follLast || 'N/V', c.follCur || 'N/V',
        g1.diff, g1.rate, g2.diff, g2.rate
      ].map(v => '"' + v + '"').join(',');
    })
  ].join('\n');
  dlFile(rows, 'text/csv', sanitizeFilename(key) + '_growth.csv');
  toast('Growth CSV: ' + window.SHOWS[key]?.label);
}

function exportAllCSV()    { Object.keys(window.DB).forEach(k => exportCSV(k)); }
function exportAllGrowth() { Object.keys(window.DB).forEach(k => exportGrowthCSV(k)); }

/* ─── RANKINGS CSV ──────────────────────────────────────── */
function exportRankCSV() {
  const all = [];
  Object.keys(window.DB).forEach(k =>
    (window.DB[k] || []).filter(c => !isH(k, c.id)).forEach(c =>
      all.push({ ...c, _show: window.SHOWS[k]?.label })
    )
  );
  all.sort((a, b) => (b.overall || 0) - (a.overall || 0));
  const h = ['name','_show','gender','status','follCur','knownFor','history'];
  const csv = [h.join(','),
    ...all.map(c => h.map(f => '"' + (c[f] || '').toString().replace(/"/g, '""') + '"').join(','))
  ].join('\n');
  dlFile(csv, 'text/csv', 'rankings.csv');
  toast('Rankings CSV');
}

/* ─── JSON EXPORT ───────────────────────────────────────── */
function exportJSON() {
  dlFile(
    JSON.stringify({
      shows: window.SHOWS,
      contestants: window.DB,
      theme: typeof getCurrentTheme === 'function' ? getCurrentTheme() : 'dark'
    }, null, 2),
    'application/json',
    'RealityTV2026.json'
  );
  toast('JSON exported');
}
