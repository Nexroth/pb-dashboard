// ===== NOTES MODULE =====
// Phase 1: File tree, editor, wikilinks, backlinks
// Requires File System Access API (Chrome / Edge 86+)

// ===== STATE =====

const NotesState = {
  rootHandle:     null,   // FileSystemDirectoryHandle
  currentFile:    null,   // { handle, path, name, parentHandle }
  currentContent: '',
  isDirty:        false,
  tree:           [],     // Nested tree
  flatFiles:      [],     // All .md files — used for wikilinks + backlinks
  mode:           'edit', // 'edit' | 'preview'
  searchQuery:    '',
  initialized:    false,
  dragPath:       null,   // Path of item currently being dragged
};

// ===== INDEXEDDB =====

function openNotesDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pb-notes', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
    req.onsuccess    = e => resolve(e.target.result);
    req.onerror      = ()  => reject(req.error);
  });
}

async function saveRootHandleToDB(handle) {
  try {
    const db = await openNotesDB();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'rootFolder');
    return new Promise(resolve => { tx.oncomplete = resolve; });
  } catch (e) { console.error('Notes: failed to save handle', e); }
}

async function loadRootHandleFromDB() {
  try {
    const db = await openNotesDB();
    const tx = db.transaction('handles', 'readonly');
    return new Promise(resolve => {
      const req = tx.objectStore('handles').get('rootFolder');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    });
  } catch (e) { return null; }
}

// ===== INIT =====

async function initNotesPage() {
  // API support check
  if (!('showDirectoryPicker' in window)) {
    renderNotesUnsupported();
    return;
  }

  // Try to restore saved folder
  const saved = await loadRootHandleFromDB();
  if (saved) {
    let perm = await saved.queryPermission({ mode: 'readwrite' });
    if (perm === 'prompt') perm = await saved.requestPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      NotesState.rootHandle = saved;
      await buildAndRenderTree();
      return;
    }
  }

  renderNotesSetup();
}

function renderNotesUnsupported() {
  document.getElementById('notesTreeContent').innerHTML = '';
  document.getElementById('notesEmptyState').style.display = 'flex';
  document.getElementById('notesEmptyState').innerHTML = `
    <div class="notes-setup">
      <i data-lucide="alert-triangle" class="notes-setup-icon" style="color:#f59e0b;"></i>
      <h2>Browser Not Supported</h2>
      <p>The Notes module requires the <strong>File System Access API</strong>, available in Chrome and Edge (v86+).</p>
      <p style="margin-top:8px;color:var(--text-secondary);font-size:13px;">Firefox and Safari do not support this API. Please use Microsoft Edge or Google Chrome.</p>
    </div>
  `;
  document.getElementById('notesEditorArea').style.display = 'none';
  lucide.createIcons();
}

function renderNotesSetup() {
  document.getElementById('notesTreeContent').innerHTML = `
    <div style="padding:20px 16px;text-align:center;color:var(--text-secondary);font-size:13px;">
      No folder selected
    </div>
  `;
  document.getElementById('notesEmptyState').style.display = 'flex';
  document.getElementById('notesEmptyState').innerHTML = `
    <div class="notes-setup">
      <i data-lucide="notebook" class="notes-setup-icon"></i>
      <h2>Notes</h2>
      <p>Select a folder on your computer to use as your notes vault. Notes are stored as <strong>.md</strong> files directly on disk — no data loss if you clear your browser cache.</p>
      <p style="margin-top:8px;color:var(--text-secondary);font-size:13px;">Works seamlessly with Obsidian, VS Code, and any text editor.</p>
      <button class="btn btn-primary" id="notesSelectFolderBtn" style="margin-top:24px;">
        <i data-lucide="folder-open"></i>
        Select Notes Folder
      </button>
    </div>
  `;
  document.getElementById('notesEditorArea').style.display = 'none';
  document.getElementById('notesNewNoteBtn').disabled   = true;
  document.getElementById('notesNewFolderBtn').disabled = true;
  document.getElementById('notesRefreshBtn').disabled   = true;
  lucide.createIcons();
  document.getElementById('notesSelectFolderBtn')?.addEventListener('click', selectNotesFolder);
}

async function selectNotesFolder() {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    NotesState.rootHandle = handle;
    await saveRootHandleToDB(handle);
    await buildAndRenderTree();
    showToast('Notes folder selected');
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Could not access folder');
  }
}

// ===== FILE TREE =====

