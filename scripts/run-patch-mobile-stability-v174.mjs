import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHORITY = "mobile-stability-v174-20260731";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content, "utf8");

function replaceRequired(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`Patch v174 gagal: ${label} tidak ditemukan.`);
  return source.replace(search, replacement);
}

function patchStudioCssAuthority() {
  const file = "src/Studio.jsx";
  let source = read(file);
  source = replaceRequired(
    source,
    'import "./studio-continuity-v152.css";',
    'import "./studio-continuity-v152.css";\nimport "./studio-mobile-stability-v174.css";',
    "import CSS Studio terakhir",
  );
  write(file, source);
}

function patchStudioNext() {
  const file = "src/StudioNext.jsx";
  let source = read(file);
  if (!source.includes('Download, Eye, FilePlus2')) {
    source = replaceRequired(
      source,
      '  Activity, BarChart3, BookOpen, Check, ChevronDown, Cloud, CloudOff,\n  Eye, FilePlus2, FileText, Globe2, Image, LayoutDashboard, LoaderCircle, LogOut,',
      '  Activity, BarChart3, BookOpen, Check, ChevronDown, Cloud, CloudOff,\n  Download, Eye, FilePlus2, FileText, Globe2, Image, LayoutDashboard, LoaderCircle, LogOut,',
      "ikon Download",
    );
  }
  if (!source.includes('UserCircle, Users, X,')) {
    source = replaceRequired(
      source,
      '  ShieldCheck, Sparkles, Trash2, Users, X,',
      '  ShieldCheck, Sparkles, Trash2, UserCircle, Users, X,',
      "ikon UserCircle",
    );
  }
  source = source.replace('  createUserSite, getOrCreatePrimarySite, getUserProfile, listUserSites,', '  getOrCreatePrimarySite, getUserProfile, listUserSites,');
  if (!source.includes('from "./lib/site-policy-v169.js"')) {
    source = replaceRequired(
      source,
      '  setActiveSiteId, updateUserProfile,\n} from "./lib/studio-data";',
      '  setActiveSiteId, updateUserProfile,\n} from "./lib/studio-data";\nimport { MAX_SITES_PER_ACCOUNT, createUserSiteWithPolicy } from "./lib/site-policy-v169.js";',
      "import kebijakan 25 situs",
    );
  }
  source = replaceRequired(
    source,
    'function SiteManager({ sites, activeSite, user, onSelect, onClose, onCreated, setToast }) {\n  const [creating, setCreating] = useState(false);',
    'function SiteManager({ sites, activeSite, user, onSelect, onClose, onCreated, setToast }) {\n  const [creating, setCreating] = useState(false);\n  const limitReached = sites.length >= MAX_SITES_PER_ACCOUNT;',
    "status kuota SiteManager",
  );
  source = replaceRequired(
    source,
    '      const site = await createUserSite({ userId: user.id, name: draft.name, slug: draft.slug || draft.name, description: draft.description, blueprint: draft.blueprint });',
    '      const site = await createUserSiteWithPolicy({ userId: user.id, name: draft.name, slug: draft.slug || draft.name, description: draft.description, blueprint: draft.blueprint });',
    "pembuatan situs dengan policy",
  );
  source = replaceRequired(
    source,
    '<div className="sn-create-site"><h3>Buat situs baru</h3><div>',
    '<div className="sn-create-site"><h3>Buat situs baru</h3><p className="sn-site-quota-v174">{sites.length}/{MAX_SITES_PER_ACCOUNT} situs digunakan</p><div>',
    "indikator kuota SiteManager",
  );
  source = replaceRequired(
    source,
    '<button className="sn-primary" disabled={creating} onClick={create}>{creating ? <><LoaderCircle className="spin"/>Membuat…</> : <><Plus/>Buat situs</>}</button>',
    '<button className="sn-primary" disabled={creating || limitReached} onClick={create}>{creating ? <><LoaderCircle className="spin"/>Membuat…</> : limitReached ? `Batas ${MAX_SITES_PER_ACCOUNT} situs tercapai` : <><Plus/>Buat situs</>}</button>',
    "guard kuota SiteManager",
  );
  source = replaceRequired(
    source,
    '  const [siteManager, setSiteManager] = useState(false);\n  const [sites, setSites] = useState([]);',
    '  const [siteManager, setSiteManager] = useState(false);\n  const [profileMenu, setProfileMenu] = useState(false);\n  const [installPrompt, setInstallPrompt] = useState(null);\n  const [sites, setSites] = useState([]);',
    "state menu profil",
  );
  source = replaceRequired(
    source,
    '  useEffect(() => {\n    document.body.classList.toggle("sn-mobile-sidebar-open", deviceMode === "small" && mobileSidebar);',
    '  useEffect(() => {\n    const captureInstall = (event) => { event.preventDefault(); setInstallPrompt(event); };\n    window.addEventListener("beforeinstallprompt", captureInstall);\n    return () => window.removeEventListener("beforeinstallprompt", captureInstall);\n  }, []);\n  useEffect(() => {\n    if (!profileMenu) return undefined;\n    const close = (event) => {\n      if (event.key === "Escape" || (event.type === "pointerdown" && !event.target.closest?.(".sn-profile-menu-wrap"))) setProfileMenu(false);\n    };\n    document.addEventListener("keydown", close);\n    document.addEventListener("pointerdown", close);\n    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };\n  }, [profileMenu]);\n  useEffect(() => {\n    document.body.classList.toggle("sn-mobile-sidebar-open", deviceMode === "small" && mobileSidebar);',
    "efek profil dan install",
  );
  source = replaceRequired(
    source,
    '  const chooseView = (next) => { setView(next); setMobileSidebar(false); if (["posts", "pages"].includes(next)) setQuery(""); };',
    '  const chooseView = (next) => { setView(next); setMobileSidebar(false); setProfileMenu(false); if (["posts", "pages"].includes(next)) setQuery(""); };\n  const installApp = async () => {\n    setProfileMenu(false);\n    if (installPrompt?.prompt) {\n      await installPrompt.prompt();\n      await installPrompt.userChoice.catch(() => null);\n      setInstallPrompt(null);\n      return;\n    }\n    setToast("Gunakan menu browser lalu pilih Tambahkan ke layar utama atau Instal aplikasi");\n  };',
    "aksi install aplikasi",
  );
  source = replaceRequired(
    source,
    '          <button className="sn-avatar" onClick={() => chooseView("settings")} aria-label="Buka pengaturan profil">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : initials}</button>',
    '          <div className="sn-profile-menu-wrap"><button className="sn-avatar" onClick={() => setProfileMenu((current) => !current)} aria-label="Buka menu akun" aria-expanded={profileMenu}>{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : initials}</button>{profileMenu && <div className="sn-profile-dropdown" role="menu"><header><b>{displayName}</b><small>{user?.email || "Akun Ngeblogging"}</small></header><button role="menuitem" onClick={() => chooseView("profile")}><UserCircle/>Profil</button><button role="menuitem" onClick={() => chooseView("settings")}><Settings/>Pengaturan</button><button role="menuitem" onClick={installApp}><Download/>Dapatkan aplikasi</button><button role="menuitem" className="danger" onClick={onExit}><LogOut/>Keluar</button></div>}</div>',
    "dropdown profil",
  );
  source = source.replace(
    '<StudioSummaryV161 docs={docs} displayName={displayName} site={site} loading={contentLoading} createDoc={createDoc} openDoc={openDoc} openNara={() => setNaraOpen(true)}/>',
    '<StudioSummaryV161 docs={docs} displayName={displayName} site={site} loading={contentLoading} createDoc={createDoc} openDoc={openDoc} openNara={() => setNaraOpen(true)} openSiteManager={() => setSiteManager(true)}/>',
  );
  source = replaceRequired(
    source,
    '      {view === "settings" && <SettingsView site={site} setSite={setSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} ',
    '      {view === "profile" && <ProfileView profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} \n      {view === "settings" && <SettingsView site={site} setSite={setSite} setToast={setToast}/>} ',
    "render Profil terpisah",
  );

  if (!source.includes('data-profile-page-v174="true"')) {
    const start = source.indexOf('function SettingsView(');
    if (start < 0) throw new Error("Patch v174 gagal: fungsi SettingsView tidak ditemukan.");
    const replacement = `function ProfileView({ profile, setProfile, user, setToast }) {
  const [draft, setDraft] = useState({ displayName: profile?.display_name || "", bio: profile?.bio || "", website: profile?.website || "", avatarUrl: profile?.avatar_url || "", locale: profile?.locale || "id-ID", timezone: profile?.timezone || "Asia/Jakarta" });
  useEffect(() => setDraft({ displayName: profile?.display_name || "", bio: profile?.bio || "", website: profile?.website || "", avatarUrl: profile?.avatar_url || "", locale: profile?.locale || "id-ID", timezone: profile?.timezone || "Asia/Jakarta" }), [profile?.id]);
  const save = async () => {
    try { const next = await updateUserProfile(user.id, draft); setProfile(next); setToast("Profil disimpan"); }
    catch (error) { setToast(error.message || "Profil belum tersimpan"); }
  };
  return <div className="sn-view-pad sn-profile-page-v174" data-profile-page-v174="true"><PageTitle title="Profil" description="Identitas akun yang tampil pada workspace, penulis, dan kolaborasi."/><div className="sn-settings-grid"><section><h2>Identitas akun</h2><label>Nama tampilan<input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}/></label><label>Biografi<textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })}/></label><label>Website<input value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })}/></label><label>URL avatar<input value={draft.avatarUrl} onChange={(event) => setDraft({ ...draft, avatarUrl: event.target.value })}/></label><label>Bahasa<select value={draft.locale} onChange={(event) => setDraft({ ...draft, locale: event.target.value })}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option></select></label><label>Zona waktu<select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label></section></div><button className="sn-primary sn-save-settings" onClick={save}><Check/> Simpan profil</button></div>;
}

function SettingsView({ site, setSite, setToast }) {
  const [draft, setDraft] = useState({ name: site?.name || "", description: site?.description || "", locale: site?.locale || "id-ID", timezone: site?.timezone || "Asia/Jakarta" });
  useEffect(() => setDraft({ name: site?.name || "", description: site?.description || "", locale: site?.locale || "id-ID", timezone: site?.timezone || "Asia/Jakarta" }), [site?.id]);
  const save = async () => {
    if (!site?.id || !supabase) return setToast("Pilih atau buat situs aktif terlebih dahulu");
    try {
      const { data, error } = await supabase.from("sites").update({ name: draft.name.slice(0, 100), description: draft.description.slice(0, 1000), locale: draft.locale, timezone: draft.timezone }).eq("id", site.id).select("*").single();
      if (error) throw error;
      setSite((current) => ({ ...current, ...data })); setToast("Pengaturan situs disimpan");
    } catch (error) { setToast(error.message || "Pengaturan belum tersimpan"); }
  };
  return <div className="sn-view-pad sn-site-settings-v174"><PageTitle title="Pengaturan" description="Konfigurasi situs aktif dipisahkan dari profil akun agar lebih jelas."/>{!site?.id ? <div className="sn-empty"><Globe2/><h3>Situs aktif belum dipilih</h3><p>Buka Workspace untuk memilih atau membuat situs.</p></div> : <><div className="sn-settings-grid"><section><h2>Situs aktif</h2><label>Nama situs<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label><label>Deskripsi<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label><label>Bahasa<select value={draft.locale} onChange={(event) => setDraft({ ...draft, locale: event.target.value })}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option></select></label><label>Zona waktu<select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label></section></div><button className="sn-primary sn-save-settings" onClick={save}><Check/> Simpan pengaturan</button></>}</div>;
}
`;
    source = `${source.slice(0, start)}${replacement}`;
  }
  write(file, source);
}

