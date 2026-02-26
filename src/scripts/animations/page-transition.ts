// Entry fade + Z-shift page transition

export function initPageTransition() {
  // The CSS class .page-transition-enter handles the animation
  // This module just ensures the class is present on load
  const main = document.getElementById('main-content');
  if (!main) return;

  // Remove the transition class after animation completes
  main.addEventListener('animationend', () => {
    main.classList.remove('page-transition-enter');
  }, { once: true });
}