async function buildAndRenderTree() {
  if (!NotesState.rootHandle) return;

  document.getElementById('notesNewNoteBtn').disabled   = false;
  document.getElementById('notesNewFolderBtn').disabled = false;
  document.getElementById('notesRefreshBtn').disabled   = false;

  const tree = await buildTree(NotesState.rootHandle, '', null);
  NotesState.tree = tree;

  NotesState.flatFiles = [];
  collectFiles(tree, NotesState.flatFiles);

  renderTree();

  if (!NotesState.currentFile) showNotesEmptyEditor();
}

async function buildTree(dirHandle, path, parentHandle) {
  const children = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.')) continue;
    const itemPath = path ? `${path}/${name}` : name;
    if (handle.kind === 'directory') {
      const sub = await buildTree(handle, itemPath, dirHandle);
      children.push({
        name, type: 'folder', handle,
        parentHandle: dirHandle, path: itemPath,
        children: sub,
        isOpen: localStorage.getItem(`notes-folder-${itemPath}`) !== 'false',
      });
    } else if (handle.kind === 'file' && name.endsWith('.md')) {
      children.push({ name, type: 'file', handle, parentHandle: dirHandle, path: itemPath });
    }
  }
  // Folders first, then files — alphabetical within each group
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return children;
}

function collectFiles(tree, list) {
  for (const item of tree) {
    if (item.type === 'file') list.push(item);
    else if (item.children) collectFiles(item.children, list);
  }
}

function renderTree() {
  const container = document.getElementById('notesTreeContent');
  const q = NotesState.searchQuery.toLowerCase().trim();

  if (q) {
    const results = NotesState.flatFiles.filter(f => f.name.toLowerCase().includes(q));
    container.innerHTML = results.length
      ? results.map(f => renderTreeFile(f, 0, true)).join('')
      : `<div style="padding:16px;text-align:center;color:var(--text-secondary);font-size:13px;">No results</div>`;
  } else {
    const items = NotesState.tree.length
      ? NotesState.tree.map(item => renderTreeItem(item, 0)).join('')
      : `<div style="padding:16px;text-align:center;color:var(--text-secondary);font-size:13px;">Empty folder</div>`;
    // Root drop zone at top — lets you move items back to root level
    container.innerHTML = `
      <div class="notes-root-dropzone" id="notesRootDropzone" title="Drop here to move to root">
        <i data-lucide="home"></i>
        <span>${NotesState.rootHandle?.name || 'Root'}</span>
      </div>
      ${items}`;
  }

  bindTreeEvents();
  lucide.createIcons();
}

function renderTreeItem(item, depth) {
  return item.type === 'folder' ? renderTreeFolder(item, depth) : renderTreeFile(item, depth);
}

function renderTreeFolder(item, depth) {
  const active = NotesState.currentFile?.path.startsWith(item.path + '/');
  return `
    <div class="notes-tree-folder${active ? ' notes-tree-folder-active' : ''}"
         data-path="${notesEscAttr(item.path)}" data-type="folder">
      <div class="notes-tree-row notes-tree-folder-header"
           style="padding-left:${14 + depth * 16}px"
           data-path="${notesEscAttr(item.path)}"
           data-type="folder-header"
           data-toggle
           draggable="true">
        <i data-lucide="${item.isOpen ? 'chevron-down' : 'chevron-right'}" class="notes-chevron"></i>
        <i data-lucide="${item.isOpen ? 'folder-open' : 'folder'}" class="notes-tree-icon notes-folder-icon"></i>
        <span class="notes-tree-name notes-folder-name">${notesEscHtml(item.name)}</span>
      </div>
      ${item.isOpen ? `
        <div class="notes-tree-children">
          ${item.children.length
            ? item.children.map(c => renderTreeItem(c, depth + 1)).join('')
            : `<div class="notes-tree-empty-folder" style="padding-left:${32 + depth * 16}px">Empty</div>`}
        </div>` : ''}
    </div>`;
}

function renderTreeFile(item, depth, flat = false) {
  const active  = NotesState.currentFile?.path === item.path;
  const display = item.name.replace(/\.md$/, '');
  return `
    <div class="notes-tree-file${active ? ' notes-tree-file-active' : ''}"
         style="padding-left:${flat ? 14 : 14 + depth * 16}px"
         data-path="${notesEscAttr(item.path)}" data-type="file" draggable="true">
      <i data-lucide="file-text" class="notes-tree-icon notes-file-icon"></i>
      <span class="notes-tree-name notes-file-name">${notesEscHtml(display)}</span>
    </div>`;
}

