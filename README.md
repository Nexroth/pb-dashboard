# Homepage Dashboard

Open `index.html` in any browser. Everything runs offline, all data saves to localStorage automatically.

## Pages

### Home — Bookmarks

Bookmarks are organized into sections. Drag cards between sections or drag section headers to reorder sections. Right-click any bookmark to edit, delete, copy the URL, or view its notes. You can also upload a custom icon per bookmark.

Each bookmark can have multiple tags. They show up as small badges on the card. Search bar at the top filters by name, URL, notes, and tags. 

`Ctrl+V` with a URL on the clipboard opens the add-bookmark modal with the URL pre-filled.

### Projects

Shows all your projects as a kanban board with five columns: Planning, Active, On Hold, Completed, and Archived. Drag cards between columns to change status. Drag column headers to reorder columns.

Use the "Hide Completed" and "Hide Archived" checkboxes to clean up the view. Search filters across project names, descriptions, and tags. When searching, archived projects show up with an ARCHIVED badge.

Right-click a project card to edit, view its description, open its folder, go to its tasks, or delete it. The folder badge in the stats row appears when a folder path is set — right-clicking and choosing Open Folder copies the path to your clipboard.

Table view shows all projects in a sortable list with inline edit and delete buttons. The hide filters work in both views.

### Tasks

Per-project task board. Select a project from the dropdown at the top. Note: archived projects don't appear in the dropdown.

Tasks have a priority level (Low / Medium / High / Critical), optional due date, a to-do checklist, tags, notes, and an optional folder path.

Switch between kanban and table view with the toggle at the top right. `Alt+T` opens the add-task modal. Right-click a task card to view notes and todos, edit, open the folder, or delete.

### News

Two sections: RSS feeds and Reddit.

RSS feeds show a list of tabs — one per feed plus a Morning Coffee tab that shows the 3 most recent articles across all your feeds combined. Click the gear button to add, remove, or rename feeds.

Reddit shows the top posts from the past week for each subreddit you add. Click the gear button to add or remove subreddits.

### Settings

Theme picker with 8 presets and a custom option that exposes 5 color pickers (background, section/sidebar, bookmark card, text, accent). Export and import your full data as a JSON file. There's also a Clear All Data button with double confirmation if you need to start fresh.

## Security Notes

The application blocks javascript: URLs in bookmarks and sanitizes all user input to prevent code injection. Don't store passwords or sensitive information in notes — this is local storage, like keeping files on your computer. Anyone with access to your device can read the data.

## Files

- `index.html` — page structure
- `script.js` — all logic
- `styles.css` — themes and layout
- `Customization.txt` — how to set up feeds, themes, and other options
- `README.md` - this file

## Tech

Vanilla JS. Dependencies loaded via CDN:
- Lucide icons
- SortableJS (drag and drop)
- rss2json.com (RSS parsing)
- corsproxy.io (Reddit access)