# Task Tags & Folder Badge - Final Fix

## Changes Needed

### 1. JavaScript - Swap Order (✅ APPLIED)
**File:** `script.js` line 2415-2420

Folder now comes BEFORE tag (since we can have multiple tags).

### 2. CSS Changes - APPLY THESE MANUALLY

**File:** `styles.css` Lines 1915-1941

**Replace this entire section:**
```css
.task-tag {
  display: inline-block;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

}

.task-folder-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.task-folder-badge i {
  width: 11px;
  height: 11px;
}
```

**With this:**
```css
.task-tag {
  display: inline-block;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 400;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-folder-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: 4px;
  padding: 3px 8px;
}

.task-folder-badge i {
  width: 11px;
  height: 11px;
}
```

## What This Fixes

### Task Tags:
- ✅ **Removed colored background** - now transparent like bookmark/project tags
- ✅ **Border outline only** - matches bookmark/project styling
- ✅ **Smaller font** - 10px (was 11px)
- ✅ **Better padding** - 2px 6px (was 1px 6px)
- ✅ **3px border-radius** - matches bookmarks

### Task Folder Badge:
- ✅ **Added background** - `var(--bg-secondary)` to match stats badges
- ✅ **Better centering** - added `justify-content: center`
- ✅ **Better padding** - 3px 8px gives icon more room
- ✅ **Icon no longer touches top/bottom** - proper spacing on all sides
- ✅ **4px border-radius** - matches other badges

## Result
After applying these changes:
1. Task tags will have transparent background with border (like bookmarks/projects)
2. Folder badge will have visible background and properly sized icon
3. Order: Due date → To-dos → **Folder → Tag** (folder first!)
4. Everything matches the design system

## How to Apply
1. Open `02 Projects/Homepage/styles.css`
2. Find lines 1915-1941 (the `.task-tag` and `.task-folder-badge` sections)
3. Delete those lines
4. Paste in the new code from above
5. Save and refresh your dashboard

Done! 🎯
