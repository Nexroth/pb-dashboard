// Dashboard version
const DASHBOARD_VERSION = '2.1.5';

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

// UI Constants
const UI_CONSTANTS = {
  INFO_PANEL_WIDTH: 520,
  INFO_PANEL_HEIGHT: 460,
  SEARCH_DEBOUNCE_MS: 300,
  BOOKMARK_CARD_HEIGHT: 100,
  MAX_ICON_SIZE_KB: 500,
  RSS_FEED_LIMIT: 10,
  REDDIT_POST_LIMIT: 10
};

// Security: Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Dashboard State
let dashboardData = { sections: [], theme: 'dark', newsFeeds: [], redditSubs: [] };
let currentEditingBookmarkId = null;
let currentEditingSectionId = null;
let currentProjectSearch = '';  // used by Tasks page search
let projectsNameFilter = '';     // used by Projects page filter
let hideCompletedProjects = false;
let hideArchivedProjects = false;

// Projects table state
let projectsSortField = null;
let projectsSortDir = 'asc';

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

  // Migrate any missing fields (handles old exports too)
  dashboardData = migrateData(dashboardData);
  saveData();
}

function saveData() {
  try {
    localStorage.setItem('dashboardData', JSON.stringify(dashboardData));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded! Your data is too large. Consider:\n\n1. Export your data as backup\n2. Remove old bookmarks/projects\n3. Compress or remove large icons');
      console.error('localStorage quota exceeded:', error);
    } else {
      alert('Failed to save data. Please try again.');
      console.error('Failed to save to localStorage:', error);
    }
  }
}

// Migrate loaded/imported data to ensure all fields exist
function migrateData(data) {
  // Ensure top-level fields
  if (!data.customTheme) data.customTheme = { bgPrimary: '#1a1a2e', bgSecondary: '#16213e', bgTertiary: '#0f1419', textPrimary: '#eaeaea', accent: '#0ea5e9' };
  if (!data.newsFeeds) data.newsFeeds = [...DEFAULT_FEEDS];
  if (!data.redditSubs) data.redditSubs = [...DEFAULT_SUBS];
  if (!data.sections) data.sections = [];
  if (!data.projectColumns) data.projectColumns = ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'];
  
  // Add 'Archived' to existing projectColumns if not present
  if (data.projectColumns && !data.projectColumns.includes('Archived')) {
    data.projectColumns.push('Archived');
  }
  if (!data.projects) {
    data.projects = [{ id: 'proj_default', name: 'My Project', status: 'Active', dueDate: '', folderPath: '', description: '', columns: ['Not Started', 'On Hold', 'In Progress', 'Review', 'Completed'], tasks: [] }];
    data.activeProjectId = 'proj_default';
  }
  if (!data.activeProjectId && data.projects.length > 0) data.activeProjectId = data.projects[0].id;

  // Migrate old string feeds
  if (data.newsFeeds.length > 0 && typeof data.newsFeeds[0] === 'string') {
    data.newsFeeds = data.newsFeeds.map(url => ({ url, name: extractFeedName(url) }));
  }

  // Ensure each project has required fields
  data.projects.forEach(proj => {
    if (!proj.columns) proj.columns = ['Not Started', 'On Hold', 'In Progress', 'Review', 'Completed'];
    if (!proj.tasks) proj.tasks = [];
    if (!proj.status) proj.status = 'Active';
    if (proj.dueDate === undefined) proj.dueDate = '';
    if (proj.folderPath === undefined) proj.folderPath = '';
    if (!proj.description) proj.description = '';

    // Migrate old column names to new ones
    proj.columns = proj.columns.map(col => {
      if (col === 'Done') return 'Completed';
      if (col === 'Backlog') return 'On Hold';
      if (col === 'To Do') return 'Not Started';
      return col;
    });

    // Migrate task statuses and replace files with folderPath
    proj.tasks.forEach(task => {
      if (task.status === 'Done') task.status = 'Completed';
      if (task.status === 'Backlog') task.status = 'On Hold';
      if (task.status === 'To Do') task.status = 'Not Started';
      if (task.folderPath === undefined) task.folderPath = '';
      if (!task.todos) task.todos = [];
      if (!task.tags) task.tags = '';
      if (!task.notes) task.notes = '';
      // Remove old files array to save localStorage space
      delete task.files;
    });
  });

  // Ensure each bookmark has tags array
  data.sections.forEach(section => {
    if (section.bookmarks) {
      section.bookmarks.forEach(bookmark => {
        if (!bookmark.tags) bookmark.tags = [];
        
        // Security: Sanitize javascript: URLs from old bookmarks
        if (bookmark.url && bookmark.url.toLowerCase().startsWith('javascript:')) {
          bookmark.url = '#';
        }
      });
    }
  });

  return data;
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

  // Search with debouncing for better performance
  let searchTimeout;
  const searchBox = document.getElementById('searchBox');
  const searchClear = document.getElementById('searchClear');
  
  searchBox.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value;
    searchClear.style.display = query ? 'flex' : 'none';
    
    searchTimeout = setTimeout(() => {
      const queryLower = query.toLowerCase();
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
          const tags = bookmarkData.tags ? bookmarkData.tags.join(' ').toLowerCase() : '';
          
          const visible = name.includes(queryLower) || url.includes(queryLower) || notes.includes(queryLower) || tags.includes(queryLower);
          bookmark.style.display = visible ? '' : 'none';
          if (visible) visibleCount++;
        });

        section.style.display = visibleCount > 0 ? '' : 'none';
      });
    }, UI_CONSTANTS.SEARCH_DEBOUNCE_MS);
  });

  searchClear.addEventListener('click', () => {
    searchBox.value = '';
    searchClear.style.display = 'none';
    document.querySelectorAll('.section').forEach(section => {
      section.style.display = '';
      section.querySelectorAll('.bookmark').forEach(bookmark => {
        bookmark.style.display = '';
      });
    });
  });

  const addSectionBtn = document.getElementById('addSectionBtn');
  if (addSectionBtn) {
    addSectionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      currentEditingSectionId = null;
      document.getElementById('sectionName').value = '';
      openModal('addSectionModal');
    });
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
      const modal = btn.closest('.modal');
      if (modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Click outside modal to close
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
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

  // Export project modal buttons
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');
  if (exportHtmlBtn) {
    exportHtmlBtn.addEventListener('click', () => {
      if (currentExportProjectId) {
        exportProjectAsHTML(currentExportProjectId);
        closeModal('exportProjectModal');
        showToast('Project exported as HTML');
      }
    });
  }

  const exportMarkdownBtn = document.getElementById('exportMarkdownBtn');
  if (exportMarkdownBtn) {
    exportMarkdownBtn.addEventListener('click', () => {
      if (currentExportProjectId) {
        exportProjectAsMarkdown(currentExportProjectId);
        closeModal('exportProjectModal');
        showToast('Project exported as Markdown');
      }
    });
  }

  document.addEventListener('keydown', handlePasteBookmark);
  
  // Check for updates button
  const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', checkForUpdates);
  }
  
  // Display current version
  const versionEl = document.getElementById('currentVersion');
  if (versionEl) {
    versionEl.textContent = DASHBOARD_VERSION;
  }
  
  // Sidebar footer handlers
  const sidebarVersion = document.getElementById('sidebarVersion');
  if (sidebarVersion) {
    sidebarVersion.addEventListener('click', () => {
      switchPage('settings');
      // Scroll to update checker section
      setTimeout(() => {
        const updateSection = document.querySelector('.setting-group:has(#checkUpdatesBtn)');
        if (updateSection) {
          updateSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    });
  }
  
  const sidebarHelpBtn = document.getElementById('sidebarHelpBtn');
  if (sidebarHelpBtn) {
    sidebarHelpBtn.addEventListener('click', () => {
      showToast('Keyboard shortcuts panel coming in v2.2.0!');
      // TODO: Open keyboard shortcuts panel when implemented in Phase 1
    });
  }
}

function compareVersions(v1, v2) {
  // Normalize versions to [major, minor, patch]
  const normalize = (v) => {
    const parts = v.split('.').map(n => parseInt(n) || 0);
    while (parts.length < 3) parts.push(0); // Pad to 3 parts
    return parts;
  };
  
  const parts1 = normalize(v1);
  const parts2 = normalize(v2);
  
  // Compare each part
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;  // v1 is newer
    if (parts1[i] < parts2[i]) return -1; // v2 is newer
  }
  
  return 0; // Equal
}

async function checkForUpdates() {
  const btn = document.getElementById('checkUpdatesBtn');
  const notification = document.getElementById('updateNotification');
  const statusEl = document.getElementById('updateStatus');
  const instructionsEl = document.getElementById('updateInstructions');
  
  // Show loading state
  btn.textContent = 'Checking...';
  btn.disabled = true;
  notification.style.display = 'none';
  
  try {
    // Fetch latest release from GitHub
    const response = await fetch('https://api.github.com/repos/Nexroth/pb-dashboard/releases/latest');
    
    if (!response.ok) {
      throw new Error('Failed to check for updates');
    }
    
    const release = await response.json();
    const latestVersion = release.tag_name.replace('v', ''); // Remove 'v' prefix if present
    
    // Compare versions
    const comparison = compareVersions(latestVersion, DASHBOARD_VERSION);
    
    if (comparison === 0) {
      // Up to date
      statusEl.textContent = '✅ You have the latest version';
      statusEl.style.color = 'var(--accent)';
      instructionsEl.innerHTML = 'No updates available.';
    } else if (comparison > 0) {
      // Update available (latestVersion is newer)
      statusEl.textContent = `🔔 Update Available: v${latestVersion}`;
      statusEl.style.color = '#eab308';
      
      instructionsEl.innerHTML = `
        <p style="margin-bottom: 8px;"><strong>To update:</strong></p>
        <ol style="margin-left: 20px; line-height: 1.6;">
          <li>Click the link below to go to the releases page</li>
          <li>Download the <strong>pb-dashboard.zip</strong> file</li>
          <li>Extract the ZIP file</li>
          <li>Copy all files and replace them in your current dashboard folder</li>
          <li>Refresh your browser (Ctrl+F5 or Cmd+Shift+R)</li>
        </ol>
        <p style="margin-top: 12px;">
          <a href="${release.html_url}" target="_blank" style="color: var(--accent); text-decoration: underline; font-weight: 600;">
            View Release v${latestVersion} →
          </a>
        </p>
        ${release.body ? `
          <details style="margin-top: 12px;">
            <summary style="cursor: pointer; color: var(--accent); font-weight: 600;">What's New</summary>
            <div style="margin-top: 8px; white-space: pre-wrap; font-size: 0.85rem;">${release.body}</div>
          </details>
        ` : ''}
      `;
    } else {
      // Current version is newer than latest release (development version)
      statusEl.textContent = `✅ You have a newer version (v${DASHBOARD_VERSION})`;
      statusEl.style.color = 'var(--accent)';
      instructionsEl.innerHTML = `Latest release is v${latestVersion}. You're running a development or pre-release version.`;
    }
    
    notification.style.display = 'block';
    
  } catch (error) {
    console.error('Error checking for updates:', error);
    statusEl.textContent = '❌ Could not check for updates';
    statusEl.style.color = '#ef4444';
    instructionsEl.innerHTML = `
      <p>Unable to connect to GitHub. Please try again later or check manually:</p>
      <p style="margin-top: 8px;">
        <a href="https://github.com/Nexroth/pb-dashboard/releases" target="_blank" style="color: var(--accent); text-decoration: underline;">
          View Releases on GitHub →
        </a>
      </p>
    `;
    notification.style.display = 'block';
  } finally {
    btn.textContent = 'Check for Updates';
    btn.disabled = false;
  }
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
  if (pageName === 'projects') {
    initProjectsPage();
  }
  if (pageName === 'tasks') {
    initTasksPage();
  }
  if (pageName === 'calendar') {
    initCalendarPage();
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
  div.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">${escapeHtml(section.name)}</h2>
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
      ${section.bookmarks.map(bookmark => {
        // Security: Sanitize URLs at render time (protects old/imported bookmarks)
        const safeUrl = bookmark.url && bookmark.url.toLowerCase().startsWith('javascript:') ? '#' : bookmark.url;
        
        return `
        <div class="bookmark" draggable="true" data-bookmark-id="${bookmark.id}" data-section-id="${section.id}">
          <div class="bookmark-main">
            <div class="bookmark-content">
              <a href="${safeUrl}" target="_blank" class="bookmark-link">
                <span class="bookmark-name">${escapeHtml(bookmark.name)}</span>
              </a>
            </div>
            <div class="bookmark-stats">
              ${bookmark.notes ? `<span class="bookmark-stat" title="Has notes"><i data-lucide="sticky-note"></i></span>` : ''}
              ${(bookmark.tags && bookmark.tags.length > 0) ? bookmark.tags.map(tag => `<span class="bookmark-stat bookmark-tag">${escapeHtml(tag)}</span>`).join('') : ''}
            </div>
          </div>
          ${bookmark.icon ? `<div class="bookmark-icon" style="background-image: url(${bookmark.icon})"></div>` : ''}
        </div>
      `
      }).join('')}
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
      dashboardData.sections[toIdx].bookmarks.splice(evt.newIndex, 0, bookmark);

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
      document.getElementById('bookmarkTags').value = '';
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
  document.getElementById('bookmarkTags').value = (bookmark.tags || []).join(', ');

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
  let url = document.getElementById('bookmarkUrl').value.trim();
  const notes = document.getElementById('bookmarkNotes').value.trim();
  const tagsInput = document.getElementById('bookmarkTags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

  if (!name || !url) {
    alert('Name and URL are required');
    return;
  }

  // Security: Block javascript: URLs to prevent XSS
  if (url.toLowerCase().startsWith('javascript:')) {
    alert('javascript: URLs are not allowed for security reasons');
    return;
  }

  const section = dashboardData.sections.find(s => s.id === currentEditingSectionId);

  if (currentEditingBookmarkId) {
    const bookmark = section.bookmarks.find(b => b.id === currentEditingBookmarkId);
    bookmark.name = name;
    bookmark.url = url;
    bookmark.notes = notes;
    bookmark.tags = tags;
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
      tags,
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
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file (PNG, JPG, GIF, etc.)');
    e.target.value = '';
    return;
  }
  
  // Validate file size (max 500KB)
  const maxSize = UI_CONSTANTS.MAX_ICON_SIZE_KB * 1024;
  if (file.size > maxSize) {
    alert(`Icon file is too large (${Math.round(file.size / 1024)}KB). Please use an image under ${UI_CONSTANTS.MAX_ICON_SIZE_KB}KB.`);
    e.target.value = '';
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const preview = document.getElementById('iconPreview');
    preview.style.backgroundImage = `url(${event.target.result})`;
    preview.classList.add('has-image');
  };
  reader.onerror = () => {
    alert('Failed to read image file. Please try another file.');
    e.target.value = '';
  };
  reader.readAsDataURL(file);
}

// Removed duplicate linkifyText - using secure version at line ~987

function showNotesModal(bookmarkId, sectionId) {
  const section = dashboardData.sections.find(s => s.id === sectionId);
  const bookmark = section.bookmarks.find(b => b.id === bookmarkId);

  if (!bookmark.notes) return;

  document.querySelectorAll('.notes-tooltip').forEach(t => t.remove());

  const bookmarkCard = document.querySelector(`[data-bookmark-id="${bookmarkId}"][data-section-id="${sectionId}"]`);

  const tooltip = document.createElement('div');
  tooltip.className = 'notes-tooltip';
  tooltip.style.position = 'fixed';
  tooltip.style.zIndex = '10000';
  tooltip.style.width = '320px';
  tooltip.innerHTML = `
    <div class="notes-tooltip-header">
      <strong>Notes</strong>
      <div class="notes-tooltip-actions">
        <button class="notes-tooltip-edit" title="Edit"><i data-lucide="edit-2"></i></button>
        <button class="notes-tooltip-close">&times;</button>
      </div>
    </div>
    <div class="notes-tooltip-content">${linkifyText(bookmark.notes)}</div>
  `;

  document.body.appendChild(tooltip);
  lucide.createIcons();

  const rect = bookmarkCard.getBoundingClientRect();
  const tw = 320;
  let left = rect.left;
  let top  = rect.bottom + 8;
  if (left + tw > window.innerWidth) left = window.innerWidth - tw - 8;
  if (top + 220 > window.innerHeight) top = rect.top - 8 - (tooltip.offsetHeight || 160);
  tooltip.style.left = Math.max(8, left) + 'px';
  tooltip.style.top  = Math.max(8, top)  + 'px';

  tooltip.querySelector('.notes-tooltip-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    tooltip.remove();
    editBookmark(bookmarkId, sectionId);
  });
  tooltip.querySelector('.notes-tooltip-close').addEventListener('click', (e) => {
    e.stopPropagation();
    tooltip.remove();
  });
  setTimeout(() => {
    document.addEventListener('click', function closeTooltip(e) {
      if (!tooltip.contains(e.target)) {
        tooltip.remove();
        document.removeEventListener('click', closeTooltip);
      }
    });
  }, 0);
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

// ─── Project context menu ────────────────────────────────────────────────────

function showProjectContextMenu(e, projectId) {
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();

  const proj = dashboardData.projects.find(p => p.id === projectId);
  if (!proj) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    ${(proj.description || proj.notes) ? `<div class="context-menu-item" data-action="view-notes">
      <i data-lucide="sticky-note"></i><span>View Notes</span>
    </div>` : ''}
    <div class="context-menu-item" data-action="edit">
      <i data-lucide="edit-2"></i><span>Edit Project</span>
    </div>
    <div class="context-menu-item" data-action="view-tasks">
      <i data-lucide="layout-dashboard"></i><span>View Tasks</span>
    </div>
    ${proj.folderPath ? `<div class="context-menu-item" data-action="open-folder">
      <i data-lucide="folder-open"></i><span>Open Folder</span>
    </div>` : ''}
    <div class="context-menu-divider"></div>
    <div class="context-menu-item context-menu-item-danger" data-action="delete">
      <i data-lucide="trash-2"></i><span>Delete</span>
    </div>
  `;

  document.body.appendChild(menu);
  lucide.createIcons();
  positionMenu(menu, e);

  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      menu.remove();
      switch (action) {
        case 'view-notes':  showProjectInfoPanel(e, proj); break;
        case 'edit':        openEditProjectModal(projectId); break;
        case 'view-tasks':  goToProjectTasks(projectId); break;
        case 'open-folder': openFolder(proj.folderPath); break;
        case 'delete':      deleteProjectCard(projectId); break;
      }
    });
  });

  dismissMenuOnOutsideClick(menu);
}

// ─── Task context menu ────────────────────────────────────────────────────────

function showTaskContextMenu(e, taskId) {
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();

  const project = getActiveProject();
  if (!project) return;
  const task = project.tasks.find(t => t.id === taskId);
  if (!task) return;

  const hasTodos = task.todos && task.todos.length > 0;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    ${task.notes || hasTodos ? `<div class="context-menu-item" data-action="view-info">
      <i data-lucide="sticky-note"></i><span>View Notes & Todos</span>
    </div>` : ''}
    <div class="context-menu-item" data-action="edit">
      <i data-lucide="edit-2"></i><span>Edit Task</span>
    </div>
    ${task.folderPath ? `<div class="context-menu-item" data-action="open-folder">
      <i data-lucide="folder-open"></i><span>Open Folder</span>
    </div>` : ''}
    <div class="context-menu-divider"></div>
    <div class="context-menu-item context-menu-item-danger" data-action="delete">
      <i data-lucide="trash-2"></i><span>Delete</span>
    </div>
  `;

  document.body.appendChild(menu);
  lucide.createIcons();
  positionMenu(menu, e);

  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      menu.remove();
      switch (action) {
        case 'view-info':   showTaskInfoPanel(e, task); break;
        case 'edit':        openTaskModal(taskId); break;
        case 'open-folder': openFolder(task.folderPath); break;
        case 'delete':      deleteTask(taskId); break;
      }
    });
  });

  dismissMenuOnOutsideClick(menu);
}

