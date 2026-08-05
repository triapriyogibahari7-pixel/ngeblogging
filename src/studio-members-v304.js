import "./studio-members-v304.css";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

export const STUDIO_MEMBERS_RELEASE_V304 = "studio-members-real-invite-v304-20260805";
export const STUDIO_MEMBERS_ACTION_RELEASE_V306 = "studio-members-actions-v306-20260805";

const ROLES = [
  ["admin", "Admin"],
  ["editor", "Editor"],
  ["author", "Author"],
  ["viewer", "Viewer"],
];

let layer = null;
let members = [];
let quota = null;
let loadToken = 0;
let syncFrame = 0;
let syncTimer = 0;

function activeSiteId() {
  const live = window.__ngebloggingActiveSite?.id;
  if (live) return String(live);
  const dataset = document.documentElement.dataset.activeSiteId;
  if (dataset) return String(dataset);
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

function activeSiteName() {
  return window.__ngebloggingActiveSite?.name || document.querySelector(".sn-workspace b")?.textContent?.trim() || "situs aktif";
}

function htmlEscape(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character]));
}

function roleLabel(value) {
  const normalized = String(value || "viewer").toLowerCase();
  return normalized === "owner" ? "Owner" : normalized === "admin" ? "Admin" : normalized === "editor" ? "Editor" : normalized === "author" ? "Author" : "Viewer";
}

function statusLabel(value) {
  return String(value || "active").toLowerCase() === "pending" ? "Menunggu" : "Aktif";
}

function memberName(member) {
  return member?.display_name || member?.email || "Anggota";
}

function memberInitials(member) {
  return memberName(member).split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}

function setStatus(message, state = "idle") {
  const node = layer?.querySelector("[data-members-v304-status]");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

export function closeMembersManagerV304() {
  if (!layer) return;
  loadToken += 1;
  layer.remove();
  layer = null;
  members = [];
  quota = null;
  document.documentElement.classList.remove("members-v304-open");
}

async function rpc(name, args) {
  if (!supabaseConfigured || !supabase) throw new Error("Koneksi data anggota belum tersedia. Sesi akun tetap aktif.");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

function renderQuota() {
  const node = layer?.querySelector("[data-members-v304-quota]");
  if (!node) return;
  if (!quota) {
    node.textContent = "Memuat kapasitas anggota…";
    return;
  }
  const used = Number(quota.active_count || 0) + Number(quota.pending_count || 0);
  const limit = Number(quota.allowed_limit || 0);
  node.textContent = limit > 0 ? `${used} dari ${limit} slot anggota digunakan` : `${used} anggota dan undangan`;
}

function renderMembers() {
  const host = layer?.querySelector("[data-members-v304-list]");
  if (!host) return;
  host.replaceChildren();

  if (!members.length) {
    const empty = document.createElement("div");
    empty.className = "sn-members-v304-empty";
    empty.innerHTML = "<strong>Belum ada data anggota.</strong><span>Undang anggota pertama melalui formulir di atas.</span>";
    host.append(empty);
    return;
  }

  members.forEach((member) => {
    const row = document.createElement("article");
    row.className = "sn-members-v304-row";
    row.dataset.status = String(member.status || "active");

    const avatar = document.createElement("span");
    avatar.className = "member-mark";
    if (member.avatar_url) {
      const image = document.createElement("img");
      image.src = member.avatar_url;
      image.alt = "";
      avatar.append(image);
    } else avatar.textContent = memberInitials(member);

    const copy = document.createElement("div");
    copy.className = "member-copy";
    const name = document.createElement("b");
    name.textContent = memberName(member);
    const email = document.createElement("small");
    email.textContent = member.email || "Email tidak tersedia";
    const meta = document.createElement("p");
    const expires = member.status === "pending" && member.expires_at
      ? ` · berlaku sampai ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(member.expires_at))}`
      : "";
    meta.textContent = `${statusLabel(member.status)}${expires}`;
    copy.append(name, email, meta);

    const role = document.createElement("span");
    role.className = "member-role";
    role.textContent = roleLabel(member.role);

    const actions = document.createElement("div");
    actions.className = "member-actions";
    const normalizedRole = String(member.role || "viewer").toLowerCase();
    const isPending = String(member.status || "active").toLowerCase() === "pending";
    if (normalizedRole !== "owner" && !isPending && member.member_id) {
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Ubah peran ${memberName(member)}`);
      ROLES.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = value === normalizedRole;
        select.append(option);
      });
      select.addEventListener("change", async () => {
        const siteId = activeSiteId();
        if (!siteId) return setStatus("Situs aktif tidak ditemukan.", "error");
        select.disabled = true;
        try {
          await rpc("update_site_member_role_v176", { target_site: siteId, target_user: member.member_id, target_role: select.value });
          setStatus(`Peran ${memberName(member)} diperbarui.`, "success");
          await loadMembers();
        } catch (error) {
          console.error("Update member role v304 failed", error);
          setStatus(error?.message || "Peran anggota belum dapat diperbarui.", "error");
          select.value = normalizedRole;
        } finally { select.disabled = false; }
      });
      actions.append(select);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger";
      remove.dataset.memberRemoveV306 = "true";
      remove.textContent = "Hapus anggota";
      remove.setAttribute("aria-label", `Hapus anggota ${memberName(member)}`);
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Hapus ${memberName(member)} dari situs ini?`)) return;
        remove.disabled = true;
        try {
          await rpc("remove_site_member_v176", { target_site: activeSiteId(), target_user: member.member_id });
          setStatus(`${memberName(member)} dihapus dari situs.`, "success");
          await loadMembers();
        } catch (error) {
          console.error("Remove member v304 failed", error);
          setStatus(error?.message || "Anggota belum dapat dihapus.", "error");
          remove.disabled = false;
        }
      });
      actions.append(remove);
    } else if (isPending) {
      const pending = document.createElement("span");
      pending.className = "pending-note";
      pending.textContent = "Undangan menunggu";
      actions.append(pending);
    }

    row.append(avatar, copy, role, actions);
    host.append(row);
  });
}

