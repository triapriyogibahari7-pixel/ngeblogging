import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowLeft,
  BarChart3, Bold, BookOpen, Check, ChevronDown, Cloud, CloudOff,
  Eye, FilePlus2, FileText, Globe2, Heading1, Heading2, Highlighter,
  Image, Italic, LayoutDashboard, Link, List, ListOrdered, LoaderCircle,
  LogOut, Menu, MessageSquare, MoreHorizontal, Palette, PanelLeftClose,
  PenLine, Plus, Quote, Redo2, Search, Send, Settings, ShieldCheck,
  Sparkles, Strikethrough, Table2, Trash2, Underline, Undo2, Upload,
  Users, X,
} from "lucide-react";
import NaraAssistant from "./NaraAssistant";
import { supabaseConfigured } from "./lib/supabase";
import {
  CONTENT_PAGE_SIZE,
  createContentDocument,
  deleteContentDocument,
  getContentDocument,
  getOrCreatePrimarySite,
  listContentPage,
  setSitePublication,
  updateContentDocument,
} from "./lib/studio-data";
import "./studio-pro.css";

const ThemeStudio = lazy(() => import("./ThemeStudio"));

const STORE = "ngeblogging-studio-v1";
const starter = [
  { id: crypto.randomUUID(), type: "article", title: "Selamat datang di Ngeblogging", slug: "selamat-datang", status: "published", visibility: "public", hydrated: true, updated: Date.now(), content: "<h1>Selamat datang di Ngeblogging</h1><p>Ini adalah artikel pertama Anda. Studio ini menyimpan perubahan secara otomatis pada perangkat ini.</p><h2>Mulai berkarya</h2><p>Pilih teks, gunakan ribbon, lalu terbitkan ketika tulisan sudah siap.</p>" },
  { id: crypto.randomUUID(), type: "page", title: "Tentang", slug: "tentang", status: "draft", visibility: "public", hydrated: true, updated: Date.now() - 3600000, content: "<h1>Tentang kami</h1><p>Ceritakan tujuan, nilai, dan perjalanan Anda di halaman ini.</p>" },
];

function loadDocs() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE));
    return Array.isArray(stored) && stored.length ? stored : starter;
  } catch {
    return starter;
  }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function command(name, value) {
  document.execCommand(name, false, value);
}

function relativeTime(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - value) / 60000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return String(minutes) + " menit lalu";
  if (minutes < 1440) return String(Math.floor(minutes / 60)) + " jam lalu";
  return String(Math.floor(minutes / 1440)) + " hari lalu";
}

