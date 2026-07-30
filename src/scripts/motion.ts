import Lenis from "lenis";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initSmoothScroll() {
  if (prefersReducedMotion()) return;
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Keep in-page anchors working through Lenis
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -80 });
    });
  });
}

function initNavScrollState() {
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  if (!nav) return;
  const update = () => {
    if (window.scrollY > 24) nav.setAttribute("data-scrolled", "");
    else nav.removeAttribute("data-scrolled");
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initMobileMenu() {
  const toggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
  const menu = document.querySelector<HTMLElement>("[data-nav-mobile]");
  if (!toggle || !menu) return;

  const setOpen = (open: boolean) => {
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      menu.hidden = false;
      menu.setAttribute("data-open", "");
    } else {
      menu.removeAttribute("data-open");
      menu.hidden = true;
    }
  };

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

  toggle.addEventListener("click", () => setOpen(!isOpen()));
  menu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => setOpen(false)),
  );

  // An open drawer covers the page, so it has to be dismissible without
  // hunting for the toggle again: Escape, or a tap anywhere outside it.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("pointerdown", (e) => {
    if (!isOpen()) return;
    const target = e.target as Node;
    if (menu.contains(target) || toggle.contains(target)) return;
    setOpen(false);
  });

  // Resizing past the breakpoint hides the drawer but left the toggle
  // reporting expanded, so the next open needed two taps.
  const desktop = window.matchMedia("(min-width: 721px)");
  desktop.addEventListener("change", (e) => {
    if (e.matches && isOpen()) setOpen(false);
  });
}

function initReveals() {
  const items = document.querySelectorAll<HTMLElement>(".reveal");
  if (!items.length) return;

  // Leave everything visible when motion is unwanted or unobservable.
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
  );

  // Arm (hide) then observe so a failed observer never hides content.
  items.forEach((el) => {
    el.classList.add("reveal--armed");
    io.observe(el);
  });
}

export function initMotion() {
  initSmoothScroll();
  initNavScrollState();
  initMobileMenu();
  initReveals();
}
