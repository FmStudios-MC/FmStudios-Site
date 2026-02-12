// Focus trapping utility for modals and dialogs

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container: HTMLElement): () => void {
  const controller = new AbortController();

  // Focus first focusable element
  const focusFirst = () => {
    const first = container.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
  };

  // Slight delay to ensure DOM is ready
  requestAnimationFrame(focusFirst);

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, { signal: controller.signal });

  return () => controller.abort();
}