export default function Studio({ onExit, user }) {
  const [docs, setDocs] = useState(loadDocs);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("article");
  const [saved, setSaved] = useState(true);
  const [sidebar, setSidebar] = useState(true);
  const [toast, setToast] = useState("");
  const [naraOpen, setNaraOpen] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const [site, setSite] = useState(null);
  const [dataMode, setDataMode] = useState(user?.id && supabaseConfigured ? "connecting" : "local");
  const [contentLoading, setContentLoading] = useState(false);
  const [pageInfo, setPageInfo] = useState({ cursor: null, hasMore: false });
  const editor = useRef(null);
  const saveTimer = useRef(null);
  const pendingSave = useRef({ id: null, values: {} });
  const requestSequence = useRef(0);

  const active = docs.find((document) => document.id === activeId);
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "John";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NB";

  useEffect(() => {
    if (dataMode === "local") localStorage.setItem(STORE, JSON.stringify(docs));
  }, [docs, dataMode]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!user?.id || !supabaseConfigured) {
      setDataMode("local");
      return undefined;
    }
    let cancelled = false;
    setDataMode("connecting");
    getOrCreatePrimarySite(user).then((primarySite) => {
      if (cancelled) return;
      setSite(primarySite);
      setDataMode("cloud");
    }).catch((error) => {
      console.error("Studio bootstrap failed", error);
      if (!cancelled) {
        setDataMode("local");
        setToast("Cloud belum dapat dijangkau; Studio memakai cadangan perangkat");
      }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (dataMode !== "cloud" || !site?.id || !["home", "content"].includes(view)) return undefined;
    const sequence = ++requestSequence.current;
    const timer = setTimeout(async () => {
      setContentLoading(true);
      try {
        const result = await listContentPage({
          siteId: site.id,
          kind: view === "content" ? kind : null,
          search: view === "content" ? query : "",
        });
        if (sequence !== requestSequence.current) return;
        setDocs(result.documents);
        setPageInfo({ cursor: result.cursor, hasMore: result.hasMore });
      } catch (error) {
        console.error("Content page load failed", error);
        if (sequence === requestSequence.current) setToast("Daftar konten belum dapat dimuat");
      } finally {
        if (sequence === requestSequence.current) setContentLoading(false);
      }
    }, query ? 280 : 0);
    return () => clearTimeout(timer);
  }, [dataMode, site?.id, view, kind, query]);

  useEffect(() => () => {
    clearTimeout(saveTimer.current);
  }, []);

  const shown = useMemo(() => {
    if (dataMode === "cloud") return docs;
    return docs.filter((document) => document.type === kind && document.title.toLowerCase().includes(query.toLowerCase()));
  }, [docs, kind, query, dataMode]);

  const loadMore = async () => {
    if (dataMode !== "cloud" || !site?.id || !pageInfo.hasMore || !pageInfo.cursor) return;
    setContentLoading(true);
    try {
      const result = await listContentPage({
        siteId: site.id,
        kind,
        search: query,
        cursor: pageInfo.cursor,
      });
      setDocs((current) => [...current, ...result.documents.filter((incoming) => !current.some((item) => item.id === incoming.id))]);
      setPageInfo({ cursor: result.cursor, hasMore: result.hasMore });
    } catch (error) {
      console.error("Load more failed", error);
      setToast("Halaman berikutnya belum dapat dimuat");
    } finally {
      setContentLoading(false);
    }
  };

  const persistPatch = (documentId, values) => {
    if (dataMode !== "cloud") {
      setSaved(true);
      return;
    }
    pendingSave.current = pendingSave.current.id === documentId
      ? { id: documentId, values: { ...pendingSave.current.values, ...values } }
      : { id: documentId, values: { ...values } };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const pending = pendingSave.current;
      pendingSave.current = { id: null, values: {} };
      try {
        await updateContentDocument(pending.id, pending.values);
        setSaved(true);
      } catch (error) {
        console.error("Autosave failed", error);
        setSaved(false);
        setToast("Perubahan belum tersinkron—jangan tutup editor");
      }
    }, 700);
  };

  const patch = (values) => {
    if (!activeId) return;
    setSaved(false);
    setDocs((all) => all.map((document) => document.id === activeId
      ? { ...document, ...values, hydrated: true, updated: Date.now() }
      : document));
    if (dataMode === "local") {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaved(true), 420);
    } else {
      persistPatch(activeId, values);
    }
  };

  const createDoc = async (type = kind) => {
    setContentLoading(true);
    try {
      let document;
      if (dataMode === "cloud" && site?.id && user?.id) {
        document = await createContentDocument({ siteId: site.id, userId: user.id, type });
      } else {
        const title = type === "page" ? "Halaman tanpa judul" : "Artikel tanpa judul";
        document = {
          id: crypto.randomUUID(),
          type,
          title,
          slug: slugify(title) + "-" + Math.random().toString(36).slice(2, 8),
          status: "draft",
          visibility: "public",
          hydrated: true,
          updated: Date.now(),
          content: "<h1>Mulai menulis…</h1><p>Tuangkan ide Anda di sini.</p>",
        };
      }
      setDocs((all) => [document, ...all]);
      setActiveId(document.id);
      setView("editor");
    } catch (error) {
      console.error("Document creation failed", error);
      setToast("Dokumen baru belum dapat dibuat");
    } finally {
      setContentLoading(false);
    }
  };

  const openDoc = async (id) => {
    const existing = docs.find((document) => document.id === id);
    if (!existing) return;
    if (existing.hydrated || dataMode !== "cloud") {
      setActiveId(id);
      setView("editor");
      return;
    }
    setContentLoading(true);
    try {
      const complete = await getContentDocument(id);
      setDocs((all) => all.map((document) => document.id === id ? complete : document));
      setActiveId(id);
      setView("editor");
    } catch (error) {
      console.error("Document load failed", error);
      setToast("Isi dokumen belum dapat dibuka");
    } finally {
      setContentLoading(false);
    }
  };

  const removeDoc = async (id) => {
    if (!window.confirm("Pindahkan dokumen ini ke sampah?")) return;
    try {
      if (dataMode === "cloud") await deleteContentDocument(id);
      setDocs((all) => all.filter((document) => document.id !== id));
      setToast("Dokumen dipindahkan ke sampah");
    } catch (error) {
      console.error("Document delete failed", error);
      setToast("Dokumen belum dapat dihapus");
    }
  };

  const publish = () => {
    if (!active) return;
    const status = active.status === "published" ? "draft" : "published";
    patch({ status, publishedAt: status === "published" ? new Date().toISOString() : null });
    setToast(status === "published" ? "Artikel berhasil diterbitkan" : "Dikembalikan menjadi draf");
  };

  const chooseView = (nextView, nextKind = null) => {
    if (nextKind) setKind(nextKind);
    setView(nextView);
    setMobileMore(false);
  };

  if (view === "editor" && active) {
    return (
      <>
        <Editor
          doc={active}
          saved={saved}
          patch={patch}
          onBack={() => setView("content")}
          publish={publish}
          editor={editor}
          toast={toast}
          onOpenNara={() => setNaraOpen(true)}
        />
        <NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "editor", documentTitle: active.title, documentContent: (active.content || "").slice(0, 12000) }} />
      </>
    );
  }

  return (
    <div className="studio-shell">
      {toast && <div className="studio-toast"><Check size={16}/>{toast}</div>}
      <aside className={sidebar ? "studio-side" : "studio-side collapsed"}>
        <div className="studio-logo">n<span>.</span><b>ngeblogging</b></div>
        <button className="new-doc" onClick={() => createDoc("article")}><Plus/> <span>Tulis baru</span></button>
        <nav>
          <button className={view === "home" ? "active" : ""} onClick={() => chooseView("home")}><LayoutDashboard/><span>Ringkasan</span></button>
          <button className={view === "content" && kind === "article" ? "active" : ""} onClick={() => chooseView("content", "article")}><FileText/><span>Artikel</span></button>
          <button className={view === "content" && kind === "page" ? "active" : ""} onClick={() => chooseView("content", "page")}><BookOpen/><span>Halaman</span></button>
          <button onClick={() => chooseView("themes")} className={view === "themes" ? "active" : ""}><Palette/><span>Theme Studio</span></button>
          <button onClick={() => chooseView("media")} className={view === "media" ? "active" : ""}><Image/><span>Media</span></button>
          <button onClick={() => chooseView("analytics")} className={view === "analytics" ? "active" : ""}><BarChart3/><span>Analitik</span></button>
          <button onClick={() => chooseView("members")} className={view === "members" ? "active" : ""}><Users/><span>Anggota</span></button>
          <button onClick={() => chooseView("domain")} className={view === "domain" ? "active" : ""}><Globe2/><span>Domain</span></button>
        </nav>
        <div className="side-bottom">
          <button onClick={() => chooseView("settings")} className={view === "settings" ? "active" : ""}><Settings/><span>Pengaturan</span></button>
          <button onClick={onExit}><LogOut/><span>Keluar studio</span></button>
        </div>
      </aside>

      <main className="studio-main">
        <header className="studio-top">
          <button className="icon-button" onClick={() => setSidebar(!sidebar)} aria-label="Ubah sidebar"><PanelLeftClose/></button>
          <div className="workspace-switch"><span>NB</span><b>{site?.name || "Ngeblogging Utama"}</b><ChevronDown/></div>
          <div className={"studio-data-status " + dataMode}>
            {dataMode === "cloud" ? <Cloud/> : dataMode === "connecting" ? <LoaderCircle className="spin"/> : <CloudOff/>}
            <span>{dataMode === "cloud" ? "Cloud aktif" : dataMode === "connecting" ? "Menghubungkan" : "Mode perangkat"}</span>
          </div>
          <div className="top-actions"><button aria-label="Cari"><Search/></button><button className="nara-mini" onClick={() => setNaraOpen(true)}><Sparkles/> Tanya Nara</button><span className="avatar-lg" title={user?.email || displayName}>{initials}</span></div>
        </header>

        {view === "home" && <Home docs={docs} createDoc={createDoc} openDoc={openDoc} displayName={displayName} onOpenNara={() => setNaraOpen(true)} loading={contentLoading}/>}
        {view === "content" && <Content docs={shown} kind={kind} query={query} setQuery={setQuery} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc} loading={contentLoading} hasMore={pageInfo.hasMore} loadMore={loadMore}/>}
        {view === "themes" && <Suspense fallback={<div className="studio-content theme-loading"><LoaderCircle className="spin"/><b>Menyiapkan Theme Studio Pro…</b></div>}><ThemeStudio setToast={setToast} site={site} user={user}/></Suspense>}
        {view === "media" && <Media setToast={setToast}/>}
        {view === "analytics" && <Analytics/>}
        {view === "members" && <Members setToast={setToast}/>}
        {view === "domain" && <Domain setToast={setToast} site={site} setSite={setSite}/>}
        {view === "settings" && <SettingsView setToast={setToast} site={site}/>}
      </main>

      <nav className="studio-mobile-nav" aria-label="Navigasi Studio">
        <button className={view === "home" ? "active" : ""} onClick={() => chooseView("home")}><LayoutDashboard/><span>Ringkasan</span></button>
        <button className={view === "content" ? "active" : ""} onClick={() => chooseView("content", "article")}><FileText/><span>Konten</span></button>
        <button className="mobile-create" onClick={() => createDoc("article")} aria-label="Tulis artikel"><Plus/></button>
        <button className={view === "themes" ? "active" : ""} onClick={() => chooseView("themes")}><Palette/><span>Tema</span></button>
        <button className={mobileMore ? "active" : ""} onClick={() => setMobileMore(true)}><Menu/><span>Lainnya</span></button>
      </nav>

      {mobileMore && (
        <div className="studio-mobile-sheet-layer">
          <button className="studio-mobile-sheet-backdrop" onClick={() => setMobileMore(false)} aria-label="Tutup menu"/>
          <section className="studio-mobile-sheet">
            <header><div><small>RUANG KERJA</small><h2>{site?.name || "Ngeblogging Utama"}</h2></div><button onClick={() => setMobileMore(false)}><X/></button></header>
            <div>
              <button onClick={() => chooseView("content", "page")}><BookOpen/><span><b>Halaman</b><small>Kelola halaman situs</small></span></button>
              <button onClick={() => chooseView("media")}><Image/><span><b>Media</b><small>Gambar, video, dan dokumen</small></span></button>
              <button onClick={() => chooseView("analytics")}><BarChart3/><span><b>Analitik</b><small>Performa dan pertumbuhan</small></span></button>
              <button onClick={() => chooseView("members")}><Users/><span><b>Anggota</b><small>Tim dan hak akses</small></span></button>
              <button onClick={() => chooseView("domain")}><Globe2/><span><b>Domain</b><small>Publikasi dan custom domain</small></span></button>
              <button onClick={() => chooseView("settings")}><Settings/><span><b>Pengaturan</b><small>Identitas dan keamanan</small></span></button>
            </div>
            <button className="mobile-signout" onClick={onExit}><LogOut/> Keluar Studio</button>
          </section>
        </div>
      )}
      <NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "studio", documentCount: docs.length, documentTitles: docs.slice(0, 20).map((document) => document.title) }} />
    </div>
  );
}

