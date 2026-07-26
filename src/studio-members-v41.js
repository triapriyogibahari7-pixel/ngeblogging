import { api, escapeHtml, formatDate, formatNumber, health, resolveSiteId, ROLE_LABEL, supabase } from "./studio-operations-v41-shared.js";

async function membersData(siteId) {
  if (!supabase) throw new Error("Koneksi Supabase belum tersedia.");
  const [memberResult, inviteResult, quotaResult] = await Promise.all([
    supabase.from("site_members").select("user_id,role,joined_at").eq("site_id", siteId).order("joined_at"),
    supabase.from("site_invitations").select("id,email,role,expires_at,created_at").eq("site_id", siteId).is("accepted_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending:false }),
    supabase.rpc("get_site_member_quota", { target_site:siteId }),
  ]);
  if (memberResult.error) throw memberResult.error;
  if (inviteResult.error && inviteResult.error.code !== "42501") throw inviteResult.error;
  if (quotaResult.error) throw quotaResult.error;
  const members = memberResult.data || [];
  const ids = members.map((member) => member.user_id);
  const profiles = ids.length ? await supabase.from("profiles").select("id,display_name,avatar_url").in("id", ids) : { data:[], error:null };
  if (profiles.error && profiles.error.code !== "42501") throw profiles.error;
  const profileMap = new Map((profiles.data || []).map((profile) => [profile.id, profile]));
  return {
    members:members.map((member) => ({ ...member, profile:profileMap.get(member.user_id) })),
    invitations:inviteResult.data || [],
    quota:Array.isArray(quotaResult.data) ? quotaResult.data[0] : quotaResult.data,
  };
}

function markup(data, inviteReady) {
  const quota = data.quota || { active_count:data.members.length, pending_count:data.invitations.length, allowed_limit:100, remaining:Math.max(100-data.members.length-data.invitations.length, 0), can_invite:false };
  const members = data.members.map((member) => {
    const name = member.profile?.display_name || "Pengguna";
    return `<article><span>${escapeHtml(name.slice(0, 2).toUpperCase())}</span><div><b>${escapeHtml(name)}</b><small>Bergabung ${formatDate(member.joined_at)}</small></div><i class="op41-role">${escapeHtml(ROLE_LABEL[member.role] || member.role)}</i></article>`;
  }).join("") || "<p>Belum ada anggota yang dapat ditampilkan.</p>";
  const invitations = data.invitations.map((invite) => `<article data-invitation-id="${escapeHtml(invite.id)}"><div><b>${escapeHtml(invite.email)}</b><small>${escapeHtml(ROLE_LABEL[invite.role] || invite.role)} · berakhir ${formatDate(invite.expires_at)}</small></div>${inviteReady ? "<button type=\"button\" class=\"op41-button\" data-cancel-invite>Batalkan</button>" : ""}</article>`).join("") || "<p>Tidak ada undangan yang menunggu.</p>";
  return `<section class="op41-panel">
    <div class="op41-metrics"><article><small>Anggota aktif</small><b>${formatNumber(quota.active_count)}</b><span>Pengguna yang sudah bergabung</span></article><article><small>Undangan menunggu</small><b>${formatNumber(quota.pending_count)}</b><span>Belum diterima atau kedaluwarsa</span></article><article><small>Batas tim per situs</small><b>${formatNumber(quota.allowed_limit)}</b><span>Kuota dihitung per situs aktif</span></article><article><small>Slot tersisa</small><b>${formatNumber(quota.remaining)}</b><span>Anggota dan undangan aktif</span></article></div>
    ${inviteReady && quota.can_invite ? `<form class="op41-form op41-invite-form"><label>Email anggota<input name="email" type="email" required autocomplete="email" placeholder="nama@contoh.com"></label><label>Peran<select name="role"><option value="viewer">Pengamat</option><option value="contributor">Kontributor</option><option value="author">Penulis</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label><button type="submit">Kirim undangan</button></form>` : ""}
    ${inviteReady ? "" : "<div class=\"op41-state\"><b>Undangan email belum ditampilkan</b><span>Form hanya muncul setelah layanan pengiriman email produksi dinyatakan aktif. Daftar anggota tetap memakai data nyata.</span></div>"}
    <div class="op41-member-grid"><section class="op41-card"><header><div><small class="op41-kicker">TIM AKTIF</small><h2>${formatNumber(data.members.length)} anggota</h2></div></header><div class="op41-list">${members}</div></section><section class="op41-card"><header><div><small class="op41-kicker">UNDANGAN AKTIF</small><h2>${formatNumber(data.invitations.length)} menunggu</h2></div></header><div class="op41-list">${invitations}</div></section></div>
  </section>`;
}

function hostFor(view) {
  let host = view.querySelector(":scope > .op41-host[data-surface='members'], :scope > .sp37-members-host, :scope > .sn-members");
  if (!host) { host = document.createElement("div"); view.append(host); }
  host.className = "op41-host";
  host.dataset.surface = "members";
  return host;
}

function reloadAfterMutation(view) {
  delete view.dataset.op41MembersSite;
  window.setTimeout(() => loadMembers(view), 0);
}

export async function loadMembers(view) {
  if (!view || view.dataset.op41MembersBusy === "true") return;
  view.dataset.sp37Members = "true";
  view.dataset.op41MembersBusy = "true";
  const host = hostFor(view);
  host.innerHTML = "<div class=\"op41-state\"><b>Memuat anggota situs aktif…</b></div>";
  try {
    const siteId = await resolveSiteId();
    if (!siteId) throw new Error("Situs aktif belum dipilih. Gunakan tombol Beralih situs terlebih dahulu.");
    const [data, state] = await Promise.all([membersData(siteId), health()]);
    const inviteReady = state.memberInvites === true;
    host.innerHTML = markup(data, inviteReady);
    const form = host.querySelector(".op41-invite-form");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Mengirim…";
      try {
        const values = new FormData(form);
        await api("/api/member-invitations/create", { siteId, email:values.get("email"), role:values.get("role") });
        form.reset();
        reloadAfterMutation(view);
      } catch (error) {
        button.disabled = false;
        button.textContent = "Kirim undangan";
        window.alert(error.message);
      }
    });
    host.querySelectorAll("[data-cancel-invite]").forEach((button) => button.addEventListener("click", async () => {
      if (!window.confirm("Batalkan undangan email ini?")) return;
      button.disabled = true;
      try {
        await api("/api/member-invitations/cancel", { invitationId:button.closest("[data-invitation-id]")?.dataset.invitationId });
        reloadAfterMutation(view);
      } catch (error) {
        button.disabled = false;
        window.alert(error.message);
      }
    }));
    view.dataset.op41MembersSite = siteId;
  } catch (error) {
    host.innerHTML = `<div class="op41-state error"><b>Anggota belum dapat dimuat</b><p>${escapeHtml(error.message || "Terjadi gangguan sementara.")}</p><button type="button" class="op41-button primary">Coba lagi</button></div>`;
    host.querySelector("button")?.addEventListener("click", () => loadMembers(view));
  } finally {
    delete view.dataset.op41MembersBusy;
  }
}
