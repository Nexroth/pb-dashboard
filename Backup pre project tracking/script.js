// Default news feeds
const DEFAULT_FEEDS = [
  'https://news.ycombinator.com/rss',
  'https://krebsonsecurity.com/feed/',
  'https://feeds.feedburner.com/darknethackers',
  'https://threatpost.com/feed/',
  'https://www.infosecurity-magazine.com/rss/news/',
  'https://cisoseries.libsyn.com/rss'
];

const DEFAULT_SUBS = ['cybersecurity', 'netsec', 'technology', 'programming'];

// Dashboard State
let dashboardData = { sections: [], theme: 'dark', newsFeeds: [], redditSubs: [] };
let currentEditingBookmarkId = null;
let currentEditingSectionId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applyTheme();
  initializeEventListeners();
  renderBookmarks();
  lucide.createIcons();
});

function loadData() {
  const saved = localStorage.getItem('dashboardData');
  if (saved) {
    dashboardData = JSON.parse(saved);
    // Ensure customTheme exists
    if (!dashboardData.customTheme) {
      dashboardData.customTheme = {
        bgPrimary: '#1a1a2e',
        bgSecondary: '#16213e',
        bgTertiary: '#0f1419',
        textPrimary: '#eaeaea',
        accent: '#0ea5e9'
      };
    }
  } else {
    dashboardData.sections = [
      {
        id: 'work',
        name: 'Work',
        bookmarks: [
          { id: 'bm1', name: 'Gmail', url: 'https://gmail.com', notes: '', icon: '' },
          { id: 'bm2', name: 'GitHub', url: 'https://github.com', notes: '', icon: '' }
        ]
      },
      {
        id: 'personal',
        name: 'Personal',
        bookmarks: [
          { id: 'bm3', name: 'YouTube', url: 'https://youtube.com', notes: '', icon: '' }
        ]
      }
    ];
    dashboardData.theme = 'dark';
    dashboardData.newsFeeds = [...DEFAULT_FEEDS];
    dashboardData.redditSubs = [...DEFAULT_SUBS];
    saveData();
  }

  // Ensure newsFeeds and redditSubs exist
  if (!dashboardData.newsFeeds) {
    dashboardData.newsFeeds = [...DEFAULT_FEEDS];
  }
  
  // Migrate old string feeds to new object format
  if (dashboardData.newsFeeds.length > 0 && typeof dashboardData.newsFeeds[0] === 'string') {
    dashboardData.newsFeeds = dashboardData.newsFeeds.map(url => ({
      url: url,
      name: extractFeedName(url)
    }));
    saveData();
  }
  if (!dashboardData.redditSubs) {
    dashboardData.redditSubs = [...DEFAULT_SUBS];
  }
}

function saveData() {
  localStorage.setItem('dashboardData', JSON.stringify(dashboardData));
}

function applyTheme() {
  const theme = dashboardData.theme || 'dark';
  document.body.setAttribute('data-theme', theme);
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.value = theme;
  }
  
  // Apply custom theme if selected
  if (theme === 'custom' && dashboardData.customTheme) {
    applyCustomThemeColors();
  }
  
  // Show/hide custom theme colors
  const customColors = document.getElementById('customThemeColors');
  if (customColors) {
    customColors.style.display = theme === 'custom' ? 'block' : 'none';
    
    // Load custom colors into inputs
    if (theme === 'custom') {
      document.getElementById('customBgPrimary').value = dashboardData.customTheme.bgPrimary;
      document.getElementById('customBgSecondary').value = dashboardData.customTheme.bgSecondary;
      document.getElementById('customBgTertiary').value = dashboardData.customTheme.bgTertiary;
      document.getElementById('customTextPrimary').value = dashboardData.customTheme.textPrimary;
      document.getElementById('customAccent').value = dashboardData.customTheme.accent;
    }
  }
}

function applyCustomThemeColors() {
  const colors = dashboardData.customTheme;
  const root = document.documentElement;
  
  root.style.setProperty('--bg-primary', colors.bgPrimary);
  root.style.setProperty('--bg-secondary', colors.bgSecondary);
  root.style.setProperty('--bg-tertiary', colors.bgTertiary);
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--accent', colors.accent);
  
  // Generate complementary colors
  root.style.setProperty('--text-secondary', adjustBrightness(colors.textPrimary, -30));
  root.style.setProperty('--accent-hover', adjustBrightness(colors.accent, -20));
  root.style.setProperty('--border', adjustBrightness(colors.bgSecondary, 20));
  root.style.setProperty('--shadow', hexToRgba(colors.bgPrimary, 0.3));
}

