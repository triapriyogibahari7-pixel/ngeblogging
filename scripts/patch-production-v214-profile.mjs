import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/StudioNext.jsx", import.meta.url);
let source = await readFile(file, "utf8");

function replaceRequired(value, search, replacement, label) {
  if (!value.includes(search)) throw new Error(`V214_PROFILE_ANCHOR_MISSING:${label}`);
  return value.replace(search, replacement);
}

source = replaceRequired(
  source,
  "  ShieldCheck, Sparkles, Trash2, Users, X,",
  "  ShieldCheck, Sparkles, Trash2, UserRound, Users, X,",
  "UserRound import",
);

source = replaceRequired(
  source,
  '  const [siteManager, setSiteManager] = useState(false);\n  const [sites, setSites] = useState([]);',
  '  const [siteManager, setSiteManager] = useState(false);\n  const [profileMenu, setProfileMenu] = useState(false);\n  const [sites, setSites] = useState([]);',
  "profile menu state",
);

const mobileEscapeBlock = `  useEffect(() => {
    if (deviceMode !== "small" || !mobileSidebar) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileSidebar(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [deviceMode, mobileSidebar]);`;
const profileEffect = `${mobileEscapeBlock}
  useEffect(() => {
    if (!profileMenu) return undefined;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && event.target.closest?.(".sn-profile-menu-wrap")) return;
      setProfileMenu(false);
    };
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", close, true);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", close, true);
    };
  }, [profileMenu]);`;
source = replaceRequired(source, mobileEscapeBlock, profileEffect, "profile close effect");

const oldAvatar = '<button className="sn-avatar" onClick={() => chooseView("settings")} aria-label="Buka pengaturan profil">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : initials}</button>';
const newAvatar = `<div className="sn-profile-menu-wrap">
            <button className="sn-avatar" onClick={() => setProfileMenu((current) => !current)} aria-label="Buka menu profil" aria-haspopup="menu" aria-expanded={profileMenu}>{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : initials}</button>
            {profileMenu && <div className="sn-profile-menu" role="menu" aria-label="Menu profil">
              <button type="button" onClick={() => { setProfileMenu(false); chooseView("profile"); }}><UserRound/><span>Profil</span></button>
              <button type="button" onClick={() => { setProfileMenu(false); chooseView("settings"); }}><Settings/><span>Pengaturan</span></button>
              <button type="button" className="danger" onClick={() => { setProfileMenu(false); onExit(); }}><LogOut/><span>Keluar</span></button>
            </div>}
          </div>`;
source = replaceRequired(source, oldAvatar, newAvatar, "profile dropdown markup");

const oldSettingsRender = '      {view === "settings" && <SettingsView site={site} setSite={setSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} ';
const newSettingsRender = '      {view === "profile" && <ProfileView profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} \n      {view === "settings" && <SiteSettingsView site={site} setSite={setSite} setToast={setToast}/>} ';
source = replaceRequired(source, oldSettingsRender, newSettingsRender, "separate profile/settings views");

