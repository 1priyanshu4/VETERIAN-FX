/**
 * VETERIAN-FX PLATFORM SIDEBAR & NAVIGATION CONTROLLER
 * Handles:
 * 1. Collapsible Section Groups (Accordion Folders with Chevrons)
 * 2. Full Sidebar Collapse / Expand (Desktop + Mobile Drawer)
 * 3. State Persistence in localStorage
 * 4. Responsive Viewport Adaptations
 */

(() => {
  const STORAGE_KEY_SIDEBAR = 'veterian_sidebar_collapsed';
  const STORAGE_KEY_GROUPS = 'veterian_sidebar_groups';

  function initPlatformSidebar() {
    initSidebarTrigger();
    initCollapsibleGroups();
    initMobileDrawer();
    initThemeToggle();
  }

  /* --------------------------------------------------------------------------
     1. FULL SIDEBAR COLLAPSE / EXPAND TOGGLE
     -------------------------------------------------------------------------- */
  function togglePlatformSidebar(forceState) {
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    const triggers = document.querySelectorAll('[data-sidebar="trigger"], [data-slot="sidebar-trigger"], .sidebar-close-btn');

    if (window.innerWidth < 768) {
      // Mobile drawer toggle
      const isMobileOpen = typeof forceState === 'boolean'
        ? document.body.classList.toggle('sidebar-mobile-open', forceState)
        : document.body.classList.toggle('sidebar-mobile-open');
      triggers.forEach(t => t.setAttribute('aria-expanded', isMobileOpen ? 'true' : 'false'));
    } else {
      // Desktop toggle
      const isCollapsed = typeof forceState === 'boolean'
        ? document.body.classList.toggle('sidebar-collapsed', forceState)
        : document.body.classList.toggle('sidebar-collapsed');

      if (sidebar) {
        sidebar.setAttribute('data-state', isCollapsed ? 'collapsed' : 'expanded');
      }
      try {
        localStorage.setItem(STORAGE_KEY_SIDEBAR, isCollapsed ? 'true' : 'false');
      } catch (e) {}

      // Update aria attributes and titles on triggers
      triggers.forEach(t => {
        t.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        t.title = isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar (Ctrl+B)';
      });

      // Sync terminal toolbar button if present
      const tdBtn = document.querySelector('#td-sidebar-toggle-btn');
      if (tdBtn) {
        tdBtn.classList.toggle('active', isCollapsed);
      }

      // Inform charts and fluid layouts of dimension changes
      window.dispatchEvent(new Event('resize'));
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (window.chartTerminal?.chart?.resize) {
          window.chartTerminal.chart.resize();
          window.chartTerminal.chart.requestRender?.();
        }
      }, 100);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (window.chartTerminal?.chart?.resize) {
          window.chartTerminal.chart.resize();
          window.chartTerminal.chart.requestRender?.();
        }
      }, 280);
    }
  }

  // Expose globally so chart-terminal.js and other scripts can invoke reliably
  window.togglePlatformSidebar = togglePlatformSidebar;

  function initSidebarTrigger() {
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    const isDesktop = window.innerWidth >= 768;

    // Restore desktop collapsed state
    try {
      const savedCollapsed = localStorage.getItem(STORAGE_KEY_SIDEBAR);
      if (savedCollapsed === 'true' && isDesktop) {
        document.body.classList.add('sidebar-collapsed');
        if (sidebar) sidebar.setAttribute('data-state', 'collapsed');
      }
    } catch (e) {}

    // Inject an inline collapse button inside the sidebar header for easy 1-click collapse
    const headerLi = document.querySelector('[data-slot="sidebar-header"] li[data-slot="sidebar-menu-item"]');
    if (headerLi && !headerLi.querySelector('.sidebar-header-collapse-trigger')) {
      const collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className = 'sidebar-header-collapse-trigger';
      collapseBtn.setAttribute('data-sidebar', 'trigger');
      collapseBtn.title = 'Collapse Sidebar (Ctrl+B)';
      collapseBtn.setAttribute('aria-label', 'Collapse Sidebar');
      collapseBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2"/>
          <path d="M9 3v18"/>
        </svg>
      `;
      headerLi.appendChild(collapseBtn);
    }

    // Attach listeners to all sidebar trigger buttons
    const triggers = document.querySelectorAll('[data-sidebar="trigger"], [data-slot="sidebar-trigger"], .sidebar-close-btn');
    triggers.forEach((trigger) => {
      if (trigger._sidebarBound) return;
      trigger._sidebarBound = true;

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePlatformSidebar();
      });
    });

    // Global keyboard shortcut: '[' or 'Ctrl+B'
    if (!window._sidebarKeyBound) {
      window._sidebarKeyBound = true;
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === '[' || (e.ctrlKey && e.key.toLowerCase() === 'b')) {
          e.preventDefault();
          togglePlatformSidebar();
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
     2. COLLAPSIBLE ACCORDION CATEGORY GROUPS
     -------------------------------------------------------------------------- */
  function initCollapsibleGroups() {
    let savedGroups = {};
    try {
      savedGroups = JSON.parse(localStorage.getItem(STORAGE_KEY_GROUPS) || '{}');
    } catch (e) {}

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const groups = document.querySelectorAll('[data-slot="sidebar-group"]');

    groups.forEach((group) => {
      const label = group.querySelector('[data-slot="sidebar-group-label"]');
      const menu = group.querySelector('[data-slot="sidebar-menu"], [data-slot="sidebar-group-content"]');
      if (!label || !menu) return;

      // Extract section title
      const rawText = label.textContent.trim();
      const groupTitle = rawText.replace(/\s+/g, ' ');

      // Check if this group contains the currently active page link
      const links = Array.from(group.querySelectorAll('a[href]'));
      const hasActive = links.some((a) => {
        const href = a.getAttribute('href')?.replace(/\/$/, '') || '';
        return a.hasAttribute('data-active') || (href !== '' && (href === currentPath || (currentPath === '' && href === '/dashboard')));
      });

      // Wrap title & inject chevron icon if not already present
      if (!label.querySelector('.sidebar-group-chevron')) {
        label.innerHTML = `
          <span class="sidebar-group-title">${groupTitle}</span>
          <svg class="sidebar-group-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        `;
        label.setAttribute('role', 'button');
        label.setAttribute('tabindex', '0');
        label.setAttribute('aria-expanded', 'true');
        label.title = `Toggle ${groupTitle}`;
      }

      // Apply initial collapsed state (core navigation group and active page group always stay expanded)
      const isCoreGroup = groupTitle.toLowerCase().includes('shield') || groupTitle.toLowerCase().includes('prop firm');
      if (savedGroups[groupTitle] === true && !hasActive && !isCoreGroup) {
        group.classList.add('is-collapsed');
        label.setAttribute('aria-expanded', 'false');
      } else {
        group.classList.remove('is-collapsed');
        label.setAttribute('aria-expanded', 'true');
      }

      // Handle click to toggle
      if (!label._groupBound) {
        label._groupBound = true;

        const toggleHandler = (e) => {
          e.preventDefault();
          e.stopPropagation();

          const isCollapsed = group.classList.toggle('is-collapsed');
          label.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');

          try {
            savedGroups[groupTitle] = isCollapsed;
            localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(savedGroups));
          } catch (e) {}

          window.dispatchEvent(new Event('resize'));
        };

        label.addEventListener('click', toggleHandler);
        label.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggleHandler(e);
          }
        });
      }
    });
  }

  /* --------------------------------------------------------------------------
     3. MOBILE DRAWER & BACKDROP
     -------------------------------------------------------------------------- */
  function initMobileDrawer() {
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    backdrop.addEventListener('click', () => {
      document.body.classList.remove('sidebar-mobile-open');
    });

    // Close mobile drawer when clicking any link inside sidebar
    const sidebarLinks = document.querySelectorAll('[data-slot="sidebar"] a[href]');
    sidebarLinks.forEach((a) => {
      a.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          document.body.classList.remove('sidebar-mobile-open');
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
     4. THEME TOGGLE HELPER
     -------------------------------------------------------------------------- */
  function initThemeToggle() {
    document.querySelectorAll('[data-slot="button"]').forEach((btn) => {
      const span = btn.querySelector('span');
      if (span?.textContent.includes('Toggle theme') && !btn._themeBound) {
        btn._themeBound = true;
        btn.addEventListener('click', () => {
          const isDark = document.documentElement.classList.contains('dark');
          document.documentElement.classList.toggle('dark', !isDark);
          document.documentElement.classList.toggle('light', isDark);
          try {
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
          } catch (e) {}
        });
      }
    });
  }

  // Initialize once DOM is ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlatformSidebar);
  } else {
    initPlatformSidebar();
  }
})();