function adjustBrightness(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function initializeEventListeners() {
  // Page navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = item.dataset.page;
      switchPage(pageName);
    });
  });

  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('collapsed');
  });

  // Theme selector
  document.getElementById('themeSelect').addEventListener('change', (e) => {
    dashboardData.theme = e.target.value;
    applyTheme();
    saveData();
  });
  
  // Apply custom theme button
  const applyCustomBtn = document.getElementById('applyCustomTheme');
  if (applyCustomBtn) {
    applyCustomBtn.addEventListener('click', () => {
      dashboardData.customTheme = {
        bgPrimary: document.getElementById('customBgPrimary').value,
        bgSecondary: document.getElementById('customBgSecondary').value,
        bgTertiary: document.getElementById('customBgTertiary').value,
        textPrimary: document.getElementById('customTextPrimary').value,
        accent: document.getElementById('customAccent').value
      };
      applyCustomThemeColors();
      saveData();
      showToast('Custom theme applied!');
    });
  }

  const resetCustomBtn = document.getElementById('resetCustomTheme');
  if (resetCustomBtn) {
    resetCustomBtn.addEventListener('click', () => {
      dashboardData.customTheme = {
        bgPrimary: '#1a1a2e',
        bgSecondary: '#16213e',
        bgTertiary: '#0f1419',
        textPrimary: '#eaeaea',
        accent: '#0ea5e9'
      };
      
      document.getElementById('customBgPrimary').value = '#1a1a2e';
      document.getElementById('customBgSecondary').value = '#16213e';
      document.getElementById('customBgTertiary').value = '#0f1419';
      document.getElementById('customTextPrimary').value = '#eaeaea';
      document.getElementById('customAccent').value = '#0ea5e9';
      
      applyCustomThemeColors();
      saveData();
      showToast('Theme reset to default colors!');
    });
  }

  // Search
  document.getElementById('searchBox').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.section').forEach(section => {
      const sectionId = section.dataset.sectionId;
      const sectionData = dashboardData.sections.find(s => s.id === sectionId);
      const bookmarks = section.querySelectorAll('.bookmark');
      let visibleCount = 0;

      bookmarks.forEach(bookmark => {
        const bookmarkId = bookmark.dataset.bookmarkId;
        const bookmarkData = sectionData.bookmarks.find(b => b.id === bookmarkId);
        
        const name = bookmark.querySelector('.bookmark-name').textContent.toLowerCase();
        const url = bookmark.querySelector('.bookmark-link').href.toLowerCase();
        const notes = bookmarkData.notes ? bookmarkData.notes.toLowerCase() : '';
        
        const visible = name.includes(query) || url.includes(query) || notes.includes(query);
        bookmark.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      section.style.display = visibleCount > 0 ? '' : 'none';
    });
  });

  const addSectionBtn = document.getElementById('addSectionBtn');
  if (addSectionBtn) {
    addSectionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Add Section button clicked!');
      currentEditingSectionId = null;
      document.getElementById('sectionName').value = '';
      openModal('addSectionModal');
    });
  } else {
    console.error('Add Section button not found!');
  }

    // Section modal
  document.getElementById('saveSectionBtn').addEventListener('click', saveSection);
  document.getElementById('cancelSectionBtn').addEventListener('click', () => {
    closeModal('addSectionModal');
  });

  // Bookmark modal
  document.getElementById('saveBookmarkBtn').addEventListener('click', saveBookmark);
  document.getElementById('cancelBookmarkBtn').addEventListener('click', () => {
    closeModal('bookmarkModal');
  });
  document.getElementById('bookmarkIcon').addEventListener('change', handleIconUpload);

  document.getElementById('removeIconBtn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const iconPreview = document.getElementById('iconPreview');
    const fileInput = document.getElementById('bookmarkIcon');
    iconPreview.style.backgroundImage = '';
    iconPreview.classList.remove('has-image');
    fileInput.value = '';
    fileInput.type = '';
    fileInput.type = 'file';
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.remove('active');
    });
  });

  // News manage buttons
  document.getElementById('rssManageBtn').addEventListener('click', () => {
    openModal('rssSettingsModal');
    renderNewsFeedsList();
  });

  document.getElementById('redditManageBtn').addEventListener('click', () => {
    openModal('redditSettingsModal');
    renderRedditSubsList();
  });

  document.getElementById('addFeedBtn').addEventListener('click', () => {
    const input = document.getElementById('newFeedInput');
    const url = input.value.trim();
    if (url) {
      dashboardData.newsFeeds.push({
        url: url,
        name: extractFeedName(url)
      });
      saveData();
      input.value = '';
      renderNewsFeedsList();
      initializeRSSFeedTabs(); // Refresh tabs
    }
  });

  document.getElementById('addRedditBtn').addEventListener('click', () => {
    const input = document.getElementById('newRedditInput');
    let sub = input.value.trim();
    if (sub.startsWith('r/')) sub = sub.slice(2);
    if (sub) {
      dashboardData.redditSubs.push(sub);
      saveData();
      input.value = '';
      initializeNewsTabs();
      renderRedditSubsList();
    }
  });

  document.addEventListener('keydown', handlePasteBookmark);
}

