// Master animation init — imports all modular animation scripts

import { initScrollReveal } from './animations/scroll-reveal';
import { initTiltCards } from './animations/tilt-cards';
import { initParallax } from './animations/parallax';
import { initEmberParticles } from './animations/ember-particles';
import { initCounters } from './animations/counters';
import { initPageTransition } from './animations/page-transition';

// Card hover glow — track mouse position via CSS custom properties
function initCardGlow() {
  document.querySelectorAll<HTMLElement>('.depth-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  });
}

// Scroll to top button
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;

  btn.style.transform = 'scale(0.8)';

  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 300) {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        btn.style.transform = 'scale(1)';
      } else {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        btn.style.transform = 'scale(0.8)';
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
          const onEnd = () => {
            if (content.classList.contains('open')) {
              content.style.maxHeight = 'none';
            }
            content.removeEventListener('transitionend', onEnd);
          };
          content.addEventListener('transitionend', onEnd);
        }
      } else {
        content.classList.toggle('hidden');
      }

      if (icon) {
        (icon as HTMLElement).style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      }
    });
  });
}

// Init all
initScrollReveal();
initTiltCards();
initParallax();
initEmberParticles();
initCounters();
initPageTransition();
initScrollTop();
initAccordions();
initCardGlow();
