function l(e,t){return`
    <div class="p-6 sm:p-8">
      <div class="flex justify-between items-start mb-6">
        <div class="flex-1">
          <h2 class="text-3xl font-black gradient-text mb-3">${e.name}</h2>
          <div class="flex flex-wrap gap-2">
            ${t?`<span class="${t.badge} text-xs font-semibold px-2 py-0.5">${t.label}</span>`:""}
            <span class="text-xs font-semibold px-2 py-0.5 capitalize" style="background-color: var(--accent); color: #fff;">${e.category}</span>
            <span class="text-xs font-mono px-2 py-0.5 border border-[var(--border-card)] text-muted">${e.version}</span>
            <span class="text-xs font-semibold px-2 py-0.5 text-dim" style="background-color: var(--bg-card); border: 1px solid var(--border-card);">${e.downloads} downloads</span>
          </div>
        </div>
        <button class="modal-close-btn ml-4" aria-label="Close modal">&times;</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <h3 class="text-sm font-bold uppercase tracking-widest mb-3 text-accent">Screenshots</h3>
          <div class="grid grid-cols-2 gap-3 mb-6">
            ${e.screenshots.map((s,a)=>`<img src="${s}" alt="${e.name} screenshot ${a+1}" class="w-full h-36 object-cover cursor-pointer hover:opacity-80 transition-opacity lightbox-trigger" data-src="${s}" loading="lazy" />`).join("")}
          </div>
          <h3 class="text-sm font-bold uppercase tracking-widest mb-3 text-accent">About</h3>
          <p class="text-muted" style="line-height: 1.75;">${e.description}</p>
        </div>

        <div>
          <h3 class="text-sm font-bold uppercase tracking-widest mb-3 text-accent">Features</h3>
          <ul class="space-y-2 mb-6">
            ${e.features.map(s=>`<li class="flex items-start gap-2 text-sm p-2 text-muted" style="border: 1px solid var(--border-card);"><span class="text-accent">&#9656;</span><span>${s}</span></li>`).join("")}
          </ul>

          <div class="space-y-3">
            <a href="${e.downloadUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary w-full flex items-center justify-center gap-2 text-center">CurseForge</a>
            ${e.modrinthUrl?`<a href="${e.modrinthUrl}" target="_blank" rel="noopener noreferrer" class="btn-outline w-full flex items-center justify-center gap-2 text-center">Modrinth</a>`:""}
          </div>
        </div>
      </div>
    </div>
  `}export{l as r};
