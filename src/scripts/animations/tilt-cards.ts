// Mouse-tracking 3D tilt for .tilt-card elements (max 5-8°)

const MAX_TILT = 6; // degrees

export function initTiltCards() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 768) return; // skip on mobile

  const controller = new AbortController();
  const signal = controller.signal;

  document.querySelectorAll<HTMLElement>('.tilt-card').forEach((card) => {
    let ticking = false;
    let lastX = 0;
    let lastY = 0;

    card.addEventListener('mousemove', (e) => {
      lastX = e.clientX;
      lastY = e.clientY;

      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = lastX - rect.left;
          const y = lastY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateY = ((x - centerX) / centerX) * MAX_TILT;
          const rotateX = ((centerY - y) / centerY) * MAX_TILT;

          card.style.transform = `perspective(${800}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
          ticking = false;
        });
      }
    }, { signal });

    card.addEventListener('mouseleave', () => {
      ticking = false;
      card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
      card.style.transform = '';
      setTimeout(() => {
        card.style.transition = '';
      }, 500);
    }, { signal });
  });

  document.addEventListener('astro:before-swap', () => {
    controller.abort();
  }, { once: true });
}
