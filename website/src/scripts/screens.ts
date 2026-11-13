// Every app screen on the page (the hero and the feature stories) is laid out at a real screen size
// and scaled down to its window; this sets the scale (--k), and fills in dates relative to now.

for (const view of document.querySelectorAll<HTMLElement>(".mb-view, .st-view")) {
  const fit = view.firstElementChild as HTMLElement | null;
  if (!fit) continue;
  const resize = () => fit.style.setProperty("--k", (view.clientWidth / fit.offsetWidth).toFixed(4));
  new ResizeObserver(resize).observe(view);
  resize();
}

// Dates as the app shows them: a time today, else the month and day.
export function shortDate(d: Date) {
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toLocaleDateString([], { month: "long", day: "numeric" });
}

for (const el of document.querySelectorAll<HTMLElement>("[data-ago]")) {
  el.textContent = shortDate(new Date(Date.now() - Number(el.dataset.ago) * 60_000));
}

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
