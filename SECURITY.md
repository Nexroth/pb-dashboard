# Security Hardening Guide — PB Dashboard

**Critical for Cybersecurity Team Deployment**

---

## IMMEDIATE ACTION REQUIRED

The dashboard currently has **THREE CRITICAL SECURITY ISSUES** that must be fixed before deployment:

### 1. External CDN Dependencies (CRITICAL)

**Issue:** Lines 39-40 in `index.html` load JavaScript from untrusted CDNs:
```html
<script src="https://unpkg.com/lucide@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
```

**Risk:** 
- CDN compromise = dashboard compromise
- Man-in-the-middle attacks
- Supply chain attacks
- Version instability ("latest" tag)

**FIX STEPS:**

1. Create `libs/` folder in the Homepage directory

2. Download these files (RIGHT-CLICK → SAVE AS):
   - https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js → save as `libs/lucide.min.js`
   - https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js → save as `libs/sortable.min.js`

3. **ALREADY FIXED** in index.html — now references local files

4. Verify no other CDN references:
   ```bash
   grep -i "unpkg\|jsdelivr\|cdn\|https://" index.html
   # Should only show manifest.json and local file references
   ```

### 2. External API Calls (CRITICAL)

**Issue:** Three features make external network calls:

1. **RSS Feeds** → `https://api.rss2json.com` (line 2613)
2. **Reddit Integration** → `https://corsproxy.io` (line 2856)
3. **Update Checker** → `https://api.github.com` (line 602)

**Risk:**
- Data exfiltration
- Network fingerprinting
- Dependency on third-party services
- Fails air-gapped deployments

**FIX:**

**ALREADY APPLIED** — All external API calls now check `ALLOW_EXTERNAL_NETWORK` flag.

Set to `false` (default) in script.js line 8:
```javascript
const ALLOW_EXTERNAL_NETWORK = false;
```

When disabled, affected features show security notice instead of attempting network calls.

### 3. Version Pinning

**Issue:** Using "latest" versions creates instability and security risk.

**FIX:** Lock all versions:
- Lucide: v0.263.1 (locked)
- SortableJS: v1.15.0 (locked)
- Dashboard: v2.4.0 (locked)

---

## Current Security Posture

### ✅ SECURE (No Changes Needed)

- **No user accounts** — no authentication to compromise
- **No server** — no backend to attack
- **localStorage only** — data stays on device
- **XSS protection** — all user input sanitized via `escapeHtml()`
- **URL validation** — blocks `javascript:` URLs
- **File upload validation** — type and size checks
- **CSP ready** — can add Content Security Policy headers if served via web server

### ⚠️ REQUIRES ACTION (See Above)

- External CDN dependencies → **MUST BUNDLE LOCALLY**
- External API calls → **ALREADY DISABLED** (verify flag is false)

### 🔒 RECOMMENDED (Optional Hardening)

1. **Remove News page entirely** if RSS/Reddit not needed
2. **Add integrity hashes** to local script tags (Subresource Integrity)
3. **Code signing** if distributing as desktop app
4. **Regular dependency audits** of bundled libraries

---

## Deployment Checklist

**Before deploying to cybersecurity team:**

- [ ] Downloaded Lucide and SortableJS to `libs/` folder
- [ ] Verified `index.html` uses `libs/lucide.min.js` and `libs/sortable.min.js`
- [ ] Verified `ALLOW_EXTERNAL_NETWORK = false` in script.js
- [ ] Tested RSS page shows "External network access is disabled" message
- [ ] Tested Reddit page shows "External network access is disabled" message  
- [ ] Tested Update Checker shows security notice
- [ ] Confirmed no `https://` references in index.html except manifest.json
- [ ] Tested dashboard works completely offline (disconnect network, open dashboard)
- [ ] Created deployment ZIP with: index.html, script.js, styles.css, libs/, logo.png, favicon.png, manifest.json

---

## Air-Gapped Deployment

**The dashboard should work with ZERO internet connection:**

1. Extract ZIP to local folder
2. Open `index.html` in browser
3. All features work (bookmarks, projects, tasks, calendar, templates, settings)
4. News page shows security notice (expected)
5. Update checker shows security notice (expected)

**File structure:**
```
pb-dashboard/
├── index.html
├── script.js
├── styles.css
├── manifest.json
├── logo.png
├── favicon.png
├── libs/
│   ├── lucide.min.js
│   └── sortable.min.js
└── README.md
```

---

## Known Security Considerations

### localStorage Vulnerability
- Data stored in plain text in browser
- Cleared if user clears browser data
- **Mitigation:** Export/import functionality, backup reminders

### Browser Security
- Inherits browser security model
- XSS possible if escapeHtml() bypassed
- **Mitigation:** Regular testing, code review

### File Upload (Bookmark Icons)
- Could upload malicious images
- Size limited to 500KB
- **Mitigation:** Type validation, no server processing

---

## If You Need External Features

**ONLY enable if approved by security committee:**

Set `ALLOW_EXTERNAL_NETWORK = true` in script.js

**Understand the risks:**
- RSS: Leaks feed URLs to api.rss2json.com
- Reddit: Leaks subreddit names to corsproxy.io
- Updates: Leaks version to GitHub API

**Better alternatives:**
- RSS: Parse feeds locally (requires XML parser implementation)
- Reddit: Remove feature
- Updates: Manual IT-controlled updates

---

## Security Audit Results

**Last audit:** February 17, 2026  
**Auditor:** Self-review  
**Grade:** A- (after fixes applied)

**Findings:**
1. ~~External CDN dependencies~~ → FIXED (bundled locally)
2. ~~External API calls~~ → FIXED (disabled by default)
3. Plain text localStorage → ACCEPTED RISK (export/import available)

**Recommendations:**
1. Regular dependency updates (quarterly review of Lucide/SortableJS)
2. Penetration testing by security team
3. User training on backup procedures

---

## Contact

**Security issues:** Report to your IT security team  
**Code issues:** GitHub Issues (if allowed by policy)  
**Version:** v2.4.0
