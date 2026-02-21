// Project modal HTML template — Glassmorphism 2.0

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
  const screenshotsHtml = project.screenshots.length > 0
    ? `
      <div class="modal-section-panel mb-5">
        <p class="modal-section-label">Screenshots</p>
        <div class="grid grid-cols-2 gap-2">
          ${project.screenshots.map((s, i) => `
            <div class="modal-screenshot-wrap">
              <img
                src="${s}"
                alt="${project.name} screenshot ${i + 1}"
                class="w-full h-32 object-cover cursor-pointer lightbox-trigger transition-opacity duration-200 hover:opacity-80"
                data-src="${s}"
                loading="lazy"
              />
            </div>
          `).join('')}
        </div>
      </div>`
    : '';

  const featuresHtml = project.features.map((f) => `
    <li class="modal-feature-item">
      <span class="modal-feature-dot" aria-hidden="true"></span>
      <span>${f}</span>
    </li>
  `).join('');

  return `
    <div class="p-5 sm:p-7">

      <!-- Header row -->
      <div class="flex justify-between items-start mb-5">
        <div class="flex-1 min-w-0 pr-4">
          <h2 class="text-2xl sm:text-3xl font-black gradient-text mb-3 leading-tight">${project.name}</h2>
          <div class="flex flex-wrap gap-1.5">
            ${statusConfig ? `<span class="${statusConfig.badge} text-xs font-semibold px-2 py-0.5">${statusConfig.label}</span>` : ''}
            <span class="modal-tag-accent">${project.category}</span>
            <span class="modal-tag-mono">${project.version}</span>
            <span class="modal-tag-dim">${project.downloads} downloads</span>
          </div>
        </div>
        <button class="modal-close-btn flex-shrink-0" aria-label="Close modal">&times;</button>
      </div>

      <!-- Body grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- Left: screenshots + description -->
        <div class="lg:col-span-2 flex flex-col gap-5">
          ${screenshotsHtml}

          <div class="modal-section-panel">
            <p class="modal-section-label">About</p>
            <p style="color: var(--text-muted); line-height: 1.75; font-size: 0.9rem;">${project.description}</p>
          </div>
        </div>

        <!-- Right: features + download -->
        <div class="flex flex-col gap-4">
          <div class="modal-section-panel flex-1">
            <p class="modal-section-label">Features</p>
            <ul class="space-y-1.5">
              ${featuresHtml}
            </ul>
          </div>

          <div class="flex flex-col gap-2.5">
            <a
              href="${project.downloadUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3"
            >
              ↓ CurseForge
            </a>
            ${project.modrinthUrl ? `
            <a
              href="${project.modrinthUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-outline w-full flex items-center justify-center gap-2 text-sm py-3"
            >
              Modrinth
            </a>` : ''}
          </div>
        </div>

      </div>
    </div>
  `;
}
