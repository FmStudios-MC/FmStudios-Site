// Intersection Observer for scroll reveals

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '50px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

// Scroll to top button
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;

  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 300) {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      } else {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
      }
    },
    { passive: true }
  );

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Accordion toggles (changelog, FAQ, roadmap updates)
function initAccordions() {
  document.querySelectorAll('.changelog-toggle, .faq-toggle, .roadmap-updates-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = (btn as HTMLElement).dataset.target;
      if (!targetId) return;
      const content = document.getElementById(targetId);
      if (!content) return;

      const icon = btn.querySelector('svg:last-child');
      const isOpen = content.classList.contains('open');

      if (content.classList.contains('accordion-content')) {
        if (isOpen) {
          // Close: set explicit height then transition to 0
          content.style.maxHeight = content.scrollHeight + 'px';
          // Force reflow
          content.offsetHeight;
          content.style.maxHeight = '0';
          content.classList.remove('open');
        } else {
          // Open: transition to scrollHeight, then remove inline style
          content.style.maxHeight = content.scrollHeight + 'px';
          content.classList.add('open');
          const onEnd = () => {
            if (content.classList.contains('open')) {
              content.style.maxHeight = '';
            }
            content.removeEventListener('transitionend', onEnd);
          };
          content.addEventListener('transitionend', onEnd);
        }
      } else {
        // Simple show/hide
        content.classList.toggle('hidden');
      }

      if (icon) {
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      }
    });
  });
}

initScrollReveal();
initScrollTop();
initAccordions();
