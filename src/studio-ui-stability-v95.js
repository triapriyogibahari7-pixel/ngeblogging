const RELEASE = "studio-ui-stability-v95-20260728";
const PHONE_QUERY = "(max-width: 760px)";

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function closeMobileDrawer(shell) {
  if (!shell || !window.matchMedia(PHONE_QUERY).matches) return;
  const side = shell.querySelector(":scope > .sn-side");
  if (!side || side.classList.contains("collapsed")) return;
  const toggle = shell.querySelector(":scope > .sn-main > .sn-top > .sn-icon");
  if (toggle instanceof HTMLButtonElement) toggle.click();
}

function syncCommentsGeometry(shell) {
  const nav = shell.querySelector(":scope > .sn-side > nav");
  if (!nav || !window.matchMedia(PHONE_QUERY).matches) return;
  const reference = [...nav.querySelectorAll(":scope > button")]
    .find((button) => !button.hidden && labelOf(button) !== "Nara AI");
  const comments = nav.querySelector(":scope > .sn-comments-nav-host-v93 > .sn-comments-nav-button-v93");
  if (!reference || !comments) return;

  const computed = getComputedStyle(reference);
  const geometry = [
    "min-height", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "gap", "border-radius", "font-size", "line-height", "text-align",
  ];
  for (const property of geometry) {
    const value = computed.getPropertyValue(property);
    if (value) comments.style.setProperty(property, value, "important");
  }
  comments.style.setProperty("width", "100%", "important");
  comments.style.setProperty("margin", "0", "important");
  comments.style.setProperty("justify-content", "flex-start", "important");
  comments.style.setProperty("align-items", "center", "important");
  comments.dataset.mobileAlignedV95 = "true";
}

function sync() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;
  shell.dataset.uiStabilityRelease = RELEASE;
  syncCommentsGeometry(shell);
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function start() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const shell = target.closest(".sn-shell");
    if (!shell) return;
    const comments = target.closest(".sn-comments-nav-button-v93");
    const settings = target.closest(".sn-account-settings-v88, .sn-account-settings-v85");
    if (!comments && !settings) return;
    requestAnimationFrame(() => closeMobileDrawer(shell));
  }, true);

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
