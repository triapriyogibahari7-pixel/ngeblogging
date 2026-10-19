import {transformAccountModule} from './account-layout-v414.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('Integrasi v415 tidak cocok; build dihentikan.');return s.replace(a,b);}
export function transformBrandingModule(source,id){
 const path=id.split('?')[0].replaceAll('\\','/');
 const previous=transformAccountModule(source,id);
 if(path.endsWith('/src/pages/ProfilePage.jsx'))return {code:"import ProfilePhotoControls from '../components/account/ProfilePhotoControls';\n"+once(source,'<h2>Identitas</h2>','<h2>Identitas</h2><ProfilePhotoControls user={user} profile={p} onUpdated={next=>{setP(next);onProfileSaved?.(next);}}/>'),map:null};
 if(path.endsWith('/src/pages/SiteSettingsPage.jsx')){
  let code="import SiteFaviconPanel from '../components/account/SiteFaviconPanel';\nimport RewardsSettingsCard from '../components/account/RewardsSettingsCard';\n"+source;
  code=once(code,'{ready&&<><nav','{ready&&<><SiteFaviconPanel key={site.id} site={site}/><RewardsSettingsCard value={config.monetization} busy={busy} onSave={save} onChange={v=>{setConfig({...config,monetization:v});setDirty(true);}}/><nav');
  code=once(code,"['rewardsEnabled','Ngeblogging Rewards aktif','checkbox'],['rewardsPublisherId','ID penerbit Rewards'],['rewardsPlacementId','ID penempatan Rewards'],",'');
  return {code,map:null};
 }
 if(path.endsWith('/src/site-favicon-bridge.js')){
  let code=once(source,'async function mount(host) {','async function mount(host, forcedContext = null) {');
  code=once(code,'context = await loadActiveSite();','context = forcedContext || await loadActiveSite();');
  code=once(code,'const url = favicon.icon192Url || favicon.url || "";','const customUrl = favicon.icon192Url || favicon.url || "";\n  const url = customUrl || "/brand/ngeblogging-premium-a.svg";');
  code=once(code,'ui.remove.hidden = !url;','ui.remove.hidden = !customUrl;');
  code=once(code,'ui.state.textContent = url ? "Favicon aktif" : "Belum diatur";','ui.state.textContent = customUrl ? "Favicon aktif" : "Logo bawaan Ngeblogging aktif";');
  return {code:code+'\nexport { mount };\n',map:null};
 }
 return previous;
}
export function transformBrandingHtml(html){
 html=once(html,'<link rel="apple-touch-icon" href="/favicon.svg"/>','<link rel="apple-touch-icon" href="/brand/icon-180-v415.png" sizes="180x180"/>');
 html=once(html,'href="/site.webmanifest"','href="/site.webmanifest?v=415"');
 html=html.replaceAll('href="/favicon.svg"','href="/favicon.svg?v=415"');
 html=once(html,'</head>','<link rel="stylesheet" href="/brand/brand-v415.css"/></head>');
 return once(html,'<div id="root"></div>','<div id="root"><div class="nb-launch-v415" role="status"><img src="/brand/ngeblogging-premium-a.svg" width="96" height="96" alt="Ngeblogging"/><span>Memuat Ngeblogging…</span></div></div>');
}
