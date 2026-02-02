// Global state
let currentFilter = 'all';
let currentModpackFilter = 'all';
let searchQuery = '';
let filteredProjects = [];
let currentRoadmapFilter = 'all';
let currentNewsFilter = 'all';
let filteredPosts = [];

// Utility function: Debounce
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    }
}

// Page navigation
function showPage(pageId) {
    const currentPage = document.querySelector('.page:not(.hidden)');
    const targetPage = document.getElementById(pageId + '-page');

    if (currentPage) {
        currentPage.classList.add('hidden');
    }

    if (targetPage) {
        targetPage.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Close mobile menu
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }

    // Toggle Kinetic theme for hosting page
    if (pageId === 'hosting') {
        document.body.classList.add('kinetic-theme');
    } else {
        document.body.classList.remove('kinetic-theme');
    }
}

// Mobile menu toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Debounced search
const debouncedSearch = debounce(function() {
    searchQuery = document.getElementById('search-input').value.toLowerCase();
    applyFilters();
}, 300);

function searchProjects() {
    debouncedSearch();
}

// Filter by category
function filterProjects(category) {
    currentFilter = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active', 'gradient-accent');
        btn.classList.add('glass');
        btn.setAttribute('aria-pressed', 'false');
    });
    
    event.target.classList.add('active', 'gradient-accent');
    event.target.classList.remove('glass');
    event.target.setAttribute('aria-pressed', 'true');
    
    const modpackFilter = document.getElementById('modpack-filter');
    if (modpackFilter) {
        if (category === 'modpacks') {
            modpackFilter.classList.remove('hidden');
        } else {
            modpackFilter.classList.add('hidden');
            currentModpackFilter = 'all';
        }
    }
    
    applyFilters();
}

// Filter modpacks by subcategory
function filterModpacks(subcategory) {
    currentModpackFilter = subcategory;
    
    document.querySelectorAll('.modpack-btn').forEach(btn => {
        btn.classList.remove('active', 'gradient-accent');
        btn.classList.add('glass');
        btn.setAttribute('aria-pressed', 'false');
    });
    
    event.target.classList.add('active', 'gradient-accent');
    event.target.classList.remove('glass');
    event.target.setAttribute('aria-pressed', 'true');
    
    applyFilters();
}

// Apply all filters
function applyFilters() {
    // Initialize filteredProjects if empty
    if (filteredProjects.length === 0 && projects.length > 0) {
        filteredProjects = [...projects];
    }
    
    filteredProjects = projects.filter(project => {
        if (currentFilter !== 'all' && project.category !== currentFilter) return false;
        if (currentFilter === 'modpacks' && currentModpackFilter !== 'all' && project.subcategory !== currentModpackFilter) return false;
        if (searchQuery) {
            const searchLower = searchQuery;
            const inName = project.name.toLowerCase().includes(searchLower);
            const inDesc = project.description.toLowerCase().includes(searchLower);
            const inFeatures = project.features.some(f => f.toLowerCase().includes(searchLower));
            if (!inName && !inDesc && !inFeatures) return false;
        }
        return true;
    });
    
    renderProjects();
    updateResultsCount();
}

// Get status badge HTML
function getStatusBadge(status) {
    const config = statusConfig[status];
    if (!config) return '';
    return `<span class="${config.class} text-xs font-bold px-3 py-1 rounded-full text-white">${config.label}</span>`;
}

// Update results count
function updateResultsCount() {
    const count = filteredProjects.length;
    const total = projects.length;
    const countElement = document.getElementById('results-count');
    if (countElement) {
        countElement.textContent = count === total ? 
            `Showing all ${total} projects` : 
            `Showing ${count} of ${total} projects`;
    }
}

