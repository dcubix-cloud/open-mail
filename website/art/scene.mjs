// Draws the hero's line-art scene: islands in water, trees, a mailbox on a post, a paper plane and a
// paper boat. Writes src/components/Scene.astro and SceneSides.astro (inline SVGs styled by src/styles/scene.css).
// Seeded, so re-running gives the same drawing: `node art/scene.mjs`.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let seed = 11;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const f = (n) => Math.round(n * 10) / 10;
const P = (p) => `${f(p[0])} ${f(p[1])}`;
let uid = 0;

/** Smooth path through points (Catmull-Rom as cubic Béziers). */
function smooth(pts, closed = true) {
  const n = pts.length;
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return closed ? d + "Z" : d;
}

/** Points around an ellipse, clockwise on screen, each pushed in or out a little. */
function ring(cx, cy, rx, ry, n, wobble, from = 0, to = Math.PI * 2, closed = true) {
  const count = closed ? n : n + 1;
  return Array.from({ length: count }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    const k = 1 + (rand() - 0.5) * wobble;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
}

/** Arcs between neighbouring points, bulging outward: the scalloped edge of a crown or a cloud. */
function scallop(pts, bulge = 0.62, closed = true) {
  let d = `M${P(pts[0])}`;
  const last = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const r = Math.hypot(b[0] - a[0], b[1] - a[1]) * (bulge + rand() * 0.14);
    d += `A${f(r)} ${f(r)} 0 0 1 ${P(b)}`;
  }
  return closed ? d + "Z" : d;
}

const path = (cls, d) => `<path class="${cls}" d="${d}"/>`;

function island({ cx, cy, rx, ry, depth = 24, grass = [], tufts = [] }) {
  const top = ring(cx, cy, rx, ry, 16, 0.1);
  const base = top.map(([x, y]) => [x, y + depth]);
  const [R, L] = [top[0], top[8]];
  const id = `isl${++uid}`;
  let s = "";
  s += path("cliff ln", smooth(base));
  s += path("cliff", `M${P(L)}L${P(R)}L${f(R[0])} ${f(R[1] + depth)}L${f(L[0])} ${f(L[1] + depth)}Z`);
  s += path("ln", `M${P(L)}l0 ${depth}M${P(R)}l0 ${depth}`);
  // Rock lines on the cliff face.
  for (let i = 0; i < 3; i++) {
    const x = cx + (rand() - 0.5) * rx * 1.2;
    s += path("ln thin", `M${f(x)} ${f(cy + ry * 0.9 + depth * 0.35)}l${f(4 + rand() * 6)} ${f(depth * 0.3)}`);
  }
  s += `<clipPath id="${id}"><path d="${smooth(top)}"/></clipPath>`;
  s += path("land", smooth(top));
  s += `<g clip-path="url(#${id})">`;
  for (const [gx, gy, grx, gry] of grass) s += path("grass ln", smooth(ring(gx, gy, grx, gry, 10, 0.3)));
  s += `</g>`;
  s += path("ln none", smooth(top));
  for (const [tx, ty] of tufts) s += path("tuft", `M${f(tx)} ${f(ty)}l3 -7l3 7l3 -9l3 9l3 -6l3 6`);
  return s;
}

function crown(cx, cy, rx, ry, tone) {
  const id = `cr${++uid}`;
  const outline = scallop(ring(cx, cy, rx, ry, 10 + Math.round(rand() * 3), 0.16));
  let s = `<clipPath id="${id}"><path d="${outline}"/></clipPath>`;
  s += path(`leaf-${tone}`, outline);
  s += `<g clip-path="url(#${id})">${path(`leaf-${tone}-dk`, scallop(ring(cx + rx * 0.25, cy + ry * 0.35, rx * 0.75, ry * 0.6, 9, 0.2)))}</g>`;
  s += path("ln none", outline);
  // A few leaf marks.
  for (let i = 0; i < 4; i++) {
    const x = cx + (rand() - 0.5) * rx;
    const y = cy + (rand() - 0.6) * ry;
    s += path("ln thin none", `M${f(x)} ${f(y)}q4 4 9 0`);
  }
  return s;
}

function tree({ x, y, h, lean = 0, rx, ry, tone }) {
  const tx = x + lean;
  const ty = y - h;
  const w = Math.max(4, h * 0.045);
  let s = path(
    "trunk ln",
    `M${f(x - w)} ${f(y)}C${f(x - w * 0.8)} ${f(y - h * 0.4)} ${f(tx - w * 0.6)} ${f(ty + h * 0.35)} ${f(tx - w * 0.45)} ${f(ty)}` +
      `L${f(tx + w * 0.45)} ${f(ty)}C${f(tx + w * 0.6)} ${f(ty + h * 0.35)} ${f(x + w * 0.8)} ${f(y - h * 0.4)} ${f(x + w)} ${f(y)}Z`,
  );
  s += path("ln none", `M${f(x + lean * 0.4 + w * 0.4)} ${f(y - h * 0.5)}q${f(rx * 0.25)} ${f(-h * 0.08)} ${f(rx * 0.42)} ${f(-h * 0.24)}`);
  return s + crown(tx, ty - ry * 0.25, rx, ry, tone);
}

