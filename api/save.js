/* ═══════════════════════════════════════════════════════════
   api/save.js  —  Data Sync Engine (Direct Vault Bypass)
   Commits data.js directly to GitHub via hardcoded credentials.
═══════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Hash');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sentHash = (req.headers['x-admin-hash'] || '').toLowerCase().trim();
  const serverHash = "cfac1101dbf6e35378a8beda38f869cf058ec54804fd505281538c82367b27cf";

  if (!sentHash || sentHash !== serverHash) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Hardcoded direct structural configurations 
  const token = "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";
  const owner = "MasterBillyButcher"; 
  const repo = "ShowsDB";
  const path = "public/data/data.js"; // Explicit fallback destination

  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing data payload structure' });
    }

    const githubApiUrl = `https://github.com{owner}/${repo}/contents/${path}`;

    // Step A: Fetch current file data from GitHub to extract its unique tracking SHA
    let sha;
    const fileCheckResponse = await fetch(githubApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Vercel-Serverless-Fetch'
      }
    });

    if (fileCheckResponse.ok) {
      const fileData = await fileCheckResponse.json();
      sha = fileData.sha;
    }

    // Step B: Commit the raw base64 data string straight to GitHub
    const contentBuffer = Buffer.from(data).toString('base64');
    const updateResponse = await fetch(githubApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Serverless-Fetch'
      },
      body: JSON.stringify({
        message: "🌐 Global Dashboard Update via Live Admin CMS Engine",
        content: contentBuffer,
        sha: sha || undefined
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return res.status(updateResponse.status).json({ error: `GitHub API error: ${errorText}` });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: `Serverless Native Error: ${error.message}` });
  }
};
