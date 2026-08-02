import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/StudioNext.jsx", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "studio-v214-separated-profile-view";

function replaceRequired(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`V214_PROFILE_SOURCE_ANCHOR_MISSING:${label}`);
  source = source.replace(search, replacement);
}

if (!source.includes(RELEASE)) {
  const drawerEffect = `  useEffect(() => {
    if (deviceMode !== "small" || !mobileSidebar) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileSidebar(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [deviceMode, mobileSidebar]);`;
  replaceRequired(
    drawerEffect,
    `${drawerEffect}
  useEffect(() => {
    const openProfileV214 = () => {
      setView("profile");
      setMobileSidebar(false);
    };
    window.addEventListener("ngeblogging:open-profile-v214", openProfileV214);
    return () => window.removeEventListener("ngeblogging:open-profile-v214", openProfileV214);
  }, []); // ${RELEASE}`,
    "profile event bridge",
  );

  replaceRequired(
    '      {view === "settings" && <SettingsView site={site} setSite={setSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} ',
    '      {view === "profile" && <SettingsView mode="profile" site={site} setSite={setSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} \n      {view === "settings" && <SettingsView mode="settings" site={site} setSite={setSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} ',
    "profile settings render split",
  );

  replaceRequired(
    'function SettingsView({ site, setSite, profile, setProfile, user, setToast }) {',
    'function SettingsView({ mode = "settings", site, setSite, profile, setProfile, user, setToast }) {',
    "settings mode signature",
  );

  const oldSave = `  const save = async () => {
    try {
      const [{ data: siteData, error: siteError }, profileData] = await Promise.all([
        supabase.from("sites").update({ name: siteDraft.name.slice(0, 100), description: siteDraft.description.slice(0, 1000), locale: siteDraft.locale, timezone: siteDraft.timezone }).eq("id", site.id).select("*").single(),
        updateUserProfile(user.id, profileDraft),
      ]);
      if (siteError) throw siteError;
      setSite((current) => ({ ...current, ...siteData })); setProfile(profileData); setToast("Profil dan pengaturan situs disimpan");
    } catch (error) { setToast(error.message || "Pengaturan belum tersimpan"); }
  };`;
  const newSave = `  const save = async () => {
    try {
      if (mode === "profile") {
        const profileData = await updateUserProfile(user.id, profileDraft);
        setProfile(profileData);
        setToast("Profil disimpan");
        return;
      }
      if (!site?.id || !supabase) throw new Error("Situs aktif belum tersedia.");
      const { data: siteData, error: siteError } = await supabase.from("sites")
        .update({ name: siteDraft.name.slice(0, 100), description: siteDraft.description.slice(0, 1000), locale: siteDraft.locale, timezone: siteDraft.timezone })
        .eq("id", site.id).select("*").single();
      if (siteError) throw siteError;
      setSite((current) => ({ ...current, ...siteData }));
      setToast("Pengaturan situs disimpan");
    } catch (error) { setToast(error.message || (mode === "profile" ? "Profil belum tersimpan" : "Pengaturan belum tersimpan")); }
  };`;
  replaceRequired(oldSave, newSave, "mode-aware save");

  const oldReturn = '  return <div className="sn-view-pad"><PageTitle title="Profil & pengaturan" description="Identitas pengguna dan situs aktif."/><div className="sn-settings-grid">';
  const newReturn = '  return <div className="sn-view-pad" data-v214-profile-page={mode}><PageTitle title={mode === "profile" ? "Profil" : "Pengaturan"} description={mode === "profile" ? "Identitas pengguna Ngeblogging." : "Konfigurasi situs aktif."}/><div className="sn-settings-grid" data-v214-settings-mode={mode}>';
  replaceRequired(oldReturn, newReturn, "profile page heading and grid mode");

  replaceRequired(
    '<button className="sn-primary sn-save-settings" onClick={save}><Check/> Simpan perubahan</button>',
    '<button className="sn-primary sn-save-settings" onClick={save}><Check/> {mode === "profile" ? "Simpan profil" : "Simpan pengaturan"}</button>',
    "mode-aware save label",
  );
}

for (const marker of [
  RELEASE,
  'window.addEventListener("ngeblogging:open-profile-v214"',
  'mode="profile"',
  'data-v214-settings-mode={mode}',
  'mode === "profile" ? "Profil" : "Pengaturan"',
]) {
  if (!source.includes(marker)) throw new Error(`V214_PROFILE_SOURCE_VERIFY_FAILED:${marker}`);
}

await writeFile(file, source);
console.log(`Applied ${RELEASE}`);