function PageTitle({ title, children, action }) {
  return <div className="content-title"><div><h1>{title}</h1><p>{children}</p></div>{action}</div>;
}

function Media({ setToast }) {
  return <div className="studio-content"><PageTitle title="Pustaka media" action={<button className="blue-button" onClick={() => setToast("Pilih berkas untuk diunggah ke pustaka media situs")}><Upload/> Unggah media</button>}>Kelola gambar, video, audio, dan dokumen situs Anda.</PageTitle><div className="upload-zone"><Upload/><h3>Tarik media ke sini</h3><p>Gambar dioptimalkan otomatis dan alt text dapat dibuat oleh Nara.</p><button onClick={() => setToast("Pemilih media siap digunakan")}>Pilih berkas</button></div><div className="info-grid"><article><Image/><b>Optimasi otomatis</b><p>WebP/AVIF, ukuran responsif, dan lazy loading.</p></article><article><Sparkles/><b>Alt text cerdas</b><p>Nara membantu aksesibilitas dan SEO gambar.</p></article><article><ShieldCheck/><b>Media aman</b><p>Hak akses dan pemindaian tipe berkas.</p></article></div></div>;
}

function Analytics() {
  return <div className="studio-content"><PageTitle title="Analitik">Pahami pertumbuhan tanpa mengorbankan privasi pembaca.</PageTitle><div className="metric-grid"><article><span>Pengunjung unik</span><b>12.840</b><em>+18,4%</em></article><article><span>Tampilan halaman</span><b>31.290</b><em>+12,1%</em></article><article><span>Rata-rata membaca</span><b>4m 18d</b><em>+32 detik</em></article><article><span>Konversi pelanggan</span><b>4,8%</b><em>Baik</em></article></div><section className="chart-card"><div className="panel-title"><h2>Performa 7 hari</h2><button>7 hari <ChevronDown/></button></div><div className="bars">{[38,52,45,72,62,88,79].map((height, index) => <span key={index} style={{height: String(height) + "%"}}><i>{height * 42}</i></span>)}</div></section></div>;
}

