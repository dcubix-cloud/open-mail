// The paper plane that leaves the mailbox by the Features heading and flies down the feature
// stories as the page scrolls. It sweeps from one side of the page to the other in wide arcs,
// crossing in the gaps between stories. The plane and its dashed trail pass behind the mailbox and
// the story screens, so the plane starts hidden inside the mailbox, slides out of its door, and shows
// again each time it comes out from behind a screen. It keeps to the middle of the screen as the
// page scrolls. Below 900px wide it isn't shown.

import { reducedMotion } from "./screens.ts";

const section = document.querySelector<HTMLElement>(".stories");
const svg = section?.querySelector<SVGSVGElement>(".flight");

if (section && svg) {
  const trail = svg.querySelector<SVGPathElement>(".trail")!;
  const reveal = svg.querySelector<SVGPathElement>(".trail-reveal")!;
  const plane = svg.querySelector<SVGGElement>(".plane")!;
  const still = reducedMotion();
  let samples: { len: number; x: number; y: number }[] = [];
  let length = 0;

  // A smooth curve (Catmull-Rom as cubic Béziers) through the given points.
  function curve(pts: [number, number][]) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  // Out of the mailbox, then a wide swing to alternate sides in each gap between stories.
  function layout() {
    const box = section!.getBoundingClientRect();
    const w = box.width;
    const h = box.height;
    svg!.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const door = section!.querySelector("[data-launch]")!.getBoundingClientRect();
    const pts: [number, number][] = [[door.left + door.width / 2 - box.left, door.top + door.height / 2 - box.top]];
    const stories = [...section!.querySelectorAll<HTMLElement>(".story")].map((s) => s.getBoundingClientRect());
    stories.forEach((s, i) => {
      // Above each story: the first and third swing right, the second left.
      const above = i === 0 ? s.top - box.top - 30 : (stories[i - 1].bottom + s.top) / 2 - box.top;
      pts.push([i % 2 === 0 ? w * 0.94 : w * 0.06, above]);
    });
    // It lands in the last story's screen, behind which it disappears.
    const screen = section!.querySelector(".story:last-of-type .st-frame")!.getBoundingClientRect();
    pts.push([screen.left + screen.width / 2 - box.left, screen.top + screen.height / 2 - box.top]);
    const d = curve(pts);
    trail.setAttribute("d", d);
    reveal.setAttribute("d", d);
    length = trail.getTotalLength();
    reveal.style.strokeDasharray = `${length} ${length}`;
    samples = [];
    for (let i = 0; i <= 600; i++) {
      const len = (length * i) / 600;
      const p = trail.getPointAtLength(len);
      samples.push({ len, x: p.x, y: p.y });
    }
    update();
  }

  // Where along the trail the curve reaches height y (the trail only ever runs downward).
  function lengthAt(y: number) {
    if (y <= samples[0].y) return 0;
    let lo = 0;
    let hi = samples.length - 1;
    if (y >= samples[hi].y) return length;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].y < y) lo = mid;
      else hi = mid;
    }
    const a = samples[lo];
    const b = samples[hi];
    return a.len + ((y - a.y) / (b.y - a.y || 1)) * (b.len - a.len);
  }

  function update() {
    if (!samples.length) return;
    const top = section!.getBoundingClientRect().top;
    const len = still ? length : lengthAt(window.innerHeight * 0.5 - top);
    const p = trail.getPointAtLength(len);
    const q = trail.getPointAtLength(Math.max(0, len - 2));
    const r = trail.getPointAtLength(Math.min(length, len + 2));
    // The plane's nose points 15° above its right; turn it to follow the trail.
    const angle = (Math.atan2(r.y - q.y, r.x - q.x) * 180) / Math.PI + 15;
    plane.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${angle.toFixed(1)}) translate(-26 -14)`);
    reveal.style.strokeDashoffset = String(length - Math.max(0, len - 20));
  }

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };
  new ResizeObserver(layout).observe(section);
  if (!still) window.addEventListener("scroll", onScroll, { passive: true });
}
