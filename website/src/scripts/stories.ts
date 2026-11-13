// The feature stories (components/Stories.astro). Each plays on a loop while it's on screen and
// starts from its first frame. With reduced motion they don't run, and the markup shows the last frame.

import { createPlayer } from "./player.ts";
import { reducedMotion } from "./screens.ts";

const DOMAIN = "yourcompany.com";

const stories: Record<string, (root: HTMLElement) => void> = { addresses, shared, search };

if (!reducedMotion()) {
  for (const root of document.querySelectorAll<HTMLElement>("[data-story]")) stories[root.dataset.story!]?.(root);
}

function finder(root: HTMLElement) {
  return (name: string) => root.querySelector<HTMLElement>(`[data-el="${name}"]`)!;
}

// Settings → Users: "+ Alias" on Rico, then on Maya; each alias is typed and saved with Enter.
function addresses(root: HTMLElement) {
  const p = createPlayer(root);
  const adders = [...root.querySelectorAll<HTMLElement>("[data-alias]")];
  const template = root.querySelector<HTMLElement>("[data-added]")!.cloneNode(true) as HTMLElement;

  function reset() {
    for (const el of root.querySelectorAll("[data-added], .alias-form")) el.remove();
    for (const add of adders) add.hidden = false;
    p.hide();
    p.park(0);
  }

  async function loop() {
    for (;;) {
      reset();
      await p.sleep(900);
      for (const add of adders) {
        await p.moveTo(add, 0.5, 0.55, 800);
        await p.click(add);
        const form = document.createElement("span");
        form.className = "alias-form";
        form.innerHTML = `<span class="alias-input"></span><span class="muted">@${DOMAIN}</span><span class="icon-btn sm"><svg class="icon i12"><use href="#i-x"></use></svg></span>`;
        add.hidden = true;
        add.before(form);
        p.hide();
        await p.sleep(300);
        await p.type(form.querySelector<HTMLElement>(".alias-input")!, add.dataset.alias!);
        // Enter saves it.
        await p.sleep(420);
        p.caret.remove();
        const pill = template.cloneNode(true) as HTMLElement;
        pill.firstChild!.textContent = `${add.dataset.alias}@${DOMAIN}`;
        pill.classList.add("pop");
        form.replaceWith(pill);
        add.hidden = false;
        await p.sleep(700);
      }
      p.park();
      await p.sleep(3000);
    }
  }
  loop();
}