function patchSummary() {
  const file = "src/StudioContentV161.jsx";
  let source = read(file);
  source = replaceRequired(
    source,
    'export function StudioSummaryV161({ docs, displayName, site, loading, createDoc, openDoc, openNara }) {',
    'export function StudioSummaryV161({ docs, displayName, site, loading, createDoc, openDoc, openNara, openSiteManager }) {',
    "prop SiteManager Ringkasan",
  );
  source = replaceRequired(
    source,
    '        {publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer"><Eye/> Lihat situs</a>}',
    '        {publicUrl ? <a href={publicUrl} target="_blank" rel="noreferrer"><Eye/> Lihat situs</a> : <button type="button" onClick={openSiteManager}><Eye/> Lihat situs</button>}',
    "tombol Lihat situs permanen",
  );
  write(file, source);
}

function patchContentEditor() {
  const file = "src/ContentEditor.jsx";
  let source = read(file);
  source = replaceRequired(
    source,
    'import "./content-editor-v162.css";',
    'import "./content-editor-v162.css";\nimport "./content-editor-v174.css";',
    "import editor v174",
  );
  source = replaceRequired(
    source,
    '<div className="ce-app" data-editor-release="v162">',
    '<div className="ce-app" data-editor-release="v162" data-mobile-editor-authority="v174">',
    "authority editor v174",
  );
  write(file, source);
}

