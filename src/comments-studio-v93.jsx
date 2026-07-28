import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal, createRoot } from "react-dom/client";
import {
  Check, CheckCheck, ChevronRight, CircleOff, Eye, EyeOff, Flag, Globe2,
  LoaderCircle, Mail, MessageCircle, MonitorSmartphone, RefreshCw, Reply,
  Search, Send, ShieldCheck, Smile, Trash2, UserRound, X,
} from "lucide-react";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";
import "./comments-studio-v93.css";

const RELEASE = "comments-studio-v93-20260728";
const ROOT_ID = "ngeblogging-comments-studio-v93-root";
const HOST_EVENT = "ngeblogging:comments-hosts-v93";
const FILTERS = [
  ["all", "Semua"], ["unread", "Belum dibaca"], ["unreplied", "Belum dibalas"],
  ["pending", "Menunggu"], ["approved", "Disetujui"], ["hidden", "Disembunyikan"], ["spam", "Spam"],
];

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function ensureHosts() {
  const shell = document.querySelector(".sn-shell");
  const nav = shell?.querySelector(":scope > .sn-side > nav");
  const main = shell?.querySelector(":scope > .sn-main");
  if (!shell || !nav || !main) return null;

  let navHost = nav.querySelector(":scope > .sn-comments-nav-host-v93");
  if (!navHost) {
    navHost = document.createElement("span");
    navHost.className = "sn-comments-nav-host-v93";
    navHost.dataset.commentsHost = RELEASE;
    const domain = [...nav.querySelectorAll(":scope > button")].find((button) => labelOf(button) === "Domain");
    nav.insertBefore(navHost, domain || null);
  }

  let pageHost = main.querySelector(":scope > .sn-comments-page-host-v93");
  if (!pageHost) {
    pageHost = document.createElement("div");
    pageHost.className = "sn-comments-page-host-v93";
    pageHost.dataset.commentsHost = RELEASE;
    main.append(pageHost);
  }

  window.dispatchEvent(new CustomEvent(HOST_EVENT, { detail: { shell, navHost, pageHost } }));
  return { shell, navHost, pageHost };
}

function readActiveSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

function formatDate(value) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return "—"; }
}

function Toggle({ label, help, checked, onChange, disabled }) {
  return <label className="csm-toggle-v93"><span><b>{label}</b><small>{help}</small></span><input type="checkbox" checked={Boolean(checked)} disabled={disabled} onChange={(event) => onChange(event.target.checked)}/><i/></label>;
}

function metricLabel(key) {
  return ({ total:"Total", unread:"Belum dibaca", unreplied:"Belum dibalas", pending:"Menunggu" })[key] || key;
}

function statusLabel(status) {
  return ({ pending:"Menunggu", approved:"Disetujui", hidden:"Disembunyikan", spam:"Spam" })[status] || status;
}