// ─── Info panel (description / notes+todos) ───────────────────────────────────

function positionMenu(menu, e) {
  const rect = menu.getBoundingClientRect();
  let left = e.clientX;
  let top  = e.clientY;
  if (top  + rect.height > window.innerHeight) top  -= rect.height;
  if (left + rect.width  > window.innerWidth)  left -= rect.width;
  menu.style.left     = left + 'px';
  menu.style.top      = top  + 'px';
  menu.style.position = 'fixed';
}

function dismissMenuOnOutsideClick(menu) {
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 0);
}

// ─── Text utilities ────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linkifyText(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g, (url) => {
    const href = url.startsWith('www.') ? 'https://' + url : url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="info-panel-link">${url}</a>`;
  });
}

function showInfoPanel(e, title, textContent, todosHtml, textLabel) {
  document.querySelectorAll('.info-panel').forEach(p => p.remove());

  const panel = document.createElement('div');
  panel.className = 'info-panel';

  let bodyHtml = '';
  if (textContent) {
    bodyHtml += `<div class="info-panel-section">
      <div class="info-panel-section-title">${textLabel || 'Description'}</div>
      <div class="info-panel-section-text">${linkifyText(textContent)}</div>
    </div>`;
  }
  if (todosHtml) {
    bodyHtml += todosHtml;
  }

  if (!bodyHtml) {
    bodyHtml = '<div style="color:var(--text-secondary);font-size:13px;">Nothing to show.</div>';
  }

  panel.innerHTML = `
    <div class="info-panel-header">
      <strong>${title}</strong>
      <button class="info-panel-close">&times;</button>
    </div>
    <div class="info-panel-body">${bodyHtml}</div>
  `;

  document.body.appendChild(panel);

  // Position near cursor — account for larger panel size
  const pw = UI_CONSTANTS.INFO_PANEL_WIDTH, ph = UI_CONSTANTS.INFO_PANEL_HEIGHT;
  let left = e.clientX + 12;
  let top  = e.clientY + 12;
  if (left + pw > window.innerWidth)  left = e.clientX - pw - 12;
  if (top  + ph > window.innerHeight) top  = e.clientY - ph - 12;
  panel.style.left     = Math.max(8, left) + 'px';
  panel.style.top      = Math.max(8, top)  + 'px';
  panel.style.position = 'fixed';

  panel.querySelector('.info-panel-close').addEventListener('click', () => panel.remove());

  setTimeout(() => {
    document.addEventListener('click', function close(ev) {
      if (!panel.contains(ev.target)) {
        panel.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 0);
}

function showTaskInfoPanel(e, task) {
  const hasTodos = task.todos && task.todos.length > 0;
  let todosHtml = '';
  if (hasTodos) {
    const items = task.todos.map(t => `
      <div class="info-panel-todo-item ${t.done ? 'done' : ''}">
        <input type="checkbox" class="info-panel-todo-check" ${t.done ? 'checked' : ''} disabled>
        <span>${t.text}</span>
      </div>
    `).join('');
    todosHtml = `<div class="info-panel-section">
      <div class="info-panel-section-title">Todos (${task.todos.filter(t=>t.done).length}/${task.todos.length})</div>
      ${items}
    </div>`;
  }
  showInfoPanel(e, task.title, task.notes || null, todosHtml || null, 'Notes');
}

function showProjectInfoPanel(e, proj) {
  document.querySelectorAll('.info-panel').forEach(p => p.remove());

  const panel = document.createElement('div');
  panel.className = 'info-panel';

  let bodyHtml = '';
  if (proj.description) {
    bodyHtml += `<div class="info-panel-section">
      <div class="info-panel-section-title">Description</div>
      <div class="info-panel-section-text">${linkifyText(proj.description)}</div>
    </div>`;
  }
  if (proj.notes) {
    bodyHtml += `<div class="info-panel-section">
      <div class="info-panel-section-title">Notes</div>
      <div class="info-panel-section-text">${linkifyText(proj.notes)}</div>
    </div>`;
  }
  if (!bodyHtml) {
    bodyHtml = '<div style="color:var(--text-secondary);font-size:13px;">Nothing to show.</div>';
  }

  panel.innerHTML = `
    <div class="info-panel-header">
      <strong>${escapeHtml(proj.name)}</strong>
      <button class="info-panel-close">&times;</button>
    </div>
    <div class="info-panel-body">${bodyHtml}</div>
  `;

  document.body.appendChild(panel);

  const pw = UI_CONSTANTS.INFO_PANEL_WIDTH, ph = UI_CONSTANTS.INFO_PANEL_HEIGHT;
  let left = e.clientX + 12;
  let top  = e.clientY + 12;
  if (left + pw > window.innerWidth)  left = e.clientX - pw - 12;
  if (top  + ph > window.innerHeight) top  = e.clientY - ph - 12;
  panel.style.left     = Math.max(8, left) + 'px';
  panel.style.top      = Math.max(8, top)  + 'px';
  panel.style.position = 'fixed';

  panel.querySelector('.info-panel-close').addEventListener('click', () => panel.remove());

  setTimeout(() => {
    document.addEventListener('click', function close(ev) {
      if (!panel.contains(ev.target)) {
        panel.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 0);
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

  // Alt+T — quick add task (Tasks page must be active)
  if (e.altKey && e.key === 't') {
    e.preventDefault();
    const tasksPage = document.getElementById('tasksPage');
    if (tasksPage && tasksPage.classList.contains('active')) {
      openTaskModal(null);
    } else {
      showToast('Alt+T: Switch to the Tasks page first');
    }
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
        let imported = JSON.parse(event.target.result);
        dashboardData = migrateData(imported);
        saveData();
        renderBookmarks();
        applyTheme();
        showToast('Data imported successfully!');
      } catch (error) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }
});

document.getElementById('clearAllDataBtn').addEventListener('click', () => {
  const confirmed = confirm('⚠️ WARNING: This will permanently delete ALL data including bookmarks, projects, tasks, and settings.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?');
  if (!confirmed) return;
  
  const doubleConfirm = confirm('This is your last chance!\n\nType your confirmation in the next prompt to proceed.');
  if (!doubleConfirm) return;
  
  // Clear localStorage completely
  localStorage.removeItem('dashboardData');
  
  // Reset to default data
  dashboardData = {
    sections: [],
    theme: 'dark',
    newsFeeds: [...DEFAULT_FEEDS],
    redditSubs: [...DEFAULT_SUBS],
    customTheme: {
      bgPrimary: '#1a1a2e',
      bgSecondary: '#16213e',
      bgTertiary: '#0f1419',
      textPrimary: '#eaeaea',
      accent: '#0ea5e9'
    },
    projectColumns: ['Planning', 'Active', 'On Hold', 'Completed'],
    projects: [{
      id: 'proj_default',
      name: 'My Project',
      status: 'Active',
      dueDate: '',
      folderPath: '',
      description: '',
      notes: '',
      tags: [],
      columns: ['Not Started', 'On Hold', 'In Progress', 'Review', 'Completed'],
      tasks: []
    }],
    activeProjectId: 'proj_default'
  };
  
  saveData();
  renderBookmarks();
  applyTheme();
  showToast('All data cleared! Dashboard reset to defaults.');
  
  // Refresh the page to ensure clean state
  setTimeout(() => location.reload(), 1500);
});

function initializeRSSFeedTabs() {
  const container = document.getElementById('rssFeedsContainer');
  container.innerHTML = '';

  const morningCoffeeTab = document.createElement('button');
  morningCoffeeTab.className = 'news-tab';
  morningCoffeeTab.innerHTML = '&#9749; Morning Coffee';
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
    
    if (data.status === 'error') {
      content.innerHTML = `<div class="error">Feed error: ${data.message || 'Unable to load feed'}</div>`;
      return;
    }
    
    if (data.items && data.items.length > 0) {
      const articles = data.items.slice(0, UI_CONSTANTS.RSS_FEED_LIMIT);
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
    content.innerHTML = `<div class="error">Failed to load feed. <button class="btn btn-secondary" onclick="loadSingleRSSFeed('${url.replace(/'/g, "\\'")}')">Retry</button></div>`;
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

    if (allArticles.length === 0) {
      content.innerHTML = '<div class="error">No articles available. Check your feed URLs in settings.</div>';
      return;
    }

    content.innerHTML = allArticles.map(article => `
      <div class="news-item">
        <h3><a href="${article.link}" target="_blank">${article.title}</a></h3>
        <small>${new Date(article.pubDate).toLocaleDateString()}</small>
        <p>${article.description?.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
      </div>
    `).join('');
  } catch (error) {
    content.innerHTML = `<div class="error">Failed to load RSS feeds. <button class="btn btn-secondary" onclick="loadRSSFeeds(3)">Retry</button></div>`;
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
      const response = await fetch(`https://corsproxy.io/?https://www.reddit.com/r/${subreddit}/top.json?t=week&limit=${UI_CONSTANTS.REDDIT_POST_LIMIT}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data.children) {
      content.innerHTML = '<div class="error">Subreddit not found or is private</div>';
      return;
    }

    const posts = data.data.children.map(post => post.data);
    
    if (posts.length === 0) {
      content.innerHTML = '<div class="error">No posts found this week</div>';
      return;
    }
    
    content.innerHTML = posts.map(post => `
      <div class="news-item">
        <h3><a href="https://reddit.com${post.permalink}" target="_blank">${post.title}</a></h3>
        <small>r/${subreddit} &bull; ${post.score} upvotes</small>
        <p>${post.selftext?.substring(0, 150) || 'No text'}...</p>
      </div>
    `).join('');
  } catch (error) {
    content.innerHTML = `<div class="error">Failed to load r/${subreddit}. <button class="btn btn-secondary" onclick="loadReddit('${subreddit}')">Retry</button></div>`;
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

// Convert any path format to a file:// URL the browser/extension can open
function pathToFileUrl(rawPath) {
  if (!rawPath) return '';
  const p = rawPath.trim();
  // Already a file URL — use as-is
  if (p.startsWith('file://')) return p;
  // UNC path: \\server\share → file://server/share
  if (p.startsWith('\\\\')) {
    return 'file://' + p.slice(2).replace(/\\/g, '/');
  }
  // Windows drive letter: C:\... or Z:\... → file:///C:/...
  if (/^[A-Za-z]:[\\\/]/.test(p)) {
    return 'file:///' + p.replace(/\\/g, '/');
  }
  // Unix absolute path: /home/... → file:///home/...
  if (p.startsWith('/')) {
    return 'file://' + p;
  }
  // Fallback — wrap as local
  return 'file:///' + p.replace(/\\/g, '/');
}

function openFolder(rawPath) {
  if (!rawPath) {
    showToast('No folder path specified');
    return;
  }
  
  const url = pathToFileUrl(rawPath);
  if (!url) {
    showToast('Invalid folder path');
    return;
  }
  
  try {
    window.open(url, '_blank');
  } catch (error) {
    console.error('Failed to open folder:', error);
    showToast('Failed to open folder - check browser settings');
  }
  
  // Clipboard fallback — browsers often block file:// links, so copy path too
  if (navigator.clipboard && rawPath) {
    navigator.clipboard.writeText(rawPath).then(() => {
      showToast('Folder path copied to clipboard');
    }).catch((error) => {
      console.error('Failed to copy to clipboard:', error);
      // Silently fail - not critical
    });
  }
}

// ============================================================
//  PROJECT TRACKING
// ============================================================

let currentView = 'kanban';
let currentEditingTaskId = null;
let tempTodos = [];
let hideDone = false;
let currentSortField = null;
let currentSortDir = 'asc';
let editingProjectId = null; // for the new/edit project modal

function getActiveProject() {
  return dashboardData.projects.find(p => p.id === dashboardData.activeProjectId) || dashboardData.projects[0];
}

// ---- Projects overview page ----
let currentProjectsView = 'kanban';

function initProjectsPage() {
  renderProjectsPageView();
  bindProjectsPageEvents();
  // Sync UI state with variables
  const searchBox = document.getElementById('projectsSearchBox');
  const searchClear = document.getElementById('projectsSearchClear');
  const hideToggle = document.getElementById('hideCompletedToggle');
  if (searchBox) { searchBox.value = projectsNameFilter; }
  if (searchClear) { searchClear.style.display = projectsNameFilter ? 'flex' : 'none'; }
  if (hideToggle) { hideToggle.checked = hideCompletedProjects; }
}

function bindProjectsPageEvents() {
  const newBtn = document.getElementById('newProjectCardBtn');
  if (newBtn) newBtn.onclick = () => openEditProjectModal(null);

  const saveBtn = document.getElementById('saveEditProjectBtn');
  if (saveBtn) saveBtn.onclick = saveEditProject;

  const cancelBtn = document.getElementById('cancelEditProjectBtn');
  if (cancelBtn) cancelBtn.onclick = () => closeModal('editProjectModal');

  // Projects view toggle
  document.querySelectorAll('.pview-btn').forEach(btn => {
    btn.onclick = () => {
      currentProjectsView = btn.dataset.pview;
      document.querySelectorAll('.pview-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('projectKanbanView').style.display = currentProjectsView === 'kanban' ? 'block' : 'none';
      document.getElementById('projectTableView').style.display = currentProjectsView === 'table' ? 'block' : 'none';
      renderProjectsPageView();
    };
  });

  // Edit project modal folder path
  const folderInput = document.getElementById('editProjectFolderPath');
  const openBtn = document.getElementById('openProjectFolderBtn');
  const clearBtn = document.getElementById('clearProjectFolderBtn');
  if (folderInput) {
    folderInput.oninput = () => {
      const has = folderInput.value.trim().length > 0;
      openBtn.style.display = has ? 'inline-flex' : 'none';
      clearBtn.style.display = has ? 'inline-flex' : 'none';
    };
  }
  if (openBtn) openBtn.onclick = () => openFolder(document.getElementById('editProjectFolderPath').value);
  if (clearBtn) clearBtn.onclick = () => {
    document.getElementById('editProjectFolderPath').value = '';
    openBtn.style.display = 'none';
    clearBtn.style.display = 'none';
  };

  // Projects search
  const searchBox = document.getElementById('projectsSearchBox');
  const searchClear = document.getElementById('projectsSearchClear');
  if (searchBox) {
    searchBox.oninput = () => {
      projectsNameFilter = searchBox.value.toLowerCase();
      searchClear.style.display = projectsNameFilter ? 'flex' : 'none';
      renderProjectsPageView();
    };
  }
  if (searchClear) {
    searchClear.onclick = () => {
      projectsNameFilter = '';
      searchBox.value = '';
      searchClear.style.display = 'none';
      renderProjectsPageView();
    };
  }

  // Hide Completed toggle
  const hideToggle = document.getElementById('hideCompletedToggle');
  if (hideToggle) {
    hideToggle.onchange = () => {
      hideCompletedProjects = hideToggle.checked;
      renderProjectsPageView();
    };
  }

  // Hide Archived toggle
  const hideArchivedToggle = document.getElementById('hideArchivedToggle');
  if (hideArchivedToggle) {
    hideArchivedToggle.onchange = () => {
      hideArchivedProjects = hideArchivedToggle.checked;
      renderProjectsPageView();
    };
  }
}

function renderProjectsPageView() {
  if (currentProjectsView === 'kanban') renderProjectsKanban();
  else renderProjectsTable();
}

function renderProjectsKanban() {
  const board = document.getElementById('projectCardsContainer');
  if (!board) return;

  const allColumns = dashboardData.projectColumns || ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'];
  
  // When searching, show all columns with matches (including hidden ones)
  // When not searching, respect hide filters
  const q = projectsNameFilter.trim();
  const matchesSearch = (p) => !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.tags || []).some(tag => tag.toLowerCase().includes(q));
  
  let columns;
  if (q) {
    // Show all columns that have matching projects
    columns = allColumns.filter(col => {
      return dashboardData.projects.some(p => p.status === col && matchesSearch(p));
    });
  } else {
    // No search - apply hide filters
    columns = allColumns
      .filter(c => !(hideCompletedProjects && c === 'Completed'))
      .filter(c => !(hideArchivedProjects && c === 'Archived'));
  }
  
  board.innerHTML = '';

  // Update search meta
  const meta = document.getElementById('projectsSearchMeta');
  if (meta) {
    if (q) {
      const total = dashboardData.projects.length;
      const matched = dashboardData.projects.filter(matchesSearch).length;
      meta.textContent = matched === total ? `All ${total} project${total !== 1 ? 's' : ''}` : `${matched} of ${total} project${total !== 1 ? 's' : ''} match`;
      meta.style.display = 'block';
    } else {
      meta.textContent = '';
      meta.style.display = 'none';
    }
  }

  columns.forEach(col => {
    const allColProjects = dashboardData.projects.filter(p => p.status === col);
    const projects = allColProjects.filter(matchesSearch);
    const colEl = document.createElement('div');
    colEl.className = 'projects-kanban-col';
    colEl.dataset.status = col;
    colEl.innerHTML = `
      <div class="projects-col-header">
        <span class="projects-col-title">${col}</span>
        <span class="projects-col-count">${q ? `${projects.length}/${allColProjects.length}` : projects.length}</span>
      </div>
      <div class="projects-col-cards" data-status="${col}">
        ${projects.map(p => renderProjectCard(p)).join('')}
      </div>
    `;

    // Wire up card buttons
    colEl.querySelectorAll('.proj-view-tasks-btn').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); goToProjectTasks(btn.dataset.id); };
    });

    // Right-click context menu on project cards
    colEl.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showProjectContextMenu(e, card.dataset.projectId);
      });
    });

    board.appendChild(colEl);

    // Card drag between columns (disable when search active to avoid confusion)
    if (!q) {
      Sortable.create(colEl.querySelector('.projects-col-cards'), {
        group: 'project-cards',
        animation: 150,
        ghostClass: 'project-card-ghost',
        onEnd: (evt) => {
          const projId = evt.item.dataset.projectId;
          const newStatus = evt.to.dataset.status;
          const proj = dashboardData.projects.find(p => p.id === projId);
          if (!proj) return;
          
          // Completed guard
          if (newStatus === 'Completed') {
            const incomplete = proj.tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length;
            if (incomplete > 0) {
              showToast(`${incomplete} incomplete task${incomplete > 1 ? 's' : ''} — complete all tasks first`);
              renderProjectsKanban(); // revert
              return;
            }
          }
          
          // Update status if changed
          proj.status = newStatus;
          
          // Update order in dashboardData.projects array
          // Get all project IDs in their new DOM order
          const allCardElements = document.querySelectorAll('.project-card');
          const newOrder = Array.from(allCardElements).map(card => card.dataset.projectId);
          
          // Reorder dashboardData.projects to match DOM order
          const reorderedProjects = [];
          newOrder.forEach(id => {
            const project = dashboardData.projects.find(p => p.id === id);
            if (project) reorderedProjects.push(project);
          });
          
          // Add any projects not in DOM (shouldn't happen, but safety check)
          dashboardData.projects.forEach(p => {
            if (!reorderedProjects.find(rp => rp.id === p.id)) {
              reorderedProjects.push(p);
            }
          });
          
          dashboardData.projects = reorderedProjects;
          saveData();
          renderProjectsKanban();
        }
      });
    }
  });

  // Column drag reorder — preserve hidden columns at end
  Sortable.create(board, {
    animation: 150,
    handle: '.projects-col-header',
    ghostClass: 'projects-col-ghost',
    onEnd: () => {
      const visibleOrder = Array.from(board.querySelectorAll('.projects-kanban-col')).map(el => el.dataset.status);
      const hiddenCols = allColumns.filter(c => !visibleOrder.includes(c));
      dashboardData.projectColumns = [...visibleOrder, ...hiddenCols];
      saveData();
    }
  });

  lucide.createIcons();
}

let currentExportProjectId = null;

function showProjectContextMenu(e, projectId) {
  // Remove any existing context menu
  const existing = document.getElementById('projectContextMenu');
  if (existing) existing.remove();
  
  const menu = document.createElement('div');
  menu.id = 'projectContextMenu';
  menu.className = 'context-menu';
  menu.style.position = 'fixed';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  menu.style.zIndex = '10000';
  
  const proj = dashboardData.projects.find(p => p.id === projectId);
  if (!proj) return;
  
  menu.innerHTML = `
    <div class="context-menu-item" data-action="viewNotes">
      <i data-lucide="sticky-note"></i>
      <span>View Notes</span>
    </div>
    <div class="context-menu-item" data-action="edit">
      <i data-lucide="edit-2"></i>
      <span>Edit Project</span>
    </div>
    <div class="context-menu-item" data-action="viewTasks">
      <i data-lucide="layout-dashboard"></i>
      <span>View Tasks</span>
    </div>
    <div class="context-menu-item" data-action="export">
      <i data-lucide="download"></i>
      <span>Export Project</span>
    </div>
    ${proj.folderPath ? `
    <div class="context-menu-item" data-action="openFolder">
      <i data-lucide="folder-open"></i>
      <span>Open Folder</span>
    </div>
    ` : ''}
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" data-action="delete">
      <i data-lucide="trash-2"></i>
      <span>Delete Project</span>
    </div>
  `;
  
  document.body.appendChild(menu);
  lucide.createIcons();
  
  // Handle menu actions
  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      menu.remove();
      
      switch(action) {
        case 'viewNotes':
          showProjectInfo(projectId);
          break;
        case 'edit':
          openEditProjectModal(projectId);
          break;
        case 'viewTasks':
          goToProjectTasks(projectId);
          break;
        case 'export':
          currentExportProjectId = projectId;
          openModal('exportProjectModal');
          break;
        case 'openFolder':
          if (proj.folderPath) openFolder(proj.folderPath);
          break;
        case 'delete':
          deleteProjectCard(projectId);
          break;
      }
    });
  });
  
  // Close menu on click outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function showProjectInfo(projectId) {
  const proj = dashboardData.projects.find(p => p.id === projectId);
  if (!proj) return;
  
  // Populate modal
  document.getElementById('projectInfoTitle').textContent = proj.name;
  
  const descEl = document.getElementById('projectInfoDescription');
  if (proj.description) {
    descEl.innerHTML = `<strong>Description:</strong><br>${escapeHtml(proj.description)}`;
    descEl.style.display = 'block';
  } else {
    descEl.style.display = 'none';
  }
  
  const notesEl = document.getElementById('projectInfoNotes');
  if (proj.notes) {
    notesEl.textContent = proj.notes;
    notesEl.style.display = 'block';
  } else {
    notesEl.textContent = 'No notes for this project.';
    notesEl.style.display = 'block';
    notesEl.style.fontStyle = 'italic';
    notesEl.style.color = 'var(--text-secondary)';
  }
  
  // Wire up close buttons for this modal specifically
  const projectInfoModal = document.getElementById('projectInfoModal');
  if (projectInfoModal) {
    projectInfoModal.querySelectorAll('.modal-close').forEach(btn => {
      btn.onclick = () => closeModal('projectInfoModal');
    });
  }
  
  openModal('projectInfoModal');
}

function exportProjectAsHTML(projectId) {
  const proj = dashboardData.projects.find(p => p.id === projectId);
  if (!proj) return;
  
  const total = proj.tasks.length;
  const done = proj.tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  
  // Group tasks by status
  const tasksByStatus = {};
  const columns = proj.columns || ['Not Started', 'On Hold', 'In Progress', 'Review', 'Completed'];
  columns.forEach(col => {
    tasksByStatus[col] = proj.tasks.filter(t => t.status === col);
  });
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(proj.name)} - Project Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #eaeaea; background: #1a1a2e; }
    h1 { color: #eaeaea; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; }
    h2 { color: #d4d4d4; margin-top: 30px; border-bottom: 1px solid #2d3748; padding-bottom: 5px; }
    h3 { color: #b8b8b8; margin-top: 25px; }
    .meta { background: #16213e; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #2d3748; }
    .meta-item { margin: 8px 0; }
    .meta-label { font-weight: 600; color: #a0a0a0; }
    .progress-bar { background: #2d3748; height: 24px; border-radius: 12px; overflow: hidden; margin: 10px 0; }
    .progress-fill { background: #0ea5e9; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px; }
    .task { background: #16213e; border: 1px solid #2d3748; border-radius: 6px; padding: 12px; margin: 10px 0; }
    .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .task-title { font-weight: 600; color: #eaeaea; }
    .task-meta { font-size: 13px; color: #a0a0a0; }
    .priority { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .priority-low { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
    .priority-medium { background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); }
    .priority-high { background: rgba(249, 115, 22, 0.15); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.3); }
    .priority-critical { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .checkbox { display: inline-block; width: 16px; height: 16px; border: 2px solid #0ea5e9; border-radius: 3px; margin-right: 6px; vertical-align: middle; }
    .checkbox-checked { background: #0ea5e9; position: relative; }
    .checkbox-checked::after { content: '✓'; color: white; position: absolute; left: 2px; top: -2px; font-size: 12px; }
    .todos { margin-top: 10px; padding-left: 20px; color: #d4d4d4; }
    .todo-item { margin: 5px 0; }
    .overdue { color: #ef4444; font-weight: 600; }
    .tags { margin-top: 8px; }
    .tag { display: inline-block; background: #2d3748; color: #a0a0a0; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 6px; border: 1px solid #374151; }
    @media print { body { margin: 20px; background: white; color: #333; } h1, h2, h3 { color: #333; } .meta, .task { background: white; border: 1px solid #ddd; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(proj.name)}</h1>
  
  <div class="meta">
    <div class="meta-item"><span class="meta-label">Status:</span> ${proj.status}</div>
    ${proj.dueDate ? `<div class="meta-item"><span class="meta-label">Due Date:</span> ${formatDate(proj.dueDate)}</div>` : ''}
    ${proj.description ? `<div class="meta-item"><span class="meta-label">Description:</span> ${escapeHtml(proj.description)}</div>` : ''}
    ${proj.folderPath ? `<div class="meta-item"><span class="meta-label">Folder:</span> ${escapeHtml(proj.folderPath)}</div>` : ''}
    ${proj.tags && proj.tags.length > 0 ? `<div class="meta-item"><span class="meta-label">Tags:</span> ${proj.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
  </div>
  
  <h2>Progress</h2>
  <div class="progress-bar">
    <div class="progress-fill" style="width: ${pct}%">${pct}%</div>
  </div>
  <p>${done} of ${total} tasks completed</p>
`;

  if (proj.notes) {
    html += `\n  <h2>Notes</h2>\n  <div style="white-space: pre-wrap; color: #d4d4d4;">${escapeHtml(proj.notes)}</div>\n`;
  }

  html += `\n  <h2>Tasks</h2>\n`;
  
  if (total === 0) {
    html += `  <p>No tasks yet.</p>\n`;
  } else {
    columns.forEach(col => {
      const tasks = tasksByStatus[col] || [];
      if (tasks.length === 0) return;
      
      html += `\n  <h3>${col} (${tasks.length})</h3>\n`;
      
      tasks.forEach(task => {
        const isCompleted = task.status === 'Completed' || task.status === 'Done';
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
        const doneTodos = task.todos.filter(t => t.done).length;
        const totalTodos = task.todos.length;
        
        html += `  <div class="task">
    <div class="task-header">
      <div class="task-title">
        <span class="checkbox ${isCompleted ? 'checkbox-checked' : ''}"></span>
        ${escapeHtml(task.title)}
      </div>
      <span class="priority priority-${task.priority}">${task.priority}</span>
    </div>
    <div class="task-meta">
      ${task.dueDate ? `<span class="${isOverdue ? 'overdue' : ''}">Due: ${formatDate(task.dueDate)}${isOverdue ? ' (OVERDUE)' : ''}</span>` : ''}
      ${totalTodos > 0 ? ` | To-dos: ${doneTodos}/${totalTodos}` : ''}
    </div>`;
        
        if (task.notes) {
          html += `\n    <div style="margin-top: 8px; color: #a0a0a0; font-size: 14px;">${escapeHtml(task.notes)}</div>`;
        }
        
        if (totalTodos > 0) {
          html += `\n    <div class="todos">`;
          task.todos.forEach(todo => {
            html += `\n      <div class="todo-item"><span class="checkbox ${todo.done ? 'checkbox-checked' : ''}"></span>${escapeHtml(todo.text)}</div>`;
          });
          html += `\n    </div>`;
        }
        
        if (task.tags) {
          const taskTags = task.tags.split(',').map(t => t.trim()).filter(t => t);
          if (taskTags.length > 0) {
            html += `\n    <div class="tags">${taskTags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`;
          }
        }
        
        html += `\n  </div>\n`;
      });
    });
  }
  
  html += `\n  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #2d3748; color: #7f8c8d; font-size: 13px;">
    Exported from Dashboard on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  </div>
</body>
</html>`;

  // Download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${proj.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportProjectAsMarkdown(projectId) {
  const proj = dashboardData.projects.find(p => p.id === projectId);
  if (!proj) return;
  
  const total = proj.tasks.length;
  const done = proj.tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  
  // Group tasks by status
  const tasksByStatus = {};
  const columns = proj.columns || ['Not Started', 'On Hold', 'In Progress', 'Review', 'Completed'];
  columns.forEach(col => {
    tasksByStatus[col] = proj.tasks.filter(t => t.status === col);
  });
  
  let md = `# ${proj.name}\n\n`;
  
  md += `**Status:** ${proj.status}`;
  if (proj.dueDate) md += ` | **Due:** ${formatDate(proj.dueDate)}`;
  md += `\n\n`;
  
  if (proj.description) {
    md += `${proj.description}\n\n`;
  }
  
  if (proj.folderPath) {
    md += `**Folder:** \`${proj.folderPath}\`\n\n`;
  }
  
  if (proj.tags && proj.tags.length > 0) {
    md += `**Tags:** ${proj.tags.map(t => `#${t}`).join(' ')}\n\n`;
  }
  
  md += `---\n\n`;
  md += `## Progress\n\n`;
  md += `${done}/${total} tasks completed (${pct}%)\n\n`;
  
  if (proj.notes) {
    md += `## Notes\n\n${proj.notes}\n\n`;
  }
  
  md += `## Tasks\n\n`;
  
  if (total === 0) {
    md += `No tasks yet.\n\n`;
  } else {
    columns.forEach(col => {
      const tasks = tasksByStatus[col] || [];
      if (tasks.length === 0) return;
      
      md += `### ${col} (${tasks.length})\n\n`;
      
      tasks.forEach(task => {
        const isCompleted = task.status === 'Completed' || task.status === 'Done';
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
        const doneTodos = task.todos.filter(t => t.done).length;
        const totalTodos = task.todos.length;
        
        md += `- [${isCompleted ? 'x' : ' '}] **${task.title}**`;
        md += ` — *${task.priority}*`;
        if (task.dueDate) {
          md += ` | Due: ${formatDate(task.dueDate)}`;
          if (isOverdue) md += ` ⚠️ **OVERDUE**`;
        }
        if (totalTodos > 0) {
          md += ` | Todos: ${doneTodos}/${totalTodos}`;
        }
        md += `\n`;
        
        if (task.notes) {
          md += `  > ${task.notes.replace(/\n/g, '\n  > ')}\n`;
        }
        
        if (totalTodos > 0) {
          task.todos.forEach(todo => {
            md += `  - [${todo.done ? 'x' : ' '}] ${todo.text}\n`;
          });
        }
        
        if (task.tags) {
          const taskTags = task.tags.split(',').map(t => t.trim()).filter(t => t);
          if (taskTags.length > 0) {
            md += `  *Tags: ${taskTags.map(t => `#${t}`).join(' ')}*\n`;
          }
        }
        
        md += `\n`;
      });
    });
  }
  
  md += `---\n`;
  md += `*Exported from Dashboard on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*\n`;
  
  // Download
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${proj.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderProjectCard(proj) {
  const total = proj.tasks.length;
  const done  = proj.tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = proj.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed' && t.status !== 'Done').length;

  // Project-level overdue: project's own due date is past and not completed
  const projOverdue = proj.dueDate && new Date(proj.dueDate) < new Date() && proj.status !== 'Completed';

  // Earliest upcoming task due date
  const upcomingTasks = proj.tasks
    .filter(t => t.dueDate && t.status !== 'Completed' && t.status !== 'Done' && new Date(t.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const nextTask = upcomingTasks[0];

  const hasFolder = proj.folderPath && proj.folderPath.trim().length > 0;
  
  // Show ARCHIVED badge when searching and project is archived
  const showArchivedBadge = projectsNameFilter.trim() && proj.status === 'Archived';

  return `
    <div class="project-card${projOverdue ? ' project-card-overdue' : ''}" data-project-id="${proj.id}">
      <div class="project-card-header">
        <h3 class="project-card-title">
          ${escapeHtml(proj.name)}
          ${showArchivedBadge ? '<span class="archived-badge">ARCHIVED</span>' : ''}
        </h3>
      </div>
      ${proj.description ? `<p class="project-card-desc">${escapeHtml(proj.description)}</p>` : '<p class="project-card-desc project-card-desc-empty">&nbsp;</p>'}
      ${proj.dueDate ? `<div class="project-card-due${projOverdue ? ' project-due-overdue' : ''}"><i data-lucide="calendar"></i> Due ${formatDate(proj.dueDate)}${projOverdue ? ' <span class="proj-overdue-badge">OVERDUE</span>' : (overdue > 0 ? ` <span class="proj-overdue-badge">${overdue} task${overdue > 1 ? 's' : ''} overdue</span>` : '')}</div>` : `<div class="project-card-due-empty"></div>`}
      ${nextTask ? `<div class="project-card-next-task"><i data-lucide="arrow-right"></i> Next: <strong>${escapeHtml(nextTask.title)}</strong> — ${formatDate(nextTask.dueDate)}</div>` : `<div class="project-card-next-task-empty"></div>`}
      <div class="project-card-progress">
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <span class="progress-pct">${pct}%</span>
      </div>
      <div class="project-card-stats">
        <span class="proj-stat"><i data-lucide="list-checks"></i> ${done}/${total} done</span>
        ${hasFolder ? `<span class="proj-stat proj-stat-folder" title="${proj.folderPath}"><i data-lucide="folder"></i></span>` : ''}
        ${proj.notes ? `<span class="proj-stat" title="Has notes"><i data-lucide="sticky-note"></i></span>` : ''}
        ${(proj.tags && proj.tags.length > 0) ? proj.tags.map(tag => `<span class="proj-stat proj-tag">${tag}</span>`).join('') : ''}
      </div>
      <button class="btn btn-primary proj-view-tasks-btn" data-id="${proj.id}">
        <i data-lucide="layout-dashboard"></i> View Tasks
      </button>
    </div>
  `;
}

function sortProjects(projects) {
  if (!projectsSortField) return projects;
  return [...projects].sort((a, b) => {
    let av, bv;
    switch (projectsSortField) {
      case 'name':
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
        break;
      case 'status':
        av = (a.status || '').toLowerCase();
        bv = (b.status || '').toLowerCase();
        break;
      case 'dueDate':
        av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        break;
      case 'progress':
        const aDone = a.tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
        const aTotal = a.tasks.length;
        const bDone = b.tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
        const bTotal = b.tasks.length;
        av = aTotal > 0 ? aDone / aTotal : 0;
        bv = bTotal > 0 ? bDone / bTotal : 0;
        break;
      case 'tasks':
        av = a.tasks.length;
        bv = b.tasks.length;
        break;
      default:
        return 0;
    }
    if (av < bv) return projectsSortDir === 'asc' ? -1 : 1;
    if (av > bv) return projectsSortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderProjectsTable() {
  const wrapper = document.getElementById('projectTableContainer');
  if (!wrapper) return;

  if (!dashboardData.projects || dashboardData.projects.length === 0) {
    wrapper.innerHTML = '<div class="table-empty">No projects yet. Click <strong>New Project</strong> to get started.</div>';
    return;
  }

  const q = projectsNameFilter.trim();
  const matchesSearch = (p) => !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.tags || []).some(tag => tag.toLowerCase().includes(q));
  const projects = dashboardData.projects
    .filter(p => !(hideCompletedProjects && p.status === 'Completed'))
    .filter(p => !(hideArchivedProjects && p.status === 'Archived'))
    .filter(matchesSearch);

  if (projects.length === 0) {
    wrapper.innerHTML = '<div class="table-empty">No projects match your filter.</div>';
    return;
  }

  const sortedProjects = sortProjects(projects);
  const today = new Date(); today.setHours(0,0,0,0);
  
  const thSort = (field, label) => {
    const active = projectsSortField === field;
    const icon = active ? (projectsSortDir === 'asc' ? ' &#9650;' : ' &#9660;') : ' <span class="sort-hint">&#8597;</span>';
    return `<th class="sort-header" data-sort="${field}">${label}${icon}</th>`;
  };

  wrapper.innerHTML = `
    <table class="task-table">
      <thead>
        <tr>
          ${thSort('name','Project')}
          ${thSort('status','Status')}
          ${thSort('dueDate','Due Date')}
          ${thSort('progress','Progress')}
          ${thSort('tasks','Tasks')}
          <th>Folder</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${sortedProjects.map(proj => {
          const total = proj.tasks.length;
          const done  = proj.tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
          const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
          const hasFolder = proj.folderPath && proj.folderPath.trim().length > 0;
          const projOverdue = proj.dueDate && new Date(proj.dueDate) < today && proj.status !== 'Completed';
          return `
            <tr>
              <td>
                <div class="table-task-title">${proj.name}</div>
                ${proj.description ? `<div class="table-task-notes">${proj.description}</div>` : ''}
                ${(proj.tags && proj.tags.length > 0) ? `<div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">${proj.tags.map(tag => `<span class="proj-stat proj-tag">${tag}</span>`).join('')}</div>` : ''}
              </td>
              <td><span class="proj-status-badge proj-status-${proj.status.toLowerCase().replace(' ','-')}">${proj.status}</span></td>
              <td class="${projOverdue ? 'overdue' : ''}">${proj.dueDate ? formatDate(proj.dueDate) : '<span style="color:var(--text-secondary)">—</span>'}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="progress-bar-track" style="width:80px"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
                  <span style="font-size:12px">${pct}%</span>
                </div>
              </td>
              <td>${done}/${total}</td>
              <td>${hasFolder ? `<button class="icon-btn" onclick="openFolder('${proj.folderPath.replace(/'/g, "\\\'")}')" ><i data-lucide="folder-open"></i></button>` : '—'}</td>
              <td>
                <div style="display:flex;gap:4px;">
                  <button class="icon-btn" onclick="goToProjectTasks('${proj.id}')"><i data-lucide="layout-dashboard"></i></button>
                  <button class="icon-btn" onclick="openEditProjectModal('${proj.id}')"><i data-lucide="edit-2"></i></button>
                  <button class="icon-btn" onclick="deleteProjectCard('${proj.id}')"><i data-lucide="trash-2"></i></button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  // Sortable headers
  wrapper.querySelectorAll('.sort-header').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (projectsSortField === field) {
        projectsSortDir = projectsSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        projectsSortField = field;
        projectsSortDir = 'asc';
      }
      renderProjectsTable();
    });
  });
  
  // Right-click context menu on project rows
  wrapper.querySelectorAll('tbody tr').forEach(row => {
    const projectId = sortedProjects[Array.from(row.parentElement.children).indexOf(row)].id;
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showProjectContextMenu(e, projectId);
    });
  });
  
  lucide.createIcons();
}
function openEditProjectModal(projectId) {
  editingProjectId = projectId;
  const proj = projectId ? dashboardData.projects.find(p => p.id === projectId) : null;
  document.getElementById('editProjectModalTitle').textContent = proj ? 'Edit Project' : 'New Project';
  document.getElementById('editProjectName').value = proj ? proj.name : '';
  document.getElementById('editProjectDescription').value = proj ? (proj.description || '') : '';
  document.getElementById('editProjectNotes').value = proj ? (proj.notes || '') : '';
  document.getElementById('editProjectDueDate').value = proj ? (proj.dueDate || '') : '';
  document.getElementById('editProjectStatus').value = proj ? (proj.status || 'Planning') : 'Planning';
  document.getElementById('editProjectTags').value = proj ? (proj.tags || []).join(', ') : '';

  const folderInput = document.getElementById('editProjectFolderPath');
  const openBtn = document.getElementById('openProjectFolderBtn');
  const clearBtn = document.getElementById('clearProjectFolderBtn');
  folderInput.value = proj ? (proj.folderPath || '') : '';
  const has = folderInput.value.trim().length > 0;
  openBtn.style.display = has ? 'inline-flex' : 'none';
  clearBtn.style.display = has ? 'inline-flex' : 'none';

  // Wire up close buttons for this modal specifically
  const editProjectModal = document.getElementById('editProjectModal');
  if (editProjectModal) {
    editProjectModal.querySelectorAll('.modal-close').forEach(btn => {
      btn.onclick = () => closeModal('editProjectModal');
    });
  }

  openModal('editProjectModal');
  setTimeout(() => document.getElementById('editProjectName').focus(), 100);
}

function saveEditProject() {
  const name = document.getElementById('editProjectName').value.trim();
  if (!name) { showToast('Project name is required'); return; }
  const description = document.getElementById('editProjectDescription').value.trim();
  const notes = document.getElementById('editProjectNotes').value.trim();
  const dueDate = document.getElementById('editProjectDueDate').value;
  const status = document.getElementById('editProjectStatus').value;
  const folderPath = document.getElementById('editProjectFolderPath').value.trim();
  const tagsInput = document.getElementById('editProjectTags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

  if (editingProjectId) {
    const proj = dashboardData.projects.find(p => p.id === editingProjectId);
    if (proj) { proj.name = name; proj.description = description; proj.notes = notes; proj.dueDate = dueDate; proj.folderPath = folderPath; proj.status = status; proj.tags = tags; }
  } else {
    dashboardData.projects.push({
      id: 'proj_' + Date.now(),
      name, description, notes, dueDate, folderPath, tags,
      status: status,
      columns: ['Not Started', 'On Hold', 'In Progress', 'Review', 'Completed'],
      tasks: []
    });
  }
  saveData();
  closeModal('editProjectModal');
  renderProjectsPageView();
}

function deleteProjectCard(projectId) {
  const proj = dashboardData.projects.find(p => p.id === projectId);
  if (!proj) return;
  if (!confirm(`Delete project "${proj.name}" and all its tasks?`)) return;
  dashboardData.projects = dashboardData.projects.filter(p => p.id !== projectId);
  if (dashboardData.activeProjectId === projectId) {
    dashboardData.activeProjectId = dashboardData.projects[0]?.id || null;
  }
  saveData();
  renderProjectsPageView();
}

function goToProjectTasks(projectId) {
  dashboardData.activeProjectId = projectId;
  saveData();
  switchPage('tasks');
}

// ---- Tasks page ----
function initTasksPage() {
  renderProjectSelector();
  renderTasksView();
  bindTasksPageEvents();
}

function bindTasksPageEvents() {
  // View toggle (tasks page only — data-view attribute)
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.onclick = () => {
      currentView = btn.dataset.view;
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('kanbanView').style.display = currentView === 'kanban' ? 'block' : 'none';
      document.getElementById('tableView').style.display  = currentView === 'table'  ? 'block' : 'none';
      renderTasksView();
    };
  });

  // Project selector change
  const sel = document.getElementById('projectSelector');
  if (sel) {
    sel.onchange = () => {
      dashboardData.activeProjectId = sel.value;
      saveData();
      renderTasksView();
    };
  }

  // Add task button
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) addTaskBtn.onclick = () => openTaskModal(null);

  // Save task
  const saveTaskBtn = document.getElementById('saveTaskBtn');
  if (saveTaskBtn) saveTaskBtn.onclick = saveTask;

  const cancelTaskBtn = document.getElementById('cancelTaskBtn');
  if (cancelTaskBtn) cancelTaskBtn.onclick = () => closeModal('taskModal');

  const createProjectBtn = document.getElementById('createProjectBtn');
  if (createProjectBtn) createProjectBtn.onclick = createNewProject;

  const addColumnBtn = document.getElementById('addColumnBtn');
  if (addColumnBtn) addColumnBtn.onclick = addColumnToProject;

  // Todo item inside task modal
  const addTodoBtn = document.getElementById('addTodoItemBtn');
  if (addTodoBtn) addTodoBtn.onclick = addTempTodoItem;

  const newTodoInput = document.getElementById('newTodoInput');
  if (newTodoInput) {
    newTodoInput.onkeypress = (e) => { if (e.key === 'Enter') { e.preventDefault(); addTempTodoItem(); } };
  }

  // Task folder path wiring
  const taskFolderInput = document.getElementById('taskFolderPath');
  const openTaskFolderBtn = document.getElementById('openTaskFolderBtn');
  const clearTaskFolderBtn = document.getElementById('clearTaskFolderBtn');
  if (taskFolderInput) {
    taskFolderInput.oninput = () => {
      const has = taskFolderInput.value.trim().length > 0;
      if (openTaskFolderBtn) openTaskFolderBtn.style.display = has ? 'inline-flex' : 'none';
      if (clearTaskFolderBtn) clearTaskFolderBtn.style.display = has ? 'inline-flex' : 'none';
    };
  }
  if (openTaskFolderBtn) openTaskFolderBtn.onclick = () => openFolder(document.getElementById('taskFolderPath').value);
  if (clearTaskFolderBtn) clearTaskFolderBtn.onclick = () => {
    document.getElementById('taskFolderPath').value = '';
    if (openTaskFolderBtn) openTaskFolderBtn.style.display = 'none';
    if (clearTaskFolderBtn) clearTaskFolderBtn.style.display = 'none';
  };

  // Project search
  const searchInput = document.getElementById('projectSearchBox');
  const clearBtn = document.getElementById('projectSearchClear');
  if (searchInput) {
    searchInput.oninput = () => {
      currentProjectSearch = searchInput.value.toLowerCase().trim();
      clearBtn.style.display = currentProjectSearch ? 'flex' : 'none';
      renderTasksView();
    };
  }
  if (clearBtn) {
    clearBtn.onclick = () => {
      currentProjectSearch = '';
      if (searchInput) searchInput.value = '';
      clearBtn.style.display = 'none';
      renderTasksView();
    };
  }

  const hideDoneToggle = document.getElementById('hideDoneToggle');
  if (hideDoneToggle) {
    hideDoneToggle.onchange = () => {
      hideDone = hideDoneToggle.checked;
      renderTasksView();
    };
  }
}

function renderProjectSelector() {
  const sel = document.getElementById('projectSelector');
  if (!sel) return;
  // Filter out archived projects from dropdown
  const activeProjects = dashboardData.projects.filter(p => p.status !== 'Archived');
  sel.innerHTML = activeProjects.map(p =>
    `<option value="${p.id}" ${p.id === dashboardData.activeProjectId ? 'selected' : ''}>${p.name}</option>`
  ).join('');
}

function renderTasksView() {
  if (currentView === 'kanban') renderKanban();
  else renderTable();
}

// -------- SEARCH FILTER --------

function filterProjectTasks(tasks) {
  let result = tasks;
  if (hideDone) result = result.filter(t => t.status !== 'Completed' && t.status !== 'Done');
  if (!currentProjectSearch) return result;
  return result.filter(t => {
    const title = (t.title || '').toLowerCase();
    const notes = (t.notes || '').toLowerCase();
    const tags  = (t.tags  || '').toLowerCase();
    const todos = (t.todos || []).map(td => td.text.toLowerCase()).join(' ');
    return title.includes(currentProjectSearch)
        || notes.includes(currentProjectSearch)
        || tags.includes(currentProjectSearch)
        || todos.includes(currentProjectSearch);
  });
}

const PRIORITY_ORDER = { low: 1, medium: 2, high: 3, critical: 4 };

function sortProjectTasks(tasks) {
  if (!currentSortField) return tasks;
  return [...tasks].sort((a, b) => {
    let av, bv;
    switch (currentSortField) {
      case 'title':
        av = (a.title || '').toLowerCase(); bv = (b.title || '').toLowerCase();
        break;
      case 'status':
        av = (a.status || '').toLowerCase(); bv = (b.status || '').toLowerCase();
        break;
      case 'priority':
        av = PRIORITY_ORDER[a.priority] || 0; bv = PRIORITY_ORDER[b.priority] || 0;
        break;
      case 'dueDate':
        av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        break;
      case 'progress':
        av = a.todos.length ? (a.todos.filter(t=>t.done).length / a.todos.length) : 0;
        bv = b.todos.length ? (b.todos.filter(t=>t.done).length / b.todos.length) : 0;
        break;
      default: return 0;
    }
    if (av < bv) return currentSortDir === 'asc' ? -1 : 1;
    if (av > bv) return currentSortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function updateProjectSearchMeta(total, filtered) {
  const meta = document.getElementById('projectSearchMeta');
  if (!meta) return;
  if (!currentProjectSearch) { meta.textContent = ''; return; }
  meta.textContent = filtered === total
    ? `All ${total} task${total !== 1 ? 's' : ''} match`
    : `${filtered} of ${total} task${total !== 1 ? 's' : ''} match`;
}

// -------- KANBAN --------

function renderKanban() {
  const project = getActiveProject();
  if (!project) return;

  const filteredTasks = filterProjectTasks(project.tasks);
  updateProjectSearchMeta(project.tasks.length, filteredTasks.length);

  const board = document.getElementById('kanbanBoard');
  board.innerHTML = '';

  const visibleColumns = hideDone ? project.columns.filter(col => col !== 'Done' && col !== 'Completed') : project.columns;
  visibleColumns.forEach(col => {
    const tasks = filteredTasks.filter(t => t.status === col);
    const colEl = document.createElement('div');
    colEl.className = 'kanban-column';
    colEl.dataset.status = col;
    colEl.innerHTML = `
      <div class="kanban-column-header">
        <span class="kanban-col-title">${col}</span>
        <span class="kanban-col-count">${tasks.length}</span>
      </div>
      <div class="kanban-cards" data-status="${col}">
        ${tasks.map(t => renderTaskCard(t)).join('')}
      </div>
    `;

    // Card click events
    colEl.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        showTaskInfo(card.dataset.taskId);
      });
    });

    // Right-click context menu on task cards
    colEl.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showTaskContextMenu(e, card.dataset.taskId);
      });
    });

    board.appendChild(colEl);

    // SortableJS for cross-column drag
    Sortable.create(colEl.querySelector('.kanban-cards'), {
      group: `tasks-${project.id}`,
      animation: 150,
      ghostClass: 'kanban-ghost',
      dragClass: 'kanban-drag',
      onEnd: (evt) => {
        const taskId = evt.item.dataset.taskId;
        const newStatus = evt.to.dataset.status;
        const task = project.tasks.find(t => t.id === taskId);
        if (task) {
          task.status = newStatus;
          saveData();
          renderKanban(); // refresh counts
        }
      }
    });
  });

  // Column drag reorder
  Sortable.create(board, {
    animation: 150,
    handle: '.kanban-column-header',
    ghostClass: 'kanban-column-ghost',
    onEnd: (evt) => {
      // Reorder project.columns to match DOM order
      const allColEls = board.querySelectorAll('.kanban-column');
      const newOrder = Array.from(allColEls).map(el => el.dataset.status);
      // Rebuild full columns array: new visible order + any hidden columns appended at end
      const hiddenCols = project.columns.filter(c => !newOrder.includes(c));
      project.columns = [...newOrder, ...hiddenCols];
      saveData();
    }
  });

  lucide.createIcons();
}