function bindTreeEvents() {
  const container = document.getElementById('notesTreeContent');

  // Open file
  container.querySelectorAll('[data-type="file"]').forEach(el => {
    el.addEventListener('click', async () => {
      const item = findInTree(NotesState.tree, el.dataset.path);
      if (item) await openNote(item);
    });
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      const item = findInTree(NotesState.tree, el.dataset.path);
      if (item) showNotesContextMenu(e, item);
    });
  });

  // Toggle folder on click of header row
  container.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', e => {
      const item = findInTree(NotesState.tree, el.dataset.path);
      if (!item) return;
      item.isOpen = !item.isOpen;
      localStorage.setItem(`notes-folder-${item.path}`, item.isOpen);
      renderTree();
    });
  });

  // Folder right-click — target header rows, not outer wrapper
  container.querySelectorAll('[data-type="folder-header"]').forEach(el => {
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      const item = findInTree(NotesState.tree, el.dataset.path);
      if (item) showNotesContextMenu(e, item);
    });
  });

  initTreeDragDrop();
}

function findInTree(tree, path) {
  for (const item of tree) {
    if (item.path === path) return item;
    if (item.type === 'folder' && item.children) {
      const found = findInTree(item.children, path);
      if (found) return found;
    }
  }
  return null;
}

// ===== DRAG AND DROP =====

function initTreeDragDrop() {
  const container = document.getElementById('notesTreeContent');

  // Draggable elements: folder header rows + file rows only (NOT outer folder wrappers)
  container.querySelectorAll('[data-type="folder-header"], [data-type="file"]').forEach(el => {
    el.addEventListener('dragstart', e => {
      e.stopPropagation();
      NotesState.dragPath = el.dataset.path;
      el.classList.add('notes-tree-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.dataset.path);
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('notes-tree-dragging');
      container.querySelectorAll('.notes-drop-over').forEach(t => t.classList.remove('notes-drop-over'));
      NotesState.dragPath = null;
    });
  });

  // Drop targets: folder header rows
  container.querySelectorAll('[data-type="folder-header"]').forEach(el => {
    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.stopPropagation();
      // Don't allow dropping onto yourself
      if (el.dataset.path === NotesState.dragPath) return;
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('notes-drop-over');
    });
    el.addEventListener('dragleave', e => {
      if (!el.contains(e.relatedTarget)) el.classList.remove('notes-drop-over');
    });
    el.addEventListener('drop', async e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('notes-drop-over');
      const src = e.dataTransfer.getData('text/plain');
      const dst = el.dataset.path;
      if (src && dst && src !== dst) await moveTreeItem(src, dst);
    });
  });

  // Root drop zone — moves item to vault root
  const rootZone = document.getElementById('notesRootDropzone');
  if (rootZone) {
    rootZone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      rootZone.classList.add('notes-drop-over');
    });
    rootZone.addEventListener('dragleave', () => rootZone.classList.remove('notes-drop-over'));
    rootZone.addEventListener('drop', async e => {
      e.preventDefault();
      rootZone.classList.remove('notes-drop-over');
      const src = e.dataTransfer.getData('text/plain');
      if (!src) return;
      const item = findInTree(NotesState.tree, src);
      // Already at root — skip
      if (!item || !src.includes('/')) { showToast('Already at root level'); return; }
      await moveToRoot(item);
    });
  }
}

async function moveTreeItem(sourcePath, destFolderPath) {
  if (destFolderPath.startsWith(sourcePath + '/') || destFolderPath === sourcePath) {
    showToast('Cannot move a folder into itself');
    return;
  }
  const source     = findInTree(NotesState.tree, sourcePath);
  const destFolder = findInTree(NotesState.tree, destFolderPath);
  if (!source || !destFolder || destFolder.type !== 'folder') return;

  try {
    // Try native move() first (Chrome 121+)
    if (typeof source.handle.move === 'function') {
      await source.handle.move(destFolder.handle);
    } else {
      // Fallback: copy then delete
      await copyHandleToDir(source, destFolder.handle);
      await source.parentHandle.removeEntry(source.name, { recursive: true });
    }
    if (NotesState.currentFile?.path === sourcePath ||
        NotesState.currentFile?.path.startsWith(sourcePath + '/')) {
      NotesState.currentFile = null;
      document.getElementById('notesEditorArea').style.display = 'none';
      showNotesEmptyEditor();
    }
    await buildAndRenderTree();
    showToast(`Moved "${source.name}"`);
  } catch (e) {
    showToast('Move failed: ' + e.message);
  }
}

