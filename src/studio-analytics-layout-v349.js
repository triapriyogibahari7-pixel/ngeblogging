export const RELEASE = "studio-analytics-layout-v349-20260929-text-only-cleanup";

function analyticsView() {
  const views = [...document.querySelectorAll(".sn-main > .sn-view-pad")];
  return views.find((view) => {
    const heading = view.querySelector(".sn-page-title h1, .sn-analytics-page-title h1");
    return String(heading?.textContent || "").trim().toLowerCase() === "analitik";
  }) || null;
}

function hideDuplicateToolbarText(view) {
  if (!view) return;

  const targets = [
    "RINGKASAN ANALITIK",
    "PERFORMA SITUS",
    "PANTAU KUNJUNGAN, PENGUNJUNG, DAN SUMBER TRAFIK DALAM SATU TAMPILAN.",
  ];
  const normalize = (value) => String(value || "")
    .replace(/\\s+/g, " ")
    .trim()
    .toUpperCase();
  const containsTarget = (value) => {
    const text = normalize(value);
    return targets.some((target) => text.includes(target));
  };
  const hasInteractive = (node) => !!node?.querySelector?.(
    "button, select, input, textarea, a[href]"
  );

  const clean = () => {
    // First remove the known legacy duplicate text blocks.
    view.querySelectorAll(".op41-clean-heading").forEach((node) => node.remove());
    view.querySelectorAll(".op41-toolbar, .op41-clean-toolbar").forEach((toolbar) => {
      [...toolbar.children].forEach((child) => {
        if (containsTarget(child.textContent) && !hasInteractive(child)) child.remove();
      });

      const walker = document.createTreeWalker(toolbar, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let node;
      while ((node = walker.nextNode())) nodes.push(node);
      nodes.forEach((textNode) => {
        if (containsTarget(textNode.nodeValue)) textNode.nodeValue = "";
      });
    });

    // The broken legacy renderer can also emit the same text without the
    // old class names. Remove ONLY text-only elements that physically overlap
    // the real analytics controls. This leaves buttons and their wrappers intact.
    const controls = [...view.querySelectorAll(
      "button, select, input, textarea, a[href], [role='button']"
    )].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 20;
    });
    if (!controls.length) return;

    const intersects = (a, b) =>
      a.left < b.right && a.right > b.left &&
      a.top < b.bottom && a.bottom > b.top;

    const candidates = [...view.querySelectorAll("*")].filter((el) => {
      if (el === view || el.closest("button, select, input, textarea, a[href], [role='button']")) return false;
      if (hasInteractive(el)) return false;
      const text = normalize(el.textContent);
      if (!text || text.length < 4) return false;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      return controls.some((control) => intersects(r, control.getBoundingClientRect()));
    });

    // Remove the smallest matching text containers first so a parent does not
    // swallow a legitimate control wrapper.
    candidates
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (ar.width * ar.height) - (br.width * br.height);
      })
      .forEach((el) => {
        if (el.isConnected && !hasInteractive(el) && !el.closest("button, select, input, textarea, a[href], [role='button']")) {
          el.remove();
        }
      });
  };

  clean();
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
  const view = analyticsView();
  normalizeTitle(view);
  hideDuplicateToolbarText(view);
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