function renderTaskCard(task) {
  const priorityClass = `priority-${task.priority}`;
  const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
  const doneCount = task.todos.filter(t => t.done).length;
  const totalTodos = task.todos.length;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done' && task.status !== 'Completed';

  return `
    <div class="task-card" data-task-id="${task.id}">
      <div class="task-card-header">
        <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
      </div>
      <div class="task-card-title">${task.title}</div>
      <div class="task-card-footer">
        ${task.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}"><i data-lucide="calendar"></i>${formatDate(task.dueDate)}</span>` : ''}
        ${totalTodos > 0 ? `<span class="task-todos-badge"><i data-lucide="check-square"></i>${doneCount}/${totalTodos}</span>` : ''}
        ${task.folderPath ? `<span class="task-folder-badge" title="${task.folderPath}"><i data-lucide="folder"></i></span>` : ''}
        ${task.tags ? `<span class="task-tag">${task.tags.split(',')[0].trim()}</span>` : ''}
      </div>
    </div>
  `;
}

// -------- TABLE --------

function renderTable() {
  const project = getActiveProject();
  if (!project) return;
  const wrapper = document.getElementById('taskTable');
  const filteredTasks = filterProjectTasks(project.tasks);
  updateProjectSearchMeta(project.tasks.length, filteredTasks.length);

  if (project.tasks.length === 0) {
    wrapper.innerHTML = `<div class="table-empty">No tasks yet. Click <strong>Add Task</strong> to get started.</div>`;
    return;
  }

  if (filteredTasks.length === 0) {
    wrapper.innerHTML = `<div class="table-empty">No tasks match your search.</div>`;
    return;
  }

  const sortedTasks = sortProjectTasks(filteredTasks);
  const thSort = (field, label) => {
    const active = currentSortField === field;
    const icon = active ? (currentSortDir === 'asc' ? ' &#9650;' : ' &#9660;') : ' <span class="sort-hint">&#8597;</span>';
    return `<th class="sort-header" data-sort="${field}">${label}${icon}</th>`;
  };
  wrapper.innerHTML = `
    <table class="task-table">
      <thead>
        <tr>
          ${thSort('title','Title')}
          ${thSort('status','Status')}
          ${thSort('priority','Priority')}
          ${thSort('dueDate','Due Date')}
          ${thSort('progress','Progress')}
          <th>Folder</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${sortedTasks.map(task => {
          const doneCount = task.todos.filter(t => t.done).length;
          const totalTodos = task.todos.length;
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done' && task.status !== 'Completed';
          return `
            <tr class="task-row" data-task-id="${task.id}">
              <td>
                <div class="table-task-title">${task.title}${task.notes ? ' <span class="notes-dot" title="Has notes">●</span>' : ''}</div>
                ${task.tags ? `<div style="margin-top:4px;"><span class="task-tag">${task.tags}</span></div>` : ''}
              </td>
              <td><span class="status-pill">${task.status}</span></td>
              <td><span class="priority-badge priority-${task.priority}">${task.priority}</span></td>
              <td class="${isOverdue ? 'overdue' : ''}">${task.dueDate ? formatDate(task.dueDate) : '<span style="color:var(--text-secondary)">—</span>'}</td>
              <td>${totalTodos > 0 ? `<div class="todo-progress"><div class="todo-progress-bar" style="width:${Math.round(doneCount/totalTodos*100)}%"></div></div><small>${doneCount}/${totalTodos}</small>` : '<span style="color:var(--text-secondary)">—</span>'}</td>
              <td>${task.folderPath ? `<button class="icon-btn" onclick="openFolder('${task.folderPath.replace(/'/g,"\\'")}')"><i data-lucide="folder-open"></i></button>` : '<span style="color:var(--text-secondary)">—</span>'}</td>
              <td>
                <div style="display:flex;gap:4px;">
                  <button class="icon-btn table-edit-btn" data-task-id="${task.id}" title="Edit"><i data-lucide="edit-2"></i></button>
                  <button class="icon-btn table-delete-btn" data-task-id="${task.id}" title="Delete"><i data-lucide="trash-2"></i></button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Sortable headers
  wrapper.querySelectorAll('.sort-header').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSortField === field) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortField = field;
        currentSortDir = 'asc';
      }
      renderTable();
    });
  });

  wrapper.querySelectorAll('.task-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn')) return;
      showTaskInfo(row.dataset.taskId);
    });
    
    // Right-click context menu on task rows
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showTaskContextMenu(e, row.dataset.taskId);
    });
  });

  wrapper.querySelectorAll('.table-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openTaskModal(btn.dataset.taskId); });
  });

  wrapper.querySelectorAll('.table-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(btn.dataset.taskId); });
  });

  lucide.createIcons();
}

