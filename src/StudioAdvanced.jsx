import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  BarChart3,
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FilePlus2,
  FileText,
  Globe2,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  LayoutDashboard,
  Link,
  List,
  LogOut,
  Menu,
  Monitor,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  PenLine,
  Plus,
  Redo2,
  Save,
  Search,
  Send,
  Settings,
  Smartphone,
  Sparkles,
  Table2,
  Trash2,
  Type,
  Underline,
  Undo2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import NaraAssistant from "./NaraAssistant";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { buildSiteUrl, normalizeSiteSlug, validateSiteSlug } from "./lib/subdomain";
import "./studio-advanced.css";

const STORAGE_KEY = "ngeblogging-advanced-studio-v1";
const FONT_OPTIONS = ["Inter", "DM Sans", "Arial", "Georgia", "Verdana", "Times New Roman", "Courier New"];
const SIZE_OPTIONS = [
  ["12", "1"],
  ["14", "2"],
  ["16", "3"],
  ["18", "4"],
  ["24", "5"],
  ["32", "6"],
  ["48", "7"],
];
const LAYOUTS = [
  { id: "editorial", name: "Editorial Pro", description: "Fokus membaca dengan tipografi besar dan daftar artikel modern." },
  { id: "magazine", name: "Magazine Grid", description: "Berita, kategori, sorotan, dan kartu konten padat." },
  { id: "business", name: "Business Growth", description: "Hero, layanan, bukti sosial, formulir, dan CTA." },
  { id: "portfolio", name: "Portfolio Visual", description: "Galeri karya, studi kasus, dan profil kreator." },
  { id: "community", name: "Community Hub", description: "Anggota, diskusi, acara, dan konten unggulan." },
  { id: "minimal", name: "Minimal Focus", description: "Sangat ringan, cepat, dan bebas gangguan." },
];

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const initialSiteId = uid();
const INITIAL_DATA = {
  profile: {
    displayName: "John Harris",
    username: "john-harris",
    bio: "Membangun ide, bisnis, dan cerita digital dari Indonesia.",
    location: "Indonesia",
    website: "",
    avatarUrl: "",
  },
  sites: [
    {
      id: initialSiteId,
      name: "Ngeblogging Utama",
      slug: "john-harris",
      description: "Blog, portofolio, dan pusat publikasi utama.",
      theme: "Editorial Pro",
      layout: "editorial",
      status: "published",
      customDomain: "",
      accent: "#3157d5",
      createdAt: Date.now(),
    },
  ],
  documents: [
    {
      id: uid(),
      siteId: initialSiteId,
      kind: "article",
      title: "Selamat datang di Ngeblogging",
      slug: "selamat-datang",
      status: "published",
      updatedAt: Date.now(),
      content: "<h1>Selamat datang di Ngeblogging</h1><p>Ini adalah ruang digital Anda. Gunakan editor lengkap untuk menulis, menyisipkan gambar, menata tipografi, dan menerbitkan konten.</p><h2>Mulai membangun</h2><p>Pilih situs, atur tata letak, lalu terbitkan pada subdomain gratis Anda.</p>",
    },
  ],
  media: [],
};

function readLocalData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored?.sites?.length) return INITIAL_DATA;
    return stored;
  } catch {
    return INITIAL_DATA;
  }
}