function switchPage(pageName) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  document.getElementById(pageName + 'Page').classList.add('active');
  document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

  if (pageName === 'news') {
    initializeRSSFeedTabs();
    initializeNewsTabs();
  }
}

function renderBookmarks() {
  const container = document.getElementById('sectionsContainer');
  container.innerHTML = '';

  dashboardData.sections.forEach(section => {
    const sectionEl = createSectionElement(section);
    container.appendChild(sectionEl);
  });

  Sortable.create(container, {
    animation: 150,
    handle: '.section-header',
    ghostClass: 'section-ghost',
    onEnd: (evt) => {
      const movedSection = dashboardData.sections[evt.oldIndex];
      dashboardData.sections.splice(evt.oldIndex, 1);
      dashboardData.sections.splice(evt.newIndex, 0, movedSection);
      saveData();
    }
  });

  setTimeout(() => lucide.createIcons(), 0);
}

function createSectionElement(section) {
  const div = document.createElement('div');
  div.className = 'section';
  div.dataset.sectionId = section.id;
  div.draggable = false;
  div.draggable = false;
  div.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">${section.name}</h2>
      <div class="section-actions">
        <button class="icon-btn" data-action="addBookmark" data-section-id="${section.id}">
          <i data-lucide="plus"></i>
        </button>
        <button class="icon-btn" data-action="editSection" data-section-id="${section.id}">
          <i data-lucide="edit-2"></i>
        </button>
        <button class="icon-btn" data-action="deleteSection" data-section-id="${section.id}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
    <div class="bookmarks-list" data-section-id="${section.id}">
      ${section.bookmarks.map(bookmark => `
        <div class="bookmark" draggable="true" data-bookmark-id="${bookmark.id}" data-section-id="${section.id}">
          <div class="bookmark-main">
            <div class="bookmark-content">
              <a href="${bookmark.url}" target="_blank" class="bookmark-link">
                <span class="bookmark-name">${bookmark.name}</span>
              </a>
            </div>
            ${bookmark.notes ? `<div class="bookmark-notes-indicator" title="Has notes"><i data-lucide="sticky-note"></i></div>` : ''}
          </div>
          ${bookmark.icon ? `<div class="bookmark-icon" style="background-image: url(${bookmark.icon})"></div>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  div.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAction(e);
    });
  });

  div.querySelectorAll('.bookmark').forEach(bookmarkEl => {
    bookmarkEl.addEventListener('click', (e) => {
      if (e.target.closest('.bookmark-actions button')) {
        return;
      }
      const url = bookmarkEl.querySelector('.bookmark-link').href;
      window.open(url, '_blank');
    });

    bookmarkEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const bookmarkId = bookmarkEl.dataset.bookmarkId;
      const sectionId = bookmarkEl.dataset.sectionId;
      showContextMenu(e, bookmarkId, sectionId);
    });

    bookmarkEl.addEventListener('dragstart', () => {
      bookmarkEl.classList.add('dragging');
    });

    bookmarkEl.addEventListener('dragend', () => {
      bookmarkEl.classList.remove('dragging');
    });
  });

  const bookmarksList = div.querySelector('.bookmarks-list');
  Sortable.create(bookmarksList, {
    group: 'bookmarks',
    animation: 150,
    ghostClass: 'sortable-ghost',
    emptyInsertThreshold: 200,
    direction: 'vertical',
    swapThreshold: 0.65,
    invertSwap: false,
    onEnd: (evt) => {
      const fromSection = evt.from.dataset.sectionId;
      const toSection = evt.to.dataset.sectionId;
      const bookmarkId = evt.item.dataset.bookmarkId;

      const fromIdx = dashboardData.sections.findIndex(s => s.id === fromSection);
      const toIdx = dashboardData.sections.findIndex(s => s.id === toSection);

      const bookmarkIdx = dashboardData.sections[fromIdx].bookmarks.findIndex(b => b.id === bookmarkId);
      const bookmark = dashboardData.sections[fromIdx].bookmarks[bookmarkIdx];

      dashboardData.sections[fromIdx].bookmarks.splice(bookmarkIdx, 1);
      dashboardData.sections[toIdx].bookmarks.push(bookmark);

      saveData();
      renderBookmarks(); // Re-render to update event listeners
    }
  });

  return div;
}

