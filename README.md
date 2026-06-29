<div align="center">

# 📺 Reality TV Intel 2026

### Track contestants, follower counts, rankings, and social media growth across India's biggest reality TV shows.

<p>

<a href="https://realitytv2026.vercel.app/" target="_blank">
<img src="https://img.shields.io/badge/🌐_Live_Demo-Visit_Website-16A34A?style=for-the-badge" alt="Live Demo">
</a>

<a href="https://github.com/MasterBillyButcher/realitytv2026" target="_blank">
<img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="Repository">
</a>

</p>

<p>

<img src="https://img.shields.io/badge/Version-2026-2563EB?style=flat-square">
<img src="https://img.shields.io/badge/Status-Active-22C55E?style=flat-square">
<img src="https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black">
<img src="https://img.shields.io/badge/Font-Montserrat-FF6B6B?style=flat-square">
<img src="https://img.shields.io/badge/Backend-None-orange?style=flat-square">
<img src="https://img.shields.io/badge/Database-GitHub-181717?style=flat-square&logo=github">

</p>

*A modern, cinematic dashboard built for fast, reliable tracking of Indian reality TV contestant analytics.*

</div>

---

## 🌐 Live Website

### **https://realitytv2026.vercel.app/**

---

## ✨ Features

### 📊 Analytics
- Live contestant rankings by follower count
- Instagram follower growth tracking (Before Show → Last Checked → Current)
- Multi-show dashboard with per-show and cross-show views
- Smart search + advanced filtering (status, show, gender)
- Drag-to-reorder growth tables with 7 sort modes

### ✏️ Administration
- Inline cell editing (click any field in Edit Mode)
- Add / edit / delete contestants
- Create, rename, and delete shows
- Hide / restore individual contestants
- Bulk follower import (paste CSV-style lines)
- Download updated `data.js` → upload to GitHub → everyone sees it

### 📤 Export
- CSV export per show, all rosters, growth, rankings
- 2× HD PNG screenshot of any panel
- Print-ready layout (Ctrl+P → PDF)
- JSON data file export

### 🎨 User Experience
- Cinematic dark mode (default) + clean light mode
- Montserrat + Inter font system
- Animated entrance effects, smooth transitions
- Fully responsive (desktop, tablet, mobile)
- Keyboard shortcuts (Ctrl+S, Ctrl+Shift+S, Escape)

---

## 🏗 Architecture

```text
               Browser (any visitor)
                       │
                       ▼
        Loads bundled data/data.js instantly
                       │
                       ▼
        Fetches latest data from GitHub raw
        (cache-busted on every page load)
                       │
                       ▼
       Re-renders dashboard with fresh data
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
      Public Viewer          Administrator
      (read only)         (edit + export)
             │                   │
             └─────────┬─────────┘
                       ▼
          Download updated data.js
                       │
                       ▼
       Replace public/data/data.js on GitHub
                       │
                       ▼
        Latest data live for everyone ✓
```

---

## ⚙ Technology Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Semantic structure |
| CSS3 + Custom Properties | Design tokens, light/dark mode, animations |
| Vanilla JavaScript (ES2020) | All application logic |
| Montserrat + Inter | Typography |
| html2canvas | Screenshot capture |
| GitHub Raw | Live data delivery |
| Vercel | Static hosting + CDN |

---

## 📁 Project Structure

```text
.
├── public/
│   ├── css/
│   │   └── styles.css          ← Full design system with CSS tokens
│   ├── data/
│   │   └── data.js             ← All show + contestant data (edit & upload to update)
│   ├── js/
│   │   ├── utils.js            ← Sanitization, validation, debounce (loads first)
│   │   ├── app.js              ← Rendering, navigation, CRUD, growth logic
│   │   ├── export.js           ← CSV, JSON export, screenshot capture
│   │   ├── persistence.js      ← LocalStorage, bulk import, activity log
│   │   ├── admin.js            ← SHA-256 password auth, session management
│   │   └── dataloader.js       ← GitHub fetch + boot sequence
│   └── index.html              ← App shell + all modals
├── vercel.json                 ← Routing + cache headers
└── README.md
```

---

## 🚀 Quick Start

```bash
git clone https://github.com/MasterBillyButcher/realitytv2026.git
cd realitytv2026
```

Open `public/index.html` in a browser, or deploy to Vercel.

---

## 📝 Updating Data

All data lives in `public/data/data.js`.

### Workflow

1. Open the dashboard at your live URL
2. Click **🔒 Admin** → enter password
3. Click **✎ Edit Mode**
4. Click any field to edit it inline
5. Click **↓ Save JSON** → file downloads as `data.js`
6. Upload `data.js` to GitHub at `public/data/data.js`
7. Everyone sees the update on their next page load ✓

### Bulk Follower Import

Fastest way to update many followers at once. In **Export → Load from JSON → Bulk Follower Import**:

```
Gaurav Khanna, kkk, 2.1M
Rubina Dilaik, kkk, 8.6M
Shivangi Joshi, lockupp, 10.5M
```

Format: `Contestant Name, showKey, newFollowers`

Supported formats: `430K` · `2.5M` · `8.7M` · `9200000`

---

## 🔒 Admin

Default password: **`realitytv2026`**

### To change the password

1. Open the site in your browser
2. Open DevTools console (F12)
3. Run: `adminHash('yournewpassword')`
4. Copy the hash output
5. Open `public/js/admin.js` and replace `ADMIN_HASH` value

Sessions last **8 hours** and are stored in `sessionStorage`.

---

## 👥 Permissions

| Feature | Public | Admin |
|:--------------------------------|:------:|:------:|
| Browse Dashboard | ✅ | ✅ |
| Search + Filter | ✅ | ✅ |
| Export CSV | ✅ | ✅ |
| Screenshot / Print | ✅ | ✅ |
| Edit Contestants | ❌ | ✅ |
| Add Contestants | ❌ | ✅ |
| Delete Contestants | ❌ | ✅ |
| Manage Shows | ❌ | ✅ |
| Bulk Import | ❌ | ✅ |
| Download data.js | ❌ | ✅ |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save to browser storage |
| `Ctrl + Shift + S` | Download data.js |
| `Ctrl + Shift + P` | Print |
| `Escape` | Close any open modal |

---

## 🌍 Browser Support

| Browser | Supported |
|---------|-----------|
| Google Chrome | ✅ |
| Microsoft Edge | ✅ |
| Mozilla Firefox | ✅ |
| Safari | ✅ |

---

## 🔧 Troubleshooting

**Updates not showing?**
- Confirm `public/data/data.js` was replaced on GitHub
- Hard refresh: `Ctrl + Shift + R`
- Allow 30–60 seconds for Vercel to deploy

**Screenshot not working?**
- Some ad blockers interfere with html2canvas
- Use `Ctrl+P → Save as PDF` as an alternative
- Try in an incognito window

**GitHub fetch failing?**
- The bundled `data.js` loads as fallback — the site still works
- Check the repo is public, or that the raw URL is accessible
- Look for the yellow banner at the top of the page

---

## 🔒 Security Note

This is a client-side application. The admin password is hashed with SHA-256 in the browser and is never sent to a server. Admin controls are intended for **trusted users** who know the password. They are not a substitute for server-side authentication.

---

## 🤝 Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Commit your changes
4. Open a Pull Request

---

## 📄 License

MIT — see `LICENSE` file.

---

<div align="center">

## ⭐ Reality TV Intel 2026

**Fast · Cinematic · Static · Easy to Maintain**

### 🌐 https://realitytv2026.vercel.app/

*Built with ❤️ by BobMasterBillie*

</div>