// -------- TASK MODAL --------

function showTaskContextMenu(e, taskId) {
  // Remove any existing context menu
  const existing = document.getElementById('taskContextMenu');
  if (existing) existing.remove();
  
  const project = getActiveProject();
  if (!project) return;
  
  const task = project.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  const menu = document.createElement('div');
  menu.id = 'taskContextMenu';
  menu.className = 'context-menu';
  menu.style.position = 'fixed';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  menu.style.zIndex = '10000';
  
  menu.innerHTML = `
    <div class="context-menu-item" data-action="viewInfo">
      <i data-lucide="file-text"></i>
      <span>View Info</span>
    </div>
    <div class="context-menu-item" data-action="edit">
      <i data-lucide="edit-2"></i>
      <span>Edit Task</span>
    </div>
    ${task.folderPath ? `
    <div class="context-menu-item" data-action="openFolder">
      <i data-lucide="folder-open"></i>
      <span>Open Folder</span>
    </div>
    ` : ''}
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" data-action="delete">
      <i data-lucide="trash-2"></i>
      <span>Delete Task</span>
    </div>
  `;
  
  document.body.appendChild(menu);
  lucide.createIcons();
  
  // Handle menu actions
  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      menu.remove();
      
      switch(action) {
        case 'viewInfo':
          showTaskInfo(taskId);
          break;
        case 'edit':
          openTaskModal(taskId);
          break;
        case 'openFolder':
          if (task.folderPath) openFolder(task.folderPath);
          break;
        case 'delete':
          deleteTask(taskId);
          break;
      }
    });
  });
  
  // Close menu on click outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function showTaskInfo(taskId) {
  const project = getActiveProject();
  if (!project) return;
  
  const task = project.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  // Set title
  const titleEl = document.getElementById('taskInfoTitle');
  if (!titleEl) return;
  titleEl.textContent = task.title;
  
  // Set meta info (priority, due date, status)
  const metaEl = document.getElementById('taskInfoMeta');
  if (!metaEl) return;
  
  const priorityColors = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
  };
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done' && task.status !== 'Completed';
  
  let metaHTML = `<span style="color: ${priorityColors[task.priority]}; font-weight: 600; text-transform: uppercase; font-size: 0.85rem;">${task.priority}</span>`;
  metaHTML += ` • <span>${task.status}</span>`;
  if (task.dueDate) {
    metaHTML += ` • <span style="${isOverdue ? 'color: #ef4444; font-weight: 600;' : ''}">Due: ${formatDate(task.dueDate)}${isOverdue ? ' (OVERDUE)' : ''}</span>`;
  }
  if (task.tags) {
    metaHTML += ` • <span>${task.tags}</span>`;
  }
  metaEl.innerHTML = metaHTML;
  
  // Set notes
  const notesEl = document.getElementById('taskInfoNotes');
  if (notesEl) {
    if (task.notes && task.notes.trim()) {
      notesEl.innerHTML = `<div style="margin-bottom: 8px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; font-size: 0.85rem;">Notes</div><div style="white-space: pre-wrap; color: var(--text-primary);">${escapeHtml(task.notes)}</div>`;
      notesEl.style.display = 'block';
    } else {
      notesEl.style.display = 'none';
    }
  }
  
  // Set todos
  const todosEl = document.getElementById('taskInfoTodos');
  if (todosEl) {
    if (task.todos && task.todos.length > 0) {
      const doneCount = task.todos.filter(t => t.done).length;
      let todosHTML = `<div style="margin-bottom: 8px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; font-size: 0.85rem;">Todos (${doneCount}/${task.todos.length})</div>`;
      todosHTML += '<div style="display: flex; flex-direction: column; gap: 6px;">';
      task.todos.forEach(todo => {
        todosHTML += `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: ${todo.done ? 'var(--accent)' : 'var(--text-secondary)'}; font-size: 16px;">${todo.done ? '✓' : '☐'}</span>
            <span style="color: var(--text-primary); ${todo.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHtml(todo.text)}</span>
          </div>
        `;
      });
      todosHTML += '</div>';
      todosEl.innerHTML = todosHTML;
      todosEl.style.display = 'block';
    } else {
      todosEl.style.display = 'none';
    }
  }
  
  // Wire up Edit button
  const editBtn = document.getElementById('editTaskFromInfoBtn');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal('taskInfoModal');
      openTaskModal(taskId);
    };
  }
  
  // Wire up close buttons for this modal specifically
  const taskInfoModal = document.getElementById('taskInfoModal');
  if (taskInfoModal) {
    taskInfoModal.querySelectorAll('.modal-close').forEach(btn => {
      btn.onclick = () => closeModal('taskInfoModal');
    });
  }
  
  openModal('taskInfoModal');
}

