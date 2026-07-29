import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, LoaderCircle, Mail, RefreshCw, ShieldCheck,
  UserPlus, Users, XCircle,
} from "lucide-react";
import { api, health, ROLE_LABEL, supabase } from "./studio-operations-v41-shared.js";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "—";
  }
}

function number(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

export default function MembersPanelV125({ site, setToast }) {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [quota, setQuota] = useState({ active_count: 0, pending_count: 0, allowed_limit: 100, remaining: 100, can_invite: false });
  const [inviteReady, setInviteReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ email: "", role: "viewer" });

  const ownerCount = useMemo(() => members.filter((item) => item.role === "owner").length, [members]);

  const load = async () => {
    if (!site?.id) {
      setMembers([]);
      setInvitations([]);
      setError("Pilih situs aktif melalui Workspace untuk melihat Anggota.");
      setLoading(false);
      return;
    }
    if (!supabase) {
      setError("Koneksi Anggota belum tersedia pada perangkat ini.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [memberResult, inviteResult, quotaResult, healthResult] = await Promise.all([
        supabase.from("site_members").select("user_id,role,joined_at").eq("site_id", site.id).order("joined_at"),
        supabase.from("site_invitations").select("id,email,role,expires_at,created_at").eq("site_id", site.id).is("accepted_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
        supabase.rpc("get_site_member_quota", { target_site: site.id }),
        health(true),
      ]);

      if (memberResult.error) throw memberResult.error;
      if (inviteResult.error && inviteResult.error.code !== "42501") throw inviteResult.error;
      if (quotaResult.error) throw quotaResult.error;

      const baseMembers = memberResult.data || [];
      const ids = baseMembers.map((member) => member.user_id).filter(Boolean);
      let profileMap = new Map();
      if (ids.length) {
        const profiles = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", ids);
        if (profiles.error && profiles.error.code !== "42501") throw profiles.error;
        profileMap = new Map((profiles.data || []).map((profile) => [profile.id, profile]));
      }

      setMembers(baseMembers.map((member) => ({ ...member, profile: profileMap.get(member.user_id) || null })));
      setInvitations(inviteResult.data || []);
      const rawQuota = Array.isArray(quotaResult.data) ? quotaResult.data[0] : quotaResult.data;
      setQuota({
        active_count: baseMembers.length,
        pending_count: (inviteResult.data || []).length,
        allowed_limit: 100,
        remaining: Math.max(100 - baseMembers.length - (inviteResult.data || []).length, 0),
        can_invite: false,
        ...(rawQuota || {}),
      });
      setInviteReady(healthResult?.memberInvites === true);
    } catch (nextError) {
      console.error("Members panel failed", nextError);
      setError(nextError.message || "Anggota belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [site?.id]);

  const sendInvitation = async (event) => {
    event.preventDefault();
    const email = draft.email.trim().toLowerCase();
    if (!site?.id || !email || busy) return;
    setBusy("invite");
    setError("");
    try {
      await api("/api/member-invitations/create", { siteId: site.id, email, role: draft.role });
      setDraft({ email: "", role: "viewer" });
      setToast?.("Undangan anggota dikirim");
      await load();
    } catch (nextError) {
      setError(nextError.message || "Undangan belum dapat dikirim.");
    } finally {
      setBusy("");
    }
  };

  const cancelInvitation = async (invitation) => {
    if (busy || !window.confirm(`Batalkan undangan untuk ${invitation.email}?`)) return;
    setBusy(`cancel:${invitation.id}`);
    setError("");
    try {
      await api("/api/member-invitations/cancel", { invitationId: invitation.id });
      setToast?.("Undangan dibatalkan");
      await load();
    } catch (nextError) {
      setError(nextError.message || "Undangan belum dapat dibatalkan.");
    } finally {
      setBusy("");
    }
  };

  return <div className="sv124-page sv125-members-page">
    <header className="sv124-page-title">
      <div><small>NGEBLOGGING STUDIO</small><h1>Anggota & tim</h1><p>Peran, akses, undangan email, kuota, dan jejak kerja untuk situs aktif.</p></div>
      <button className="sv124-secondary" onClick={load} disabled={loading || Boolean(busy)}><RefreshCw className={loading ? "spin" : ""}/>{loading ? "Memuat…" : "Muat ulang"}</button>
    </header>

    <section className="sv124-site-strip"><span><Users/></span><div><small>SITUS AKTIF</small><b>{site?.name || "Situs belum dipilih"}</b><p>{site?.slug ? `${site.slug}.ngeblogging.com` : "Pilih melalui Workspace"}</p></div><i>{number(quota.remaining)} slot tersisa</i></section>

    {error ? <div className="sv124-error" role="alert"><span>{error}</span><button onClick={load}>Coba lagi</button></div> : null}

    <div className="sv125-member-metrics">
      <article><Users/><div><span>Anggota aktif</span><b>{number(quota.active_count)}</b><small>Pengguna yang sudah bergabung</small></div></article>
      <article><Mail/><div><span>Undangan menunggu</span><b>{number(quota.pending_count)}</b><small>Belum diterima atau kedaluwarsa</small></div></article>
      <article><ShieldCheck/><div><span>Batas tim per situs</span><b>{number(quota.allowed_limit)}</b><small>Kuota dihitung per situs aktif</small></div></article>
      <article><CheckCircle2/><div><span>Pemilik aktif</span><b>{number(ownerCount)}</b><small>Akun dengan peran pemilik</small></div></article>
    </div>

    {inviteReady && quota.can_invite ? <form className="sv124-card sv125-invite-form" onSubmit={sendInvitation}>
      <header><span><UserPlus/></span><div><small>UNDANG ANGGOTA</small><h2>Tambahkan orang ke situs aktif</h2><p>Pilih peran paling sedikit yang diperlukan. Undangan dapat dibatalkan sebelum diterima.</p></div></header>
      <label><b>Email anggota</b><input type="email" required value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="nama@contoh.com" autoComplete="email"/></label>
      <label><b>Peran</b><select value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}><option value="viewer">Pengamat</option><option value="contributor">Kontributor</option><option value="author">Penulis</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label>
      <button className="sv124-primary" disabled={busy === "invite" || !draft.email.trim()}>{busy === "invite" ? <LoaderCircle className="spin"/> : <UserPlus/>}{busy === "invite" ? "Mengirim…" : "Kirim undangan"}</button>
    </form> : <div className="sv124-card sv125-invite-unavailable"><Mail/><div><b>Undangan email belum tersedia</b><p>Daftar anggota tetap memakai data produksi nyata. Form undangan muncul otomatis setelah layanan email produksi dinyatakan aktif.</p></div></div>}

    <div className="sv125-member-grid">
      <section className="sv124-card sv125-member-card"><header><div><small>TIM AKTIF</small><h2>{number(members.length)} anggota</h2></div><Users/></header>
        {loading ? <div className="sv124-panel-loading"><LoaderCircle className="spin"/><b>Memuat anggota…</b></div> : members.length ? <div className="sv125-member-list">{members.map((member) => {
          const name = member.profile?.display_name || "Pengguna";
          return <article key={member.user_id}><span>{name.slice(0, 2).toUpperCase()}</span><div><b>{name}</b><small>Bergabung {formatDate(member.joined_at)}</small></div><i>{ROLE_LABEL[member.role] || member.role}</i></article>;
        })}</div> : <div className="sv124-unified-empty compact"><Users/><h3>Belum ada anggota tambahan</h3><p>Pemilik situs tetap aktif. Anggota baru akan muncul setelah undangan diterima.</p></div>}
      </section>

      <section className="sv124-card sv125-member-card"><header><div><small>UNDANGAN AKTIF</small><h2>{number(invitations.length)} menunggu</h2></div><Mail/></header>
        {invitations.length ? <div className="sv125-invitation-list">{invitations.map((invitation) => <article key={invitation.id}><div><b>{invitation.email}</b><small>{ROLE_LABEL[invitation.role] || invitation.role} · berakhir {formatDate(invitation.expires_at)}</small></div>{inviteReady ? <button onClick={() => cancelInvitation(invitation)} disabled={Boolean(busy)}>{busy === `cancel:${invitation.id}` ? <LoaderCircle className="spin"/> : <XCircle/>}Batalkan</button> : null}</article>)}</div> : <div className="sv124-unified-empty compact"><Mail/><h3>Tidak ada undangan menunggu</h3><p>Undangan aktif akan terlihat di sini.</p></div>}
      </section>
    </div>
  </div>;
}
