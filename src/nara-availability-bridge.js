let availability = "pending";
let retryTimer = 0;
document.documentElement.dataset.naraReady = availability;

function labelOf(button) {
  return button.querySelector("span")?.textContent?.trim() || button.textContent?.replace(/\s+/g, " ").trim() || "";
}

function naraControls() {
  return [...document.querySelectorAll(".sn-side button,.sn-top-actions button,.sn-home-grid button")]
    .filter((button) => {
      const label = labelOf(button);
      return label === "Nara AI" || label.includes("Tanya Nara") || label === "Buka Nara";
    });
}

function homeButton() {
  return [...document.querySelectorAll(".sn-side nav button")]
    .find((button) => labelOf(button) === "Ringkasan");
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
  if (availability === "unavailable") {
    controls.forEach(conceal);
    if (document.querySelector(".nw-page") || controls.some((button) => button.classList.contains("active"))) homeButton()?.click();
    return;
  }
  controls.forEach(reveal);
}

function scheduleRetry(delay = 2500) {
  clearTimeout(retryTimer);
  retryTimer = window.setTimeout(resolveAvailability, delay);
}

async function resolveAvailability() {
  clearTimeout(retryTimer);
  try {
    const response = await fetch(`/api/health?nara=${Date.now()}`, { cache: "no-store", headers: { accept: "application/json", "cache-control": "no-cache" } });
    if (!response.ok) throw new Error("Nara readiness unavailable");
    const health = await response.json().catch(() => ({}));
    availability = health.nara === false ? "unavailable" : "ready";
  } catch {
    availability = "unknown";
    scheduleRetry(3000);
  } finally {
    document.documentElement.dataset.naraReady = availability;
    scan();
  }
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("online", resolveAvailability);
document.addEventListener("visibilitychange", () => { if (!document.hidden) resolveAvailability(); });
scan();
resolveAvailability();