// Modal utility functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  } else {
    console.error('Modal not found:', modalId);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function openTaskModal(taskId) {
  const project = getActiveProject();
  currentEditingTaskId = taskId;

  // Populate status dropdown from project columns
  const statusSel = document.getElementById('taskStatus');
  statusSel.innerHTML = project.columns.map(c => `<option value="${c}">${c}</option>`).join('');

  if (taskId) {
    const task = project.tasks.find(t => t.id === taskId);
    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskNotes').value = task.notes || '';
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDueDate').value = task.dueDate || '';
    document.getElementById('taskTags').value = task.tags || '';
    tempTodos = task.todos.map(t => ({ ...t }));
    setTaskFolderPath(task.folderPath || '');
  } else {
    document.getElementById('taskModalTitle').textContent = 'Add Task';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskNotes').value = '';
    document.getElementById('taskStatus').value = project.columns[1] || project.columns[0];
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskTags').value = '';
    tempTodos = [];
    setTaskFolderPath('');
  }

  renderTodoList();
  
  // Wire up close buttons for this modal specifically
  const taskModal = document.getElementById('taskModal');
  if (taskModal) {
    taskModal.querySelectorAll('.modal-close').forEach(btn => {
      btn.onclick = () => closeModal('taskModal');
    });
  }
  
  openModal('taskModal');
  document.getElementById('taskTitle').focus();
}

