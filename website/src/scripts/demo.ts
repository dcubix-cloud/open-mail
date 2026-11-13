// Hero demo: opens Compose, types a message (lighting the keys on the keyboard), sends it, and
// lands a reply in the inbox while the mailbox in the scene raises its flag, on a loop. It pauses
// while off-screen. With reduced motion it doesn't run, and the markup shows the finished message.

import { createPlayer } from "./player.ts";
import { reducedMotion, shortDate } from "./screens.ts";

const root = document.querySelector<HTMLElement>("[data-demo]");
const kb = document.querySelector<HTMLElement>("[data-kb]");

if (root && !reducedMotion()) run(root);

function run(root: HTMLElement) {
  const el = (name: string) => root.querySelector<HTMLElement>(`[data-el="${name}"]`)!;
  const compose = el("compose");
  const title = el("title");
  const to = el("to");
  const subject = el("subject");
  const body = el("body");
  const status = el("status");
  const send = el("send");
  const toast = el("toast");
  const reply = el("reply");
  const total = el("total");
  const now = el("now");
  const cursor = el("cursor");
  const bold = root.querySelector<HTMLElement>('[data-tool="bold"]')!;
  const hero = root.closest<HTMLElement>(".hero");
  const chipTemplate = to.querySelector(".addr-chip")!.cloneNode(true) as HTMLElement;
  const { sleep, type, moveTo, click, park, caret } = createPlayer(root, (ch) => press(keysFor(ch)));

  // Keyboard

  const shifted: Record<string, string> = { "@": "2", "!": "1", "?": "/", ":": ";", '"': "'", _: "-", "+": "=", "(": "9", ")": "0" };
  const timers = new Map<Element, number>();

  function keysFor(ch: string): string[] {
    if (ch === "\n") return ["enter"];
    if (ch in shifted) return ["shift", shifted[ch]];
    if (ch !== ch.toLowerCase()) return ["shift", ch.toLowerCase()];
    return [ch];
  }

  function press(keys: string[], hold = 120) {
    if (!kb) return;
    for (const k of keys) {
      const key = kb.querySelector(`[data-k="${CSS.escape(k)}"]`);
      if (!key) continue;
      key.classList.add("on");
      clearTimeout(timers.get(key));
      timers.set(key, window.setTimeout(() => key.classList.remove("on"), hold));
    }
  }

  const shown = (a: HTMLElement, b: HTMLElement) => (a.offsetParent !== null ? a : b);

  function reset() {
    compose.classList.remove("open");
    to.replaceChildren();
    subject.replaceChildren();
    subject.classList.add("is-empty");
    title.textContent = "New message";
    body.replaceChildren();
    status.textContent = "";
    bold.classList.remove("active");
    reply.classList.remove("in", "fresh");
    total.textContent = "4 emails";
    hero?.classList.remove("has-mail");
    cursor.classList.remove("on");
    park(0);
  }

  async function loop() {
    for (;;) {
      reset();
      await sleep(600);

      // Open Compose.
      const opener = shown(el("compose-btn"), el("compose-fab"));
      await moveTo(opener, 0.5, 0.5, 850);
      await click(opener);
      compose.classList.add("open");
      await sleep(520);
      cursor.classList.remove("on");

      // To: the address becomes a chip on Enter.
      const typed = document.createElement("span");
      to.append(typed);
      await type(typed, "team@yourcompany.com");
      await sleep(180);
      press(["enter"], 180);
      typed.remove();
      to.append(chipTemplate.cloneNode(true), caret);
      await sleep(420);

      // Subject: the compose title follows it.
      await moveTo(subject, 0.3, 0.5, 450);
      await click();
      cursor.classList.remove("on");
      subject.classList.remove("is-empty");
      await type(subject, "We moved our mail", () => (title.textContent = subject.textContent));
      await sleep(320);

      // Body, with Ctrl+B for the bold part.
      await moveTo(body, 0.35, 0.25, 450);
      await click();
      cursor.classList.remove("on");
      const first = document.createElement("p");
      body.append(first);
      await type(first, "Hi all,");
      await sleep(200);
      press(["enter"], 160);
      const second = document.createElement("p");
      body.append(second);
      await sleep(260);
      await type(second, "Our mail now runs on our own server. ");
      press(["ctrl", "b"], 220);
      bold.classList.add("active");
      const strong = document.createElement("strong");
      second.append(strong);
      await sleep(240);
      await type(strong, "Reply here");
      press(["ctrl", "b"], 220);
      bold.classList.remove("active");
      await sleep(200);
      await type(second, " to try it.");

      // The draft saves itself.
      status.textContent = "Saving…";
      await sleep(420);
      status.textContent = "Saved";
      await sleep(300);

      // Send.
      caret.remove();
      await moveTo(send, 0.4, 0.55, 700);
      await click(send);
      compose.classList.remove("open");
      toast.classList.add("show");
      park();
      await sleep(1200);
      toast.classList.remove("show");
      cursor.classList.remove("on");
      await sleep(500);

      // A reply arrives.
      now.textContent = shortDate(new Date());
      reply.classList.add("in", "fresh");
      total.textContent = "5 emails";
      hero?.classList.add("has-mail");
      await sleep(700);
      reply.classList.remove("fresh");
      await sleep(3000);
    }
  }

  loop();
}
