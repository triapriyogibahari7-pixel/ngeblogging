const RELEASE = "nara-capability-bridge-v11-20260724";
let availability = "pending";
let billingReady = false;
let imageGenerationReady = false;
let retryTimer = 0;
let frame = 0;

function syncRootState() {
  const root = document.documentElement;
  if (root.dataset.naraReady !== availability) root.dataset.naraReady = availability;
  const billing = String(billingReady);
  const images = String(imageGenerationReady);
  if (root.dataset.naraBillingReady !== billing) root.dataset.naraBillingReady = billing;
  if (root.dataset.naraImageReady !== images) root.dataset.naraImageReady = images;
  if (root.dataset.naraCapabilityRelease !== RELEASE) root.dataset.naraCapabilityRelease = RELEASE;
}

function labelOf(node) {
  return node?.querySelector?.("span")?.textContent?.trim()
    || node?.textContent?.replace(/\s+/g, " ").trim()
    || "";
}

function assistantLaunchers() {
  return [...document.querySelectorAll(
    ".nara-floating-button,.sn-top-actions .sn-nara-button,.sn-home-grid button",
  )].filter((button) => {
    const label = labelOf(button);
    return button.classList.contains("nara-floating-button")
      || label.includes("Tanya Nara")
      || label === "Buka Nara";
  });
}

function revealLauncher(node) {
  if (node.hidden) node.hidden = false;
  if (node.getAttribute("aria-hidden") === "true") node.removeAttribute("aria-hidden");
  if (node.style.display) node.style.removeProperty("display");
  if (node.style.visibility) node.style.removeProperty("visibility");
  if (node.style.pointerEvents) node.style.removeProperty("pointer-events");
  if (node.style.opacity) node.style.removeProperty("opacity");
  if ("disabled" in node && node.disabled) node.disabled = false;
  if (node.tabIndex < 0) node.tabIndex = 0;
}

function preserveAssistantCapabilities() {
  document.querySelectorAll(".nara-attachment-menu").forEach((node) => {
    node.dataset.imageProviderReady = String(imageGenerationReady);
  });

  // Native file controls are implementation details. They must stay hidden;
  // camera, photo, text-file and QR actions remain available through styled buttons.
  document.querySelectorAll('.nara-composer input[type="file"]').forEach((input) => {
    input.hidden = true;
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    input.classList.add("nara-native-file-input");
  });
}

function scan() {
  syncRootState();
  assistantLaunchers().forEach((button) => {
    revealLauncher(button);
    button.dataset.naraLauncher = "active";
    button.setAttribute("aria-label", "Buka Nara AI");
    button.setAttribute("title", availability === "ready"
      ? "Buka Nara AI"
      : "Buka Nara AI — koneksi akan dicoba otomatis");
  });
  preserveAssistantCapabilities();
}

function scheduleScan() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

function scheduleRetry(delay = 3000) {
  clearTimeout(retryTimer);
  retryTimer = window.setTimeout(resolveAvailability, delay);
}

async function resolveAvailability() {
  clearTimeout(retryTimer);
  try {
    const response = await fetch(`/api/health?nara=${Date.now()}`, {
      cache: "no-store",
      headers: { accept: "application/json", "cache-control": "no-cache" },
    });
    if (!response.ok) throw new Error(`Health ${response.status}`);
    const health = await response.json().catch(() => ({}));
    availability = health.nara === false ? "degraded" : "ready";
    billingReady = health.billing === true;
    imageGenerationReady = health.imageGeneration === true;
  } catch {
    availability = "degraded";
    billingReady = false;
    imageGenerationReady = false;
    scheduleRetry();
  } finally {
    scan();
  }
}

const root = document.getElementById("root") || document.documentElement;
new MutationObserver(scheduleScan).observe(root, { childList: true, subtree: true });
window.addEventListener("online", resolveAvailability);
window.addEventListener("pageshow", resolveAvailability);
document.addEventListener("visibilitychange", () => { if (!document.hidden) resolveAvailability(); });
scan();
resolveAvailability();