// Switch to the shared Support mailbox, write from support@ (as Sana), send, and open Sent,
// where the team's replies show who wrote them.
function shared(root: HTMLElement) {
  const p = createPlayer(root);
  const el = finder(root);
  const compose = el("compose");
  const title = el("title");
  const to = el("to");
  const subject = el("subject");
  const body = el("body");
  const status = el("status");
  const send = el("send");
  const toast = el("toast");
  const sentNew = el("sent-new");
  const total = el("total");
  const chip = to.querySelector(".addr-chip")!.cloneNode(true) as HTMLElement;
  const box = (name: string) => root.querySelector<HTMLElement>(`[data-box="${name}"]`)!;
  const folder = (name: string) => root.querySelector<HTMLElement>(`[data-folder="${name}"]`)!;

  function view(mailbox: "sana" | "support", name: "inbox" | "sent", count: number) {
    for (const b of root.querySelectorAll<HTMLElement>("[data-box]")) b.classList.toggle("current", b.dataset.box === mailbox);
    for (const f of root.querySelectorAll<HTMLElement>("[data-folder]")) f.classList.toggle("active", f.dataset.folder === name);
    el("box-name").hidden = el("box-slash").hidden = mailbox === "sana";
    const label = name === "inbox" ? "Inbox" : "Sent";
    el("folder").textContent = el("list-title").textContent = label;
    el("folder-icon").querySelector("use")!.setAttribute("href", `#i-${name === "inbox" ? "inbox" : "send"}`);
    total.textContent = `${count} emails`;
    for (const l of root.querySelectorAll<HTMLElement>("[data-list]")) l.hidden = l.dataset.list !== `${mailbox}-${name}`;
  }

  function reset() {
    view("sana", "inbox", 3);
    compose.classList.remove("open");
    to.replaceChildren();
    subject.replaceChildren();
    subject.classList.add("is-empty");
    title.textContent = "New message";
    body.replaceChildren();
    status.textContent = "";
    sentNew.classList.remove("in", "fresh");
    p.hide();
    p.park(0);
  }

  async function loop() {
    for (;;) {
      reset();
      await p.sleep(900);

      await p.moveTo(box("support"), 0.5, 0.35, 850);
      await p.click(box("support"));
      view("support", "inbox", 3);
      await p.sleep(1000);

      // Compose in Support: it sends from support@.
      const opener = el("compose-btn");
      await p.moveTo(opener, 0.5, 0.5, 750);
      await p.click(opener);
      compose.classList.add("open");
      await p.sleep(520);
      p.hide();

      const typed = document.createElement("span");
      to.append(typed);
      await p.type(typed, "lena@example.com");
      await p.sleep(200);
      typed.remove();
      to.append(chip.cloneNode(true), p.caret);
      await p.sleep(380);

      await p.moveTo(subject, 0.3, 0.5, 450);
      await p.click();
      p.hide();
      subject.classList.remove("is-empty");
      await p.type(subject, "Your account is back", () => (title.textContent = subject.textContent));
      await p.sleep(300);

      await p.moveTo(body, 0.3, 0.2, 450);
      await p.click();
      p.hide();
      const line = document.createElement("p");
      body.append(line);
      await p.type(line, "Hi Lena, you can sign in again. Sorry for the trouble!");
      status.textContent = "Saving…";
      await p.sleep(400);
      status.textContent = "Saved";
      await p.sleep(300);

      p.caret.remove();
      await p.moveTo(send, 0.4, 0.55, 650);
      await p.click(send);
      compose.classList.remove("open");
      toast.classList.add("show");
      p.park();
      await p.sleep(1100);
      toast.classList.remove("show");

      // Sent: the team's replies, each signed by who wrote it.
      await p.moveTo(folder("sent"), 0.5, 0.5, 700);
      await p.click(folder("sent"));
      view("support", "sent", 2);
      await p.sleep(450);
      sentNew.classList.add("in", "fresh");
      total.textContent = "3 emails";
      await p.sleep(700);
      sentNew.classList.remove("fresh");
      p.park();
      await p.sleep(3200);
    }
  }
  loop();
}

// Search: type a query with an operator, press Enter, and the list narrows to the matches.
function search(root: HTMLElement) {
  const p = createPlayer(root);
  const el = finder(root);
  const field = el("search");
  const q = el("q");
  const clear = el("clear");
  const rows = [...root.querySelectorAll<HTMLElement>(".st-row")];
  const misses = rows.filter((r) => !("match" in r.dataset));

  function inbox() {
    q.replaceChildren();
    q.classList.add("is-empty");
    clear.hidden = true;
    el("title").textContent = "Inbox";
    el("count").hidden = false;
    el("list-title").textContent = "Inbox";
  }

  async function stagger(fn: (r: HTMLElement) => void) {
    for (const r of misses) {
      fn(r);
      await p.sleep(70);
    }
  }

  async function loop() {
    inbox();
    for (const r of rows) r.classList.remove("out");
    p.park(0);
    for (;;) {
      await p.sleep(1000);
      await p.moveTo(field, 0.35, 0.5, 850);
      await p.click();
      p.hide();
      field.classList.add("focus");
      q.classList.remove("is-empty");
      await p.type(q, "invoice has:attachment", () => (clear.hidden = false));
      // Enter searches.
      await p.sleep(450);
      p.caret.remove();
      field.classList.remove("focus");
      el("title").textContent = "Search";
      el("count").hidden = true;
      el("list-title").textContent = "Results";
      await stagger((r) => r.classList.add("out"));
      p.park();
      await p.sleep(3200);

      await p.moveTo(clear, 0.5, 0.5, 700);
      await p.click(clear);
      inbox();
      await stagger((r) => r.classList.remove("out"));
      p.park();
      await p.sleep(800);
    }
  }
  loop();
}