function bush({ x, y, rx, ry, tone }) {
  return crown(x, y - ry * 0.6, rx, ry, tone);
}

/** An old rural mailbox on a wooden post, door to the right. The flag rises when mail arrives. */
function mailbox({ x, y, post }) {
  const top = y - post;
  const bw = 66;
  const bh = 36;
  const bx = x - 36;
  const by = top - bh;
  let s = "";
  s += path("post ln", `M${x - 6} ${y + 3}L${x - 5} ${top}L${x + 5} ${top}L${x + 6} ${y + 3}Z`);
  s += path("ln thin none", `M${x - 1} ${top + 16}l1 26M${x + 2} ${top + 52}l-1 14`);
  s += path("post ln", `M${bx + 4} ${top}h${bw - 6}v7h${-(bw - 6)}Z`);
  s += path("post ln", `M${x - 4} ${top + 7}l-14 18h6l12 -14Z`);
  s += path("box ln", `M${bx} ${top}V${by + 12}Q${bx} ${by} ${bx + 12} ${by}H${bx + bw}V${top}Z`);
  s += path("ln thin none", `M${bx + 6} ${top - 8}H${bx + bw - 8}`);
  const fx = bx + bw - 6;
  const fw = 24;
  s += path("box-dk ln", `M${fx} ${top}V${by + fw / 2}A${fw / 2} ${fw / 2} 0 0 1 ${fx + fw} ${by + fw / 2}V${top}Z`);
  s += path("post ln", `M${fx + fw / 2 - 3} ${by + 18}h6v5h-6Z`);
  // Flag: pivots on the box's side; scene.css turns it up.
  const px = bx + 18;
  const py = by + 15;
  s += `<g class="flag">${path("flag-arm ln", `M${px} ${py - 2}h-34v5h34Z`)}${path("flag-arm ln", `M${px - 34} ${py - 13}h12v11h-12Z`)}<circle class="post ln" cx="${px}" cy="${py}" r="2.5"/></g>`;
  return { svg: s, pivot: [px, py] };
}

function cloud({ x0, x1, base, h }) {
  const cx = (x0 + x1) / 2;
  const pts = ring(cx, base, (x1 - x0) / 2, h, 6, 0.25, Math.PI, Math.PI * 2, false);
  pts[0] = [x0, base];
  pts[pts.length - 1] = [x1, base];
  return path("paper ln", scallop(pts, 0.6, false) + "Z");
}

function plane({ x, y }) {
  let s = path("ln none dash", `M${x + 4} ${y + 18}c-36 6 -64 -26 -38 -40c22 -12 34 22 6 30c-28 8 -60 -6 -96 18`);
  s += path("paper ln", `M${x} ${y + 14}L${x + 52} ${y}L${x + 16} ${y + 22}Z`);
  s += path("paper-dk ln", `M${x + 16} ${y + 22}L${x + 52} ${y}L${x + 22} ${y + 34}Z`);
  s += path("ln thin none", `M${x + 16} ${y + 22}l3 6`);
  return s;
}

function boat({ x, y }) {
  let s = path("paper ln", `M${x - 46} ${y}L${x + 46} ${y}L${x + 32} ${y + 22}L${x - 32} ${y + 22}Z`);
  s += path("paper-dk ln", `M${x - 24} ${y}L${x + 2} ${y - 38}L${x + 24} ${y}Z`);
  s += path("ln thin none", `M${x + 2} ${y - 38}L${x + 2} ${y}`);
  for (let i = 0; i < 3; i++) s += path("ln thin none", `M${x - 26 + i * 4} ${y + 7 + i * 5}h${f(36 - i * 8 + rand() * 10)}`);
  return s;
}

const wave = (x, y, n = 3) => path("water", `M${x} ${y}` + "q6 -5 12 0".repeat(1) + "t12 0".repeat(n - 1));
const fish = (x, y, flip = false) =>
  `<g class="fish-g"${flip ? ` transform="translate(${2 * x + 28} 0) scale(-1 1)"` : ""}>` +
  path("fish", `M${x} ${y}q11 -9 22 0q-11 9 -22 0Z`) +
  path("fish", `M${x + 21} ${y}l8 -6v12Z`) +
  `<circle class="eye" cx="${x + 6}" cy="${y - 1}" r="1.3"/></g>`;
const birds = (x, y) => path("ln thin none", `M${x} ${y}q5 -6 10 0q5 -6 10 0M${x + 26} ${y - 12}q4 -5 8 0q4 -5 8 0`);
const reeds = (x, y) => {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const rx = x + i * 9;
    const h = 30 + i * 8 - (i === 2 ? 14 : 0);
    s += path("ln none", `M${rx} ${y}q2 ${-h / 2} ${-2 + i * 2} ${-h}`);
    s += path("reed ln", smooth(ring(rx - 2 + i * 2, y - h - 5, 3.2, 7, 8, 0)));
  }
  return s;
};