async function copyHandleToDir(item, destDirHandle) {
  if (item.type === 'file') {
    const file       = await item.handle.getFile();
    const text       = await file.text();
    const newHandle  = await destDirHandle.getFileHandle(item.name, { create: true });
    const writable   = await newHandle.createWritable();
    await writable.write(text);
    await writable.close();
  } else {
    const newDir = await destDirHandle.getDirectoryHandle(item.name, { create: true });
    for (const child of item.children) {
      await copyHandleToDir(child, newDir);
    }
  }
}

async function moveToRoot(item) {
  if (!NotesState.rootHandle) return;
  try {
    if (typeof item.handle.move === 'function') {
      await item.handle.move(NotesState.rootHandle);
    } else {
      await copyHandleToDir(item, NotesState.rootHandle);
      await item.parentHandle.removeEntry(item.name, { recursive: true });
    }
    if (NotesState.currentFile?.path === item.path ||
        NotesState.currentFile?.path.startsWith(item.path + '/')) {
      NotesState.currentFile = null;
      document.getElementById('notesEditorArea').style.display = 'none';
      showNotesEmptyEditor();
    }
    await buildAndRenderTree();
    showToast(`Moved "${item.name}" to root`);
  } catch (e) {
    showToast('Move failed: ' + e.message);
  }
}

// ===== EDITOR =====

async function openNote(item) {
  if (NotesState.isDirty) {
    const save = confirm('You have unsaved changes. Save before switching?');
    if (save) await saveNote();
  }
  try {
    const file    = await item.handle.getFile();
    const content = await file.text();

    NotesState.currentFile    = item;
    NotesState.currentContent = content;
    NotesState.isDirty        = false;

    document.getElementById('notesEmptyState').style.display  = 'none';
    document.getElementById('notesEditorArea').style.display  = 'flex';
    document.getElementById('notesEditorFilename').textContent = item.name.replace(/\.md$/, '');
    document.getElementById('notesEditorTextarea').value       = content;
    document.getElementById('notesSaveIndicator').textContent  = '';

    if (NotesState.mode === 'preview') updateLivePreview();
    if (NotesState.mode === 'split')   updateLivePreview();

    await renderBacklinks();
    renderTree();
    updateBreadcrumb(item);

    if (NotesState.mode === 'edit') document.getElementById('notesEditorTextarea').focus();
  } catch (e) {
    showToast('Failed to open note: ' + e.message);
  }
}

function updateBreadcrumb(item) {
  const bar   = document.getElementById('notesBreadcrumb');
  const items = document.getElementById('notesBreadcrumbItems');
  if (!bar || !items) return;

  if (!item) { bar.style.display = 'none'; return; }

  // Path is like "FolderA/SubFolder/Note.md" — split and build segments
  const rootName = NotesState.rootHandle?.name || 'Vault';
  const parts    = item.path.split('/').filter(Boolean);
  // Last part is the filename — display without .md
  parts[parts.length - 1] = parts[parts.length - 1].replace(/\.md$/, '');

  items.innerHTML = parts.map((part, i) => {
    const isLast = i === parts.length - 1;
    return isLast
      ? `<span class="notes-breadcrumb-current">${notesEscHtml(part)}</span>`
      : `<span class="notes-breadcrumb-seg">${notesEscHtml(part)}</span><span class="notes-breadcrumb-sep">/</span>`;
  }).join('');

  // Prepend root name
  items.insertAdjacentHTML('afterbegin',
    `<span class="notes-breadcrumb-seg">${notesEscHtml(rootName)}</span><span class="notes-breadcrumb-sep">/</span>`
  );

  bar.style.display = 'flex';
}

async function saveNote() {
  if (!NotesState.currentFile) return;
  try {
    const content  = document.getElementById('notesEditorTextarea').value;
    const writable = await NotesState.currentFile.handle.createWritable();
    await writable.write(content);
    await writable.close();

    NotesState.isDirty        = false;
    NotesState.currentContent = content;

    const ind = document.getElementById('notesSaveIndicator');
    if (ind) {
      ind.textContent = 'Saved';
      setTimeout(() => { if (ind) ind.textContent = ''; }, 2000);
    }
    // Rebuild tree to refresh wikilink resolution
    await buildAndRenderTree();
  } catch (e) {
    showToast('Failed to save: ' + e.message);
  }
}

