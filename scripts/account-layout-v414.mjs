import { patchStudio } from './separate-profile-settings-v413.mjs';
export const ACCOUNT_EVENT='ngeblogging:account-navigate-v414';
function replaceOnce(source,before,after){if(source.split(before).length!==2)throw Error('Pola integrasi akun berubah; build dihentikan.');return source.replace(before,after);}
const oldActions=`  if (action === "profile") {
    if (typeof window.__ngebloggingOpenAvatarPicker === "function") window.__ngebloggingOpenAvatarPicker();
    return openSettingsSection(1);
  }
  if (action === "settings") return openSettingsSection(2);`;
const newActions=`  // account-menu-navigation-v414: photo upload is not account navigation.
  if (action === "profile" || action === "settings") {
    window.dispatchEvent(new CustomEvent("${ACCOUNT_EVENT}", { detail: { view: action } }));
    return;
  }`;
const navigationEffect=`
  // account-navigation-listener-v414
  useEffect(() => {
    const navigate = (event) => {
      const next = event.detail?.view;
      if (!["profile", "settings"].includes(next) || next === view) return;
      chooseView(next);
    };
    window.addEventListener("${ACCOUNT_EVENT}", navigate);
    return () => window.removeEventListener("${ACCOUNT_EVENT}", navigate);
  }, [view, settingsDirty]);
`;
export function transformAccountModule(source,id){
 const path=id.split('?')[0].replaceAll('\\','/');
 if(path.endsWith('/src/StudioNext.jsx')){
  let code=patchStudio(source);
  if(!code.includes('// account-navigation-listener-v414'))code=replaceOnce(code,'  const [settingsDirty, setSettingsDirty] = useState(false);','  const [settingsDirty, setSettingsDirty] = useState(false);'+navigationEffect);
  for(const token of ['{view === "profile" && <ProfilePage','{view === "settings" && <SiteSettingsPage','onDirtyChange={setSettingsDirty}'])if(!code.includes(token))throw Error('Halaman akun terpisah tidak tersedia.');
  if(code.includes('{view === "settings" && <SettingsView'))throw Error('Halaman akun gabungan masih dirender.');
  return {code,map:null};
 }
 if(path.endsWith('/src/studio-shell-authority-v298.js')){
  if(source.includes('// account-menu-navigation-v414'))return {code:source,map:null};
  let code=replaceOnce(source,oldActions,newActions);
  code=replaceOnce(code,'["profile", "Profil & avatar", "Identitas dan foto profil"],','["profile", "Profil", "Identitas, sosial, dan keamanan akun"],');
  return {code,map:null};
 }
 return null;
}
