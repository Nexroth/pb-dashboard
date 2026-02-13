# 🔧 Project Tag Styling - Manual Fix Instructions

**Date:** 2026-02-11  
**Status:** Ready to apply  
**File:** `styles.css`  
**Location:** Lines 2522-2533

---

## ✅ What This Fixes

Makes project tags look like bookmark tags (subtle badges instead of colored buttons):
- Transparent background (no color)
- Smaller size (10px vs 11px)
- Tighter padding (2px 6px vs 3px 8px)
- Border outline style
- Consistent with bookmark and task tags

---

## 📝 Manual Fix Steps

### 1. Open `styles.css` in your editor

### 2. Find lines 2522-2533 (search for `.proj-tag`)

**CURRENT CODE (lines 2522-2533):**
```css
/* Project tag badges - distinct styling */
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

### 3. Replace with this NEW CODE:

```css
/* Project tag badges - matches bookmark tag styling */
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

### 4. Save the file

### 5. Refresh your browser to see the changes

---

## 🎯 What Changed (Line by Line)

| Property | Old Value | New Value | Why |
|----------|-----------|-----------|-----|
| `display` | (missing) | `inline-block` | Proper inline layout |
| `background` | `var(--bg-secondary)` | `transparent` | **Removes colored background** |
| `font-size` | `11px` | `10px` | Smaller, more subtle |
| `padding` | `3px 8px` | `2px 6px` | Tighter, matches bookmarks |
| `border-radius` | (missing) | `3px` | Slightly rounded corners |
| `max-width` | `120px` | `100px` | Consistent truncation |
| `font-weight` | (missing) | `400` | Normal weight (not bold) |

---

## ✅ Expected Result

After applying this fix:

**Before:**
- Project tags: "hamburger", "avatar", "rhapsody" → Colored backgrounds, look like buttons

**After:**
- Project tags: Match bookmark tags "test", "urgent" → Transparent, subtle badges

All three tag types (bookmark, project, task) will have consistent styling! 🎨

---

## 🧪 How to Verify

1. Go to Projects page (kanban or table view)
2. Look at project cards with tags
3. Tags should now be:
   - Small and subtle
   - Transparent background
   - Border outline only
   - **NOT** looking like colored buttons

---

**This is the LAST styling issue! After this fix, the dashboard is 100% complete! 🎉**
