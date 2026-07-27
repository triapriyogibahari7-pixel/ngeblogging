const RELEASE = "domain-mobile-precision-v61-20260727";
const observed = new WeakSet();
let frame = 0;

function fitHostname(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected) return;
  const hostname = String(element.textContent || "").trim();
  if (!hostname) return;

  element.dataset.fitHostname = "true";
  element.title = hostname;
  element.setAttribute("aria-label", hostname);
  element.style.setProperty("--d61-hostname-size", "18px");

  const available = element.clientWidth;
  if (!available) return;

  let size = Math.min(18, Math.max(10, Number.parseFloat(getComputedStyle(element).fontSize) || 14));
  element.style.setProperty("--d61-hostname-size", `${size}px`);

  while (element.scrollWidth > available + 1 && size > 9) {
    size = Math.max(9, size - 0.5);
    element.style.setProperty("--d61-hostname-size", `${size}px`);
  }
}

function decorateForm(root) {
  const input = root.querySelector('.dfz-root-form input[name="hostname"]');
  if (input) {
    input.placeholder = "contoh: domainanda.com (tanpa www)";
    input.autocapitalize = "none";
  }
}

function scan() {
  const root = document.querySelector(".dfz-root");
  if (!root) return;
  document.documentElement.dataset.domainMobilePrecisionV61 = RELEASE;
  root.dataset.domainMobilePrecision = RELEASE;
  decorateForm(root);

  const hostname = root.querySelector(".dfz-free-card h2");
  if (!hostname) return;
  fitHostname(hostname);
  if (!observed.has(hostname) && "ResizeObserver" in window) {
    observed.add(hostname);
    new ResizeObserver(() => fitHostname(hostname)).observe(hostname);
  }
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "characterData")) schedule();
}).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

window.addEventListener("resize", schedule, { passive: true });
scan();