function patchDomain() {
  const file = "src/DomainPanelV124.jsx";
  let source = read(file);
  if (!source.includes('from "./lib/site-policy-v169.js"')) {
    source = replaceRequired(
      source,
      'import { setSitePublication } from "./lib/studio-data.js";',
      'import { setSitePublication } from "./lib/studio-data.js";\nimport { MAX_SITES_PER_ACCOUNT } from "./lib/site-policy-v169.js";',
      "policy Domain",
    );
  }
  source = replaceRequired(
    source,
    '    if (!site?.id) return;\n    if (!quiet) setLoading(true);',
    '    if (!site?.id) { setLoading(false); setError("Pilih atau buat situs aktif melalui Workspace sebelum mengelola Domain."); return; }\n    if (!quiet) setLoading(true);',
    "Domain tanpa situs",
  );
  source = source.replace('{sites.length}/12 situs dalam akun', '{sites.length}/{MAX_SITES_PER_ACCOUNT} situs dalam akun');
  source = source.replace('value={`${sites.length}/12`}', 'value={`${sites.length}/${MAX_SITES_PER_ACCOUNT}`}');
  write(file, source);
}

function patchComments() {
  const file = "src/CommentsPanelV124.jsx";
  let source = read(file);
  if (!source.includes('const MOOD_EMOJIS_V174')) {
    source = replaceRequired(
      source,
      'const FILTERS = [\n',
      'const MOOD_EMOJIS_V174 = ["😀","😃","😄","😁","😊","😍","🥰","😎","🤩","😂"];\nconst REACTIONS_V174 = ["😀","😊","😍","😂","😮","😢","😡","👍","❤️","🎉"];\n\nconst FILTERS = [\n',
      "emoji komentar",
    );
  }
  source = replaceRequired(
    source,
    '    if (!site?.id || !supabase) return;\n    if (!quiet) setLoading(true);',
    '    if (!site?.id || !supabase) { setLoading(false); setError(!site?.id ? "Pilih atau buat situs aktif melalui Workspace sebelum mengelola komentar." : "Koneksi komentar belum tersedia pada perangkat ini."); return; }\n    if (!quiet) setLoading(true);',
    "Komentar tanpa situs",
  );
  source = replaceRequired(
    source,
    '<span><MessageCircle/></span><h2>Belum ada komentar</h2><p>Semua komentar baru dari Posts dan Pages akan muncul di ruang ini. Tidak ada panel kosong ganda atau tulisan yang saling bertumpuk.</p>\n      </div>',
    '<span><MessageCircle/></span><h2>Belum ada komentar</h2><p>Jadilah yang pertama membuka diskusi. Berikut pratinjau struktur komentar publik; ini bukan data komentar palsu.</p><div className="sv124-comment-preview-v174"><article><span className="avatar">NB</span><div><b>Pratinjau komentar</b><small>Avatar · nama · waktu · badge tim · status moderasi</small><p>Isi komentar, balasan bertingkat, emoji suasana, dan reaksi akan tampil di area ini.</p><div className="sv124-emoji-preview-v174" aria-label="10 emoji suasana">{MOOD_EMOJIS_V174.map((emoji) => <span key={`m-${emoji}`}>{emoji}</span>)}</div><div className="sv124-emoji-preview-v174" aria-label="10 reaksi komentar">{REACTIONS_V174.map((emoji) => <span key={`r-${emoji}`}>{emoji}</span>)}</div></div></article></div>\n      </div>',
    "empty state komentar lengkap",
  );
  source = source.replace('className="sv124-unified-empty">\n        <span><MessageCircle/></span><h2>Belum ada komentar</h2>', 'className="sv124-unified-empty" data-comment-preview-v174="true">\n        <span><MessageCircle/></span><h2>Belum ada komentar</h2>');
  write(file, source);
}

