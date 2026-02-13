# Homepage Dashboard

Your personal bookmark dashboard with RSS feeds, Reddit integration, and custom themes.

## Quick Start

1. Open `index.html` in your browser
2. Add sections for organizing bookmarks
3. Right-click bookmarks for options
4. Customize your theme in Settings

## Features

### Bookmarks
- **Drag & drop** cards between sections
- **Right-click menu** for edit, delete, copy URL, view notes
- **Custom icons** upload your own
- **Notes badge** shows when bookmarks have notes
- **Search** filter by name, URL, or notes - find your incident response tools fast

### News Page
- **Morning Coffee** - top 3 articles from all your feeds
- **RSS feeds** - add any feed, customize tab names
- **Reddit** - follow your favorite subreddits
- **One-click manage** add/remove feeds and subreddits

### Themes
- 7 preset themes: Dark, Light, Nordic, Catppuccin, Dracula, Solarized, Cyberpunk
- **Custom theme** - pick your own colors with 5 color pickers
- Background, section, bookmark, text, and accent colors

### Data
- **Export/Import** backup and restore your data
- **localStorage** everything saves automatically
- **No server needed** runs completely offline

## Quick Tips

**Keyboard shortcut:** Press `Ctrl+V` with a URL copied to quickly add a bookmark

**Drag anywhere:** You can drop bookmarks anywhere in a section, even empty ones

**Custom feed names:** Click feed names in the RSS manager to rename them

**Context menu:** Right-click any bookmark to see all options

## Files

- `index.html` - main page structure
- `script.js` - all the logic
- `styles.css` - themes and styling

## Customization

Check out `CUSTOMIZATION.md` for details on tweaking colors, adding feeds, and more.

## Backup Your Data

Settings → Export Data → saves a JSON file with everything

## Tech Stack

Vanilla JavaScript, no frameworks. Uses:
- **Lucide icons** - clean icon set
- **SortableJS** - drag and drop
- **localStorage** - data persistence
- **rss2json.com** - RSS parsing
- **corsproxy.io** - Reddit access

---

Built for productivity. No tracking, no accounts, no BS.