function Members({ setToast }) {
  const people = [["JH", "John Harris", "Pemilik"], ["NA", "Nara Assistant", "AI editor"]];
  return <div className="studio-content"><PageTitle title="Anggota & tim" action={<button className="blue-button" onClick={() => setToast("Undangan tim siap dibuat")}><Plus/> Undang anggota</button>}>Kelola peran, akses, dan alur persetujuan editorial.</PageTitle><div className="content-card member-list">{people.map((person) => <div className="member" key={person[1]}><span>{person[0]}</span><div><b>{person[1]}</b><small>{person[1] === "Nara Assistant" ? "Asisten ruang kerja" : "Pemilik workspace"}</small></div><i>{person[2]}</i><button><MoreHorizontal/></button></div>)}</div><div className="info-grid"><article><ShieldCheck/><b>Peran terkontrol</b><p>Pemilik, admin, editor, penulis, dan kontributor.</p></article><article><Activity/><b>Jejak aktivitas</b><p>Setiap perubahan penting dapat diaudit.</p></article><article><MessageSquare/><b>Alur persetujuan</b><p>Review dan komentar sebelum publikasi.</p></article></div></div>;
}

function Domain({ setToast, site, setSite }) {
  const [publishing, setPublishing] = useState(false);
  const published = site?.status === "active";
  const publicUrl = site?.slug ? "https://" + site.slug + ".ngeblogging.com" : "Subdomain dibuat setelah cloud tersambung";
  const togglePublication = async () => {
    if (!site?.id) {
      setToast("Hubungkan Studio ke cloud sebelum meluncurkan situs");
      return;
    }
    if (!window.confirm(published ? "Tarik situs dari publik?" : "Luncurkan situs ini ke publik sekarang?")) return;
    setPublishing(true);
    try {
      const updated = await setSitePublication(site.id, !published);
      setSite(updated);
      setToast(published ? "Situs ditarik menjadi draf" : "Situs berhasil diluncurkan");
    } catch (error) {
      console.error("Site publication failed", error);
      setToast("Status publikasi belum dapat diubah");
    } finally {
      setPublishing(false);
    }
  };
  return <div className="studio-content"><PageTitle title="Domain & publikasi">Hubungkan identitas utama situs dan periksa kesiapan produksi.</PageTitle><div className="domain-card"><span className="domain-icon"><Globe2/></span><div><small>SUBDOMAIN PUBLIK</small><h2>{site?.slug ? site.slug + ".ngeblogging.com" : "Menyiapkan subdomain…"}</h2><p>{published ? "Situs aktif melalui Cloudflare edge dan dapat dibuka pengunjung." : "Tema dan konten aman sebagai draf sampai Anda menekan Launch."}</p>{published && <a className="visit-public-site" href={publicUrl} target="_blank" rel="noreferrer">Buka situs publik <ArrowLeft/></a>}</div><i className={published ? "domain-active" : ""}>{published ? "Aktif" : "Draf"}</i></div><div className="launch-list"><h2>Daftar kesiapan peluncuran</h2>{[["Build produksi","Siap"],["HTTPS otomatis","Aktif"],["Database Supabase","Tersambung"],["Theme Studio","Siap"],["Mode mobile & SEO","Siap"]].map((item) => <div key={item[0]}><span className="done"><Check/></span><b>{item[0]}</b><em>{item[1]}</em></div>)}<button className="blue-button launch-site-button" onClick={togglePublication} disabled={publishing}>{publishing ? <><LoaderCircle className="spin"/> Memproses…</> : published ? <><CloudOff/> Tarik menjadi draf</> : <><Send/> Launch situs sekarang</>}</button></div></div>;
}