// Render projects grid - optimiert
function renderProjects() {
    const grid = document.getElementById('projects-grid');
    const noResults = document.getElementById('no-results');
    
    if (!grid) return;
    
    if (filteredProjects.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.classList.remove('hidden');
        return;
    }
    
    if (noResults) noResults.classList.add('hidden');
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    filteredProjects.forEach((project, index) => {
        const card = document.createElement('div');
        card.className = 'project-card glass rounded-3xl p-6 fade-in glow-on-scroll';
        card.style.animationDelay = `${index * 0.05}s`; // Reduziert von 0.1s
        card.onclick = () => openModal(project.id);
        
        card.innerHTML = `
            <div class="flex items-start space-x-4 mb-4">
                <img src="${project.logo}" alt="${project.name}" class="w-20 h-20 rounded-2xl object-cover shadow-lg" loading="lazy">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-white mb-2">${project.name}</h3>
                    <div class="flex flex-wrap gap-2">${getStatusBadge(project.status)}</div>
                </div>
            </div>
            <div class="mb-4">
                <div class="flex flex-wrap gap-2">
                    <span class="bg-gradient-to-r from-pink-500 to-purple-500 text-xs font-semibold px-3 py-1 rounded-full text-white capitalize">${project.category}</span>
                    <span class="bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-semibold px-3 py-1 rounded-full text-white">${project.version}</span>
                </div>
            </div>
            <p class="text-gray-300 text-sm mb-4 line-clamp-3 leading-relaxed">${project.description}</p>
            <div class="flex justify-between items-center text-xs pt-4 border-t border-white border-opacity-10">
                <div class="flex items-center space-x-4 text-gray-400">
                    <span>🔥 ${project.downloads}</span>
                    <span>🕐 ${project.lastUpdate}</span>
                </div>
                <span class="gradient-text font-bold text-sm">View Details →</span>
            </div>
        `;
        
        fragment.appendChild(card);
    });
    
    grid.innerHTML = '';
    grid.appendChild(fragment);
    
    // Re-setup scroll effects
    requestAnimationFrame(() => setupScrollEffects());
}

// Scroll to top
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle scroll events - throttled
function handleScroll() {
    const fab = document.querySelector('.floating-action');
    if (!fab) return;
    
    if (window.scrollY > 300) {
        fab.style.opacity = '1';
        fab.style.pointerEvents = 'auto';
    } else {
        fab.style.opacity = '0';
        fab.style.pointerEvents = 'none';
    }
}

function openModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const modal = document.getElementById('project-modal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="modal-content glass-strong rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-8">
                <div class="flex justify-between items-start mb-8">
                    <div class="flex-1">
                        <h2 class="text-4xl font-black gradient-text mb-4">${project.name}</h2>
                        <div class="flex flex-wrap gap-3">
                            ${getStatusBadge(project.status)}
                            <span class="bg-gradient-to-r from-pink-500 to-purple-500 text-xs font-bold px-4 py-2 rounded-full text-white capitalize">${project.category}</span>
                            <span class="bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold px-4 py-2 rounded-full text-white">${project.version}</span>
                            <span class="bg-gray-600 text-xs font-bold px-4 py-2 rounded-full text-white">🔥 ${project.downloads}</span>
                        </div>
                    </div>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-pink-400 text-4xl transition-colors ml-4" aria-label="Close modal">&times;</button>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2">
                        <h3 class="text-2xl font-bold mb-4 gradient-text">📸 Screenshots & Media</h3>
                        <div class="grid grid-cols-2 gap-4 mb-8">
                            ${project.screenshots.map((screenshot, index) => `
                                <img src="${screenshot}" 
                                     alt="Screenshot ${index + 1}" 
                                     class="w-full h-40 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-all" 
                                     onclick="openLightbox('${screenshot}', 'Screenshot ${index + 1}')"
                                     loading="lazy">
                            `).join('')}
                        </div>
                        
                        <div class="glass rounded-2xl p-6">
                            <h4 class="text-xl font-bold mb-4 gradient-text">📖 About This Project</h4>
                            <p class="text-gray-300 leading-relaxed">${project.description}</p>
                        </div>
                    </div>
                    
                    <div>
                        <div class="space-y-6">
                            <div class="glass rounded-2xl p-6">
                                <h4 class="text-xl font-bold mb-4 gradient-text">📊 Project Details</h4>
                                <div class="space-y-4 text-sm">
                                    <div class="flex justify-between items-center py-2 border-b border-white border-opacity-10">
                                        <span class="text-gray-400 font-medium">Version:</span>
                                        <span class="text-white font-bold">${project.version}</span>
                                    </div>
                                    <div class="flex justify-between items-center py-2 border-b border-white border-opacity-10">
                                        <span class="text-gray-400 font-medium">Downloads:</span>
                                        <span class="text-white font-bold">${project.downloads}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="glass rounded-2xl p-6">
                                <h4 class="text-xl font-bold mb-4 gradient-text">✨ Key Features</h4>
                                <ul class="text-gray-300 space-y-3 text-sm">
                                    ${project.features.map(feature => `
                                        <li class="flex items-start space-x-3 p-2 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors">
                                            <span class="gradient-text text-lg">•</span>
                                            <span>${feature}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        </div>
                        
                        <div class="mt-8 space-y-4">
                            <a href="${project.downloadUrl}" target="_blank" rel="noopener noreferrer" class="block w-full gradient-accent rounded-2xl px-6 py-4 font-bold text-center transition-all hover:scale-105 text-white text-lg pulse-btn">
                                <svg class="w-6 h-6 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                                </svg>
                                CurseForge
                            </a>
                            ${project.modrinthUrl ? `
                                <a href="${project.modrinthUrl}" target="_blank" rel="noopener noreferrer" class="block w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 rounded-2xl px-6 py-4 font-bold text-center transition-all hover:scale-105 text-white text-lg">
                                    <svg class="w-6 h-6 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                                    </svg>
                                    Modrinth
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('project-modal');
    if (!modal) return;
    
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function openLightbox(imageSrc, caption = '') {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    
    lightbox.innerHTML = `
        <div class="relative max-w-6xl max-h-[90vh]">
            <button onclick="closeLightbox()" class="absolute -top-16 right-0 text-white text-4xl hover:text-pink-400 transition-colors z-10" aria-label="Close lightbox">&times;</button>
            <img src="${imageSrc}" alt="${caption}" class="max-w-full max-h-full rounded-2xl shadow-2xl" loading="lazy">
            ${caption ? `
                <div class="absolute bottom-6 left-6 right-6 text-center">
                    <p class="text-white bg-black bg-opacity-70 rounded-xl px-6 py-3 inline-block font-medium">${caption}</p>
                </div>
            ` : ''}
        </div>
    `;
    lightbox.classList.remove('hidden');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    
    lightbox.classList.add('hidden');
}

function renderChangelog() {
    const container = document.getElementById('changelog-content');
    if (!container) return;
    
    const changelogEntries = Object.entries(changelogs);
    const fragment = document.createDocumentFragment();
    
    changelogEntries.forEach(([projectName, entries]) => {
        const safeId = projectName.replace(/\s+/g, '-').replace(/[{}]/g, '');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'glass rounded-3xl overflow-hidden glow-on-scroll';
        
        wrapper.innerHTML = `
            <button onclick="toggleChangelog('${safeId}')" class="w-full p-6 text-left flex justify-between items-center hover:bg-white hover:bg-opacity-5 transition-all">
                <div>
                    <h3 class="text-2xl font-bold gradient-text mb-2">${projectName}</h3>
                    <p class="text-sm text-gray-400 font-medium">${entries.length} version${entries.length > 1 ? 's' : ''} • Click to expand</p>
                </div>
                <svg class="w-8 h-8 transform transition-transform duration-300" id="icon-${safeId}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            <div id="changelog-${safeId}" class="hidden border-t border-white border-opacity-10">
                ${entries.map((entry, index) => `
                    <div class="p-6 ${index < entries.length - 1 ? 'border-b border-white border-opacity-5' : ''}">
                        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6">
                            <div>
                                <h4 class="text-xl font-bold text-white mb-2">Version ${entry.version}</h4>
                                <span class="text-sm text-gray-400 font-medium">📅 ${entry.date}</span>
                            </div>
                            <span class="text-xs bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1 rounded-full text-white mt-3 sm:mt-0 self-start font-bold">
                                ${entry.changes.length} change${entry.changes.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <ul class="text-gray-300 space-y-3">
                            ${entry.changes.map(change => `
                                <li class="flex items-start space-x-3 p-3 rounded-xl hover:bg-white hover:bg-opacity-5 transition-colors">
                                    <span class="text-pink-400 mt-1 flex-shrink-0 text-lg">✓</span>
                                    <span class="text-sm leading-relaxed">${change}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
        
        fragment.appendChild(wrapper);
    });
    
    container.appendChild(fragment);
}

function toggleChangelog(projectId) {
    const content = document.getElementById(`changelog-${projectId}`);
    const icon = document.getElementById(`icon-${projectId}`);
    
    if (!content || !icon) return;
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

// Roadmap functionality
function filterRoadmap(filter) {
    currentRoadmapFilter = filter;
    
    // Update button states
    document.querySelectorAll('.roadmap-filter-btn').forEach(btn => {
        btn.classList.remove('gradient-accent');
        btn.classList.add('glass');
    });
    
    const activeBtn = event.target;
    activeBtn.classList.add('gradient-accent');
    activeBtn.classList.remove('glass');
    
    renderRoadmap();
}

function renderRoadmapFilters() {
    const container = document.getElementById('roadmap-filters');
    if (!container) return;
    
    const filters = [
        { id: 'all', label: 'All Items', icon: '🎯' },
        { id: 'in-progress', label: 'In Progress', icon: '🚧' },
        { id: 'planned', label: 'Planned', icon: '📋' },
        { id: 'high', label: 'High Priority', icon: '🔥' }
    ];
    
    const fragment = document.createDocumentFragment();
    
    filters.forEach((filter, index) => {
        const btn = document.createElement('button');
        btn.className = `roadmap-filter-btn ${index === 0 ? 'gradient-accent' : 'glass'} rounded-xl px-6 py-3 font-semibold transition-all text-white`;
        btn.onclick = () => filterRoadmap(filter.id);
        btn.innerHTML = `${filter.icon} ${filter.label}`;
        fragment.appendChild(btn);
    });
    
    container.appendChild(fragment);
}

function renderRoadmap() {
    const timeline = document.getElementById('roadmap-timeline');
    if (!timeline) return;
    
    // Filter items
    let items = roadmapItems.filter(item => {
        if (currentRoadmapFilter === 'all') return true;
        if (currentRoadmapFilter === 'high') return item.priority === 'high';
        return item.status === currentRoadmapFilter;
    });
    
    // Sort by priority and progress
    items.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const statusOrder = { 'in-progress': 0, planned: 1, completed: 2, onhold: 3 };
        
        if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
        if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
        return b.progress - a.progress;
    });
    
    const fragment = document.createDocumentFragment();
    
    items.forEach((item, index) => {
        const statusInfo = roadmapStatusConfig[item.status];
        const priorityInfo = priorityConfig[item.priority];
        
        const card = document.createElement('div');
        card.className = 'glass rounded-3xl overflow-hidden glow-on-scroll fade-in';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
            <div class="p-8">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
                    <div class="flex-1">
                        <div class="flex flex-wrap items-center gap-3 mb-3">
                            <h3 class="text-2xl font-bold text-white">${item.title}</h3>
                        </div>
                        <p class="text-gray-300 leading-relaxed mb-4">${item.description}</p>
                        <div class="flex flex-wrap gap-2">
                            <span class="${statusInfo.class} text-xs font-bold px-3 py-1 rounded-full text-white">
                                ${statusInfo.label}
                            </span>
                            <span class="${priorityInfo.class} text-xs font-bold px-3 py-1 rounded-full bg-opacity-20 bg-white">
                                ${priorityInfo.icon} ${priorityInfo.label}
                            </span>
                            <span class="bg-gradient-to-r from-pink-500 to-purple-500 text-xs font-bold px-3 py-1 rounded-full text-white capitalize">
                                ${item.category}
                            </span>
                            <span class="glass text-xs font-bold px-3 py-1 rounded-full text-white">
                                📅 ${item.estimatedDate}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                ${item.status !== 'completed' ? `
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-semibold text-gray-400">Progress</span>
                            <span class="text-sm font-bold gradient-text">${item.progress}%</span>
                        </div>
                        <div class="w-full bg-gray-700 bg-opacity-50 rounded-full h-3 overflow-hidden">
                            <div class="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500 shadow-lg" 
                                 style="width: ${item.progress}%"></div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Features -->
                <div class="mb-6">
                    <h4 class="text-lg font-bold gradient-text mb-3">✨ Key Features</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        ${item.features.map(feature => `
                            <div class="flex items-start space-x-2 text-gray-300 text-sm p-2 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors">
                                <span class="text-pink-400 mt-0.5 flex-shrink-0">▸</span>
                                <span>${feature}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Recent Updates -->
                ${item.updates.length > 0 ? `
                    <div class="border-t border-white border-opacity-10 pt-6">
                        <button onclick="toggleRoadmapUpdates('${item.id}')" 
                                class="flex items-center justify-between w-full text-left mb-4 hover:text-pink-400 transition-colors">
                            <h4 class="text-lg font-bold gradient-text">📢 Recent Updates (${item.updates.length})</h4>
                            <svg class="w-5 h-5 transform transition-transform" id="updates-icon-${item.id}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>
                        <div id="updates-${item.id}" class="hidden space-y-3">
                            ${item.updates.map(update => `
                                <div class="glass rounded-xl p-4">
                                    <div class="flex items-start space-x-3">
                                        <div class="bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-2 flex-shrink-0">
                                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                            </svg>
                                        </div>
                                        <div class="flex-1">
                                            <div class="text-xs text-gray-400 mb-1 font-medium">${update.date}</div>
                                            <div class="text-sm text-gray-300">${update.text}</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        fragment.appendChild(card);
    });
    
    timeline.innerHTML = '';
    timeline.appendChild(fragment);
    
    updateRoadmapStats();
}

function toggleRoadmapUpdates(itemId) {
    const content = document.getElementById(`updates-${itemId}`);
    const icon = document.getElementById(`updates-icon-${itemId}`);
    
    if (!content || !icon) return;
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

function updateRoadmapStats() {
    const completed = roadmapItems.filter(i => i.status === 'completed').length;
    const inProgress = roadmapItems.filter(i => i.status === 'in-progress').length;
    const planned = roadmapItems.filter(i => i.status === 'planned').length;

    const completedEl = document.getElementById('roadmap-completed');
    const inProgressEl = document.getElementById('roadmap-inprogress');
    const plannedEl = document.getElementById('roadmap-planned');

    if (completedEl) completedEl.textContent = completed;
    if (inProgressEl) inProgressEl.textContent = inProgress;
    if (plannedEl) plannedEl.textContent = planned;
}

// News/Blog functionality
function renderNewsFilters() {
    const container = document.getElementById('news-filters');
    if (!container) return;

    const filters = [
        { id: 'all', label: 'All Posts', icon: '📰' },
        { id: 'announcement', label: 'Announcements', icon: '📢' },
        { id: 'update', label: 'Updates', icon: '🆕' },
        { id: 'news', label: 'News', icon: '📰' },
        { id: 'guide', label: 'Guides', icon: '📖' }
    ];

    const fragment = document.createDocumentFragment();

    filters.forEach((filter, index) => {
        const btn = document.createElement('button');
        btn.className = `news-filter-btn ${index === 0 ? 'gradient-accent' : 'glass'} rounded-xl px-6 py-3 font-semibold transition-all text-white`;
        btn.onclick = () => filterNews(filter.id);
        btn.innerHTML = `${filter.icon} ${filter.label}`;
        fragment.appendChild(btn);
    });

    container.appendChild(fragment);
}

function filterNews(filter) {
    currentNewsFilter = filter;

    document.querySelectorAll('.news-filter-btn').forEach(btn => {
        btn.classList.remove('gradient-accent');
        btn.classList.add('glass');
    });

    event.target.classList.add('gradient-accent');
    event.target.classList.remove('glass');

    renderNews();
}

function renderFeaturedPost() {
    const container = document.getElementById('featured-post');
    if (!container || !blogPosts || blogPosts.length === 0) return;

    // Get the most recent post as featured
    const featured = blogPosts[0];
    const categoryInfo = blogCategoryConfig[featured.category] || blogCategoryConfig.news;

    container.innerHTML = `
        <div class="glass rounded-3xl overflow-hidden glow-on-scroll cursor-pointer" onclick="openBlogModal(${featured.id})">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div class="aspect-video lg:aspect-auto">
                    <img src="${featured.image}" alt="${featured.title}"
                         class="w-full h-full object-cover" loading="lazy">
                </div>
                <div class="p-8 flex flex-col justify-center">
                    <div class="flex flex-wrap gap-2 mb-4">
                        <span class="text-xs font-bold px-3 py-1 rounded-full text-white ${categoryInfo.class}">
                            ${categoryInfo.icon} ${categoryInfo.label}
                        </span>
                        <span class="glass text-xs font-bold px-3 py-1 rounded-full text-white">
                            Featured
                        </span>
                    </div>
                    <h2 class="text-3xl font-bold text-white mb-4 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-pink-400 hover:to-purple-500 transition-all">
                        ${featured.title}
                    </h2>
                    <p class="text-gray-300 mb-6 line-clamp-3">${featured.excerpt}</p>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4 text-sm text-gray-400">
                            <span>✍️ ${featured.author}</span>
                            <span>📅 ${featured.date}</span>
                        </div>
                        <span class="gradient-text font-bold">Read More →</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderNews() {
    const grid = document.getElementById('news-grid');
    const noPosts = document.getElementById('no-posts');

    if (!grid || !blogPosts) return;

    // Filter posts (skip first one if showing all - it's featured)
    let posts = blogPosts.filter((post, index) => {
        if (currentNewsFilter === 'all') {
            return index > 0; // Skip featured post
        }
        return post.category === currentNewsFilter;
    });

    filteredPosts = posts;

    if (posts.length === 0) {
        grid.innerHTML = '';
        if (noPosts) noPosts.classList.remove('hidden');
        return;
    }

    if (noPosts) noPosts.classList.add('hidden');

    const fragment = document.createDocumentFragment();

    posts.forEach((post, index) => {
        const categoryInfo = blogCategoryConfig[post.category] || blogCategoryConfig.news;

        const card = document.createElement('div');
        card.className = 'blog-card glass rounded-3xl overflow-hidden fade-in glow-on-scroll cursor-pointer';
        card.style.animationDelay = `${index * 0.05}s`;
        card.onclick = () => openBlogModal(post.id);

        card.innerHTML = `
            <div class="aspect-video overflow-hidden">
                <img src="${post.image}" alt="${post.title}"
                     class="w-full h-full object-cover transition-transform duration-300 hover:scale-110" loading="lazy">
            </div>
            <div class="p-6">
                <div class="flex flex-wrap gap-2 mb-3">
                    <span class="text-xs font-bold px-3 py-1 rounded-full text-white ${categoryInfo.class}">
                        ${categoryInfo.icon} ${categoryInfo.label}
                    </span>
                </div>
                <h3 class="text-xl font-bold text-white mb-3 line-clamp-2 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-pink-400 hover:to-purple-500 transition-all">
                    ${post.title}
                </h3>
                <p class="text-gray-300 text-sm mb-4 line-clamp-3">${post.excerpt}</p>
                <div class="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-white border-opacity-10">
                    <div class="flex items-center space-x-3">
                        <span>✍️ ${post.author}</span>
                        <span>📅 ${post.date}</span>
                    </div>
                    <span class="gradient-text font-bold">Read →</span>
                </div>
            </div>
        `;

        fragment.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);

    requestAnimationFrame(() => setupScrollEffects());
}

function openBlogModal(postId) {
    const post = blogPosts.find(p => p.id === postId);
    if (!post) return;

    const modal = document.getElementById('blog-modal');
    if (!modal) return;

    const categoryInfo = blogCategoryConfig[post.category] || blogCategoryConfig.news;

    modal.innerHTML = `
        <div class="modal-content glass-strong rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="relative">
                <div class="aspect-video w-full overflow-hidden rounded-t-3xl">
                    <img src="${post.image}" alt="${post.title}" class="w-full h-full object-cover">
                </div>
                <button onclick="closeBlogModal()" class="absolute top-4 right-4 glass rounded-full p-2 text-white hover:text-pink-400 transition-colors" aria-label="Close modal">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="p-8">
                <div class="flex flex-wrap gap-2 mb-4">
                    <span class="text-xs font-bold px-3 py-1 rounded-full text-white ${categoryInfo.class}">
                        ${categoryInfo.icon} ${categoryInfo.label}
                    </span>
                    ${post.tags.map(tag => `
                        <span class="glass text-xs font-medium px-3 py-1 rounded-full text-gray-300">
                            #${tag}
                        </span>
                    `).join('')}
                </div>

                <h1 class="text-4xl font-black gradient-text mb-4">${post.title}</h1>

                <div class="flex items-center space-x-6 text-sm text-gray-400 mb-8 pb-6 border-b border-white border-opacity-10">
                    <span class="flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        <span>${post.author}</span>
                    </span>
                    <span class="flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <span>${post.date}</span>
                    </span>
                </div>

                <div class="blog-content prose prose-invert max-w-none">
                    ${post.content}
                </div>

                <div class="mt-8 pt-6 border-t border-white border-opacity-10">
                    <button onclick="closeBlogModal()" class="gradient-accent rounded-xl px-6 py-3 font-semibold text-white transition-all hover:scale-105">
                        ← Back to News
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeBlogModal() {
    const modal = document.getElementById('blog-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Kinetic Hosting Page Functions
function renderKineticHosting() {
    if (!kineticHosting) return;

    // Set tagline
    const tagline = document.getElementById('kinetic-tagline');
    if (tagline) tagline.textContent = kineticHosting.description;

    // Set affiliate links
    const ctaMain = document.getElementById('kinetic-cta-main');
    const ctaBottom = document.getElementById('kinetic-cta-bottom');
    if (ctaMain) ctaMain.href = kineticHosting.affiliateUrl;
    if (ctaBottom) ctaBottom.href = kineticHosting.affiliateUrl;

    // Set why text
    const whyText = document.getElementById('kinetic-why-text');
    if (whyText) whyText.textContent = kineticHosting.whyWeChose;

    // Render stats
    renderKineticStats();

    // Render features
    renderKineticFeatures();
}

function renderKineticStats() {
    const container = document.getElementById('kinetic-stats');
    if (!container || !kineticHosting.stats) return;

    const fragment = document.createDocumentFragment();

    const wrapper = document.createElement('div');
    wrapper.className = 'grid grid-cols-2 md:grid-cols-4 gap-6';

    kineticHosting.stats.forEach(stat => {
        const statEl = document.createElement('div');
        statEl.className = 'text-center';
        statEl.innerHTML = `
            <div class="text-3xl md:text-4xl font-black kinetic-gradient-text mb-2">${stat.value}</div>
            <div class="text-gray-400 font-medium">${stat.label}</div>
        `;
        wrapper.appendChild(statEl);
    });

    fragment.appendChild(wrapper);
    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderKineticFeatures() {
    const container = document.getElementById('kinetic-features-grid');
    if (!container || !kineticHosting.features) return;

    const iconSvgs = {
        rocket: '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
        memory: '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>',
        support: '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
        panel: '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>',
        performance: '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
        price: '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };

    const fragment = document.createDocumentFragment();

    kineticHosting.features.forEach((feature, index) => {
        const card = document.createElement('div');
        card.className = 'kinetic-feature-card rounded-2xl p-6 fade-in';
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
            <div class="kinetic-feature-icon rounded-xl w-14 h-14 flex items-center justify-center mb-4">
                ${iconSvgs[feature.icon] || iconSvgs.rocket}
            </div>
            <h3 class="text-xl font-bold text-white mb-3">${feature.title}</h3>
            <p class="text-gray-400 leading-relaxed">${feature.description}</p>
        `;

        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}
