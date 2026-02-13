# GitHub Release Template

Use this template when creating releases on GitHub.

## How to Create a Release:

1. Go to https://github.com/Nexroth/pb-dashboard/releases
2. Click "Draft a new release"
3. Fill in:
   - **Tag version:** `v2.0.1` (increment based on changes)
   - **Release title:** `v2.0.1 - Brief Description`
   - **Description:** Use template below

## Release Description Template:

```markdown
## What's New

- Added project export feature (HTML and Markdown)
- Fixed bookmark icon sizing issue
- Added sorting to projects table view
- Improved dark theme in HTML exports

## Installation Instructions

### For New Users:
1. Download `pb-dashboard.zip` below
2. Extract the ZIP file
3. Open `index.html` in your browser
4. Bookmark the page for easy access

### For Existing Users (Updating):
1. Download `pb-dashboard.zip` below
2. Extract the ZIP file
3. **Copy all files** and paste into your current dashboard folder
4. Replace/overwrite when prompted
5. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)

⚠️ **Important:** This will NOT delete your data. All bookmarks, projects, and tasks are stored separately and will remain intact.

## Files Included

- `index.html` - Main dashboard file
- `script.js` - Application logic
- `styles.css` - Styling
- `logo.png` - Dashboard logo
- `favicon.png` - Browser icon
- `README.md` - Documentation
- `Customization.txt` - Theme guide

---

**Full Changelog:** https://github.com/Nexroth/pb-dashboard/compare/v2.0.0...v2.0.1
```

## Before Releasing:

1. **Update version number** in `script.js`:
   ```javascript
   const DASHBOARD_VERSION = '2.0.1';
   ```

2. **Create ZIP file** with these files:
   - index.html
   - script.js
   - styles.css
   - logo.png
   - favicon.png
   - README.md
   - Customization.txt

3. **Upload ZIP** to GitHub release as `pb-dashboard.zip`

## Version Numbering Guide:

- **Major (v3.0.0):** Big changes, major new features, breaking changes
- **Minor (v2.1.0):** New features, improvements, no breaking changes
- **Patch (v2.0.1):** Bug fixes, small tweaks

## Example Workflow:

1. Fix a bug or add feature
2. Update version in script.js
3. Commit: `git commit -m "v2.0.1 - Fixed bookmark icons"`
4. Push: `git push`
5. Create release on GitHub with template above
6. Team gets notified via "Check for Updates" button
