import {transformNaraHelpModule} from './nara-help-v416.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('Pola UI pemilik berubah; build dihentikan.');return s.replace(a,b);}
const siteSync=`useEffect(() => { const applied = (event) => { const next = event.detail; if (!next?.id) return; setSite(current => current?.id === next.id ? {...current,...next} : current); setSites(all => all.map(item => item.id === next.id ? {...item,...next} : item)); }; window.addEventListener('ngeblogging:site-settings-applied-v418', applied); return () => window.removeEventListener('ngeblogging:site-settings-applied-v418', applied); }, []);\n  `;
export function transformOwnerModule(source,id){
 const prior=transformNaraHelpModule(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');
 if(path.endsWith('/src/StudioNext.jsx')){
  code="import OwnerDashboardPage from './pages/OwnerDashboardPage';\n"+code;
  code=once(code,'["profile", "settings", "nara-help"].includes(next)','["profile", "settings", "nara-help", "owner-dashboard"].includes(next)');
  code=once(code,'// account-navigation-listener-v414',siteSync+'// account-navigation-listener-v414');
  code=once(code,'{view === "nara-help" && <NaraHelpPage','{view === "owner-dashboard" && <OwnerDashboardPage onBack={()=>chooseView("home")} onOpenProfile={()=>chooseView("profile")}/>}\n      {view === "nara-help" && <NaraHelpPage');
  return {code,map:null};
 }
 if(path.endsWith('/src/studio-shell-authority-v298.js')){
  code=once(code,'["profile", "Profil", "Identitas, sosial, dan keamanan akun"],','["dashboard", "Dashboard Pemilik", "Seluruh Post, Pages, dan status monetisasi akun"],\n    ["profile", "Profil", "Identitas, sosial, dan keamanan akun"],');
  code=once(code,'function runProfileAction(action) {\n  closeProfileMenu();','function runProfileAction(action) {\n  closeProfileMenu();\n  if (action === "dashboard") { window.dispatchEvent(new CustomEvent("ngeblogging:account-navigate-v414", {detail:{view:"owner-dashboard"}})); return; }');
  return {code,map:null};
 }
 if(path.endsWith('/src/pages/ProfilePage.jsx')){code="import VerificationIdentityCard from '../components/account/VerificationIdentityCard';\n"+code;code=once(code,'<ProfilePhotoControls','<VerificationIdentityCard user={user} profile={p}/><ProfilePhotoControls');return {code,map:null};}
 if(path.endsWith('/src/pages/SiteSettingsPage.jsx')){
  code=once(code,'maxLength={10000}','maxLength={tab==="general"&&key==="description"?500:10000}');
  code=once(code,'maxLength={2000} min={0}','maxLength={tab==="general"?(key==="title"?100:key==="contactEmail"?320:key==="language"?20:80):2000} min={0}');
  code=once(code,'Konfigurasi tersimpan. Penerapan pada situs publik belum diaktifkan dalam tahap ini.','Pengaturan Umum diterapkan ke data situs. Bagian lain tersimpan sebagai konfigurasi; penerapan renderer/edge masing-masing belum seluruhnya aktif.');
  code=once(code,'Tahap penyimpanan: konfigurasi ini belum diterapkan ke renderer/Cloudflare. HTTPS tidak menerbitkan sertifikat, skrip tidak dieksekusi, dan Rewards belum menayangkan iklan. Tidak mengubah keamanan dashboard atau akses publik situs.','Nama, deskripsi, bahasa, dan zona waktu pada Umum disimpan ke data situs asli. Bagian lain masih berupa konfigurasi sampai adapter publiknya aktif. HTTPS tidak menerbitkan sertifikat, skrip tidak dieksekusi, dan Rewards belum menayangkan iklan.');
  code=once(code,'<aside className="nb-section nb-warning">','{!ready&&<section className="nb-section"><p>Memuat pengaturan. Jika gagal, periksa sesi dan verifikasi autentikator di Profil.</p><button type="button" onClick={()=>{setMessage("Memuat ulang…");settings(site.id).then(r=>{setConfig(normalize(r.config));setRevision(r.revision);setReady(true);setMessage("");}).catch(e=>setMessage(e.message));}}>Coba muat ulang</button><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent("ngeblogging:account-navigate-v414",{detail:{view:"profile"}}))}>Buka keamanan Profil</button></section>}<aside className="nb-section nb-warning">');
  return {code,map:null};
 }
 return prior;
}
