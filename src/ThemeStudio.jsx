import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check, ChevronDown, Cloud, Code2, Download, Eye, FileArchive,
  Gauge, Globe2, History, Laptop, Monitor, Palette, Rocket, Save, Search,
  ShieldCheck, SlidersHorizontal, Smartphone, Sparkles, Tablet, Upload, X, Zap,
  Blocks, ExternalLink, FileCode2,
} from "lucide-react";
import {
  BUILT_IN_THEMES, SITE_BLUEPRINTS, THEME_COUNT, activateTheme, buildThemeSrcDoc,
  createDefaultThemeState, getTheme, loadThemeState, normalizeThemeState,
  parseThemeFile, publishThemeDraft, restoreThemeVersion, saveThemeCode,
  saveThemeState, saveThemeWidgets, serializeThemeBackup,
} from "./theme-system";
import { BUILT_IN_WIDGETS, createDefaultWidgetState, getWidget, normalizeWidgetState, WIDGET_COUNT } from "./widget-system";
import { loadSiteThemeState, saveSiteBlueprint, saveSiteThemeState } from "./lib/theme-data";
import "./theme-next.css";
import "./theme-interface-v149.css";
import "./theme-native-v245.css";

const DEVICES = [
  { id: "application", label: "Aplikasi", icon: Smartphone, width: 360, frameClass: "mobile" },
  { id: "phone", label: "Handphone", icon: Smartphone, width: 390, frameClass: "mobile" },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 430, frameClass: "mobile" },
  { id: "compact", label: "Perangkat kecil", icon: Smartphone, width: 600, frameClass: "compact" },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 820, frameClass: "tablet" },
  { id: "laptop", label: "Laptop", icon: Laptop, width: 1180, frameClass: "laptop" },
  { id: "desktop", label: "Situs desktop", icon: Monitor, width: 1440, frameClass: "desktop" },
  { id: "computer", label: "Komputer", icon: Monitor, width: 1680, frameClass: "computer" },
];

const DEVICE_IDS = new Set(DEVICES.map((device) => device.id));
const CATEGORIES = ["Semua", ...new Set(BUILT_IN_THEMES.map((theme) => theme.category))];
const LAYOUT_SLOTS = [
  { id: "header-wide", label: "Header & navigasi", area: "below-header", group: "header" },
  { id: "left-1", label: "Widget kiri 1", area: "sidebar-left", group: "left", ordinal: 0 },
  { id: "left-2", label: "Widget kiri 2", area: "sidebar-left", group: "left", ordinal: 1 },
  { id: "left-3", label: "Widget kiri 3", area: "sidebar-left", group: "left", ordinal: 2 },
  { id: "left-4", label: "Widget kiri 4", area: "sidebar-left", group: "left", ordinal: 3 },
  { id: "content-main", label: "Post / Page utama", area: "after-content", group: "content", ordinal: 0 },
  { id: "right-1", label: "Widget kanan 1", area: "sidebar-right", group: "right", ordinal: 0 },
  { id: "right-2", label: "Widget kanan 2", area: "sidebar-right", group: "right", ordinal: 1 },
  { id: "right-3", label: "Widget kanan 3", area: "sidebar-right", group: "right", ordinal: 2 },
  { id: "right-4", label: "Widget kanan 4", area: "sidebar-right", group: "right", ordinal: 3 },
  { id: "footer-wide", label: "Footer", area: "footer-wide", group: "footer" },
];

function deviceInfo(id) {
  return DEVICES.find((device) => device.id === id) || DEVICES[6];
}

function initialPreviewDevice() {
  if (typeof window === "undefined") return "desktop";
  const root = document.documentElement;
  const responsive = root.dataset.studioResponsiveMode;
  const variant = root.dataset.studioDeviceVariant;
  if (DEVICE_IDS.has(variant)) return variant;
  if (DEVICE_IDS.has(responsive)) return responsive;
  if (navigator.userAgentData?.mobile === true || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")) return "phone";
  if (window.innerWidth <= 430) return "phone";
  if (window.innerWidth <= 600) return "mobile";
  if (window.innerWidth <= 760) return "compact";
  if (window.innerWidth <= 1024) return "tablet";
  if (window.innerWidth <= 1440) return "laptop";
  if (window.innerWidth <= 1680) return "desktop";
  return "computer";
}

function formatDate(value) {
  try { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return "baru saja"; }
}

function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DeviceSwitch({ value, onChange }) {
  return <div className="tn-device-switch" aria-label="Delapan mode pratinjau perangkat">{DEVICES.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={value === id} className={value === id ? "active" : ""} onClick={() => onChange(id)} title={`Pratinjau ${label}`}><Icon/><span>{label}</span></button>)}</div>;
}

