# 🚨 QUICK FIX CHECKLIST - Do These Now!

## Critical Issue
**Multiple tags are pushing icons out of bookmark cards!** Gmail card shows this clearly.

## 5 CSS Changes to Make (in order)

Open `styles.css` and make these changes:

---

### ✅ 1. Fix Bookmark Tag Background (Line 459)
**Find:** `background: transparent !important;`  
**Replace with:** `background: var(--bg-secondary);`

---

### ✅ 2. Let Bookmark Main Shrink (Lines 428-432)
**Find:**
```css
.bookmark-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
```

**Replace with:**
```css
.bookmark-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

---

### ✅ 3. Prevent Stats from Wrapping (Lines 496-502)
**Find:**
```css
.bookmark-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}
```

**Replace with:**
```css
.bookmark-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
  flex-wrap: nowrap;
  overflow: hidden;
  min-width: 0;
}
```

---

### ✅ 4. Standardize All Tag Sizes

**Find and change in THREE places:**

**Line 530 (bookmark tags):**  
Change: `font-size: 10px;` → `font-size: 11px;`

**Line 1921 (task tags):**  
Change: `font-size: 10px;` → `font-size: 11px;`

**Line 2579 (project tags):**  
Change: `font-size: 10px;` → `font-size: 11px;`

---

### ✅ 5. Standardize All Tag Padding

**Find and change in THREE places:**

**Line 531 (bookmark tags):**  
Change: `padding: 2px 6px;` → `padding: 3px 6px;`

**Line 1922 (task tags):**  
Change: `padding: 2px 6px;` → `padding: 3px 6px;`

**Line 2580 (project tags):**  
Change: `padding: 2px 6px;` → `padding: 3px 6px;`

---

## BONUS: Fix Project & Task Tag Backgrounds

**Line 2575 (project tags):**  
DELETE: `background: transparent !important;`

**Line 1917 (task tags):**  
Change: `background: transparent;` → `background: var(--bg-secondary);`

---

## Result

✅ Icons stay in place  
✅ Cards stay fixed width  
✅ Tags truncate instead of overflowing  
✅ All tags have same background  
✅ All tags are same height  
✅ Slightly larger, more readable text  

## Test It

Add 10 tags to a bookmark and verify:
- Icon stays in place
- Card doesn't expand
- Tags are truncated
