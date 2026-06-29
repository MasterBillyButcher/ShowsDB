/* ═══════════════════════════════════════════════════════════
   utils.js  —  Reality TV Intel 2026
   Sanitization · Validation · Debounce · Throttle
   Loaded first — zero dependencies.
═══════════════════════════════════════════════════════════ */

/* ─── SANITIZE ──────────────────────────────────────────── */

/** Escape raw string for safe innerHTML insertion. */
function sanitizeHTML(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/** Sanitize a subset of fields on an object in one call. */
function sanitizeObject(obj, allowedFields) {
  const out = {};
  allowedFields.forEach(f => { out[f] = sanitizeHTML(obj[f] ?? ''); });
  return out;
}

/** Escape special regex characters. */
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip characters unsafe in filenames. */
function sanitizeFilename(str) {
  return String(str || 'file').replace(/[^a-z0-9_\-]/gi, '_').replace(/_+/g, '_');
}

/* ─── VALIDATION ────────────────────────────────────────── */

const VALID_STATUSES = [
  'CONFIRMED', 'RUMOURED', 'APPROACHED', 'REPORTEDLY CONFIRMED', 'WITHDRAWN',
  'ELIMINATED', 'WILDCARD'
];
const VALID_GENDERS = ['M', 'F', 'NB', 'Unknown'];

/**
 * Validate a contestant data object.
 * Returns an array of human-readable errors (empty = valid).
 */
function validateContestant(data) {
  const errors = [];
  const name = (data.name || '').trim();

  if (!name)            errors.push('Name is required.');
  if (name.length > 120) errors.push('Name must be 120 characters or fewer.');

  if (data.gender && !VALID_GENDERS.includes(data.gender))
    errors.push('Gender must be M, F, NB, or Unknown.');

  if (data.status && !VALID_STATUSES.some(s => data.status.toUpperCase().includes(s.split(' ')[0])))
    errors.push('Status must be CONFIRMED, RUMOURED, APPROACHED, REPORTEDLY CONFIRMED, or WITHDRAWN.');

  if (data.ig && data.ig !== 'N/V') {
    const handle = String(data.ig).replace(/^@/, '').trim();
    if (!/^[\w.]{1,30}$/.test(handle))
      errors.push('Instagram handle looks invalid (letters, numbers, dots, underscores, max 30 chars).');
  }

  if (data.photo && data.photo.trim()) {
    const p = data.photo.trim();
    if (!/^(https?:\/\/|data:image\/)/.test(p))
      errors.push('Photo must be an http/https URL or a data: URI.');
  }

  ['follBefore', 'follLast', 'follCur'].forEach(f => {
    if (data[f] && data[f] !== 'N/V' && !isValidFollowerCount(data[f]))
      errors.push(`${f}: "${data[f]}" is not a valid count (e.g. 1.2M, 450K, N/V).`);
  });

  return errors;
}

/**
 * Validate a show data object.
 * Returns an array of error strings.
 */
function validateShow(data) {
  const errors = [];
  if (!String(data.label || '').trim())  errors.push('Show name is required.');
  if (!String(data.key   || '').trim())  errors.push('Show key is required.');
  else if (!/^[a-z0-9]+$/i.test(data.key)) errors.push('Show key must be letters and numbers only.');
  if (data.color && !/^#[0-9a-f]{3,6}$/i.test(data.color))
    errors.push('Accent colour must be a valid hex like #E53E6A.');
  return errors;
}

/** @returns {boolean} */
function isValidFollowerCount(value) {
  if (!value || value === 'N/V') return true;
  return /^[\d.,]+[KMBkmb]?$/.test(String(value).trim().replace(/\s/g, ''));
}

/** @returns {boolean} */
function isValidDate(value) {
  if (!value) return true;
  return !isNaN(Date.parse(value));
}

/* ─── DEBOUNCE / THROTTLE ───────────────────────────────── */

/**
 * Returns a debounced version of func (fires after `wait` ms silence).
 */
function debounce(func, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Returns a throttled version of func (fires at most once per `limit` ms).
 */
function throttle(func, limit) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}