const settingsStart = source.indexOf("function SettingsView(");
if (settingsStart < 0) throw new Error("V214_PROFILE_ANCHOR_MISSING:SettingsView");
const replacement = `function ProfileView({ profile, setProfile, user, setToast }) {
  const [draft, setDraft] = useState({
    displayName: profile?.display_name || user?.user_metadata?.full_name || "",
    bio: profile?.bio || "",
    website: profile?.website || "",
    avatarUrl: profile?.avatar_url || "",
    locale: profile?.locale || "id-ID",
    timezone: profile?.timezone || "Asia/Jakarta",
  });
  useEffect(() => setDraft({
    displayName: profile?.display_name || user?.user_metadata?.full_name || "",
    bio: profile?.bio || "",
    website: profile?.website || "",
    avatarUrl: profile?.avatar_url || "",
    locale: profile?.locale || "id-ID",
    timezone: profile?.timezone || "Asia/Jakarta",
  }), [profile?.id, user?.id]);
  const initials = (draft.displayName || user?.email || "NB").split(/\\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NB";
  const save = async () => {
    try {
      if (!user?.id) throw new Error("Sesi pengguna belum tersedia.");
      if (!supabaseConfigured) {
        setProfile((current) => ({ ...current, display_name:draft.displayName, bio:draft.bio, website:draft.website, avatar_url:draft.avatarUrl, locale:draft.locale, timezone:draft.timezone }));
        setToast("Profil disimpan pada sesi perangkat");
        return;
      }
      const updated = await updateUserProfile(user.id, draft);
      setProfile(updated);
      setToast("Profil disimpan");
    } catch (error) {
      setToast(error.message || "Profil belum tersimpan");
    }
  };
  return <div className="sn-view-pad sn-profile-page"><PageTitle title="Profil" description="Identitas akun Anda dipisahkan dari pengaturan situs agar lebih jelas dan mudah dikelola."/><section className="sn-profile-card-v214"><div className="sn-profile-identity-v214"><span className="sn-profile-avatar-v214">{draft.avatarUrl ? <img src={draft.avatarUrl} alt=""/> : initials}</span><b>{draft.displayName || "Profil pengguna"}</b><small>{user?.email || "Akun Ngeblogging"}</small></div><div><div className="sn-profile-fields-v214"><label>Nama tampilan<input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName:event.target.value })}/></label><label>Website<input value={draft.website} onChange={(event) => setDraft({ ...draft, website:event.target.value })}/></label><label className="wide">Biografi<textarea rows="5" value={draft.bio} onChange={(event) => setDraft({ ...draft, bio:event.target.value })}/></label><label className="wide">URL avatar<input value={draft.avatarUrl} onChange={(event) => setDraft({ ...draft, avatarUrl:event.target.value })}/></label><label>Bahasa<select value={draft.locale} onChange={(event) => setDraft({ ...draft, locale:event.target.value })}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option></select></label><label>Zona waktu<select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone:event.target.value })}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label></div><button className="sn-primary sn-save-settings" onClick={save}><Check/> Simpan profil</button></div></section></div>;
}

function SiteSettingsView({ site, setSite, setToast }) {
  const [draft, setDraft] = useState({ name:site?.name || "", description:site?.description || "", locale:site?.locale || "id-ID", timezone:site?.timezone || "Asia/Jakarta" });
  useEffect(() => setDraft({ name:site?.name || "", description:site?.description || "", locale:site?.locale || "id-ID", timezone:site?.timezone || "Asia/Jakarta" }), [site?.id]);
  const save = async () => {
    try {
      if (!site?.id || !supabaseConfigured || !supabase) {
        setSite((current) => ({ ...current, ...draft }));
        setToast("Pengaturan situs disimpan pada sesi perangkat");
        return;
      }
      const { data, error } = await supabase.from("sites").update({
        name:draft.name.slice(0,100),
        description:draft.description.slice(0,1000),
        locale:draft.locale,
        timezone:draft.timezone,
      }).eq("id", site.id).select("*").single();
      if (error) throw error;
      setSite((current) => ({ ...current, ...data }));
      setToast("Pengaturan situs disimpan");
    } catch (error) {
      setToast(error.message || "Pengaturan situs belum tersimpan");
    }
  };
  return <div className="sn-view-pad sn-site-settings-page"><PageTitle title="Pengaturan" description="Konfigurasi situs aktif. Profil akun dikelola terpisah dari menu profil."/><section className="sn-profile-card-v214"><div className="sn-profile-identity-v214"><span className="sn-profile-avatar-v214"><Settings/></span><b>{site?.name || "Situs aktif"}</b><small>{site?.slug ? site.slug + ".ngeblogging.com" : "Pengaturan situs"}</small></div><div><div className="sn-site-settings-fields-v214"><label>Nama situs<input value={draft.name} onChange={(event) => setDraft({ ...draft, name:event.target.value })}/></label><label>Bahasa<select value={draft.locale} onChange={(event) => setDraft({ ...draft, locale:event.target.value })}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option></select></label><label className="wide">Deskripsi<textarea rows="6" value={draft.description} onChange={(event) => setDraft({ ...draft, description:event.target.value })}/></label><label>Zona waktu<select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone:event.target.value })}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label></div><button className="sn-primary sn-save-settings" onClick={save}><Check/> Simpan pengaturan</button></div></section></div>;
}
`;
source = `${source.slice(0, settingsStart)}${replacement}`;

for (const marker of [
  "profileMenu",
  "sn-profile-menu-wrap",
  "sn-profile-menu",
  'chooseView("profile")',
  "function ProfileView",
  "function SiteSettingsView",
  "Simpan profil",
  "Simpan pengaturan",
]) {
  if (!source.includes(marker)) throw new Error(`V214_PROFILE_VERIFY_FAILED:${marker}`);
}

await writeFile(file, source);
console.log("Applied Studio v214 separated Profile / Settings / Logout dropdown");