// Scenes

const scenes = [];

const mb = mailbox({ x: 298, y: 268, post: 90 });
scenes.push({
  cls: "art-tl",
  box: "0 0 400 330",
  svg:
    cloud({ x0: 170, x1: 300, base: 52, h: 30 }) +
    birds(34, 86) +
    tree({ x: 200, y: 250, h: 104, lean: 6, rx: 50, ry: 42, tone: "b" }) +
    island({ cx: 205, cy: 262, rx: 172, ry: 38, depth: 24, grass: [[110, 236, 72, 22], [310, 254, 52, 18]], tufts: [[64, 266], [360, 262], [196, 282]] }) +
    tree({ x: 104, y: 268, h: 148, lean: -8, rx: 72, ry: 60, tone: "a" }) +
    mb.svg +
    bush({ x: 250, y: 280, rx: 22, ry: 16, tone: "c" }) +
    wave(84, 316) +
    wave(236, 322, 4) +
    wave(330, 306, 2),
});

scenes.push({
  cls: "art-ml",
  box: "0 0 320 250",
  svg:
    island({ cx: 160, cy: 200, rx: 140, ry: 32, depth: 20, grass: [[92, 184, 62, 18], [250, 196, 40, 14]], tufts: [[244, 214], [118, 222]] }) +
    tree({ x: 196, y: 196, h: 116, lean: 4, rx: 58, ry: 48, tone: "b" }) +
    tree({ x: 84, y: 208, h: 76, lean: -4, rx: 42, ry: 36, tone: "c" }) +
    reeds(250, 214) +
    wave(52, 244) +
    wave(232, 240, 2),
});

scenes.push({
  cls: "art-tr",
  box: "0 0 420 360",
  svg:
    plane({ x: 96, y: 74 }) +
    cloud({ x0: 250, x1: 392, base: 72, h: 34 }) +
    tree({ x: 188, y: 272, h: 122, lean: -4, rx: 62, ry: 52, tone: "c" }) +
    island({ cx: 226, cy: 286, rx: 180, ry: 40, depth: 26, grass: [[168, 262, 92, 24], [336, 274, 50, 16]], tufts: [[96, 294], [250, 304], [372, 290]] }) +
    tree({ x: 302, y: 294, h: 186, lean: 10, rx: 86, ry: 70, tone: "a" }) +
    bush({ x: 102, y: 292, rx: 30, ry: 20, tone: "b" }) +
    wave(118, 344, 4) +
    wave(296, 350),
});

scenes.push({
  cls: "art-mr",
  box: "0 0 300 210",
  svg: boat({ x: 150, y: 116 }) + wave(70, 150) + wave(176, 156, 4) + wave(116, 170, 2) + fish(52, 188) + fish(226, 194, true),
});

scenes.push({
  cls: "art-bl",
  box: "0 0 280 190",
  svg:
    island({ cx: 130, cy: 120, rx: 108, ry: 26, depth: 18, grass: [[100, 108, 60, 16]], tufts: [[170, 132]] }) +
    reeds(60, 118) +
    bush({ x: 176, y: 124, rx: 30, ry: 22, tone: "a" }) +
    wave(40, 170) +
    fish(196, 172),
});

scenes.push({
  cls: "art-br",
  box: "0 0 280 190",
  svg:
    birds(60, 30) +
    island({ cx: 150, cy: 126, rx: 104, ry: 26, depth: 18, grass: [[150, 112, 70, 18]], tufts: [[96, 136]] }) +
    tree({ x: 168, y: 128, h: 92, lean: 4, rx: 48, ry: 40, tone: "b" }) +
    reeds(222, 128) +
    wave(70, 176, 4),
});

// Corner scenes go in the card; the two side scenes go in .stage, beside the window.
const svgOf = (s) => `<svg class="art ${s.cls}" viewBox="${s.box}" aria-hidden="true" focusable="false">${s.svg}</svg>`;
const sides = ["art-ml", "art-mr"];
const component = (list) => `---
// Generated by art/scene.mjs; edit that and re-run it rather than this file.
---

${list.map(svgOf).join("\n")}
`;
writeFileSync(fileURLToPath(new URL("../src/components/Scene.astro", import.meta.url)), component(scenes.filter((s) => !sides.includes(s.cls))));
writeFileSync(fileURLToPath(new URL("../src/components/SceneSides.astro", import.meta.url)), component(scenes.filter((s) => sides.includes(s.cls))));

// The flag's pivot, in the mailbox scene's own units.
writeFileSync(
  fileURLToPath(new URL("../src/styles/flag.css", import.meta.url)),
  `/* Generated by art/scene.mjs: the mailbox flag's pivot. */\n.art-tl .flag {\n  transform-origin: ${mb.pivot[0]}px ${mb.pivot[1]}px;\n}\n`,
);
console.log("wrote Scene.astro, SceneSides.astro and flag.css");
