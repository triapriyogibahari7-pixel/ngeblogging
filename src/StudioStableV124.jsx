import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  Activity, BarChart3, BookOpen, Check, ChevronDown, Cloud, CloudOff,
  Eye, FilePlus2, FileText, Globe2, Image, KeyRound, LayoutDashboard,
  LoaderCircle, LogOut, Menu, MessageCircle, MoreHorizontal, Palette,
  PanelLeftClose, Plus, Search, Settings, ShieldCheck, Sparkles, Trash2,
  Users, X,
} from "lucide-react";
import NaraAssistant from "./NaraAssistant.jsx";
import ContentEditor from "./ContentEditor.jsx";
import MediaLibrary from "./MediaLibrary.jsx";
import CommentsPanelV124 from "./CommentsPanelV124.jsx";
import DomainPanelV124 from "./DomainPanelV124.jsx";
import ApiKeysPanelV124 from "./ApiKeysPanelV124.jsx";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import {
  createUserSite, getOrCreatePrimarySite, getUserProfile, listUserSites,
  setActiveSiteId, updateUserProfile,
} from "./lib/studio-data.js";
import {
  CONTENT_PAGE_SIZE, createContentDocument, deleteContentDocument, getContentDocument,
  listContentPage, normalizeMetadata, normalizeSeo, slugify, updateContentDocument,
} from "./lib/content-data.js";
import "./studio-stable-v124.css";
import "./studio-stable-v125.css";

const ThemeStudio = lazy(() => import("./ThemeStudio.jsx"));
const LOCAL_STORE = "ngeblogging-studio-v124-local";
const SIDEBAR_STORE = "ngeblogging-sidebar-expanded-v125";

function loadSidebarPreference() {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORE);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

function localDocument(type, title, content, status = "draft") {
  const metadata = normalizeMetadata({
    commentsEnabled: type !== "page",
    showAuthor: type !== "page",
    showDate: type !== "page",
    showShare: type !== "page",
  }, type);
  return {
    id: crypto.randomUUID(), type, title,
    slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`,
    status, visibility: "public", excerpt: "", content, metadata,
    seo: normalizeSeo({}, metadata), scheduledAt: "",
    publishedAt: status === "published" ? new Date().toISOString() : "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    updated: Date.now(), hydrated: true,
  };
}

const STARTER = [
  localDocument("article", "Selamat datang di Ngeblogging", "<h1>Selamat datang di Ngeblogging</h1><p>Gunakan editor profesional, metadata, SEO, media, dan preview sebelum menerbitkan.</p>", "published"),
  localDocument("page", "Tentang", "<h1>Tentang</h1><p>Bangun halaman profesional untuk identitas, layanan, portofolio, kontak, atau landing page.</p>"),
];

function loadLocalDocs() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORE));
    return Array.isArray(stored) && stored.length ? stored : STARTER;
  } catch {
    return STARTER;
  }
}

function relativeTime(value) {
  const date = typeof value === "number" ? value : new Date(value || 0).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - date) / 60000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} jam lalu`;
  return `${Math.floor(minutes / 1440)} hari lalu`;
}

function publishActiveSite(site) {
  if (!site?.id) return;
  setActiveSiteId(site.id);
  window.__ngebloggingActiveSite = site;
  document.documentElement.dataset.activeSiteId = site.id;
  document.documentElement.dataset.activeSiteSlug = site.slug || "";
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: site }));
}