function setTaskFolderPath(path) {
  const input = document.getElementById('taskFolderPath');
  const openBtn = document.getElementById('openTaskFolderBtn');
  const clearBtn = document.getElementById('clearTaskFolderBtn');
  if (!input) return;
  input.value = path;
  const has = path.length > 0;
  if (openBtn) openBtn.style.display = has ? 'inline-flex' : 'none';
  if (clearBtn) clearBtn.style.display = has ? 'inline-flex' : 'none';
}

function renderTodoList() {
  const list = document.getElementById('todoList');
  if (tempTodos.length === 0) {
    list.innerHTML = '<div class="todo-empty">No items yet</div>';
    return;
  }
  list.innerHTML = tempTodos.map((todo, i) => `
    <div class="todo-item">
      <input type="checkbox" class="todo-check" data-index="${i}" ${todo.done ? 'checked' : ''}>
      <input type="text" class="todo-text-input form-control" data-index="${i}" value="${todo.text}">
      <button type="button" class="todo-delete" data-index="${i}" title="Remove">×</button>
    </div>
  `).join('');

  list.querySelectorAll('.todo-check').forEach(cb => {
    cb.onchange = () => { tempTodos[parseInt(cb.dataset.index)].done = cb.checked; renderTodoList(); };
  });
  list.querySelectorAll('.todo-text-input').forEach(inp => {
    inp.oninput = () => { tempTodos[parseInt(inp.dataset.index)].text = inp.value; };
  });
  list.querySelectorAll('.todo-delete').forEach(btn => {
    btn.onclick = () => { tempTodos.splice(parseInt(btn.dataset.index), 1); renderTodoList(); };
  });
}