function formatRelative(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - Number(timestamp || 0)) / 60000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} jam lalu`;
  return `${Math.floor(minutes / 1440)} hari lalu`;
}

function exec(name, value) {
  document.execCommand(name, false, value);
}

export default function StudioAdvanced({ onExit, user }) {
  const [data, setData] = useState(readLocalData);
  const [activeSiteId, setActiveSiteId] = useState(() => readLocalData().sites[0]?.id);
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [siteMenuOpen, setSiteMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [naraOpen, setNaraOpen] = useState(false);
  const [editorId, setEditorId] = useState(null);
  const [search, setSearch] = useState("");
  const [creatingSite, setCreatingSite] = useState(false);
  const [cloudState, setCloudState] = useState(supabaseConfigured ? "Menghubungkan" : "Mode demo lokal");

  const activeSite = data.sites.find((site) => site.id === activeSiteId) || data.sites[0];
  const siteDocuments = useMemo(
    () => data.documents.filter((doc) => doc.siteId === activeSite?.id),
    [data.documents, activeSite?.id],
  );
  const filteredDocuments = useMemo(
    () => siteDocuments.filter((doc) => doc.title.toLowerCase().includes(search.toLowerCase())),
    [siteDocuments, search],
  );
  const activeDocument = data.documents.find((doc) => doc.id === editorId);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!supabase || !user?.id) return undefined;
    let cancelled = false;

    async function loadCloudWorkspace() {
      try {
        const [{ data: profile }, { data: sites, error: sitesError }] = await Promise.all([
          supabase.from("profiles").select("display_name,bio,avatar_url,locale,website").eq("id", user.id).maybeSingle(),
          supabase.from("sites").select("id,name,slug,description,theme,status,layout,custom_domain,settings,created_at").order("created_at"),
        ]);
        if (sitesError) throw sitesError;
        if (cancelled) return;

        if (profile) {
          setData((current) => ({
            ...current,
            profile: {
              ...current.profile,
              displayName: profile.display_name || current.profile.displayName,
              bio: profile.bio || "",
              avatarUrl: profile.avatar_url || "",
              website: profile.website || "",
            },
          }));
        }

        if (sites?.length) {
          const mappedSites = sites.map((site) => ({
            id: site.id,
            name: site.name,
            slug: site.slug,
            description: site.description || "",
            theme: site.theme || "Editorial Pro",
            layout: site.layout || site.settings?.layout || "editorial",
            status: site.status || "draft",
            customDomain: site.custom_domain || "",
            accent: site.settings?.accent || "#3157d5",
            createdAt: new Date(site.created_at).getTime(),
          }));
          setData((current) => ({ ...current, sites: mappedSites }));
          setActiveSiteId((current) => mappedSites.some((site) => site.id === current) ? current : mappedSites[0].id);
        }
        setCloudState("Tersinkron Supabase");
      } catch (error) {
        console.error("Gagal memuat workspace cloud", error);
        if (!cancelled) setCloudState("Lokal — cloud belum siap");
      }
    }

    loadCloudWorkspace();
    return () => { cancelled = true; };
  }, [user?.id]);

  const updateProfile = (patch) => setData((current) => ({
    ...current,
    profile: { ...current.profile, ...patch },
  }));

  const updateSite = (siteId, patch) => setData((current) => ({
    ...current,
    sites: current.sites.map((site) => site.id === siteId ? { ...site, ...patch } : site),
  }));

  const updateDocument = (documentId, patch) => setData((current) => ({
    ...current,
    documents: current.documents.map((doc) => doc.id === documentId
      ? { ...doc, ...patch, updatedAt: Date.now() }
      : doc),
  }));

  async function persistProfile() {
    if (supabase && user?.id) {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: data.profile.displayName,
        bio: data.profile.bio,
        avatar_url: data.profile.avatarUrl || null,
        website: data.profile.website || null,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        setToast(`Cloud gagal: ${error.message}`);
        return;
      }
    }
    setToast("Profil dan biografi berhasil disimpan");
  }

  async function persistSite(site = activeSite) {
    if (!site) return;
    if (supabase && user?.id && /^[0-9a-f-]{36}$/i.test(site.id)) {
      const { error } = await supabase.from("sites").update({
        name: site.name,
        slug: site.slug,
        description: site.description,
        theme: site.theme,
        status: site.status,
        layout: site.layout,
        custom_domain: site.customDomain || null,
        settings: { accent: site.accent, layout: site.layout },
        updated_at: new Date().toISOString(),
      }).eq("id", site.id);
      if (error) {
        setToast(`Cloud gagal: ${error.message}`);
        return;
      }
    }
    setToast("Pengaturan situs berhasil disimpan");
  }

  async function createSite(values) {
    const validation = validateSiteSlug(values.slug || values.name);
    if (!validation.valid) throw new Error(validation.reason);

    let site = {
      id: uid(),
      name: values.name.trim(),
      slug: validation.slug,
      description: values.description.trim(),
      theme: "Editorial Pro",
      layout: "editorial",
      status: "draft",
      customDomain: "",
      accent: "#3157d5",
      createdAt: Date.now(),
    };

    if (supabase && user?.id) {
      const { data: inserted, error } = await supabase.from("sites").insert({
        owner_id: user.id,
        name: site.name,
        slug: site.slug,
        description: site.description,
        theme: site.theme,
        status: site.status,
        layout: site.layout,
        settings: { accent: site.accent, layout: site.layout },
      }).select("id,name,slug,description,theme,status,layout,custom_domain,settings,created_at").single();
      if (error) throw error;
      site = {
        ...site,
        id: inserted.id,
        createdAt: new Date(inserted.created_at).getTime(),
      };
    }

    setData((current) => ({ ...current, sites: [site, ...current.sites] }));
    setActiveSiteId(site.id);
    setCreatingSite(false);
    setView("dashboard");
    setToast(`Situs ${site.name} berhasil dibuat`);
  }

  function createDocument(kind = "article") {
    const document = {
      id: uid(),
      siteId: activeSite.id,
      kind,
      title: kind === "article" ? "Artikel tanpa judul" : "Halaman tanpa judul",
      slug: kind === "article" ? "artikel-tanpa-judul" : "halaman-tanpa-judul",
      status: "draft",
      updatedAt: Date.now(),
      content: "<h1>Mulai menulis…</h1><p>Tuangkan ide terbaik Anda di sini.</p>",
    };
    setData((current) => ({ ...current, documents: [document, ...current.documents] }));
    setEditorId(document.id);
  }

  function deleteDocument(documentId) {
    setData((current) => ({
      ...current,
      documents: current.documents.filter((doc) => doc.id !== documentId),
    }));
    setToast("Konten dipindahkan ke sampah");
  }

  async function addMedia(file) {
    if (!file) return null;
    if (!file.type.startsWith("image/")) throw new Error("Saat ini editor menerima berkas gambar.");
    if (file.size > 15 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 15 MB per unggahan.");

    let url = "";
    let storagePath = "";
    if (supabase && user?.id && activeSite?.id && /^[0-9a-f-]{36}$/i.test(activeSite.id)) {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      storagePath = `${activeSite.id}/${user.id}/${uid()}-${safeName}`;
      const { error } = await supabase.storage.from("site-media").upload(storagePath, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      url = supabase.storage.from("site-media").getPublicUrl(storagePath).data.publicUrl;
    } else {
      url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    const asset = {
      id: uid(),
      siteId: activeSite.id,
      name: file.name,
      type: file.type,
      size: file.size,
      url,
      storagePath,
      createdAt: Date.now(),
    };
    setData((current) => ({ ...current, media: [asset, ...current.media] }));
    setToast("Gambar berhasil ditambahkan ke pustaka media");
    return asset;
  }

  if (activeDocument) {
    return (
      <AdvancedEditor
        document={activeDocument}
        site={activeSite}
        media={data.media.filter((asset) => asset.siteId === activeSite.id)}
        onUpdate={(patch) => updateDocument(activeDocument.id, patch)}
        onBack={() => setEditorId(null)}
        onAddMedia={addMedia}
        onOpenNara={() => setNaraOpen(true)}
        toast={toast}
        setToast={setToast}
        naraOpen={naraOpen}
        setNaraOpen={setNaraOpen}
        user={user}
      />
    );
  }

  const navigation = [
    ["dashboard", "Ringkasan", LayoutDashboard],
    ["sites", "Situs saya", Globe2],
    ["content", "Artikel & halaman", FileText],
    ["media", "Media", ImageIcon],
    ["layout", "Tata letak", Palette],
    ["analytics", "Analitik", BarChart3],
    ["team", "Anggota", Users],
    ["profile", "Profil & biografi", UserRound],
    ["domains", "Domain", Monitor],
    ["settings", "Pengaturan", Settings],
  ];

  return (
    <div className="nbx-shell">
      {toast && <div className="nbx-toast"><Check size={17} />{toast}</div>}
      <aside className={sidebarOpen ? "nbx-sidebar" : "nbx-sidebar nbx-sidebar--collapsed"}>
        <div className="nbx-logo"><span>n.</span><b>ngeblogging</b></div>
        <button className="nbx-create" onClick={() => createDocument("article")}><Plus /><span>Tulis baru</span></button>
        <nav>
          {navigation.map(([id, label, Icon]) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)} title={label}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="nbx-sidebar-footer">
          <span className="nbx-cloud-state"><i />{cloudState}</span>
          <button onClick={onExit}><LogOut /><span>Keluar studio</span></button>
        </div>
      </aside>

      <main className="nbx-main">
        <header className="nbx-topbar">
          <button className="nbx-icon-button" onClick={() => setSidebarOpen((value) => !value)}><PanelLeftClose /></button>
          <div className="nbx-site-switcher-wrap">
            <button className="nbx-site-switcher" onClick={() => setSiteMenuOpen((value) => !value)}>
              <span>{activeSite?.name?.slice(0, 2).toUpperCase()}</span>
              <div><b>{activeSite?.name}</b><small>{activeSite?.slug}.ngeblogging.com</small></div>
              <ChevronDown />
            </button>
            {siteMenuOpen && (
              <div className="nbx-site-menu">
                {data.sites.map((site) => (
                  <button key={site.id} onClick={() => { setActiveSiteId(site.id); setSiteMenuOpen(false); }}>
                    <span>{site.name.slice(0, 2).toUpperCase()}</span><div><b>{site.name}</b><small>{site.slug}.ngeblogging.com</small></div>
                    {site.id === activeSite.id && <Check />}
                  </button>
                ))}
                <button className="nbx-add-site" onClick={() => { setCreatingSite(true); setSiteMenuOpen(false); }}><Plus />Buat situs baru</button>
              </div>
            )}
          </div>
          <div className="nbx-top-actions">
            <button className="nbx-search-button"><Search /></button>
            <button className="nbx-nara-button" onClick={() => setNaraOpen(true)}><Sparkles />Tanya Nara</button>
            <button className="nbx-avatar" onClick={() => setView("profile")}>{data.profile.displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</button>
          </div>
        </header>

        {view === "dashboard" && <DashboardView site={activeSite} documents={siteDocuments} profile={data.profile} onCreate={createDocument} onOpen={setEditorId} onNavigate={setView} />}
        {view === "sites" && <SitesView sites={data.sites} activeSiteId={activeSite.id} setActiveSiteId={setActiveSiteId} onCreate={() => setCreatingSite(true)} />}
        {view === "content" && <ContentView documents={filteredDocuments} search={search} setSearch={setSearch} onCreate={createDocument} onOpen={setEditorId} onDelete={deleteDocument} />}
        {view === "media" && <MediaView media={data.media.filter((asset) => asset.siteId === activeSite.id)} onUpload={addMedia} />}
        {view === "layout" && <LayoutView site={activeSite} onUpdate={(patch) => updateSite(activeSite.id, patch)} onSave={() => persistSite()} />}
        {view === "analytics" && <AnalyticsView documents={siteDocuments} />}
        {view === "team" && <TeamView profile={data.profile} setToast={setToast} />}
        {view === "profile" && <ProfileView profile={data.profile} onUpdate={updateProfile} onSave={persistProfile} sites={data.sites} />}
        {view === "domains" && <DomainsView site={activeSite} onUpdate={(patch) => updateSite(activeSite.id, patch)} onSave={() => persistSite()} setToast={setToast} />}
        {view === "settings" && <SettingsView site={activeSite} onUpdate={(patch) => updateSite(activeSite.id, patch)} onSave={() => persistSite()} />}
      </main>

      {creatingSite && <CreateSiteModal onClose={() => setCreatingSite(false)} onSubmit={createSite} existingSlugs={data.sites.map((site) => site.slug)} />}
      <NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "studio", siteName: activeSite?.name, siteCount: data.sites.length, documentCount: siteDocuments.length }} />
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="nbx-page-heading">
      <div>{eyebrow && <small>{eyebrow}</small>}<h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

function DashboardView({ site, documents, profile, onCreate, onOpen, onNavigate }) {
  const published = documents.filter((doc) => doc.status === "published").length;
  return (
    <div className="nbx-content">
      <PageHeading eyebrow="RUANG KERJA UTAMA" title={`Selamat datang, ${profile.displayName}.`} description={`Kelola ${site.name}, terbitkan ide, dan pantau pertumbuhan dari satu tempat.`} action={<button className="nbx-primary" onClick={() => onCreate("article")}><PenLine />Tulis artikel</button>} />
      <div className="nbx-metrics">
        <article><span>Pengunjung bulan ini</span><b>12.840</b><em>+18,4%</em></article>
        <article><span>Konten terbit</span><b>{published}</b><em>{documents.length - published} draf</em></article>
        <article><span>Subdomain gratis</span><b>Aktif</b><em>{site.slug}.ngeblogging.com</em></article>
        <article><span>Skor situs</span><b>92</b><em>Sangat baik</em></article>
      </div>
      <div className="nbx-dashboard-grid">
        <section className="nbx-panel">
          <div className="nbx-panel-title"><div><h2>Konten terbaru</h2><p>Lanjutkan pekerjaan terakhir Anda.</p></div><button onClick={() => onNavigate("content")}>Lihat semua</button></div>
          {documents.length === 0 && <EmptyState icon={FileText} title="Belum ada konten" description="Buat artikel pertama untuk situs ini." />}
          {documents.slice(0, 5).map((doc) => (
            <button className="nbx-recent-row" key={doc.id} onClick={() => onOpen(doc.id)}>
              <span><FileText /></span><div><b>{doc.title}</b><small>{doc.kind === "page" ? "Halaman" : "Artikel"} · {formatRelative(doc.updatedAt)}</small></div>
              <i className={doc.status}>{doc.status === "published" ? "Terbit" : "Draf"}</i><MoreHorizontal />
            </button>
          ))}
        </section>
        <section className="nbx-launch-card">
          <span><Sparkles /></span><small>NARA GROWTH</small><h2>Situs Anda siap ditingkatkan.</h2>
          <p>Lengkapi biografi, pilih tata letak, dan terbitkan minimal tiga artikel untuk memperkuat identitas situs.</p>
          <div><button onClick={() => onNavigate("profile")}>Lengkapi profil</button><button onClick={() => onNavigate("layout")}>Atur tampilan</button></div>
        </section>
      </div>
    </div>
  );
}

function SitesView({ sites, activeSiteId, setActiveSiteId, onCreate }) {
  return (
    <div className="nbx-content">
      <PageHeading eyebrow="MULTI-SITUS" title="Semua situs Anda" description="Buat dan kelola blog, bisnis, portal, portofolio, atau komunitas dari satu akun." action={<button className="nbx-primary" onClick={onCreate}><Plus />Buat situs</button>} />
      <div className="nbx-sites-grid">
        {sites.map((site) => {
          const url = buildSiteUrl(site.slug);
          return (
            <article className={site.id === activeSiteId ? "nbx-site-card active" : "nbx-site-card"} key={site.id}>
              <div className="nbx-site-preview" style={{ "--accent": site.accent }}><span>{site.name.slice(0, 2).toUpperCase()}</span><div><i /><i /><i /></div></div>
              <div className="nbx-site-card-body"><div><span className={`nbx-status ${site.status}`}>{site.status === "published" ? "Publik" : "Draf"}</span><h2>{site.name}</h2><p>{site.description}</p></div>
                <code>{site.slug}.ngeblogging.com</code>
                <div className="nbx-site-card-actions"><button onClick={() => setActiveSiteId(site.id)}>{site.id === activeSiteId ? <><Check />Dipilih</> : "Kelola"}</button><a href={url} target="_blank" rel="noreferrer"><ExternalLink />Lihat situs</a></div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ContentView({ documents, search, setSearch, onCreate, onOpen, onDelete }) {
  return (
    <div className="nbx-content">
      <PageHeading eyebrow="PUSAT KONTEN" title="Artikel & halaman" description="Cari, tulis, tinjau, dan terbitkan seluruh konten situs." action={<div className="nbx-split-action"><button onClick={() => onCreate("article")}><FilePlus2 />Artikel baru</button><button onClick={() => onCreate("page")}><BookOpen />Halaman baru</button></div>} />
      <section className="nbx-table-card">
        <div className="nbx-table-tools"><label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul atau URL…" /></label><button>Semua status <ChevronDown /></button></div>
        <div className="nbx-table-head"><span>Konten</span><span>Status</span><span>Diperbarui</span><span /></div>
        {documents.length === 0 && <EmptyState icon={FileText} title="Konten tidak ditemukan" description="Buat konten baru atau ubah kata pencarian." />}
        {documents.map((doc) => (
          <div className="nbx-document-row" key={doc.id}>
            <button onClick={() => onOpen(doc.id)}><span><FileText /></span><div><b>{doc.title}</b><small>/{doc.slug}</small></div></button>
            <i className={doc.status}>{doc.status === "published" ? "Terbit" : "Draf"}</i><time>{formatRelative(doc.updatedAt)}</time>
            <button className="nbx-danger-icon" onClick={() => onDelete(doc.id)} title="Hapus"><Trash2 /></button>
          </div>
        ))}
      </section>
    </div>
  );
}

function MediaView({ media, onUpload }) {
  const input = useRef(null);
  const upload = async (file) => {
    try { await onUpload(file); } catch (error) { alert(error.message); }
  };
  return (
    <div className="nbx-content">
      <PageHeading eyebrow="PUSTAKA ASET" title="Media" description="Unggah gambar ke Storage, optimalkan untuk web, dan gunakan kembali di semua konten." action={<button className="nbx-primary" onClick={() => input.current?.click()}><Upload />Unggah gambar</button>} />
      <input ref={input} type="file" accept="image/*" hidden onChange={(event) => upload(event.target.files?.[0])} />
      <button className="nbx-upload-zone" onClick={() => input.current?.click()}><Upload /><h3>Tarik atau pilih gambar</h3><p>JPG, PNG, WebP, GIF, atau AVIF hingga 15 MB. Produksi memakai bucket Storage dan CDN.</p></button>
      {media.length === 0 ? <EmptyState icon={ImageIcon} title="Pustaka media masih kosong" description="Gambar yang Anda unggah akan tampil di sini dan di editor." /> : (
        <div className="nbx-media-grid">{media.map((asset) => <article key={asset.id}><img src={asset.url} alt={asset.name} /><div><b>{asset.name}</b><small>{Math.max(1, Math.round(asset.size / 1024))} KB</small></div></article>)}</div>
      )}
    </div>
  );
}

function LayoutView({ site, onUpdate, onSave }) {
  return (
    <div className="nbx-content">
      <PageHeading eyebrow="DESAIN TANPA BATAS" title="Tata letak situs" description="Pilih fondasi visual, warna merek, dan gaya navigasi. Semua responsif secara otomatis." action={<button className="nbx-primary" onClick={onSave}><Save />Simpan tampilan</button>} />
      <div className="nbx-layout-builder">
        <section><h2>Pilih tata letak</h2><div className="nbx-layout-grid">{LAYOUTS.map((layout) => <button className={site.layout === layout.id ? "selected" : ""} key={layout.id} onClick={() => onUpdate({ layout: layout.id, theme: layout.name })}><div className={`nbx-layout-thumb ${layout.id}`}><span /><i /><i /><i /></div><b>{layout.name}</b><p>{layout.description}</p>{site.layout === layout.id && <em><Check />Aktif</em>}</button>)}</div></section>
        <aside><h2>Identitas visual</h2><label>Warna utama<input type="color" value={site.accent} onChange={(event) => onUpdate({ accent: event.target.value })} /></label><label>Gaya header<select defaultValue="sticky"><option value="sticky">Lengket saat menggulir</option><option value="classic">Klasik</option><option value="centered">Logo di tengah</option></select></label><label>Lebar konten<select defaultValue="comfortable"><option value="compact">Ringkas</option><option value="comfortable">Nyaman</option><option value="wide">Lebar</option></select></label><div className="nbx-device-preview"><Monitor /><Smartphone /><span>Responsif otomatis</span></div></aside>
      </div>
    </div>
  );
}

function ProfileView({ profile, onUpdate, onSave, sites }) {
  return (
    <div className="nbx-content">
      <PageHeading eyebrow="IDENTITAS PEMILIK" title="Profil & biografi" description="Profil ini dapat tampil pada halaman penulis dan daftar situs Anda." action={<button className="nbx-primary" onClick={onSave}><Save />Simpan profil</button>} />
      <div className="nbx-profile-grid">
        <section className="nbx-form-card"><label>Nama lengkap<input value={profile.displayName} onChange={(event) => onUpdate({ displayName: event.target.value })} /></label><label>Nama pengguna<input value={profile.username} onChange={(event) => onUpdate({ username: normalizeSiteSlug(event.target.value) })} /></label><label>Biografi<textarea rows="6" maxLength="500" value={profile.bio} onChange={(event) => onUpdate({ bio: event.target.value })} /><small>{profile.bio.length}/500 karakter</small></label><div className="nbx-two-fields"><label>Lokasi<input value={profile.location} onChange={(event) => onUpdate({ location: event.target.value })} /></label><label>Situs pribadi<input value={profile.website} onChange={(event) => onUpdate({ website: event.target.value })} placeholder="https://" /></label></div></section>
        <aside className="nbx-profile-preview"><span className="nbx-profile-avatar">{profile.displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><h2>{profile.displayName}</h2><b>@{profile.username}</b><p>{profile.bio}</p><small>{profile.location}</small><hr /><h3>Situs yang dibuat</h3>{sites.map((site) => <a key={site.id} href={buildSiteUrl(site.slug)} target="_blank" rel="noreferrer"><span>{site.name.slice(0, 2).toUpperCase()}</span><div><b>{site.name}</b><small>{site.slug}.ngeblogging.com</small></div><ExternalLink /></a>)}</aside>
      </div>
    </div>
  );
}

function DomainsView({ site, onUpdate, onSave, setToast }) {
  const validation = validateSiteSlug(site.slug);
  const url = buildSiteUrl(site.slug);
  const copy = async () => { await navigator.clipboard.writeText(url); setToast("Alamat subdomain disalin"); };
  return (
    <div className="nbx-content">
      <PageHeading eyebrow="ALAMAT SITUS" title="Domain & subdomain" description="Setiap situs memperoleh subdomain gratis *.ngeblogging.com. Custom domain tetap dapat dihubungkan." action={<button className="nbx-primary" onClick={onSave}><Save />Simpan domain</button>} />
      <section className="nbx-domain-hero"><span><Globe2 /></span><div><small>SUBDOMAIN GRATIS SELAMANYA</small><h2>{site.slug}.ngeblogging.com</h2><p>HTTPS otomatis setelah wildcard DNS dan sertifikat aktif pada deployment produksi.</p></div><i className={site.status === "published" ? "online" : "draft"}>{site.status === "published" ? "Online" : "Belum diterbitkan"}</i></section>
      <div className="nbx-domain-grid"><section className="nbx-form-card"><label>Nama subdomain<div className="nbx-domain-input"><input value={site.slug} onChange={(event) => onUpdate({ slug: normalizeSiteSlug(event.target.value) })} /><span>.ngeblogging.com</span></div><small className={validation.valid ? "valid" : "invalid"}>{validation.reason}</small></label><div className="nbx-domain-actions"><button onClick={copy}><Copy />Salin alamat</button><a href={url} target="_blank" rel="noreferrer"><ExternalLink />Lihat situs</a></div><label>Custom domain opsional<input value={site.customDomain} onChange={(event) => onUpdate({ customDomain: event.target.value })} placeholder="blog.namadomain.com" /></label></section><aside className="nbx-checklist"><h2>Kesiapan subdomain</h2>{[["Slug unik dan valid", validation.valid],["Situs berstatus publik", site.status === "published"],["Wildcard DNS *.ngeblogging.com", false],["Wildcard TLS/SSL", false]].map(([label, done], index) => <div key={label}><span className={done ? "done" : ""}>{done ? <Check /> : index + 1}</span><b>{label}</b><em>{done ? "Siap" : "Konfigurasi produksi"}</em></div>)}</aside></div>
    </div>
  );
}

function AnalyticsView({ documents }) {
  const published = documents.filter((doc) => doc.status === "published").length;
  return <div className="nbx-content"><PageHeading eyebrow="PERTUMBUHAN" title="Analitik situs" description="Pantau pembaca, keterlibatan, sumber trafik, dan performa konten." /><div className="nbx-metrics"><article><span>Pengunjung unik</span><b>12.840</b><em>+18,4%</em></article><article><span>Tampilan halaman</span><b>31.290</b><em>+12,1%</em></article><article><span>Konten publik</span><b>{published}</b><em>dari {documents.length}</em></article><article><span>Rata-rata membaca</span><b>4m 18d</b><em>+32 detik</em></article></div><section className="nbx-chart"><div><h2>Performa 7 hari</h2><button>7 hari <ChevronDown /></button></div><div>{[42, 58, 48, 76, 64, 92, 81].map((height, index) => <span key={index} style={{ height: `${height}%` }}><i>{height * 37}</i></span>)}</div></section></div>;
}

function TeamView({ profile, setToast }) {
  return <div className="nbx-content"><PageHeading eyebrow="KOLABORASI" title="Anggota & peran" description="Kelola pemilik, admin, editor, penulis, kontributor, dan peninjau." action={<button className="nbx-primary" onClick={() => setToast("Formulir undangan anggota siap dihubungkan ke email") }><Plus />Undang anggota</button>} /><section className="nbx-table-card"><div className="nbx-member-row"><span>{profile.displayName.slice(0, 2).toUpperCase()}</span><div><b>{profile.displayName}</b><small>Pemilik ruang kerja</small></div><i>Pemilik</i><MoreHorizontal /></div><div className="nbx-member-row"><span>NA</span><div><b>Nara Assistant</b><small>Asisten editorial dan pertumbuhan</small></div><i>AI editor</i><MoreHorizontal /></div></section></div>;
}

function SettingsView({ site, onUpdate, onSave }) {
  return <div className="nbx-content"><PageHeading eyebrow="KONFIGURASI SITUS" title="Pengaturan" description="Atur identitas, deskripsi, status publikasi, dan keamanan situs." action={<button className="nbx-primary" onClick={onSave}><Save />Simpan perubahan</button>} /><section className="nbx-form-card nbx-settings-form"><label>Nama situs<input value={site.name} onChange={(event) => onUpdate({ name: event.target.value })} /></label><label>Deskripsi<textarea rows="5" value={site.description} onChange={(event) => onUpdate({ description: event.target.value })} /></label><div className="nbx-two-fields"><label>Status<select value={site.status} onChange={(event) => onUpdate({ status: event.target.value })}><option value="draft">Draf / privat</option><option value="published">Publik</option></select></label><label>Bahasa<select defaultValue="id-ID"><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option></select></label></div><label className="nbx-toggle"><span><b>Konfirmasi tindakan AI</b><small>Nara tidak boleh menerbitkan atau menghapus tanpa persetujuan.</small></span><input type="checkbox" defaultChecked /></label></section></div>;
}

function CreateSiteModal({ onClose, onSubmit, existingSlugs }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const validation = validateSiteSlug(slug || name);
  const duplicate = existingSlugs.includes(validation.slug);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nama situs wajib diisi.");
    if (!validation.valid) return setError(validation.reason);
    if (duplicate) return setError("Subdomain sudah digunakan oleh situs Anda.");
    try { await onSubmit({ name, slug: validation.slug, description }); } catch (submitError) { setError(submitError.message); }
  };
  return <div className="nbx-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="nbx-modal" onSubmit={submit}><button type="button" className="nbx-modal-close" onClick={onClose}><X /></button><span className="nbx-modal-icon"><Globe2 /></span><small>SITUS BARU</small><h2>Buat ruang digital baru</h2><p>Setiap situs mendapatkan subdomain gratis dan ruang pengelolaan terpisah.</p><label>Nama situs<input autoFocus value={name} onChange={(event) => { setName(event.target.value); if (!slug) setSlug(normalizeSiteSlug(event.target.value)); }} placeholder="Contoh: Kopi Pontianak" /></label><label>Subdomain<div className="nbx-domain-input"><input value={slug} onChange={(event) => setSlug(normalizeSiteSlug(event.target.value))} /><span>.ngeblogging.com</span></div><small className={validation.valid && !duplicate ? "valid" : "invalid"}>{duplicate ? "Nama ini sudah digunakan." : validation.reason}</small></label><label>Deskripsi<textarea rows="3" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Jelaskan tujuan situs ini…" /></label>{error && <div className="nbx-form-error">{error}</div>}<button className="nbx-primary nbx-modal-submit" type="submit"><Plus />Buat situs gratis</button></form></div>;
}

function AdvancedEditor({ document: doc, site, media, onUpdate, onBack, onAddMedia, onOpenNara, toast, setToast, naraOpen, setNaraOpen, user }) {
  const editor = useRef(null);
  const imageInput = useRef(null);
  const [tab, setTab] = useState("home");
  const [saved, setSaved] = useState(true);
  const [preview, setPreview] = useState(false);

  const saveContent = () => {
    onUpdate({ content: editor.current?.innerHTML || "" });
    setSaved(false);
    clearTimeout(window.__nbxEditorSave);
    window.__nbxEditorSave = setTimeout(() => setSaved(true), 600);
  };

  const format = (name, value) => {
    exec(name, value);
    editor.current?.focus();
    saveContent();
  };

  const insertTable = () => format("insertHTML", "<table><tbody><tr><th>Kolom 1</th><th>Kolom 2</th><th>Kolom 3</th></tr><tr><td>Data</td><td>Data</td><td>Data</td></tr></tbody></table><p><br></p>");
  const insertImage = async (file) => {
    try {
      const asset = await onAddMedia(file);
      if (asset?.url) format("insertImage", asset.url);
    } catch (error) { setToast(error.message); }
  };
  const publish = () => { onUpdate({ status: doc.status === "published" ? "draft" : "published" }); setToast(doc.status === "published" ? "Konten dikembalikan menjadi draf" : "Konten berhasil diterbitkan"); };

  if (preview) return <div className="nbx-preview-mode"><header><button onClick={() => setPreview(false)}><ArrowLeft />Kembali ke editor</button><span>{site.name}</span><a href={buildSiteUrl(site.slug)} target="_blank" rel="noreferrer"><ExternalLink />Buka situs</a></header><main><article><hgroup><small>{doc.kind === "page" ? "HALAMAN" : "ARTIKEL"}</small><h1>{doc.title}</h1><p>Oleh {user?.user_metadata?.full_name || "John Harris"}</p></hgroup><div dangerouslySetInnerHTML={{ __html: doc.content }} /></article></main></div>;

  return (
    <div className="nbx-editor-shell">
      {toast && <div className="nbx-toast"><Check size={17} />{toast}</div>}
      <input ref={imageInput} type="file" accept="image/*" hidden onChange={(event) => insertImage(event.target.files?.[0])} />
      <header className="nbx-editor-titlebar"><button className="nbx-icon-button" onClick={onBack}><ArrowLeft /></button><div className="nbx-editor-file"><FileText /><label><input value={doc.title} onChange={(event) => onUpdate({ title: event.target.value, slug: normalizeSiteSlug(event.target.value) })} /><small>{saved ? "Tersimpan otomatis" : "Menyimpan…"} · {site.name}</small></label></div><div><button onClick={() => setPreview(true)}>Pratinjau</button><button className="nbx-primary" onClick={publish}><Send />{doc.status === "published" ? "Jadikan draf" : "Terbitkan"}</button></div></header>
      <nav className="nbx-editor-tabs">{[["home","Beranda"],["insert","Sisipkan"],["layout","Tata letak"],["review","Tinjau"],["seo","SEO"]].map(([id,label]) => <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}>{label}</button>)}</nav>
      <div className="nbx-editor-ribbon">
        <div className="nbx-ribbon-group"><button title="Urungkan" onClick={() => format("undo")}><Undo2 /></button><button title="Ulangi" onClick={() => format("redo")}><Redo2 /></button><button title="Simpan" onClick={saveContent}><Save /></button></div>
        <div className="nbx-ribbon-group nbx-ribbon-selects"><label><span>Gaya</span><select onChange={(event) => format("formatBlock", event.target.value)} defaultValue="p"><option value="p">Paragraf</option><option value="h1">Judul 1</option><option value="h2">Judul 2</option><option value="h3">Judul 3</option><option value="blockquote">Kutipan</option></select></label><label><span>Model huruf</span><select onChange={(event) => format("fontName", event.target.value)} defaultValue="Inter">{FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}</select></label><label><span>Ukuran</span><select onChange={(event) => format("fontSize", event.target.value)} defaultValue="3">{SIZE_OPTIONS.map(([label,value]) => <option key={value} value={value}>{label} px</option>)}</select></label></div>
        <div className="nbx-ribbon-group"><button title="Tebal" onClick={() => format("bold")}><Bold /></button><button title="Miring" onClick={() => format("italic")}><Italic /></button><button title="Garis bawah" onClick={() => format("underline")}><Underline /></button><label className="nbx-color-button" title="Warna teks"><Type /><input type="color" defaultValue="#111827" onChange={(event) => format("foreColor", event.target.value)} /></label><label className="nbx-color-button" title="Warna sorotan"><Palette /><input type="color" defaultValue="#fff1a8" onChange={(event) => format("hiliteColor", event.target.value)} /></label></div>
        <div className="nbx-ribbon-group"><button title="Rata kiri" onClick={() => format("justifyLeft")}><AlignLeft /></button><button title="Rata tengah" onClick={() => format("justifyCenter")}><AlignCenter /></button><button title="Rata kanan" onClick={() => format("justifyRight")}><AlignRight /></button><button title="Rata penuh" onClick={() => format("justifyFull")}><AlignJustify /></button></div>
        <div className="nbx-ribbon-group"><button title="Daftar" onClick={() => format("insertUnorderedList")}><List /></button><button title="Tabel" onClick={insertTable}><Table2 /></button><button title="Tautan" onClick={() => { const url = prompt("Masukkan alamat tautan"); if (url) format("createLink", url); }}><Link /></button><button title="Gambar" onClick={() => imageInput.current?.click()}><ImageIcon /></button></div>
        <button className="nbx-editor-nara" onClick={onOpenNara}><Sparkles />Tulis dengan Nara</button>
      </div>
      <div className="nbx-editor-workspace">
        <article key={doc.id} ref={editor} className="nbx-paper" contentEditable suppressContentEditableWarning onInput={saveContent} dangerouslySetInnerHTML={{ __html: doc.content }} />
        <aside className="nbx-editor-inspector"><h3>Pengaturan dokumen</h3><label>Status <b className={doc.status}>{doc.status === "published" ? "Terbit" : "Draf"}</b></label><label>URL<input value={doc.slug} onChange={(event) => onUpdate({ slug: normalizeSiteSlug(event.target.value) })} /></label><label>Visibilitas<select defaultValue="public"><option value="public">Publik</option><option value="members">Anggota</option><option value="private">Pribadi</option></select></label><hr /><h3>Media situs</h3><div className="nbx-editor-media-list">{media.slice(0, 4).map((asset) => <button key={asset.id} onClick={() => format("insertImage", asset.url)}><img src={asset.url} alt={asset.name} /></button>)}<button onClick={() => imageInput.current?.click()}><Plus /></button></div><hr /><h3>Optimasi</h3><label>Skor SEO <b className="good">84/100</b></label><label>Keterbacaan <b className="good">Baik</b></label><div className="nbx-ai-tip"><Sparkles /><p>Tambahkan sumber terpercaya, deskripsi gambar, dan paragraf pembuka yang jelas.</p></div></aside>
      </div>
      <NaraAssistant user={user} open={naraOpen} onOpenChange={setNaraOpen} context={{ area: "editor", siteName: site.name, documentTitle: doc.title, documentContent: doc.content.slice(0, 12000) }} />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return <div className="nbx-empty"><Icon /><h3>{title}</h3><p>{description}</p></div>;
}