function handleAction(e) {
  const action = e.currentTarget.dataset.action;
  const bookmarkId = e.currentTarget.dataset.bookmarkId;
  const sectionId = e.currentTarget.dataset.sectionId;

  switch (action) {
    case 'addBookmark':
      currentEditingBookmarkId = null;
      currentEditingSectionId = sectionId;
      document.getElementById('bookmarkModalTitle').textContent = 'Add Bookmark';
      document.getElementById('bookmarkName').value = '';
      document.getElementById('bookmarkUrl').value = '';
      document.getElementById('bookmarkNotes').value = '';
      const iconPreview = document.getElementById('iconPreview');
      const fileInput = document.getElementById('bookmarkIcon');
      iconPreview.classList.remove('has-image');
      iconPreview.style.backgroundImage = '';
      fileInput.value = '';
      fileInput.type = '';
      fileInput.type = 'file';
      openModal('bookmarkModal');
      break;
    case 'editBookmark':
      editBookmark(bookmarkId, sectionId);
      break;
    case 'deleteBookmark':
      deleteBookmark(bookmarkId, sectionId);
      break;
    case 'editSection':
      editSection(sectionId);
      break;
    case 'deleteSection':
      deleteSection(sectionId);
      break;
    case 'viewNotes':
      showNotesModal(bookmarkId, sectionId);
      break;
  }
}

function editBookmark(bookmarkId, sectionId) {
  const section = dashboardData.sections.find(s => s.id === sectionId);
  const bookmark = section.bookmarks.find(b => b.id === bookmarkId);

  currentEditingBookmarkId = bookmarkId;
  currentEditingSectionId = sectionId;
  document.getElementById('bookmarkModalTitle').textContent = 'Edit Bookmark';
  document.getElementById('bookmarkName').value = bookmark.name;
  document.getElementById('bookmarkUrl').value = bookmark.url;
  document.getElementById('bookmarkNotes').value = bookmark.notes || '';

  const fileInput = document.getElementById('bookmarkIcon');
  fileInput.value = '';
  fileInput.type = '';
  fileInput.type = 'file';

  if (bookmark.icon) {
    document.getElementById('iconPreview').style.backgroundImage = `url(${bookmark.icon})`;
    document.getElementById('iconPreview').classList.add('has-image');
  } else {
    document.getElementById('iconPreview').classList.remove('has-image');
    document.getElementById('iconPreview').style.backgroundImage = '';
  }

  openModal('bookmarkModal');
}

