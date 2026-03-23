// Master animation init — imports all modular animation scripts

import { initScrollReveal } from './animations/scroll-reveal';
import { initCounters } from './animations/counters';
import { initPageTransition } from './animations/page-transition';

let cardGlowController: AbortController | null = null;
let scrollTopController: AbortController | null = null;

// Card hover glow — track mouse position via CSS custom properties (throttled to 60fps)
function initCardGlow() {
  cardGlowController?.abort();
  cardGlowController = new AbortController();
  const signal = cardGlowController.signal;

  document.querySelectorAll<HTMLElement>('.depth-card').forEach((card) => {
    let ticking = false;
    card.addEventListener('mousemove', (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        ticking = false;
      });
    }, { signal });
  });
}

// Scroll to top button
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;

  scrollTopController?.abort();
  scrollTopController = new AbortController();
  const signal = scrollTopController.signal;

  btn.style.transform = 'scale(0.8)';
  let scrollTicking = false;

  window.addEventListener(
    'scroll',
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        if (window.scrollY > 300) {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.style.transform = 'scale(1)';
        } else {
          btn.style.opacity = '0';
          btn.style.pointerEvents = 'none';
          btn.style.transform = 'scale(0.8)';
        }
        scrollTicking = false;
      });
    },
    { passive: true, signal }
  );

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, { signal });
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

      (btn as HTMLElement).setAttribute('aria-expanded', isOpen ? 'false' : 'true');

      if (content.classList.contains('accordion-content')) {
        if (isOpen) {
          content.style.maxHeight = content.scrollHeight + 'px';
          requestAnimationFrame(() => {
            content.style.maxHeight = '0';
          });
          content.classList.remove('open');
        } else {
          content.style.maxHeight = content.scrollHeight + 'px';
          content.classList.add('open');
          content.addEventListener('transitionend', () => {
            if (content.classList.contains('open')) {
              content.style.maxHeight = 'none';
            }
          }, { once: true });
        }
      } else if (content.classList.contains('changelog-content')) {
        // Changelog: animated expand/collapse
        if (isOpen) {
          content.style.maxHeight = content.scrollHeight + 'px';
          content.style.overflow = 'hidden';
          requestAnimationFrame(() => {
            content.style.maxHeight = '0';
          });
          content.classList.remove('open');
          content.addEventListener('transitionend', () => {
            if (!content.classList.contains('open')) {
              content.style.display = 'none';
            }
          }, { once: true });
        } else {
          content.style.display = '';
          content.style.overflow = 'hidden';
          content.style.maxHeight = '0';
          requestAnimationFrame(() => {
            content.style.maxHeight = content.scrollHeight + 'px';
          });
          content.classList.add('open');
          content.addEventListener('transitionend', () => {
            if (content.classList.contains('open')) {
              content.style.maxHeight = 'none';
              content.style.overflow = '';
            }
          }, { once: true });
        }
      } else {
        // Fallback: display toggling (no hidden class)
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : '';
      }

      if (icon) {
        (icon as HTMLElement).style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      }
    });
  });
}

// Init critical (above-fold) animations immediately
initScrollReveal();
initCounters();
initPageTransition();
initScrollTop();
initAccordions();
initCardGlow();

// Defer non-critical animations until browser is idle
const scheduleIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 80));
scheduleIdle(() => {
  import('./animations/tilt-cards').then(({ initTiltCards }) => initTiltCards());
  import('./animations/parallax').then(({ initParallax }) => initParallax());
  import('./animations/ember-particles').then(({ initEmberParticles }) => initEmberParticles());
});

// Clean up on page transitions
document.addEventListener('astro:before-swap', () => {
  cardGlowController?.abort();
  scrollTopController?.abort();
}, { once: true });
