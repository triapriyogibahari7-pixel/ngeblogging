import "./studio-production-v204.css";

const RELEASE = "studio-production-v204-20260802";
let frame = 0;
let lastOnlineRetry = 0;

function mobileLike() {
  const root = document.documentElement;
  if (root.dataset.studioMobileV203 === "true") return true;
  if (root.dataset.studioPhysicalMobileV193 === "true") return true;
  if (root.dataset.studioPhysicalMobileV191 === "true") return true;
  if (root.dataset.studioHandheld === "true") return true;
  if (root.dataset.studioDesktopSitePhone === "true") return true;
  if (navigator.userAgentData?.mobile === true) return true;
  if (/Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")) return true;
  try {
    const sizes = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(Number).filter((value) => Number.isFinite(value) && value > 0);
    if (sizes.length && Math.min(...sizes) <= 760) return true;
  } catch {
    // Browser may restrict screen metrics.
  }
  return window.innerWidth <= 760;
}

function normalizeTopbar() {
  const top = document.querySelector(".sn-shell > .sn-main > .sn-top");
  if (!top) return;
  const toggle = top.querySelector(".sn-sidebar-toggle");
  const workspace = top.querySelector(".sn-workspace");
  const actions = top.querySelector(".sn-top-actions");
  const avatar = actions?.querySelector(".sn-avatar");

  top.removeAttribute("inert");
  top.removeAttribute("aria-hidden");
  for (const node of [toggle, workspace, actions, avatar]) {
    if (!node) continue;
    node.hidden = false;
    node.removeAttribute("hidden");
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    node.style.removeProperty("display");
    node.style.removeProperty("visibility");
    node.style.removeProperty("opacity");
    node.style.removeProperty("filter");
    node.style.removeProperty("transform");
  }

  if (avatar) {
    avatar.disabled = false;
    avatar.setAttribute("aria-haspopup", "menu");
    if (!avatar.hasAttribute("aria-expanded")) avatar.setAttribute("aria-expanded", "false");
    avatar.setAttribute("title", "Profil, pengaturan, dan keluar");
  }

  top.dataset.v204Topbar = "profile-visible";
}

function normalizeProfileMenu() {
  const menu = document.querySelector(".sn-profile-menu-v147,.sn-profile-menu-v150");
  if (!menu) return;
  menu.hidden = false;
  menu.removeAttribute("hidden");
  menu.removeAttribute("inert");
  menu.removeAttribute("aria-hidden");
  menu.style.removeProperty("display");
  menu.style.removeProperty("visibility");
  menu.style.removeProperty("opacity");
  menu.style.removeProperty("filter");
  menu.dataset.v204ProfileMenu = "bounded";

  const allowed = new Set(["profile", "settings", "logout"]);
  menu.querySelectorAll("button[data-action]").forEach((button) => {
    if (!allowed.has(button.dataset.action)) return;
    button.hidden = false;
    button.disabled = false;
    button.removeAttribute("hidden");
    button.removeAttribute("inert");
    button.removeAttribute("aria-hidden");
  });
}

function verifiedUserKnown() {
  return Boolean(
    window.__ngebloggingVerifiedSession?.user?.id
    || window.__ngebloggingVerifiedSession?.session?.user?.id
  );
}

function normalizeStartupState() {
  const startup = document.querySelector(".so75-startup");
  if (!startup) return;
  const userKnown = verifiedUserKnown();
  startup.dataset.sessionContinuityV204 = userKnown ? "retained" : "checking";
  if (!userKnown) return;

  const heading = startup.querySelector("section > h1");
  const kicker = startup.querySelector("section > small");
  const retry = startup.querySelector("section > button");
  if (retry && heading?.textContent?.includes("Koneksi data belum selesai")) {
    heading.textContent = "Sinkronisasi data belum selesai.";
    if (kicker) kicker.textContent = "LOGIN AKTIF · MENYAMBUNGKAN DATA STUDIO";
    retry.dataset.v204Retry = "session-retained";
  }

  let note = startup.querySelector(".v204-session-retained-note");
  if (retry && !note) {
    note = document.createElement("p");
    note.className = "v204-session-retained-note";
    note.textContent = "Sesi login masih aktif. Gangguan ini berada pada sinkronisasi data ruang kerja; akun tidak dikeluarkan otomatis.";
    retry.insertAdjacentElement("beforebegin", note);
  }
}

function retryStartupWhenOnline() {
  if (!verifiedUserKnown()) return;
  const now = Date.now();
  if (now - lastOnlineRetry < 5_000) return;
  const retry = document.querySelector('.so75-startup section > button[data-v204-retry="session-retained"]');
  if (!retry || retry.disabled) return;
  lastOnlineRetry = now;
  retry.click();
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV204 = RELEASE;
  root.dataset.studioMobileV204 = String(mobileLike());
  normalizeTopbar();
  normalizeProfileMenu();
  normalizeStartupState();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class",
    "data-studio-mobile-v203",
    "data-studio-physical-mobile-v193",
    "data-studio-physical-mobile-v191",
    "data-studio-handheld",
    "data-studio-desktop-site-phone",
  ],
});

for (const name of ["pageshow", "resize", "orientationchange"]) {
  window.addEventListener(name, schedule, { passive: true });
}
window.addEventListener("online", () => { schedule(); requestAnimationFrame(retryStartupWhenOnline); }, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();

export {
  RELEASE,
  mobileLike,
  normalizeTopbar,
  normalizeProfileMenu,
  normalizeStartupState,
  retryStartupWhenOnline,
  sync,
};