function patchApiKeys() {
  const file = "src/ApiKeysPanel.jsx";
  let source = read(file);
  if (!source.includes('API_KEY_REQUEST_TIMEOUT_V174')) {
    source = replaceRequired(
      source,
      'const API_BASE = `${configuredUrl}/functions/v1/ngeblogging-api`;',
      'const API_BASE = `${configuredUrl}/functions/v1/ngeblogging-api`;\nconst API_KEY_REQUEST_TIMEOUT_V174 = 12000;\nfunction withDeadlineV174(promise, milliseconds = API_KEY_REQUEST_TIMEOUT_V174) {\n  let timer = 0;\n  return Promise.race([promise, new Promise((_, reject) => { timer = window.setTimeout(() => reject(new Error("Layanan API Keys melewati batas waktu. Periksa koneksi lalu coba lagi.")), milliseconds); })]).finally(() => window.clearTimeout(timer));\n}',
      "timeout API Keys",
    );
  }
  source = replaceRequired(
    source,
    '      const { data, error: rpcError } = await supabase.rpc("list_api_keys");',
    '      const { data, error: rpcError } = await withDeadlineV174(supabase.rpc("list_api_keys"));',
    "load API Keys dengan timeout",
  );
  write(file, source);
}

function patchServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  if (source.includes('ngeblogging-app-v174-mobile-stability-20260731')) return;
  source = replaceRequired(
    source,
    'const VERSION = "ngeblogging-app-v171-mobile-public-20260730";',
    'const VERSION = "ngeblogging-app-v174-mobile-stability-20260731";\nconst MOBILE_PUBLIC_COMPAT_VERSION = "ngeblogging-app-v171-mobile-public-20260730";',
    "versi cache v171",
  );
  source = replaceRequired(
    source,
    'const CACHE_RELEASE = "mobile-public-cache-v171";',
    'const CACHE_RELEASE = "mobile-stability-cache-v174";\nconst MOBILE_PUBLIC_COMPAT_RELEASE = "mobile-public-cache-v171";',
    "cache release v171",
  );
  source = replaceRequired(
    source,
    'const FORCE_REFRESH_VALUE = "mobile-public-v171";',
    'const FORCE_REFRESH_VALUE = "mobile-stability-v174";\nconst MOBILE_PUBLIC_COMPAT_FORCE_REFRESH = "mobile-public-v171";',
    "force refresh v171",
  );
  source = replaceRequired(
    source,
    '    mobilePublicRelease: "mobile-public-v171-20260730",',
    '    mobilePublicRelease: "mobile-public-v171-20260730",\n    mobileStabilityRelease: "mobile-stability-v174-20260731",\n    mobilePublicCompatVersion: MOBILE_PUBLIC_COMPAT_VERSION,\n    mobilePublicCompatRelease: MOBILE_PUBLIC_COMPAT_RELEASE,\n    mobilePublicCompatForceRefresh: MOBILE_PUBLIC_COMPAT_FORCE_REFRESH,',
    "metadata service worker v174",
  );
  write(file, source);
}

