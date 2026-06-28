# 📺 Reality TV Intel 2026 — BobMasterBillie

Live Indian Reality TV tracker. Data updates globally when you hit **🌐 Save Global** — everyone sees changes in ~30 seconds, no manual uploads.

---

## 🚀 Setup Guide — Zero to Live (15 minutes)

### Step 1 — Push to GitHub

1. Create a new repo on GitHub (e.g. `realitytv2026`) — set it **Public**
2. Unzip the project and push:

```bash
cd realitytv2026
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/realitytv2026.git
git push -u origin main
```

---

### Step 2 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo `realitytv2026`
3. Vercel auto-detects the config. Click **Deploy** — done.

---

### Step 3 — Create GitHub Personal Access Token

This lets the site commit data updates to GitHub.

1. Go to **github.com → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Name: `realitytv-dashboard`
4. Expiration: **No expiration** (or 1 year)
5. Scopes: tick **`repo`** (full repo access)
6. Click **Generate token** — copy the token (you only see it once!)

---

### Step 4 — Set Your Admin Password Hash

1. Open your deployed Vercel site in a browser
2. Open the browser console (F12 → Console tab)
3. Run:
```javascript
await adminHash('your-chosen-password')
```
4. Copy the 64-character hash that appears

---

### Step 5 — Set Vercel Environment Variables

Go to **Vercel → Your Project → Settings → Environment Variables** and add these 4 variables:

| Variable | Value | Example |
|---|---|---|
| `GH_TOKEN` | Your GitHub token from Step 3 | `ghp_xxxxxxxxxxxx` |
| `GH_OWNER` | Your GitHub username | `BobMasterBillie` |
| `GH_REPO`  | Your repo name | `realitytv2026` |
| `ADMIN_HASH` | The hash from Step 4 | `c34e14750f49b0b8…` |

Then click **Save** and go to **Deployments → Redeploy** so the new variables take effect.

---

### Step 6 — Test It

1. Visit your Vercel URL
2. Click **🔒 Admin** in the top bar
3. Enter your password
4. Edit something (toggle Edit Mode, change a name)
5. Click **🌐 Save Global**
6. Wait ~30 seconds
7. Open the site in a different browser (incognito) — you should see your change

✅ That's it. You're live.

---

## 📁 File Structure

```
/
├── vercel.json              ← Routing config
├── package.json             ← Node runtime
├── api/
│   ├── save.js              ← Saves data to GitHub (serverless)
│   └── verify.js            ← Verifies admin password (serverless)
└── public/
    ├── index.html           ← Main app
    ├── css/styles.css       ← All styles (dark + light mode)
    ├── data/data.js         ← Show + contestant data (auto-updated on save)
    └── js/
        ├── utils.js         ← Helpers
        ├── app.js           ← Core rendering + CRUD
        ├── export.js        ← CSV / JSON exports
        ├── persistence.js   ← Local backup + screenshots
        └── admin.js         ← Auth + global save
```

---

## 🔒 Admin vs Public

| Feature | Everyone | Admin only |
|---|---|---|
| Browse all shows / rosters | ✅ | ✅ |
| Filter by status, show, gender, search | ✅ | ✅ |
| Screenshot / Capture any panel (2× HD) | ✅ | ✅ |
| Export CSV / Growth CSV | ✅ | ✅ |
| Light / Dark mode | ✅ | ✅ |
| Print / PDF | ✅ | ✅ |
| Edit contestant data (inline) | ❌ | ✅ |
| Add / delete contestants | ❌ | ✅ |
| Add / manage shows | ❌ | ✅ |
| Hide / show contestants | ❌ | ✅ |
| **🌐 Save Global (updates everyone)** | ❌ | ✅ |
| 💾 Local browser backup | ❌ | ✅ |

---

## 🌐 How Global Save Works

```
You click 🌐 Save Global
         ↓
Browser sends data to /api/save with your password hash
         ↓
Vercel serverless function commits data.js to GitHub
         ↓
GitHub webhook triggers Vercel rebuild (~30 seconds)
         ↓
Every visitor worldwide sees updated data
```

No database. No extra services. Just GitHub + Vercel.

---

## 🔑 Changing Your Password

1. Open browser console on your site
2. Run: `await adminHash('new-password')`
3. Copy the hash
4. Go to Vercel → Settings → Environment Variables → update `ADMIN_HASH`
5. Redeploy

---

## ✏️ Updating Data

**Option A (recommended) — Admin Mode on the live site:**
1. Click 🔒 Admin → enter password
2. Toggle **✎ Edit Mode** to edit inline, or use **+ Add** buttons
3. Click **🌐 Save Global** when done — everyone sees it in ~30s

**Option B — Edit data.js directly:**
1. Edit `public/data/data.js` in your repo
2. Commit + push → Vercel auto-redeploys

---

## 📷 Screenshots

- Click **📷 Capture** on any panel for a 2× HD PNG
- Download as PNG or JPG, copy to clipboard, or print
- Works for: rosters, card view, growth tables, rankings

---

## 💬 Light Mode Fix

All text is now fully visible in both dark and light mode. Every color uses CSS tokens (`--txt`, `--mut`, `--gtbl-txt` etc.) that automatically swap when you toggle the theme. The growth table teal background now works correctly in both modes.

---

*Built for BobMasterBillie · 2026*
