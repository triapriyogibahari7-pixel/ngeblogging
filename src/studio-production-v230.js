import "./studio-production-v230.css";
import { supabase } from "./lib/supabase.js";
import { listUserSites } from "./lib/studio-data.js";

const RELEASE = "studio-production-v230-preview-bootstrap-live-gate-20260803";
const DEVICE_WIDTHS = Object.freeze({
  application: 360,
  phone: 390,
  mobile: 430,
  compact: 600,
  tablet: 820,
  laptop: 1180,
  desktop: 1440,
  computer: 1680,
});
const STARTUP_RETRY_LIMIT = 3;
let frame = 0;
let startupProbe = null;
let startupRetryTimer = 0;
let startupAttempts = 0;
let lastStartupRetryAt = 0;

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function setVar(node, property, value) {
  if (!node || node.style.getPropertyValue(property) === value) return;
  node.style.setProperty(property, value);
}

function withDeadline(promise, milliseconds, label) {
  let timer = 0;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(Object.assign(new Error(label), { code: "V230_DEADLINE" })), milliseconds);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

function previewTargetWidth(shell) {
  const inline = parseFloat(shell.style.getPropertyValue("--tn-preview-width"));
  if (Number.isFinite(inline) && inline > 0) return inline;
  const device = shell.dataset.previewDevice || shell.dataset.previewMode || "desktop";
  return DEVICE_WIDTHS[device] || 1440;
}

function normalizeThemePreview(shell) {
  const iframe = shell.querySelector(":scope>iframe");
  if (!iframe) return;
  const targetWidth = previewTargetWidth(shell);
  const availableWidth = Math.max(150, shell.clientWidth - 20);
  const availableHeight = Math.max(260, shell.clientHeight - 20);
  const scale = Math.max(0.12, Math.min(1, availableWidth / targetWidth));
  const targetHeight = Math.max(640, Math.ceil(availableHeight / scale));

  shell.dataset.v230PreviewScale = scale < 0.999 ? "scaled" : "native";
  shell.dataset.v230PreviewDevice = shell.dataset.previewDevice || "unknown";
  setVar(shell, "--v230-preview-scale", String(scale));
  setVar(shell, "--v230-preview-target-width", `${targetWidth}px`);
  setVar(shell, "--v230-preview-target-height", `${targetHeight}px`);

  important(shell, "position", "relative");
  important(shell, "min-width", "0");
  important(shell, "max-width", "100%");
  important(shell, "overflow", "hidden");

  important(iframe, "position", "absolute");
  important(iframe, "left", "50%");
  important(iframe, "top", "10px");
  important(iframe, "width", `${targetWidth}px`);
  important(iframe, "max-width", "none");
  important(iframe, "height", `${targetHeight}px`);
  important(iframe, "min-height", "0");
  important(iframe, "margin", "0");
  important(iframe, "transform", `translateX(-50%) scale(${scale})`);
  important(iframe, "transform-origin", "top center");
}

function normalizeThemePreviews() {
  document.querySelectorAll(".tn-frame-shell[data-preview-device],.tn-frame-shell[data-preview-mode]").forEach(normalizeThemePreview);
  document.querySelectorAll(".tn-active-stage,.tn-code-preview-pane,.tn-customizer").forEach((node) => {
    node.dataset.v230PreviewHost = "bounded-centered";
  });
}

function startupErrorSurface() {
  const root = document.querySelector(".so75-startup");
  const retry = root?.querySelector(".so75-primary");
  if (!root || !retry) return null;
  const text = String(root.textContent || "").toLowerCase();
  if (!/koneksi data|workspace belum dapat|studio belum dapat/.test(text)) return null;
  return { root, retry };
}

async function probeHealthyStudioData() {
  if (!supabase || !navigator.onLine) return false;
  const sessionResult = await withDeadline(supabase.auth.getSession(), 7_000, "Pemeriksaan sesi lokal v230 melewati batas waktu.");
  const session = sessionResult?.data?.session || null;
  const userId = session?.user?.id || "";
  if (!userId || !session?.access_token) return false;
  await withDeadline(listUserSites(userId), 9_000, "Pemeriksaan daftar situs v230 melewati batas waktu.");
  document.documentElement.dataset.v230DataHealth = "authenticated-and-readable";
  return true;
}

