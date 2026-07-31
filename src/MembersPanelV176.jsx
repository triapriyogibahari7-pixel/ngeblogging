import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Check, Clock3, LoaderCircle, Mail, RefreshCw, Search,
  ShieldCheck, Trash2, UserPlus, Users, X,
} from "lucide-react";
import { supabase } from "./lib/supabase.js";
import "./members-v176.css";

const RELEASE = "studio-members-v176-20260731";
const ROLE_OPTIONS = [
  ["admin", "Admin"],
  ["editor", "Editor"],
  ["author", "Author"],
  ["viewer", "Viewer"],
];
const FILTERS = [
  ["all", "Semua"],
  ["active", "Aktif"],
  ["pending", "Menunggu"],
  ["owner", "Owner"],
  ["admin", "Admin"],
  ["editor", "Editor"],
  ["author", "Author"],
  ["viewer", "Viewer"],
];

function roleLabel(role) {
  return {
    owner: "Owner",
    admin: "Admin",
    editor: "Editor",
    author: "Author",
    viewer: "Viewer",
  }[role] || role || "Viewer";
}

function initials(name, email) {
  const source = String(name || email?.split("@")[0] || "A").trim();
  return source.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default function MembersPanelV176({ site, user, setToast }) {
  const [rows, setRows] = useState([]);
  const [quota, setQuota] = useState({ active_count: 0, pending_count: 0, allowed_limit: 20, remaining: 20, can_invite: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

  const load = async ({ quiet = false } = {}) => {
    if (!site?.id || !supabase) {
      setRows([]);
      setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [membersResult, quotaResult] = await Promise.all([
        supabase.rpc("get_site_members_v176", { target_site: site.id }),
        supabase.rpc("get_site_member_quota", { target_site: site.id }),
      ]);
      if (membersResult.error) throw membersResult.error;
      if (quotaResult.error) throw quotaResult.error;
      setRows(Array.isArray(membersResult.data) ? membersResult.data : []);
      setQuota({
        active_count: Number(quotaResult.data?.[0]?.active_count || 0),
        pending_count: Number(quotaResult.data?.[0]?.pending_count || 0),
        allowed_limit: Number(quotaResult.data?.[0]?.allowed_limit || 20),
        remaining: Number(quotaResult.data?.[0]?.remaining || 0),
        can_invite: Boolean(quotaResult.data?.[0]?.can_invite),
      });
    } catch (nextError) {
      console.error("Members v176 load failed", nextError);
      setError(nextError.message || "Daftar anggota belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRows([]);
    setQuery("");
    setFilter("all");
    setInviteOpen(false);
    load();
  }, [site?.id]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.status !== filter && row.role !== filter) return false;
      if (!needle) return true;
      return [row.display_name, row.email, row.role, row.status]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [rows, query, filter]);

  const invite = async (event) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email || busy || !site?.id) return;
    setBusy("invite");
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("invite_site_member_v176", {
        target_site: site.id,
        target_email: email,
        target_role: inviteRole,
      });
      if (rpcError) throw rpcError;
      setInviteEmail("");
      setInviteOpen(false);
      setToast?.(data?.status === "active"
        ? `${email} ditambahkan sebagai ${roleLabel(inviteRole)}`
        : `Undangan ${email} disimpan selama 7 hari`);
      await load({ quiet: true });
    } catch (nextError) {
      setError(nextError.message || "Anggota belum dapat ditambahkan.");
    } finally {
      setBusy("");
    }
  };

  const changeRole = async (row, role) => {
    if (busy || role === row.role || !site?.id) return;
    setBusy(`role:${row.member_id || row.invitation_id}`);
    setError("");
    try {
      if (row.status === "pending") {
        const { error: rpcError } = await supabase.rpc("invite_site_member_v176", {
          target_site: site.id,
          target_email: row.email,
          target_role: role,
        });
        if (rpcError) throw rpcError;
      } else {
        const { error: rpcError } = await supabase.rpc("update_site_member_role_v176", {
          target_site: site.id,
          target_user: row.member_id,
          target_role: role,
        });
        if (rpcError) throw rpcError;
      }
      setToast?.(`Peran ${row.display_name || row.email} diubah menjadi ${roleLabel(role)}`);
      await load({ quiet: true });
    } catch (nextError) {
      setError(nextError.message || "Peran belum dapat diubah.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (row) => {
    if (busy || !site?.id) return;
    const label = row.display_name || row.email || "anggota";
    if (!window.confirm(row.status === "pending" ? `Batalkan undangan ${label}?` : `Hapus ${label} dari situs ini?`)) return;
    setBusy(`remove:${row.member_id || row.invitation_id}`);
    setError("");
    try {
      const response = row.status === "pending"
        ? await supabase.rpc("cancel_site_invitation_v176", { target_site: site.id, target_invitation: row.invitation_id })
        : await supabase.rpc("remove_site_member_v176", { target_site: site.id, target_user: row.member_id });
      if (response.error) throw response.error;
      setToast?.(row.status === "pending" ? "Undangan dibatalkan" : "Anggota dihapus");
      await load({ quiet: true });
    } catch (nextError) {
      setError(nextError.message || "Tindakan anggota belum berhasil.");
    } finally {
      setBusy("");
    }
  };

  const used = quota.active_count + quota.pending_count;

  return <div className="mv176-page" data-members-release={RELEASE}>
    <header className="mv176-title">
      <div><small>NGEBLOGGING STUDIO</small><h1>Anggota & tim</h1><p>Kelola akses nyata untuk situs aktif. Maksimal 20 anggota aktif dan undangan menunggu.</p></div>
      <div className="mv176-title-actions">
        <button type="button" onClick={() => load()} disabled={loading}><RefreshCw className={loading ? "spin" : ""}/>Muat ulang</button>
        <button type="button" className="primary" onClick={() => setInviteOpen(true)} disabled={!quota.can_invite || loading}><UserPlus/>Tambah anggota</button>
      </div>
    </header>

    <section className="mv176-site-strip">
      <span><Users/></span>
      <div><small>SITUS AKTIF</small><b>{site?.name || "Situs belum dipilih"}</b><p>{site?.slug ? `${site.slug}.ngeblogging.com` : "Pilih situs untuk mengelola tim."}</p></div>
      <strong>{used}/{quota.allowed_limit}</strong>
    </section>

    <div className="mv176-metrics">
      <article><Users/><span><small>Aktif</small><b>{quota.active_count}</b></span></article>
      <article><Clock3/><span><small>Menunggu</small><b>{quota.pending_count}</b></span></article>
      <article><ShieldCheck/><span><small>Sisa tempat</small><b>{quota.remaining}</b></span></article>
    </div>

    {inviteOpen && <form className="mv176-invite" onSubmit={invite}>
      <header><div><UserPlus/><span><b>Tambah anggota</b><small>Pengguna terdaftar ditambahkan langsung; email lain menjadi undangan menunggu.</small></span></div><button type="button" onClick={() => setInviteOpen(false)} aria-label="Tutup formulir"><X/></button></header>
      <div>
        <label><span>Email anggota</span><div><Mail/><input type="email" required maxLength={320} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="nama@contoh.com"/></div></label>
        <label><span>Peran</span><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="primary" disabled={busy === "invite" || !quota.can_invite}>{busy === "invite" ? <><LoaderCircle className="spin"/>Menambahkan…</> : <><Check/>Simpan anggota</>}</button>
      </div>
    </form>}

    {error && <div className="mv176-error" role="alert"><AlertCircle/>{error}</div>}

    <section className="mv176-card">
      <div className="mv176-tools">
        <label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, email, atau peran…"/></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter anggota">{FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <span>{shown.length} dari {rows.length}</span>
      </div>

      {loading ? <div className="mv176-loading"><LoaderCircle className="spin"/><b>Memuat anggota…</b></div> : !rows.length ? <div className="mv176-empty"><Users/><h2>Belum ada anggota tambahan</h2><p>Owner tetap tercatat. Tambahkan hingga 19 anggota atau undangan lain.</p><button className="primary" onClick={() => setInviteOpen(true)} disabled={!quota.can_invite}><UserPlus/>Tambah anggota pertama</button></div> : !shown.length ? <div className="mv176-empty compact"><Search/><h2>Tidak ada hasil</h2><p>Ubah pencarian atau filter.</p></div> : <div className="mv176-list">
        {shown.map((row) => {
          const owner = row.role === "owner";
          const self = row.member_id && row.member_id === user?.id;
          const rowBusy = busy.includes(row.member_id || row.invitation_id || "-");
          return <article key={row.member_id || row.invitation_id}>
            <span className="avatar">{row.avatar_url ? <img src={row.avatar_url} alt=""/> : initials(row.display_name, row.email)}</span>
            <div className="identity"><b>{row.display_name || row.email?.split("@")[0] || "Anggota"}</b><small>{row.email || "Email privat"}</small><time>{row.status === "pending" ? `Berlaku sampai ${formatDate(row.expires_at)}` : `Bergabung ${formatDate(row.joined_at)}`}</time></div>
            <i className={row.status}>{row.status === "pending" ? "Menunggu" : "Aktif"}</i>
            {owner ? <strong className="owner-role">Owner</strong> : <select value={row.role} onChange={(event) => changeRole(row, event.target.value)} disabled={rowBusy || self} aria-label={`Peran ${row.display_name || row.email}`}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
            {!owner && !self ? <button className="danger" onClick={() => remove(row)} disabled={rowBusy} aria-label={row.status === "pending" ? "Batalkan undangan" : "Hapus anggota"}>{rowBusy ? <LoaderCircle className="spin"/> : <Trash2/>}</button> : <span className="protected">{self ? "Anda" : "Dilindungi"}</span>}
          </article>;
        })}
      </div>}
    </section>
  </div>;
}
