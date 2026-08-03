import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-source-stability-v237-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v237-source-stability-20260803";
const ACTIVE_CACHE = "source-stability-cache-v237";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V237_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V237_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioSource() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  // Keep the internal 25-site guard introduced by v182, but do not advertise
  // the quota number in ordinary UI copy.
  source = source
    .replace("setToast(`Batas maksimal ${MAX_SITES_PER_ACCOUNT} situs dalam satu akun sudah tercapai`);", 'setToast("Batas jumlah situs dalam akun sudah tercapai");')
    .replace('<p className="sn-site-capacity">{sites.length}/{MAX_SITES_PER_ACCOUNT} situs digunakan</p>', '<p className="sn-site-capacity">Kelola situs dalam akun ini</p>')
    .replace('sites.length >= MAX_SITES_PER_ACCOUNT ? <>Batas 25 situs tercapai</> :', 'sites.length >= MAX_SITES_PER_ACCOUNT ? <>Batas situs tercapai</> :');

  if (!source.includes("openSiteManager={() => setSiteManager(true)}")) {
    source = replaceRequired(
      source,
      '<HomeView docs={docs} displayName={displayName} site={site} loading={contentLoading} createDoc={createDoc} openDoc={openDoc} openNara={() => setNaraOpen(true)}/>',
      '<HomeView docs={docs} displayName={displayName} site={site} loading={contentLoading} createDoc={createDoc} openDoc={openDoc} openNara={() => setNaraOpen(true)} openSiteManager={() => setSiteManager(true)}/>',
      "Ringkasan HomeView props",
    );
  }

  if (!source.includes("function HomeView({ docs, displayName, site, loading, createDoc, openDoc, openNara, openSiteManager })")) {
    source = replaceRequired(
      source,
      "function HomeView({ docs, displayName, site, loading, createDoc, openDoc, openNara })",
      "function HomeView({ docs, displayName, site, loading, createDoc, openDoc, openNara, openSiteManager })",
      "Ringkasan HomeView signature",
    );
  }

  if (!source.includes("sn-add-site-summary")) {
    const anchor = '{site?.slug && <a className="sn-secondary-link" href={`https://${site.slug}.ngeblogging.com`} target="_blank" rel="noreferrer"><Eye/> Lihat situs</a>}<button onClick={() => createDoc("page")}>';
    const replacement = '{site?.slug && <a className="sn-secondary-link" href={`https://${site.slug}.ngeblogging.com`} target="_blank" rel="noreferrer"><Eye/> Lihat situs</a>}<button className="sn-add-site-summary" onClick={openSiteManager}><Plus/> Tambahkan situs</button><button onClick={() => createDoc("page")}>';
    source = replaceRequired(source, anchor, replacement, "Tambah situs Ringkasan");
  }

  source = source.replace(
    '<SettingsView site={site} setSite={setSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>',
    '<SettingsView site={site} setSite={setSite} setToast={setToast}/>',
  );

  if (!source.includes('data-source-settings-v237="site-only"')) {
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
    if (!/function SettingsView\([\s\S]*$/.test(source)) throw new Error("V237_SETTINGS_FUNCTION_MISSING");
    source = source.replace(/function SettingsView\([\s\S]*$/, replacement);
  }

  for (const marker of [
    "const MAX_SITES_PER_ACCOUNT = 25;",
    "Batas jumlah situs dalam akun sudah tercapai",
    "sn-add-site-summary",
    'data-source-settings-v237="site-only"',
    'title="Pengaturan"',
    "Profil akun dan avatar tetap terpisah",
  ]) if (!source.includes(marker)) throw new Error(`V237_STUDIO_MARKER_MISSING:${marker}`);
  if (source.includes("Batas 25 situs tercapai") || source.includes("/{MAX_SITES_PER_ACCOUNT} situs digunakan")) throw new Error("V237_VISIBLE_SITE_CAP_REMAINS");

  await write(path, source);
}

async function patchDomainSource() {
  const path = "src/DomainPanelV124.jsx";
  let source = await read(path);
  source = source
    .replace('<i>{sites.length}/{MAX_SITES_PER_ACCOUNT} situs dalam akun</i>', '<i>{sites.length} situs dalam akun</i>')
    .replace('label="Kapasitas akun" value={`${sites.length}/${MAX_SITES_PER_ACCOUNT}`}', 'label="Situs dalam akun" value={sites.length}');
  if (!source.includes("const MAX_SITES_PER_ACCOUNT = 25;")) throw new Error("V237_INTERNAL_SITE_LIMIT_MISSING");
  if (source.includes("/{MAX_SITES_PER_ACCOUNT} situs dalam akun") || source.includes("`${sites.length}/${MAX_SITES_PER_ACCOUNT}`")) throw new Error("V237_DOMAIN_VISIBLE_CAP_REMAINS");
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

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V237_SHELL_V236_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V237_ASSET_V236_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V236,", "    version: ACTIVE_VERSION_V237,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V236,", "    release: ACTIVE_CACHE_RELEASE_V237,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V236", "NGE_BLOGGING_UPDATE_AVAILABLE_V237")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v237 announces a fresh shell without forced navigation, logout, or storage clearing.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V237_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V237_DESTRUCTIVE_SW_ACTION");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, nextShell, nextAsset]) {
    if (!source.includes(marker)) throw new Error(`V237_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, studio, domain, operations, analytics, themes, widgets, auth, release] = await Promise.all([
    read("src/Studio.jsx"), read("src/studio-source-stability-v237.js"), read("src/studio-source-stability-v237.css"),
    read("src/StudioNext.jsx"), read("src/DomainPanelV124.jsx"), read("src/studio-operations-v41.js"),
    read("src/studio-analytics-v41.js"), read("src/theme-catalog.js"), read("src/widget-system.js"),
    read("src/lib/supabase.js"), read("public/release-v237.json"),
  ]);
  const checks = [
    [entry, "studio-source-stability-v237.js"],
    [runtime, RELEASE], [runtime, 'import "./studio-operations-v41.js"'], [runtime, "camera-photo-file"],
    [css, 'data-v237-family="small"'], [css, "stacked-actions"], [css, "tn-widget-summary"], [css, "code-left-preview-right"],
    [studio, 'data-source-settings-v237="site-only"'], [studio, "sn-add-site-summary"], [studio, "MAX_SITES_PER_ACCOUNT = 25"],
    [domain, "MAX_SITES_PER_ACCOUNT = 25"],
    [operations, "loadAnalytics"], [analytics, "get_site_analytics_dashboard"], [analytics, "op41-line-v213"],
    [themes, "FAMILIES.flatMap"], [widgets, 'id: "custom-html"'],
    [auth, "persistSession: true"], [auth, "autoRefreshToken: true"],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V237_VERIFY_FAILED:${marker}`);
  if (entry.indexOf("studio-source-stability-v237.js") < entry.indexOf("studio-real-device-v236.js")) throw new Error("V237_ENTRY_NOT_FINAL");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V237_DESTRUCTIVE_RUNTIME_ACTION");
}

await patchStudioSource();
await patchDomainSource();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; v236 is backed up and v233 session/data recovery remains preserved.`);