function CommentsWorkspace({ user }) {
  const [hosts, setHosts] = useState(() => ensureHosts());
  const [open, setOpen] = useState(false);
  const [site, setSite] = useState(null);
  const [dashboard, setDashboard] = useState({ settings:{}, counts:{}, comments:[] });
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const handler = (event) => setHosts(event.detail);
    window.addEventListener(HOST_EVENT, handler);
    const observer = new MutationObserver(() => ensureHosts());
    observer.observe(document.body, { childList:true, subtree:true });
    ensureHosts();
    return () => { window.removeEventListener(HOST_EVENT, handler); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const shell = hosts?.shell;
    if (!shell) return;
    shell.dataset.commentsOpenV93 = String(open);
    shell.dataset.commentsRelease = RELEASE;
    const closeOnNavigation = (event) => {
      const button = event.target.closest(".sn-side > nav > button, .sn-account-footer button");
      if (button) setOpen(false);
    };
    shell.addEventListener("click", closeOnNavigation, true);
    return () => {
      shell.removeEventListener("click", closeOnNavigation, true);
      delete shell.dataset.commentsOpenV93;
    };
  }, [hosts?.shell, open]);

  const resolveSite = useCallback(async () => {
    if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum terhubung.");
    let siteId = readActiveSiteId();
    if (siteId) {
      const { data, error: siteError } = await supabase.from("sites").select("id,name,slug,status,is_public").eq("id", siteId).maybeSingle();
      if (!siteError && data) return data;
    }
    const currentUser = user || (await supabase.auth.getUser()).data.user;
    if (!currentUser?.id) throw new Error("Sesi pengguna tidak tersedia.");
    const { data, error: memberError } = await supabase.from("site_members").select("site_id,sites(id,name,slug,status,is_public)").eq("user_id", currentUser.id).order("joined_at").limit(1).maybeSingle();
    if (memberError) throw memberError;
    const fallback = data?.sites || null;
    if (fallback?.id) {
      siteId = fallback.id;
      try { localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId); } catch { /* ignored */ }
    }
    return fallback;
  }, [user]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const activeSite = await resolveSite();
      if (!activeSite?.id) throw new Error("Situs aktif belum ditemukan.");
      const { data, error: rpcError } = await supabase.rpc("get_site_comment_dashboard", { target_site:activeSite.id });
      if (rpcError) throw rpcError;
      setSite(activeSite);
      setDashboard({ settings:data?.settings || {}, counts:data?.counts || {}, comments:Array.isArray(data?.comments) ? data.comments : [] });
      setSelectedId((current) => current && data?.comments?.some((comment) => comment.id === current) ? current : data?.comments?.find((comment) => !comment.parentId)?.id || "");
    } catch (loadError) {
      setError(loadError.message || "Komentar belum dapat dimuat.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [resolveSite]);

  useEffect(() => {
    if (!hosts?.navHost) return;
    load(true);
    const interval = window.setInterval(() => { if (!document.hidden) load(true); }, 45_000);
    const onVisible = () => { if (!document.hidden) load(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [hosts?.navHost, load]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const comments = dashboard.comments || [];
  const roots = useMemo(() => comments.filter((comment) => !comment.parentId && !comment.isAdminReply), [comments]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return roots.filter((comment) => {
      const matchesFilter = filter === "all"
        || (filter === "unread" && !comment.ownerReadAt)
        || (filter === "unreplied" && !comment.repliedAt && comment.status === "approved")
        || comment.status === filter;
      const haystack = `${comment.authorName} ${comment.authorEmail || ""} ${comment.body} ${comment.content?.title || ""}`.toLowerCase();
      return matchesFilter && (!needle || haystack.includes(needle));
    });
  }, [roots, filter, query]);
  const selected = roots.find((comment) => comment.id === selectedId) || filtered[0] || null;
  const selectedReplies = selected ? comments.filter((comment) => comment.parentId === selected.id && comment.isAdminReply) : [];

  const runAction = async (commentId, action) => {
    setBusyId(commentId);
    setError(""); setNotice("");
    try {
      const { error: rpcError } = await supabase.rpc("moderate_site_comment", { target_comment:commentId, moderation_action:action });
      if (rpcError) throw rpcError;
      setNotice(action === "delete" ? "Komentar dihapus." : "Status komentar diperbarui.");
      await load(true);
    } catch (actionError) { setError(actionError.message || "Komentar belum dapat diperbarui."); }
    finally { setBusyId(""); }
  };

  const openComment = async (comment) => {
    setSelectedId(comment.id);
    if (!comment.ownerReadAt) await runAction(comment.id, "read");
  };

  const sendReply = async () => {
    if (!selected?.id || !reply.trim()) return;
    setBusyId(selected.id); setError(""); setNotice("");
    try {
      const { error: rpcError } = await supabase.rpc("reply_to_site_comment", { target_comment:selected.id, reply_body:reply.trim() });
      if (rpcError) throw rpcError;
      setReply(""); setNotice("Balasan diterbitkan sebagai Tim situs.");
      await load(true);
    } catch (replyError) { setError(replyError.message || "Balasan belum dapat dikirim."); }
    finally { setBusyId(""); }
  };

  const saveSettings = async () => {
    if (!site?.id) return;
    setSavingSettings(true); setError(""); setNotice("");
    const settings = dashboard.settings || {};
    try {
      const { data, error: rpcError } = await supabase.rpc("update_site_comment_settings", {
        target_site:site.id,
        comments_enabled:Boolean(settings.enabled),
        approval_required:Boolean(settings.require_approval),
        guests_allowed:Boolean(settings.allow_guests),
        email_required:Boolean(settings.require_email),
        emojis_enabled:Boolean(settings.emoji_enabled),
      });
      if (rpcError) throw rpcError;
      setDashboard((current) => ({ ...current, settings:data || current.settings }));
      setNotice("Pengaturan komentar disimpan.");
    } catch (settingsError) { setError(settingsError.message || "Pengaturan komentar belum tersimpan."); }
    finally { setSavingSettings(false); }
  };

  const setSetting = (key, value) => setDashboard((current) => ({ ...current, settings:{ ...current.settings, [key]:value } }));
  const unread = Number(dashboard.counts?.unread || 0);

  const navButton = <button type="button" className={`sn-comments-nav-button-v93 ${open ? "active" : ""}`} data-comments-nav-v93="true" onClick={() => setOpen(true)} title="Komentar"><MessageCircle/><span>Komentar</span>{unread > 0 && <i>{unread > 99 ? "99+" : unread}</i>}</button>;

  const page = <section className="csm-page-v93" aria-label="Komentar dan diskusi">
    <header className="csm-title-v93"><div><small>NGEBLOGGING STUDIO</small><h1>Komentar & diskusi</h1><p>Moderasi percakapan nyata pada Posts dan Pages untuk situs aktif.</p></div><div><button onClick={() => load()} disabled={loading}><RefreshCw className={loading ? "spin" : ""}/>Muat ulang</button><button className="csm-close-v93" onClick={() => setOpen(false)}><X/>Tutup</button></div></header>
    {error && <div className="csm-alert-v93 error">{error}</div>}{notice && <div className="csm-alert-v93 success">{notice}</div>}
    <section className="csm-site-v93"><div><Globe2/><span><small>SITUS AKTIF</small><b>{site?.name || "Memuat situs…"}</b><em>{site?.slug ? `${site.slug}.ngeblogging.com` : ""}</em></span></div><i className={dashboard.settings?.enabled ? "active" : ""}>{dashboard.settings?.enabled ? "Komentar aktif" : "Komentar nonaktif"}</i></section>
    <div className="csm-metrics-v93">{["total","unread","unreplied","pending"].map((key) => <article key={key}><small>{metricLabel(key)}</small><b>{Number(dashboard.counts?.[key] || 0).toLocaleString("id-ID")}</b></article>)}</div>
    <section className="csm-settings-v93"><header><div><ShieldCheck/><span><h2>Pengaturan komentar</h2><p>Berlaku untuk situs aktif. Toggle Komentar pada editor tetap dapat mematikan atau mengaktifkan setiap Post/Page.</p></span></div><button onClick={saveSettings} disabled={savingSettings}>{savingSettings ? <LoaderCircle className="spin"/> : <Check/>}Simpan</button></header><div><Toggle label="Aktifkan komentar" help="Tampilkan formulir dan diskusi pada konten yang mengizinkan komentar." checked={dashboard.settings?.enabled} onChange={(value) => setSetting("enabled", value)}/><Toggle label="Persetujuan sebelum tampil" help="Komentar baru masuk ke antrean Menunggu." checked={dashboard.settings?.require_approval} onChange={(value) => setSetting("require_approval", value)}/><Toggle label="Izinkan pengunjung" help="Pengunjung publik dapat mengirim komentar." checked={dashboard.settings?.allow_guests} onChange={(value) => setSetting("allow_guests", value)}/><Toggle label="Email wajib" help="Email hanya terlihat oleh pengelola dan tidak ditampilkan ke publik." checked={dashboard.settings?.require_email} onChange={(value) => setSetting("require_email", value)}/><Toggle label="Emoji & reaksi" help="Aktifkan pilihan wajah bundar serta reaksi pada komentar." checked={dashboard.settings?.emoji_enabled} onChange={(value) => setSetting("emoji_enabled", value)}/></div></section>
    <section className="csm-workspace-v93">
      <aside className="csm-inbox-v93"><header><div className="csm-search-v93"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, email, konten…"/></div><nav>{FILTERS.map(([id,label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}{id !== "all" && Number(dashboard.counts?.[id] || 0) > 0 ? <i>{dashboard.counts[id]}</i> : null}</button>)}</nav></header><div className="csm-comment-list-v93">{loading ? <div className="csm-loading-v93"><LoaderCircle className="spin"/>Memuat komentar…</div> : filtered.length ? filtered.map((comment) => <button key={comment.id} className={`${selected?.id === comment.id ? "active" : ""} ${!comment.ownerReadAt ? "unread" : ""}`} onClick={() => openComment(comment)}><span className="csm-avatar-v93">{comment.moodEmoji || comment.authorName?.slice(0,1)?.toUpperCase() || "U"}</span><div><header><b>{comment.authorName}</b><time>{formatDate(comment.createdAt)}</time></header><p>{comment.body}</p><footer><i className={comment.status}>{statusLabel(comment.status)}</i><span>{comment.content?.kind === "page" ? "Page" : "Post"}: {comment.content?.title}</span>{comment.repliedAt && <CheckCheck/>}</footer></div><ChevronRight/></button>) : <div className="csm-empty-v93"><MessageCircle/><b>Tidak ada komentar</b><span>Filter ini belum memiliki percakapan.</span></div>}</div></aside>
      <article className="csm-detail-v93">{selected ? <><header><div><span className="csm-avatar-v93 large">{selected.moodEmoji || selected.authorName?.slice(0,1)?.toUpperCase() || "U"}</span><div><h2>{selected.authorName}</h2><p>{formatDate(selected.createdAt)} · {selected.content?.kind === "page" ? "Page" : "Post"} <a href={site?.slug && selected.content?.slug ? `https://${site.slug}.ngeblogging.com/${selected.content.slug}` : undefined} target="_blank" rel="noreferrer">{selected.content?.title}</a></p></div></div><i className={selected.status}>{statusLabel(selected.status)}</i></header><div className="csm-body-v93">{selected.body}</div><div className="csm-person-v93"><h3>Detail pengunjung</h3><div><span><UserRound/><b>Nama</b><em>{selected.authorName}</em></span><span><Mail/><b>Email privat</b><em>{selected.authorEmail || "Tidak diberikan"}</em></span><span><Globe2/><b>Website</b><em>{selected.authorWebsite || "—"}</em></span><span><MonitorSmartphone/><b>Perangkat</b><em>{selected.deviceType || "unknown"}</em></span><span><Flag/><b>Negara</b><em>{selected.countryCode || "—"}</em></span><span><Eye/><b>Dibaca</b><em>{selected.ownerReadAt ? formatDate(selected.ownerReadAt) : "Belum dibaca"}</em></span></div>{selected.userAgent && <small>User agent: {selected.userAgent}</small>}</div><div className="csm-actions-v93"><button onClick={() => runAction(selected.id, selected.ownerReadAt ? "unread" : "read")} disabled={busyId === selected.id}>{selected.ownerReadAt ? <EyeOff/> : <Eye/>}{selected.ownerReadAt ? "Tandai belum dibaca" : "Tandai dibaca"}</button>{selected.status !== "approved" && <button className="approve" onClick={() => runAction(selected.id,"approve")}><Check/>Setujui</button>}{selected.status !== "hidden" && <button onClick={() => runAction(selected.id,"hide")}><CircleOff/>Sembunyikan</button>}{selected.status !== "spam" && <button onClick={() => runAction(selected.id,"spam")}><ShieldCheck/>Spam</button>}<button className="danger" onClick={() => window.confirm("Hapus komentar ini beserta balasannya?") && runAction(selected.id,"delete")}><Trash2/>Hapus</button></div><section className="csm-replies-v93"><header><h3><Reply/>Balasan tim ({selectedReplies.length})</h3>{selected.repliedAt && <span>Terakhir dibalas {formatDate(selected.repliedAt)}</span>}</header>{selectedReplies.map((item) => <article key={item.id}><b>{item.authorName}<i>Tim situs</i></b><p>{item.body}</p><time>{formatDate(item.createdAt)}</time></article>)}<textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} placeholder="Tulis balasan resmi dari Tim situs…"/><footer><span><Smile/>Emoji dapat ditulis langsung pada balasan.</span><button onClick={sendReply} disabled={!reply.trim() || busyId === selected.id}>{busyId === selected.id ? <LoaderCircle className="spin"/> : <Send/>}Kirim balasan</button></footer></section></> : <div className="csm-empty-detail-v93"><MessageCircle/><h2>Pilih komentar</h2><p>Detail pengunjung, status baca, moderasi, dan balasan akan muncul di sini.</p></div>}</article>
    </section>
  </section>;

  return <>{hosts?.navHost ? createPortal(navButton, hosts.navHost) : null}{hosts?.pageHost && open ? createPortal(page, hosts.pageHost) : null}</>;
}

function start() {
  if (document.getElementById(ROOT_ID)) return;
  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.style.display = "contents";
  document.body.append(host);
  createRoot(host).render(<CommentsWorkspace/>);
  ensureHosts();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
else start();
