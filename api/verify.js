/* ═══════════════════════════════════════════════════════════
   api/verify.js  —  Auth probe
   Just checks the X-Admin-Hash header against ADMIN_HASH env.
   Returns 200 if correct, 401 if wrong.
   No data is written.
═══════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Hash');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const sentHash   = (req.headers['x-admin-hash'] || '').toLowerCase().trim();
  const serverHash = (process.env.ADMIN_HASH || '').toLowerCase().trim();

  if (!serverHash) return res.status(500).json({ error: 'ADMIN_HASH env var not set' });
  if (!sentHash || sentHash !== serverHash) return res.status(401).json({ error: 'Unauthorized' });

  return res.status(200).json({ ok: true });
};
