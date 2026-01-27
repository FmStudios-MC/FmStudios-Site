// Global state
let currentFilter = 'all';
let currentModpackFilter = 'all';
let searchQuery = '';
let filteredProjects = [];
let currentRoadmapFilter = 'all';

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

function openTeamModal(memberId) {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    const socialLinks = [];
    if (member.social.discord) {
        socialLinks.push(`
            <div class="glass rounded-xl px-6 py-3 flex items-center space-x-3">
                <svg class="w-5 h-5" fill="#5865F2" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/></svg>
                <span class="text-white font-medium">${member.social.discord}</span>
            </div>
        `);
    }
    if (member.social.instagram) {
        socialLinks.push(`
            <a href="${member.social.instagram}" target="_blank" rel="noopener noreferrer" class="social-btn glass rounded-xl px-6 py-3 flex items-center space-x-3 transition-all relative z-10">
                <svg class="w-5 h-5" fill="#E4405F" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                <span class="text-white font-medium">Instagram</span>
            </a>
        `);
    }

    const modal = document.getElementById('team-modal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="modal-content glass-strong rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-8">
                <div class="flex justify-between items-start mb-8">
                    <div class="flex-1">
                        <div class="flex items-center space-x-6 mb-6">
                            <img src="${member.image}" alt="${member.name}" class="w-32 h-32 rounded-2xl object-cover shadow-lg neon-pink" loading="lazy">
                            <div>
                                <h2 class="text-4xl font-black gradient-text mb-2">${member.name}</h2>
                                <p class="text-xl text-gray-400 font-semibold mb-4">${member.rank}</p>
                            </div>
                        </div>
                    </div>
                    <button onclick="closeTeamModal()" class="text-gray-400 hover:text-pink-400 text-4xl transition-colors ml-4" aria-label="Close modal">&times;</button>
                </div>

                <div class="glass rounded-2xl p-6">
                    <h3 class="text-2xl font-bold mb-4 gradient-text">📖 About</h3>
                    <p class="text-gray-300 leading-relaxed text-lg">${member.description}</p>
                </div>

                ${socialLinks.length > 0 ? `
                    <div class="glass rounded-2xl p-6 mt-6">
                        <h3 class="text-2xl font-bold mb-4 gradient-text">🔗 Connect</h3>
                        <div class="flex flex-wrap gap-4">${socialLinks.join('')}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeTeamModal() {
    const modal = document.getElementById('team-modal');
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

function renderTeam() {
    const grid = document.getElementById('team-grid');
    if (!grid) return;
    
    const fragment = document.createDocumentFragment();
    
    teamMembers.forEach((member, index) => {
        const card = document.createElement('div');
        card.className = 'project-card glass rounded-3xl p-6 fade-in cursor-pointer glow-on-scroll';
        card.style.animationDelay = `${index * 0.05}s`;
        card.onclick = () => openTeamModal(member.id);
        
        card.innerHTML = `
            <div class="flex flex-col items-center text-center">
                <img src="${member.image}" alt="${member.name}" class="w-40 h-40 rounded-2xl object-cover shadow-lg mb-4 neon-pink" loading="lazy">
                <h3 class="text-2xl font-bold text-white mb-2">${member.name}</h3>
                <span class="inline-block gradient-accent text-sm font-bold px-4 py-2 rounded-full mb-4">${member.rank}</span>
                <p class="text-gray-400 text-sm mb-4 line-clamp-3">${member.description.substring(0, 100)}...</p>
                <span class="gradient-text font-bold text-sm">View Profile →</span>
            </div>
        `;
        
        fragment.appendChild(card);
    });
    
    grid.appendChild(fragment);
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
