import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function patchStudio(source){
 if(source.includes('// profile-settings-v413'))return source;
 const hash=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0'+source).digest('hex');
 if(hash!=='1f519fe361a6c58e983afd5736b95930e12a0175')throw Error('StudioNext berubah; patch dihentikan agar tidak menimpa kode lain.');
 const avatar='className="sn-avatar" onClick={() => chooseView("settings")}';
 const old='{view === "settings" && <SettingsView site={site} setSite={setSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>}';
 for(const text of [avatar,old])if(source.split(text).length!==2)throw Error('Pola navigasi tidak cocok');
 let next='import ProfilePage from "./pages/ProfilePage";\nimport SiteSettingsPage from "./pages/SiteSettingsPage";\n// profile-settings-v413\n'+source;
 next=next.replace(avatar,'className="sn-avatar" onClick={() => chooseView("profile")}');
 next=next.replace(old,'{view === "profile" && <ProfilePage key={user?.id} user={user} onProfileSaved={setProfile}/>}\n      {view === "settings" && <SiteSettingsPage key={site?.id || "none"} site={site} onDirtyChange={setSettingsDirty}/>}');
 next=next.replace('const [site, setSite] = useState(null);','const [site, setSite] = useState(null);\n  const [settingsDirty, setSettingsDirty] = useState(false);');
 next=next.replace('const chooseView = (next) => { setView(next);','const chooseView = (next) => { if (view === "settings" && next !== "settings" && settingsDirty && !window.confirm("Tinggalkan draf pengaturan yang belum disimpan?")) return; setSettingsDirty(false); setView(next);');
 next=next.replace('const selectSite = (next) => { setActiveSiteId(next.id);','const selectSite = (next) => { if (settingsDirty && !window.confirm("Pindah situs dan tinggalkan draf pengaturan?")) return; setSettingsDirty(false); setActiveSiteId(next.id);');
 return next;
}
if(process.argv[1]?.endsWith('separate-profile-settings-v413.mjs')){const p='src/StudioNext.jsx';const s=readFileSync(p,'utf8');const next=patchStudio(s);if(next!==s)writeFileSync(p,next);}