// ===== MARKDOWN RENDERER =====

// Configure marked once
(function initMarked() {
  if (typeof marked === 'undefined') return;
  marked.setOptions({
    breaks: true,      // Single line breaks become <br>
    gfm:    true,      // GitHub flavoured markdown
  });
})();

function renderMarkdown(raw) {
  if (!raw) return '';

  // Step 1: Pull out wikilinks BEFORE marked parses them
  // Replace [[target|alias]] with a placeholder span — marked won't touch span tags
  const src = raw.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    const display = (alias || target).trim();
    const name    = target.trim();
    const exists  = NotesState.flatFiles.some(
      f => f.name.replace(/\.md$/, '').toLowerCase() === name.toLowerCase()
    );
    // Use data attributes — safe inside HTML that marked will emit
    return `<span class="wikilink${exists ? '' : ' wikilink-missing'}" data-target="${notesEscAttr(name)}">${notesEscHtml(display)}</span>`;
  });

  // Step 2: Parse with marked
  if (typeof marked !== 'undefined') {
    return marked.parse(src);
  }

  // Fallback if marked failed to load (shouldn't happen but safe)
  return src.replace(/\n/g, '<br>');
}

function updateLivePreview() {
  const content = document.getElementById('notesEditorTextarea')?.value || '';
  const preview = document.getElementById('notesPreviewContent');
  if (!preview) return;
  preview.innerHTML = renderMarkdown(content);
  // Wire wikilink clicks after render
  preview.querySelectorAll('.wikilink').forEach(el => {
    el.addEventListener('click', () => navigateToWikilink(el.dataset.target));
  });
  // Make external links open in new tab (marked handles href but not target)
  preview.querySelectorAll('a[href]').forEach(a => {
    if (!a.dataset.target) { a.target = '_blank'; a.rel = 'noopener'; }
  });
}

async function navigateToWikilink(noteName) {
  const existing = NotesState.flatFiles.find(
    f => f.name.replace(/\.md$/, '').toLowerCase() === noteName.toLowerCase()
  );
  if (existing) {
    await openNote(existing);
  } else {
    if (confirm(`"${noteName}" doesn't exist. Create it?`)) {
      await createNoteWithName(NotesState.rootHandle, noteName + '.md', `# ${noteName}\n\n`);
    }
  }
}

// ===== BACKLINKS =====

async function renderBacklinks() {
  const list = document.getElementById('notesBacklinksList');
  const count = document.getElementById('notesBacklinksCount');
  if (!list || !NotesState.currentFile) return;

  const currentName = NotesState.currentFile.name.replace(/\.md$/, '');
  const found       = [];

  for (const file of NotesState.flatFiles) {
    if (file.path === NotesState.currentFile.path) continue;
    try {
      const f    = await file.handle.getFile();
      const text = await f.text();
      const re   = new RegExp(`\\[\\[${notesEscRegex(currentName)}(\\|[^\\]]*)?\\]\\]`, 'i');
      if (re.test(text)) found.push(file);
    } catch { /* skip unreadable */ }
  }

  if (count) count.textContent = found.length;

  if (!found.length) {
    list.innerHTML = `<div style="color:var(--text-secondary);font-size:13px;font-style:italic;padding:8px 0;">No backlinks</div>`;
    return;
  }

  list.innerHTML = found.map(f => `
    <div class="notes-backlink-item" data-path="${notesEscAttr(f.path)}">
      <i data-lucide="file-text"></i>
      <span>${notesEscHtml(f.name.replace(/\.md$/, ''))}</span>
    </div>
  `).join('');

  list.querySelectorAll('.notes-backlink-item').forEach(el => {
    el.addEventListener('click', async () => {
      const item = findInTree(NotesState.tree, el.dataset.path);
      if (item) await openNote(item);
    });
  });

  lucide.createIcons();
}

// ===== FILE OPERATIONS =====

async function createNoteInRoot() {
  await promptCreateNote(NotesState.rootHandle);
}

async function createFolderInRoot() {
  await promptCreateFolder(NotesState.rootHandle);
}

async function promptCreateNote(parentHandle) {
  const name = prompt('Note name:');
  if (!name?.trim()) return;
  const filename = name.trim().endsWith('.md') ? name.trim() : name.trim() + '.md';
  await createNoteWithName(parentHandle, filename, `# ${filename.replace(/\.md$/, '')}\n\n`);
}

