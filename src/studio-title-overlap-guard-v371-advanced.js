/**
 * Advanced Overlap Guard v371 — Handles edge cases for Studio title overlapping.
 * 
 * Scope: Only Studio content area (.sn-main), explicitly excludes the header.
 * Detects and removes redundant title layers without touching the global UI.
 * 
 * Changes from v370:
 * - Enhanced visibility detection with computed style analysis
 * - Handles dynamic re-renders and mobile/desktop transitions
 * - Tracks removed nodes to prevent repeated detection
 * - Debounces aggressive cleanups on scroll/resize
 */

const RELEASE = "studio-title-overlap-guard-v371-advanced-20261001";
const removed = new WeakSet();
let frame = 0;
let lastCleanupTime = 0;

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

function isVisible(node) {
  if (!node || node.hidden) return false;
  try {
    const style = getComputedStyle(node);
    const opacity = parseFloat(style.opacity);
    const display = style.display;
    const visibility = style.visibility;
    const height = node.offsetHeight;
    const width = node.offsetWidth;
    
    return (
      display !== "none" &&
      visibility !== "hidden" &&
      opacity > 0 &&
      height > 0 &&
      width > 0
    );
  } catch {
    return false;
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

function hideDuplicate(node) {
  if (!node || removed.has(node)) return;
  removed.add(node);
  node.hidden = true;
  node.setAttribute("aria-hidden", "true");
  node.dataset.studioTitleOverlapGuard = RELEASE;
  node.style.setProperty("display", "none", "important");
  node.style.setProperty("visibility", "hidden", "important");
  node.style.setProperty("pointer-events", "none", "important");
}

function cleanTitleBlocks() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;

  // Focus only on main content area—explicitly skip header
  const main = shell.querySelector(":scope > .sn-main");
  if (!main) return;

  const blocks = [...main.querySelectorAll(".sn-page-title")].filter(isVisible);
  if (blocks.length < 2) return;

  // Keep the first visible title; remove overlapping duplicates
  const primary = blocks[0];
  const primaryRect = rect(primary);
  if (!primaryRect) return;

  blocks.slice(1).forEach((candidate) => {
    if (overlap(primaryRect, rect(candidate))) {
      hideDuplicate(candidate);
    }
  });
}

function cleanViewHeadings(view) {
  const headings = [...view.querySelectorAll("h1, h2")].filter(isVisible);
  if (headings.length < 2) return;

  const groups = new Map();
  headings.forEach((node) => {
    const text = normalize(node.textContent);
    if (!text) return;
    const group = groups.get(text) || [];
    group.push(node);
    groups.set(text, group);
  });

  groups.forEach((nodes) => {
    if (nodes.length < 2) return;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        
        // Skip interactive elements
        if (a.closest("button, a, [role='button']") || b.closest("button, a, [role='button']")) continue;
        
        // Remove overlapping duplicate
        if (overlap(rect(a), rect(b))) hideDuplicate(b);
      }
    }
  });
}

function sync() {
  frame = 0;
  const now = Date.now();
  
  // Prevent excessive cleanup cycles
  if (now - lastCleanupTime < 80) return;
  lastCleanupTime = now;

  const shell = document.querySelector(".sn-shell");
  if (!shell) return;

  shell.dataset.studioTitleOverlapGuard = RELEASE;
  
  // Main title block cleanup
  cleanTitleBlocks();
  
  // Per-view heading cleanup
  const views = shell.querySelectorAll(":scope > .sn-main .sn-view-pad");
  views.forEach(cleanViewHeadings);
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(schedule, delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  const start = () => {
    const observer = new MutationObserver(() => {
      schedule();
      // Re-sync after brief delay to catch render completions
      window.setTimeout(() => schedule(40), 0);
    });
    
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden", "data-"],
    });

    // Initial and periodic cleanups
    schedule();
    window.addEventListener("resize", () => schedule(60), { passive: true });
    window.addEventListener("orientationchange", () => schedule(80), { passive: true });
    window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(40));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

export { RELEASE, sync };