function Modal({ title, eyebrow, onClose, size = "medium", children, footer }) {
  return <div className="tn-modal-layer" role="dialog" aria-modal="true" aria-label={title}>
    <button className="tn-modal-backdrop" onClick={onClose} aria-label="Tutup"/>
    <section className={`tn-modal ${size}`}>
      <header><div>{eyebrow && <small>{eyebrow}</small>}<h2>{title}</h2></div><button onClick={onClose} aria-label="Tutup"><X/></button></header>
      <div className="tn-modal-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>;
}

function ThemeFrame({ theme, code, config, widgets, device, title }) {
  const mode = deviceInfo(device);
  return <div className={`tn-frame-shell ${mode.frameClass}`} data-preview-device={device} data-preview-mode={device} style={{ "--tn-preview-width": `${mode.width}px` }}><iframe title={title || `Pratinjau ${theme.name}`} sandbox="allow-scripts" srcDoc={buildThemeSrcDoc(code || theme.code, config, widgets)}/></div>;
}

function ThemeCardPreview({ theme }) {
  return <div className={`tn-card-mock layout-${theme.layout}`} style={{ "--p": theme.colors.primary, "--a": theme.colors.accent, "--s": theme.colors.surface, "--i": theme.colors.ink }}>
    <header><b>{theme.name.slice(0, 1)}</b><span/><span/><span/></header>
    <main><small>{theme.category}</small><h4>{theme.name}</h4><p/><p className="short"/><div><i/><i/><i/></div></main>
  </div>;
}

function Customizer({ value, onChange, theme }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  return <div className="tn-customizer">
    <div className="tn-fields">
      <label className="wide">Nama merek<input value={value.brandName || ""} onChange={(event) => set("brandName", event.target.value)} maxLength={100}/></label>
      <div className="tn-color-grid">{[["primary","Warna utama"],["accent","Aksen"],["surface","Latar"],["ink","Teks"]].map(([key,label]) => <label key={key}><span>{label}</span><div><input type="color" value={String(value[key]).startsWith("#") ? value[key] : theme.colors[key]} onChange={(event) => set(key,event.target.value)}/><code>{value[key]}</code></div></label>)}</div>
      <div className="tn-form-grid">
        <label>Tipografi<select value={value.font} onChange={(event) => set("font", event.target.value)}><option>DM Sans</option><option>Playfair Display</option><option>Georgia</option><option>Arial</option><option>Courier New</option></select></label>
        <label>Kepadatan<select value={value.density} onChange={(event) => set("density", event.target.value)}><option value="compact">Ringkas</option><option value="comfortable">Nyaman</option><option value="spacious">Lapang</option></select></label>
        <label>Navigasi<select value={value.navigation} onChange={(event) => set("navigation", event.target.value)}><option value="centered">Tengah</option><option value="split">Terpisah</option><option value="sidebar">Sidebar</option></select></label>
        <label>Menu mobile<select value={value.mobileMenu} onChange={(event) => set("mobileMenu", event.target.value)}><option value="drawer">Drawer</option><option value="bottom-sheet">Bottom sheet</option><option value="fullscreen">Layar penuh</option></select></label>
      </div>
      <label className="tn-range"><span>Sudut elemen <b>{value.radius}px</b></span><input type="range" min="0" max="40" value={value.radius} onChange={(event) => set("radius", Number(event.target.value))}/></label>
      <label className="tn-toggle"><span><b>Mode gelap otomatis</b><small>Mengikuti preferensi perangkat pengunjung.</small></span><input type="checkbox" checked={Boolean(value.darkMode)} onChange={(event) => set("darkMode", event.target.checked)}/></label>
      <label className="wide">CSS tambahan<textarea value={value.customCss || ""} onChange={(event) => set("customCss", event.target.value)} placeholder="/* CSS tambahan situs */" spellCheck="false"/></label>
    </div>
    <ThemeFrame theme={theme} code={theme.code} config={value} widgets={[]} device="tablet" title="Pratinjau kustomisasi"/>
  </div>;
}

