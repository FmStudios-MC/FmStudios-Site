import{_ as i,o as d}from"./modal.pjlDMRb4.js";import"./roadmap.astro_astro_type_script_index_0_lang.B_fvNa2S.js";const{blogPosts:n,blogCategoryConfig:l}=await i(async()=>{const{blogPosts:e,blogCategoryConfig:o}=await import("./news.BnW5VFxS.js");return{blogPosts:e,blogCategoryConfig:o}},[]);document.querySelectorAll(".news-card").forEach(e=>{e.addEventListener("click",()=>{const o=Number(e.dataset.postId),t=n.find(s=>s.id===o);if(!t)return;const a=l[t.category]||l.news,r=`
          <div class="relative">
            <div class="aspect-video overflow-hidden">
              <img src="${t.image}" alt="${t.title}" class="w-full h-full object-cover" />
            </div>
            <button onclick="window.__closeModal('blog-modal')" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white text-xl" style="background: rgba(0,0,0,0.5);">&times;</button>
          </div>
          <div class="p-6 sm:p-8">
            <div class="flex flex-wrap gap-2 mb-3">
              <span class="${a.badge} text-xs font-semibold px-2 py-0.5">${a.label}</span>
              ${t.tags.map(s=>`<span class="text-xs px-2 py-0.5 border border-[var(--border-card)]" style="color: var(--text-dim);">#${s}</span>`).join("")}
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
        `;d("blog-modal",r)})});
