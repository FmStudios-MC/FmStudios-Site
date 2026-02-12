// Unified lightbox module with keyboard nav, prev/next, counter, click-outside

let lightboxEl: HTMLElement | null = null;
let lightboxImg: HTMLImageElement | null = null;
let prevBtn: HTMLElement | null = null;
let nextBtn: HTMLElement | null = null;
let closeBtn: HTMLElement | null = null;
let counterEl: HTMLElement | null = null;

let images: { src: string; alt: string }[] = [];
let currentIndex = 0;
let controller: AbortController | null = null;

function showImage(index: number) {
  if (!lightboxImg || index < 0 || index >= images.length) return;
  currentIndex = index;

  // Cross-fade: briefly fade out, swap src, fade in on load
  lightboxImg.style.opacity = '0';
  lightboxImg.src = images[index].src;
  lightboxImg.alt = images[index].alt;

  lightboxImg.onload = () => {
    lightboxImg!.style.opacity = '1';
  };
  // Fallback if image is cached (onload may not fire)
  if (lightboxImg.complete) {
    lightboxImg.style.opacity = '1';
  }

  if (counterEl) {
    counterEl.textContent = `${index + 1} of ${images.length}`;
  }
  if (prevBtn) prevBtn.style.display = index === 0 ? 'none' : '';
  if (nextBtn) nextBtn.style.display = index === images.length - 1 ? 'none' : '';
}

function closeLightbox() {
  if (!lightboxEl) return;
  lightboxEl.classList.add('hidden');
  document.body.style.overflow = '';
  controller?.abort();
  controller = null;
}

export function openLightbox(srcs: { src: string; alt: string }[], startIndex: number = 0) {
  lightboxEl = document.getElementById('lightbox-modal');
  lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
  prevBtn = document.getElementById('lightbox-prev');
  nextBtn = document.getElementById('lightbox-next');
  closeBtn = document.getElementById('lightbox-close');
  counterEl = document.getElementById('lightbox-counter');

  if (!lightboxEl || !lightboxImg) return;

  images = srcs;
  lightboxEl.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  showImage(startIndex);

  // Clean up previous listeners
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;

  // Click outside to close
  lightboxEl.addEventListener('click', (e) => {
    if (e.target === lightboxEl) closeLightbox();
  }, { signal });

  // Close button
  closeBtn?.addEventListener('click', closeLightbox, { signal });

  // Prev/Next buttons
  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex > 0) showImage(currentIndex - 1);
  }, { signal });

  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < images.length - 1) showImage(currentIndex + 1);
  }, { signal });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightboxEl || lightboxEl.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && currentIndex > 0) showImage(currentIndex - 1);
    if (e.key === 'ArrowRight' && currentIndex < images.length - 1) showImage(currentIndex + 1);
  }, { signal });
}

export function openSingleImage(src: string, alt: string = '') {
  openLightbox([{ src, alt }], 0);
}
