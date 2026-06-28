/* ═══════════════════════════════════════════════════════════
   app.js  —  Reality TV Intelligence Dashboard 2026
   Complete source. Rendering, navigation, CRUD, sort, growth.
═══════════════════════════════════════════════════════════ */

/* ─── STATE ─────────────────────────────────────────────── */
let HIDDEN     = new Set();
let editMode   = false;
let editTarget = null;
let showEditKey = null;

window._growthOrder = window._growthOrder || {}; // key → [id, id, …]
window._growthSort  = window._growthSort  || {}; // key → sort string

const THEME_KEY = 'realityTV2026_theme';

/* ─── SHOW KEY HELPERS ──────────────────────────────────── */
function getShowKeys() {
  return Object.keys(window.SHOWS || {}).sort((a, b) => {
    const sa = window.SHOWS[a] || {}, sb = window.SHOWS[b] || {};
    const ta = showSortTime(sa),     tb = showSortTime(sb);
    return ta !== tb ? ta - tb : String(sa.label || a).localeCompare(String(sb.label || b));
  });
}
function showSortTime(s) {
  const t = Date.parse(s?.releaseDate || s?.date || '');
  return isNaN(t) ? Infinity : t;
}
function showDateLabel(s) { return s?.date || formatReleaseDate(s?.releaseDate) || 'TBC'; }
function formatReleaseDate(v) {
  if (!v) return '';
  const t = Date.parse(v);
  return isNaN(t) ? v : new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric', year:'numeric' }).format(new Date(t));
}

/* ─── THEME ─────────────────────────────────────────────── */
function getCurrentTheme() {
  return document.body.classList.contains('theme-light') ? 'light' : 'dark';
}
function setTheme(theme, persist = true) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('theme-light', next === 'light');
  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.innerHTML = next === 'light' ? '☀ Light Mode' : '☾ Dark Mode';
    btn.title     = next === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  }
  if (persist) {
    localStorage.setItem(THEME_KEY, next);
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage(false);
  }
}
function toggleTheme() {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  toast(next === 'light' ? 'Light mode' : 'Dark mode');
}

/* ─── FOLLOWER UTILS ────────────────────────────────────── */
function parseF(s) {
  if (!s || s === 'N/V') return null;
  const m = String(s).trim().replace(/,/g,'').replace(/\s/g,'').match(/([\d.]+)([KMBkmb]?)/);
  if (!m) return null;
  const n = parseFloat(m[1]), u = (m[2]||'').toUpperCase();
  return u==='K' ? n*1e3 : u==='M' ? n*1e6 : u==='B' ? n*1e9 : n;
}
function fmtF(n, dp = 2) {
  if (n === null || n === undefined || isNaN(n)) return 'N/V';
  const a = Math.abs(n);
  if (a >= 1e6) return (n/1e6).toFixed(dp) + 'M';
  if (a >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}
function normalizeFollowerInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'N/V';
  if (/^n\/?v$/i.test(raw)) return 'N/V';
  const p = parseF(raw);
  return p === null ? raw : fmtF(p, p >= 1e6 ? 1 : 0);
}
function calcGrowth(last, cur) {
  const l = parseF(last), c = parseF(cur);
  if (l === null || c === null) return { diff:'N/V', rate:'N/V', diffRaw:null, rateRaw:null };
  const d = c - l, r = l > 0 ? (d/l)*100 : 0;
  return { diff:(d>=0?'+':'')+fmtF(d,1), rate:(r>=0?'+':'')+r.toFixed(2)+'%', diffRaw:d, rateRaw:r };
}

/* ─── MISC UTILS ────────────────────────────────────────── */
function contestantInitials(name) {
  return String(name||'??').split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()||'').join('')||'??';
}
function badge(s) {
  const u = (s||'').toUpperCase();
  if (u.includes('CONFIRMED'))                          return '<span class="bdg bc">✓ CONFIRMED</span>';
  if (u.includes('RUMOURED')||u.includes('RUMORED'))   return '<span class="bdg br">~ RUMOURED</span>';
  if (u.includes('APPROACHED'))                         return '<span class="bdg ba">→ APPROACHED</span>';
  return '<span class="bdg bw">' + (s||'') + '</span>';
}
function rowCls(s) {
  const u = (s||'').toUpperCase();
  if (u.includes('CONFIRMED'))                        return 'rc';
  if (u.includes('RUMOURED')||u.includes('RUMORED')) return 'rr';
  if (u.includes('APPROACHED'))                       return 'ra';
  return '';
}
function sbar(v, col) {
  const p = Math.min(10, Math.max(0, v||0))*10;
  return `<div class="sb"><div class="sbt"><div class="sbf" style="width:${p}%;background:${col}"></div></div><span class="sbn" style="color:${col}">${v||0}</span></div>`;
}
function isH(k, id) { return HIDDEN.has(k+'::'+id); }
function toggleH(k, id) {
  const key = k+'::'+id;
  HIDDEN.has(key) ? HIDDEN.delete(key) : HIDDEN.add(key);
  renderAll(); updateStats();
  if (typeof _autoPersist === 'function') _autoPersist();
}
function ed(val, k, id, f) {
  if (!editMode) return `<span>${val||''}</span>`;
  return `<span contenteditable="true" data-k="${k}" data-i="${id}" data-f="${f}" onblur="inlineSave(this)">${val||''}</span>`;
}
function inlineSave(el) {
  const {k, i, f} = el.dataset;
  const c = (window.DB[k]||[]).find(x => x.id === parseInt(i));
  if (c) {
    const raw = el.innerText.trim();
    c[f] = /^foll(Before|Last|Cur)$/.test(f) ? normalizeFollowerInput(raw) : sanitizeHTML(raw);
    toast('✓ Saved: '+f);
    if (typeof _autoPersist === 'function') _autoPersist();
  }
}

/* ─── AVATAR ────────────────────────────────────────────── */
function contestantAvatar(c) {
  const name = c?.name || 'Contestant';
  const init = contestantInitials(name);
  const photo = String(c?.photo||'').trim();
  if (!photo) return `<div class="contestant-avatar"><div class="contestant-avatar-fallback">${init}</div></div>`;
  return `<div class="contestant-avatar">
    <img src="${photo.replace(/"/g,'&quot;')}" alt="${name}" loading="lazy"
      onload="this.nextElementSibling.style.display='none'"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div class="contestant-avatar-fallback" style="display:none">${init}</div>
  </div>`;
}

/* ─── INSTAGRAM LINK ────────────────────────────────────── */
function igLink(igVal) {
  if (!igVal || igVal === 'N/V') return '<span style="color:var(--mut);font-size:10px">N/V</span>';
  const handle = igVal.replace(/^@/,'').trim();
  const icon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
  return `<a class="ig-link" href="https://www.instagram.com/${handle}" target="_blank" rel="noopener noreferrer">${icon} @${handle}</a>`;
}

