// Global state
let currentFilter = 'all';
let currentModpackFilter = 'all';
let searchQuery = '';
let filteredProjects = [...projects];

// Create floating particles
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.width = particle.style.height = (Math.random() * 3 + 2) + 'px';
        particlesContainer.appendChild(particle);
    }
}

// Page navigation
function showPage(pageId) {
    const currentPage = document.querySelector('.page:not(.hidden)');
    const targetPage = document.getElementById(pageId + '-page');
    
    if (currentPage) {
        currentPage.style.opacity = '0';
        setTimeout(() => {
            currentPage.classList.add('hidden');
            targetPage.classList.remove('hidden');
            targetPage.style.opacity = '0';
            setTimeout(() => {
                targetPage.style.opacity = '1';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 50);
        }, 150);
    } else {
        targetPage.classList.remove('hidden');
        targetPage.style.opacity = '1';
    }
    
    // Close mobile menu if open
    const mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
}

// Mobile menu toggle
function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

// Search functionality
function searchProjects() {
    searchQuery = document.getElementById('search-input').value.toLowerCase();
    applyFilters();
}

// Filter by category
function filterProjects(category) {
    currentFilter = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active', 'gradient-accent');
        btn.classList.add('glass');
    });
    event.target.classList.add('active', 'gradient-accent');
    event.target.classList.remove('glass');
    
    const modpackFilter = document.getElementById('modpack-filter');
    if (category === 'modpacks') {
        modpackFilter.classList.remove('hidden');
    } else {
        modpackFilter.classList.add('hidden');
        currentModpackFilter = 'all';
    }
    
    applyFilters();
}

// Filter modpacks by subcategory
function filterModpacks(subcategory) {
    currentModpackFilter = subcategory;
    
    document.querySelectorAll('.modpack-btn').forEach(btn => {
        btn.classList.remove('active', 'gradient-accent');
        btn.classList.add('glass');
    });
    event.target.classList.add('active', 'gradient-accent');
    event.target.classList.remove('glass');
    
    applyFilters();
}

// Apply all filters
function applyFilters() {
    filteredProjects = projects.filter(project => {
        if (currentFilter !== 'all' && project.category !== currentFilter) return false;
        if (currentFilter === 'modpacks' && currentModpackFilter !== 'all' && project.subcategory !== currentModpackFilter) return false;
        if (searchQuery && !project.name.toLowerCase().includes(searchQuery) && 
            !project.description.toLowerCase().includes(searchQuery) &&
            !project.features.some(feature => feature.toLowerCase().includes(searchQuery))) return false;
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
    countElement.textContent = count === total ? `Showing all ${total} projects` : `Showing ${count} of ${total} projects`;
}

// Render projects grid
function renderProjects() {
    const grid = document.getElementById('projects-grid');
    const noResults = document.getElementById('no-results');
    
    if (filteredProjects.length === 0) {
        grid.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    
    setTimeout(() => {
        grid.innerHTML = filteredProjects.map((project, index) => `
            <div class="project-card glass rounded-3xl p-6 fade-in glow-on-scroll" onclick="openModal(${project.id})" style="animation-delay: ${index * 0.1}s">
                <div class="flex items-start space-x-4 mb-4">
                    <img src="${project.logo}" alt="${project.name}" class="w-20 h-20 rounded-2xl object-cover shadow-lg">
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
                        <span>🕒 ${project.lastUpdate}</span>
                    </div>
                    <span class="gradient-text font-bold text-sm">View Details →</span>
                </div>
            </div>
        `).join('');
        setupScrollEffects();
    }, 200);
}

// Scroll to top
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle scroll events
function handleScroll() {
    const fab = document.querySelector('.floating-action');
    if (window.scrollY > 300) {
        fab.style.opacity = '1';
        fab.style.transform = 'scale(1)';
    } else {
        fab.style.opacity = '0';
        fab.style.transform = 'scale(0.8)';
    }
}

// Setup scroll effects
function setupScrollEffects() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.glow-on-scroll').forEach(el => {
        observer.observe(el);
    });
}
// Modal functions - copy this into js/ui.js after Part 1

