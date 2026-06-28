/* ═══════════════════════════════════════════════════════════
   api/save.js  —  Data Sync Engine (Hardcoded Fallback Fix)
   Commits data.js directly to GitHub repository.
═══════════════════════════════════════════════════════════ */
const { Octokit } = require("@octokit/rest");

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Hash');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sentHash = (req.headers['x-admin-hash'] || '').toLowerCase().trim();
  
  // Hardcoded fallback string guarantees the script runs without Vercel Env blocks
  const serverHash = "cfac1101dbf6e35378a8beda38f869cf058ec54804fd505281538c82367b27cf";

  if (!sentHash || sentHash !== serverHash) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fallback checks for GitHub environment variables
  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER || "MasterBillyButcher"; 
  const repo = process.env.GH_REPO || "ShowsDB";

  if (!token) {
    return res.status(500).json({ error: 'GitHub Sync Error: GH_TOKEN env var is missing from Vercel.' });
  }

  try {
    const { data, path } = req.body;
    if (!data || !path) {
      return res.status(400).json({ error: 'Missing path or data payloads' });
    }

    const octokit = new Octokit({ auth: token });
    
    // Step A: Get current file reference hash from GitHub
    let sha;
    try {
      const fileRes = await octokit.repos.getContent({ owner, repo, path });
      sha = fileRes.data.sha;
    } catch (e) {
      // If file doesn't exist yet, we will create it fresh without a SHA reference
    }

    // Step B: Write content back to the main repository tree
    const contentBuffer = Buffer.from(data).toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: "🌐 Global Dashboard Update via Live Admin CMS Engine",
      content: contentBuffer,
      sha
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: `GitHub Commit Failed: ${error.message}` });
  }
};