async function createNoteWithName(parentHandle, filename, content) {
  try {
    const fileHandle = await parentHandle.getFileHandle(filename, { create: true });
    const writable   = await fileHandle.createWritable();
    await writable.write(content || '');
    await writable.close();
    await buildAndRenderTree();
    // Find and open the new note
    const newItem = NotesState.flatFiles.find(f => f.name === filename);
    if (newItem) await openNote(newItem);
    showToast(`Created "${filename}"`);
  } catch (e) {
    showToast('Failed to create note: ' + e.message);
  }
}

async function promptCreateFolder(parentHandle) {
  const name = prompt('Folder name:');
  if (!name?.trim()) return;
  try {
    await parentHandle.getDirectoryHandle(name.trim(), { create: true });
    await buildAndRenderTree();
    showToast(`Created folder "${name.trim()}"`);
  } catch (e) {
    showToast('Failed to create folder: ' + e.message);
  }
}

async function renameItem(item) {
  const base    = item.name.replace(/\.md$/, '');
  const newName = prompt('New name:', base);
  if (!newName?.trim() || newName.trim() === base) return;

  const final = item.type === 'file'
    ? (newName.trim().endsWith('.md') ? newName.trim() : newName.trim() + '.md')
    : newName.trim();

  try {
    await item.handle.move(item.parentHandle, final);
    if (NotesState.currentFile?.path === item.path) {
      NotesState.currentFile = null;
      document.getElementById('notesEditorArea').style.display = 'none';
      showNotesEmptyEditor();
    }
    await buildAndRenderTree();
    showToast(`Renamed to "${final}"`);
  } catch (e) {
    showToast('Rename failed: ' + e.message);
  }
}

async function deleteItem(item) {
  const msg = item.type === 'folder'
    ? `Delete folder "${item.name}" and all its contents?`
    : `Delete "${item.name}"?`;
  if (!confirm(msg)) return;

  try {
    await item.parentHandle.removeEntry(item.name, { recursive: true });
    if (NotesState.currentFile?.path === item.path ||
        NotesState.currentFile?.path.startsWith(item.path + '/')) {
      NotesState.currentFile = null;
      document.getElementById('notesEditorArea').style.display = 'none';
      showNotesEmptyEditor();
    }
    await buildAndRenderTree();
    showToast(`Deleted "${item.name}"`);
  } catch (e) {
    showToast('Delete failed: ' + e.message);
  }
}

// ===== CONTEXT MENU =====

function showNotesContextMenu(e, item) {
  document.querySelectorAll('.notes-ctx').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'context-menu notes-ctx';
  menu.innerHTML = `
    ${item.type === 'folder' ? `
      <div class="context-menu-item" data-action="new-note">
        <i data-lucide="file-plus"></i>New Note Here
      </div>
      <div class="context-menu-item" data-action="new-folder">
        <i data-lucide="folder-plus"></i>New Folder Here
      </div>
      <div class="context-menu-divider"></div>
    ` : ''}
    <div class="context-menu-item" data-action="rename">
      <i data-lucide="pencil"></i>Rename
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item context-menu-item-danger" data-action="delete">
      <i data-lucide="trash-2"></i>Delete
    </div>
  `;

  document.body.appendChild(menu);
  lucide.createIcons();

  // Position
  let x = e.clientX, y = e.clientY;
  const mh = menu.offsetHeight || 120;
  if (x + 200 > window.innerWidth) x = window.innerWidth - 210;
  if (y + mh > window.innerHeight) y = window.innerHeight - mh - 10;
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';

  menu.querySelectorAll('.context-menu-item').forEach(el => {
    el.addEventListener('click', async () => {
      menu.remove();
      switch (el.dataset.action) {
        case 'new-note':   await promptCreateNote(item.handle);   break;
        case 'new-folder': await promptCreateFolder(item.handle); break;
        case 'rename':     await renameItem(item);                break;
        case 'delete':     await deleteItem(item);                break;
      }
    });
  });

  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 50);
}

// ===== MODE TOGGLE =====

