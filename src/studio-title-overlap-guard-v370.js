const RELEASE = "studio-title-overlap-guard-v371-20261001";

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function rect(node) {
  try {
    return node.getBoundingClientRect();
  } catch {
    return null;
  }
}

function overlap(a, b) {
  if (!a || !b || a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) return false;
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return false;
  const intersection = width * height;
  const smaller = Math.min(a.width * a.height, b.width * b.height);
  return smaller > 0 && intersection / smaller >= 0.35;
}

function visible(node) {
  if (!node || node.hidden) return false;
  const style = getComputedStyle(node);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function hideDuplicate(node) {
  if (!node || node.dataset.studioTitleOverlapGuard === RELEASE) return;
  node.hidden = true;
  node.setAttribute("aria-hidden", "true");
  node.dataset.studioTitleOverlapGuard = RELEASE;
  node.style.setProperty("display", "none", "important");
}

function cleanTitleBlocks(shell) {
  // Only inspect the content area. The global header is deliberately excluded.
  const blocks = [...shell.querySelectorAll(".sn-main .sn-page-title")].filter(visible);
  if (blocks.length < 2) return;

  // Legacy title layers sometimes remain mounted on top of the active title.
  // Keep the first visible title and remove only later blocks that occupy it.
  const primary = blocks[0];
  const primaryRect = rect(primary);
  blocks.slice(1).forEach((candidate) => {
    if (overlap(primaryRect, rect(candidate))) hideDuplicate(candidate);
  });
}

function cleanView(view) {
  const titleBlocks = [...view.querySelectorAll(":scope > .sn-page-title")];
  if (titleBlocks.length > 1) {
    const visibleTitles = titleBlocks.filter(visible);
    if (visibleTitles.length > 1) {
      const primaryText = normalize(visibleTitles[0].querySelector("h1,h2")?.textContent);
      visibleTitles.slice(1).forEach((candidate) => {
        const candidateText = normalize(candidate.querySelector("h1,h2")?.textContent);
        if (primaryText && candidateText === primaryText) hideDuplicate(candidate);
        else if (overlap(rect(visibleTitles[0]), rect(candidate))) hideDuplicate(candidate);
      });
    }
  }

  const headings = [...view.querySelectorAll("h1, h2")].filter(visible);
  const groups = new Map();
  headings.forEach((node) => {
    const text = normalize(node.textContent);
    if (!text) return;
    const group = groups.get(text) || [];
    group.push(node);
    groups.set(text, group);
  });

  groups.forEach((nodes) => {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.closest("button, a, [role='button']") || b.closest("button, a, [role='button']")) continue;
        if (overlap(rect(a), rect(b))) hideDuplicate(b);
      }
    }
  });
}

function sync() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;
  shell.dataset.studioTitleOverlapGuard = RELEASE;
  cleanTitleBlocks(shell);
  shell.querySelectorAll(":scope > .sn-main .sn-view-pad").forEach(cleanView);
}

let frame = 0;
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    sync();
  });
}

if (typeof document !== "undefined") {
  const start = () => {
    const observer = new MutationObserver(schedule);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden"],
    });
    schedule();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

export { RELEASE, sync };
