// 3D rotateX unfold scroll reveal via IntersectionObserver

export function initScrollReveal() {
  const selector = '.reveal, .reveal-scale';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll(selector).forEach((el) => {
      el.classList.add('visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '60px' }
  );

  document.querySelectorAll(selector).forEach((el) => observer.observe(el));
}
