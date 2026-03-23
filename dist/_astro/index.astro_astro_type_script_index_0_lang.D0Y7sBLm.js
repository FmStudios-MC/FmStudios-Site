import{_ as p}from"./preload-helper.bFjQlsqE.js";import{t as y}from"./focus-trap.D6MSMtLn.js";import{o as b}from"./lightbox.Dk2eHqVD.js";import"./news.astro_astro_type_script_index_1_lang.Cd9hUnRD.js";const c=new Map,i=new Map,d=new Map;function h(e,s){const t=document.getElementById(e),o=document.getElementById(`${e}-content`);if(!t||!o)return;d.set(e,document.activeElement),c.get(e)?.abort();const n=new AbortController;c.set(e,n),o.innerHTML=s,t.style.display="flex",document.body.style.overflow="hidden",i.get(e)?.();const l=y(t);i.set(e,l),t.addEventListener("click",a=>{a.target===t&&r(e)},{signal:n.signal})}function r(e){const s=document.getElementById(e);if(!s)return;s.style.display="none",document.body.style.overflow="",i.get(e)?.(),i.delete(e),c.get(e)?.abort(),c.delete(e);const t=d.get(e);t&&t instanceof HTMLElement&&t.focus(),d.delete(e)}document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const s=document.getElementById("lightbox-modal"),t=document.getElementById("project-modal"),o=document.getElementById("blog-modal");s&&s.style.display!=="none"?r("lightbox-modal"):o&&o.style.display!=="none"?r("blog-modal"):t&&t.style.display!=="none"&&r("project-modal")});function x(e,s){const t=e.screenshots.length>0?`
      <div class="modal-section-panel mb-5">
        <p class="modal-section-label">Screenshots</p>
        <div class="grid grid-cols-2 gap-2">
          ${e.screenshots.map((n,l)=>`
            <div class="modal-screenshot-wrap">
              <img
                src="${n}"
                alt="${e.name} screenshot ${l+1}"
                class="w-full h-32 object-cover cursor-pointer lightbox-trigger transition-opacity duration-200 hover:opacity-80"
                data-src="${n}"
                loading="lazy"
              />
            </div>
          `).join("")}
        </div>
      </div>`:"",o=e.features.map(n=>`
    <li class="modal-feature-item">
      <span class="modal-feature-dot" aria-hidden="true"></span>
      <span>${n}</span>
    </li>
  `).join("");return`
    <div class="p-5 sm:p-7">

      <!-- Header row -->
      <div class="flex justify-between items-start mb-5">
        <div class="flex-1 min-w-0 pr-4">
          <h2 class="text-2xl sm:text-3xl font-black gradient-text mb-3 leading-tight">${e.name}</h2>
          <div class="flex flex-wrap gap-1.5">
            ${s?`<span class="${s.badge} text-xs font-semibold px-2 py-0.5">${s.label}</span>`:""}
            <span class="modal-tag-accent">${e.category}</span>
            <span class="modal-tag-mono">${e.version}</span>
            <span class="modal-tag-dim">${e.downloads} downloads</span>
          </div>
        </div>
        <button class="modal-close-btn flex-shrink-0" aria-label="Close modal">&times;</button>
      </div>

      <!-- Body grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- Left: screenshots + description -->
        <div class="lg:col-span-2 flex flex-col gap-5">
          ${t}

          <div class="modal-section-panel">
            <p class="modal-section-label">About</p>
            <p style="color: var(--text-muted); line-height: 1.75; font-size: 0.9rem;">${e.description}</p>
          </div>
        </div>

        <!-- Right: features + download -->
        <div class="flex flex-col gap-4">
          <div class="modal-section-panel flex-1">
            <p class="modal-section-label">Features</p>
            <ul class="space-y-1.5">
              ${o}
            </ul>
          </div>

          <div class="flex flex-col gap-2.5">
            <a
              href="${e.downloadUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3"
            >
              ↓ CurseForge
            </a>
            ${e.modrinthUrl?`
            <a
              href="${e.modrinthUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-outline w-full flex items-center justify-center gap-2 text-sm py-3"
            >
              Modrinth
            </a>`:""}
          </div>
        </div>

      </div>
    </div>
  `}const m={projects:(await p(async()=>{const{projects:e}=await import("./projects.D8YzREi0.js");return{projects:e}},[])).projects,statusConfig:(await p(async()=>{const{statusConfig:e}=await import("./projects.D8YzREi0.js");return{statusConfig:e}},[])).statusConfig};document.querySelectorAll(".project-card").forEach(e=>{e.addEventListener("click",s=>{s.preventDefault();const t=Number(e.dataset.projectId),o=m.projects.find(a=>a.id===t);if(!o)return;const n=m.statusConfig[o.status],l=x(o,n);h("project-modal",l),document.querySelector("#project-modal .modal-close-btn")?.addEventListener("click",()=>{r("project-modal")}),document.querySelectorAll("#project-modal .lightbox-trigger").forEach((a,u)=>{a.addEventListener("click",()=>{const g=o.screenshots.map((f,v)=>({src:f,alt:`${o.name} screenshot ${v+1}`}));b(g,u)})})})});
