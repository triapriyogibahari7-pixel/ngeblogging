import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-source-stability-v237-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v237-source-stability-20260803";
const ACTIVE_CACHE = "source-stability-cache-v237";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V237_SAFE_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioSource() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  // v182 owns the actual 25-site guard. v237 only removes quota advertising.
  source = source
    .replace(/setToast\(`Batas maksimal \$\{MAX_SITES_PER_ACCOUNT\} situs dalam satu akun sudah tercapai`\);/g, 'setToast("Batas jumlah situs dalam akun sudah tercapai");')
    .replace(/<p className="sn-site-capacity">\{sites\.length\}\/\{MAX_SITES_PER_ACCOUNT\} situs digunakan<\/p>/g, '<p className="sn-site-capacity">Kelola situs dalam akun ini</p>')
    .replace(/<>Batas 25 situs tercapai<\/>/g, "<>Batas situs tercapai</>");

  // Profile is owned by the avatar/profile menu. Settings is site-only in source.
  source = source.replace(/<SettingsView\b[^>]*\/>/g, '<SettingsView site={site} setSite={setSite} setToast={setToast}/>');
  if (!source.includes('data-source-settings-v237="site-only"')) {
    const settingsStart = source.indexOf("function SettingsView(");
    if (settingsStart < 0) throw new Error("V237_SAFE_SETTINGS_FUNCTION_MISSING");
    const replacement = `function SettingsView({ site, setSite, setToast }) {
  const [siteDraft, setSiteDraft] = useState({
    name: site?.name || "",
    description: site?.description || "",
    locale: site?.locale || "id-ID",
    timezone: site?.timezone || "Asia/Jakarta",
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => setSiteDraft({
    name: site?.name || "",
    description: site?.description || "",
    locale: site?.locale || "id-ID",
    timezone: site?.timezone || "Asia/Jakarta",
  }), [site?.id]);
  const save = async () => {
    if (!supabase || !site?.id || saving) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("sites").update({
        name: siteDraft.name.slice(0, 100),
        description: siteDraft.description.slice(0, 1000),
        locale: siteDraft.locale,
        timezone: siteDraft.timezone,
      }).eq("id", site.id).select("*").single();
      if (error) throw error;
      setSite((current) => ({ ...current, ...data }));
      setToast("Pengaturan situs disimpan");
    } catch (error) {
      setToast(error.message || "Pengaturan belum tersimpan");
    } finally {
      setSaving(false);
    }
  };
  return <div className="sn-view-pad" data-source-settings-v237="site-only">
    <PageTitle title="Pengaturan" description="Kelola konfigurasi situs aktif. Profil akun dan avatar tetap terpisah di menu profil pojok kanan atas."/>
    <div className="sn-settings-grid sn-settings-site-only">
      <section><h2>Situs</h2><label>Nama situs<input value={siteDraft.name} onChange={(event) => setSiteDraft({ ...siteDraft, name: event.target.value })}/></label><label>Deskripsi<textarea value={siteDraft.description} onChange={(event) => setSiteDraft({ ...siteDraft, description: event.target.value })}/></label><label>Alamat situs<input value={site?.slug ? \`\${site.slug}.ngeblogging.com\` : ""} readOnly aria-readonly="true"/></label></section>
      <section><h2>Preferensi</h2><label>Bahasa<select value={siteDraft.locale} onChange={(event) => setSiteDraft({ ...siteDraft, locale: event.target.value })}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option></select></label><label>Zona waktu<select value={siteDraft.timezone} onChange={(event) => setSiteDraft({ ...siteDraft, timezone: event.target.value })}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label><div className="sn-settings-profile-note"><ShieldCheck/><span>Nama, biografi, website, dan avatar akun dikelola melalui menu Profil agar tidak bercampur dengan pengaturan situs.</span></div></section>
    </div>
    <button className="sn-primary sn-save-settings" disabled={saving} onClick={save}>{saving ? <><LoaderCircle className="spin"/> Menyimpan…</> : <><Check/> Simpan perubahan</>}</button>
  </div>;
}`;
    source = `${source.slice(0, settingsStart)}${replacement}\n`;
  }

  if (!source.includes('data-source-settings-v237="site-only"')) throw new Error("V237_SAFE_SETTINGS_NOT_PATCHED");
  if (source.includes("Profil & pengaturan")) throw new Error("V237_SAFE_MIXED_PROFILE_SETTINGS_REMAINS");
  await write(path, source);
}

async function patchDomainSource() {
  const path = "src/DomainPanelV124.jsx";
  let source = await read(path);
  source = source
    .replace(/<i>\{sites\.length\}\/\{MAX_SITES_PER_ACCOUNT\} situs dalam akun<\/i>/g, '<i>{sites.length} situs dalam akun</i>')
    .replace(/label="Kapasitas akun" value=\{`\$\{sites\.length\}\/\$\{MAX_SITES_PER_ACCOUNT\}`\}/g, 'label="Situs dalam akun" value={sites.length}');
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  for (const line of [
    `const ACTIVE_VERSION_V237 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V237 = "${ACTIVE_CACHE}";`,
    `const STUDIO_SOURCE_STABILITY_RELEASE_V237 = "${RELEASE}";`,
  ]) source = insertAfterVersion(source, line);

  source = source
    .replace('const SHELL_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-shell`;', 'const SHELL_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace('const ASSET_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-assets`;', 'const ASSET_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace("    version: ACTIVE_VERSION_V236,", "    version: ACTIVE_VERSION_V237,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V236,", "    release: ACTIVE_CACHE_RELEASE_V237,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V236", "NGE_BLOGGING_UPDATE_AVAILABLE_V237")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v237 announces a fresh shell without forced navigation, logout, or storage clearing.");

  for (const marker of [
    ACTIVE_VERSION,
    ACTIVE_CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-assets`;',
  ]) if (!source.includes(marker)) throw new Error(`V237_SAFE_SW_MARKER_MISSING:${marker}`);
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V237_SAFE_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, studio, operations, analytics, themes, widgets, auth, release] = await Promise.all([
    read("src/Studio.jsx"), read("src/studio-source-stability-v237.js"), read("src/studio-source-stability-v237.css"),
    read("src/StudioNext.jsx"), read("src/studio-operations-v41.js"), read("src/studio-analytics-v41.js"),
    read("src/theme-catalog.js"), read("src/widget-system.js"), read("src/lib/supabase.js"), read("public/release-v237.json"),
  ]);
  const checks = [
    [entry, "studio-source-stability-v237.js"], [runtime, RELEASE], [runtime, "studio-operations-v41.js"],
    [runtime, "camera-photo-file"], [css, 'data-v237-family="small"'], [css, "data-v237-domain-action"],
    [css, "tn-widget-summary"], [css, "code-left-preview-right"], [studio, 'data-source-settings-v237="site-only"'],
    [operations, "Tambah situs"], [operations, "loadAnalytics"], [analytics, "get_site_analytics_dashboard"],
    [analytics, "op41-line-v213"], [themes, "FAMILIES.flatMap"], [widgets, 'id: "custom-html"'],
    [auth, "persistSession: true"], [auth, "autoRefreshToken: true"], [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V237_SAFE_VERIFY_FAILED:${marker}`);
  if (entry.indexOf("studio-source-stability-v237.js") < entry.indexOf("studio-real-device-v236.js")) throw new Error("V237_SAFE_ENTRY_NOT_FINAL");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V237_SAFE_DESTRUCTIVE_RUNTIME_ACTION");
}

await patchStudioSource();
await patchDomainSource();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE} through the safe idempotent production driver.`);
