import {transformThemePreview} from './theme-preview-v443.mjs';
export function customizeSource(source,id){
  if(!id.split('?')[0].replaceAll('\\','/').endsWith('/src/ThemeStudio.jsx'))return null;
  const marker='    {modal === "customize" && <Modal ';
  const start=source.indexOf(marker);
  if(start<0||source.indexOf(marker,start+1)>=0)throw Error('Customizer: expected exactly one dialog');
  const endMarker='</Modal>}';
  const end=source.indexOf(endMarker,start);
  if(end<0)throw Error('Customizer: dialog boundary missing');
  const original=source.slice(start+marker.indexOf('<Modal'),end+'</Modal>'.length);
  const replacement=`    {modal === "customize" && <ResponsiveThemeCustomizer fallback={${original}} theme={activeTheme} code={themeState.code?.enabled?themeState.code:activeTheme.code} widgets={themeState.widgets} value={customDraft} onChange={setCustomDraft} onClose={()=>setModal(null)} onSave={()=>{commit({...themeState,draftConfig:customDraft,updatedAt:new Date().toISOString()},"Draf tema tersimpan");setModal(null);}} onPublish={()=>{commit(publishThemeDraft(themeState,customDraft,themeState.widgets),"Kustomisasi tema diterbitkan");setModal(null);}}/>}`;
  return {code:"import ResponsiveThemeCustomizer from './components/theme/ThemeCustomizerDesktop';\n"+source.slice(0,start)+replacement+source.slice(end+endMarker.length),map:null};
}
export function transformThemeCustomizer(source,id){const prior=transformThemePreview(source,id);return customizeSource(prior?.code||source,id)||prior;}
