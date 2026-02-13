# 🧪 Homepage Dashboard - Final Testing Checklist
**Date:** 2026-02-11  
**Status:** Ready for comprehensive testing after tag styling fix

---

## 🔴 PREREQUISITE: Apply Tag Styling Fix First!

Before running these tests, apply the manual fix documented in `TAG_STYLING_FIX_MANUAL.md`:
- [ ] Fix `.proj-tag` styling in `styles.css` (lines 2522-2533)
- [ ] Verify project tags now look like bookmark tags (subtle, transparent)

---

## 1️⃣ Core Functionality Tests

### Bookmarks Page
- [ ] **Add bookmark via Ctrl+V** - paste a URL and verify it creates a bookmark
- [ ] **Add custom icon** - upload an icon (should validate: images only, max 500KB)
- [ ] **Try invalid file** - attempt to upload .txt file (should show error)
- [ ] **Try oversized file** - attempt to upload >500KB image (should show error)
- [ ] **Add tags** - comma-separated tags: "test, urgent, work"
- [ ] **Verify first tag display** - only first tag should appear on card
- [ ] **Add notes with URLs** - include http://example.com in notes
- [ ] **Right-click → View Notes** - URLs should be clickable links
- [ ] **Drag bookmark** - move between sections
- [ ] **Drag section** - reorder sections
- [ ] **Search by tag** - search for "test" (should find tagged bookmarks)
- [ ] **Search by notes** - search for content in notes field
- [ ] **Delete bookmark** - via context menu
- [ ] **Bookmark notes indicator** - verify no background color on notes icon

### Projects Page
- [ ] **Create project with tags** - add tags: "frontend, redesign, urgent"
- [ ] **Verify tag styling** - ✅ **CRITICAL:** tags should be subtle badges, NOT colored buttons
- [ ] **Add folder path** - verify folder badge appears in stats row
- [ ] **Add notes with URLs** - include links in project notes
- [ ] **Right-click → View Notes** - description + notes shown, URLs clickable
- [ ] **Kanban view** - drag project between columns
- [ ] **Kanban view** - drag columns to reorder
- [ ] **Try moving to Completed** - with incomplete tasks (should block with message)
- [ ] **Table view** - verify all columns display correctly
- [ ] **Search projects by tag** - search for "frontend"
- [ ] **Hide Completed** - toggle should work
- [ ] **Overdue styling** - create project with past due date (should show red border + OVERDUE badge)
- [ ] **Progress bar** - verify accurate percentage
- [ ] **Notes badge** - should match folder badge styling (no special color)