/* ─── TOAST ─────────────────────────────────────────────── */
function toast(msg, type='') {
  const t = document.getElementById('toast');
  t.className = 'toast'+(type?' '+type:'');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ─── PANEL NAVIGATION ──────────────────────────────────── */
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const p = document.getElementById('panel-'+id);
  if (p) p.classList.add('active');
  document.querySelectorAll('.sb-item').forEach(s => s.classList.toggle('active', s.dataset.panel === id));
  if (id === 'overview')   renderOverview();
  if (id === 'rankings')   renderRankings();
  if (id === 'growth-all') renderGrowthAll();
  if (id === 'export')     rebuildExportPanel();
}

/* ─── EDIT MODE ─────────────────────────────────────────── */
function toggleEdit() {
  editMode = !editMode;
  const btn = document.getElementById('editBtn');
  btn.textContent        = '✎ Edit Mode: '+(editMode?'ON':'OFF');
  btn.style.color        = editMode ? 'var(--acc)' : '';
  btn.style.borderColor  = editMode ? 'var(--acc)' : '';
  document.body.classList.toggle('edit-on', editMode);
  renderAll();
  toast(editMode ? '✎ Edit Mode ON — click any field to edit' : '✓ Edit Mode OFF');
}

/* ─── SIDEBAR ───────────────────────────────────────────── */
function rebuildSidebar() {
  const el = document.getElementById('sidebar-shows');
  if (!el) return;
  el.innerHTML = getShowKeys().map(k => `
    <div class="sb-item" data-panel="show-${k}" onclick="showPanel('show-${k}')">
      <span class="sb-dot" style="background:${window.SHOWS[k].color}"></span>
      ${window.SHOWS[k].label}
      <span class="sb-badge">${(window.DB[k]||[]).length}</span>
    </div>`).join('');
}

/* ─── BUILD SHOW PANEL ──────────────────────────────────── */
function buildShowPanel(key) {
  const s = window.SHOWS[key];
  if (!s) return;
  const ex = document.getElementById('panel-show-'+key);
  if (ex) ex.remove();
  const div = document.createElement('div');
  div.className = 'panel';
  div.id = 'panel-show-'+key;
  div.innerHTML = `
    <div class="ph">
      <div>
        <div class="ph-title" style="color:${s.color}">${s.emoji||'◆'} ${s.label}</div>
        <div class="ph-desc">${s.platform||'TBC'} &middot; ${showDateLabel(s)} &middot; Host: ${s.host||'TBC'} &middot; ${s.desc||''}</div>
      </div>
      <div class="ph-act no-capture">
        <button class="btn b-gld b-sm" onclick="capture('sw-${key}-main','${key}')">📷 Capture All</button>
        <button class="btn b-gh b-sm"  onclick="exportCSV('${key}')">⚙ CSV</button>
        <button class="btn b-acc b-sm" onclick="openAdd('${key}')">+ Add</button>
        <button class="btn b-gh b-sm"  onclick="openShowEdit('${key}')">✎ Edit Show</button>
      </div>
    </div>
    <div id="sw-${key}-main">
      <div class="tab-bar no-capture">
        <button class="tab-btn active" onclick="switchTab('${key}','roster')">Roster</button>
        <button class="tab-btn"        onclick="switchTab('${key}','cards')">Card View</button>
        <button class="tab-btn"        onclick="switchTab('${key}','growth')">📈 Growth</button>
      </div>
      <!-- ROSTER TAB -->
      <div class="tab-pane active" id="sw-${key}-roster">
        <div class="tbar no-capture">
          <div class="tb-l">
            <div class="srch"><input placeholder="Search…" class="roster-search" data-search-key="${key}"></div>
            <select class="fsel" onchange="filterStat('${key}',this.value)">
              <option value="">All Status</option>
              <option>CONFIRMED</option><option>RUMOURED</option><option>APPROACHED</option>
            </select>
            <select class="fsel" onchange="filterGender('${key}',this.value)">
              <option value="">All</option>
              <option value="M">Male</option><option value="F">Female</option>
            </select>
          </div>
          <div class="tb-r">
            <button class="btn b-pur b-sm" onclick="openHideMgr('${key}')">👁 Show/Hide</button>
            <button class="btn b-gld b-sm" onclick="capture('sw-${key}-tbl','${key}_Table')">📷 Capture</button>
          </div>
        </div>
        <div id="sw-${key}-hid-notice"></div>
        <div class="twrap" id="sw-${key}-tbl">
          <table id="tbl-${key}">
            <thead><tr>
              <th onclick="sortT('${key}',0)"># <span class="sarr">↕</span></th>
              <th onclick="sortT('${key}',1)">Contestant <span class="sarr">↕</span></th>
              <th>Tier / Profession</th>
              <th>Status</th>
              <th onclick="sortT('${key}',4)">Followers <span class="sarr">↕</span></th>
              <th>Actions</th>
            </tr></thead>
            <tbody id="tb-${key}"></tbody>
          </table>
        </div>
      </div>
      <!-- CARD TAB -->
      <div class="tab-pane" id="sw-${key}-cards">
        <div class="cgrid" id="sw-${key}-cgrid"></div>
      </div>
      <!-- GROWTH TAB -->
      <div class="tab-pane" id="sw-${key}-growth">
        <div class="ph" style="margin-bottom:12px">
          <div style="font-size:13px;font-weight:700">Instagram Growth — ${s.label}</div>
          <div class="ph-act no-capture">
            <button class="btn b-gld b-sm" onclick="capture('gtbl-inner-${key}','${key}_Growth')">📷 Capture</button>
            <button class="btn b-gh b-sm"  onclick="exportGrowthCSV('${key}')">⚙ CSV</button>
          </div>
        </div>
        <div class="dnote no-capture">
          <strong>To update followers:</strong> Enable <strong>Edit Mode</strong> → click any cyan cell → type new value (e.g. <em>3.5M</em>) → Tab.
          Growth recalculates instantly. Sorted by <strong>highest growth</strong> by default.
        </div>
        <div id="sw-${key}-gtbl"></div>
      </div>
    </div>`;
  document.getElementById('dynamic-panels').appendChild(div);
}

/* ─── TAB SWITCHING ─────────────────────────────────────── */
function switchTab(key, tab) {
  const host = document.getElementById('sw-'+key+'-main');
  if (!host) return;
  host.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', ['roster','cards','growth'][i]===tab));
  host.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const pane = document.getElementById('sw-'+key+'-'+tab);
  if (pane) pane.classList.add('active');
  if (tab === 'cards')  renderCards(key);
  if (tab === 'growth') renderGrowth(key);
}

