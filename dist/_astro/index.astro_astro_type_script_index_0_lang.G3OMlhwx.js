import{o as $}from"./lightbox.DpWZFFGm.js";import"./news.astro_astro_type_script_index_0_lang.DXexo0ni.js";const L="modulepreload",k=function(e){return"/"+e},v={},b=function(s,t,o){let n=Promise.resolve();if(t&&t.length>0){let r=function(a){return Promise.all(a.map(d=>Promise.resolve(d).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const c=document.querySelector("meta[property=csp-nonce]"),f=c?.nonce||c?.getAttribute("nonce");n=r(t.map(a=>{if(a=k(a),a in v)return;v[a]=!0;const d=a.endsWith(".css"),u=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${a}"]${u}`))return;const i=document.createElement("link");if(i.rel=d?"stylesheet":L,d||(i.as="script"),i.crossOrigin="",i.href=a,f&&i.setAttribute("nonce",f),document.head.appendChild(i),d)return new Promise((E,w)=>{i.addEventListener("load",E),i.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${a}`)))})}))}function l(r){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=r,window.dispatchEvent(c),!c.defaultPrevented)throw r}return n.then(r=>{for(const c of r||[])c.status==="rejected"&&l(c.reason);return s().catch(l)})},y='a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';function _(e){const s=new AbortController;return requestAnimationFrame(()=>{e.querySelector(y)?.focus()}),e.addEventListener("keydown",o=>{if(o.key!=="Tab")return;const n=Array.from(e.querySelectorAll(y));if(n.length===0)return;const l=n[0],r=n[n.length-1];o.shiftKey?document.activeElement===l&&(o.preventDefault(),r.focus()):document.activeElement===r&&(o.preventDefault(),l.focus())},{signal:s.signal}),()=>s.abort()}const p=new Map,g=new Map,h=new Map;function j(e,s){const t=document.getElementById(e),o=document.getElementById(`${e}-content`);if(!t||!o)return;h.set(e,document.activeElement),p.get(e)?.abort();const n=new AbortController;p.set(e,n),o.innerHTML=s,t.classList.remove("hidden"),document.body.style.overflow="hidden",g.get(e)?.();const l=_(t);g.set(e,l),t.addEventListener("click",r=>{r.target===t&&m(e)},{signal:n.signal})}function m(e){const s=document.getElementById(e);if(!s)return;s.classList.add("hidden"),document.body.style.overflow="",g.get(e)?.(),g.delete(e),p.get(e)?.abort(),p.delete(e);const t=h.get(e);t&&t instanceof HTMLElement&&t.focus(),h.delete(e)}document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const s=document.getElementById("lightbox-modal"),t=document.getElementById("project-modal"),o=document.getElementById("blog-modal");s&&!s.classList.contains("hidden")?m("lightbox-modal"):o&&!o.classList.contains("hidden")?m("blog-modal"):t&&!t.classList.contains("hidden")&&m("project-modal")});function A(e,s){const t=e.screenshots.length>0?`
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
  `}const x={projects:(await b(async()=>{const{projects:e}=await import("./projects.D1whbwl9.js");return{projects:e}},[])).projects,statusConfig:(await b(async()=>{const{statusConfig:e}=await import("./projects.D1whbwl9.js");return{statusConfig:e}},[])).statusConfig};document.querySelectorAll(".project-card").forEach(e=>{e.addEventListener("click",()=>{const s=Number(e.dataset.projectId),t=x.projects.find(l=>l.id===s);if(!t)return;const o=x.statusConfig[t.status],n=A(t,o);j("project-modal",n),document.querySelector("#project-modal .modal-close-btn")?.addEventListener("click",()=>{m("project-modal")}),document.querySelectorAll("#project-modal .lightbox-trigger").forEach((l,r)=>{l.addEventListener("click",()=>{const c=t.screenshots.map((f,a)=>({src:f,alt:`${t.name} screenshot ${a+1}`}));$(c,r)})})})});