async function loadMembers() {
  const token = ++loadToken;
  const siteId = activeSiteId();
  if (!siteId) {
    setStatus("Situs aktif belum tersedia. Pilih situs terlebih dahulu.", "error");
    return;
  }
  setStatus("Memuat anggota situs…", "loading");
  try {
    const [rows, quotaRows] = await Promise.all([
      rpc("get_site_members_v176", { target_site: siteId }),
      rpc("get_site_member_quota", { target_site: siteId }),
    ]);
    if (token !== loadToken || !layer) return;
    members = Array.isArray(rows) ? rows : [];
    quota = Array.isArray(quotaRows) ? quotaRows[0] || null : quotaRows || null;
    renderMembers();
    renderQuota();
    setStatus(`${members.length} anggota/undangan dimuat dari ${activeSiteName()}.`, "success");
  } catch (error) {
    if (token !== loadToken || !layer) return;
    console.error("Members v304 load failed", error);
    members = [];
    renderMembers();
    setStatus(error?.message || "Daftar anggota belum dapat dimuat.", "error");
  }
}

async function submitInvite(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button[type='submit']");
  const email = String(form.elements.email?.value || "").trim().toLowerCase();
  const role = String(form.elements.role?.value || "viewer");
  if (!email || !email.includes("@")) return setStatus("Masukkan alamat email anggota yang valid.", "error");
  const siteId = activeSiteId();
  if (!siteId) return setStatus("Situs aktif tidak ditemukan.", "error");
  submit.disabled = true;
  submit.textContent = "Mengundang…";
  setStatus(`Menambahkan ${email}…`, "loading");
  try {
    const result = await rpc("invite_site_member_v176", { target_site: siteId, target_email: email, target_role: role });
    form.elements.email.value = "";
    if (result?.status === "active") setStatus(`${email} sudah memiliki akun dan langsung ditambahkan sebagai ${roleLabel(role)}.`, "success");
    else setStatus(`Undangan ${email} tercatat sebagai ${roleLabel(role)} dan menunggu penerimaan.`, "success");
    await loadMembers();
  } catch (error) {
    console.error("Invite member v304 failed", error);
    setStatus(error?.message || "Anggota belum dapat diundang.", "error");
  } finally {
    submit.disabled = false;
    submit.textContent = "Tambah anggota";
  }
}