/* ─── OVERVIEW ──────────────────────────────────────────── */
function renderOverview() {
  const el = document.getElementById('ov-cards');
  if (!el) return;
  el.innerHTML = getShowKeys().map(k => {
    const s = window.SHOWS[k];
    const rows = window.DB[k]||[];
    const vis  = rows.filter(c => !isH(k,c.id));
    const conf = vis.filter(c => (c.status||'').toUpperCase().includes('CONFIRMED')).length;
    return `<div class="ccard" onclick="showPanel('show-${k}')" style="cursor:pointer">
      <div class="ccard-photo-wrap" style="aspect-ratio:2/1;border-top:3px solid ${s.color};background:linear-gradient(135deg,${s.color}22,${s.color}44);flex-direction:column;gap:6px">
        <div style="font-size:28px">${s.emoji||'📺'}</div>
        <div style="font-size:11px;font-weight:800;color:rgba(255,255,255,.75);letter-spacing:.06em;text-align:center;padding:0 8px">${s.label}</div>
      </div>
      <div class="ccard-body">
        <div class="ccard-top-row">
          <span style="font-size:9px;font-weight:800;color:${s.color};letter-spacing:.1em;text-transform:uppercase">${s.platform||'TBC'}</span>
        </div>
        <div class="ccard-name" style="color:${s.color};margin-top:4px">${s.label}</div>
        <div class="ccard-role">${showDateLabel(s)} · Host: ${s.host||'TBC'}</div>
        <div class="cdiv"></div>
        <div class="crow"><span class="crow-l">Contestants</span><span class="crow-r tm" style="color:var(--blu)">${vis.length}</span></div>
        <div class="crow"><span class="crow-l">Confirmed</span><span class="crow-r" style="color:var(--grn)">${conf}</span></div>
        <div class="crow"><span class="crow-l">Rumoured</span><span class="crow-r" style="color:var(--gld)">${vis.filter(c=>(c.status||'').toUpperCase().includes('RUMOUR')).length}</span></div>
        <div class="ccard-footer">
          <button class="btn b-acc b-sm" style="flex:1;justify-content:center" onclick="event.stopPropagation();showPanel('show-${k}')">View Roster</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ─── STATS BAR ─────────────────────────────────────────── */
function updateStats() {
  const allC = Object.values(window.DB).flat();
  const vis  = allC.filter(c => {
    const k = Object.keys(window.DB).find(k => window.DB[k].includes(c));
    return k && !isH(k, c.id);
  });
  setText('st-shows', getShowKeys().length);
  setText('st-total', allC.length);
  setText('st-conf',  allC.filter(c=>(c.status||'').toUpperCase().includes('CONFIRMED')).length);
  setText('st-rum',   allC.filter(c=>(c.status||'').toUpperCase().includes('RUMOUR')).length);
  setText('st-hid',   HIDDEN.size);
}
function setText(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }

/* ─── TABLE RENDER ──────────────────────────────────────── */
function renderTable(key) {
  const tbody = document.getElementById('tb-'+key);
  if (!tbody || !window.DB[key]) return;
  const hidden = [];
  tbody.innerHTML = (window.DB[key]||[]).map((c,i) => {
    const hid = isH(key, c.id);
    if (hid) hidden.push(c.name);
    return `<tr class="${rowCls(c.status)}${hid?' row-hidden':''}"
      data-search="${(c.name+' '+(c.status||'')+' '+(c.profession||'')+' '+c.gender).toLowerCase()}"
      data-id="${c.id}">
  <td class="tm" style="color:var(--mut)">${i + 1}</td>
      <td>
        <div class="contestant-cell">
          ${contestantAvatar(c)}
          <div>
            <div class="tn">${ed(c.name,key,c.id,'name')}</div>
            <div class="ts">${c.gender} · ${igLink(c.ig)}</div>
          </div>
        </div>
      </td>
      <td><span style="font-size:11px;color:var(--mut)">${ed(c.tier||c.profession||'',key,c.id,'tier')}</span></td>
      <td>${badge(c.status)}</td>
      <td><span class="tm" style="color:var(--blu)">${ed(c.follCur||'N/V',key,c.id,'follCur')}</span></td>
      <td>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="hide-btn${hid?' is-hid':''}" onclick="toggleH('${key}',${c.id})" title="${hid?'Show':'Hide'}">👁</button>
          <button class="btn b-gh b-xs" onclick="openEdit('${key}',${c.id})">✎</button>
          <button class="btn b-red b-xs" onclick="delRow('${key}',${c.id})">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const notice = document.getElementById('sw-'+key+'-hid-notice');
  if (notice) {
    notice.innerHTML = hidden.length
      ? `<div class="hid-notice no-capture">👁 <span class="hid-count">${hidden.length}</span> hidden:
          <span style="color:var(--txt)">${hidden.join(', ')}</span>
          <button class="btn b-gh b-xs" onclick="showAllInShow('${key}')">Restore All</button>
        </div>` : '';
  }
}

/* ─── FILTER / SORT (TABLE) ─────────────────────────────── */
function filterTbl(key, q) {
  const q2 = q.toLowerCase();
  document.querySelectorAll(`#tb-${key} tr`).forEach(tr => {
    tr.style.display = tr.dataset.search?.includes(q2) ? '' : 'none';
  });
}
function filterStat(key, val) {
  const v = val.toLowerCase();
  document.querySelectorAll(`#tb-${key} tr`).forEach(tr => {
    tr.style.display = !v || tr.dataset.search?.includes(v) ? '' : 'none';
  });
}
function filterGender(key, val) {
  const v = val.toLowerCase();
  document.querySelectorAll(`#tb-${key} tr`).forEach(tr => {
    const s = tr.dataset.search||'';
    tr.style.display = !v || (v==='m' ? s.includes(' m ') : s.includes(' f ')) ? '' : 'none';
  });
}

let _sortDirs = {};
function sortT(key, col) {
  const tbody = document.getElementById('tb-'+key);
  if (!tbody) return;
  const sk = key+'-'+col;
  _sortDirs[sk] = !_sortDirs[sk];
  const asc = _sortDirs[sk];
  const rows = Array.from(tbody.querySelectorAll('tr'));
  rows.sort((a,b) => {
    const at = a.cells[col]?.textContent.trim()||'';
    const bt = b.cells[col]?.textContent.trim()||'';
    const an = parseF(at)??parseFloat(at);
    const bn = parseF(bt)??parseFloat(bt);
    const numericComp = !isNaN(an) && !isNaN(bn) ? (asc ? an-bn : bn-an) : 0;
    return numericComp || (asc ? at.localeCompare(bt) : bt.localeCompare(at));
  });
  rows.forEach(r => tbody.appendChild(r));
  document.querySelectorAll(`#tbl-${key} th`).forEach((th,i) => {
    const s = th.querySelector('.sarr');
    if (s) s.innerHTML = i===col ? (asc?'↑':'↓') : '↕';
    th.classList.toggle('srtd', i===col);
  });
}

/* ─── CARDS RENDER ──────────────────────────────────────── */
function renderCards(key) {
  const el = document.getElementById('sw-'+key+'-cgrid');
  if (!el || !window.DB[key]) return;
  const col = window.SHOWS[key]?.color || '#E53E6A';

    el.innerHTML = (window.DB[key]||[]).map((c, i) => {
    const hid = isH(key, c.id);
    const g   = calcGrowth(c.follLast, c.follCur);
    const g2  = calcGrowth(c.follBefore, c.follCur);
    const growthColor = g.rateRaw !== null ? (g.rateRaw >= 0 ? 'var(--grn)' : '#CC4444') : 'var(--mut)';
    const initials = contestantInitials(c.name);
    const photo    = String(c?.photo||'').trim();

    const photoBlock = photo
      ? `<div class="ccard-photo-wrap" style="border-top:3px solid ${col}">
           <img class="ccard-photo-img"
             src="${photo.replace(/"/g,'&quot;')}" alt="${c.name}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="ccard-photo-fallback" style="display:none;background:linear-gradient(150deg,${col}22,${col}55)">
             <div class="ccard-initials">${initials}</div>
             <div class="ccard-no-photo-meta">
               <div class="ccard-no-photo-name">${c.name}</div>
               <div class="ccard-no-photo-sub">${c.profession||''}</div>
             </div>
           </div>
         </div>`
      : `<div class="ccard-photo-wrap ccard-photo-fallback" style="border-top:3px solid ${col};background:linear-gradient(150deg,${col}18,${col}40)">
           <div class="ccard-initials">${initials}</div>
           <div class="ccard-no-photo-meta">
             <div class="ccard-no-photo-name">${c.name}</div>
             <div class="ccard-no-photo-sub">${c.profession||''} · ${c.gender||''}</div>
             ${c.follCur&&c.follCur!=='N/V'?`<div class="ccard-no-photo-foll" style="color:${col}">${c.follCur} followers</div>`:''}
             ${c.ig&&c.ig!=='N/V'?`<div class="ccard-no-photo-ig">@${c.ig.replace(/^@/,'')}</div>`:''}
           </div>
         </div>`;

    return `<div class="ccard${hid?' c-hid':''}">
    ${photoBlock}
    <div class="ccard-body">
      <div class="ccard-top-row">
        ${badge(c.status)}
        <span class="ccard-num">#${i + 1}</span>
        </div>
        <div class="ccard-name">${c.name}</div>
        <div class="ccard-role">${c.profession||''} · ${c.gender||''}</div>
        <div class="cdiv"></div>
        <div class="crow"><span class="crow-l">Followers</span><span class="crow-r tm" style="color:var(--blu)">${c.follCur||'N/V'}</span></div>
        <div class="crow"><span class="crow-l">Growth</span><span class="crow-r tm" style="color:${growthColor}">${g.rate}</span></div>
        <div class="crow"><span class="crow-l">Total</span><span class="crow-r tm" style="color:var(--mut)">${g2.rate}</span></div>
        <div class="crow"><span class="crow-l">Instagram</span><span class="crow-r">${igLink(c.ig)}</span></div>
        ${c.knownFor?`<div class="crow"><span class="crow-l">Known For</span><span class="crow-r" style="color:var(--mut)">${c.knownFor}</span></div>`:''}
        <div class="ccard-footer">
          <button class="btn b-gh b-sm" style="flex:1;justify-content:center" onclick="openEdit('${key}',${c.id})">✎ Edit</button>
          <button class="btn ${hid?'b-grn':'b-warn'} b-sm" onclick="toggleH('${key}',${c.id})">${hid?'✓ Show':'👁 Hide'}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ─── GROWTH SORT STATE ─────────────────────────────────── */
function getGrowthSortKey(key)        { return window._growthSort[key] || 'growth-desc'; }
function setGrowthSort(key, val) {
  window._growthSort[key] = val;
  renderGrowth(key);
  if (typeof _autoPersist === 'function') _autoPersist();
}

/* ─── GROWTH TABLE BUILD ────────────────────────────────── */
function buildGrowthHTML(key) {
  const raw = (window.DB[key]||[]).filter(c => !isH(key,c.id));
  if (!raw.length) return `<div style="color:var(--mut);padding:40px 20px;text-align:center;font-size:13px">
    No visible contestants.<br>Add via <strong>+ Add</strong> or enable <strong>Edit Mode</strong>.
  </div>`;

  const sortVal     = getGrowthSortKey(key);
  const customOrder = window._growthOrder[key];

  /* ── sort logic ── */
  let data;
  if (sortVal === 'custom' && customOrder && customOrder.length) {
    const byId  = Object.fromEntries(raw.map(c => [c.id, c]));
    const ord   = customOrder.map(id => byId[id]).filter(Boolean);
    raw.forEach(c => { if (!customOrder.includes(c.id)) ord.push(c); });
    data = ord;
  } else {
    data = [...raw].sort((a,b) => {
      const ga  = calcGrowth(a.follLast,   a.follCur);
      const gb  = calcGrowth(b.follLast,   b.follCur);
      const ta  = calcGrowth(a.follBefore, a.follCur);
      const tb  = calcGrowth(b.follBefore, b.follCur);
      const cA  = parseF(a.follCur)??0;
      const cB  = parseF(b.follCur)??0;
      switch (sortVal) {
        case 'growth-desc':    return (gb.rateRaw??-Infinity) - (ga.rateRaw??-Infinity);
        case 'growth-asc':     return (ga.rateRaw?? Infinity) - (gb.rateRaw?? Infinity);
        case 'total-desc':     return (tb.rateRaw??-Infinity) - (ta.rateRaw??-Infinity);
        case 'total-asc':      return (ta.rateRaw?? Infinity) - (tb.rateRaw?? Infinity);
        case 'followers-desc': return cB - cA;
        case 'followers-asc':  return cA - cB;
        case 'name':           return a.name.localeCompare(b.name);
        default:               return (gb.rateRaw??-Infinity) - (ga.rateRaw??-Infinity);
      }
    });
  }

  /* ── rows ── */
  const rows = data.map((c,idx) => {
    const g1  = calcGrowth(c.follLast,   c.follCur);
    const g2  = calcGrowth(c.follBefore, c.follCur);
    const neg1 = g1.rateRaw!==null && g1.rateRaw < 0;
    const hi1  = g1.rateRaw!==null && g1.rateRaw >= 5;
    const md1  = g1.rateRaw!==null && g1.rateRaw >= 1 && g1.rateRaw < 5;
    const rank = idx + 1;

    function eC(val, f) {
      if (!editMode) return val||'N/V';
      return `<span contenteditable="true"
        onblur="saveGrowthCell('${key}',${c.id},'${f}',this.innerText)"
        style="min-width:55px;display:inline-block">${val||'N/V'}</span>`;
    }

    const g2Color = g2.rateRaw!==null && g2.rateRaw>=50 ? '#004400' : g2.rateRaw!==null && g2.rateRaw<0 ? '#CC0000' : '#333';

    return `<tr draggable="true" data-id="${c.id}" data-key="${key}"
      ondragstart="growthDragStart(event)"
      ondragover="growthDragOver(event)"
      ondrop="growthDrop(event,'${key}')"
      ondragleave="growthDragLeave(event)">
      <td style="text-align:center;font-weight:800;color:#000">${rank}</td>
      <td style="font-weight:800;color:#000;text-align:left">${eC(c.name,'name')}</td>
      <td style="text-align:center">${eC(c.follBefore,'follBefore')}</td>
      <td style="text-align:center">${eC(c.follLast,  'follLast')}</td>
      <td style="text-align:center">${eC(c.follCur,   'follCur')}</td>
      <td class="${neg1?'neg':hi1?'hi':md1?'md':''}" style="text-align:center">${g1.diff}</td>
      <td class="${neg1?'neg':hi1?'hi':md1?'md':''}" style="text-align:center">${g1.rate}</td>
      <td style="text-align:center">${g2.diff}</td>
      <td style="text-align:center;color:${g2Color}">${g2.rate}</td>
    </tr>`;
  }).join('');

  const s   = window.SHOWS[key];
  const hasCustom = customOrder && customOrder.length;

  const sortBar = `<div class="growth-sort-bar no-capture">
    <label>Sort by</label>
    <select onchange="setGrowthSort('${key}', this.value)">
      <option value="growth-desc"    ${sortVal==='growth-desc'    ?'selected':''}>📈 Highest Growth (Last→Now)</option>
      <option value="growth-asc"     ${sortVal==='growth-asc'     ?'selected':''}>📉 Lowest Growth</option>
      <option value="total-desc"     ${sortVal==='total-desc'     ?'selected':''}>🚀 Highest Total Growth</option>
      <option value="total-asc"      ${sortVal==='total-asc'      ?'selected':''}>⬇️ Lowest Total Growth</option>
      <option value="followers-desc" ${sortVal==='followers-desc' ?'selected':''}>👥 Most Followers</option>
      <option value="followers-asc"  ${sortVal==='followers-asc'  ?'selected':''}>👤 Fewest Followers</option>
      <option value="name"           ${sortVal==='name'           ?'selected':''}>🔤 Alphabetical</option>
      <option value="custom"         ${sortVal==='custom'         ?'selected':''}>↕️ Custom (drag rows)</option>
    </select>
    ${sortVal==='custom' ? '<span style="font-size:10px;color:var(--mut)">↕ Drag rows to reorder</span>' : ''}
    ${hasCustom ? `<button class="btn b-gh b-xs" onclick="resetGrowthOrder('${key}')">✕ Reset order</button>` : ''}
  </div>`;

  return `${sortBar}
  <div class="gtbl-wrap" id="gtbl-inner-${key}">
    <div class="gtbl-title">${s?.emoji||''} ${s?.label||key.toUpperCase()} — Instagram Follower Growth</div>
    <table>
      <thead><tr>
        <th style="width:50px;text-align:center">#</th>
        <th style="text-align:left;min-width:160px">Contestant</th>
        <th style="text-align:center">Before Show</th>
        <th style="text-align:center">Last Checked</th>
        <th style="text-align:center">Current</th>
        <th style="text-align:center">Growth</th>
        <th style="text-align:center">Growth %</th>
        <th style="text-align:center">Total Growth</th>
        <th style="text-align:center">Total %</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/* ─── GROWTH DRAG-REORDER ───────────────────────────────── */
let _dragSrc = null;

function growthDragStart(e) {
  _dragSrc = e.currentTarget;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', e.currentTarget.dataset.id);
  setTimeout(() => { if (_dragSrc) _dragSrc.style.opacity = '0.4'; }, 0);
}
function growthDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function growthDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function growthDrop(e, key) {
  e.preventDefault();
  const target = e.currentTarget;
  target.classList.remove('drag-over');
  if (!_dragSrc || _dragSrc === target) {
    if (_dragSrc) _dragSrc.style.opacity = '';
    _dragSrc = null; return;
  }
  window._growthSort[key] = 'custom';
  const tbody  = target.closest('tbody');
  const srcId  = parseInt(_dragSrc.dataset.id);
  const tgtId  = parseInt(target.dataset.id);
  const rows   = Array.from(tbody.querySelectorAll('tr'));
  const ids    = rows.map(r => parseInt(r.dataset.id));
  const si     = ids.indexOf(srcId), ti = ids.indexOf(tgtId);
  ids.splice(si, 1); ids.splice(ti, 0, srcId);
  window._growthOrder[key] = ids;
  _dragSrc.style.opacity = '';
  _dragSrc = null;
  renderGrowth(key);
  if (typeof _autoPersist === 'function') _autoPersist();
  toast('↕ Custom order saved');
}
function resetGrowthOrder(key) {
  delete window._growthOrder[key];
  window._growthSort[key] = 'growth-desc';
  renderGrowth(key);
  toast('✓ Reset to highest growth');
}
function saveGrowthCell(key, id, f, val) {
  const c = (window.DB[key]||[]).find(x => x.id === id);
  if (c) {
    c[f] = /^foll(Before|Last|Cur)$/.test(f) ? normalizeFollowerInput(val) : sanitizeHTML(val.trim());
    renderGrowth(key);
    toast('✓ Updated: '+f);
    if (typeof _autoPersist === 'function') _autoPersist();
  }
}

/* ─── RENDER GROWTH ─────────────────────────────────────── */
function renderGrowth(key) {
  const el = document.getElementById('sw-'+key+'-gtbl');
  if (el) el.innerHTML = buildGrowthHTML(key);
}
function renderGrowthAll() {
  const el = document.getElementById('ga-wrap');
  if (!el) return;
  el.innerHTML = getShowKeys().map(k => `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:7px">
        <div style="font-size:13px;font-weight:800;color:${window.SHOWS[k].color}">${window.SHOWS[k].emoji||''} ${window.SHOWS[k].label}</div>
        <div style="display:flex;gap:6px">
          <button class="btn b-gld b-sm" onclick="capture('gtbl-inner-${k}','${k}_Growth')">📷 Capture</button>
          <button class="btn b-gh b-sm"  onclick="exportGrowthCSV('${k}')">⚙ CSV</button>
        </div>
      </div>
      <div id="ggrow-${k}">${buildGrowthHTML(k)}</div>
    </div>`).join('');
}

/* ─── RANKINGS ──────────────────────────────────────────── */
function renderRankings() {
  const all = [];
  Object.keys(window.DB).forEach(k =>
    (window.DB[k]||[]).filter(c => !isH(k,c.id)).forEach(c =>
      all.push({...c, _k:k, _sl:window.SHOWS[k]?.label, _sc:window.SHOWS[k]?.color})
    )
  );
  all.sort((a,b) => (b.overall||0)-(a.overall||0));
  const tbody = document.getElementById('rank-tbody');
  if (!tbody) return;
  tbody.innerHTML = all.map((c,i) => {
    const rank = i<3
      ? `<span class="rank-badge r${i+1}">${['1','2','3'][i]}</span>`
      : `<span class="rank-badge rn">${i+1}</span>`;
    return `<tr class="${rowCls(c.status)}">
      <td style="text-align:center">${rank}</td>
      <td><div class="tn">${c.name}</div><div class="ts">${c.gender} · ${igLink(c.ig)}</div></td>
      <td><span style="font-size:11px;font-weight:700;color:${c._sc}">${c._sl}</span></td>
      <td>${badge(c.status)}</td>
      <td><span class="tm" style="color:var(--blu)">${c.follCur||'N/V'}</span></td>
      <td><span style="font-size:11px;color:var(--mut)">${c.tier||c.profession||''}</span></td>
      <td style="font-size:10px;color:var(--mut);max-width:200px">${c.knownFor||''}</td>
    </tr>`;
  }).join('');
}

/* ─── HIDE/SHOW HELPERS ─────────────────────────────────── */
function showAll() {
  HIDDEN.clear();
  renderAll(); updateStats();
  if (typeof renderHideMgr==='function') renderHideMgr();
  toast('✓ All contestants visible');
  if (typeof _autoPersist === 'function') _autoPersist();
}
function showAllInShow(key) {
  [...HIDDEN].filter(h => h.startsWith(key+'::')).forEach(h => HIDDEN.delete(h));
  renderAll(); updateStats();
  toast('✓ All restored for '+window.SHOWS[key]?.label);
  if (typeof _autoPersist === 'function') _autoPersist();
}
function hideRumoured() {
  Object.keys(window.DB).forEach(k =>
    (window.DB[k]||[]).filter(c => (c.status||'').toUpperCase().includes('RUMOUR')).forEach(c => HIDDEN.add(k+'::'+c.id))
  );
  renderAll(); updateStats();
  toast('Rumoured contestants hidden', 'warn');
  if (typeof _autoPersist === 'function') _autoPersist();
}
function hideAllVisible() {
  Object.keys(window.DB).forEach(k =>
    (window.DB[k]||[]).forEach(c => HIDDEN.add(k+'::'+c.id))
  );
  renderAll(); updateStats();
  toast('All hidden', 'warn');
  if (typeof _autoPersist === 'function') _autoPersist();
}

/* ─── HIDE MANAGER MODAL ────────────────────────────────── */
function openHideMgr(key) {
  document.getElementById('modal-hide').classList.add('open');
  const sel = document.getElementById('hm-show-filter');
  if (sel) {
    sel.innerHTML = '<option value="">All Shows</option>' +
      getShowKeys().map(k => `<option value="${k}" ${k===key?'selected':''}>${window.SHOWS[k].label}</option>`).join('');
  }
  renderHideMgr();
}
function renderHideMgr() {
  const grid = document.getElementById('hm-grid');
  if (!grid) return;
  const filterKey = document.getElementById('hm-show-filter')?.value||'';
  const q = (document.getElementById('hm-search')?.value||'').toLowerCase();
  const keys = filterKey ? [filterKey] : getShowKeys();
  let all = [];
  keys.forEach(k => (window.DB[k]||[]).forEach(c => all.push({...c,_k:k})));
  if (q) all = all.filter(c => c.name.toLowerCase().includes(q));
  const hidden = all.filter(c => isH(c._k,c.id)).length;
  setText('hm-count', hidden);
  grid.innerHTML = all.map(c => {
    const vis = !isH(c._k, c.id);
    return `<div class="hm-item ${vis?'hm-vis':'hm-hid'}" onclick="toggleH('${c._k}',${c.id});renderHideMgr()">
      <div class="hm-chk">${vis?'✓':''}</div>
      <div><div class="hm-name">${c.name}</div><div class="hm-show">${window.SHOWS[c._k]?.label||c._k}</div></div>
    </div>`;
  }).join('');
}

/* ─── SHOW MANAGER ──────────────────────────────────────── */
function openShowMgr() {
  showEditKey = null;
  resetShowForm();
  document.getElementById('modal-shows').classList.add('open');
  renderShowList();
}
function openShowEdit(key) {
  showEditKey = key;
  const s = window.SHOWS[key];
  if (!s) return;
  document.getElementById('show-edit-title').textContent = '✎ Edit Show: '+s.label;
  document.getElementById('ns-name').value     = s.label||'';
  document.getElementById('ns-key').value      = key;
  document.getElementById('ns-key').disabled   = true;
  document.getElementById('ns-platform').value = s.platform||'';
  document.getElementById('ns-host').value     = s.host||'';
  document.getElementById('ns-emoji').value    = s.emoji||'';
  document.getElementById('ns-desc').value     = s.desc||'';
  document.getElementById('ns-color').value    = s.color||'#4A9EFF';
  if (s.releaseDate) document.getElementById('ns-date').value = s.releaseDate;
  document.getElementById('ns-add-btn').textContent = '✓ Update Show';
  document.getElementById('modal-shows').classList.add('open');
}
function resetShowForm() {
  document.getElementById('show-edit-title').textContent = '⚙ Manage Shows';
  ['ns-name','ns-key','ns-host','ns-date','ns-desc','ns-platform','ns-emoji'].forEach(id => {
    const e = document.getElementById(id); if (e) { e.value=''; e.disabled=false; }
  });
  document.getElementById('ns-color').value = '#4A9EFF';
  document.getElementById('ns-add-btn').textContent = '+ Create Show';
}
function renderShowList() {
  const el = document.getElementById('show-list');
  if (!el) return;
  el.innerHTML = getShowKeys().map(k => {
    const s = window.SHOWS[k];
    return `<div class="show-item">
      <span class="show-dot" style="background:${s.color}"></span>
      <div style="flex:1">
        <div class="show-name">${s.emoji||''} ${s.label}</div>
        <div class="show-meta-sm">${s.platform||''} · ${showDateLabel(s)} · ${(window.DB[k]||[]).length} contestants</div>
      </div>
      <button class="btn b-gh b-xs" onclick="openShowEdit('${k}')">✎</button>
      ${getShowKeys().length>1?`<button class="btn b-red b-xs" onclick="removeShow('${k}')">🗑</button>`:''}
    </div>`;
  }).join('');
}
function addShow() {
  const name = document.getElementById('ns-name').value.trim();
  const key  = showEditKey || document.getElementById('ns-key').value.trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  if (!name||!key) { toast('Name and key required','err'); return; }
  if (!showEditKey && window.SHOWS[key]) { toast('Key already exists','err'); return; }
  const editing = !!showEditKey;
  const payload = {
    label: sanitizeHTML(name), key,
    color:       document.getElementById('ns-color').value,
    platform:    sanitizeHTML(document.getElementById('ns-platform').value),
    host:        sanitizeHTML(document.getElementById('ns-host').value||'TBC'),
    releaseDate: document.getElementById('ns-date').value||'',
    date:        formatReleaseDate(document.getElementById('ns-date').value)||document.getElementById('ns-date').value||'TBC',
    desc:        sanitizeHTML(document.getElementById('ns-desc').value||''),
    emoji:       document.getElementById('ns-emoji').value||'📺',
  };
  // Validate
  const showErrors = validateShow({...payload, key});
  if (showErrors.length) { toast(showErrors[0], 'err'); return; }
  if (editing) {
    const old = showEditKey;
    window.SHOWS[key] = {...payload, key};
    if (!window.DB[key]) window.DB[key] = window.DB[old]||[];
    if (old !== key) { delete window.SHOWS[old]; delete window.DB[old]; }
    showEditKey = null;
  } else {
    window.SHOWS[key] = {...payload, key};
    window.DB[key] = [];
  }
  refreshShowUIs();
  closeModal('modal-shows');
  toast((editing?'✓ Updated: ':'✓ Created: ')+name);
  if (typeof logActivity==='function') logActivity(editing?'Updated show':'Created show', name, editing?'✏️':'📺');
  if (typeof _autoPersist==='function') _autoPersist();
}
function removeShow(key) {
  const lbl = window.SHOWS[key]?.label||key;
  if (!confirm('Remove "'+lbl+'"? All data lost.')) return;
  delete window.SHOWS[key]; delete window.DB[key];
  const p = document.getElementById('panel-show-'+key); if (p) p.remove();
  rebuildSidebar(); renderOverview(); updateStats(); renderShowList();
  showPanel('overview');
  toast('Show removed','warn');
  if (typeof logActivity==='function') logActivity('Removed show', lbl, '🗑️');
  if (typeof _autoPersist==='function') _autoPersist();
}

/* ─── CONTESTANT MODAL ──────────────────────────────────── */
function populateShowSel() {
  const sel = document.getElementById('f-show');
  if (!sel) return;
  sel.innerHTML = getShowKeys().map(k => `<option value="${k}">${window.SHOWS[k].label}</option>`).join('');
}
function openAdd(dk) {
  editTarget = null;
  populateShowSel();
  document.getElementById('mc-title').textContent = 'Add Contestant';
  if (dk) document.getElementById('f-show').value = dk;
  ['name','ig','photo','fb','fbd','fl','fld','fc','fcd','tier','kf','his'].forEach(id => {
    const e = document.getElementById('f-'+id); if (e) e.value='';
  });
  document.getElementById('f-status').value = 'CONFIRMED';
  document.getElementById('modal-c').classList.add('open');
}
function openEdit(key, id) {
  const c = (window.DB[key]||[]).find(x => x.id===id);
  if (!c) return;
  editTarget = {key, id};
  populateShowSel();
  document.getElementById('mc-title').textContent = 'Edit: '+c.name;
  const map = {name:'name',gender:'gender',status:'status',profession:'profession',tier:'tier',ig:'ig',photo:'photo',
    fb:'follBefore',fbd:'follBeforeDate',fl:'follLast',fld:'follLastDate',fc:'follCur',fcd:'follCurDate',kf:'knownFor',his:'history'};
  document.getElementById('f-show').value = key;
  Object.entries(map).forEach(([fi,cf]) => { const e=document.getElementById('f-'+fi); if (e) e.value=c[cf]||''; });
  document.getElementById('modal-c').classList.add('open');
}

function saveContestant() {
  const key  = document.getElementById('f-show').value;
  const name = document.getElementById('f-name').value.trim();
  if (!name) { toast('Name required','err'); return; }
  if (!window.DB[key]) window.DB[key]=[];
  const obj = {
    name:       sanitizeHTML(name),
    gender:     document.getElementById('f-gender').value,
    status:     document.getElementById('f-status').value,
    profession: sanitizeHTML(document.getElementById('f-profession').value),
    tier:       sanitizeHTML(document.getElementById('f-tier').value),
    ig:         sanitizeHTML(document.getElementById('f-ig').value),
    photo:      document.getElementById('f-photo').value.trim(), // URLs must not be double-escaped
    follBefore:     normalizeFollowerInput(document.getElementById('f-fb').value),
    follBeforeDate: sanitizeHTML(document.getElementById('f-fbd').value),
    follLast:       normalizeFollowerInput(document.getElementById('f-fl').value),
    follLastDate:   sanitizeHTML(document.getElementById('f-fld').value),
    follCur:        normalizeFollowerInput(document.getElementById('f-fc').value),
    follCurDate:    sanitizeHTML(document.getElementById('f-fcd').value),
    knownFor:   sanitizeHTML(document.getElementById('f-kf').value),
    history:    sanitizeHTML(document.getElementById('f-his').value),
  };
  // Validate before saving
  const errors = validateContestant(obj);
  if (errors.length) { toast(errors[0], 'err'); return; }
  const wasEdit = !!editTarget;
  if (editTarget && editTarget.key===key) {
    const idx = (window.DB[key]||[]).findIndex(c => c.id===editTarget.id);
    if (idx>-1) { obj.id=editTarget.id; window.DB[key][idx]=obj; }
  } else {
    const ids = (window.DB[key]||[]).map(c=>c.id);
    obj.id = ids.length ? Math.max(...ids)+1 : 1;
    window.DB[key].push(obj);
  }
  closeModal('modal-c');
  renderAll(); rebuildSidebar(); updateStats();
  toast(wasEdit ? '✓ Updated' : '✓ Added to '+(window.SHOWS[key]?.label||key));
  if (typeof logActivity==='function') logActivity(wasEdit?'Edited contestant':'Added contestant', name+' · '+(window.SHOWS[key]?.label||key), wasEdit?'✏️':'➕');
  if (typeof _autoPersist==='function') _autoPersist();
}
function delRow(key, id) {
  if (!confirm('Delete this contestant?')) return;
  const c = (window.DB[key]||[]).find(x=>x.id===id);
  window.DB[key] = (window.DB[key]||[]).filter(c=>c.id!==id);
  HIDDEN.delete(key+'::'+id);
  renderAll(); rebuildSidebar(); updateStats();
  toast('Removed','warn');
  if (typeof logActivity==='function') logActivity('Removed contestant', (c?.name||'?')+' · '+(window.SHOWS[key]?.label||key), '🗑️');
  if (typeof _autoPersist==='function') _autoPersist();
}

/* ─── MODAL HELPERS ─────────────────────────────────────── */
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  editTarget = null;
  if (id==='modal-shows') resetShowForm();
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mbg').forEach(m =>
    m.addEventListener('click', function(e) { if (e.target===this) closeModal(this.id); })
  );
});

/* ─── RENDER ALL ────────────────────────────────────────── */
function renderAll() {
  getShowKeys().forEach(k => {
    renderTable(k);
    const cEl = document.getElementById('sw-'+k+'-cgrid');
    if (cEl && cEl.closest('.tab-pane.active')) renderCards(k);
    const gEl = document.getElementById('sw-'+k+'-gtbl');
    if (gEl && gEl.closest('.tab-pane.active')) renderGrowth(k);
  });
  renderOverview();
}
function refreshShowUIs() {
  rebuildDynamicPanels(); rebuildSidebar(); populateShowSel();
  renderOverview(); renderAll(); renderShowList(); rebuildExportPanel(); updateStats();
}
function rebuildDynamicPanels() {
  const host = document.getElementById('dynamic-panels');
  if (!host) return;
  host.innerHTML = '';
  getShowKeys().forEach(buildShowPanel);
}

/* ─── DEBOUNCED SEARCH ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const _debouncedFilter = debounce((key, val) => filterTbl(key, val), 300);
  document.body.addEventListener('input', e => {
    const inp = e.target;
    if (inp.classList.contains('roster-search')) {
      _debouncedFilter(inp.dataset.searchKey, inp.value);
    }
  });
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey||e.metaKey)&&e.key==='s')                   { e.preventDefault(); saveToLocalStorage(true); }
  if ((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==='S')       { e.preventDefault(); exportJSON(); }
  if ((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==='P')       { e.preventDefault(); window.print(); }
  if (e.key==='Escape') {
    document.querySelectorAll('.mbg.open').forEach(m=>m.classList.remove('open'));
    closeCaptureModal?.();
    if (typeof saveBarOpen!=='undefined'&&saveBarOpen) toggleSaveBar();
  }
});


/* ═══ ADMIN GUARD PATCHES ═══════════════════════════════════
   Injected by admin.js — guards all write operations.
   If isAdmin() is not available (script not loaded yet) we
   fall back to allowing the action so nothing breaks.
═══════════════════════════════════════════════════════════ */

/* Wrap openAdd so non-admins are directed to login */
const _origOpenAdd = window.openAdd;
window.openAdd = function(dk) {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    if (typeof openAdminLogin === 'function') openAdminLogin();
    return;
  }
  _origOpenAdd?.(dk);
};

/* Wrap openEdit */
const _origOpenEdit = window.openEdit;
window.openEdit = function(key, id) {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    if (typeof openAdminLogin === 'function') openAdminLogin();
    return;
  }
  _origOpenEdit?.(key, id);
};