function verifyComplete() {
  const checks = [
    ["src/Studio.jsx", 'studio-mobile-stability-v174.css'],
    ["src/StudioNext.jsx", 'data-profile-page-v174="true"'],
    ["src/StudioNext.jsx", 'Dapatkan aplikasi'],
    ["src/StudioNext.jsx", 'MAX_SITES_PER_ACCOUNT'],
    ["src/StudioContentV161.jsx", 'openSiteManager'],
    ["src/ContentEditor.jsx", 'data-mobile-editor-authority="v174"'],
    ["src/DomainPanelV124.jsx", 'MAX_SITES_PER_ACCOUNT'],
    ["src/CommentsPanelV124.jsx", 'MOOD_EMOJIS_V174'],
    ["src/ApiKeysPanel.jsx", 'API_KEY_REQUEST_TIMEOUT_V174'],
    ["public/sw.js", 'ngeblogging-app-v174-mobile-stability-20260731'],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) throw new Error(`Patch v174 tidak lengkap: ${missing.map(([file, marker]) => `${file}:${marker}`).join(", ")}`);
}

patchStudioCssAuthority();
patchStudioNext();
patchSummary();
patchContentEditor();
patchDomain();
patchComments();
patchApiKeys();
patchServiceWorker();
verifyComplete();
console.log(`[${AUTHORITY}] patch applied exactly once and verified`);