function saveBookmark() {
  const name = document.getElementById('bookmarkName').value.trim();
  const url = document.getElementById('bookmarkUrl').value.trim();
  const notes = document.getElementById('bookmarkNotes').value.trim();

  if (!name || !url) {
    alert('Name and URL are required');
    return;
  }

  const section = dashboardData.sections.find(s => s.id === currentEditingSectionId);

  if (currentEditingBookmarkId) {
    const bookmark = section.bookmarks.find(b => b.id === currentEditingBookmarkId);
    bookmark.name = name;
    bookmark.url = url;
    bookmark.notes = notes;
    const iconPreview = document.getElementById('iconPreview');
    if (iconPreview.classList.contains('has-image')) {
      bookmark.icon = iconPreview.style.backgroundImage.replace('url("', '').replace('")', '');
    } else {
      bookmark.icon = '';
    }
  } else {
    const iconPreview = document.getElementById('iconPreview');
    const icon = iconPreview.classList.contains('has-image') 
      ? iconPreview.style.backgroundImage.replace('url("', '').replace('")', '')
      : '';
    
    section.bookmarks.push({
      id: 'bm' + Date.now(),
      name,
      url,
      notes,
      icon: icon
    });
  }

  saveData();
  renderBookmarks();
  closeModal('bookmarkModal');
  lucide.createIcons(); // Refresh icons
}

function deleteBookmark(bookmarkId, sectionId) {
  if (confirm('Delete this bookmark?')) {
    const section = dashboardData.sections.find(s => s.id === sectionId);
    section.bookmarks = section.bookmarks.filter(b => b.id !== bookmarkId);
    saveData();
    renderBookmarks();
  }
}

function editSection(sectionId) {
  const section = dashboardData.sections.find(s => s.id === sectionId);
  currentEditingSectionId = sectionId;
  document.getElementById('sectionName').value = section.name;
  openModal('addSectionModal');
}

function saveSection() {
  const name = document.getElementById('sectionName').value.trim();

  if (!name) {
    alert('Section name is required');
    return;
  }

  if (currentEditingSectionId) {
    const section = dashboardData.sections.find(s => s.id === currentEditingSectionId);
    section.name = name;
  } else {
    dashboardData.sections.push({
      id: 'sec' + Date.now(),
      name,
      bookmarks: []
    });
  }

  saveData();
  renderBookmarks();
  closeModal('addSectionModal');
  document.getElementById('sectionName').value = '';
}

function deleteSection(sectionId) {
  if (confirm('Delete this section and all bookmarks in it?')) {
    dashboardData.sections = dashboardData.sections.filter(s => s.id !== sectionId);
    saveData();
    renderBookmarks();
  }
}

function handleIconUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = document.getElementById('iconPreview');
      preview.style.backgroundImage = `url(${event.target.result})`;
      preview.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  }
}

function showNotesModal(bookmarkId, sectionId) {
  const section = dashboardData.sections.find(s => s.id === sectionId);
  const bookmark = section.bookmarks.find(b => b.id === bookmarkId);

  if (bookmark.notes) {
      const bookmarkCard = document.querySelector(`[data-bookmark-id="${bookmarkId}"][data-section-id="${sectionId}"]`);
    
      const existingTooltip = document.querySelector('.notes-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
      const tooltip = document.createElement('div');
    tooltip.className = 'notes-tooltip';
    tooltip.innerHTML = `
      <div class="notes-tooltip-header">
        <strong>Notes</strong>
        <div class="notes-tooltip-actions">
          <button class="notes-tooltip-edit" title="Edit"><i data-lucide="edit-2"></i></button>
          <button class="notes-tooltip-close">&times;</button>
        </div>
      </div>
      <div class="notes-tooltip-content">${bookmark.notes}</div>
    `;
    
      bookmarkCard.style.position = 'relative';
    bookmarkCard.appendChild(tooltip);
    
      lucide.createIcons();
    
      tooltip.querySelector('.notes-tooltip-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip.remove();
      editBookmark(bookmarkId, sectionId);
    });
    
      tooltip.querySelector('.notes-tooltip-close').addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip.remove();
    });
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeTooltip(e) {
        if (!tooltip.contains(e.target)) {
          tooltip.remove();
          document.removeEventListener('click', closeTooltip);
        }
      });
    }, 0);
  }
}