function setNotesMode(mode) {
  NotesState.mode = mode;
  const textarea   = document.getElementById('notesEditorTextarea');
  const editPane   = document.getElementById('notesEditPane');
  const preview    = document.getElementById('notesPreviewContent');
  const divider    = document.getElementById('notesSplitDivider');
  const toolbar    = document.getElementById('notesToolbar');
  const editBtn    = document.getElementById('notesModeEdit');
  const splitBtn   = document.getElementById('notesModeSplit');
  const prevBtn    = document.getElementById('notesModePreview');
  const body       = document.getElementById('notesBody');

  [editBtn, splitBtn, prevBtn].forEach(b => b?.classList.remove('active'));

  if (mode === 'edit') {
    editPane.style.display  = 'flex';
    divider.style.display   = 'none';
    preview.style.display   = 'none';
    toolbar.style.display   = 'flex';
    body.classList.remove('notes-body-split');
    editBtn?.classList.add('active');
    textarea.focus();

  } else if (mode === 'split') {
    editPane.style.display  = 'flex';
    divider.style.display   = 'block';
    preview.style.display   = 'block';
    toolbar.style.display   = 'flex';
    body.classList.add('notes-body-split');
    splitBtn?.classList.add('active');
    updateLivePreview();
    textarea.focus();

  } else { // preview
    editPane.style.display  = 'none';
    divider.style.display   = 'none';
    preview.style.display   = 'block';
    toolbar.style.display   = 'none';
    body.classList.remove('notes-body-split');
    prevBtn?.classList.add('active');
    updateLivePreview();
  }
}

// ===== TOOLBAR HELPERS =====

function notesInsertWrap(before, after, placeholder) {
  const ta    = document.getElementById('notesEditorTextarea');
  if (!ta) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const sel   = ta.value.substring(start, end) || placeholder;
  ta.value    = ta.value.substring(0, start) + before + sel + after + ta.value.substring(end);
  ta.selectionStart = start + before.length;
  ta.selectionEnd   = start + before.length + sel.length;
  ta.focus();
  NotesState.isDirty = true;
  document.getElementById('notesSaveIndicator').textContent = 'Unsaved';
}

function notesInsertLine(prefix) {
  const ta = document.getElementById('notesEditorTextarea');
  if (!ta) return;
  const start     = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  ta.value        = ta.value.substring(0, lineStart) + prefix + ta.value.substring(lineStart);
  ta.selectionStart = ta.selectionEnd = lineStart + prefix.length;
  ta.focus();
  NotesState.isDirty = true;
  document.getElementById('notesSaveIndicator').textContent = 'Unsaved';
}

// ===== EMPTY EDITOR STATE =====

function showNotesEmptyEditor() {
  document.getElementById('notesEmptyState').style.display = 'flex';
  document.getElementById('notesEmptyState').innerHTML = `
    <div class="notes-setup">
      <i data-lucide="file-text" class="notes-setup-icon" style="opacity:0.3;"></i>
      <p style="color:var(--text-secondary);">Select a note to start editing</p>
      <p style="color:var(--text-secondary);font-size:13px;margin-top:6px;">Or create a new one with <strong><i data-lucide="file-plus" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i></strong></p>
    </div>
  `;
  document.getElementById('notesEditorArea').style.display = 'none';
  updateBreadcrumb(null);
  lucide.createIcons();
}

// ===== RESIZE HANDLE =====

function initNotesResize() {
  // Generic panel resizer
  function makeResizer(handleId, panelId, storageKey, direction) {
    const handle = document.getElementById(handleId);
    const panel  = document.getElementById(panelId);
    if (!handle || !panel) return;

    let resizing = false, startX = 0, startW = 0;

    handle.addEventListener('mousedown', e => {
      resizing = true;
      startX   = e.clientX;
      startW   = panel.offsetWidth;
      document.body.style.cursor     = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!resizing) return;
      const delta = direction === 'left'
        ? e.clientX - startX
        : startX - e.clientX;
      const w = Math.max(180, Math.min(480, startW + delta));
      panel.style.width = w + 'px';
      localStorage.setItem(storageKey, w);
    });
    document.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing                       = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    });

    // Restore saved width
    const saved = localStorage.getItem(storageKey);
    if (saved) panel.style.width = saved + 'px';
  }

  makeResizer('notesResizeLeft',  'notesTreePanel',  'notes-left-width',  'left');
  makeResizer('notesResizeRight', 'notesRightPanel', 'notes-right-width', 'right');

  // Right panel collapse toggle — wired to both the panel's own button and the editor header button
  const collapseBtn  = document.getElementById('notesRightCollapseBtn');
  const toggleBtn    = document.getElementById('notesRightToggleBtn');
  const rightPanel   = document.getElementById('notesRightPanel');
  const rightResize  = document.getElementById('notesResizeRight');

  function toggleRightPanel() {
    const collapsed = rightPanel.classList.toggle('notes-panel-collapsed');
    if (rightResize) rightResize.style.display = collapsed ? 'none' : '';
    // Update both button icons
    [collapseBtn, toggleBtn].forEach(btn => {
      if (!btn) return;
      const icon = btn.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', collapsed ? 'panel-right-open' : 'panel-right-close');
        lucide.createIcons();
      }
    });
  }

  collapseBtn?.addEventListener('click', toggleRightPanel);
  toggleBtn?.addEventListener('click', toggleRightPanel);
}

