const w="modulepreload",E=function(e){return"/"+e},h={},k=function(n,t,s){let r=Promise.resolve();if(t&&t.length>0){let o=function(l){return Promise.all(l.map(d=>Promise.resolve(d).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),g=a?.nonce||a?.getAttribute("nonce");r=o(t.map(l=>{if(l=E(l),l in h)return;h[l]=!0;const d=l.endsWith(".css"),u=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${u}`))return;const c=document.createElement("link");if(c.rel=d?"stylesheet":w,d||(c.as="script"),c.crossOrigin="",c.href=l,g&&c.setAttribute("nonce",g),document.head.appendChild(c),d)return new Promise((x,y)=>{c.addEventListener("load",x),c.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${l}`)))})}))}function i(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return r.then(o=>{for(const a of o||[])a.status==="rejected"&&i(a.reason);return n().catch(i)})},v='a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';function $(e){const n=new AbortController;return requestAnimationFrame(()=>{e.querySelector(v)?.focus()}),e.addEventListener("keydown",s=>{if(s.key!=="Tab")return;const r=Array.from(e.querySelectorAll(v));if(r.length===0)return;const i=r[0],o=r[r.length-1];s.shiftKey?document.activeElement===i&&(s.preventDefault(),o.focus()):document.activeElement===o&&(s.preventDefault(),i.focus())},{signal:n.signal}),()=>n.abort()}const m=new Map,p=new Map,b=new Map;function L(e,n){const t=document.getElementById(e),s=document.getElementById(`${e}-content`);if(!t||!s)return;b.set(e,document.activeElement),m.get(e)?.abort();const r=new AbortController;m.set(e,r),s.innerHTML=n,t.classList.remove("hidden"),document.body.style.overflow="hidden",p.get(e)?.();const i=$(t);p.set(e,i),t.addEventListener("click",o=>{o.target===t&&f(e)},{signal:r.signal})}function f(e){const n=document.getElementById(e);if(!n)return;n.classList.add("hidden"),document.body.style.overflow="",p.get(e)?.(),p.delete(e),m.get(e)?.abort(),m.delete(e);const t=b.get(e);t&&t instanceof HTMLElement&&t.focus(),b.delete(e)}document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const n=document.getElementById("lightbox-modal"),t=document.getElementById("project-modal"),s=document.getElementById("blog-modal");n&&!n.classList.contains("hidden")?f("lightbox-modal"):s&&!s.classList.contains("hidden")?f("blog-modal"):t&&!t.classList.contains("hidden")&&f("project-modal")});function M(e,n){return`
    <div class="p-6 sm:p-8">
      <div class="flex justify-between items-start mb-6">
        <div class="flex-1">
          <h2 class="text-3xl font-black gradient-text mb-3">${e.name}</h2>
          <div class="flex flex-wrap gap-2">
            ${n?`<span class="${n.badge} text-xs font-semibold px-2 py-0.5">${n.label}</span>`:""}
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
            ${e.screenshots.map((t,s)=>`<img src="${t}" alt="${e.name} screenshot ${s+1}" class="w-full h-36 object-cover cursor-pointer hover:opacity-80 transition-opacity lightbox-trigger" data-src="${t}" loading="lazy" />`).join("")}
          </div>
          <h3 class="text-sm font-bold uppercase tracking-widest mb-3 text-accent">About</h3>
          <p class="text-muted" style="line-height: 1.75;">${e.description}</p>
        </div>

        <div>
          <h3 class="text-sm font-bold uppercase tracking-widest mb-3 text-accent">Features</h3>
          <ul class="space-y-2 mb-6">
            ${e.features.map(t=>`<li class="flex items-start gap-2 text-sm p-2 text-muted" style="border: 1px solid var(--border-card);"><span class="text-accent">&#9656;</span><span>${t}</span></li>`).join("")}
          </ul>

          <div class="space-y-3">
            <a href="${e.downloadUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary w-full flex items-center justify-center gap-2 text-center">CurseForge</a>
            ${e.modrinthUrl?`<a href="${e.modrinthUrl}" target="_blank" rel="noopener noreferrer" class="btn-outline w-full flex items-center justify-center gap-2 text-center">Modrinth</a>`:""}
          </div>
        </div>
      </div>
    </div>
  `}export{k as _,f as c,L as o,M as r};
