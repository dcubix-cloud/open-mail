// Retakes the website's app screenshots from the real app: starts shots/server.py (seeded backend)
// and the frontend's Vite dev server, then drives them with Playwright.
// Run from website/: `node shots/shoot.mjs`. Writes src/assets/shots/{compose,inbox-phone}.png.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const { chromium } = await import(here("../../frontend/node_modules/playwright/index.mjs"));

const API = 8767;
const WEB = 5197;
const BASE = `http://localhost:${WEB}`;
const out = here("../src/assets/shots/");
mkdirSync(out, { recursive: true });

const python = here("../../backend/.venv/bin/python");
const procs = [
  spawn(python, [here("server.py")], { env: { ...process.env, SHOTS_API_PORT: String(API), SHOTS_WEB_PORT: String(WEB) }, stdio: "inherit" }),
  spawn("npx", ["vite", "--port", String(WEB), "--strictPort"], {
    cwd: here("../../frontend"),
    env: { ...process.env, API_PROXY: `http://127.0.0.1:${API}` },
    stdio: "ignore",
  }),
];
const stop = () => procs.forEach((p) => p.kill());
process.on("exit", stop);

async function waitFor(url) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} did not come up`);
}
await waitFor(`http://127.0.0.1:${API}/api/auth/session`);
await waitFor(BASE);

async function signIn(page) {
  await page.goto(BASE);
  await page.getByLabel("Email").fill("sana@yourcompany.com");
  await page.getByLabel("Password").fill("shots-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Inbox" }).waitFor();
  await page.waitForTimeout(600);
}

// A one-page PDF, small enough to inline.
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

const browser = await chromium.launch();
try {
  // Desktop: writing a message, with formatting and an attachment, saved as a draft.
  const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await signIn(desk);
  await desk.locator(".rail-compose").click();
  const compose = desk.getByRole("dialog", { name: "Compose" });
  const to = compose.getByLabel("To");
  await to.waitFor();
  for (const address of ["maya@yourcompany.com", "rico@yourcompany.com"]) {
    await to.fill(address);
    await to.press("Enter");
  }
  await compose.getByLabel("Subject").fill("Offsite plan");
  const editor = compose.locator(".editor-content");
  await editor.click();
  await desk.keyboard.type("Hi both,");
  await desk.keyboard.press("Enter");
  await desk.keyboard.type("Here's the plan for the offsite:");
  await desk.keyboard.press("Enter");
  await desk.keyboard.type("- Thursday: arrive and settle in");
  await desk.keyboard.press("Enter");
  await desk.keyboard.type("Friday: roadmap in the morning, then ");
  await desk.keyboard.press("Control+b");
  await desk.keyboard.type("dinner at the lake");
  await desk.keyboard.press("Control+b");
  await desk.keyboard.press("Enter");
  await desk.keyboard.press("Enter");
  await desk.keyboard.type("Agenda attached.");
  await compose.locator('input[type="file"]').setInputFiles({ name: "agenda.pdf", mimeType: "application/pdf", buffer: pdf });
  await compose.getByText("Saved", { exact: true }).waitFor({ timeout: 15000 });
  await desk.mouse.move(700, 600);
  await desk.waitForTimeout(400);
  await desk.screenshot({ path: `${out}compose.png` });

  // Phone: the inbox.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await signIn(phone);
  // Off the rows, so none shows its hover state.
  await phone.mouse.move(200, 760);
  await phone.waitForTimeout(300);
  await phone.screenshot({ path: `${out}inbox-phone.png` });
  console.log("wrote src/assets/shots/compose.png and inbox-phone.png");
} finally {
  await browser.close();
  stop();
}
