import React, { useEffect, useMemo, useState } from "react";
import {
  Check, CheckCircle2, EyeOff, LoaderCircle, Mail, MessageCircle,
  RefreshCw, Reply, Save, Search, ShieldCheck, Trash2, XCircle,
} from "lucide-react";
import { supabase } from "./lib/supabase.js";

const DEFAULT_SETTINGS = {
  enabled: true,
  require_approval: true,
  allow_guests: true,
  require_email: true,
  emoji_enabled: true,
};

const DEFAULT_COUNTS = {
  total: 0,
  unread: 0,
  unreplied: 0,
  pending: 0,
  approved: 0,
  hidden: 0,
  spam: 0,
};

const FILTERS = [
  ["all", "Semua"],
  ["unread", "Belum dibaca"],
  ["unreplied", "Belum dibalas"],
  ["pending", "Menunggu"],
  ["approved", "Disetujui"],
  ["hidden", "Disembunyikan"],
  ["spam", "Spam"],
];

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function rootComments(comments) {
  return comments.filter((comment) => !comment.parentId && !comment.isAdminReply);
}

function matchesFilter(comment, filter) {
  if (filter === "all") return true;
  if (filter === "unread") return !comment.ownerReadAt;
  if (filter === "unreplied") return comment.status === "approved" && !comment.repliedAt;
  return comment.status === filter;
}

function statusLabel(status) {
  return {
    pending: "Menunggu",
    approved: "Disetujui",
    hidden: "Disembunyikan",
    spam: "Spam",
  }[status] || status || "Menunggu";
}

function Metric({ label, value }) {
  return <article className="sv124-metric"><span>{label}</span><b>{Number(value || 0)}</b></article>;
}

function Toggle({ checked, onChange, label, description }) {
  return <label className="sv124-toggle-row">
    <span><b>{label}</b><small>{description}</small></span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)}/>
    <i aria-hidden="true"/>
  </label>;
}