function addTempTodoItem() {
  const input = document.getElementById('newTodoInput');
  const text = input.value.trim();
  if (!text) return;
  tempTodos.push({ id: 'todo_' + Date.now(), text, done: false });
  input.value = '';
  renderTodoList();
  input.focus();
}

function saveTask() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { alert('Title is required'); return; }

  const project = getActiveProject();
  const taskData = {
    title,
    notes: document.getElementById('taskNotes').value.trim(),
    status: document.getElementById('taskStatus').value,
    priority: document.getElementById('taskPriority').value,
    dueDate: document.getElementById('taskDueDate').value,
    tags: document.getElementById('taskTags').value.trim(),
    todos: [...tempTodos],
    folderPath: (document.getElementById('taskFolderPath')?.value || '').trim()
  };

  if (currentEditingTaskId) {
    const task = project.tasks.find(t => t.id === currentEditingTaskId);
    Object.assign(task, taskData);
  } else {
    project.tasks.push({ id: 'task_' + Date.now(), createdAt: new Date().toISOString(), ...taskData });
  }

  saveData();
  closeModal('taskModal');
  renderTasksView();
}

function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;
  const project = getActiveProject();
  project.tasks = project.tasks.filter(t => t.id !== taskId);
  saveData();
  renderTasksView();
}

// -------- PROJECT MANAGEMENT --------

function createNewProject() {
  const name = document.getElementById('newProjectName').value.trim();
  if (!name) { alert('Project name is required'); return; }
  const newProject = {
    id: 'proj_' + Date.now(),
    name,
    description: '',
    dueDate: '',
    folderPath: '',
    status: 'Planning',
    columns: ['Not Started', 'On Hold', 'In Progress', 'Review', 'Completed'],
    tasks: []
  };
  dashboardData.projects.push(newProject);
  dashboardData.activeProjectId = newProject.id;
  saveData();
  document.getElementById('newProjectName').value = '';
  renderProjectSelector();
  renderManageProjectModal();
  renderTasksView();
  showToast(`Project "${name}" created!`);
}

function addColumnToProject() {
  const input = document.getElementById('newColumnInput');
  const name = input.value.trim();
  if (!name) return;
  const project = getActiveProject();
  if (project.columns.includes(name)) { alert('Column already exists'); return; }
  project.columns.push(name);
  saveData();
  input.value = '';
  renderManageProjectModal();
  if (currentView === 'kanban') renderKanban();
}

function renderManageProjectModal() {
  const project = getActiveProject();

  // Project list with inline rename
  const projectList = document.getElementById('projectList');
  projectList.innerHTML = dashboardData.projects.map(p => `
    <div class="feed-item project-list-item" data-proj-id="${p.id}">
      <div class="project-name-wrapper">
        <input type="text" class="project-rename-input form-control" value="${p.name}" data-proj-id="${p.id}"
          style="font-weight:${p.id === dashboardData.activeProjectId ? '600' : '400'};
                 color:${p.id === dashboardData.activeProjectId ? 'var(--accent)' : 'var(--text-primary)'};">
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="btn btn-secondary proj-rename-save" data-proj-id="${p.id}" style="padding:4px 10px;font-size:12px;">Rename</button>
        <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="setActiveProject('${p.id}')">Select</button>
        ${dashboardData.projects.length > 1 ? `<button class="btn-remove" onclick="deleteProject('${p.id}')">Delete</button>` : ''}
      </div>
    </div>
  `).join('');

  // Rename save handlers
  projectList.querySelectorAll('.proj-rename-save').forEach(btn => {
    btn.onclick = () => {
      const projId = btn.dataset.projId;
      const input = projectList.querySelector(`.project-rename-input[data-proj-id="${projId}"]`);
      const newName = input.value.trim();
      if (!newName) { showToast('Name cannot be empty'); return; }
      renameProject(projId, newName);
    };
  });

  // Also save on Enter in rename input
  projectList.querySelectorAll('.project-rename-input').forEach(inp => {
    inp.onkeypress = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const saveBtn = projectList.querySelector(`.proj-rename-save[data-proj-id="${inp.dataset.projId}"]`);
        if (saveBtn) saveBtn.click();
      }
    };
  });

  // Columns for active project
  const columnsList = document.getElementById('columnsList');
  columnsList.innerHTML = project.columns.map((col, i) => `
    <div class="feed-item">
      <span>${col}</span>
      ${project.columns.length > 1 ? `<button class="btn-remove" onclick="removeColumn(${i})">Remove</button>` : ''}
    </div>
  `).join('');
}

