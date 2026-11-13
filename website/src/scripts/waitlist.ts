// Sends the waitlist forms to <base>/api/waitlist, same-origin, unless PUBLIC_WAITLIST_URL says
// otherwise (then add its origin to connect-src in public/_headers).

const endpoint: string =
  import.meta.env.PUBLIC_WAITLIST_URL ?? `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/waitlist`;

for (const form of document.querySelectorAll<HTMLFormElement>("form[data-waitlist]")) {
  const box = form.closest(".join");
  const error = box?.querySelector(".join-error");
  const button = form.querySelector("button");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (button) button.disabled = true;
    if (error) error.textContent = "";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), company: data.get("company"), referrer: document.referrer }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't join. Try again.");
      for (const join of document.querySelectorAll(".join")) {
        join.querySelector("form")?.setAttribute("hidden", "");
        join.querySelector(".join-done")?.removeAttribute("hidden");
      }
    } catch (err) {
      if (error) error.textContent = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't join. Try again.";
    } finally {
      if (button) button.disabled = false;
    }
  });
}

// "Join waitlist" in the nav brings the hero form into view and focuses it.
for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-join]")) {
  link.addEventListener("click", (event) => {
    const input = document.querySelector<HTMLInputElement>(".join-hero input[name=email]");
    if (!input || input.closest("form")?.hidden) return;
    event.preventDefault();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  });
}
