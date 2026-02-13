# Project Tag Styling Fix - Quick Reference

## 🎯 **Goal**
Make project tags look like bookmark tags (subtle badges, not colorful buttons)

## 📸 **Current vs Target**

**Current (WRONG):**
- Project tags: "hamburger", "avatar", "rhapsody" 
- Solid colored backgrounds (blue, purple, etc.)
- Look like clickable buttons
- Large and prominent

**Target (CORRECT - like bookmark tags):**
- Bookmark tags: "test", "urgent"
- Transparent background
- Border outline only
- Small and subtle
- Same style as task tags

## 🔧 **Fix Required**

### In `styles.css` (around line 2475):

**Find this:**
```css
.proj-tag {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 3px 8px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**Replace with:**
```css
.proj-tag {
  display: inline-block;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
}
```

## ✅ **What This Changes:**
1. `background: transparent` - No colored background
2. `font-size: 10px` - Smaller, more subtle
3. `padding: 2px 6px` - Tighter padding (matches bookmarks)
4. `border-radius: 3px` - Slightly rounded (matches bookmarks)
5. `max-width: 100px` - Consistent truncation (matches bookmarks)
6. `font-weight: 400` - Normal weight (matches bookmarks)

## 🎨 **Result:**
Project tags will look exactly like bookmark tags:
- Small, subtle badges
- Transparent with border outline
- Consistent across all features (bookmarks, projects, tasks)

---

**Note:** This is the ONLY remaining visual issue. Everything else is complete and working!