// Project search & filter logic (client-side)

// URL parameter utilities
function getParam(key: string): string {
  return new URLSearchParams(window.location.search).get(key) || '';
}

function setParams(params: Record<string, string>) {
  const url = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== 'all') {
      url.set(key, value);
    } else {
      url.delete(key);
    }
  }
  const qs = url.toString();
  const newUrl = window.location.pathname + (qs ? '?' + qs : '');
  history.replaceState(null, '', newUrl);
}

// Generic filter group helper
function initFilterGroup(
  btnSelector: string,
  paramKey: string,
  onFilter: (filter: string) => void
): string {
  const btns = document.querySelectorAll(btnSelector);
  const savedFilter = getParam(paramKey) || 'all';

  // Restore active button from URL
  btns.forEach((btn) => {
    const filter = (btn as HTMLElement).dataset.filter || 'all';
    btn.classList.toggle('active', filter === savedFilter);
    (btn as HTMLElement).setAttribute('aria-pressed', String(filter === savedFilter));
  });

  // Attach click handlers
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = (btn as HTMLElement).dataset.filter || 'all';
      btns.forEach((b) => {
        b.classList.remove('active');
        (b as HTMLElement).setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      (btn as HTMLElement).setAttribute('aria-pressed', 'true');
      onFilter(filter);
    });
  });

  return savedFilter;
}

function initSearch() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const modpackBtns = document.querySelectorAll('.modpack-filter-btn');
  const modpackFilterContainer = document.getElementById('modpack-filter');
  const projectCards = document.querySelectorAll('.project-card');
  const resultsCount = document.getElementById('results-count');
  const noResults = document.getElementById('no-results');

  let currentCategory = 'all';
  let currentModpack = getParam('modpack') || 'all';
  let searchQuery = getParam('q') || '';

  // Restore search input value
  if (searchInput && searchQuery) {
    searchInput.value = searchQuery;
  }

  // Restore modpack button state
  modpackBtns.forEach((btn) => {
    const filter = (btn as HTMLElement).dataset.filter || 'all';
    btn.classList.toggle('active', filter === currentModpack);
    (btn as HTMLElement).setAttribute('aria-pressed', String(filter === currentModpack));
  });

  function applyFilters() {
    let visible = 0;
    const total = projectCards.length;

    projectCards.forEach((card) => {
      const el = card as HTMLElement;
      const category = el.dataset.category || '';
      const subcategory = el.dataset.subcategory || '';
      const name = el.dataset.name || '';
      const description = el.dataset.description || '';
      const features = el.dataset.features || '';

      let show = true;

      // Category filter
      if (currentCategory !== 'all' && category !== currentCategory) show = false;

      // Modpack subcategory filter
      if (currentCategory === 'modpacks' && currentModpack !== 'all' && subcategory !== currentModpack) show = false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!name.includes(q) && !description.includes(q) && !features.includes(q)) show = false;
      }

      if (show) {
        el.classList.remove('card-hidden');
        // Remove display:none after transition
        el.style.display = '';
        visible++;
      } else {
        el.classList.add('card-hidden');
        setTimeout(() => {
          if (el.classList.contains('card-hidden')) {
            el.style.display = 'none';
          }
        }, 250);
      }
    });

    // Search result highlighting
    clearHighlights();
    if (searchQuery) {
      highlightMatches(searchQuery);
    }

    // Results count
    if (resultsCount) {
      resultsCount.textContent =
        visible === total ? `Showing all ${total} projects` : `Showing ${visible} of ${total} projects`;
    }

    // No results
    if (noResults) {
      noResults.style.display = visible === 0 ? '' : 'none';
    }

    // Sync URL
    setParams({ category: currentCategory, modpack: currentModpack, q: searchQuery });
  }

  // Search input
  let searchTimeout: number;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(() => {
      searchQuery = searchInput.value;
      applyFilters();
    }, 300);
  });

  // Category filter group
  currentCategory = initFilterGroup('.category-filter-btn', 'category', (filter) => {
    currentCategory = filter;

    // Toggle modpack filter visibility
    if (modpackFilterContainer) {
      modpackFilterContainer.style.display = currentCategory === 'modpacks' ? '' : 'none';
    }

    if (currentCategory !== 'modpacks') currentModpack = 'all';

    applyFilters();
  });

  // Show modpack sub-filter if needed
  if (modpackFilterContainer) {
    modpackFilterContainer.style.display = currentCategory === 'modpacks' ? '' : 'none';
  }

  // Modpack type buttons
  modpackBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentModpack = (btn as HTMLElement).dataset.filter || 'all';
      modpackBtns.forEach((b) => {
        b.classList.remove('active');
        (b as HTMLElement).setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      (btn as HTMLElement).setAttribute('aria-pressed', 'true');
      applyFilters();
    });
  });

  // Initial render
  applyFilters();
}