function SettingsView({ setToast, site }) {
  return <div className="studio-content"><PageTitle title="Pengaturan situs">Atur identitas, bahasa, publikasi, dan keamanan.</PageTitle><div className="settings-card"><label>Nama situs<input defaultValue={site?.name || "Ngeblogging Utama"}/></label><label>Deskripsi<textarea defaultValue={site?.description || "Platform membangun, menulis, dan mengembangkan situs bersama Nara AI."}/></label><div className="field-row"><label>Bahasa<select defaultValue="id"><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></label><label>Zona waktu<select defaultValue="Asia/Jakarta"><option>Asia/Jakarta</option></select></label></div><label className="toggle-row"><span><b>Konfirmasi publikasi AI</b><small>Nara tidak boleh menerbitkan atau menghapus tanpa izin.</small></span><input type="checkbox" defaultChecked/></label><button className="blue-button" onClick={() => setToast("Pengaturan berhasil disimpan")}><Check/> Simpan perubahan</button></div></div>;
}

function Home({ docs, createDoc, openDoc, displayName, onOpenNara, loading }) {
  const published = docs.filter((document) => document.status === "published").length;
  return <div className="studio-content"><div className="studio-heading"><div><small>SELAMAT DATANG KEMBALI</small><h1>Selamat datang, {displayName}.</h1><p>Lanjutkan ide terbaik Anda hari ini.</p></div><button className="blue-button" onClick={() => createDoc("article")}><PenLine/> Tulis artikel</button></div><div className="metric-grid"><article><span>Pengunjung bulan ini</span><b>12.840</b><em>+18,4%</em></article><article><span>Konten pada halaman ini</span><b>{docs.length}</b><em>{published} terbit</em></article><article><span>Pelanggan</span><b>1.284</b><em>+76 bulan ini</em></article><article><span>Skor SEO</span><b>84</b><em>Baik</em></article></div><div className="home-grid"><section className="recent"><div className="panel-title"><h2>Konten terbaru</h2>{loading && <LoaderCircle className="spin"/>}</div>{docs.slice(0, 4).map((document) => <button className="recent-row" onClick={() => openDoc(document.id)} key={document.id}><span className="doc-icon"><FileText/></span><span><b>{document.title}</b><small>{document.type === "page" ? "Halaman" : "Artikel"} · {relativeTime(document.updated)}</small></span><i className={document.status}>{document.status === "published" ? "Terbit" : "Draf"}</i><MoreHorizontal/></button>)}</section><section className="nara-panel"><span className="nara-orb"><Sparkles/></span><small>NARA AI</small><h2>Ada peluang untuk situs Anda.</h2><p>Perbarui artikel lama, susun kalender editorial, dan tingkatkan SEO.</p><button onClick={onOpenNara}><Sparkles/> Lihat rekomendasi</button></section></div></div>;
}