### Tasks Page
- [ ] **Create task via Alt+T** - keyboard shortcut
- [ ] **Add tags, folder, due date**
- [ ] **Add notes with URLs**
- [ ] **Add todos** - create multiple todo items
- [ ] **Right-click → View Notes & Todos** - checkboxes should be read-only
- [ ] **Verify URLs clickable** in task notes
- [ ] **Kanban view** - drag tasks between columns
- [ ] **Table view** - all fields visible
- [ ] **Priority badges** - High/Medium/Low display correctly
- [ ] **Overdue detection** - create task with past date (Done/Completed statuses shouldn't show as overdue)
- [ ] **Search tasks** - by name, tags
- [ ] **Hide Completed** - toggle
- [ ] **Task folder badge** - verify 11px icon size (not oversized)
- [ ] **Footer badges** - all four items (.task-due, .task-todos-badge, .task-tag, .task-folder-badge) same height (17px)

### News Page
- [ ] **Add RSS feed** - enter valid feed URL
- [ ] **Add Reddit subreddit** - enter subreddit name
- [ ] **Morning Coffee tab** - verify top articles from all feeds
- [ ] **Individual feed tabs** - each feed has own tab
- [ ] **CORS errors** - verify friendly error messages with retry buttons
- [ ] **Reddit tab** - posts display correctly
- [ ] **Error handling** - test with invalid feed URL (should show retry button)

---

## 2️⃣ Theme & Settings Tests

### Themes
- [ ] **All 8 preset themes** - cycle through: Dark, Light, Ocean, Forest, Sunset, Solarized, Cyberpunk, Peanut Butter
- [ ] **Custom theme** - create with 5 color pickers
- [ ] **Theme persistence** - refresh page, theme should remain
- [ ] **Verify Peanut Butter theme** - warm cream/tan backgrounds, brown text, golden accent

### Data Management
- [ ] **Export data** - download JSON backup
- [ ] **Import data** - upload JSON backup, verify all data restored
- [ ] **Import old backup** - test backward compatibility (if you have an old backup)
- [ ] **Clear All Data** - test double confirmation dialog
- [ ] **After clear** - verify clean slate, page reloads
- [ ] **localStorage quota** - try filling storage (should show helpful error message if exceeded)

---

## 3️⃣ Visual Consistency Tests

### Tag Styling (Most Important!)
- [ ] **Bookmark tags** - subtle, transparent, border outline ✅
- [ ] **Project tags** - ✅ **MUST MATCH** bookmark tags (subtle, transparent, border outline)
- [ ] **Task tags** - verify consistent with others
- [ ] **All three should look identical** - same size, style, transparency

### Badge Styling
- [ ] **Project notes badge** - matches folder badge (no special color)
- [ ] **Project folder badge** - proper styling in stats row
- [ ] **Task folder badge** - 11px icon size
- [ ] **All stat badges** - uniform height and spacing

### Layout & Spacing
- [ ] **Project cards** - uniform height, description locked to 2 lines
- [ ] **Task cards** - uniform height, title locked to 2 lines
- [ ] **Bookmark cards** - grid minmax 280px, proper padding
- [ ] **Info panels** - 520px width, scrollable content

---

## 4️⃣ Context Menu Tests

### Positioning & Behavior
- [ ] **Bookmark context menu** - appears at cursor position
- [ ] **Project context menu** - appears at cursor position
- [ ] **Task context menu** - appears at cursor position
- [ ] **Repeated use** - open/close multiple times (should maintain proper positioning)
- [ ] **Click outside** - should dismiss menu
- [ ] **Esc key** - should dismiss menu (if implemented)

### Menu Actions
- [ ] **View Notes** - all three entity types
- [ ] **Edit** - all three entity types
- [ ] **Delete** - all three entity types
- [ ] **Copy URL** - bookmarks only
- [ ] **View Tasks** - projects only
- [ ] **Open Folder** - projects and tasks (clipboard fallback with toast)

---

## 5️⃣ Search & Filter Tests

### Search Functionality
- [ ] **Bookmarks** - search name, URL, notes, tags
- [ ] **Projects** - search name, description, tags
- [ ] **Tasks** - search title, tags
- [ ] **Special characters** - test with @#$% etc.
- [ ] **Empty search** - shows all items
- [ ] **No results** - appropriate empty state

### Search Debouncing
- [ ] **Type rapidly** - search should wait 300ms before executing
- [ ] **No lag** - smooth typing experience

---

## 6️⃣ Edge Cases & Error Handling

### File Upload
- [ ] **Wrong file type** - .pdf, .txt, .docx (should reject)
- [ ] **Oversized file** - >500KB (should reject with message)
- [ ] **Valid image** - .png, .jpg, .webp (should accept)
- [ ] **File reader error** - test error handling

### Network Errors
- [ ] **RSS feed fails** - retry button appears
- [ ] **Reddit fails** - retry button appears
- [ ] **Invalid feed URL** - friendly error message

### Data Integrity
- [ ] **Missing tags field** - old bookmarks/projects without tags should work
- [ ] **Migration** - `migrateData()` adds missing tags arrays
- [ ] **Import corrupted JSON** - should handle gracefully

### Open Folder
- [ ] **Valid path** - tries to open, falls back to clipboard + toast
- [ ] **Invalid path** - copies to clipboard, shows toast
- [ ] **Error handling** - try-catch prevents crashes

---

## 7️⃣ Drag & Drop Tests

### Sortable.js Integration
- [ ] **Bookmark cards** - drag within section
- [ ] **Bookmark cards** - drag between sections
- [ ] **Bookmark sections** - reorder
- [ ] **Project cards** - drag between kanban columns
- [ ] **Project columns** - reorder
- [ ] **Task cards** - drag between kanban columns
- [ ] **Smooth animations** - no jank or flashing
- [ ] **Completed guard** - can't move project with incomplete tasks to Completed

---

## 8️⃣ Keyboard Shortcuts

- [ ] **Ctrl+V** - quick-add bookmark
- [ ] **Alt+T** - add task (Tasks page only)
- [ ] **Test on wrong pages** - shortcuts should be page-specific

---

## 9️⃣ Sidebar & Navigation

- [ ] **Logo + Dashboard text** - visible when expanded
- [ ] **Collapsed state** - hamburger centered, brand hidden
- [ ] **Page switching** - smooth transitions
- [ ] **Active page highlighting** - correct page highlighted
- [ ] **Favicon** - verify favicon.png loads
- [ ] **Logo in About** - 80px height, left-aligned

---

## 🔟 Performance Tests

### With Large Datasets
- [ ] **100+ bookmarks** - smooth scrolling, no lag
- [ ] **20+ projects** - kanban and table view perform well
- [ ] **50+ tasks** - drag and drop still smooth
- [ ] **Full localStorage** - handles quota exceeded gracefully

### Rendering
- [ ] **No console errors** - check browser console
- [ ] **Icons render** - Lucide icons load correctly
- [ ] **No layout shifts** - pages load without jumping

---

## ✅ Final Checklist

Before declaring complete:
- [ ] **Tag styling fixed** - project tags match bookmark tags
- [ ] **All tests pass** - no critical bugs found
- [ ] **No console errors** - clean browser console
- [ ] **Data persists** - refresh doesn't lose data
- [ ] **Export/import works** - full data round-trip successful
- [ ] **All 8 themes work** - no broken styles
- [ ] **Notes URLs clickable** - all contexts (bookmarks, projects, tasks)
- [ ] **All badges consistent** - proper sizing and alignment

---

## 📊 Test Results Template

```
TESTED: [Date]
TESTER: [Name]

CRITICAL ISSUES FOUND: [None / List]
MINOR ISSUES FOUND: [None / List]
SUGGESTIONS: [List any UX improvements]

PASS/FAIL: [Status]
READY TO SHIP: [Yes/No]
```

---

## 🎯 Success Criteria

Dashboard is ready to share when:
1. ✅ All tests pass
2. ✅ No critical bugs
3. ✅ Tag styling is consistent across all features
4. ✅ Data export/import works flawlessly
5. ✅ Error handling is user-friendly
6. ✅ Performance is smooth with realistic data volumes

**Current Status:** 99% complete - only project tag styling fix needed! 🚀
