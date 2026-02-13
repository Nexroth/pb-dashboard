# Bookmark Styles Fix - Manual Application Required

## Issue
The bookmark tags and notes indicator have styling problems that need these CSS changes:

## Changes Needed in styles.css

### 1. Replace `.bookmark-link` (around line 440)
```css
/* OLD: */
.bookmark-link {
  display: block;
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 500;
}

/* NEW: */
.bookmark-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 500;
}
```

### 2. Add after `.bookmark-link:hover` (around line 449)
```css
.bookmark-link:hover .bookmark-tag {
  border-color: var(--accent);
}
```

### 3. Replace `.bookmark-tag` (around line 451)
```css
/* OLD: */
.bookmark-tag {
  display: inline-block;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* NEW: */
.bookmark-tag {
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

### 4. Replace `.bookmark-notes-indicator` (around line 465)
```css
/* OLD: */
.bookmark-notes-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}

/* NEW: */
.bookmark-notes-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
  background: transparent;
  border: none;
}
```

### 5. Update `.bookmark-notes-indicator i` (around line 480)
```css
/* OLD: */
.bookmark-notes-indicator i {
  width: 14px;
  height: 14px;
}

/* NEW: */
.bookmark-notes-indicator i {
  width: 16px;
  height: 16px;
}
```

## What This Fixes
1. ✅ Tags appear inline with bookmark name (not below)
2. ✅ Tags have transparent background (not blue)
3. ✅ Tags are smaller and more subtle
4. ✅ Notes indicator has no blue background
5. ✅ Notes icon is properly sized

## Already Done
✅ Tag is now inside the link element in script.js (line ~477)