function showContextMenu(e, bookmarkId, sectionId) {
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const section = dashboardData.sections.find(s => s.id === sectionId);
  const bookmark = section.bookmarks.find(b => b.id === bookmarkId);

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="context-menu-item" data-action="view-notes" ${!bookmark.notes ? 'style="display:none;"' : ''}>
      <i data-lucide="sticky-note"></i>
      <span>View Notes</span>
    </div>
    <div class="context-menu-item" data-action="edit">
      <i data-lucide="edit-2"></i>
      <span>Edit</span>
    </div>
    <div class="context-menu-item" data-action="copy-url">
      <i data-lucide="copy"></i>
      <span>Copy URL</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item context-menu-item-danger" data-action="delete">
      <i data-lucide="trash-2"></i>
      <span>Delete</span>
    </div>
  `;

  document.body.appendChild(menu);

  lucide.createIcons();

  const menuRect = menu.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  let left = e.clientX;
  let top = e.clientY;
  
  if (top + menuRect.height > viewportHeight) {
    top = top - menuRect.height;
  }
  
  if (left + menuRect.width > viewportWidth) {
    left = left - menuRect.width;
  }
  
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  menu.style.position = 'fixed';

  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      
      switch(action) {
        case 'view-notes':
          showNotesModal(bookmarkId, sectionId);
          break;
        case 'edit':
          editBookmark(bookmarkId, sectionId);
          break;
        case 'copy-url':
          navigator.clipboard.writeText(bookmark.url).then(() => {
            showToast('URL copied to clipboard!');
          });
          break;
        case 'delete':
          deleteBookmark(bookmarkId, sectionId);
          break;
      }
      
      menu.remove();
    });
  });

  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 0);

  document.addEventListener('scroll', function closeMenuOnScroll() {
    menu.remove();
    document.removeEventListener('scroll', closeMenuOnScroll);
  }, { once: true });
}

function showToast(message) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function handlePasteBookmark(e) {
  if (e.target.matches('input, textarea, [contenteditable]')) {
    return;
  }

  if (e.ctrlKey && e.key === 'v') {
    e.preventDefault();

    navigator.clipboard.readText().then(text => {
      if (text.includes('http://') || text.includes('https://') || text.includes('www.')) {
        if (dashboardData.sections.length > 0) {
          currentEditingBookmarkId = null;
          currentEditingSectionId = dashboardData.sections[0].id;
          document.getElementById('bookmarkModalTitle').textContent = 'Add Bookmark';
          document.getElementById('bookmarkName').value = '';
          document.getElementById('bookmarkUrl').value = text;
          document.getElementById('bookmarkNotes').value = '';
          document.getElementById('iconPreview').classList.remove('has-image');
          document.getElementById('bookmarkIcon').value = '';
          openModal('bookmarkModal');
          document.getElementById('bookmarkName').focus();
        } else {
          alert('Create a section first');
        }
      }
    });
  }
}

document.getElementById('exportDataBtn').addEventListener('click', () => {
  const dataStr = JSON.stringify(dashboardData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importDataBtn').addEventListener('click', () => {
  document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        dashboardData = JSON.parse(event.target.result);
        saveData();
        renderBookmarks();
        alert('Data imported successfully!');
      } catch (error) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }
});

function initializeRSSFeedTabs() {
  const container = document.getElementById('rssFeedsContainer');
  container.innerHTML = '';

  const morningCoffeeTab = document.createElement('button');
  morningCoffeeTab.className = 'news-tab';
  morningCoffeeTab.innerHTML = '☕ Morning Coffee';
  morningCoffeeTab.dataset.tab = 'morning-coffee';
  morningCoffeeTab.addEventListener('click', () => {
    document.querySelectorAll('#rssFeedsContainer .news-tab').forEach(t => t.classList.remove('active'));
    morningCoffeeTab.classList.add('active');
    loadRSSFeeds(3);
  });
  container.appendChild(morningCoffeeTab);

  dashboardData.newsFeeds.forEach((feed, index) => {
    const feedUrl = typeof feed === 'string' ? feed : feed.url;
    const feedName = typeof feed === 'string' ? extractFeedName(feed) : (feed.name || extractFeedName(feed.url));
    const tab = document.createElement('button');
    tab.className = 'news-tab';
    tab.textContent = feedName;
    tab.dataset.tab = `feed-${index}`;
    tab.addEventListener('click', () => {
      document.querySelectorAll('#rssFeedsContainer .news-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadSingleRSSFeed(feedUrl);
    });
    container.appendChild(tab);
  });

  // Activate first tab by default
  if (container.querySelector('.news-tab')) {
    container.querySelector('.news-tab').classList.add('active');
    loadRSSFeeds(3);
  }
}

function extractFeedName(feed) {
  try {
      const url = typeof feed === 'string' ? feed : feed.url || '';
    if (!url) return 'Feed';
    
    const urlObj = new URL(url);
    let name = urlObj.hostname.replace('www.', '');
    name = name.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Feed';
  }
}

async function loadSingleRSSFeed(feedUrl) {
  const content = document.getElementById('rssContent');
  content.innerHTML = '<div class="loading">Loading feed...</div>';

  const url = typeof feedUrl === 'string' ? feedUrl : feedUrl.url || '';
  if (!url) {
    content.innerHTML = '<div class="error">Invalid feed URL</div>';
    return;
  }

  try {
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const articles = data.items.slice(0, 10);
      content.innerHTML = articles.map(article => `
        <div class="news-item">
          <h3><a href="${article.link}" target="_blank">${article.title}</a></h3>
          <small>${new Date(article.pubDate).toLocaleDateString()}</small>
          <p>${(article.description || '').replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
        </div>
      `).join('');
    } else {
      content.innerHTML = '<div class="error">No articles found</div>';
    }
  } catch (error) {
    content.innerHTML = '<div class="error">Failed to load feed</div>';
    console.error('Error loading feed:', error);
  }
}

function initializeNewsTabs() {
  const container = document.getElementById('redditTabsContainer');
  container.innerHTML = '';

  dashboardData.redditSubs.forEach(sub => {
    const tab = document.createElement('button');
    tab.className = 'news-tab reddit-tab';
    tab.textContent = `r/${sub}`;
    tab.dataset.tab = `reddit-${sub}`;
    tab.addEventListener('click', () => {
      document.querySelectorAll('.reddit-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadReddit(sub);
    });
    container.appendChild(tab);
  });

  // Load first reddit sub by default
  if (dashboardData.redditSubs.length > 0) {
    container.querySelector('.reddit-tab').classList.add('active');
    loadReddit(dashboardData.redditSubs[0]);
  }
}

async function loadRSSFeeds(limit) {
  const content = document.getElementById('rssContent');
  content.innerHTML = '<div class="loading">Loading RSS feeds...</div>';

  try {
    let allArticles = [];
    
    for (const feedUrl of dashboardData.newsFeeds) {
          const url = typeof feedUrl === 'string' ? feedUrl : feedUrl.url || '';
      if (!url) continue;
      
      try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.status === 'ok' && data.items) {
          allArticles = allArticles.concat(data.items);
        } else {
          console.warn(`Feed returned non-ok status: ${url}`, data);
        }
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
      }
    }

      allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    allArticles = allArticles.slice(0, limit);

    content.innerHTML = allArticles.map(article => `
      <div class="news-item">
        <h3><a href="${article.link}" target="_blank">${article.title}</a></h3>
        <small>${new Date(article.pubDate).toLocaleDateString()}</small>
        <p>${article.description?.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
      </div>
    `).join('');
  } catch (error) {
    content.innerHTML = '<div class="error">Failed to load RSS feeds</div>';
    console.error('Error loading RSS:', error);
  }
}

async function fetchRSS(url, limit) {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&json`;
    const response = await fetch(proxyUrl);
    const data = await response.json();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.contents, 'text/xml');

    const items = [];
    const entries = xmlDoc.querySelectorAll('item');

    entries.forEach((entry, index) => {
      if (index >= limit) return;

      const title = entry.querySelector('title')?.textContent || 'No title';
      const link = entry.querySelector('link')?.textContent || '#';
      const pubDate = entry.querySelector('pubDate')?.textContent || '';
      const description = entry.querySelector('description')?.textContent || '';

      // Try to extract time ago
      let timeAgo = '';
      if (pubDate) {
        const date = new Date(pubDate);
        timeAgo = getTimeAgo(date);
      }

      items.push({
        title: title.substring(0, 100),
        link,
        pubDate: timeAgo || pubDate.substring(0, 10),
        description
      });
    });

    return items;
  } catch (error) {
    console.error('RSS Error:', error);
    throw error;
  }
}

