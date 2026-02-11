import{_ as a,o as i}from"./modal.pjlDMRb4.js";import"./roadmap.astro_astro_type_script_index_0_lang.B_fvNa2S.js";const c={projects:(await a(async()=>{const{projects:e}=await import("./projects.DnwrZvn-.js");return{projects:e}},[])).projects,statusConfig:(await a(async()=>{const{statusConfig:e}=await import("./projects.DnwrZvn-.js");return{statusConfig:e}},[])).statusConfig};document.querySelectorAll(".project-card").forEach(e=>{e.addEventListener("click",()=>{const o=Number(e.dataset.projectId),t=c.projects.find(s=>s.id===o);if(!t)return;const r=c.statusConfig[t.status],l=`
          <div class="p-6 sm:p-8">
            <div class="flex justify-between items-start mb-6">
              <div class="flex-1">
                <h2 class="text-3xl font-black gradient-text mb-3">${t.name}</h2>
                <div class="flex flex-wrap gap-2">
                  ${r?`<span class="${r.badge} text-xs font-semibold px-2 py-0.5">${r.label}</span>`:""}
                  <span class="text-xs font-semibold px-2 py-0.5 capitalize" style="background-color: var(--accent); color: #fff;">${t.category}</span>
                  <span class="text-xs font-mono px-2 py-0.5 border border-[var(--border-card)]" style="color: var(--text-muted);">${t.version}</span>
                  <span class="text-xs font-semibold px-2 py-0.5" style="background-color: var(--bg-card); border: 1px solid var(--border-card); color: var(--text-dim);">${t.downloads} downloads</span>
                </div>
              </div>
              <button onclick="window.__closeModal('project-modal')" class="text-3xl ml-4 hover:opacity-70 transition-opacity" style="color: var(--text-dim);">&times;</button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div class="lg:col-span-2">
                <h3 class="text-sm font-bold uppercase tracking-widest mb-3" style="color: var(--accent);">Screenshots</h3>
                <div class="grid grid-cols-2 gap-3 mb-6">
                  ${t.screenshots.map((s,n)=>`
                    <img src="${s}" alt="Screenshot ${n+1}" class="w-full h-36 object-cover cursor-pointer hover:opacity-80 transition-opacity" onclick="window.__openLightbox('${s}')" loading="lazy" />
                  `).join("")}
                </div>
                <h3 class="text-sm font-bold uppercase tracking-widest mb-3" style="color: var(--accent);">About</h3>
                <p style="color: var(--text-muted); line-height: 1.75;">${t.description}</p>
              </div>

              <div>
                <h3 class="text-sm font-bold uppercase tracking-widest mb-3" style="color: var(--accent);">Features</h3>
                <ul class="space-y-2 mb-6">
                  ${t.features.map(s=>`
                    <li class="flex items-start gap-2 text-sm p-2" style="color: var(--text-muted); border: 1px solid var(--border-card);">
                      <span style="color: var(--accent);">&#9656;</span>
                      <span>${s}</span>
                    </li>
                  `).join("")}
                </ul>

                <div class="space-y-3">
                  <a href="${t.downloadUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary w-full flex items-center justify-center gap-2 text-center">
                    CurseForge
                  </a>
                  ${t.modrinthUrl?`
                    <a href="${t.modrinthUrl}" target="_blank" rel="noopener noreferrer" class="btn-outline w-full flex items-center justify-center gap-2 text-center">
                      Modrinth
                    </a>
                  `:""}
                </div>
              </div>
            </div>
          </div>
        `;i("project-modal",l)})});window.__openLightbox=e=>{const o=document.getElementById("lightbox-modal"),t=document.getElementById("lightbox-img");!o||!t||(t.src=e,o.classList.remove("hidden"),document.body.style.overflow="hidden",o.addEventListener("click",r=>{r.target===o&&(o.classList.add("hidden"),document.body.style.overflow="")}))};
