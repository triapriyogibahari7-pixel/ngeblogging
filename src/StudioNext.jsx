import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  Activity, BarChart3, BookOpen, Check, ChevronDown, Cloud, CloudOff,
  Eye, FilePlus2, FileText, Globe2, Image, LayoutDashboard, LoaderCircle, LogOut,
  KeyRound, MessageCircle, MoreHorizontal, Palette, PanelLeftClose, Plus, Search, Settings,
  ShieldCheck, Sparkles, Trash2, Users, X,
} from "lucide-react";
import NaraAssistant from "./NaraAssistant";
import ContentEditor from "./ContentEditor";
import MediaLibrary from "./MediaLibrary";
import DomainPanelV124 from "./DomainPanelV124.jsx";
import CommentsPanelV124 from "./CommentsPanelV124.jsx";
import ApiKeysPanel from "./ApiKeysPanel.jsx";
import {
  currentStudioDeviceMode,
  MODE_EVENT,
} from "./studio-device-mode-v138.js";
import { supabase, supabaseConfigured } from "./lib/supabase";
import {
  createUserSite, getOrCreatePrimarySite, getUserProfile, listUserSites,
  setActiveSiteId, updateUserProfile,
} from "./lib/studio-data";
import {
  CONTENT_PAGE_SIZE, createContentDocument, deleteContentDocument, getContentDocument,
  listContentPage, normalizeMetadata, normalizeSeo, publishContentDocument, slugify, updateContentDocument,
} from "./lib/content-data";
import "./studio-next.css";
import "./studio-recovery-v135.css";

const ThemeStudio = lazy(() => import("./ThemeStudio"));
const LOCAL_STORE = "ngeblogging-studio-v3";

function localDocument(type, title, content, status = "draft") {
  const metadata = normalizeMetadata({ commentsEnabled: type !== "page", showAuthor: type !== "page", showDate: type !== "page", showShare: type !== "page" }, type);
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
  localDocument("article", "Selamat datang di Ngeblogging", "<h1>Selamat datang di Ngeblogging</h1><p>Ini adalah Post pertama Anda. Gunakan editor profesional, metadata, SEO, media, dan preview sebelum menerbitkan.</p>", "published"),
  localDocument("page", "Tentang", "<h1>Tentang</h1><p>Bangun Page profesional untuk identitas, layanan, portofolio, kontak, atau landing page.</p>"),
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

function SiteManager({ sites, activeSite, user, onSelect, onClose, onCreated, setToast }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", slug: "", description: "", blueprint: "blog" });
  const create = async () => {
    setCreating(true);
    try {
      const site = await createUserSite({ userId: user.id, name: draft.name, slug: draft.slug || draft.name, description: draft.description, blueprint: draft.blueprint });
      onCreated(site);
      setToast("Situs dan subdomain baru dibuat");
    } catch (error) {
      setToast(error.message || "Situs belum dapat dibuat");
    } finally {
      setCreating(false);
    }
  };

  return <div className="sn-modal-layer">
    <button className="sn-modal-backdrop" onClick={onClose} aria-label="Tutup"/>
    <section className="sn-site-manager">
      <header><div><small>WORKSPACES</small><h2>Situs saya</h2></div><button onClick={onClose} aria-label="Tutup daftar situs"><X/></button></header>
      <div className="sn-sites-list">{sites.map((site) => <article key={site.id} className={site.id === activeSite?.id ? "active" : ""}>
        <span>{site.name.slice(0, 2).toUpperCase()}</span><div><b>{site.name}</b><small>{site.slug}.ngeblogging.com · {site.status === "active" ? "Publik" : "Draf"}</small></div>
        <button onClick={() => onSelect(site)}>{site.id === activeSite?.id ? <><Check/> Aktif</> : "Kelola"}</button>
        <a href={`https://${site.slug}.ngeblogging.com`} target="_blank" rel="noreferrer"><Eye/> Lihat</a>
      </article>)}</div>
      <div className="sn-create-site"><h3>Buat situs baru</h3><div>
        <label>Nama<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value, slug: draft.slug || slugify(event.target.value) })}/></label>
        <label>Subdomain<div className="sn-domain-input"><input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value) })}/><span>.ngeblogging.com</span></div></label>
        <label>Jenis<select value={draft.blueprint} onChange={(event) => setDraft({ ...draft, blueprint: event.target.value })}><option value="blog">Blog</option><option value="website">Website</option><option value="news">Portal berita</option><option value="portfolio">Portofolio</option><option value="forum">Forum</option><option value="community">Komunitas</option><option value="landing">Landing page</option><option value="profile">Profil</option><option value="knowledge">Knowledge base</option></select></label>
        <label className="wide">Deskripsi<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label>
      </div><button className="sn-primary" disabled={creating} onClick={create}>{creating ? <><LoaderCircle className="spin"/>Membuat…</> : <><Plus/>Buat situs</>}</button></div>
    </section>
  </div>;
}

