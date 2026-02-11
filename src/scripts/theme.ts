// Theme toggle + localStorage persistence

function initTheme() {
  const toggles = document.querySelectorAll('#theme-toggle');

  toggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      const html = document.documentElement;
      const isLight = html.classList.toggle('light-theme');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
  });

  // System preference listener
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        if (e.matches) {
          document.documentElement.classList.add('light-theme');
        } else {
          document.documentElement.classList.remove('light-theme');
        }
      }
    });
  }
}

initTheme();