function setActiveProject(projectId) {
  dashboardData.activeProjectId = projectId;
  saveData();
  currentProjectSearch = '';
  hideDone = false;
  currentSortField = null;
  currentSortDir = 'asc';
  const sb = document.getElementById('projectSearchBox');
  if (sb) sb.value = '';
  const cb = document.getElementById('projectSearchClear');
  if (cb) cb.style.display = 'none';
  const hd = document.getElementById('hideDoneToggle');
  if (hd) hd.checked = false;
  renderProjectSelector();
  renderManageProjectModal();
  renderTasksView();
}

function deleteProject(projectId) {
  if (!confirm('Delete this project and all its tasks?')) return;
  dashboardData.projects = dashboardData.projects.filter(p => p.id !== projectId);
  if (dashboardData.activeProjectId === projectId) {
    dashboardData.activeProjectId = dashboardData.projects[0]?.id || null;
  }
  saveData();
  renderProjectSelector();
  renderManageProjectModal();
  renderTasksView();
}

function renameProject(projectId, newName) {
  const project = dashboardData.projects.find(p => p.id === projectId);
  if (!project) return;
  project.name = newName;
  saveData();
  renderProjectSelector();
  renderManageProjectModal();
  showToast(`Renamed to "${newName}"`);
}

function removeColumn(index) {
  const project = getActiveProject();
  const col = project.columns[index];
  const tasksInCol = project.tasks.filter(t => t.status === col).length;
  if (tasksInCol > 0 && !confirm(`"${col}" has ${tasksInCol} task(s). Remove anyway? Tasks will move to the first column.`)) return;
  project.tasks.forEach(t => { if (t.status === col) t.status = project.columns[0]; });
  project.columns.splice(index, 1);
  saveData();
  renderManageProjectModal();
  if (currentView === 'kanban') renderKanban();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}


// ==================== CALENDAR VIEW ====================

let currentCalendarDate = new Date();
let selectedCalendarDate = null;

function initCalendarPage() {
  // Set up event listeners for calendar controls
  document.getElementById('calendarPrevBtn').onclick = () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  };
  
  document.getElementById('calendarNextBtn').onclick = () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  };
  
  document.getElementById('calendarTodayBtn').onclick = () => {
    currentCalendarDate = new Date();
    renderCalendar();
  };
  
  document.getElementById('calendarSidebarClose').onclick = () => {
    document.getElementById('calendarSidebar').classList.remove('active');
    selectedCalendarDate = null;
    renderCalendar();
  };
  
  // Initial render
  renderCalendar();
  setTimeout(() => lucide.createIcons(), 0);
}

function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  // Update month/year display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  // Get today's date for comparison
  const today = new Date();
  const isToday = (d) => {
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };
  
  // Collect all events (projects and tasks with due dates)
  const events = getCalendarEvents();
  
  // Build calendar grid
  const daysContainer = document.getElementById('calendarDays');
  daysContainer.innerHTML = '';
  
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(year, month - 1, day);
    daysContainer.appendChild(createDayCell(date, true, events, isToday(date)));
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    daysContainer.appendChild(createDayCell(date, false, events, isToday(date)));
  }
  
  // Next month days to fill grid
  const totalCells = daysContainer.children.length;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day);
    daysContainer.appendChild(createDayCell(date, true, events, isToday(date)));
  }
  
  setTimeout(() => lucide.createIcons(), 0);
}

function getHolidayForDate(date) {
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();
  const dayOfWeek = date.getDay();
  
  // Fixed date holidays
  const fixedHolidays = {
    '0-1': "New Year's Day",
    '0-6': 'Epiphany',
    '1-2': 'Groundhog Day',
    '1-14': "Valentine's Day",
    '2-17': "St. Patrick's Day",
    '3-1': "April Fools' Day",
    '3-22': 'Earth Day',
    '4-5': 'Cinco de Mayo',
    '5-14': 'Flag Day',
    '5-19': 'Juneteenth',
    '6-4': 'Independence Day',
    '9-31': 'Halloween',
    '10-11': "Veterans Day",
    '11-24': 'Christmas Eve',
    '11-25': 'Christmas',
    '11-31': "New Year's Eve"
  };
  
  const key = `${month}-${day}`;
  if (fixedHolidays[key]) return fixedHolidays[key];
  
  // Floating holidays (nth weekday of month)
  // MLK Day - 3rd Monday of January
  if (month === 0 && dayOfWeek === 1 && day >= 15 && day <= 21) {
    return 'MLK Day';
  }
  
  // Presidents Day - 3rd Monday of February
  if (month === 1 && dayOfWeek === 1 && day >= 15 && day <= 21) {
    return "Presidents' Day";
  }
  
  // Memorial Day - Last Monday of May
  if (month === 4 && dayOfWeek === 1 && day >= 25) {
    return 'Memorial Day';
  }
  
  // Labor Day - 1st Monday of September
  if (month === 8 && dayOfWeek === 1 && day <= 7) {
    return 'Labor Day';
  }
  
  // Columbus Day - 2nd Monday of October
  if (month === 9 && dayOfWeek === 1 && day >= 8 && day <= 14) {
    return 'Columbus Day';
  }
  
  // Thanksgiving - 4th Thursday of November
  if (month === 10 && dayOfWeek === 4 && day >= 22 && day <= 28) {
    return 'Thanksgiving';
  }
  
  // Easter (simplified calculation - works for 2020-2030)
  const easterDates = {
    2024: new Date(2024, 2, 31), // March 31
    2025: new Date(2025, 3, 20), // April 20
    2026: new Date(2026, 3, 5),  // April 5
    2027: new Date(2027, 2, 28), // March 28
    2028: new Date(2028, 3, 16), // April 16
    2029: new Date(2029, 3, 1),  // April 1
    2030: new Date(2030, 3, 21)  // April 21
  };
  
  if (easterDates[year]) {
    const easter = easterDates[year];
    if (date.getMonth() === easter.getMonth() && date.getDate() === easter.getDate()) {
      return 'Easter';
    }
  }
  
  // Mother's Day - 2nd Sunday of May
  if (month === 4 && dayOfWeek === 0 && day >= 8 && day <= 14) {
    return "Mother's Day";
  }
  
  // Father's Day - 3rd Sunday of June
  if (month === 5 && dayOfWeek === 0 && day >= 15 && day <= 21) {
    return "Father's Day";
  }
  
  return null;
}

function createDayCell(date, isOtherMonth, events, isToday) {
  const cell = document.createElement('div');
  cell.className = 'calendar-day';
  if (isOtherMonth) cell.classList.add('other-month');
  if (isToday) cell.classList.add('today');
  
  // Check if this date is selected
  if (selectedCalendarDate && 
      date.getDate() === selectedCalendarDate.getDate() &&
      date.getMonth() === selectedCalendarDate.getMonth() &&
      date.getFullYear() === selectedCalendarDate.getFullYear()) {
    cell.classList.add('selected');
  }
  
  // Check for holidays
  const holiday = getHolidayForDate(date);
  if (holiday) {
    cell.classList.add('has-holiday');
    cell.title = holiday;
  }
  
  // Day number
  const dayNumber = document.createElement('div');
  dayNumber.className = 'calendar-day-number';
  dayNumber.textContent = date.getDate();
  
  // Add holiday indicator
  if (holiday) {
    const holidayIndicator = document.createElement('div');
    holidayIndicator.className = 'calendar-holiday-indicator';
    holidayIndicator.textContent = holiday;
    dayNumber.appendChild(holidayIndicator);
  }
  
  cell.appendChild(dayNumber);
  
  // Events for this day
  const eventsContainer = document.createElement('div');
  eventsContainer.className = 'calendar-events';
  
  const dayEvents = events.filter(event => {
    const eventDate = new Date(event.dueDate);
    return eventDate.getDate() === date.getDate() &&
           eventDate.getMonth() === date.getMonth() &&
           eventDate.getFullYear() === date.getFullYear();
  });
  
  // Show up to 3 events, then "+X more"
  const maxVisible = 3;
  dayEvents.slice(0, maxVisible).forEach(event => {
    const eventEl = document.createElement('div');
    eventEl.className = `calendar-event event-${event.type}`;
    if (event.isOverdue) eventEl.className = 'calendar-event event-overdue';
    eventEl.textContent = event.title;
    eventEl.title = event.title; // Tooltip for full text
    eventsContainer.appendChild(eventEl);
  });
  
  if (dayEvents.length > maxVisible) {
    const moreEl = document.createElement('div');
    moreEl.className = 'calendar-event-more';
    moreEl.textContent = `+${dayEvents.length - maxVisible} more`;
    eventsContainer.appendChild(moreEl);
  }
  
  cell.appendChild(eventsContainer);
  
  // Click handler to show events sidebar
  cell.onclick = () => {
    selectedCalendarDate = new Date(date);
    showEventsSidebar(date, dayEvents);
    renderCalendar(); // Re-render to update selection
  };
  
  return cell;
}

function getCalendarEvents() {
  const events = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  if (!dashboardData.projects) return events;
  
  // Add projects with due dates
  dashboardData.projects.forEach(project => {
    if (project.dueDate) {
      const dueDate = new Date(project.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = dueDate < now && project.status !== 'Completed' && project.status !== 'Archived';
      
      events.push({
        type: 'project',
        title: project.name,
        dueDate: project.dueDate,
        status: project.status,
        isOverdue: isOverdue,
        data: project
      });
    }
    
    // Add tasks with due dates
    if (project.tasks) {
      project.tasks.forEach(task => {
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const isOverdue = dueDate < now && task.status !== 'Done' && task.status !== 'Completed';
          
          events.push({
            type: 'task',
            title: task.title,
            dueDate: task.dueDate,
            status: task.status,
            projectName: project.name,
            isOverdue: isOverdue,
            data: task
          });
        }
      });
    }
  });
  
  return events;
}

function showEventsSidebar(date, events) {
  const sidebar = document.getElementById('calendarSidebar');
  const dateTitle = document.getElementById('calendarSidebarDate');
  const content = document.getElementById('calendarSidebarContent');
  
  // Format date
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  dateTitle.textContent = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
  
  // Show sidebar
  sidebar.classList.add('active');
  
  // Render events
  if (events.length === 0) {
    content.innerHTML = '<p class="calendar-empty-message">No events on this day</p>';
    return;
  }
  
  // Sort events: overdue first, then by type (projects, then tasks)
  events.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.type !== b.type) return a.type === 'project' ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
  
  content.innerHTML = events.map(event => {
    const itemClass = `calendar-event-item item-${event.type} ${event.isOverdue ? 'item-overdue' : ''}`;
    const typeLabel = event.type === 'project' ? 'Project' : 'Task';
    const typeClass = `type-${event.type}`;
    
    let metaInfo = `Status: ${escapeHtml(event.status)}`;
    if (event.type === 'task' && event.projectName) {
      metaInfo += ` • Project: ${escapeHtml(event.projectName)}`;
    }
    if (event.isOverdue) {
      metaInfo = `<span class="calendar-event-item-status status-overdue">OVERDUE</span>${metaInfo}`;
    }
    
    return `
      <div class="${itemClass}" data-event-type="${event.type}" data-event-data='${JSON.stringify(event.data).replace(/'/g, "&apos;")}'>
        <div class="calendar-event-item-header">
          <div class="calendar-event-item-title">${escapeHtml(event.title)}</div>
          <div class="calendar-event-item-type ${typeClass}">${typeLabel}</div>
        </div>
        <div class="calendar-event-item-meta">${metaInfo}</div>
      </div>
    `;
  }).join('');
  
  // Add click handlers to navigate to events
  content.querySelectorAll('.calendar-event-item').forEach(item => {
    item.style.cursor = 'pointer';
    item.onclick = () => {
      const eventType = item.dataset.eventType;
      const eventData = JSON.parse(item.dataset.eventData);
      
      if (eventType === 'project') {
        // Navigate to project's tasks
        dashboardData.activeProjectId = eventData.id;
        saveData();
        switchPage('tasks');
      } else {
        // Navigate to task's project, then open task modal
        const project = dashboardData.projects.find(p => 
          p.tasks && p.tasks.some(t => t.id === eventData.id)
        );
        if (project) {
          dashboardData.activeProjectId = project.id;
          saveData();
          switchPage('tasks');
          setTimeout(() => {
            openTaskModal(eventData.id);
          }, 100);
        }
      }
    };
  });
  
  setTimeout(() => lucide.createIcons(), 0);
}