async function recoverFalseStartupError() {
  const surface = startupErrorSurface();
  if (!surface || startupAttempts >= STARTUP_RETRY_LIMIT || !navigator.onLine) return;
  const now = Date.now();
  if (now - lastStartupRetryAt < 4_000) return;
  if (startupProbe) return startupProbe;

  startupProbe = (async () => {
    try {
      document.documentElement.dataset.v230StartupRecovery = "probing";
      const healthy = await probeHealthyStudioData();
      if (!healthy || !document.contains(surface.retry)) return;
      startupAttempts += 1;
      lastStartupRetryAt = Date.now();
      document.documentElement.dataset.v230StartupRecovery = `healthy-retry-${startupAttempts}`;
      surface.retry.click();
    } catch (error) {
      document.documentElement.dataset.v230StartupRecovery = "backend-not-confirmed";
      console.warn("v230 tidak memaksa retry karena kesehatan data belum dapat dibuktikan; sesi lokal dipertahankan.", error);
    } finally {
      startupProbe = null;
    }
  })();
  return startupProbe;
}

function scheduleStartupRecovery() {
  if (startupRetryTimer || startupProbe || startupAttempts >= STARTUP_RETRY_LIMIT) return;
  startupRetryTimer = window.setTimeout(() => {
    startupRetryTimer = 0;
    recoverFalseStartupError();
  }, 450);
}

function normalizeStartupCopy() {
  const surface = startupErrorSurface();
  if (!surface) return;
  surface.root.dataset.v230Startup = "bounded-recoverable";
  const paragraph = surface.root.querySelector("section>p");
  const healthyCopy = "Sesi dan jalur data sudah merespons. Studio sedang menyinkronkan ulang Workspace tanpa mengeluarkan akun Anda.";
  if (paragraph && document.documentElement.dataset.v230DataHealth === "authenticated-and-readable" && paragraph.textContent !== healthyCopy) {
    paragraph.textContent = healthyCopy;
  }
  scheduleStartupRecovery();
}

function normalizeTopbarModeArtifacts() {
  const topbar = document.querySelector(".sn-topbar");
  if (!topbar) return;
  topbar.querySelectorAll("[data-studio-mode-badge],[data-device-mode-badge],.studio-device-mode-badge,.v225-mode-badge").forEach((node) => {
    if (!node.hidden) node.hidden = true;
    if (node.getAttribute("aria-hidden") !== "true") node.setAttribute("aria-hidden", "true");
  });
  const avatar = topbar.querySelector(".sn-avatar");
  if (avatar) {
    if (avatar.hidden) avatar.hidden = false;
    avatar.removeAttribute("aria-hidden");
    avatar.dataset.v230TopbarProfile = "visible";
  }
}

function normalizeProfileAvatarPreview() {
  const page = document.querySelector('[data-v229-account-view="profile"]');
  if (!page) return;
  const fields = [...page.querySelectorAll("label")];
  const avatarLabel = fields.find((label) => /avatar/i.test(label.textContent || ""));
  const input = avatarLabel?.querySelector("input");
  if (!avatarLabel || !input) return;
  avatarLabel.dataset.v230AvatarField = "live-preview";
  if (!avatarLabel.querySelector(".v230-avatar-preview")) {
    const preview = document.createElement("span");
    preview.className = "v230-avatar-preview";
    preview.setAttribute("aria-label", "Pratinjau avatar");
    const image = document.createElement("img");
    image.alt = "Pratinjau avatar profil";
    preview.appendChild(image);
    avatarLabel.appendChild(preview);
  }
  const image = avatarLabel.querySelector(".v230-avatar-preview img");
  if (image) {
    const value = String(input.value || "").trim();
    if (image.dataset.v230Src !== value) {
      image.dataset.v230Src = value;
      image.src = value || "/icon-192.png";
    }
  }
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionV230 = RELEASE;
  normalizeThemePreviews();
  normalizeStartupCopy();
  normalizeTopbarModeArtifacts();
  normalizeProfileAvatarPreview();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-preview-device", "data-preview-mode", "data-v229-account-view"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
window.addEventListener("online", () => {
  if (startupRetryTimer) window.clearTimeout(startupRetryTimer);
  startupRetryTimer = 0;
  window.setTimeout(recoverFalseStartupError, 250);
}, { passive: true });
schedule();

export { RELEASE };