// Open project modal
function openModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const modal = document.getElementById('project-modal');
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
                    <button onclick="closeModal()" class="text-gray-400 hover:text-pink-400 text-4xl transition-colors ml-4">&times;</button>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2">
                        <h3 class="text-2xl font-bold mb-4 gradient-text">📸 Screenshots & Media</h3>
                        <div class="grid grid-cols-2 gap-4 mb-8">
                            ${project.screenshots.map((screenshot, index) => `
                                <img src="${screenshot}" alt="Screenshot ${index + 1}" 
                                     class="w-full h-40 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-all hover:scale-105" 
                                     onclick="openLightbox('${screenshot}', 'Screenshot ${index + 1}')">
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
                            <a href="${project.downloadUrl}" target="_blank" class="block w-full gradient-accent rounded-2xl px-6 py-4 font-bold text-center transition-all hover:scale-105 text-white text-lg pulse-btn">
                                <svg class="w-6 h-6 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                                </svg>
                                CurseForge
                            </a>
                            ${project.modrinthUrl ? `
                                <a href="${project.modrinthUrl}" target="_blank" class="block w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 rounded-2xl px-6 py-4 font-bold text-center transition-all hover:scale-105 text-white text-lg">
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

// Close project modal
function closeModal() {
    const modal = document.getElementById('project-modal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.opacity = '1';
        document.body.style.overflow = 'auto';
    }, 200);
}

// Open team member modal
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
            <a href="${member.social.instagram}" target="_blank" class="social-btn glass rounded-xl px-6 py-3 flex items-center space-x-3 transition-all relative z-10">
                <svg class="w-5 h-5" fill="#E4405F" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                <span class="text-white font-medium">Instagram</span>
            </a>
        `);
    }

    const modal = document.getElementById('team-modal');
    modal.innerHTML = `
        <div class="modal-content glass-strong rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-8">
                <div class="flex justify-between items-start mb-8">
                    <div class="flex-1">
                        <div class="flex items-center space-x-6 mb-6">
                            <img src="${member.image}" alt="${member.name}" class="w-32 h-32 rounded-2xl object-cover shadow-lg neon-pink">
                            <div>
                                <h2 class="text-4xl font-black gradient-text mb-2">${member.name}</h2>
                                <p class="text-xl text-gray-400 font-semibold mb-4">${member.rank}</p>
                            </div>
                        </div>
                    </div>
                    <button onclick="closeTeamModal()" class="text-gray-400 hover:text-pink-400 text-4xl transition-colors ml-4">&times;</button>
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

// Close team modal
function closeTeamModal() {
    const modal = document.getElementById('team-modal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.opacity = '1';
        document.body.style.overflow = 'auto';
    }, 200);
}

// Open lightbox
function openLightbox(imageSrc, caption = '') {
    const lightbox = document.getElementById('lightbox');
    lightbox.innerHTML = `
        <div class="relative max-w-6xl max-h-[90vh]">
            <button onclick="closeLightbox()" class="absolute -top-16 right-0 text-white text-4xl hover:text-pink-400 transition-colors z-10">&times;</button>
            <img src="${imageSrc}" alt="${caption}" class="max-w-full max-h-full rounded-2xl shadow-2xl">
            <div class="absolute bottom-6 left-6 right-6 text-center">
                <p class="text-white bg-black bg-opacity-70 rounded-xl px-6 py-3 inline-block font-medium">${caption}</p>
            </div>
        </div>
    `;
    lightbox.classList.remove('hidden');
}

// Close lightbox
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.style.opacity = '0';
    setTimeout(() => {
        lightbox.classList.add('hidden');
        lightbox.style.opacity = '1';
    }, 200);
}

// Render team
function renderTeam() {
    const grid = document.getElementById('team-grid');
    grid.innerHTML = teamMembers.map((member, index) => `
        <div class="project-card glass rounded-3xl p-6 fade-in cursor-pointer glow-on-scroll" onclick="openTeamModal(${member.id})" style="animation-delay: ${index * 0.1}s">
            <div class="flex flex-col items-center text-center">
                <img src="${member.image}" alt="${member.name}" class="w-40 h-40 rounded-2xl object-cover shadow-lg mb-4 neon-pink">
                <h3 class="text-2xl font-bold text-white mb-2">${member.name}</h3>
                <span class="inline-block gradient-accent text-sm font-bold px-4 py-2 rounded-full mb-4">${member.rank}</span>
                <p class="text-gray-400 text-sm mb-4 line-clamp-3">${member.description.substring(0, 100)}...</p>
                <span class="gradient-text font-bold text-sm">View Profile →</span>
            </div>
        </div>
    `).join('');
}

// Render changelog
function renderChangelog() {
    const container = document.getElementById('changelog-content');
    const changelogEntries = Object.entries(changelogs);
    
    container.innerHTML = changelogEntries.map(([projectName, entries]) => `
        <div class="glass rounded-3xl overflow-hidden glow-on-scroll">
            <button onclick="toggleChangelog('${projectName.replace(/\s+/g, '-').replace(/[{}]/g, '')}')" class="w-full p-6 text-left flex justify-between items-center hover:bg-white hover:bg-opacity-5 transition-all">
                <div>
                    <h3 class="text-2xl font-bold gradient-text mb-2">${projectName}</h3>
                    <p class="text-sm text-gray-400 font-medium">${entries.length} version${entries.length > 1 ? 's' : ''} • Click to expand</p>
                </div>
                <svg class="w-8 h-8 transform transition-transform duration-300" id="icon-${projectName.replace(/\s+/g, '-').replace(/[{}]/g, '')}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            <div id="changelog-${projectName.replace(/\s+/g, '-').replace(/[{}]/g, '')}" class="hidden border-t border-white border-opacity-10">
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
        </div>
    `).join('');
}

// Toggle changelog
function toggleChangelog(projectId) {
    const content = document.getElementById(`changelog-${projectId}`);
    const icon = document.getElementById(`icon-${projectId}`);
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}