function SiteManager({ sites, activeSite, user, onSelect, onClose, onCreated, setToast }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", slug: "", description: "", blueprint: "blog" });

  const create = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await createUserSite({
        userId: user.id,
        name: draft.name,
        slug: draft.slug || draft.name,
        description: draft.description,
        blueprint: draft.blueprint,
      });
      onCreated(created);
      setToast("Situs dan subdomain baru dibuat");
    } catch (error) {
      setToast(error.message || "Situs belum dapat dibuat");
    } finally {
      setCreating(false);
    }
  };

  return <div className="sv124-modal-layer">
    <button className="sv124-modal-backdrop" onClick={onClose} aria-label="Tutup"/>
    <section className="sv124-modal sv124-site-manager">
      <header><div><small>WORKSPACES</small><h2>Situs saya</h2><p>Pilih satu situs aktif. Semua menu mengikuti pilihan yang sama.</p></div><button onClick={onClose} aria-label="Tutup"><X/></button></header>
      <div className="sv124-sites-list">{sites.map((site) => <article key={site.id} className={site.id === activeSite?.id ? "active" : ""}>
        <span>{site.name.slice(0, 2).toUpperCase()}</span><div><b>{site.name}</b><small>{site.slug}.ngeblogging.com · {site.status === "active" ? "Publik" : "Draf"}</small></div>
        <button onClick={() => onSelect(site)}>{site.id === activeSite?.id ? <><Check/>Aktif</> : "Kelola"}</button>
        <a href={`https://${site.slug}.ngeblogging.com`} target="_blank" rel="noreferrer"><Eye/>Lihat</a>
      </article>)}</div>
      <form className="sv124-create-site" onSubmit={create}><h3>Buat situs baru</h3><div>
        <label>Nama<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))}/></label>
        <label>Subdomain<div><input value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: slugify(event.target.value) }))}/><span>.ngeblogging.com</span></div></label>
        <label>Jenis<select value={draft.blueprint} onChange={(event) => setDraft((current) => ({ ...current, blueprint: event.target.value }))}><option value="blog">Blog</option><option value="website">Website</option><option value="news">Portal berita</option><option value="portfolio">Portofolio</option><option value="forum">Forum</option><option value="community">Komunitas</option><option value="landing">Landing page</option><option value="profile">Profil</option><option value="knowledge">Knowledge base</option></select></label>
        <label className="wide">Deskripsi<textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}/></label>
      </div><button className="sv124-primary" disabled={creating || !draft.name.trim()}>{creating ? <><LoaderCircle className="spin"/>Membuat…</> : <><Plus/>Buat situs</>}</button></form>
    </section>
  </div>;
}

function NavButton({ active, onClick, icon: Icon, label }) {
  return <button className={active ? "active" : ""} onClick={onClick} title={label}><Icon/><span>{label}</span></button>;
}

function Loading({ label }) {
  return <div className="sv124-panel-loading"><LoaderCircle className="spin"/><b>{label}</b></div>;
}

