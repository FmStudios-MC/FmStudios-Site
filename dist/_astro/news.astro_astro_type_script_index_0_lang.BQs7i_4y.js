import{_ as c,o as n,c as s}from"./modal.Cd8kksDI.js";import"./roadmap.astro_astro_type_script_index_0_lang.DXexo0ni.js";const{blogPosts:i,blogCategoryConfig:d}=await c(async()=>{const{blogPosts:e,blogCategoryConfig:a}=await import("./news.CVxVnJwS.js");return{blogPosts:e,blogCategoryConfig:a}},[]);document.querySelectorAll(".news-card").forEach(e=>{e.addEventListener("click",()=>{const a=Number(e.dataset.postId),t=i.find(o=>o.id===a);if(!t)return;const l=d[t.category]||d.news,r=`
          <div class="relative">
            <div class="aspect-video overflow-hidden">
              <img src="${t.image}" alt="${t.title}" class="w-full h-full object-cover" />
            </div>
            <button class="modal-close-btn absolute top-4 right-4" aria-label="Close modal">&times;</button>
          </div>
          <div class="p-6 sm:p-8">
            <div class="flex flex-wrap gap-2 mb-3">
              <span class="${l.badge} text-xs font-semibold px-2 py-0.5">${l.label}</span>
              ${t.tags.map(o=>`<span class="text-xs px-2 py-0.5 border border-[var(--border-card)] text-dim">#${o}</span>`).join("")}
            </div>
            <h1 class="text-3xl font-black mb-3 gradient-text">${t.title}</h1>
            <div class="flex items-center gap-4 text-sm mb-6 pb-4 border-b border-[var(--border-card)] text-dim">
              <span>${t.author}</span>
              <span>${t.date}</span>
            </div>
            <div class="blog-content">
              ${t.content}
            </div>
            <div class="mt-6 pt-4 border-t border-[var(--border-card)]">
              <button class="btn-primary inline-flex items-center gap-2 blog-modal-back-btn">
                Back to News
              </button>
            </div>
          </div>
        `;n("blog-modal",r),document.querySelectorAll("#blog-modal .modal-close-btn").forEach(o=>{o.addEventListener("click",()=>s("blog-modal"))}),document.querySelector("#blog-modal .blog-modal-back-btn")?.addEventListener("click",()=>{s("blog-modal")})})});