// Search result highlighting
function highlightMatches(query: string) {
  const q = query.toLowerCase();
  document.querySelectorAll('.project-card:not(.card-hidden)').forEach((card) => {
    const titleEl = card.querySelector('.project-card-title');
    const descEl = card.querySelector('.project-card-desc');
    [titleEl, descEl].forEach((el) => {
      if (!el) return;
      walkTextNodes(el, q);
    });
  });
}

function walkTextNodes(node: Node, query: string) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query);
    if (idx === -1) return;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);

    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));

    const mark = document.createElement('mark');
    mark.className = 'search-highlight';
    mark.textContent = match;
    frag.appendChild(mark);

    if (after) frag.appendChild(document.createTextNode(after));

    node.parentNode?.replaceChild(frag, node);
  } else {
    // Clone childNodes list since we modify the DOM
    Array.from(node.childNodes).forEach((child) => {
      if ((child as Element).classList?.contains('search-highlight')) return;
      walkTextNodes(child, query);
    });
  }
}

function clearHighlights() {
  document.querySelectorAll('.search-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
    parent.normalize();
  });
}

// News filter
function initNewsFilter() {
  const newsCards = document.querySelectorAll('.news-card');
  const featuredPost = document.getElementById('featured-post');

  initFilterGroup('.news-filter-btn', 'filter', (filter) => {
    newsCards.forEach((card) => {
      const el = card as HTMLElement;
      const category = el.dataset.category || '';
      el.style.display = filter === 'all' || category === filter ? '' : 'none';
    });

    if (featuredPost) {
      const featuredCard = featuredPost.querySelector('.news-card') as HTMLElement;
      if (featuredCard) {
        const category = featuredCard.dataset.category || '';
        featuredPost.style.display = filter === 'all' || category === filter ? '' : 'none';
      }
    }

    setParams({ filter });
  });

  // Apply initial filter
  const savedFilter = getParam('filter') || 'all';
  if (savedFilter !== 'all') {
    newsCards.forEach((card) => {
      const el = card as HTMLElement;
      const category = el.dataset.category || '';
      el.style.display = savedFilter === 'all' || category === savedFilter ? '' : 'none';
    });
    if (featuredPost) {
      const featuredCard = featuredPost.querySelector('.news-card') as HTMLElement;
      if (featuredCard) {
        const category = featuredCard.dataset.category || '';
        featuredPost.style.display = savedFilter === 'all' || category === savedFilter ? '' : 'none';
      }
    }
  }
}

// Roadmap filter
function initRoadmapFilter() {
  const roadmapCards = document.querySelectorAll('.roadmap-card');

  initFilterGroup('.roadmap-filter-btn', 'filter', (filter) => {
    roadmapCards.forEach((card) => {
      const el = card as HTMLElement;
      const status = el.dataset.status || '';
      const priority = el.dataset.priority || '';
      let show = filter === 'all' || status === filter || (filter === 'high' && priority === 'high');
      el.style.display = show ? '' : 'none';
    });

    setParams({ filter });
  });

  // Apply initial filter
  const savedFilter = getParam('filter') || 'all';
  if (savedFilter !== 'all') {
    roadmapCards.forEach((card) => {
      const el = card as HTMLElement;
      const status = el.dataset.status || '';
      const priority = el.dataset.priority || '';
      let show = savedFilter === 'all' || status === savedFilter || (savedFilter === 'high' && priority === 'high');
      el.style.display = show ? '' : 'none';
    });
  }
}

// Initialize based on what's on the page
if (document.querySelector('.project-card')) initSearch();
if (document.querySelector('.news-filter-btn')) initNewsFilter();
if (document.querySelector('.roadmap-filter-btn')) initRoadmapFilter();
