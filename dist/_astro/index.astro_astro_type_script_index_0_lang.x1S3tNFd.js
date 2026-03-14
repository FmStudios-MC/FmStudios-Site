import{t as w}from"./focus-trap.D6MSMtLn.js";import{o as $}from"./lightbox.Dk2eHqVD.js";import"./news.astro_astro_type_script_index_0_lang.Cd9hUnRD.js";const L=(function(){const s=typeof document<"u"&&document.createElement("link").relList;return s&&s.supports&&s.supports("modulepreload")?"modulepreload":"preload"})(),k=function(e){return"/"+e},h={},y=function(s,t,n){let l=Promise.resolve();if(t&&t.length>0){let g=function(r){return Promise.all(r.map(i=>Promise.resolve(i).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),a=o?.nonce||o?.getAttribute("nonce");l=g(t.map(r=>{if(r=k(r),r in h)return;h[r]=!0;const i=r.endsWith(".css"),u=i?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${r}"]${u}`))return;const d=document.createElement("link");if(d.rel=i?"stylesheet":L,i||(d.as="script"),d.crossOrigin="",d.href=r,a&&d.setAttribute("nonce",a),document.head.appendChild(d),i)return new Promise((x,E)=>{d.addEventListener("load",x),d.addEventListener("error",()=>E(new Error(`Unable to preload CSS for ${r}`)))})}))}function c(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return l.then(o=>{for(const a of o||[])a.status==="rejected"&&c(a.reason);return s().catch(c)})},p=new Map,f=new Map,v=new Map;function _(e,s){const t=document.getElementById(e),n=document.getElementById(`${e}-content`);if(!t||!n)return;v.set(e,document.activeElement),p.get(e)?.abort();const l=new AbortController;p.set(e,l),n.innerHTML=s,t.style.display="flex",document.body.style.overflow="hidden",f.get(e)?.();const c=w(t);f.set(e,c),t.addEventListener("click",o=>{o.target===t&&m(e)},{signal:l.signal})}function m(e){const s=document.getElementById(e);if(!s)return;s.style.display="none",document.body.style.overflow="",f.get(e)?.(),f.delete(e),p.get(e)?.abort(),p.delete(e);const t=v.get(e);t&&t instanceof HTMLElement&&t.focus(),v.delete(e)}document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const s=document.getElementById("lightbox-modal"),t=document.getElementById("project-modal"),n=document.getElementById("blog-modal");s&&s.style.display!=="none"?m("lightbox-modal"):n&&n.style.display!=="none"?m("blog-modal"):t&&t.style.display!=="none"&&m("project-modal")});function j(e,s){const t=e.screenshots.length>0?`
      <div class="modal-section-panel mb-5">
        <p class="modal-section-label">Screenshots</p>
        <div class="grid grid-cols-2 gap-2">
          ${e.screenshots.map((l,c)=>`
            <div class="modal-screenshot-wrap">
              <img
                src="${l}"
                alt="${e.name} screenshot ${c+1}"
                class="w-full h-32 object-cover cursor-pointer lightbox-trigger transition-opacity duration-200 hover:opacity-80"
                data-src="${l}"
                loading="lazy"
              />
            </div>
          `).join("")}
        </div>
      </div>`:"",n=e.features.map(l=>`
    <li class="modal-feature-item">
      <span class="modal-feature-dot" aria-hidden="true"></span>
      <span>${l}</span>
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
  `}const b={projects:(await y(async()=>{const{projects:e}=await import("./projects.D9E2Kti0.js");return{projects:e}},[])).projects,statusConfig:(await y(async()=>{const{statusConfig:e}=await import("./projects.D9E2Kti0.js");return{statusConfig:e}},[])).statusConfig};document.querySelectorAll(".project-card").forEach(e=>{e.addEventListener("click",s=>{s.preventDefault();const t=Number(e.dataset.projectId),n=b.projects.find(o=>o.id===t);if(!n)return;const l=b.statusConfig[n.status],c=j(n,l);_("project-modal",c),document.querySelector("#project-modal .modal-close-btn")?.addEventListener("click",()=>{m("project-modal")}),document.querySelectorAll("#project-modal .lightbox-trigger").forEach((o,a)=>{o.addEventListener("click",()=>{const g=n.screenshots.map((r,i)=>({src:r,alt:`${n.name} screenshot ${i+1}`}));$(g,a)})})})});