function CodeSurface({ language, value, onChange }) {
  const gutter = useRef(null);
  const source = String(value || "");
  const actualLines = Math.max(1, source.split("\n").length);
  const numberedLines = Math.min(10_000, actualLines);
  const lineNumbers = useMemo(() => Array.from({ length: numberedLines }, (_, index) => String(index + 1)).join("\n"), [numberedLines]);
  const syncScroll = (event) => {
    if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop;
  };
  return <div className="tn-native-code-surface" data-language={language} data-line-count={actualLines} data-max-lines="10000">
    <pre ref={gutter} className="tn-native-line-gutter" aria-hidden="true">{lineNumbers}</pre>
    <textarea aria-label={`Editor ${language} dengan nomor baris`} value={source} onScroll={syncScroll} onChange={(event) => onChange(event.target.value)} spellCheck="false" wrap="off"/>
  </div>;
}

function CodeEditor({ value, onChange, config, widgets, theme, device, onDeviceChange }) {
  const [tab, setTab] = useState("html");
  const tabs = [{ id:"html",label:"HTML",icon:FileCode2 },{ id:"css",label:"CSS",icon:Palette },{ id:"javascript",label:"JavaScript",icon:Code2 }];
  const selectedDevice = deviceInfo(device);
  const source = String(value[tab] || "");
  const lineCount = Math.max(1, source.split("\n").length);
  return <div className="tn-code-workspace tn-native-code-workspace-v245">
    <section className="tn-code-pane">
      <nav>{tabs.map(({id,label,icon:Icon}) => <button key={id} className={tab===id?"active":""} onClick={() => setTab(id)}><Icon/>{label}</button>)}</nav>
      <div className="tn-code-status"><span><ShieldCheck/> Sandbox aktif</span><small>{lineCount.toLocaleString("id-ID")} baris · {source.length.toLocaleString("id-ID")} karakter · kapasitas 10.000 baris</small></div>
      <CodeSurface language={tab} value={source} onChange={(next) => onChange({ ...value, [tab]: next })}/>
    </section>
    <section className="tn-code-preview-pane">
      <header><div><small>PREVIEW LANGSUNG</small><b>{selectedDevice.label} · {selectedDevice.width}px</b></div><DeviceSwitch value={device} onChange={onDeviceChange}/></header>
      <ThemeFrame theme={theme} code={value} config={config} widgets={widgets} device={device} title={`Pratinjau kode tema mode ${selectedDevice.label}`}/>
    </section>
  </div>;
}

function WidgetStudio({ value, onChange }) {
  const activeMap = new Map(normalizeWidgetState(value).map((entry) => [entry.id, entry]));
  const toggle = (widgetId) => {
    const existing = activeMap.get(widgetId);
    if (existing) onChange(value.filter((entry) => entry.id !== widgetId));
    else onChange([...value, { id: widgetId, enabled: true, area: "sidebar-right", order: value.length, title: getWidget(widgetId)?.name || widgetId, settings: {} }]);
  };
  const patch = (widgetId, changes) => onChange(value.map((entry) => entry.id === widgetId ? { ...entry, ...changes } : entry));
  return <div className="tn-widget-studio">
    <div className="tn-widget-summary"><Blocks/><div><b>{activeMap.size} widget aktif</b><p>Pilih dari {WIDGET_COUNT} widget asli Ngeblogging. Widget mengikuti tema dan tetap responsif.</p></div><button onClick={() => onChange(createDefaultWidgetState())}>Gunakan default</button></div>
    <div className="tn-widget-grid">{BUILT_IN_WIDGETS.map((widget) => {
      const active = activeMap.get(widget.id);
      return <article key={widget.id} className={active ? "active" : ""}>
        <button className="tn-widget-toggle" onClick={() => toggle(widget.id)}><span>{widget.icon}</span><div><small>{widget.category}</small><b>{widget.name}</b><p>{widget.description}</p></div><i>{active ? <Check/> : "+"}</i></button>
        {active && <div className="tn-widget-settings"><label>Area<select value={active.area} onChange={(event) => patch(widget.id,{area:event.target.value})}><option value="header-left">Header kiri</option><option value="header-right">Header kanan</option><option value="below-header">Di bawah header</option><option value="sidebar-left">Sidebar kiri</option><option value="before-content">Di atas postingan</option><option value="after-content">Di bawah postingan</option><option value="sidebar-right">Sidebar kanan</option><option value="footer-left">Footer kiri</option><option value="footer-right">Footer kanan</option><option value="footer-wide">Footer panjang</option></select></label><label>Judul<input value={active.title} onChange={(event) => patch(widget.id,{title:event.target.value})}/></label></div>}
      </article>;
    })}</div>
  </div>;
}

