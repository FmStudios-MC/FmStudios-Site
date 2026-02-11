// Modal open/close/lightbox functionality

export function openModal(modalId: string, html: string) {
  const modal = document.getElementById(modalId);
  const content = document.getElementById(`${modalId}-content`);
  if (!modal || !content) return;

  content.innerHTML = html;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modalId);
  });
}

export function closeModal(modalId: string) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
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

// Expose to window for inline onclick handlers
(window as any).__openModal = openModal;
(window as any).__closeModal = closeModal;
