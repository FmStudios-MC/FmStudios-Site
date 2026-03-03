import{t as E}from"./focus-trap.D6MSMtLn.js";import{o as $}from"./lightbox.DmR49ypE.js";import"./news.astro_astro_type_script_index_0_lang.4M751h_K.js";const L="modulepreload",k=function(e){return"/"+e},v={},b=function(s,t,n){let o=Promise.resolve();if(t&&t.length>0){let l=function(a){return Promise.all(a.map(i=>Promise.resolve(i).then(m=>({status:"fulfilled",value:m}),m=>({status:"rejected",reason:m}))))};document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),p=r?.nonce||r?.getAttribute("nonce");o=l(t.map(a=>{if(a=k(a),a in v)return;v[a]=!0;const i=a.endsWith(".css"),m=i?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${a}"]${m}`))return;const d=document.createElement("link");if(d.rel=i?"stylesheet":L,i||(d.as="script"),d.crossOrigin="",d.href=a,p&&d.setAttribute("nonce",p),document.head.appendChild(d),i)return new Promise((x,w)=>{d.addEventListener("load",x),d.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${a}`)))})}))}function c(l){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=l,window.dispatchEvent(r),!r.defaultPrevented)throw l}return o.then(l=>{for(const r of l||[])r.status==="rejected"&&c(r.reason);return s().catch(c)})},f=new Map,g=new Map,h=new Map;function _(e,s){const t=document.getElementById(e),n=document.getElementById(`${e}-content`);if(!t||!n)return;h.set(e,document.activeElement),f.get(e)?.abort();const o=new AbortController;f.set(e,o),n.innerHTML=s,t.classList.remove("hidden"),document.body.style.overflow="hidden",g.get(e)?.();const c=E(t);g.set(e,c),t.addEventListener("click",l=>{l.target===t&&u(e)},{signal:o.signal})}function u(e){const s=document.getElementById(e);if(!s)return;s.classList.add("hidden"),document.body.style.overflow="",g.get(e)?.(),g.delete(e),f.get(e)?.abort(),f.delete(e);const t=h.get(e);t&&t instanceof HTMLElement&&t.focus(),h.delete(e)}document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const s=document.getElementById("lightbox-modal"),t=document.getElementById("project-modal"),n=document.getElementById("blog-modal");s&&!s.classList.contains("hidden")?u("lightbox-modal"):n&&!n.classList.contains("hidden")?u("blog-modal"):t&&!t.classList.contains("hidden")&&u("project-modal")});function j(e,s){const t=e.screenshots.length>0?`
      <div class="modal-section-panel mb-5">
        <p class="modal-section-label">Screenshots</p>
        <div class="grid grid-cols-2 gap-2">
          ${e.screenshots.map((o,c)=>`
            <div class="modal-screenshot-wrap">
              <img
                src="${o}"
                alt="${e.name} screenshot ${c+1}"
                class="w-full h-32 object-cover cursor-pointer lightbox-trigger transition-opacity duration-200 hover:opacity-80"
                data-src="${o}"
                loading="lazy"
              />
            </div>
          `).join("")}
        </div>
      </div>`:"",n=e.features.map(o=>`
    <li class="modal-feature-item">
      <span class="modal-feature-dot" aria-hidden="true"></span>
      <span>${o}</span>
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
              ${n}
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
  `}const y={projects:(await b(async()=>{const{projects:e}=await import("./projects.D1whbwl9.js");return{projects:e}},[])).projects,statusConfig:(await b(async()=>{const{statusConfig:e}=await import("./projects.D1whbwl9.js");return{statusConfig:e}},[])).statusConfig};document.querySelectorAll(".project-card").forEach(e=>{e.addEventListener("click",s=>{s.preventDefault();const t=Number(e.dataset.projectId),n=y.projects.find(l=>l.id===t);if(!n)return;const o=y.statusConfig[n.status],c=j(n,o);_("project-modal",c),document.querySelector("#project-modal .modal-close-btn")?.addEventListener("click",()=>{u("project-modal")}),document.querySelectorAll("#project-modal .lightbox-trigger").forEach((l,r)=>{l.addEventListener("click",()=>{const p=n.screenshots.map((a,i)=>({src:a,alt:`${n.name} screenshot ${i+1}`}));$(p,r)})})})});
