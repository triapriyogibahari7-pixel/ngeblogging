import {transformPrivacyModule} from './account-privacy-v419.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('Pola pengelolaan situs berubah; build dihentikan.');return s.replace(a,b);}
const combined=`  if (action === "add-site" || action === "switch-site") {
    document.querySelector(".sn-workspace")?.click();
    window.setTimeout(() => {
      const target = action === "add-site"
        ? document.querySelector(".sn-create-site input")
        : document.querySelector(".sn-sites-list button,.sn-sites-list a");
      target?.focus?.({ preventScroll:true });
      target?.scrollIntoView?.({ block:"nearest" });
    }, 70);
    return;
  }`;
export function transformSiteMenus(source,id){
 const previous=transformPrivacyModule(source,id);let code=previous?.code||source;const path=id.split('?')[0].replaceAll('\\','/');
 if(path.endsWith('/src/studio-shell-authority-v298.js')){
  code='import {openCreateSiteV303} from "./studio-add-site-v303.js";\nimport {openSiteSwitcherV305} from "./studio-site-switcher-v305.js";\n'+code;
  code=once(code,combined,'  if (action === "add-site") return openCreateSiteV303();\n  if (action === "switch-site") return openSiteSwitcherV305();');
  code=once(code,'button.addEventListener("click", () => document.querySelector(".sn-workspace")?.click());','button.addEventListener("click", () => openCreateSiteV303());');
  return {code,map:null};
 }
 if(path.endsWith('/src/StudioNext.jsx')){
  code='import {openSiteSwitcherV305} from "./studio-site-switcher-v305.js";\nimport "./styles/site-management-v420.css";\n'+code;
  return {code:once(code,'className="sn-workspace" onClick={() => setSiteManager(true)}','className="sn-workspace" onClick={() => openSiteSwitcherV305()}'),map:null};
 }
 if(path.endsWith('/src/pages/SiteSettingsPage.jsx')){
  code="import OwnerIdentityHeader from '../components/account/OwnerIdentityHeader';\n"+code;
  return {code:once(code,'<header><small>SITUS AKTIF</small>','<header><small>SITUS AKTIF</small><div className="sm420-account"><small>AKUN YANG MASUK</small><OwnerIdentityHeader/></div>'),map:null};
 }
 if(path.endsWith('/src/studio-add-site-v303.js')){
  code=once(code,'window.addEventListener("click", interceptedAddSiteClick, true);','// v420: explicit routes own site creation; no competing global click capture.');
  code=once(code,'String(form.elements.description?.value || "").trim().slice(0, 1000)','String(form.elements.description?.value || "").trim().slice(0, 500)');
  code=once(code,'maxlength="1000"','maxlength="500"');
  code=once(code,'.update({ theme_key: draft.themeKey, locale: draft.locale, settings })','.update({ theme_key: draft.themeKey, locale: draft.locale, timezone: draft.timezone, settings })');
  return {code,map:null};
 }
 if(path.endsWith('/src/studio-site-switcher-v305.js')){
  code=once(code,'window.addEventListener("click", capturedSiteAction, true);','// v420: explicit routes own site switching; no competing global click capture.');
  code=once(code,'const confirmed = window.confirm(`Hapus ${name}? Semua konten dan data yang terkait dengan situs ini akan ikut dihapus. Tindakan ini tidak dapat dibatalkan.`);','const typed = window.prompt(`Ketik subdomain "${site.slug}" untuk menghapus situs "${name}". Cadangkan data terlebih dahulu.`);\n  if (typed !== site.slug) { setStatus("Penghapusan dibatalkan: subdomain konfirmasi tidak cocok.", "ready"); return; }\n  const confirmed = window.confirm(`Hapus ${name}? Post, Pages, dan data yang mengikuti relasi database dapat ikut terhapus. Tindakan ini tidak dapat dibatalkan. Pembersihan berkas storage dan DNS merupakan proses terpisah.`);');
  code=once(code,'await currentUserId();\n    const { data, error } = await supabase.from("sites").delete().eq("id", site.id).select("id");','const userId = await currentUserId();\n    const { data, error } = await supabase.from("sites").delete().eq("id", site.id).eq("owner_id", userId).select("id");');
  return {code,map:null};
 }
 return previous;
}