function LayoutMap({ widgets, onChange, onOpenWidgets }) {
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const enabled = normalizeWidgetState(widgets).filter((entry) => entry.enabled !== false);
  const selectedSlot = LAYOUT_SLOTS.find((slot) => slot.id === selectedSlotId) || null;

  const entriesForSlot = (slot) => {
    const explicit = enabled.filter((entry) => entry.settings?.layoutSlot === slot.id);
    if (explicit.length) return explicit;
    const areaEntries = enabled.filter((entry) => entry.area === slot.area && !entry.settings?.layoutSlot);
    const siblings = LAYOUT_SLOTS.filter((candidate) => candidate.area === slot.area);
    const siblingIndex = Math.max(0, siblings.findIndex((candidate) => candidate.id === slot.id));
    return areaEntries.filter((_, index) => index % Math.max(1, siblings.length) === siblingIndex);
  };

  const assignWidget = (widgetId) => {
    if (!selectedSlot) return;
    const normalized = normalizeWidgetState(widgets);
    const existing = normalized.find((entry) => entry.id === widgetId);
    const nextEntry = {
      id: widgetId,
      enabled: true,
      area: selectedSlot.area,
      order: existing?.order ?? normalized.length,
      title: existing?.title || getWidget(widgetId)?.name || widgetId,
      settings: { ...(existing?.settings || {}), layoutSlot: selectedSlot.id },
    };
    const next = existing ? normalized.map((entry) => entry.id === widgetId ? nextEntry : entry) : [...normalized, nextEntry];
    onChange(next);
    setSelectedSlotId("");
  };

  const clearSlot = () => {
    if (!selectedSlot) return;
    const next = normalizeWidgetState(widgets).map((entry) => entry.settings?.layoutSlot === selectedSlot.id ? { ...entry, enabled: false } : entry);
    onChange(next);
    setSelectedSlotId("");
  };

  const slotButton = (slot) => {
    const entries = entriesForSlot(slot);
    return <button type="button" key={slot.id} className={`tn-native-layout-slot ${slot.group}`} data-layout-slot={slot.id} onClick={() => setSelectedSlotId(slot.id)}>
      <span>{entries.length}</span><b>{slot.label}</b><small>{entries.length ? entries.slice(0,2).map((entry) => entry.title || getWidget(entry.id)?.name).join(" · ") : "Klik untuk memilih widget"}</small>
    </button>;
  };

  const left = LAYOUT_SLOTS.filter((slot) => slot.group === "left");
  const right = LAYOUT_SLOTS.filter((slot) => slot.group === "right");
  const header = LAYOUT_SLOTS.find((slot) => slot.group === "header");
  const content = LAYOUT_SLOTS.find((slot) => slot.group === "content");
  const footer = LAYOUT_SLOTS.find((slot) => slot.group === "footer");

  return <section className="tn-layout-studio tn-native-layout-v245" aria-label="Peta tata letak tema interaktif">
    <header className="tn-layout-studio-header"><div><small>EDIT TATA LETAK</small><h2>Denah asli tema: widget kiri, Post/Page utama, dan widget kanan.</h2><p>Setiap kotak adalah target widget nyata. Klik kotak untuk memilih salah satu dari {WIDGET_COUNT} widget, termasuk HTML / JavaScript.</p></div><button onClick={onOpenWidgets}><Blocks/> Semua widget</button></header>
    <div className="tn-native-layout-scroll">
      <div className="tn-native-layout-map">
        {slotButton(header)}
        <div className="tn-native-layout-column left">{left.map(slotButton)}</div>
        <div className="tn-native-layout-content">{slotButton(content)}<div className="tn-native-post-preview"><small>PREVIEW STRUKTUR</small><h3>Judul Post / Page</h3><p>Konten utama selalu berada di tengah. Widget kiri dan kanan tidak menutup area membaca.</p><i/><i/><i/></div></div>
        <div className="tn-native-layout-column right">{right.map(slotButton)}</div>
        {slotButton(footer)}
      </div>
    </div>
    <aside className="tn-layout-side"><small>WIDGET AKTIF</small><h3>{enabled.length} dari {WIDGET_COUNT}</h3><p>Centang menunjukkan widget aktif yang ikut tersimpan bersama tema.</p><div className="tn-layout-widget-list">{enabled.slice(0,12).map((entry) => <span key={entry.id}><Check/><b>{entry.title || getWidget(entry.id)?.name || entry.id}</b><em>{entry.settings?.layoutSlot || entry.area}</em></span>)}{!enabled.length && <span><Blocks/><b>Belum ada widget aktif</b></span>}</div><button onClick={onOpenWidgets}><Blocks/> Kelola semua widget</button></aside>
    {selectedSlot && <div className="tn-native-layout-popover" role="dialog" aria-modal="false" aria-label={`Pilih widget untuk ${selectedSlot.label}`}>
      <header><div><small>TARGET TATA LETAK</small><h3>{selectedSlot.label}</h3></div><button type="button" onClick={() => setSelectedSlotId("")} aria-label="Tutup pilihan widget"><X/></button></header>
      <div className="tn-native-layout-widget-options">{BUILT_IN_WIDGETS.map((widget) => {
        const current = enabled.find((entry) => entry.id === widget.id);
        const here = current?.settings?.layoutSlot === selectedSlot.id;
        return <button type="button" key={widget.id} className={here ? "active" : ""} onClick={() => assignWidget(widget.id)}><span>{widget.icon}</span><div><b>{widget.name}</b><small>{widget.category} · {widget.description}</small></div><i>{here ? <Check/> : "+"}</i></button>;
      })}</div>
      <footer><button type="button" onClick={clearSlot}>Kosongkan kotak</button><button type="button" onClick={onOpenWidgets}><Blocks/> Pengaturan lengkap</button></footer>
    </div>}
  </section>;
}

