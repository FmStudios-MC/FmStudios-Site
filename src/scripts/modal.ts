// Modal open/close functionality with proper listener cleanup and focus management

import { trapFocus } from './focus-trap';

const modalControllers = new Map<string, AbortController>();
const focusTrapCleanups = new Map<string, () => void>();
const previousFocus = new Map<string, Element | null>();

export function openModal(modalId: string, html: string) {
  const modal = document.getElementById(modalId);
  const content = document.getElementById(`${modalId}-content`);
  if (!modal || !content) return;

  // Store focus to restore later
  previousFocus.set(modalId, document.activeElement);

  // Abort any previous listeners for this modal
  modalControllers.get(modalId)?.abort();
  const controller = new AbortController();
  modalControllers.set(modalId, controller);

  content.innerHTML = html;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Trap focus within modal
  focusTrapCleanups.get(modalId)?.();
  const cleanup = trapFocus(modal);
  focusTrapCleanups.set(modalId, cleanup);

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modalId);
  }, { signal: controller.signal });
}

export function closeModal(modalId: string) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';

  // Clean up focus trap
  focusTrapCleanups.get(modalId)?.();
  focusTrapCleanups.delete(modalId);

  // Clean up listeners
  modalControllers.get(modalId)?.abort();
  modalControllers.delete(modalId);

  // Restore focus
  const prev = previousFocus.get(modalId);
  if (prev && prev instanceof HTMLElement) {
    prev.focus();
  }
  previousFocus.delete(modalId);
}

// ESC key handler
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  const lightbox = document.getElementById('lightbox-modal');
  const projectModal = document.getElementById('project-modal');
  const blogModal = document.getElementById('blog-modal');

  if (lightbox && !lightbox.classList.contains('hidden')) {
    closeModal('lightbox-modal');
  } else if (blogModal && !blogModal.classList.contains('hidden')) {
    closeModal('blog-modal');
  } else if (projectModal && !projectModal.classList.contains('hidden')) {
    closeModal('project-modal');
  }
});