/* Wrap delRow */
const _origDelRow = window.delRow;
window.delRow = function(key, id) {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    if (typeof openAdminLogin === 'function') openAdminLogin();
    return;
  }
  _origDelRow?.(key, id);
};

/* Wrap openShowMgr */
const _origOpenShowMgr = window.openShowMgr;
window.openShowMgr = function() {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    if (typeof openAdminLogin === 'function') openAdminLogin();
    return;
  }
  _origOpenShowMgr?.();
};

/* Wrap openHideMgr */
const _origOpenHideMgr = window.openHideMgr;
window.openHideMgr = function(key) {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    if (typeof openAdminLogin === 'function') openAdminLogin();
    return;
  }
  _origOpenHideMgr?.(key);
};

/* Wrap toggleH (hide/show individual contestants) */
const _origToggleH = window.toggleH;
window.toggleH = function(k, id) {
  if (typeof isAdmin === 'function' && !isAdmin()) { return; }
  _origToggleH?.(k, id);
};

/* Hide action buttons (Edit/Delete/Hide) from the table
   for non-admin users by patching renderTable */
const _origRenderTable = window.renderTable;
window.renderTable = function(key) {
  _origRenderTable?.(key);
  // After render: hide action buttons when not admin
  if (typeof isAdmin === 'function' && !isAdmin()) {
    const tbody = document.getElementById('tb-' + key);
    if (tbody) {
      tbody.querySelectorAll('.hide-btn, .btn.b-xs').forEach(b => {
        b.style.display = 'none';
      });
    }
  }
};

