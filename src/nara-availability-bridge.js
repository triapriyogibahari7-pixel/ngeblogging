let resolved = false;
let naraReady = false;
document.documentElement.dataset.naraReady = "pending";

function labelOf(button) {
  return button.querySelector("span")?.textContent?.trim() || button.textContent?.replace(/\s+/g, " ").trim() || "";
}

function naraControls() {
  return [...document.querySelectorAll(".sn-side button,.sn-mobile-sheet-layer button,.sn-mobile-nav button,.sn-top-actions button,.sn-home-grid button")]
    .filter((button) => {
      const label = labelOf(button);
      return label === "Nara AI" || label.includes("Tanya Nara") || label === "Buka Nara";
    });
}

function homeButton() {
  return [...document.querySelectorAll(".sn-side nav button,.sn-mobile-nav button")]
    .find((button) => ["Ringkasan", "Home"].includes(labelOf(button)));
}

function conceal(button) {
  button.style.display = "none";
  button.hidden = true;
  button.disabled = true;
  button.setAttribute("aria-hidden", "true");
  button.tabIndex = -1;
}

function reveal(button) {
  button.style.removeProperty("display");
  button.hidden = false;
  button.disabled = false;
  button.setAttribute("aria-hidden", "false");
  button.tabIndex = 0;
}

function scan() {
  const controls = naraControls();
  if (!resolved || !naraReady) {
    controls.forEach(conceal);
    if (resolved && !naraReady && (document.querySelector(".nw-page") || controls.some((button) => button.classList.contains("active")))) {
      homeButton()?.click();
    }
    return;
  }
  controls.forEach(reveal);
}

async function resolveAvailability() {
  try {
    const response = await fetch("/api/health", { cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Nara readiness unavailable");
    const health = await response.json().catch(() => ({}));
    naraReady = health.nara === true;
  } catch {
    naraReady = false;
  } finally {
    resolved = true;
    document.documentElement.dataset.naraReady = String(naraReady);
    scan();
  }
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
scan();
resolveAvailability();