// ===== UTILITY =====

function notesEscHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function notesEscAttr(str) { return notesEscHtml(str); }
function notesEscRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ===== EVENT WIRING =====

function initNotesEvents() {
  document.getElementById('notesNewNoteBtn')?.addEventListener('click', createNoteInRoot);
  document.getElementById('notesNewFolderBtn')?.addEventListener('click', createFolderInRoot);
  document.getElementById('notesChangeFolderBtn')?.addEventListener('click', selectNotesFolder);
  document.getElementById('notesRefreshBtn')?.addEventListener('click', async () => {
    const btn  = document.getElementById('notesRefreshBtn');
    const icon = btn?.querySelector('i');
    if (icon) icon.classList.add('notes-spin');
    await buildAndRenderTree();
    showToast('Tree refreshed');
    setTimeout(() => icon?.classList.remove('notes-spin'), 600);
  });

  document.getElementById('notesSearchInput')?.addEventListener('input', e => {
    NotesState.searchQuery = e.target.value;
    renderTree();
  });

  const ta = document.getElementById('notesEditorTextarea');
  if (ta) {
    let previewDebounce = null;
    ta.addEventListener('input', () => {
      NotesState.isDirty = true;
      const ind = document.getElementById('notesSaveIndicator');
      if (ind) ind.textContent = 'Unsaved';
      clearTimeout(previewDebounce);
      previewDebounce = setTimeout(() => {
        if (NotesState.mode === 'preview' || NotesState.mode === 'split') updateLivePreview();
      }, 300);
    });
    ta.addEventListener('blur', () => {
      if (NotesState.isDirty && NotesState.currentFile) saveNote();
    });
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveNote(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = s + 2;
      }
    });
  }

  // Auto-save every 30 seconds if dirty
  setInterval(() => {
    if (NotesState.isDirty && NotesState.currentFile) saveNote();
  }, 30000);

  document.getElementById('notesModeEdit')?.addEventListener('click', () => setNotesMode('edit'));
  document.getElementById('notesModeSplit')?.addEventListener('click', () => setNotesMode('split'));
  document.getElementById('notesModePreview')?.addEventListener('click', () => setNotesMode('preview'));
  document.getElementById('notesSaveBtn')?.addEventListener('click', saveNote);

  // Toolbar
  document.getElementById('notesToolbarBold')?.addEventListener('click', () => notesInsertWrap('**', '**', 'bold text'));
  document.getElementById('notesToolbarItalic')?.addEventListener('click', () => notesInsertWrap('*', '*', 'italic text'));
  document.getElementById('notesToolbarH1')?.addEventListener('click', () => notesInsertLine('# '));
  document.getElementById('notesToolbarH2')?.addEventListener('click', () => notesInsertLine('## '));
  document.getElementById('notesToolbarH3')?.addEventListener('click', () => notesInsertLine('### '));
  document.getElementById('notesToolbarUL')?.addEventListener('click', () => notesInsertLine('- '));
  document.getElementById('notesToolbarOL')?.addEventListener('click', () => notesInsertLine('1. '));
  document.getElementById('notesToolbarQuote')?.addEventListener('click', () => notesInsertLine('> '));
  document.getElementById('notesToolbarCode')?.addEventListener('click', () => notesInsertWrap('`', '`', 'code'));
  document.getElementById('notesToolbarCodeBlock')?.addEventListener('click', () => notesInsertWrap('\n```\n', '\n```\n', 'code here'));
  document.getElementById('notesToolbarLink')?.addEventListener('click', () => notesInsertWrap('[', '](url)', 'link text'));
  document.getElementById('notesToolbarWikilink')?.addEventListener('click', () => notesInsertWrap('[[', ']]', 'note name'));
  document.getElementById('notesToolbarHR')?.addEventListener('click', () => notesInsertLine('\n---\n'));
}

// ===== BOOTSTRAP =====

// Wire events once the DOM is ready (script is at bottom of body so DOM is available)
initNotesEvents();
initNotesResize();
