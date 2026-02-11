// Project search & filter logic (client-side)

function initSearch() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const categoryBtns = document.querySelectorAll('.category-filter-btn');
  const modpackBtns = document.querySelectorAll('.modpack-filter-btn');
  const modpackFilterContainer = document.getElementById('modpack-filter');
  const projectCards = document.querySelectorAll('.project-card');
  const resultsCount = document.getElementById('results-count');
  const noResults = document.getElementById('no-results');

  let currentCategory = 'all';
  let currentModpack = 'all';
  let searchQuery = '';

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

      el.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    // Results count
    if (resultsCount) {
      resultsCount.textContent =
        visible === total ? `Showing all ${total} projects` : `Showing ${visible} of ${total} projects`;
    }

    // No results
    if (noResults) {
      noResults.style.display = visible === 0 ? '' : 'none';
    }
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

  // Category buttons
  categoryBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCategory = (btn as HTMLElement).dataset.filter || 'all';
      categoryBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Toggle modpack filter visibility
      if (modpackFilterContainer) {
        modpackFilterContainer.style.display = currentCategory === 'modpacks' ? '' : 'none';
      }

      if (currentCategory !== 'modpacks') currentModpack = 'all';

      applyFilters();
    });
  });

  // Modpack type buttons
  modpackBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentModpack = (btn as HTMLElement).dataset.filter || 'all';
      modpackBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  // Initial render
  applyFilters();
}

// News filter
function initNewsFilter() {
  const filterBtns = document.querySelectorAll('.news-filter-btn');
  const newsCards = document.querySelectorAll('.news-card');
  const featuredPost = document.getElementById('featured-post');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = (btn as HTMLElement).dataset.filter || 'all';
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      newsCards.forEach((card) => {
        const el = card as HTMLElement;
        const category = el.dataset.category || '';
        el.style.display = filter === 'all' || category === filter ? '' : 'none';
      });

      // Show/hide featured post based on filter
      if (featuredPost) {
        const featuredCard = featuredPost.querySelector('.news-card') as HTMLElement;
        if (featuredCard) {
          const category = featuredCard.dataset.category || '';
          featuredPost.style.display = filter === 'all' || category === filter ? '' : 'none';
        }
      }
    });
  });
}

// Roadmap filter
function initRoadmapFilter() {
  const filterBtns = document.querySelectorAll('.roadmap-filter-btn');
  const roadmapCards = document.querySelectorAll('.roadmap-card');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = (btn as HTMLElement).dataset.filter || 'all';
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      roadmapCards.forEach((card) => {
        const el = card as HTMLElement;
        const status = el.dataset.status || '';
        const priority = el.dataset.priority || '';
        let show = filter === 'all' || status === filter || (filter === 'high' && priority === 'high');
        el.style.display = show ? '' : 'none';
      });
    });
  });
}

// Initialize based on what's on the page
if (document.querySelector('.project-card')) initSearch();
if (document.querySelector('.news-filter-btn')) initNewsFilter();
if (document.querySelector('.roadmap-filter-btn')) initRoadmapFilter();
