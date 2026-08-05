import "./studio-members-controls-v307.css";

export const STUDIO_MEMBERS_CONTROLS_RELEASE_V307 = "studio-members-visible-controls-v307-20260805";

let frame = 0;
let timer = 0;

function membersPageTitle() {
  return [...document.querySelectorAll(".sn-page-title")].find((header) => {
    const title = header.querySelector("h1")?.textContent?.trim().toLowerCase() || "";
    return title === "anggota" || title.startsWith("anggota ") || title.startsWith("anggota &") || title.startsWith("anggota dan");
  }) || null;
}

function enhanceManager(mode = "manage") {
  const manager = document.querySelector(".sn-members-v304");
  if (!manager) return;
  manager.dataset.membersControlsV307 = STUDIO_MEMBERS_CONTROLS_RELEASE_V307;

  const submit = manager.querySelector(".sn-members-v304-invite button[type='submit']");
  if (submit && !submit.disabled) submit.textContent = "Tambah anggota";

  manager.querySelectorAll(".sn-members-v304-row .member-actions button.danger").forEach((button) => {
    button.textContent = "Hapus anggota";
    button.setAttribute("aria-label", button.getAttribute("aria-label") || "Hapus anggota dari situs");
  });

  if (mode === "add") {
    manager.querySelector("input[name='email']")?.focus({ preventScroll: true });
    return;
  }

  const firstDelete = manager.querySelector(".sn-members-v304-row .member-actions button.danger");
  const firstRole = manager.querySelector(".sn-members-v304-row .member-actions select");
  const target = firstDelete || firstRole || manager.querySelector("[data-members-v304-list]");
  target?.scrollIntoView?.({ block: "nearest" });
  firstDelete?.focus?.({ preventScroll: true });
}

function scheduleEnhance(mode = "manage") {
  requestAnimationFrame(() => enhanceManager(mode));
  window.setTimeout(() => enhanceManager(mode), 70);
}

function openMembers(mode) {
  const open = window.__ngebloggingOpenMembersV304;
  if (typeof open !== "function") return;
  open();
  scheduleEnhance(mode);
}

function makeButton(label, className, mode) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", () => openMembers(mode));
  return button;
}

function syncPageControls() {
  frame = 0;
  const title = membersPageTitle();
  if (!title) return;

  title.dataset.membersControlsV307 = STUDIO_MEMBERS_CONTROLS_RELEASE_V307;
  const legacy = title.querySelector(".sn-member-invite-v304");
  if (legacy) legacy.hidden = true;

  let controls = title.querySelector(".sn-members-controls-v307");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "sn-members-controls-v307";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Tindakan anggota situs");
    controls.append(
      makeButton("+ Tambah anggota", "sn-members-add-v307", "add"),
      makeButton("Hapus anggota", "sn-members-remove-v307", "manage"),
    );
    title.append(controls);
  }

  controls.hidden = false;
  document.documentElement.dataset.studioMembersControlsV307 = STUDIO_MEMBERS_CONTROLS_RELEASE_V307;
}

function scheduleSync() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncPageControls);
  if (timer) clearTimeout(timer);
  timer = window.setTimeout(syncPageControls, 90);
}

function onClick(event) {
  if (event.target?.closest?.(".sn-members-v304")) scheduleEnhance("manage");
  scheduleSync();
}

function onKeydown(event) {
  if (event.key === "Escape") scheduleSync();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.documentElement.dataset.studioMembersControlsV307 = STUDIO_MEMBERS_CONTROLS_RELEASE_V307;
  document.addEventListener("click", onClick, false);
  document.addEventListener("keydown", onKeydown, false);
  window.addEventListener("pageshow", scheduleSync, { passive: true });
  window.addEventListener("ngeblogging:active-site-change", scheduleSync);
  window.addEventListener("ngeblogging:auth-session-ready", scheduleSync);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleSync, { once: true });
  else scheduleSync();
}
