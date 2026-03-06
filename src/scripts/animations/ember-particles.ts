// Lightweight canvas ember particle system (~40 floating red-magenta dots)

interface Ember {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  fadeDir: number;
}

export function initEmberParticles() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 768) return; // disable on mobile

  const canvas = document.getElementById('ember-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let w = window.innerWidth;
  let h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;

  const PARTICLE_COUNT = 35;
  const embers: Ember[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    embers.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2.5 + 1,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -(Math.random() * 0.4 + 0.1), // float upward
      opacity: Math.random() * 0.5 + 0.2,
      fadeDir: Math.random() > 0.5 ? 1 : -1,
    });
  }

  let animId: number;

  function draw() {
    ctx!.clearRect(0, 0, w, h);

    for (const e of embers) {
      e.x += e.speedX;
      e.y += e.speedY;
      e.opacity += e.fadeDir * 0.003;

      if (e.opacity <= 0.1 || e.opacity >= 0.7) e.fadeDir *= -1;
      if (e.y < -10) { e.y = h + 10; e.x = Math.random() * w; }
      if (e.x < -10) e.x = w + 10;
      if (e.x > w + 10) e.x = -10;

      ctx!.beginPath();
      ctx!.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(224, 64, 80, ${e.opacity})`;
      ctx!.fill();
    }

    animId = requestAnimationFrame(draw);
  }

  draw();

  // Pause when tab is backgrounded to save resources
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      draw();
    }
  });

  let resizeTimer: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    }, 150);
  });

  // Clean up if page transitions happen
  document.addEventListener('astro:before-swap', () => {
    cancelAnimationFrame(animId);
  });
}
