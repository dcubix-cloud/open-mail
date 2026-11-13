// Plays a scripted demo on an app screen: a pointer that moves and clicks, and typing with a caret.
// Every wait holds while the screen is off-screen or the tab is hidden, so a demo picks up where
// it was when it scrolls back into view.

export function createPlayer(root: HTMLElement, onChar?: (ch: string) => void) {
  const cursor = root.querySelector<HTMLElement>(".cursor")!;
  const caret = document.createElement("span");
  caret.className = "caret";

  let visible = false;
  let resume: (() => void) | null = null;
  const wake = () => {
    if (visible && !document.hidden && resume) {
      resume();
      resume = null;
    }
  };
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      wake();
    },
    { threshold: 0.2 },
  ).observe(root);
  document.addEventListener("visibilitychange", wake);

  async function sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
    while (!visible || document.hidden) await new Promise<void>((r) => (resume = r));
  }

  // Typing into a field: text goes in before the caret.
  const pause = (ch: string) => 30 + Math.random() * 42 + (ch === " " ? 18 : 0) + (/[,.]/.test(ch) ? 130 : 0);

  async function type(target: HTMLElement, text: string, each?: () => void) {
    target.append(caret);
    const node = document.createTextNode("");
    caret.before(node);
    for (const ch of text) {
      onChar?.(ch);
      node.appendData(ch);
      each?.();
      await sleep(pause(ch));
    }
  }

  function place(x: number, y: number, ms: number) {
    cursor.style.setProperty("--t", `${ms}ms`);
    cursor.style.setProperty("--x", `${Math.round(x)}px`);
    cursor.style.setProperty("--y", `${Math.round(y)}px`);
  }

  // The screen is scaled; the pointer moves in the screen's own units.
  const scale = () => root.getBoundingClientRect().width / root.offsetWidth || 1;

  async function moveTo(target: HTMLElement, fx = 0.5, fy = 0.55, ms = 600) {
    const r = root.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const k = scale();
    cursor.classList.add("on");
    // The arrow's tip sits about 4px in and 3px down from the icon's corner.
    place((t.left - r.left + t.width * fx) / k - 4, (t.top - r.top + t.height * fy) / k - 3, ms);
    await sleep(ms + 80);
  }

  async function click(target?: HTMLElement) {
    cursor.classList.add("down");
    target?.classList.add("pressed");
    await sleep(130);
    cursor.classList.remove("down");
    target?.classList.remove("pressed");
  }

  function park(ms = 700) {
    place(root.offsetWidth * 0.62, root.offsetHeight * 0.82, ms);
  }

  const hide = () => cursor.classList.remove("on");

  return { sleep, type, moveTo, click, park, hide, caret, cursor };
}
