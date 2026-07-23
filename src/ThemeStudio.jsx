import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check, ChevronDown, Cloud, CloudOff, Code2, Copy, Crown, Download, Eye, FileArchive,
  FileCode2, Gauge, Globe2, History, Layers3, LockKeyhole,
  Monitor, Palette, Rocket, RotateCcw, Save, Search, ShieldCheck,
  SlidersHorizontal, Smartphone, Sparkles, Tablet, Upload, X, Zap,
} from "lucide-react";
import {
  BUILT_IN_THEMES,
  SITE_BLUEPRINTS,
  activateTheme,
  buildThemeSrcDoc,
  createDefaultThemeState,
  getTheme,
  loadThemeState,
  normalizeThemeState,
  parseThemeFile,
  publishThemeDraft,
  restoreThemeVersion,
  saveThemeCode,
  saveThemeState,
  serializeThemeBackup,
} from "./theme-system";
import { loadSiteThemeState, saveSiteBlueprint, saveSiteThemeState } from "./lib/studio-data";
import "./theme-studio.css";

const devices = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

const categoryOrder = ["Semua", ...new Set(BUILT_IN_THEMES.map((theme) => theme.category))];

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ThemeMockup({ theme, config, device = "desktop", compact = false }) {
  const colors = config || {
    primary: theme.colors.primary,
    accent: theme.colors.accent,
    surface: theme.colors.surface,
    ink: theme.colors.ink,
    radius: 16,
    font: theme.font,
  };
  return (
    <div
      className={`theme-mockup ${device} layout-${theme.layout} ${compact ? "compact" : ""}`}
      style={{
        "--tm-primary": colors.primary,
        "--tm-accent": colors.accent,
        "--tm-surface": colors.surface,
        "--tm-ink": colors.ink,
        "--tm-radius": `${colors.radius ?? 16}px`,
        "--tm-font": colors.font === "Playfair Display" ? '"Playfair Display", serif' : '"DM Sans", sans-serif',
      }}
    >
      <div className="tm-browser">
        <span/><span/><span/><small>ngeblogging.com</small>
      </div>
      <header className="tm-header">
        <b>{compact ? "n." : "Ngeblogging"}</b>
        <nav><span>Beranda</span><span>Jelajahi</span><span>Tentang</span></nav>
        <i>{device === "mobile" ? "☰" : "Mulai"}</i>
      </header>
      <div className="tm-body">
        <aside className="tm-side"><b>TERBARU</b><span>Wawasan</span><span>Kreativitas</span><span>Komunitas</span></aside>
        <main>
          <small>{theme.category.toUpperCase()} · PILIHAN EDITOR</small>
          <h2>{theme.layout === "community" || theme.layout === "forum" ? "Temukan orang dan ide yang menggerakkan." : "Cerita yang layak mendapat ruang istimewa."}</h2>
          <p>Desain modern, cepat, dan sepenuhnya responsif untuk semua perangkat.</p>
          <button>Jelajahi sekarang <span>→</span></button>
          <div className="tm-cards"><article/><article/><article/></div>
        </main>
      </div>
    </div>
  );
}

function DeviceSwitch({ value, onChange }) {
  return <div className="device-switch" aria-label="Ukuran pratinjau">{devices.map(({ id, label, icon: Icon }) => <button key={id} className={value === id ? "active" : ""} onClick={() => onChange(id)} title={label}><Icon/><span>{label}</span></button>)}</div>;
}

