import{o as $}from"./lightbox.ohnfpdsL.js";import"./news.astro_astro_type_script_index_0_lang.DXexo0ni.js";const L="modulepreload",k=function(e){return"/"+e},v={},b=function(n,t,s){let o=Promise.resolve();if(t&&t.length>0){let l=function(r){return Promise.all(r.map(i=>Promise.resolve(i).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const c=document.querySelector("meta[property=csp-nonce]"),f=c?.nonce||c?.getAttribute("nonce");o=l(t.map(r=>{if(r=k(r),r in v)return;v[r]=!0;const i=r.endsWith(".css"),u=i?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${r}"]${u}`))return;const d=document.createElement("link");if(d.rel=i?"stylesheet":L,i||(d.as="script"),d.crossOrigin="",d.href=r,f&&d.setAttribute("nonce",f),document.head.appendChild(d),i)return new Promise((E,w)=>{d.addEventListener("load",E),d.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${r}`)))})}))}function a(l){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=l,window.dispatchEvent(c),!c.defaultPrevented)throw l}return o.then(l=>{for(const c of l||[])c.status==="rejected"&&a(c.reason);return n().catch(a)})},y='a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';function _(e){const n=new AbortController;return requestAnimationFrame(()=>{e.querySelector(y)?.focus()}),e.addEventListener("keydown",s=>{if(s.key!=="Tab")return;const o=Array.from(e.querySelectorAll(y));if(o.length===0)return;const a=o[0],l=o[o.length-1];s.shiftKey?document.activeElement===a&&(s.preventDefault(),l.focus()):document.activeElement===l&&(s.preventDefault(),a.focus())},{signal:n.signal}),()=>n.abort()}const p=new Map,g=new Map,h=new Map;function j(e,n){const t=document.getElementById(e),s=document.getElementById(`${e}-content`);if(!t||!s)return;h.set(e,document.activeElement),p.get(e)?.abort();const o=new AbortController;p.set(e,o),s.innerHTML=n,t.classList.remove("hidden"),document.body.style.overflow="hidden",g.get(e)?.();const a=_(t);g.set(e,a),t.addEventListener("click",l=>{l.target===t&&m(e)},{signal:o.signal})}function m(e){const n=document.getElementById(e);if(!n)return;n.classList.add("hidden"),document.body.style.overflow="",g.get(e)?.(),g.delete(e),p.get(e)?.abort(),p.delete(e);const t=h.get(e);t&&t instanceof HTMLElement&&t.focus(),h.delete(e)}document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const n=document.getElementById("lightbox-modal"),t=document.getElementById("project-modal"),s=document.getElementById("blog-modal");n&&!n.classList.contains("hidden")?m("lightbox-modal"):s&&!s.classList.contains("hidden")?m("blog-modal"):t&&!t.classList.contains("hidden")&&m("project-modal")});function A(e,n){const t=e.screenshots.length>0?`
      <div class="modal-section-panel mb-5">
        <p class="modal-section-label">Screenshots</p>
        <div class="grid grid-cols-2 gap-2">
          ${e.screenshots.map((o,a)=>`
            <div class="modal-screenshot-wrap">
              <img
                src="${o}"
                alt="${e.name} screenshot ${a+1}"
                class="w-full h-32 object-cover cursor-pointer lightbox-trigger transition-opacity duration-200 hover:opacity-80"
                data-src="${o}"
                loading="lazy"
              />
            </div>
          `).join("")}
        </div>
      </div>`:"",s=e.features.map(o=>`
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
            ${n?`<span class="${n.badge} text-xs font-semibold px-2 py-0.5">${n.label}</span>`:""}
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
              ${s}
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
  `}const x={projects:(await b(async()=>{const{projects:e}=await import("./projects.D1whbwl9.js");return{projects:e}},[])).projects,statusConfig:(await b(async()=>{const{statusConfig:e}=await import("./projects.D1whbwl9.js");return{statusConfig:e}},[])).statusConfig};document.querySelectorAll(".project-card").forEach(e=>{e.addEventListener("click",n=>{n.preventDefault();const t=Number(e.dataset.projectId),s=x.projects.find(l=>l.id===t);if(!s)return;const o=x.statusConfig[s.status],a=A(s,o);j("project-modal",a),document.querySelector("#project-modal .modal-close-btn")?.addEventListener("click",()=>{m("project-modal")}),document.querySelectorAll("#project-modal .lightbox-trigger").forEach((l,c)=>{l.addEventListener("click",()=>{const f=s.screenshots.map((r,i)=>({src:r,alt:`${s.name} screenshot ${i+1}`}));$(f,c)})})})});