export default function ThemeStudio({ setToast, site, user }) {
  const [themeState, setThemeState] = useState(loadThemeState);
  const [device, setDevice] = useState(initialPreviewDevice);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [blueprint, setBlueprint] = useState(site?.blueprint || "all");
  const [modal, setModal] = useState(null);
  const [syncStatus, setSyncStatus] = useState(site?.id && user?.id ? "loading" : "local");
  const [customDraft, setCustomDraft] = useState(themeState.draftConfig);
  const [codeDraft, setCodeDraft] = useState(themeState.code);
  const [widgetDraft, setWidgetDraft] = useState(themeState.widgets);
  const fileInput = useRef(null);
  const syncTicket = useRef(0);

  useEffect(() => { saveThemeState(themeState); }, [themeState]);
  useEffect(() => { setCustomDraft(themeState.draftConfig); setCodeDraft(themeState.code); setWidgetDraft(themeState.widgets); }, [themeState]);
  useEffect(() => { if (site?.blueprint) setBlueprint(site.blueprint); }, [site?.blueprint]);
  useEffect(() => {
    if (!site?.id || !user?.id) { setSyncStatus("local"); return undefined; }
    let active = true;
    setSyncStatus("loading");
    loadSiteThemeState(site.id).then(async (stored) => {
      if (!active) return;
      if (stored) setThemeState(normalizeThemeState(stored));
      else {
        const initial = createDefaultThemeState();
        initial.draftConfig.brandName = site.name || initial.draftConfig.brandName;
        initial.publishedConfig.brandName = site.name || initial.publishedConfig.brandName;
        const seeded = normalizeThemeState(initial);
        setThemeState(seeded);
        await saveSiteThemeState(site.id, user.id, seeded);
      }
      if (active) setSyncStatus("synced");
    }).catch((error) => { console.error("Theme load failed", error); if (active) setSyncStatus("local"); });
    return () => { active = false; };
  }, [site?.id, user?.id]);

  const activeTheme = getTheme(themeState.activeThemeId);
  const previewTheme = getTheme(themeState.previewThemeId);
  const filteredThemes = useMemo(() => BUILT_IN_THEMES.filter((theme) => {
    const text = `${theme.name} ${theme.category} ${theme.description} ${theme.layout}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (category === "Semua" || theme.category === category) && (blueprint === "all" || theme.blueprints.includes(blueprint));
  }), [query, category, blueprint]);

  const persistCloud = (next) => {
    if (!site?.id || !user?.id) return;
    const ticket = ++syncTicket.current;
    setSyncStatus("syncing");
    saveSiteThemeState(site.id, user.id, next).then(() => { if (ticket === syncTicket.current) setSyncStatus("synced"); }).catch((error) => { console.error("Theme save failed", error); if (ticket === syncTicket.current) setSyncStatus("local"); setToast("Tema tersimpan di perangkat; sinkronisasi cloud belum berhasil"); });
  };
  const commit = (next, message) => { const normalized = normalizeThemeState(next); setThemeState(normalized); persistCloud(normalized); if (message) setToast(message); };
  const apply = (themeId) => { const theme = getTheme(themeId); commit(activateTheme(themeState, themeId), `Tema ${theme.name} aktif dengan HTML, CSS, widget, dan mode responsifnya`); };
  const choosePreview = (themeId) => setThemeState((current) => ({ ...current, previewThemeId: themeId }));
  const chooseBlueprint = (next) => { setBlueprint(next); if (next !== "all" && site?.id) saveSiteBlueprint(site.id,next).catch(() => setToast("Jenis situs belum tersinkron")); };
  const backup = () => { downloadFile(`ngeblogging-theme-${themeState.activeThemeId}-${new Date().toISOString().slice(0,10)}.ngeblog-theme`, serializeThemeBackup(themeState), "application/json"); setToast("Cadangan tema disimpan ke komputer"); };
  const saveHtml = () => { downloadFile(`${themeState.activeThemeId}-standalone.html`, buildThemeSrcDoc(themeState.code, themeState.publishedConfig, themeState.widgets), "text/html"); setToast("HTML tema mandiri disimpan ke komputer"); };
  const openSite = () => {
    if (!site?.slug) { setModal("preview"); return; }
    window.open(`https://${site.slug}.ngeblogging.com`, "_blank", "noopener,noreferrer");
  };
  const importFile = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (file.size > 5_000_000) { setToast("File tema maksimal 5 MB"); return; }
    try {
      const text = await file.text(); const lower = file.name.toLowerCase();
      if (lower.endsWith(".html") || lower.endsWith(".htm")) commit(saveThemeCode(themeState,{...themeState.code,html:text}),"HTML tema berhasil diimpor");
      else if (lower.endsWith(".css")) commit(saveThemeCode(themeState,{...themeState.code,css:text}),"CSS tema berhasil diimpor");
      else if (lower.endsWith(".js")) commit(saveThemeCode(themeState,{...themeState.code,javascript:text}),"JavaScript tema berhasil diimpor");
      else commit(parseThemeFile(text),"Cadangan tema berhasil diimpor");
    } catch (error) { setToast(error.message || "File tema gagal dibaca"); }
  };

  return <div className="tn-studio" data-theme-interface="v245-native">
    <input ref={fileInput} type="file" accept=".ngeblog-theme,.json,.html,.htm,.css,.js" hidden onChange={importFile}/>
    <section className="tn-hero">
      <div className="tn-hero-copy"><span><Sparkles/> TEMA NGEBLOGGING</span><h1>100 tema aktif dengan delapan pratinjau perangkat.</h1><p>Koleksi ini memiliki HTML, CSS, struktur, palet, tipografi, widget, serta perilaku responsif untuk aplikasi, handphone, mobile, perangkat kecil, tablet, laptop, situs desktop, dan komputer.</p><div className="tn-hero-actions"><button className="primary" onClick={() => setModal("customize")}><SlidersHorizontal/> Sesuaikan</button><button onClick={() => setModal("code")}><Code2/> Edit HTML / CSS / JavaScript</button><button onClick={() => setModal("widgets")}><Blocks/> {WIDGET_COUNT} Widget</button><button onClick={openSite}><ExternalLink/> Lihat situs</button></div><div className="tn-trust"><span><ShieldCheck/> Sandbox kode</span><span><Zap/> 8 pratinjau</span><span><Gauge/> SEO-ready</span><span className={syncStatus}><Cloud/> {syncStatus === "synced" ? "Cloud tersinkron" : syncStatus === "syncing" || syncStatus === "loading" ? "Menyinkronkan" : "Cadangan lokal"}</span></div></div>
      <div className="tn-active-stage"><div className="tn-stage-toolbar"><DeviceSwitch value={device} onChange={setDevice}/><b>{previewTheme.name}</b></div><ThemeFrame theme={previewTheme} code={previewTheme.id === activeTheme.id ? themeState.code : previewTheme.code} config={previewTheme.id === activeTheme.id ? themeState.publishedConfig : undefined} widgets={previewTheme.id === activeTheme.id ? themeState.widgets : createDefaultWidgetState(previewTheme.defaultWidgetIds)} device={device}/>{previewTheme.id !== activeTheme.id && <div className="tn-apply-bar"><span>Pratinjau <b>{previewTheme.name}</b></span><button onClick={() => apply(previewTheme.id)}><Check/> Gunakan tema</button></div>}</div>
    </section>

    <section className="tn-command"><div><small>TEMA AKTIF</small><b>{activeTheme.name}</b><span>{THEME_COUNT} tema · {WIDGET_COUNT} widget · diperbarui {formatDate(themeState.updatedAt)}</span></div><nav><button onClick={() => setModal("preview")}><Eye/> Preview</button><button onClick={() => setModal("code")}><Code2/> Edit kode</button><button onClick={() => fileInput.current?.click()}><Upload/> Upload tema</button><button onClick={backup}><FileArchive/> Cadangan</button><button onClick={saveHtml}><Download/> Simpan ke komputer</button><button onClick={() => setModal("history")}><History/> Pulihkan</button></nav></section>

    <LayoutMap widgets={themeState.widgets} onChange={(nextWidgets) => commit(saveThemeWidgets(themeState,nextWidgets),"Posisi widget tata letak disimpan")} onOpenWidgets={() => setModal("widgets")}/>

    <section className="tn-blueprints"><div><small>JENIS SITUS</small><h2>Blog, portofolio, forum, berita, website, landing page, dan profil.</h2></div><div className="tn-blueprint-list"><button className={blueprint === "all" ? "active" : ""} onClick={() => chooseBlueprint("all")}><Globe2/> Semua</button>{SITE_BLUEPRINTS.map((item) => <button key={item.id} className={blueprint === item.id ? "active" : ""} onClick={() => chooseBlueprint(item.id)}><b>{item.label}</b><small>{item.description}</small></button>)}</div></section>

    <section className="tn-library"><header><div><small>KOLEKSI ORIGINAL</small><h2>{THEME_COUNT} tema responsif.</h2><p>Setiap kartu memiliki fingerprint HTML dan CSS unik serta aturan untuk delapan tampilan perangkat.</p></div><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tema…"/><ChevronDown/></label></header><div className="tn-category-tabs">{CATEGORIES.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="tn-theme-grid">{filteredThemes.map((theme) => {
      const isActive = theme.id === themeState.activeThemeId;
      return <article key={theme.id} className={isActive ? "active" : ""}><button className="tn-theme-preview" onClick={() => choosePreview(theme.id)}><ThemeCardPreview theme={theme}/><span>{theme.badge}</span>{isActive && <i><Check/> Aktif</i>}</button><div><small>{theme.category} · {theme.layout}</small><h3>{theme.name}</h3><p>{theme.description}</p><nav>{theme.features.map((feature) => <span key={feature}>{feature}</span>)}</nav><footer><button onClick={() => { choosePreview(theme.id); setModal("preview"); }}><Eye/> Preview</button><button disabled={isActive} className="primary" onClick={() => apply(theme.id)}>{isActive ? "Sedang digunakan" : "Gunakan tema"}</button></footer></div></article>;
    })}</div>{!filteredThemes.length && <div className="tn-empty"><Search/><h3>Tema tidak ditemukan</h3><button onClick={() => { setQuery(""); setCategory("Semua"); setBlueprint("all"); }}>Reset filter</button></div>}</section>

    <section className="tn-audit-strip"><article><b>{THEME_COUNT}</b><span>Tema aktif dan unik</span></article><article><b>{WIDGET_COUNT}</b><span>Widget bawaan</span></article><article><b>8</b><span>Pratinjau perangkat</span></article><article><b>HTML/CSS/JS</b><span>Editor kode sandbox</span></article></section>

    {modal === "customize" && <Modal title={`Sesuaikan ${activeTheme.name}`} eyebrow="VISUAL CUSTOMIZER" size="large" onClose={() => setModal(null)} footer={<><button onClick={() => setModal(null)}>Batal</button><button onClick={() => { commit({ ...themeState, draftConfig: customDraft, updatedAt:new Date().toISOString() },"Draf tema tersimpan"); setModal(null); }}><Save/> Simpan draf</button><button className="primary" onClick={() => { commit(publishThemeDraft(themeState,customDraft,themeState.widgets),"Kustomisasi tema diterbitkan"); setModal(null); }}><Rocket/> Terbitkan</button></>}><Customizer value={customDraft} onChange={setCustomDraft} theme={activeTheme}/></Modal>}
    {modal === "code" && <Modal title="Editor HTML, CSS, dan JavaScript" eyebrow="ADVANCED THEME EDITOR" size="fullscreen" onClose={() => setModal(null)} footer={<><span><ShieldCheck/> JavaScript berjalan dalam iframe sandbox.</span><button onClick={() => setModal(null)}>Batal</button><button className="primary" onClick={() => { commit(saveThemeCode(themeState,codeDraft),"Kode tema tersimpan dan aktif"); setModal(null); }}><Save/> Simpan kode</button></>}><CodeEditor value={codeDraft} onChange={setCodeDraft} config={themeState.publishedConfig} widgets={themeState.widgets} theme={activeTheme} device={device} onDeviceChange={setDevice}/></Modal>}
    {modal === "widgets" && <Modal title={`Widget bawaan (${WIDGET_COUNT})`} eyebrow="NGEBLOGGING WIDGET STUDIO" size="large" onClose={() => setModal(null)} footer={<><button onClick={() => setModal(null)}>Batal</button><button className="primary" onClick={() => { commit(saveThemeWidgets(themeState,widgetDraft),"Susunan widget disimpan"); setModal(null); }}><Save/> Simpan widget</button></>}><WidgetStudio value={widgetDraft} onChange={setWidgetDraft}/></Modal>}
    {modal === "history" && <Modal title="Cadangan dan pemulihan tema" eyebrow="VERSION CONTROL" onClose={() => setModal(null)} footer={<><button onClick={backup}><Download/> Unduh cadangan</button><button onClick={() => fileInput.current?.click()}><Upload/> Impor cadangan</button></>}><div className="tn-history">{themeState.history.map((entry,index) => <article key={entry.id}><span>{index===0?<Check/>:index+1}</span><div><b>{entry.note}</b><small>{getTheme(entry.activeThemeId).name} · {formatDate(entry.createdAt)}</small></div><button disabled={index===0} onClick={() => { try { commit(restoreThemeVersion(themeState,entry.id),"Versi tema dipulihkan"); setModal(null); } catch(error){ setToast(error.message); } }}>{index===0?"Saat ini":"Pulihkan"}</button></article>)}</div></Modal>}
    {modal === "preview" && <Modal title={previewTheme.name} eyebrow="PREVIEW SITUS RESPONSIF" size="preview" onClose={() => setModal(null)} footer={<><DeviceSwitch value={device} onChange={setDevice}/><button onClick={openSite}><ExternalLink/> Buka situs publik</button><button className="primary" disabled={previewTheme.id===activeTheme.id} onClick={() => { apply(previewTheme.id); setModal(null); }}>{previewTheme.id===activeTheme.id?"Tema aktif":"Terapkan tema"}</button></>}><ThemeFrame theme={previewTheme} code={previewTheme.id===activeTheme.id?themeState.code:previewTheme.code} config={previewTheme.id===activeTheme.id?themeState.publishedConfig:undefined} widgets={previewTheme.id===activeTheme.id?themeState.widgets:createDefaultWidgetState(previewTheme.defaultWidgetIds)} device={device}/></Modal>}
  </div>;
}