export function openMembersManagerV304() {
  closeMembersManagerV304();
  const siteId = activeSiteId();
  const wrapper = document.createElement("div");
  wrapper.className = "sn-members-v304-layer";
  wrapper.dataset.release = STUDIO_MEMBERS_ACTION_RELEASE_V306;
  wrapper.innerHTML = `
    <button class="sn-members-v304-backdrop" type="button" aria-label="Tutup pengelola anggota"></button>
    <section class="sn-members-v304" role="dialog" aria-modal="true" aria-labelledby="sn-members-v304-title">
      <header>
        <div><small>ANGGOTA SITUS</small><h2 id="sn-members-v304-title">Tambah & kelola anggota</h2><p>${htmlEscape(activeSiteName())}</p></div>
        <button type="button" data-members-v304-close aria-label="Tutup">×</button>
      </header>
      <form class="sn-members-v304-invite">
        <label><span>Email anggota</span><input name="email" type="email" autocomplete="email" placeholder="nama@email.com" required></label>
        <label><span>Peran</span><select name="role">${ROLES.map(([value,label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
        <button class="primary" type="submit">Tambah anggota</button>
      </form>
      <div class="sn-members-v304-meta"><span data-members-v304-quota>Memuat kapasitas anggota…</span><button type="button" data-members-v304-refresh>Muat ulang</button></div>
      <div class="sn-members-v304-list" data-members-v304-list aria-live="polite"></div>
      <footer><p data-members-v304-status data-state="loading">${siteId ? "Memuat anggota situs…" : "Situs aktif belum tersedia."}</p></footer>
    </section>`;
  document.body.append(wrapper);
  layer = wrapper;
  document.documentElement.classList.add("members-v304-open");
  document.documentElement.dataset.studioMembersV304 = STUDIO_MEMBERS_RELEASE_V304;
  document.documentElement.dataset.studioMembersActionsV306 = STUDIO_MEMBERS_ACTION_RELEASE_V306;
  wrapper.querySelector("form")?.addEventListener("submit", submitInvite);
  wrapper.querySelector("[data-members-v304-refresh]")?.addEventListener("click", loadMembers);
  wrapper.querySelectorAll("[data-members-v304-close],.sn-members-v304-backdrop").forEach((node) => node.addEventListener("click", closeMembersManagerV304));
  wrapper.querySelector("input[name='email']")?.focus({ preventScroll: true });
  if (siteId) loadMembers();
}

function findMembersPage() {
  return [...document.querySelectorAll(".sn-page-title")].find((header) => header.querySelector("h1")?.textContent?.trim() === "Anggota & tim") || null;
}

function syncMembersButton() {
  const pageTitle = findMembersPage();
  if (!pageTitle) return;
  let button = pageTitle.querySelector(".sn-member-invite-v304");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "sn-primary sn-member-invite-v304";
    button.textContent = "+ Tambah anggota";
    button.addEventListener("click", openMembersManagerV304);
    pageTitle.append(button);
  }
  button.hidden = false;
  button.disabled = false;
  button.dataset.membersActionRelease = STUDIO_MEMBERS_ACTION_RELEASE_V306;
  pageTitle.dataset.membersReleaseV304 = STUDIO_MEMBERS_RELEASE_V304;
  pageTitle.dataset.membersActionsV306 = STUDIO_MEMBERS_ACTION_RELEASE_V306;
}

function scheduleSync() {
  if (syncFrame) cancelAnimationFrame(syncFrame);
  syncFrame = requestAnimationFrame(() => {
    syncFrame = 0;
    syncMembersButton();
  });
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = window.setTimeout(syncMembersButton, 80);
}

function capturedMembersAction(event) {
  const explicit = event.target?.closest?.(".sn-member-invite-v304");
  if (explicit) return;
  scheduleSync();
}

function onKeydown(event) {
  if (event.key === "Escape" && layer) closeMembersManagerV304();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.__ngebloggingOpenMembersV304 = openMembersManagerV304;
  document.addEventListener("click", capturedMembersAction, false);
  document.addEventListener("keydown", onKeydown, true);
  window.addEventListener("pageshow", scheduleSync, { passive: true });
  window.addEventListener("ngeblogging:active-site-change", scheduleSync);
  document.documentElement.dataset.studioMembersV304 = STUDIO_MEMBERS_RELEASE_V304;
  document.documentElement.dataset.studioMembersActionsV306 = STUDIO_MEMBERS_ACTION_RELEASE_V306;
  scheduleSync();
}