/* Similarly patch renderCards to remove edit/hide buttons */
const _origRenderCards = window.renderCards;
window.renderCards = function(key) {
  _origRenderCards?.(key);
  if (typeof isAdmin === 'function' && !isAdmin()) {
    const grid = document.getElementById('sw-' + key + '-cgrid');
    if (grid) {
      grid.querySelectorAll('.ccard-footer').forEach(f => f.style.display = 'none');
    }
  }
};

/* Hide growth tab edit hint when not admin */
const _origBuildGrowthHTML = window.buildGrowthHTML;
window.buildGrowthHTML = function(key) {
  const html = _origBuildGrowthHTML?.(key) || '';
  if (typeof isAdmin === 'function' && !isAdmin()) {
    // Strip the .dnote edit hint by hiding it via a wrapper class
    return html.replace('class="dnote no-capture"', 'class="dnote no-capture" style="display:none"');
  }
  return html;
};

/* Also patch buildShowPanel to hide Add/Edit/CSV buttons from non-admins */
const _origBuildShowPanel = window.buildShowPanel;
window.buildShowPanel = function(key) {
  _origBuildShowPanel?.(key);
  if (typeof isAdmin === 'function' && !isAdmin()) {
    const panel = document.getElementById('panel-show-' + key);
    if (panel) {
      panel.querySelectorAll('.ph-act .btn, .tb-r .btn').forEach(b => {
        // Keep Capture buttons; hide edit/add/CSV
        if (!b.textContent.includes('Capture') && !b.textContent.includes('📷')) {
          b.style.display = 'none';
        }
      });
    }
  }
};
