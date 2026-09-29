export const RELEASE = "studio-analytics-layout-v349-20260929";

function analyticsView() {
  const views = [...document.querySelectorAll(".sn-main > .sn-view-pad")];
  return views.find((view) => {
    const heading = view.querySelector(".sn-page-title h1, .sn-analytics-page-title h1");
    return String(heading?.textContent || "").trim().toLowerCase() === "analitik";
  }) || null;
}

function hideDuplicateToolbarText(view) {
  if (!view) return;
  const targets = new Set([
    "RINGKASAN ANALITIK",
    "Performa situs",
    "Pantau kunjungan, pengunjung, dan sumber trafik dalam satu tampilan.",
  ]);
  view.querySelectorAll("small,h2,p").forEach((node) => {
    const text = String(node.textContent || "").replace(/\\s+/g, " ").trim();
    if (!targets.has(text)) return;
    node.style.setProperty("visibility", "hidden", "important");
    node.style.setProperty("opacity", "0", "important");
    node.style.setProperty("pointer-events", "none", "important");
  });
}

function normalizeTitle(view) {
  if (!view) return false;
  view.classList.add("sn-analytics-view-v349");
  view.dataset.analyticsLayoutV349 = RELEASE;

  const titles = [...view.querySelectorAll(":scope > .sn-page-title, :scope > .sn-analytics-page-title")];
  const primary = titles.find((node) => String(node.querySelector("h1")?.textContent || "").trim().toLowerCase() === "analitik") || titles[0];
  if (!primary) return true;

  titles.forEach((node) => {
    if (node !== primary) {
      node.hidden = true;
      node.setAttribute("aria-hidden", "true");
      node.dataset.analyticsLegacyTitle = "hidden-v349";
    }
  });

  primary.hidden = false;
  primary.removeAttribute("aria-hidden");
  primary.classList.add("sn-analytics-primary-title-v349");

  const headings = [...primary.querySelectorAll("h1")];
  headings.slice(1).forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
  });
  primary.querySelectorAll("small").forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
  });

  const firstHeading = headings[0];
  if (firstHeading) {
    firstHeading.textContent = "Analitik";
    firstHeading.setAttribute("aria-label", "Analitik");
  }
  return true;
}

let frame = 0;
function sync() {
  frame = 0;
  const view = analyticsView();\n  normalizeTitle(view);\n  hideDuplicateToolbarText(view);
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  const observer = new MutationObserver(schedule);
  const start = () => {
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "aria-hidden"],
    });
    schedule();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
}

export { analyticsView, normalizeTitle, sync };
