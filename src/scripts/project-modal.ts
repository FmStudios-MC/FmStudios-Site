// Shared project modal HTML template

interface ProjectData {
  name: string;
  status: string;
  category: string;
  version: string;
  downloads: string;
  description: string;
  screenshots: string[];
  features: string[];
  downloadUrl: string;
  modrinthUrl?: string;
}

interface StatusConfig {
  label: string;
  badge: string;
}

export function renderProjectModalHtml(
  project: ProjectData,
  statusConfig: StatusConfig | undefined
): string {
  return `
    <div class="p-6 sm:p-8">
      <div class="flex justify-between items-start mb-6">
        <div class="flex-1">
          <h2 class="text-3xl font-black gradient-text mb-3">${project.name}</h2>
          <div class="flex flex-wrap gap-2">
            ${statusConfig ? `<span class="${statusConfig.badge} text-xs font-semibold px-2 py-0.5">${statusConfig.label}</span>` : ''}
            <span class="text-xs font-semibold px-2 py-0.5 capitalize" style="background-color: var(--accent); color: #fff;">${project.category}</span>
            <span class="text-xs font-mono px-2 py-0.5 border border-[var(--border-card)] text-muted">${project.version}</span>
            <span class="text-xs font-semibold px-2 py-0.5 text-dim" style="background-color: var(--bg-card); border: 1px solid var(--border-card);">${project.downloads} downloads</span>
          </div>
        </div>
        <button class="modal-close-btn ml-4" aria-label="Close modal">&times;</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <h3 class="text-sm font-bold uppercase tracking-widest mb-3 text-accent">Screenshots</h3>
          <div class="grid grid-cols-2 gap-3 mb-6">
            ${project.screenshots.map((s, i) => `<img src="${s}" alt="${project.name} screenshot ${i + 1}" class="w-full h-36 object-cover cursor-pointer hover:opacity-80 transition-opacity lightbox-trigger" data-src="${s}" loading="lazy" />`).join('')}
          </div>
          <h3 class="text-sm font-bold uppercase tracking-widest mb-3 text-accent">About</h3>
          <p class="text-muted" style="line-height: 1.75;">${project.description}</p>
        </div>

        <div>
          <h3 class="text-sm font-bold uppercase tracking-widest mb-3 text-accent">Features</h3>
          <ul class="space-y-2 mb-6">
            ${project.features.map((f) => `<li class="flex items-start gap-2 text-sm p-2 text-muted" style="border: 1px solid var(--border-card);"><span class="text-accent">&#9656;</span><span>${f}</span></li>`).join('')}
          </ul>

          <div class="space-y-3">
            <a href="${project.downloadUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary w-full flex items-center justify-center gap-2 text-center">CurseForge</a>
            ${project.modrinthUrl ? `<a href="${project.modrinthUrl}" target="_blank" rel="noopener noreferrer" class="btn-outline w-full flex items-center justify-center gap-2 text-center">Modrinth</a>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}