function Content({ docs, kind, query, setQuery, createDoc, openDoc, removeDoc, loading, hasMore, loadMore }) {
  const label = kind === "page" ? "Halaman" : "Artikel";
  return <div className="studio-content"><div className="content-title"><div><h1>{label}</h1><p>Kelola {label.toLowerCase()} dengan pagination stabil dan pencarian server.</p></div><button className="blue-button" onClick={() => createDoc(kind)}><FilePlus2/> Buat {label.toLowerCase()}</button></div><div className="content-card"><div className="content-tools"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={"Cari " + label.toLowerCase() + "…"}/></label><button>Semua status <ChevronDown/></button></div><div className="table-head"><span>Judul</span><span>Status</span><span>Diperbarui</span><span/></div>{docs.length === 0 && !loading && <div className="empty-state"><FileText/><h3>Belum ada hasil</h3><p>Buat dokumen pertama atau ubah pencarian Anda.</p></div>}{docs.map((document) => <div className="doc-row" key={document.id}><button className="doc-name" onClick={() => openDoc(document.id)}><span><FileText/></span><div><b>{document.title}</b><small>/{document.slug}</small></div></button><i className={document.status}>{document.status === "published" ? "Terbit" : "Draf"}</i><time>{relativeTime(document.updated)}</time><button className="trash" title="Hapus" onClick={() => removeDoc(document.id)}><Trash2/></button></div>)}{loading && <div className="content-loading"><LoaderCircle className="spin"/> Memuat konten…</div>}{hasMore && !loading && <button className="load-more" onClick={loadMore}>Muat {CONTENT_PAGE_SIZE} berikutnya</button>}</div></div>;
}

