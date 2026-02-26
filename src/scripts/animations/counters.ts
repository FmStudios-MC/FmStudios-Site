// Animated count-up on intersection for [data-count-to] elements

export function initCounters() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Just show final values
    document.querySelectorAll<HTMLElement>('[data-count-to]').forEach((el) => {
      el.textContent = el.dataset.countTo || '0';
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);

        const target = el.dataset.countTo || '0';
        const suffix = el.dataset.countSuffix || '';
        const numericTarget = parseInt(target.replace(/[^0-9]/g, ''), 10);

        if (isNaN(numericTarget)) {
          el.textContent = target;
          return;
        }

        const duration = 1200;
        const startTime = performance.now();

        function step(now: number) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out expo
          const eased = 1 - Math.pow(1 - progress, 4);
          const current = Math.round(numericTarget * eased);
          el.textContent = current.toLocaleString() + suffix;

          if (progress < 1) {
            requestAnimationFrame(step);
          }
        }

        requestAnimationFrame(step);
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll('[data-count-to]').forEach((el) => observer.observe(el));
}