function Modal({ title, eyebrow, onClose, size = "medium", children, footer }) {
  return (
    <div className="theme-modal-layer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="theme-modal-backdrop" onClick={onClose} aria-label="Tutup"/>
      <section className={`theme-modal ${size}`}>
        <header><div>{eyebrow && <small>{eyebrow}</small>}<h2>{title}</h2></div><button className="theme-modal-close" onClick={onClose}><X/></button></header>
        <div className="theme-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

function Customizer({ theme, value, onChange }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const colors = [
    ["primary", "Warna utama"], ["accent", "Aksen"], ["surface", "Latar"], ["ink", "Teks"],
  ];
  return (
    <div className="theme-customizer">
      <div className="customizer-fields">
        <label className="wide">Nama merek<input value={value.brandName} onChange={(event) => set("brandName", event.target.value)} maxLength={100}/></label>
        <div className="color-grid">{colors.map(([key, label]) => <label key={key}><span>{label}</span><div><input type="color" value={value[key]} onChange={(event) => set(key, event.target.value)}/><code>{value[key]}</code></div></label>)}</div>
        <div className="form-grid">
          <label>Tipografi<select value={value.font} onChange={(event) => set("font", event.target.value)}><option>Playfair Display</option><option>DM Sans</option></select></label>
          <label>Kepadatan<select value={value.density} onChange={(event) => set("density", event.target.value)}><option value="compact">Ringkas</option><option value="comfortable">Nyaman</option><option value="spacious">Lapang</option></select></label>
          <label>Posisi navigasi<select value={value.navigation} onChange={(event) => set("navigation", event.target.value)}><option value="centered">Tengah</option><option value="split">Terpisah</option><option value="sidebar">Sidebar</option></select></label>
          <label>Menu mobile<select value={value.mobileMenu} onChange={(event) => set("mobileMenu", event.target.value)}><option value="bottom-sheet">Bottom sheet</option><option value="drawer">Drawer</option><option value="fullscreen">Layar penuh</option></select></label>
        </div>
        <label className="range-field"><span>Sudut elemen <b>{value.radius}px</b></span><input type="range" min="0" max="32" value={value.radius} onChange={(event) => set("radius", Number(event.target.value))}/></label>
        <label className="toggle-setting"><span><b>Mode gelap otomatis</b><small>Mengikuti preferensi perangkat pengunjung.</small></span><input type="checkbox" checked={Boolean(value.darkMode)} onChange={(event) => set("darkMode", event.target.checked)}/></label>
        <label className="wide">CSS tambahan<textarea value={value.customCss} onChange={(event) => set("customCss", event.target.value)} placeholder="/* Gaya tambahan khusus situs Anda */" spellCheck="false"/></label>
      </div>
      <div className="customizer-preview"><div className="preview-label"><span><Eye/> Pratinjau langsung</span><em>{theme.name}</em></div><ThemeMockup theme={theme} config={value} device="tablet"/></div>
    </div>
  );
}

function CodeEditor({ value, onChange, config }) {
  const [tab, setTab] = useState("html");
  const tabs = [
    { id: "html", label: "HTML", icon: FileCode2 },
    { id: "css", label: "CSS", icon: Palette },
    { id: "javascript", label: "JavaScript", icon: Code2 },
  ];
  return (
    <div className="theme-code-workspace">
      <div className="code-editor-pane">
        <nav>{tabs.map(({ id, label, icon: Icon }) => <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}><Icon/>{label}</button>)}</nav>
        <div className="code-status"><span><i/> Sandbox aman</span><small>{value[tab].length.toLocaleString("id-ID")} karakter</small></div>
        <textarea aria-label={`Editor ${tab}`} value={value[tab]} onChange={(event) => onChange({ ...value, [tab]: event.target.value })} spellCheck="false"/>
      </div>
      <div className="code-preview-pane"><div><span><Eye/> Pratinjau kode</span><small>JavaScript berjalan terisolasi</small></div><iframe title="Pratinjau kode tema" sandbox="allow-scripts" srcDoc={buildThemeSrcDoc(value, config)}/></div>
    </div>
  );
}

export default function ThemeStudio({ setToast, site, user }) {
  const [themeState, setThemeState] = useState(loadThemeState);
  const [device, setDevice] = useState("desktop");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [blueprint, setBlueprint] = useState(site?.blueprint || "all");
  const [modal, setModal] = useState(null);
  const [syncStatus, setSyncStatus] = useState(site?.id && user?.id ? "loading" : "local");
  const [customDraft, setCustomDraft] = useState(themeState.draftConfig);
  const [codeDraft, setCodeDraft] = useState(themeState.code);
  const fileInput = useRef(null);
  const syncTicket = useRef(0);

  useEffect(() => { saveThemeState(themeState); }, [themeState]);
  useEffect(() => { setCustomDraft(themeState.draftConfig); }, [themeState.draftConfig]);
  useEffect(() => { setCodeDraft(themeState.code); }, [themeState.code]);
  useEffect(() => { if (site?.blueprint) setBlueprint(site.blueprint); }, [site?.blueprint]);
  useEffect(() => {
    if (!site?.id || !user?.id) { setSyncStatus("local"); return undefined; }
    let active = true;
    setSyncStatus("loading");
    loadSiteThemeState(site.id).then(async (stored) => {
      if (!active) return;
      if (stored) {
        setThemeState(normalizeThemeState(stored));
      } else {
        const initial = createDefaultThemeState();
        initial.draftConfig.brandName = site.name || initial.draftConfig.brandName;
        initial.publishedConfig.brandName = site.name || initial.publishedConfig.brandName;
        const seeded = normalizeThemeState(initial);
        setThemeState(seeded);
        await saveSiteThemeState(site.id, user.id, seeded);
      }
      if (active) setSyncStatus("synced");
    }).catch((error) => {
      console.error("Theme Studio cloud load failed", error);
      if (active) setSyncStatus("local");
    });
    return () => { active = false; };
  }, [site?.id, user?.id]);

  const activeTheme = getTheme(themeState.activeThemeId);
  const previewTheme = getTheme(themeState.previewThemeId);
  const filteredThemes = useMemo(() => BUILT_IN_THEMES.filter((theme) => {
    const matchesQuery = `${theme.name} ${theme.category} ${theme.description}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "Semua" || theme.category === category;
    const matchesBlueprint = blueprint === "all" || theme.blueprints.includes(blueprint);
    return matchesQuery && matchesCategory && matchesBlueprint;
  }), [query, category, blueprint]);

  const persistCloud = (next) => {
    if (!site?.id || !user?.id) return;
    const ticket = ++syncTicket.current;
    setSyncStatus("syncing");
    saveSiteThemeState(site.id, user.id, next).then(() => {
      if (ticket === syncTicket.current) setSyncStatus("synced");
    }).catch((error) => {
      console.error("Theme Studio cloud save failed", error);
      if (ticket === syncTicket.current) setSyncStatus("local");
      setToast("Tema tersimpan di perangkat; sinkronisasi cloud akan dicoba kembali");
    });
  };

  const commit = (next, message) => {
    const normalized = normalizeThemeState(next);
    setThemeState(normalized);
    persistCloud(normalized);
    if (message) setToast(message);
  };

  const chooseBlueprint = (nextBlueprint) => {
    setBlueprint(nextBlueprint);
    if (nextBlueprint === "all" || !site?.id) return;
    saveSiteBlueprint(site.id, nextBlueprint).catch((error) => {
      console.error("Blueprint save failed", error);
      setToast("Jenis situs belum dapat disinkronkan");
    });
  };

  const choosePreview = (themeId) => setThemeState((current) => ({ ...current, previewThemeId: themeId }));
  const apply = (themeId) => {
    const theme = getTheme(themeId);
    commit(activateTheme(themeState, themeId), `Tema ${theme.name} aktif di semua perangkat`);
  };

  const backup = () => {
    const blob = new Blob([serializeThemeBackup(themeState)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ngeblogging-theme-${themeState.activeThemeId}-${new Date().toISOString().slice(0, 10)}.ngeblog-theme`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToast("Cadangan tema berhasil diunduh");
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) { setToast("File tema maksimal 2 MB"); return; }
    try {
      const text = await file.text();
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".html") || lower.endsWith(".htm")) {
        commit(saveThemeCode(themeState, { ...themeState.code, html: text }), "HTML tema berhasil dimasukkan");
      } else if (lower.endsWith(".css")) {
        commit(saveThemeCode(themeState, { ...themeState.code, css: text }), "CSS tema berhasil dimasukkan");
      } else if (lower.endsWith(".js")) {
        commit(saveThemeCode(themeState, { ...themeState.code, javascript: text }), "JavaScript tema berhasil dimasukkan");
      } else {
        commit(parseThemeFile(text), "Tema dan riwayatnya berhasil diimpor");
      }
    } catch (error) {
      setToast(error.message || "File tema gagal dibaca");
    }
  };

  const duplicate = (themeId) => {
    const theme = getTheme(themeId);
    const next = activateTheme(themeState, themeId);
    next.draftConfig = { ...next.draftConfig, brandName: `${next.draftConfig.brandName} · ${theme.name}` };
    commit(next, `${theme.name} diduplikasi sebagai draf kustom`);
    setCustomDraft(next.draftConfig);
    setModal("customize");
  };

  return (
    <div className="studio-content theme-studio">
      <input ref={fileInput} type="file" accept=".ngeblog-theme,.json,.html,.htm,.css,.js" hidden onChange={importFile}/>

      <section className="theme-studio-hero">
        <div className="theme-hero-copy">
          <span className="premium-kicker"><Crown/> THEME STUDIO <b>PRO</b></span>
          <h1>Identitas digital yang tidak terlihat biasa.</h1>
          <p>Bangun tampilan eksklusif, responsif, dan siap diluncurkan untuk blog, bisnis, portal berita, komunitas, forum, profil, landing page, hingga diary.</p>
          <div className="theme-hero-actions">
            <button className="theme-primary" onClick={() => setModal("customize")}><SlidersHorizontal/> Sesuaikan tema</button>
            <button onClick={() => setModal("code")}><Code2/> Edit HTML</button>
            <button onClick={() => setModal("preview")}><Eye/> Pratinjau penuh</button>
          </div>
          <div className="theme-trust"><span><ShieldCheck/> Versi aman</span><span><Zap/> Edge-ready</span><span><Smartphone/> Mobile-first</span><span className={`theme-sync ${syncStatus}`}>{syncStatus === "synced" ? <Cloud/> : <CloudOff/>}{syncStatus === "synced" ? "Tersinkron cloud" : syncStatus === "syncing" || syncStatus === "loading" ? "Menyinkronkan" : "Cadangan perangkat"}</span></div>
        </div>
        <div className="active-theme-stage">
          <div className="stage-toolbar"><div><i/><i/><i/></div><DeviceSwitch value={device} onChange={setDevice}/><span><b>Aktif</b> {activeTheme.name}</span></div>
          <div className={`stage-canvas ${device}`}><ThemeMockup theme={previewTheme} config={previewTheme.id === activeTheme.id ? themeState.publishedConfig : undefined} device={device}/></div>
          {previewTheme.id !== activeTheme.id && <div className="preview-apply-bar"><span>Anda melihat <b>{previewTheme.name}</b></span><button onClick={() => apply(previewTheme.id)}><Check/> Terapkan tema ini</button></div>}
        </div>
      </section>

      <section className="theme-command-bar">
        <div><span><Layers3/> TEMA AKTIF</span><b>{activeTheme.name}</b><small>Diperbarui {formatDate(themeState.updatedAt)} · {syncStatus === "synced" ? "cloud aman" : "tersimpan lokal"}</small></div>
        <nav>
          <button onClick={() => setModal("customize")}><SlidersHorizontal/><span>Sesuaikan</span></button>
          <button onClick={backup}><Download/><span>Cadangkan</span></button>
          <button onClick={() => fileInput.current?.click()}><Upload/><span>Masukkan file</span></button>
          <button onClick={() => setModal("history")}><RotateCcw/><span>Pulihkan</span><em>{themeState.history.length}</em></button>
          <button onClick={() => setModal("code")}><Code2/><span>Edit HTML</span></button>
        </nav>
      </section>

      <section className="theme-blueprints">
        <div className="section-heading"><div><small>ARSITEKTUR FLEKSIBEL</small><h2>Satu studio untuk semua jenis situs.</h2><p>Pilih tujuan situs agar koleksi tema difilter sesuai kebutuhan.</p></div><button className={blueprint === "all" ? "active" : ""} onClick={() => chooseBlueprint("all")}><Globe2/> Tampilkan semua</button></div>
        <div className="blueprint-rail">{SITE_BLUEPRINTS.map((item) => <button key={item.id} className={blueprint === item.id ? "active" : ""} onClick={() => chooseBlueprint(item.id)}><span>{item.label.slice(0, 1)}</span><div><b>{item.label}</b><small>{item.description}</small></div><Check/></button>)}</div>
      </section>

      <section className="theme-library">
        <div className="section-heading"><div><small>KOLEKSI ORIGINAL</small><h2>Tema premium terbatas.</h2><p>Setiap tema memiliki tata letak desktop, tablet, dan mobile tersendiri.</p></div><div className="theme-search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tema…"/><ChevronDown/></div></div>
        <div className="category-tabs">{categoryOrder.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="premium-theme-grid">{filteredThemes.map((theme) => {
          const isActive = theme.id === themeState.activeThemeId;
          return <article key={theme.id} className={isActive ? "active" : ""}>
            <div className="theme-card-preview" onClick={() => choosePreview(theme.id)}><ThemeMockup theme={theme} compact device="desktop"/><span className="theme-badge"><Sparkles/>{theme.badge}</span>{isActive && <span className="active-badge"><Check/> Tema aktif</span>}<button className="card-preview-button" onClick={(event) => { event.stopPropagation(); choosePreview(theme.id); setModal("preview"); }}><Eye/> Pratinjau</button></div>
            <div className="theme-card-info"><div><small>{theme.category}</small><h3>{theme.name}</h3><p>{theme.description}</p></div><div className="feature-pills">{theme.features.map((feature) => <span key={feature}>{feature}</span>)}</div><footer><button onClick={() => duplicate(theme.id)}><Copy/> Duplikat</button><button className={isActive ? "current" : "apply"} disabled={isActive} onClick={() => apply(theme.id)}>{isActive ? <><Check/> Sedang digunakan</> : <>Gunakan tema <span>→</span></>}</button></footer></div>
          </article>;
        })}</div>
        {filteredThemes.length === 0 && <div className="theme-empty"><Search/><h3>Tema tidak ditemukan</h3><p>Ubah pencarian, kategori, atau jenis situs.</p><button onClick={() => { setQuery(""); setCategory("Semua"); setBlueprint("all"); }}>Reset filter</button></div>}
      </section>

      <section className="theme-performance">
        <div><span><Gauge/></span><small>PERFORMA</small><b>Core Web Vitals ready</b><p>Komponen ringan, lazy loading, dan aset responsif.</p></div>
        <div><span><Smartphone/></span><small>RESPONSIF</small><b>3 mode perangkat</b><p>Desktop, tablet, dan mobile diuji sebagai pengalaman berbeda.</p></div>
        <div><span><LockKeyhole/></span><small>PEMULIHAN</small><b>{themeState.history.length} versi tersimpan</b><p>Kembali ke desain sebelumnya tanpa kehilangan pekerjaan.</p></div>
        <div><span><Rocket/></span><small>PELUNCURAN</small><b>Siap custom domain</b><p>Desain terbit mengikuti situs dan subdomain pilihan Anda.</p></div>
      </section>

      {modal === "customize" && <Modal title={`Sesuaikan ${activeTheme.name}`} eyebrow="VISUAL CUSTOMIZER" size="large" onClose={() => setModal(null)} footer={<><button onClick={() => { commit({ ...themeState, draftConfig: customDraft, updatedAt: new Date().toISOString() }, "Draf desain tersimpan"); setModal(null); }}><Save/> Simpan draf</button><button className="theme-primary" onClick={() => { commit(publishThemeDraft(themeState, customDraft), "Kustomisasi diterbitkan ke semua perangkat"); setModal(null); }}><Rocket/> Terbitkan perubahan</button></>}><Customizer theme={activeTheme} value={customDraft} onChange={setCustomDraft}/></Modal>}

      {modal === "code" && <Modal title="Editor kode tema" eyebrow="ADVANCED MODE" size="fullscreen" onClose={() => setModal(null)} footer={<><span className="editor-safety"><ShieldCheck/> Pratinjau JavaScript berjalan dalam sandbox terisolasi.</span><button onClick={() => setModal(null)}>Batal</button><button className="theme-primary" onClick={() => { commit(saveThemeCode(themeState, codeDraft), "Kode HTML, CSS, dan JavaScript tersimpan"); setModal(null); }}><Save/> Simpan kode</button></>}><CodeEditor value={codeDraft} onChange={setCodeDraft} config={themeState.publishedConfig}/></Modal>}

      {modal === "history" && <Modal title="Riwayat & pemulihan" eyebrow="VERSION CONTROL" onClose={() => setModal(null)} footer={<><button onClick={backup}><FileArchive/> Unduh cadangan penuh</button><button onClick={() => fileInput.current?.click()}><Upload/> Impor cadangan</button></>}><div className="theme-history"><div className="history-notice"><History/><div><b>Semua perubahan penting memiliki titik pemulihan.</b><p>Memulihkan versi tidak menghapus riwayat saat ini.</p></div></div>{themeState.history.map((entry, index) => <article key={entry.id}><span>{index === 0 ? <Check/> : index + 1}</span><div><b>{entry.note}</b><small>{getTheme(entry.activeThemeId).name} · {formatDate(entry.createdAt)}</small></div><button onClick={() => { try { commit(restoreThemeVersion(themeState, entry.id), "Versi tema berhasil dipulihkan"); setModal(null); } catch (error) { setToast(error.message); } }} disabled={index === 0}>{index === 0 ? "Versi saat ini" : "Pulihkan"}</button></article>)}</div></Modal>}

      {modal === "preview" && <Modal title={previewTheme.name} eyebrow="IMMERSIVE PREVIEW" size="preview" onClose={() => setModal(null)} footer={<><DeviceSwitch value={device} onChange={setDevice}/><button onClick={() => duplicate(previewTheme.id)}><Copy/> Duplikat & sesuaikan</button><button className="theme-primary" disabled={previewTheme.id === activeTheme.id} onClick={() => { apply(previewTheme.id); setModal(null); }}>{previewTheme.id === activeTheme.id ? <><Check/> Tema aktif</> : <><Rocket/> Terapkan tema</>}</button></>}><div className={`immersive-preview ${device}`}><ThemeMockup theme={previewTheme} config={previewTheme.id === activeTheme.id ? themeState.publishedConfig : undefined} device={device}/></div></Modal>}
    </div>
  );
}
