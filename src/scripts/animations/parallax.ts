// Scroll-based translateY parallax for [data-parallax] elements
// Usage: data-parallax="0.3" means 30% of scroll speed

export function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 768) return;

  const layers = document.querySelectorAll<HTMLElement>('[data-parallax]');
  if (layers.length === 0) return;

  const controller = new AbortController();
  const signal = controller.signal;

  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY;
    layers.forEach((layer) => {
      const speed = parseFloat(layer.dataset.parallax || '0.2');
      const offset = scrollY * speed;
      layer.style.transform = `translateY(${offset}px)`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true, signal });

  document.addEventListener('astro:before-swap', () => {
    controller.abort();
  }, { once: true });
}