async function loadReddit(subreddit) {
  const content = document.getElementById('redditContent');
  content.innerHTML = '<div class="loading">Loading r/' + subreddit + '...</div>';

  try {
      const response = await fetch(`https://corsproxy.io/?https://www.reddit.com/r/${subreddit}/top.json?t=week&limit=10`);
    const data = await response.json();
    
    if (!data.data || !data.data.children) {
      content.innerHTML = '<div class="error">Subreddit not found</div>';
      return;
    }

    const posts = data.data.children.map(post => post.data);
    
    content.innerHTML = posts.map(post => `
      <div class="news-item">
        <h3><a href="https://reddit.com${post.permalink}" target="_blank">${post.title}</a></h3>
        <small>r/${subreddit} • ${post.score} upvotes</small>
        <p>${post.selftext?.substring(0, 150) || 'No text'}...</p>
      </div>
    `).join('');
  } catch (error) {
    content.innerHTML = '<div class="error">Failed to load subreddit</div>';
    console.error('Error loading Reddit:', error);
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm';
  return Math.floor(seconds) + 's';
}

function renderNewsFeedsList() {
  const list = document.getElementById('newsFeedsList');
  list.innerHTML = '';

  dashboardData.newsFeeds.forEach((feed, index) => {
      const feedUrl = typeof feed === 'string' ? feed : feed.url || '[Invalid Feed]';
    const feedName = typeof feed === 'string' ? extractFeedName(feed) : (feed.name || extractFeedName(feed.url));
    
    const item = document.createElement('div');
    item.className = 'feed-item feed-item-editable';
    item.innerHTML = `
      <div class="feed-info-editable">
        <input type="text" class="feed-name-input" value="${feedName}" placeholder="Feed Name" data-index="${index}">
        <small>${feedUrl}</small>
      </div>
      <button class="btn-remove" data-index="${index}">Remove</button>
    `;
    
    // Save name on change
    item.querySelector('.feed-name-input').addEventListener('blur', (e) => {
      const newName = e.target.value.trim();
      if (newName) {
        if (typeof dashboardData.newsFeeds[index] === 'string') {
          dashboardData.newsFeeds[index] = {
            url: dashboardData.newsFeeds[index],
            name: newName
          };
        } else {
          dashboardData.newsFeeds[index].name = newName;
        }
        saveData();
        initializeRSSFeedTabs(); // Refresh tabs
      }
    });
    
    // Also save on Enter key
    item.querySelector('.feed-name-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    });
    
    item.querySelector('.btn-remove').addEventListener('click', () => {
      dashboardData.newsFeeds.splice(index, 1);
      saveData();
      renderNewsFeedsList();
      initializeRSSFeedTabs(); // Refresh tabs
    });
    list.appendChild(item);
  });
}

function renderRedditSubsList() {
  const list = document.getElementById('redditSubsList');
  list.innerHTML = '';

  dashboardData.redditSubs.forEach((sub, index) => {
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `
      <span>r/${sub}</span>
      <button class="btn-remove" data-index="${index}">Remove</button>
    `;
    item.querySelector('.btn-remove').addEventListener('click', () => {
      dashboardData.redditSubs.splice(index, 1);
      saveData();
      initializeNewsTabs();
      renderRedditSubsList();
    });
    list.appendChild(item);
  });
}

function addNewsFeed() {
  const name = document.getElementById('newFeedName').value.trim();
  const url = document.getElementById('newFeedUrl').value.trim();

  if (!name || !url) {
    alert('Feed name and URL are required');
    return;
  }

  dashboardData.newsFeeds.push({
    id: 'feed' + Date.now(),
    name,
    url
  });

  saveData();
  document.getElementById('newFeedName').value = '';
  document.getElementById('newFeedUrl').value = '';
  renderNewsFeedsList();
}

function addRedditSub() {
  const name = document.getElementById('newSubName').value.trim().toLowerCase().replace('r/', '');

  if (!name) {
    alert('Subreddit name is required');
    return;
  }

  if (!dashboardData.redditSubs.includes(name)) {
    dashboardData.redditSubs.push(name);
    saveData();
    document.getElementById('newSubName').value = '';
    renderRedditSubsList();
    initializeNewsTabs();
  } else {
    alert('This subreddit is already added');
  }
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}