import{_ as d,o as i}from"./modal.pjlDMRb4.js";import"./roadmap.astro_astro_type_script_index_0_lang.B_G4SpN-.js";const{blogPosts:n,blogCategoryConfig:l}=await d(async()=>{const{blogPosts:o,blogCategoryConfig:e}=await import("./news.CVxVnJwS.js");return{blogPosts:o,blogCategoryConfig:e}},[]);document.querySelectorAll(".news-card").forEach(o=>{o.addEventListener("click",()=>{const e=Number(o.dataset.postId),t=n.find(a=>a.id===e);if(!t)return;const s=l[t.category]||l.news,r=`
          <div class="relative">
            <div class="aspect-video overflow-hidden">
              <img src="${t.image}" alt="${t.title}" class="w-full h-full object-cover" />
            </div>
            <button onclick="window.__closeModal('blog-modal')" class="modal-close-btn absolute top-4 right-4">&times;</button>
          </div>
          <div class="p-6 sm:p-8">
            <div class="flex flex-wrap gap-2 mb-3">
              <span class="${s.badge} text-xs font-semibold px-2 py-0.5">${s.label}</span>
              ${t.tags.map(a=>`<span class="text-xs px-2 py-0.5 border border-[var(--border-card)]" style="color: var(--text-dim);">#${a}</span>`).join("")}
            </div>
            <h1 class="text-3xl font-black mb-3 gradient-text">${t.title}</h1>
            <div class="flex items-center gap-4 text-sm mb-6 pb-4 border-b border-[var(--border-card)]" style="color: var(--text-dim);">
              <span>${t.author}</span>
              <span>${t.date}</span>
            </div>
            <div class="blog-content">
              ${t.content}
            </div>
            <div class="mt-6 pt-4 border-t border-[var(--border-card)]">
              <button onclick="window.__closeModal('blog-modal')" class="btn-primary inline-flex items-center gap-2">
                Back to News
              </button>
            </div>
          </div>
        `;i("blog-modal",r)})});
