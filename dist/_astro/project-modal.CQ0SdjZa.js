const w="modulepreload",E=function(e){return"/"+e},h={},L=function(n,t,o){let s=Promise.resolve();if(t&&t.length>0){let l=function(a){return Promise.all(a.map(d=>Promise.resolve(d).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),v=i?.nonce||i?.getAttribute("nonce");s=l(t.map(a=>{if(a=E(a),a in h)return;h[a]=!0;const d=a.endsWith(".css"),u=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${a}"]${u}`))return;const c=document.createElement("link");if(c.rel=d?"stylesheet":w,d||(c.as="script"),c.crossOrigin="",c.href=a,v&&c.setAttribute("nonce",v),document.head.appendChild(c),d)return new Promise((y,x)=>{c.addEventListener("load",y),c.addEventListener("error",()=>x(new Error(`Unable to preload CSS for ${a}`)))})}))}function r(l){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=l,window.dispatchEvent(i),!i.defaultPrevented)throw l}return s.then(l=>{for(const i of l||[])i.status==="rejected"&&r(i.reason);return n().catch(r)})},b='a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';function $(e){const n=new AbortController;return requestAnimationFrame(()=>{e.querySelector(b)?.focus()}),e.addEventListener("keydown",o=>{if(o.key!=="Tab")return;const s=Array.from(e.querySelectorAll(b));if(s.length===0)return;const r=s[0],l=s[s.length-1];o.shiftKey?document.activeElement===r&&(o.preventDefault(),l.focus()):document.activeElement===l&&(o.preventDefault(),r.focus())},{signal:n.signal}),()=>n.abort()}const m=new Map,p=new Map,g=new Map;function k(e,n){const t=document.getElementById(e),o=document.getElementById(`${e}-content`);if(!t||!o)return;g.set(e,document.activeElement),m.get(e)?.abort();const s=new AbortController;m.set(e,s),o.innerHTML=n,t.classList.remove("hidden"),document.body.style.overflow="hidden",p.get(e)?.();const r=$(t);p.set(e,r),t.addEventListener("click",l=>{l.target===t&&f(e)},{signal:s.signal})}function f(e){const n=document.getElementById(e);if(!n)return;n.classList.add("hidden"),document.body.style.overflow="",p.get(e)?.(),p.delete(e),m.get(e)?.abort(),m.delete(e);const t=g.get(e);t&&t instanceof HTMLElement&&t.focus(),g.delete(e)}document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const n=document.getElementById("lightbox-modal"),t=document.getElementById("project-modal"),o=document.getElementById("blog-modal");n&&!n.classList.contains("hidden")?f("lightbox-modal"):o&&!o.classList.contains("hidden")?f("blog-modal"):t&&!t.classList.contains("hidden")&&f("project-modal")});function M(e,n){const t=e.screenshots.length>0?`
      <div class="modal-section-panel mb-5">
        <p class="modal-section-label">Screenshots</p>
        <div class="grid grid-cols-2 gap-2">
          ${e.screenshots.map((s,r)=>`
            <div class="modal-screenshot-wrap">
              <img
                src="${s}"
                alt="${e.name} screenshot ${r+1}"
                class="w-full h-32 object-cover cursor-pointer lightbox-trigger transition-opacity duration-200 hover:opacity-80"
                data-src="${s}"
                loading="lazy"
              />
            </div>
          `).join("")}
        </div>
      </div>`:"",o=e.features.map(s=>`
    <li class="modal-feature-item">
      <span class="modal-feature-dot" aria-hidden="true"></span>
      <span>${s}</span>
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
  `}export{L as _,f as c,k as o,M as r};