function PageTitle({ title, description, action }) {
  return <header className="sv124-page-title"><div><small>NGEBLOGGING STUDIO</small><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

function HomeView({ docs, displayName, site, loading, createDoc, openDoc, openNara }) {
  const published = docs.filter((doc) => doc.status === "published").length;
  const pages = docs.filter((doc) => doc.type === "page").length;
  const posts = docs.filter((doc) => doc.type !== "page").length;
  return <div className="sv124-page">
    <div className="sv124-welcome"><div><small>SELAMAT DATANG</small><h1>{displayName}, ruang kerja Anda siap.</h1><p>{site?.slug ? `${site.slug}.ngeblogging.com` : "Pilih situs aktif untuk mulai."}</p></div><div>{site?.slug ? <a className="sv124-secondary" href={`https://${site.slug}.ngeblogging.com`} target="_blank" rel="noreferrer"><Eye/>Lihat situs</a> : null}<button className="sv124-secondary" onClick={() => createDoc("page")}><BookOpen/>Buat Page</button><button className="sv124-primary" onClick={() => createDoc("article")}><FilePlus2/>Buat Post</button></div></div>
    <div className="sv124-metrics-grid"><article className="sv124-metric"><FileText/><span>Posts</span><b>{posts}</b><small>Konten kronologis</small></article><article className="sv124-metric"><BookOpen/><span>Pages</span><b>{pages}</b><small>Halaman tetap</small></article><article className="sv124-metric"><Check/><span>Terbit</span><b>{published}</b><small>Dapat dibaca publik</small></article><article className="sv124-metric"><ShieldCheck/><span>SEO tenant</span><b>Edge</b><small>Sitemap, feed, schema</small></article></div>
    <div className="sv124-home-grid"><section className="sv124-card"><header><h2>Konten terbaru</h2>{loading ? <LoaderCircle className="spin"/> : null}</header>{docs.slice(0, 6).map((doc) => <button key={doc.id} onClick={() => openDoc(doc.id)}><span><FileText/></span><div><b>{doc.title}</b><small>{doc.type === "page" ? "Page" : "Post"} · {relativeTime(doc.updated || doc.updatedAt)}</small></div><i className={doc.status}>{doc.status}</i></button>)}{!docs.length && !loading ? <p>Belum ada konten.</p> : null}</section><aside className="sv124-nara-card"><Sparkles/><small>NARA AI</small><h2>Bangun lebih cepat, tetap aman.</h2><p>Gunakan projects, memory, plugins, dan generator gambar dengan konfirmasi untuk tindakan penting.</p><button onClick={openNara}>Buka Nara</button></aside></div>
  </div>;
}

function ContentList({ docs, type, query, setQuery, createDoc, openDoc, removeDoc, loading, hasMore, loadMore }) {
  const label = type === "page" ? "Pages" : "Posts";
  const single = type === "page" ? "Page" : "Post";
  return <div className="sv124-page"><PageTitle title={label} description={type === "page" ? "Kelola halaman tetap, hierarki, template, menu, dan SEO." : "Kelola tulisan kronologis, kategori, tags, jadwal, lokasi, dan SEO."} action={<button className="sv124-primary" onClick={() => createDoc(type)}><FilePlus2/>Buat {single}</button>}/>
    <section className="sv124-card sv124-content-card"><div className="sv124-content-tools"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari ${label.toLowerCase()}…`}/></label><span>{docs.length} hasil</span></div><div className="sv124-table-head"><span>Judul</span><span>Status</span><span>Diperbarui</span><span/></div>{docs.map((doc) => <div className="sv124-doc-row" key={doc.id}><button onClick={() => openDoc(doc.id)}><span><FileText/></span><div><b>{doc.title}</b><small>/{doc.slug}</small></div></button><i className={doc.status}>{doc.status}</i><time>{relativeTime(doc.updated || doc.updatedAt)}</time><button className="danger" onClick={() => removeDoc(doc.id)} aria-label="Hapus"><Trash2/></button></div>)}{loading ? <Loading label={`Memuat ${label.toLowerCase()}…`}/> : null}{!docs.length && !loading ? <div className="sv124-unified-empty compact"><FileText/><h3>Belum ada {label}</h3><button className="sv124-primary" onClick={() => createDoc(type)}>Buat {single} pertama</button></div> : null}{hasMore && !loading ? <button className="sv124-load-more" onClick={loadMore}>Muat {CONTENT_PAGE_SIZE} berikutnya</button> : null}</section>
  </div>;
}

function AnalyticsView() {
  return <div className="sv124-page"><PageTitle title="Analitik" description="Fondasi analitik privasi-first. Angka tidak dibuat-buat sebelum event produksi terkumpul."/><div className="sv124-info-grid"><article><Activity/><b>Event pipeline</b><p>Page view, referrer, perangkat, dan konversi memerlukan collector serta kebijakan privasi.</p></article><article><BarChart3/><b>Data nyata</b><p>Dashboard menampilkan data teragregasi setelah schema analitik dan retention aktif.</p></article><article><ShieldCheck/><b>Tanpa pelacakan tersembunyi</b><p>Integrasi analytics eksternal harus melalui consent dan plugin yang dapat dicabut.</p></article></div></div>;
}

function MembersView({ site, setToast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setMembers([]);
    setError("");
    if (!site?.id) {
      setLoading(false);
      return () => { active = false; };
    }
    if (!supabase) {
      setLoading(false);
      setError("Koneksi anggota belum tersedia pada perangkat ini.");
      return () => { active = false; };
    }
    setLoading(true);
    supabase.from("site_members").select("user_id,role,joined_at,profiles(display_name,avatar_url)").eq("site_id", site.id).order("joined_at").then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) {
        setError(loadError.message || "Anggota belum dapat dimuat.");
        setToast?.("Anggota belum dapat dimuat");
      } else {
        setMembers(data || []);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [site?.id]);

  return <div className="sv124-page"><PageTitle title="Anggota & tim" description="Peran, akses, dan jejak kerja untuk situs aktif."/>
    {error ? <div className="sv124-error" role="alert">{error}</div> : null}
    {loading ? <Loading label="Memuat anggota…"/> : !members.length ? <div className="sv124-card sv124-unified-empty"><Users/><h2>Belum ada anggota tambahan</h2><p>Pemilik situs tetap aktif. Undangan dan peran anggota akan muncul di halaman ini setelah tersedia.</p></div> : <section className="sv124-card sv124-members">{members.map((member) => <article key={member.user_id}><span>{member.profiles?.display_name?.slice(0, 2).toUpperCase() || "U"}</span><div><b>{member.profiles?.display_name || "Pengguna"}</b><small>Bergabung {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(member.joined_at))}</small></div><i>{member.role}</i><button aria-label="Aksi anggota"><MoreHorizontal/></button></article>)}</section>}
  </div>;
}

function SettingsView({ site, setSite, profile, setProfile, user, setToast }) {
  const [siteDraft, setSiteDraft] = useState({ name: "", description: "", locale: "id-ID", timezone: "Asia/Jakarta" });
  const [profileDraft, setProfileDraft] = useState({ displayName: "", bio: "", website: "", avatarUrl: "", locale: "id-ID", timezone: "Asia/Jakarta" });
  const [saving, setSaving] = useState(false);
  useEffect(() => setSiteDraft({ name: site?.name || "", description: site?.description || "", locale: site?.locale || "id-ID", timezone: site?.timezone || "Asia/Jakarta" }), [site?.id]);
  useEffect(() => setProfileDraft({ displayName: profile?.display_name || "", bio: profile?.bio || "", website: profile?.website || "", avatarUrl: profile?.avatar_url || "", locale: profile?.locale || "id-ID", timezone: profile?.timezone || "Asia/Jakarta" }), [profile?.id]);
  const save = async () => {
    if (!site?.id || !user?.id || !supabase) return;
    setSaving(true);
    try {
      const [{ data: siteData, error: siteError }, profileData] = await Promise.all([
        supabase.from("sites").update({ name: siteDraft.name.slice(0, 100), description: siteDraft.description.slice(0, 1000), locale: siteDraft.locale, timezone: siteDraft.timezone }).eq("id", site.id).select("*").single(),
        updateUserProfile(user.id, profileDraft),
      ]);
      if (siteError) throw siteError;
      setSite((current) => ({ ...current, ...siteData }));
      setProfile(profileData);
      setToast("Profil dan pengaturan situs disimpan");
    } catch (error) {
      setToast(error.message || "Pengaturan belum tersimpan");
    } finally {
      setSaving(false);
    }
  };
  return <div className="sv124-page"><PageTitle title="Profil & pengaturan" description="Identitas pengguna dan situs aktif."/><div className="sv124-settings-grid"><section className="sv124-card"><h2>Profil</h2><label>Nama tampilan<input value={profileDraft.displayName} onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))}/></label><label>Biografi<textarea value={profileDraft.bio} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}/></label><label>Website<input value={profileDraft.website} onChange={(event) => setProfileDraft((current) => ({ ...current, website: event.target.value }))}/></label><label>URL avatar<input value={profileDraft.avatarUrl} onChange={(event) => setProfileDraft((current) => ({ ...current, avatarUrl: event.target.value }))}/></label></section><section className="sv124-card"><h2>Situs</h2><label>Nama situs<input value={siteDraft.name} onChange={(event) => setSiteDraft((current) => ({ ...current, name: event.target.value }))}/></label><label>Deskripsi<textarea value={siteDraft.description} onChange={(event) => setSiteDraft((current) => ({ ...current, description: event.target.value }))}/></label><label>Bahasa<select value={siteDraft.locale} onChange={(event) => setSiteDraft((current) => ({ ...current, locale: event.target.value }))}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option></select></label><label>Zona waktu<select value={siteDraft.timezone} onChange={(event) => setSiteDraft((current) => ({ ...current, timezone: event.target.value }))}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label></section></div><button className="sv124-primary sv124-save-settings" onClick={save} disabled={saving}><Check/>{saving ? "Menyimpan…" : "Simpan perubahan"}</button></div>;
}

export default function StudioStableV124({ onExit, user }) {
  const [docs, setDocs] = useState(loadLocalDocs);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(loadSidebarPreference);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [naraOpen, setNaraOpen] = useState(false);
  const [siteManager, setSiteManager] = useState(false);
  const [sites, setSites] = useState([]);
  const [site, setSite] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dataMode, setDataMode] = useState(user?.id && supabaseConfigured ? "connecting" : "local");
  const [contentLoading, setContentLoading] = useState(false);
  const [pageInfo, setPageInfo] = useState({ cursor: null, hasMore: false });
  const saveTimer = useRef(null);
  const pendingSave = useRef({ id: null, values: {} });
  const sequence = useRef(0);

  const active = docs.find((document) => document.id === activeId);
  const kind = view === "pages" ? "page" : "article";
  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Kreator";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NB";

  useEffect(() => { if (dataMode === "local") localStorage.setItem(LOCAL_STORE, JSON.stringify(docs)); }, [docs, dataMode]);
  useEffect(() => { try { localStorage.setItem(SIDEBAR_STORE, String(sidebarExpanded)); } catch { /* storage optional */ } }, [sidebarExpanded]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3600); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return undefined; }
    let cancelled = false;
    setDataMode("connecting");
    Promise.all([getOrCreatePrimarySite(user), listUserSites(user.id), getUserProfile(user.id)]).then(([primary, rows, userProfile]) => {
      if (cancelled) return;
      const selected = rows.find((item) => item.id === primary.id) || primary;
      setSite(selected);
      setSites(rows.length ? rows : [selected]);
      setProfile(userProfile);
      publishActiveSite(selected);
      setDataMode("cloud");
    }).catch((error) => {
      console.error("Studio bootstrap failed", error);
      if (!cancelled) { setDataMode("local"); setToast("Cloud belum dapat dijangkau; Studio memakai cadangan perangkat"); }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (dataMode !== "cloud" || !site?.id || !["home", "posts", "pages"].includes(view)) return undefined;
    const request = ++sequence.current;
    const timer = setTimeout(async () => {
      setContentLoading(true);
      try {
        const result = await listContentPage({ siteId: site.id, kind: view === "home" ? null : kind, search: view === "home" ? "" : query });
        if (request !== sequence.current) return;
        setDocs(result.documents);
        setPageInfo({ cursor: result.cursor, hasMore: result.hasMore });
      } catch (error) {
        console.error("Content load failed", error);
        if (request === sequence.current) setToast("Daftar konten belum dapat dimuat");
      } finally {
        if (request === sequence.current) setContentLoading(false);
      }
    }, query ? 260 : 0);
    return () => clearTimeout(timer);
  }, [dataMode, site?.id, view, kind, query]);

  const persistPatch = (id, values) => {
    if (dataMode !== "cloud") { setSaved(true); return; }
    pendingSave.current = pendingSave.current.id === id ? { id, values: { ...pendingSave.current.values, ...values } } : { id, values: { ...values } };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const pending = pendingSave.current;
      pendingSave.current = { id: null, values: {} };
      try { await updateContentDocument(pending.id, pending.values); setSaved(true); }
      catch (error) { console.error("Autosave failed", error); setSaved(false); setToast("Perubahan belum tersinkron—jangan tutup editor"); }
    }, 700);
  };

  const patch = (values) => {
    if (!activeId) return;
    setSaved(false);
    setDocs((all) => all.map((document) => document.id === activeId ? { ...document, ...values, updated: Date.now(), updatedAt: new Date().toISOString(), hydrated: true } : document));
    if (dataMode === "local") { clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => setSaved(true), 400); }
    else persistPatch(activeId, values);
  };

  const createDoc = async (type = "article") => {
    setContentLoading(true);
    try {
      let document;
      if (dataMode === "cloud" && site?.id && user?.id) document = await createContentDocument({ siteId: site.id, userId: user.id, type });
      else document = localDocument(type, type === "page" ? "Page tanpa judul" : "Post tanpa judul", type === "page" ? "<h1>Judul Page</h1><p>Bangun halaman profesional.</p>" : "<h1>Judul Post</h1><p>Mulai menulis ide Anda.</p>");
      setDocs((all) => [document, ...all]);
      setActiveId(document.id);
      setView("editor");
    } catch (error) {
      setToast(error.message || "Konten baru belum dapat dibuat");
    } finally { setContentLoading(false); }
  };

  const openDoc = async (id) => {
    const existing = docs.find((document) => document.id === id);
    if (!existing) return;
    if (existing.hydrated || dataMode !== "cloud") { setActiveId(id); setView("editor"); return; }
    setContentLoading(true);
    try { const complete = await getContentDocument(id); setDocs((all) => all.map((document) => document.id === id ? complete : document)); setActiveId(id); setView("editor"); }
    catch (error) { setToast(error.message || "Isi konten belum dapat dibuka"); }
    finally { setContentLoading(false); }
  };

  const removeDoc = async (id) => {
    if (!window.confirm("Hapus konten ini?")) return;
    try { if (dataMode === "cloud") await deleteContentDocument(id); setDocs((all) => all.filter((document) => document.id !== id)); setToast("Konten dihapus"); }
    catch (error) { setToast(error.message || "Konten belum dapat dihapus"); }
  };

  const publish = () => {
    if (!active) return;
    const status = active.status === "published" ? "draft" : "published";
    patch({ status, publishedAt: status === "published" ? new Date().toISOString() : "" });
    setToast(status === "published" ? `${active.type === "page" ? "Page" : "Post"} diterbitkan` : `${active.type === "page" ? "Page" : "Post"} menjadi draf`);
  };

  const loadMore = async () => {
    if (dataMode !== "cloud" || !site?.id || !pageInfo.cursor) return;
    setContentLoading(true);
    try {
      const result = await listContentPage({ siteId: site.id, kind, search: query, cursor: pageInfo.cursor });
      setDocs((all) => [...all, ...result.documents.filter((incoming) => !all.some((item) => item.id === incoming.id))]);
      setPageInfo({ cursor: result.cursor, hasMore: result.hasMore });
    } catch (error) { setToast(error.message || "Konten berikutnya belum dapat dimuat"); }
    finally { setContentLoading(false); }
  };

  const chooseView = (next) => {
    setView(next);
    if (["posts", "pages"].includes(next)) setQuery("");
    setMobileOpen(false);
  };

  const selectSite = (next) => {
    setActiveSiteId(next.id);
    setSite(next);
    publishActiveSite(next);
    setSiteManager(false);
    setDocs([]);
    setView("home");
    setToast(`Workspace ${next.name} aktif`);
  };

  const updateActiveSite = (next) => {
    setSite(next);
    setSites((all) => all.map((item) => item.id === next.id ? next : item));
    publishActiveSite(next);
  };

  if (view === "editor" && active) return <><ContentEditor doc={active} site={site} user={user} saved={saved} patch={patch} publish={publish} onBack={() => setView(active.type === "page" ? "pages" : "posts")} onOpenNara={() => setNaraOpen(true)} setToast={setToast}/><NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "editor", siteId: site?.id, siteName: site?.name, documentId: active.id, documentType: active.type, documentTitle: active.title, documentContent: (active.content || "").slice(0, 12000), metadata: active.metadata }}/></>;

  return <div className={`sv124-shell ${sidebarExpanded ? "expanded" : "collapsed"} ${mobileOpen ? "mobile-open" : ""}`} data-studio-release="v125">
    {toast ? <div className="sv124-toast"><Check/>{toast}</div> : null}
    {mobileOpen ? <button className="sv124-mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"/> : null}
    <aside className="sv124-side">
      <div className="sv124-logo"><span>n</span><b>Ngeblogging</b><button onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X/></button></div>
      <button className="sv124-new" onClick={() => createDoc("article")}><Plus/><span>Buat Post</span></button>
      <nav aria-label="Navigasi Studio">
        <NavButton active={view === "home"} onClick={() => chooseView("home")} icon={LayoutDashboard} label="Ringkasan"/>
        <NavButton active={view === "posts"} onClick={() => chooseView("posts")} icon={FileText} label="Posts"/>
        <NavButton active={view === "pages"} onClick={() => chooseView("pages")} icon={BookOpen} label="Pages"/>
        <NavButton active={view === "themes"} onClick={() => chooseView("themes")} icon={Palette} label="Tema"/>
        <NavButton active={view === "media"} onClick={() => chooseView("media")} icon={Image} label="Media"/>
        <NavButton active={view === "analytics"} onClick={() => chooseView("analytics")} icon={BarChart3} label="Analitik"/>
        <NavButton active={view === "members"} onClick={() => chooseView("members")} icon={Users} label="Anggota"/>
        <NavButton active={view === "comments"} onClick={() => chooseView("comments")} icon={MessageCircle} label="Komentar"/>
        <NavButton active={view === "domain"} onClick={() => chooseView("domain")} icon={Globe2} label="Domain"/>
        <NavButton active={view === "api-keys"} onClick={() => chooseView("api-keys")} icon={KeyRound} label="API Keys"/>
      </nav>
      <div className="sv124-account-footer">
        <NavButton active={view === "settings"} onClick={() => chooseView("settings")} icon={Settings} label="Pengaturan"/>
        <NavButton active={false} onClick={onExit} icon={LogOut} label="Keluar"/>
      </div>
    </aside>

    <main className="sv124-main">
      <header className="sv124-top">
        <button className="sv124-desktop-toggle" onClick={() => setSidebarExpanded((current) => !current)} aria-label={sidebarExpanded ? "Tutup sidebar" : "Buka sidebar"}><PanelLeftClose/></button>
        <button className="sv124-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu/></button>
        <button className="sv124-workspace" onClick={() => setSiteManager(true)}><span>{site?.name?.slice(0, 2).toUpperCase() || "NB"}</span><div><small>WORKSPACE</small><b>{site?.name || "Ngeblogging"}</b></div><ChevronDown/></button>
        <div className={`sv124-cloud ${dataMode}`}>{dataMode === "cloud" ? <Cloud/> : dataMode === "connecting" ? <LoaderCircle className="spin"/> : <CloudOff/>}<span>{dataMode === "cloud" ? "Cloud aktif" : dataMode === "connecting" ? "Menghubungkan" : "Mode perangkat"}</span></div>
        <div className="sv124-top-actions">{site?.slug ? <a href={`https://${site.slug}.ngeblogging.com`} target="_blank" rel="noreferrer" title="Lihat situs publik"><Eye/><span>Lihat situs</span></a> : null}<button aria-label="Cari"><Search/></button><button className="nara" onClick={() => setNaraOpen(true)}><Sparkles/><span>Tanya Nara</span></button><button className="sv124-avatar" onClick={() => chooseView("settings")}>{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : initials}</button></div>
      </header>

      {view === "home" ? <HomeView docs={docs} displayName={displayName} site={site} loading={contentLoading} createDoc={createDoc} openDoc={openDoc} openNara={() => setNaraOpen(true)}/> : null}
      {view === "posts" ? <ContentList docs={docs} type="article" query={query} setQuery={setQuery} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc} loading={contentLoading} hasMore={pageInfo.hasMore} loadMore={loadMore}/> : null}
      {view === "pages" ? <ContentList docs={docs} type="page" query={query} setQuery={setQuery} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc} loading={contentLoading} hasMore={pageInfo.hasMore} loadMore={loadMore}/> : null}
      {view === "themes" ? <Suspense fallback={<Loading label="Menyiapkan tema…"/>}><ThemeStudio setToast={setToast} site={site} user={user}/></Suspense> : null}
      {view === "media" ? <div className="sv124-page"><MediaLibrary site={site} user={user} setToast={setToast}/></div> : null}
      {view === "analytics" ? <AnalyticsView/> : null}
      {view === "members" ? <MembersView site={site} setToast={setToast}/> : null}
      {view === "comments" ? <CommentsPanelV124 site={site} setToast={setToast}/> : null}
      {view === "domain" ? <DomainPanelV124 site={site} sites={sites} onSiteUpdate={updateActiveSite} setToast={setToast}/> : null}
      {view === "api-keys" ? <ApiKeysPanelV124 setToast={setToast}/> : null}
      {view === "settings" ? <SettingsView site={site} setSite={updateActiveSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/> : null}
    </main>

    {siteManager ? <SiteManager sites={sites} activeSite={site} user={user} onSelect={selectSite} onClose={() => setSiteManager(false)} onCreated={(created) => { setSites((all) => [created, ...all]); selectSite(created); }} setToast={setToast}/> : null}
    <NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "studio", siteId: site?.id, siteName: site?.name, siteSlug: site?.slug, documentCount: docs.length, documentTitles: docs.slice(0, 20).map((document) => document.title) }}/>
  </div>;
}
