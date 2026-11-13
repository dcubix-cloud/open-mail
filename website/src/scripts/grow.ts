// As the hero's window scrolls up to the middle of the screen it grows a little from its top edge,
// then moves on with the page. The card keeps room below it (--grow-room).
// Nothing moves with reduced motion.

const hero = document.querySelector<HTMLElement>(".hero-card");
const grow = document.querySelector<HTMLElement>(".stage-grow");
const nav = document.querySelector<HTMLElement>(".nav");

if (hero && grow && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Scroll at which the window's middle reaches the middle of the screen below the navbar.
  let start = 0;
  let target = 1;
  let queued = false;

  const update = () => {
    queued = false;
    const p = start > 0 ? Math.min(1, Math.max(0, window.scrollY / start)) : 1;
    const s = 1 + (target - 1) * (1 - Math.pow(1 - p, 2));
    grow.style.setProperty("--s", s.toFixed(4));
  };

  const measure = () => {
    grow.style.removeProperty("--s");
    hero.style.removeProperty("--grow-room");
    const top = nav?.offsetHeight ?? 0;
    const height = grow.offsetHeight;
    // A little larger, never past 88% of the width: on a phone it is already full width.
    target = Math.max(1, Math.min(1.18, (document.documentElement.clientWidth * 0.88) / grow.offsetWidth));
    start = grow.getBoundingClientRect().top + window.scrollY + height / 2 - (top + (window.innerHeight - top) / 2);
    hero.style.setProperty("--grow-room", `${(target - 1) * height}px`);
    update();
  };

  measure();
  window.addEventListener("resize", measure);
  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
}