export default function CommentsPanelV124({ site, setToast }) {
  const [dashboard, setDashboard] = useState({ settings: DEFAULT_SETTINGS, counts: DEFAULT_COUNTS, comments: [] });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const load = async ({ quiet = false } = {}) => {
    if (!site?.id || !supabase) return;
    if (!quiet) setLoading(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("get_site_comment_dashboard", { target_site: site.id });
      if (rpcError) throw rpcError;
      const next = {
        settings: { ...DEFAULT_SETTINGS, ...(data?.settings || {}) },
        counts: { ...DEFAULT_COUNTS, ...(data?.counts || {}) },
        comments: Array.isArray(data?.comments) ? data.comments : [],
      };
      setDashboard(next);
      setSettings(next.settings);
      const roots = rootComments(next.comments);
      setSelectedId((current) => roots.some((item) => item.id === current) ? current : roots[0]?.id || "");
    } catch (nextError) {
      console.error("Comments dashboard failed", nextError);
      setError(nextError.message || "Komentar belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDashboard({ settings: DEFAULT_SETTINGS, counts: DEFAULT_COUNTS, comments: [] });
    setSelectedId("");
    setQuery("");
    setFilter("all");
    load();
  }, [site?.id]);

  const roots = useMemo(() => rootComments(dashboard.comments), [dashboard.comments]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return roots.filter((comment) => {
      if (!matchesFilter(comment, filter)) return false;
      if (!needle) return true;
      return [comment.authorName, comment.authorEmail, comment.body, comment.content?.title, comment.requestPath]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [roots, query, filter]);

  const selected = roots.find((comment) => comment.id === selectedId) || null;
  const replies = selected
    ? dashboard.comments.filter((comment) => comment.parentId === selected.id && comment.isAdminReply)
    : [];

  const saveSettings = async () => {
    if (!site?.id || !supabase || busy) return;
    setBusy("settings");
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("update_site_comment_settings", {
        target_site: site.id,
        comments_enabled: settings.enabled,
        approval_required: settings.require_approval,
        guests_allowed: settings.allow_guests,
        email_required: settings.require_email,
        emojis_enabled: settings.emoji_enabled,
      });
      if (rpcError) throw rpcError;
      setToast?.("Pengaturan komentar disimpan");
      await load({ quiet: true });
    } catch (nextError) {
      setError(nextError.message || "Pengaturan komentar belum tersimpan.");
    } finally {
      setBusy("");
    }
  };

  const moderate = async (commentId, action, success) => {
    if (!supabase || busy) return;
    if (action === "delete" && !window.confirm("Hapus komentar ini secara permanen?")) return;
    setBusy(`${action}:${commentId}`);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("moderate_site_comment", {
        target_comment: commentId,
        moderation_action: action,
      });
      if (rpcError) throw rpcError;
      setToast?.(success);
      await load({ quiet: true });
    } catch (nextError) {
      setError(nextError.message || "Tindakan komentar belum berhasil.");
    } finally {
      setBusy("");
    }
  };

  const choose = async (comment) => {
    setSelectedId(comment.id);
    setReplyBody("");
    if (!comment.ownerReadAt) await moderate(comment.id, "read", "Komentar ditandai sudah dibaca");
  };

  const sendReply = async (event) => {
    event.preventDefault();
    const body = replyBody.trim();
    if (!selected?.id || !body || !supabase || busy) return;
    setBusy(`reply:${selected.id}`);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("reply_to_site_comment", {
        target_comment: selected.id,
        reply_body: body,
      });
      if (rpcError) throw rpcError;
      setReplyBody("");
      setToast?.("Balasan diterbitkan");
      await load({ quiet: true });
    } catch (nextError) {
      setError(nextError.message || "Balasan belum dapat dikirim.");
    } finally {
      setBusy("");
    }
  };

  return <div className="sv124-page sv124-comments-page">
    <header className="sv124-page-title">
      <div><small>NGEBLOGGING STUDIO</small><h1>Komentar & diskusi</h1><p>Moderasi percakapan nyata pada Posts dan Pages untuk situs aktif.</p></div>
      <button className="sv124-secondary" onClick={() => load()} disabled={loading}><RefreshCw className={loading ? "spin" : ""}/>Muat ulang</button>
    </header>

    <section className="sv124-site-strip">
      <span><MessageCircle/></span>
      <div><small>SITUS AKTIF</small><b>{site?.name || "Situs belum dipilih"}</b><p>{site?.slug ? `${site.slug}.ngeblogging.com` : ""}</p></div>
      <i className={settings.enabled ? "on" : "off"}>{settings.enabled ? "Komentar aktif" : "Komentar nonaktif"}</i>
    </section>

    <div className="sv124-metrics-grid sv124-comments-metrics">
      <Metric label="Total" value={dashboard.counts.total}/>
      <Metric label="Belum dibaca" value={dashboard.counts.unread}/>
      <Metric label="Belum dibalas" value={dashboard.counts.unreplied}/>
      <Metric label="Menunggu" value={dashboard.counts.pending}/>
    </div>

    <section className="sv124-card sv124-settings-card">
      <header><div><ShieldCheck/><span><b>Pengaturan komentar</b><small>Toggle komentar pada editor tetap dapat mengatur setiap Post/Page.</small></span></div><button className="sv124-primary" onClick={saveSettings} disabled={busy === "settings"}><Save/>{busy === "settings" ? "Menyimpan…" : "Simpan"}</button></header>
      <div className="sv124-toggle-grid">
        <Toggle checked={settings.enabled} onChange={(value) => setSettings((current) => ({ ...current, enabled: value }))} label="Aktifkan komentar" description="Tampilkan diskusi publik."/>
        <Toggle checked={settings.require_approval} onChange={(value) => setSettings((current) => ({ ...current, require_approval: value }))} label="Persetujuan" description="Komentar baru menunggu moderasi."/>
        <Toggle checked={settings.allow_guests} onChange={(value) => setSettings((current) => ({ ...current, allow_guests: value }))} label="Izinkan pengunjung" description="Pengunjung dapat berkomentar."/>
        <Toggle checked={settings.require_email} onChange={(value) => setSettings((current) => ({ ...current, require_email: value }))} label="Email wajib" description="Email privat untuk pengelola."/>
        <Toggle checked={settings.emoji_enabled} onChange={(value) => setSettings((current) => ({ ...current, emoji_enabled: value }))} label="Emoji & reaksi" description="Wajah bundar dan reaksi."/>
      </div>
    </section>

    {error ? <div className="sv124-error" role="alert">{error}</div> : null}

    <section className="sv124-card sv124-comment-workspace">
      <div className="sv124-comment-tools">
        <label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, email, konten…"/></label>
        <div>{FILTERS.map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}<span>{value === "all" ? dashboard.counts.total : dashboard.counts[value] || 0}</span></button>)}</div>
      </div>

      {loading ? <div className="sv124-panel-loading"><LoaderCircle className="spin"/><b>Memuat komentar…</b></div> : !roots.length ? <div className="sv124-unified-empty">
        <span><MessageCircle/></span><h2>Belum ada komentar</h2><p>Semua komentar baru dari Posts dan Pages akan muncul di ruang ini. Tidak ada panel kosong ganda atau tulisan yang saling bertumpuk.</p>
      </div> : <div className="sv124-comment-columns">
        <aside className="sv124-comment-list">
          {!visible.length ? <div className="sv124-list-empty"><Search/><b>Tidak ada hasil</b><p>Ubah kata pencarian atau filter.</p></div> : visible.map((comment) => <button key={comment.id} className={selected?.id === comment.id ? "active" : ""} onClick={() => choose(comment)}>
            <span className="sv124-comment-avatar">{String(comment.authorName || "P").slice(0, 2).toUpperCase()}</span>
            <div><b>{comment.authorName || "Pengunjung"}</b><small>{comment.content?.title || comment.requestPath || "Konten"}</small><p>{comment.body}</p><time>{formatDate(comment.createdAt)}</time></div>
            <i className={`status-${comment.status}`}>{statusLabel(comment.status)}</i>
            {!comment.ownerReadAt ? <em aria-label="Belum dibaca"/> : null}
          </button>)}
        </aside>

        <article className="sv124-comment-detail">
          {!selected ? <div className="sv124-detail-empty"><MessageCircle/><h2>Pilih komentar</h2></div> : <>
            <header><div className="sv124-comment-avatar large">{String(selected.authorName || "P").slice(0, 2).toUpperCase()}</div><div><small>{selected.content?.kind || "Konten"} · {selected.content?.title || selected.requestPath}</small><h2>{selected.authorName || "Pengunjung"}</h2><p>{selected.authorEmail || "Email tidak tersedia"}{selected.authorWebsite ? ` · ${selected.authorWebsite}` : ""}</p></div><i className={`status-${selected.status}`}>{statusLabel(selected.status)}</i></header>
            <section className="sv124-comment-message"><p>{selected.body}</p>{selected.moodEmoji ? <span>{selected.moodEmoji}</span> : null}<footer><time>{formatDate(selected.createdAt)}</time><small>{selected.deviceType || "Perangkat tidak diketahui"}{selected.countryCode ? ` · ${selected.countryCode}` : ""}</small></footer></section>

            <div className="sv124-moderation-actions">
              <button onClick={() => moderate(selected.id, "approve", "Komentar disetujui")} disabled={Boolean(busy)}><CheckCircle2/>Setujui</button>
              <button onClick={() => moderate(selected.id, "hidden", "Komentar disembunyikan")} disabled={Boolean(busy)}><EyeOff/>Sembunyikan</button>
              <button onClick={() => moderate(selected.id, "spam", "Komentar ditandai spam")} disabled={Boolean(busy)}><XCircle/>Spam</button>
              <button className="danger" onClick={() => moderate(selected.id, "delete", "Komentar dihapus")} disabled={Boolean(busy)}><Trash2/>Hapus</button>
            </div>

            {replies.length ? <div className="sv124-replies"><h3>Balasan tim</h3>{replies.map((reply) => <article key={reply.id}><Reply/><div><b>{reply.authorName || "Tim situs"}</b><p>{reply.body}</p><time>{formatDate(reply.createdAt)}</time></div></article>)}</div> : null}

            <form className="sv124-reply-form" onSubmit={sendReply}><label><Mail/><textarea value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="Tulis balasan resmi dari tim situs…" maxLength={4000}/></label><button className="sv124-primary" disabled={!replyBody.trim() || Boolean(busy)}><Reply/>{busy.startsWith("reply:") ? "Mengirim…" : "Balas"}</button></form>
          </>}
        </article>
      </div>}
    </section>
  </div>;
}