function Editor({ doc, saved, patch, onBack, publish, editor, toast, onOpenNara }) {
  const [ribbonTab, setRibbonTab] = useState("Beranda");
  const [preview, setPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const imageInput = useRef(null);

  const format = (name, value) => {
    command(name, value);
    editor.current?.focus();
    patch({ content: editor.current?.innerHTML || doc.content });
  };
  const insertTable = () => format("insertHTML", "<table><tbody><tr><th>Kolom 1</th><th>Kolom 2</th><th>Kolom 3</th></tr><tr><td>Data</td><td>Data</td><td>Data</td></tr></tbody></table><p><br></p>");
  const insertLink = () => {
    const url = window.prompt("Alamat tautan (https://...)");
    if (url) format("createLink", url);
  };
  const insertImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5_000_000) {
      window.alert("Gambar editor maksimal 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => format("insertImage", reader.result);
    reader.readAsDataURL(file);
  };

  const tool = (title, icon, action, extra = "") => <button className={extra} title={title} aria-label={title} onClick={action}>{icon}</button>;
  return <div className="editor-app">
    {toast && <div className="studio-toast"><Check size={16}/>{toast}</div>}
    <input ref={imageInput} type="file" accept="image/*" hidden onChange={insertImage}/>
    <div className="editor-titlebar">
      <button className="back-button" onClick={onBack} aria-label="Kembali"><ArrowLeft/></button>
      <div className="editor-file"><FileText/><label><input value={doc.title} onChange={(event) => patch({ title: event.target.value, slug: slugify(event.target.value) })}/><small>{saved ? <><Check/> Tersimpan otomatis</> : <><LoaderCircle className="spin"/> Menyimpan…</>}</small></label></div>
      <div className="editor-actions"><button onClick={() => setPreview(true)}><Eye/> Pratinjau</button><button className="blue-button" onClick={publish}><Send/>{doc.status === "published" ? "Jadikan draf" : "Terbitkan"}</button></div>
    </div>
    <div className="editor-tabs">{["Beranda","Sisipkan","Tata letak","Referensi","Tinjau","SEO"].map((tab) => <button className={ribbonTab === tab ? "active" : ""} key={tab} onClick={() => setRibbonTab(tab)}>{tab}</button>)}</div>
    <div className="editor-ribbon" aria-label="Peralatan penyuntingan">
      <div className="ribbon-group"><span>Edit</span><nav>{tool("Urungkan", <Undo2/>, () => format("undo"))}{tool("Ulangi", <Redo2/>, () => format("redo"))}</nav></div>
      <div className="ribbon-group style-select"><span>Gaya</span><nav><select aria-label="Gaya paragraf" onChange={(event) => format("formatBlock", event.target.value)} defaultValue="p"><option value="p">Paragraf</option><option value="h1">Judul 1</option><option value="h2">Judul 2</option><option value="h3">Judul 3</option><option value="blockquote">Kutipan</option></select><select aria-label="Font" onChange={(event) => format("fontName", event.target.value)} defaultValue="DM Sans"><option>DM Sans</option><option>Georgia</option><option>Arial</option><option>Courier New</option></select></nav></div>
      <div className="ribbon-group"><span>Font</span><nav>{tool("Tebal", <Bold/>, () => format("bold"))}{tool("Miring", <Italic/>, () => format("italic"))}{tool("Garis bawah", <Underline/>, () => format("underline"))}{tool("Coret", <Strikethrough/>, () => format("strikeThrough"))}{tool("Warna sorot", <Highlighter/>, () => format("hiliteColor", "#fff0a8"))}</nav></div>
      <div className="ribbon-group"><span>Paragraf</span><nav>{tool("Daftar poin", <List/>, () => format("insertUnorderedList"))}{tool("Daftar nomor", <ListOrdered/>, () => format("insertOrderedList"))}{tool("Rata kiri", <AlignLeft/>, () => format("justifyLeft"))}{tool("Rata tengah", <AlignCenter/>, () => format("justifyCenter"))}{tool("Rata kanan", <AlignRight/>, () => format("justifyRight"))}{tool("Rata penuh", <AlignJustify/>, () => format("justifyFull"))}</nav></div>
      <div className="ribbon-group"><span>Sisipkan</span><nav>{tool("Tabel", <Table2/>, insertTable)}{tool("Tautan", <Link/>, insertLink)}{tool("Gambar", <Image/>, () => imageInput.current?.click())}{tool("Kutipan", <Quote/>, () => format("formatBlock", "blockquote"))}</nav></div>
      <button className="nara-ribbon" onClick={onOpenNara}><Sparkles/> Tulis dengan Nara</button>
    </div>
    <div className="editor-workspace">
      <article ref={editor} className="real-page" contentEditable suppressContentEditableWarning onInput={(event) => patch({ content: event.currentTarget.innerHTML })} dangerouslySetInnerHTML={{__html: doc.content || ""}}/>
      <aside><h3>Pengaturan dokumen</h3><label>Status <b className={doc.status}>{doc.status === "published" ? "Terbit" : "Draf"}</b></label><label>URL<input value={doc.slug} onChange={(event) => patch({slug: event.target.value})}/></label><label>Visibilitas<select value={doc.visibility || "public"} onChange={(event) => patch({visibility: event.target.value})}><option value="public">Publik</option><option value="private">Pribadi</option><option value="members">Anggota</option></select></label><hr/><h3>Optimasi SEO</h3><label>Meta description<textarea value={doc.excerpt || ""} maxLength={160} onChange={(event) => patch({excerpt: event.target.value})} placeholder="Ringkasan 120–160 karakter"/></label><label>Skor SEO <b className="good">{doc.title.length > 20 && (doc.excerpt || "").length > 80 ? "92/100" : "84/100"}</b></label><label>Keterbacaan <b className="good">Baik</b></label><div className="ai-tip"><Sparkles/><p>Gunakan heading terstruktur, deskripsi unik, sumber tepercaya, dan gambar dengan alt text.</p></div></aside>
    </div>
    <div className="mobile-format-dock">
      {tool("Tebal", <Bold/>, () => format("bold"))}
      {tool("Miring", <Italic/>, () => format("italic"))}
      {tool("Judul", <Heading2/>, () => format("formatBlock", "h2"))}
      {tool("Daftar", <List/>, () => format("insertUnorderedList"))}
      {tool("Tautan", <Link/>, insertLink)}
      {tool("Tabel", <Table2/>, insertTable)}
      <button className="mobile-nara" onClick={onOpenNara}><Sparkles/></button>
    </div>
    {preview && <div className="document-preview-layer"><button className="document-preview-backdrop" onClick={() => setPreview(false)} aria-label="Tutup pratinjau"/><section><header><div><small>PRATINJAU RESPONSIF</small><h2>{doc.title}</h2></div><nav><button className={previewDevice === "desktop" ? "active" : ""} onClick={() => setPreviewDevice("desktop")}>Desktop</button><button className={previewDevice === "mobile" ? "active" : ""} onClick={() => setPreviewDevice("mobile")}>Mobile</button></nav><button onClick={() => setPreview(false)}><X/></button></header><div className={"document-preview-canvas " + previewDevice}><article><h1>{doc.title}</h1><p className="preview-byline">Pratinjau artikel · {doc.status === "published" ? "Terbit" : "Draf"}</p><div dangerouslySetInnerHTML={{__html: doc.content || ""}}/></article></div></section></div>}
  </div>;
}