export default function StudioNext({ onExit, user }) {
  const [docs, setDocs] = useState(loadLocalDocs);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(true);
  const [sidebar, setSidebar] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [deviceMode, setDeviceMode] = useState(currentStudioDeviceMode);
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
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  useEffect(() => {
    const sync = () => {
      const next = currentStudioDeviceMode();
      setDeviceMode(next);
      if (next === "large") setMobileSidebar(false);
    };
    window.addEventListener(MODE_EVENT, sync);
    window.addEventListener("pageshow", sync, { passive: true });
    sync();
    return () => {
      window.removeEventListener(MODE_EVENT, sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle("sn-mobile-sidebar-open", deviceMode === "small" && mobileSidebar);
    return () => document.body.classList.remove("sn-mobile-sidebar-open");
  }, [deviceMode, mobileSidebar]);
  useEffect(() => {
    if (deviceMode !== "small" || !mobileSidebar) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileSidebar(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [deviceMode, mobileSidebar]);

  useEffect(() => {
    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return; }
    let cancelled = false;
    setDataMode("connecting");
    Promise.all([getOrCreatePrimarySite(user), listUserSites(user.id), getUserProfile(user.id)]).then(([primary, siteRows, userProfile]) => {
      if (cancelled) return;
      setSite(primary); setSites(siteRows.length ? siteRows : [primary]); setProfile(userProfile); setDataMode("cloud");
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
        setDocs(result.documents); setPageInfo({ cursor: result.cursor, hasMore: result.hasMore });
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
      setDocs((all) => [document, ...all]); setActiveId(document.id); setView("editor"); setMobileSidebar(false);
    } catch (error) { console.error("Create content failed", error); setToast(error.message || "Konten baru belum dapat dibuat"); }
    finally { setContentLoading(false); }
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

  const publish = async () => {
    if (!active) return;
    const status = active.status === "published" ? "draft" : "published";
    const publishedAt = status === "published" ? new Date().toISOString() : "";
    const pending = pendingSave.current.id === active.id ? pendingSave.current.values : {};
    clearTimeout(saveTimer.current);
    pendingSave.current = { id: null, values: {} };
    setSaved(false);
    const nextValues = { ...pending, status, publishedAt };
    setDocs((all) => all.map((document) => document.id === active.id ? { ...document, ...nextValues, updated: Date.now(), updatedAt: new Date().toISOString(), hydrated: true } : document));
    try {
      if (dataMode === "cloud") await publishContentDocument(active.id, nextValues);
      setSaved(true);
      setToast(status === "published" ? `${active.type === "page" ? "Page" : "Post"} diterbitkan` : `${active.type === "page" ? "Page" : "Post"} menjadi draf`);
    } catch (error) {
      console.error("Publish failed", error);
      setSaved(false);
      setToast(error.message || `${active.type === "page" ? "Page" : "Post"} belum dapat diterbitkan`);
    }
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

  const chooseView = (next) => { setView(next); setMobileSidebar(false); if (["posts", "pages"].includes(next)) setQuery(""); };
  const selectSite = (next) => { setActiveSiteId(next.id); setSite(next); setSiteManager(false); setDocs([]); setView("home"); setToast(`Workspace ${next.name} aktif`); };
  const toggleSidebar = () => {
    if (currentStudioDeviceMode() === "small") setMobileSidebar((current) => !current);
    else setSidebar((current) => !current);
  };

  if (view === "editor" && active) return <>
    <ContentEditor doc={active} site={site} user={user} saved={saved} patch={patch} publish={publish} onBack={() => setView(active.type === "page" ? "pages" : "posts")} onOpenNara={() => setNaraOpen(true)} setToast={setToast}/>
    <NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "editor", siteId: site?.id, siteName: site?.name, documentId: active.id, documentType: active.type, documentTitle: active.title, documentContent: (active.content || "").slice(0, 12000), metadata: active.metadata }}/>
  </>;

  return <div className="sn-shell" data-ui-release="stable-v138" data-navigation-owner="react-v138" data-navigation-release="v138" data-device-mode={deviceMode}>
    {toast && <div className="sn-toast"><Check/>{toast}</div>}
    {mobileSidebar && <button className="sn-side-backdrop" onClick={() => setMobileSidebar(false)} aria-label="Tutup menu Studio"/>}
    <aside id="ngeblogging-studio-sidebar" className={`${sidebar ? "sn-side" : "sn-side collapsed"}${mobileSidebar ? " mobile-open" : ""}`}>
      <div className="sn-logo"><span className="sn-logo-mark" aria-label="n."><strong>n</strong><i>.</i></span><b>Ngeblogging</b><button className="sn-side-close" onClick={() => setMobileSidebar(false)} aria-label="Tutup menu"><X/></button></div>
      <button className="sn-new" onClick={() => createDoc("article")}><Plus/><span>Buat Post</span></button>
      <nav aria-label="Navigasi Studio">
        <button className={view === "home" ? "active" : ""} onClick={() => chooseView("home")}><LayoutDashboard/><span>Ringkasan</span></button>
        <button className={view === "posts" ? "active" : ""} onClick={() => chooseView("posts")}><FileText/><span>Posts</span></button>
        <button className={view === "pages" ? "active" : ""} onClick={() => chooseView("pages")}><BookOpen/><span>Pages</span></button>
        <button className={view === "themes" ? "active" : ""} onClick={() => chooseView("themes")}><Palette/><span>Tema</span></button>
        <button className={view === "media" ? "active" : ""} onClick={() => chooseView("media")}><Image/><span>Media</span></button>
        <button className={view === "analytics" ? "active" : ""} onClick={() => chooseView("analytics")}><BarChart3/><span>Analitik</span></button>
        <button className={view === "members" ? "active" : ""} onClick={() => chooseView("members")}><Users/><span>Anggota</span></button>
        <button className={view === "comments" ? "active" : ""} onClick={() => chooseView("comments")}><MessageCircle/><span>Komentar</span></button>
        <button className={view === "domain" ? "active" : ""} onClick={() => chooseView("domain")}><Globe2/><span>Domain</span></button>
        <button className={view === "api-keys" ? "active" : ""} onClick={() => chooseView("api-keys")}><KeyRound/><span>API Keys</span></button>
      </nav>
      <div className="sn-account-footer" data-sidebar-footer-release="v135">
        <button className={`sn-account-settings-v135 ${view === "settings" ? "active" : ""}`} onClick={() => chooseView("settings")}><Settings/><span>Pengaturan</span></button>
        <button className="sn-account-logout-v135" onClick={onExit}><LogOut/><span>Keluar</span></button>
      </div>
    </aside>

    <main className="sn-main">
      <header className="sn-top">
        <button className="sn-icon sn-sidebar-toggle" onClick={toggleSidebar} aria-label={deviceMode === "small" ? (mobileSidebar ? "Tutup menu Studio" : "Buka menu Studio") : (sidebar ? "Ciutkan menu Studio" : "Perluas menu Studio")} aria-expanded={deviceMode === "small" ? mobileSidebar : sidebar} aria-controls="ngeblogging-studio-sidebar">
          <span className="sn-mobile-menu-mark" aria-hidden="true"><strong>n</strong><i>.</i></span>
          <PanelLeftClose className="sn-desktop-sidebar-icon"/>
        </button>
        <button className="sn-workspace" onClick={() => setSiteManager(true)}><span>{site?.name?.slice(0, 2).toUpperCase() || "NB"}</span><div><small>WORKSPACE</small><b>{site?.name || "Ngeblogging"}</b></div><ChevronDown/></button>
        <div className={`sn-cloud ${dataMode}`}>{dataMode === "cloud" ? <Cloud/> : dataMode === "connecting" ? <LoaderCircle className="spin"/> : <CloudOff/>}<span>{dataMode === "cloud" ? "Cloud aktif" : dataMode === "connecting" ? "Menghubungkan" : "Mode perangkat"}</span></div>
        <div className="sn-top-actions">
          {site?.slug && <a className="sn-view-site" href={`https://${site.slug}.ngeblogging.com`} target="_blank" rel="noreferrer" title="Lihat situs publik"><Eye/><span>Lihat situs</span></a>}
          <button aria-label="Cari"><Search/></button>
          <button className="sn-nara-button" onClick={() => setNaraOpen(true)}><Sparkles/> Tanya Nara</button>
          <button className="sn-avatar" onClick={() => chooseView("settings")} aria-label="Buka pengaturan profil">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : initials}</button>
        </div>
      </header>

      {view === "home" && <HomeView docs={docs} displayName={displayName} site={site} loading={contentLoading} createDoc={createDoc} openDoc={openDoc} openNara={() => setNaraOpen(true)}/>} 
      {view === "posts" && <ContentList docs={docs} type="article" query={query} setQuery={setQuery} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc} loading={contentLoading} hasMore={pageInfo.hasMore} loadMore={loadMore}/>} 
      {view === "pages" && <ContentList docs={docs} type="page" query={query} setQuery={setQuery} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc} loading={contentLoading} hasMore={pageInfo.hasMore} loadMore={loadMore}/>} 
      {view === "themes" && <Suspense fallback={<Loading label="Menyiapkan 100 tema…"/>}><ThemeStudio setToast={setToast} site={site} user={user}/></Suspense>} 
      {view === "media" && <div className="sn-view-pad"><MediaLibrary site={site} user={user} setToast={setToast}/></div>} 
      {view === "analytics" && <AnalyticsView/>} 
      {view === "members" && <MembersView site={site} user={user} profile={profile} setToast={setToast}/>} 
      {view === "comments" && <CommentsPanelV124 site={site} setToast={setToast}/>} 
      {view === "domain" && <DomainPanelV124 site={site} sites={sites} onSiteUpdate={setSite} setToast={setToast}/>} 
      {view === "api-keys" && <ApiKeysPanel setToast={setToast}/>} 
      {view === "settings" && <SettingsView site={site} setSite={setSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} 
    </main>

    {siteManager && <SiteManager sites={sites} activeSite={site} user={user} onSelect={selectSite} onClose={() => setSiteManager(false)} onCreated={(created) => { setSites((all) => [created, ...all]); selectSite(created); }} setToast={setToast}/>} 
    <NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "studio", siteId: site?.id, siteName: site?.name, siteSlug: site?.slug, documentCount: docs.length, documentTitles: docs.slice(0, 20).map((document) => document.title) }}/>
  </div>;
}

function Loading({ label }) { return <div className="sn-loading"><LoaderCircle className="spin"/>{label}</div>; }
function PageTitle({ title, description, action }) { return <header className="sn-page-title"><div><small>NGEBLOGGING STUDIO</small><h1>{title}</h1><p>{description}</p></div>{action}</header>; }

function HomeView({ docs, displayName, site, loading, createDoc, openDoc, openNara }) {
  const published = docs.filter((doc) => doc.status === "published").length;
  const pages = docs.filter((doc) => doc.type === "page").length;
  const posts = docs.filter((doc) => doc.type !== "page").length;
  return <div className="sn-view-pad"><div className="sn-welcome"><div><small>SELAMAT DATANG</small><h1>{displayName}, ruang kerja Anda siap.</h1><p>{site?.slug ? `${site.slug}.ngeblogging.com` : "Pilih situs aktif untuk mulai."}</p></div><div>{site?.slug && <a className="sn-secondary-link" href={`https://${site.slug}.ngeblogging.com`} target="_blank" rel="noreferrer"><Eye/> Lihat situs</a>}<button onClick={() => createDoc("page")}><BookOpen/> Buat Page</button><button className="sn-primary" onClick={() => createDoc("article")}><FilePlus2/> Buat Post</button></div></div><div className="sn-metrics"><article><span>Posts</span><b>{posts}</b><small>Konten kronologis</small></article><article><span>Pages</span><b>{pages}</b><small>Halaman tetap</small></article><article><span>Terbit</span><b>{published}</b><small>Dapat dibaca publik</small></article><article><span>SEO tenant</span><b>Edge</b><small>Sitemap, feed, schema</small></article></div><div className="sn-home-grid"><section><header><h2>Konten terbaru</h2>{loading && <LoaderCircle className="spin"/>}</header>{docs.slice(0, 6).map((doc) => <button key={doc.id} onClick={() => openDoc(doc.id)}><span><FileText/></span><div><b>{doc.title}</b><small>{doc.type === "page" ? "Page" : "Post"} · {relativeTime(doc.updated || doc.updatedAt)}</small></div><i className={doc.status}>{doc.status}</i></button>)}{!docs.length && !loading && <p>Belum ada konten.</p>}</section><aside><Sparkles/><small>NARA AI</small><h2>Bangun lebih cepat, tetap aman.</h2><p>Gunakan projects, memory, plugins, dan generator gambar dengan konfirmasi untuk tindakan penting.</p><button onClick={openNara}>Buka Nara</button></aside></div></div>;
}

function ContentList({ docs, type, query, setQuery, createDoc, openDoc, removeDoc, loading, hasMore, loadMore }) {
  const label = type === "page" ? "Pages" : "Posts";
  const single = type === "page" ? "Page" : "Post";
  return <div className="sn-view-pad"><PageTitle title={label} description={type === "page" ? "Kelola halaman tetap, hierarki, template, menu, dan SEO." : "Kelola tulisan kronologis, kategori, tags, jadwal, lokasi, dan SEO."} action={<button className="sn-primary" onClick={() => createDoc(type)}><FilePlus2/> Buat {single}</button>}/><section className="sn-content-card"><div className="sn-content-tools"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari ${label.toLowerCase()}…`}/></label><span>{docs.length} hasil</span></div><div className="sn-table-head"><span>Judul</span><span>Status</span><span>Diperbarui</span><span/></div>{docs.map((doc) => <div className="sn-doc-row" key={doc.id}><button onClick={() => openDoc(doc.id)}><span><FileText/></span><div><b>{doc.title}</b><small>/{doc.slug}</small></div></button><i className={doc.status}>{doc.status}</i><time>{relativeTime(doc.updated || doc.updatedAt)}</time><button className="trash" onClick={() => removeDoc(doc.id)}><Trash2/></button></div>)}{loading && <Loading label={`Memuat ${label.toLowerCase()}…`}/>} {!docs.length && !loading && <div className="sn-empty"><FileText/><h3>Belum ada {label}</h3><button className="sn-primary" onClick={() => createDoc(type)}>Buat {single} pertama</button></div>} {hasMore && !loading && <button className="sn-load-more" onClick={loadMore}>Muat {CONTENT_PAGE_SIZE} berikutnya</button>}</section></div>;
}

function AnalyticsView() { return <div className="sn-view-pad"><PageTitle title="Analitik" description="Fondasi analitik privasi-first. Angka tidak akan dibuat-buat sebelum event produksi terkumpul."/><div className="sn-info-grid"><article><Activity/><b>Event pipeline</b><p>Page view, referrer, perangkat, dan konversi memerlukan collector serta kebijakan privasi.</p></article><article><BarChart3/><b>Data nyata</b><p>Dashboard akan menampilkan data teragregasi setelah schema analitik dan retention aktif.</p></article><article><ShieldCheck/><b>Tanpa pelacakan tersembunyi</b><p>Integrasi analytics eksternal harus melalui consent dan plugin yang dapat dicabut.</p></article></div></div>; }

function MembersView({ site, user, profile, setToast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!site?.id || !supabase) { setMembers([]); setLoading(false); return () => { cancelled = true; }; }
    supabase.from("site_members").select("user_id,role,joined_at,profiles(display_name,avatar_url)").eq("site_id", site.id).order("joined_at").then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setToast("Anggota belum dapat dimuat"); setMembers([]); }
      else setMembers(data || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [site?.id, setToast]);

  const ownerName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Pemilik situs";
  const additionalMembers = members.filter((member) => member.user_id !== user?.id);
  return <div className="sn-view-pad"><PageTitle title="Anggota & tim" description="Peran, akses, dan jejak kerja untuk situs aktif."/>{loading ? <Loading label="Memuat anggota…"/> : <section className="sn-members"><article className="owner"><span>{ownerName.slice(0, 2).toUpperCase()}</span><div><b>{ownerName}</b><small>Pemilik workspace aktif</small></div><i>owner</i><button aria-label="Opsi pemilik"><MoreHorizontal/></button></article>{additionalMembers.map((member) => <article key={member.user_id}><span>{member.profiles?.display_name?.slice(0, 2).toUpperCase() || "U"}</span><div><b>{member.profiles?.display_name || "Pengguna"}</b><small>{member.joined_at ? `Bergabung ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(member.joined_at))}` : "Anggota situs"}</small></div><i>{member.role}</i><button aria-label="Opsi anggota"><MoreHorizontal/></button></article>)}{!additionalMembers.length && <div className="sn-members-empty"><Users/><div><b>Belum ada anggota tambahan</b><p>Halaman tetap tampil dan siap ketika undangan anggota diaktifkan.</p></div></div>}</section>}</div>;
}

function SettingsView({ site, setSite, profile, setProfile, user, setToast }) {
  const [siteDraft, setSiteDraft] = useState({ name: site?.name || "", description: site?.description || "", locale: site?.locale || "id-ID", timezone: site?.timezone || "Asia/Jakarta" });
  const [profileDraft, setProfileDraft] = useState({ displayName: profile?.display_name || "", bio: profile?.bio || "", website: profile?.website || "", avatarUrl: profile?.avatar_url || "", locale: profile?.locale || "id-ID", timezone: profile?.timezone || "Asia/Jakarta" });
  useEffect(() => setSiteDraft({ name: site?.name || "", description: site?.description || "", locale: site?.locale || "id-ID", timezone: site?.timezone || "Asia/Jakarta" }), [site?.id]);
  useEffect(() => setProfileDraft({ displayName: profile?.display_name || "", bio: profile?.bio || "", website: profile?.website || "", avatarUrl: profile?.avatar_url || "", locale: profile?.locale || "id-ID", timezone: profile?.timezone || "Asia/Jakarta" }), [profile?.id]);
  const save = async () => {
    try {
      const [{ data: siteData, error: siteError }, profileData] = await Promise.all([
        supabase.from("sites").update({ name: siteDraft.name.slice(0, 100), description: siteDraft.description.slice(0, 1000), locale: siteDraft.locale, timezone: siteDraft.timezone }).eq("id", site.id).select("*").single(),
        updateUserProfile(user.id, profileDraft),
      ]);
      if (siteError) throw siteError;
      setSite((current) => ({ ...current, ...siteData })); setProfile(profileData); setToast("Profil dan pengaturan situs disimpan");
    } catch (error) { setToast(error.message || "Pengaturan belum tersimpan"); }
  };
  return <div className="sn-view-pad"><PageTitle title="Profil & pengaturan" description="Identitas pengguna dan situs aktif."/><div className="sn-settings-grid"><section><h2>Profil</h2><label>Nama tampilan<input value={profileDraft.displayName} onChange={(event) => setProfileDraft({ ...profileDraft, displayName: event.target.value })}/></label><label>Biografi<textarea value={profileDraft.bio} onChange={(event) => setProfileDraft({ ...profileDraft, bio: event.target.value })}/></label><label>Website<input value={profileDraft.website} onChange={(event) => setProfileDraft({ ...profileDraft, website: event.target.value })}/></label><label>URL avatar<input value={profileDraft.avatarUrl} onChange={(event) => setProfileDraft({ ...profileDraft, avatarUrl: event.target.value })}/></label></section><section><h2>Situs</h2><label>Nama situs<input value={siteDraft.name} onChange={(event) => setSiteDraft({ ...siteDraft, name: event.target.value })}/></label><label>Deskripsi<textarea value={siteDraft.description} onChange={(event) => setSiteDraft({ ...siteDraft, description: event.target.value })}/></label><label>Bahasa<select value={siteDraft.locale} onChange={(event) => setSiteDraft({ ...siteDraft, locale: event.target.value })}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option></select></label><label>Zona waktu<select value={siteDraft.timezone} onChange={(event) => setSiteDraft({ ...siteDraft, timezone: event.target.value })}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label></section></div><button className="sn-primary sn-save-settings" onClick={save}><Check/> Simpan perubahan</button></div>;
}
