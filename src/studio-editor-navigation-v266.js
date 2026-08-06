import { currentStudioDeviceMode } from "./studio-device-mode-v140.js";

export const RELEASE = "studio-editor-navigation-v266-20260804";
export const STUDIO_EDITOR_NAVIGATION_CLEAN_CLONE_V317 = "studio-editor-navigation-clean-clone-v317-20260806";

const STORAGE_KEY = "ngeblogging-editor-sidebar-expanded-v266";
const VIEW_LABELS = new Map([
  ["ringkasan", "Ringkasan"],
  ["posts", "Posts"],
  ["pages", "Pages"],
  ["tema", "Tema"],
  ["media", "Media"],
  ["analitik", "Analitik"],
  ["anggota", "Anggota"],
  ["komentar", "Komentar"],
  ["domain", "Domain"],
  ["api keys", "API Keys"],
]);

let cachedSidebar = "";
let frame = 0;
let expanded = readExpanded();

function readExpanded() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

function writeExpanded() {
  try { localStorage.setItem(STORAGE_KEY, String(expanded)); }
  catch { /* Browser storage must not block editor navigation. */ }
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function stripRuntimeGeometry(node) {
  if (!node) return;
  const all = [node, ...node.querySelectorAll("*")];
  for (const child of all) {
    child.removeAttribute("style");
    child.removeAttribute("hidden");
    child.removeAttribute("inert");
    child.removeAttribute("aria-hidden");
    delete child.dataset?.v301GeometryOwner;
  }
  node.classList.remove("collapsed", "mobile-open");
}

function cacheStudioSidebar() {
  const side = document.querySelector(".sn-shell #ngeblogging-studio-sidebar");
  if (!side) return;
  const clone = side.cloneNode(true);

  // v301 owns the live Studio geometry with inline !important declarations.
  // Copying those inline styles into the editor duplicate made the cloned nav
  // inherit the live shell's flex sizing, which is why + Buat Post could sit at
  // the top while Ringkasan…API Keys were pushed far down. The editor keeps the
  // exact icons/labels/actions, but its geometry is owned only by v266/v317 CSS.
  stripRuntimeGeometry(clone);
  clone.querySelectorAll(".sn-side-close").forEach((node) => node.remove());
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  cachedSidebar = clone.innerHTML;
}

function fallbackSidebar() {
  return `
    <div class="sn-logo"><span class="sn-logo-mark"><strong>n</strong></span><b>Ngeblogging</b></div>
    <button class="sn-new"><span>Buat Post</span></button>
    <nav>
      ${["Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys"].map((label) => `<button><span>${label}</span></button>`).join("")}
    </nav>
    <div class="sn-account-footer"><button><span>Pengaturan</span></button><button><span>Keluar</span></button></div>`;
}

function waitForStudio(callback, started = performance.now()) {
  const shell = document.querySelector(".sn-shell");
  if (shell) {
    callback(shell);
    return;
  }
  if (performance.now() - started > 3_000) return;
  requestAnimationFrame(() => waitForStudio(callback, started));
}

function leaveEditor(callback) {
  const back = document.querySelector(".ce-app .ce-back");
  if (!back) return;
  back.click();
  waitForStudio(callback);
}

function activateStudioLabel(label) {
  const wanted = VIEW_LABELS.get(normalize(label));
  if (!wanted) return;
  leaveEditor(() => {
    const button = [...document.querySelectorAll("#ngeblogging-studio-sidebar nav button")]
      .find((node) => normalize(node.textContent) === normalize(wanted));
    button?.click();
  });
}

function handleEditorNavigation(label) {
  const key = normalize(label);
  if (key === "buat post") {
    leaveEditor(() => document.querySelector("#ngeblogging-studio-sidebar .sn-new")?.click());
    return;
  }
  if (key === "pengaturan") {
    leaveEditor(() => {
      const settings = document.querySelector("#ngeblogging-studio-sidebar .sn-account-settings-v135")
        || [...document.querySelectorAll("#ngeblogging-studio-sidebar .sn-account-footer button")].find((node) => /pengaturan/i.test(node.textContent || ""));
      settings?.click();
    });
    return;
  }
  if (key === "keluar") {
    leaveEditor(() => {
      const logout = document.querySelector("#ngeblogging-studio-sidebar .sn-account-logout-v135")
        || [...document.querySelectorAll("#ngeblogging-studio-sidebar .sn-account-footer button")].find((node) => /keluar/i.test(node.textContent || ""));
      logout?.click();
    });
    return;
  }
  activateStudioLabel(label);
}

function setOpen(value) {
  const host = document.getElementById("ngeblogging-editor-nav-v266");
  if (!host) return;
  const small = currentStudioDeviceMode() === "small";
  if (small) {
    host.classList.toggle("mobile-open", Boolean(value));
  } else {
    expanded = Boolean(value);
    writeExpanded();
    host.classList.toggle("expanded", expanded);
    host.classList.toggle("collapsed", !expanded);
  }
  syncAria(host);
}

function syncAria(host) {
  const small = currentStudioDeviceMode() === "small";
  const opened = small ? host.classList.contains("mobile-open") : host.classList.contains("expanded");
  const label = small ? (opened ? "Tutup menu Studio" : "Buka menu Studio") : (opened ? "Ciutkan menu Studio" : "Perluas menu Studio");
  host.querySelectorAll(".ce-editor-sidebar-toggle-v266,.sn-logo-mark").forEach((button) => {
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.setAttribute("aria-expanded", String(opened));
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
}

function buildEditorNavigation() {
  const host = document.createElement("div");
  host.id = "ngeblogging-editor-nav-v266";
  host.dataset.release = RELEASE;
  host.dataset.cleanCloneRelease = STUDIO_EDITOR_NAVIGATION_CLEAN_CLONE_V317;
  host.innerHTML = `
    <button type="button" class="ce-editor-sidebar-toggle-v266" aria-label="Buka menu Studio"><strong>n</strong></button>
    <button type="button" class="ce-editor-sidebar-backdrop-v266" aria-label="Tutup menu Studio"></button>
    <aside class="ce-editor-side-v266 sn-side">${cachedSidebar || fallbackSidebar()}</aside>`;
  document.body.append(host);

  const side = host.querySelector(".ce-editor-side-v266");
  stripRuntimeGeometry(side);
  side?.querySelectorAll("button").forEach((button) => {
    button.removeAttribute("disabled");
    button.removeAttribute("hidden");
    button.removeAttribute("inert");
  });
  side?.querySelectorAll(".sn-side-close").forEach((node) => node.remove());

  host.addEventListener("click", (event) => {
    if (event.target.closest(".ce-editor-sidebar-backdrop-v266")) {
      setOpen(false);
      return;
    }
    if (event.target.closest(".ce-editor-sidebar-toggle-v266,.sn-logo-mark")) {
      const small = currentStudioDeviceMode() === "small";
      setOpen(small ? !host.classList.contains("mobile-open") : !host.classList.contains("expanded"));
      return;
    }
    const button = event.target.closest(".ce-editor-side-v266 .sn-new,.ce-editor-side-v266 nav button,.ce-editor-side-v266 .sn-account-footer button");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (currentStudioDeviceMode() === "small") setOpen(false);
    handleEditorNavigation(button.textContent || "");
  });

  host.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    const target = event.target.closest?.(".ce-editor-sidebar-toggle-v266,.sn-logo-mark");
    if (!target || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    const small = currentStudioDeviceMode() === "small";
    setOpen(small ? !host.classList.contains("mobile-open") : !host.classList.contains("expanded"));
  });

  return host;
}

function syncEditorNavigation() {
  cacheStudioSidebar();
  const editor = document.querySelector(".ce-app");
  let host = document.getElementById("ngeblogging-editor-nav-v266");
  if (!editor) {
    host?.remove();
    document.documentElement.classList.remove("editor-v266-large", "editor-v266-small", "editor-v266-expanded", "editor-v266-collapsed");
    return;
  }

  if (!host) host = buildEditorNavigation();
  const small = currentStudioDeviceMode() === "small";
  document.documentElement.classList.toggle("editor-v266-small", small);
  document.documentElement.classList.toggle("editor-v266-large", !small);

  if (small) {
    host.classList.remove("expanded", "collapsed");
    document.documentElement.classList.remove("editor-v266-expanded", "editor-v266-collapsed");
  } else {
    host.classList.remove("mobile-open");
    host.classList.toggle("expanded", expanded);
    host.classList.toggle("collapsed", !expanded);
    document.documentElement.classList.toggle("editor-v266-expanded", expanded);
    document.documentElement.classList.toggle("editor-v266-collapsed", !expanded);
  }
  syncAria(host);
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioEditorNavigationV266 = RELEASE;
  document.documentElement.dataset.studioEditorNavigationCleanCloneV317 = STUDIO_EDITOR_NAVIGATION_CLEAN_CLONE_V317;
  syncEditorNavigation();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  new MutationObserver((records) => {
    if (records.some((record) => record.addedNodes.length || record.removedNodes.length || record.attributeName === "class")) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

  for (const eventName of ["pageshow", "resize", "orientationchange"]) window.addEventListener(eventName, schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  schedule();
}
