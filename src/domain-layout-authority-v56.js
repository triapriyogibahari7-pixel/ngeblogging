const RELEASE = "domain-layout-authority-v56-20260727";
let frame = 0;

function isDomainView(view) {
  if (!(view instanceof HTMLElement)) return false;
  if (view.querySelector(":scope > .dfz-root")) return true;
  return view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === "Domain & publikasi";
}

function directRoots(view) {
  return [...view.children].filter((node) => node.classList?.contains("dfz-root"));
}

function quarantine(node) {
  if (!(node instanceof HTMLElement)) return;
  node.hidden = true;
  node.setAttribute("aria-hidden", "true");
  node.inert = true;
  node.dataset.domainLayoutQuarantined = RELEASE;
  node.style.setProperty("display", "none", "important");
  node.style.setProperty("visibility", "hidden", "important");
  node.style.setProperty("opacity", "0", "important");
  node.style.setProperty("pointer-events", "none", "important");
  node.style.setProperty("position", "static", "important");
  node.style.setProperty("inset", "auto", "important");
  node.style.setProperty("width", "0", "important");
  node.style.setProperty("height", "0", "important");
  node.style.setProperty("min-width", "0", "important");
  node.style.setProperty("min-height", "0", "important");
  node.style.setProperty("margin", "0", "important");
  node.style.setProperty("padding", "0", "important");
  node.style.setProperty("overflow", "hidden", "important");
  node.style.setProperty("transform", "none", "important");
}

function activateRoot(root) {
  if (!(root instanceof HTMLElement)) return;
  root.hidden = false;
  root.removeAttribute("aria-hidden");
  root.inert = false;
  delete root.dataset.domainLayoutQuarantined;
  root.dataset.domainLayoutAuthority = RELEASE;
  root.style.setProperty("display", "block", "important");
  root.style.setProperty("visibility", "visible", "important");
  root.style.setProperty("opacity", "1", "important");
  root.style.setProperty("pointer-events", "auto", "important");
  root.style.setProperty("position", "relative", "important");
  root.style.setProperty("inset", "auto", "important");
  root.style.setProperty("width", "100%", "important");
  root.style.setProperty("height", "auto", "important");
  root.style.setProperty("min-width", "0", "important");
  root.style.setProperty("min-height", "0", "important");
  root.style.setProperty("margin", "0", "important");
  root.style.setProperty("overflow", "visible", "important");
  root.style.setProperty("transform", "none", "important");
}

function reconcileView(view) {
  const roots = directRoots(view);
  if (!roots.length) return;

  const root = roots.find((candidate) => candidate.querySelector(":scope > .dfz-shell")) || roots[0];
  roots.filter((candidate) => candidate !== root).forEach((candidate) => candidate.remove());

  view.dataset.domainFullZoneAuthority ||= "domain-full-zone-v54-20260726";
  view.dataset.domainLayoutAuthority = RELEASE;

  for (const child of [...view.children]) {
    if (child === root) activateRoot(child);
    else quarantine(child);
  }
}

function scan() {
  document.documentElement.dataset.domainLayoutAuthorityV56 = RELEASE;
  document.querySelectorAll(".sn-main > .sn-view-pad").forEach((view) => {
    if (isDomainView(view)) reconcileView(view);
  });
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("pageshow", schedule);
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });

scan();
