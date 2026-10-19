import {transformBrandingModule} from './branding-v415.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('Navigasi Nara berubah; build dihentikan.');return s.replace(a,b);}
export function transformNaraHelpModule(source,id){
 const prior=transformBrandingModule(source,id);
 const path=id.split('?')[0].replaceAll('\\','/');
 let code=prior?.code||source;
 if(path.endsWith('/src/StudioNext.jsx')){
  code="import NaraHelpPage from './pages/NaraHelpPage';\n"+code;
  code=once(code,'["profile", "settings"].includes(next)','["profile", "settings", "nara-help"].includes(next)');
  code=once(code,'{view === "profile" && <ProfilePage','{view === "nara-help" && <NaraHelpPage site={site} onOpenAssistant={()=>setNaraOpen(true)}/>}\n      {view === "profile" && <ProfilePage');
  code=once(code,'<button type="button" className={view === "api-keys"','<button type="button" className={view === "nara-help" ? "active" : ""} onClick={() => chooseView("nara-help")}><Sparkles/><span>Bantuan Nara AI</span></button>\n        <button type="button" className={view === "api-keys"');
  return {code,map:null};
 }
 if(path.endsWith('/src/studio-shell-authority-v298.js')){
  code=once(code,'if (action === "help") return document.querySelector(".sn-nara-button,.nara-floating-button")?.click();','if (action === "help") { window.dispatchEvent(new CustomEvent("ngeblogging:account-navigate-v414", { detail: { view: "nara-help" } })); return; }');
  return {code,map:null};
 }
 return prior;
}
