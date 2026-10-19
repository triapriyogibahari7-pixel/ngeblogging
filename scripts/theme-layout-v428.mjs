import {transformWidgetCode} from './widget-code-v427.mjs';
function once(source,before,after){if(source.split(before).length!==2)throw Error('V428: pola peta tema berubah; build dihentikan agar tidak menimpa integrasi lain.');return source.replace(before,after);}
export function transformThemeLayout(source,id){const prior=transformWidgetCode(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');
  if(path.endsWith('/src/ThemeStudio.jsx')){
    const start=code.indexOf('function LayoutMap({ widgets, onOpenWidgets, mode, onModeChange }) {');const end=code.indexOf('export default function ThemeStudio(',start);
    if(start<0||end<=start)throw Error('V428: batas LayoutMap tidak ditemukan.');
    code="import LayoutMap from './components/theme/ThemeLayoutMapV428';\n"+code.slice(0,start)+code.slice(end);
    code=once(code,'<LayoutMap widgets={themeState.widgets}', '<LayoutMap theme={previewTheme} code={previewTheme.id===activeTheme.id?themeState.code:previewTheme.code} config={previewTheme.id===activeTheme.id?themeState.publishedConfig:undefined} editable={previewTheme.id===activeTheme.id} widgets={previewTheme.id===activeTheme.id?themeState.widgets:createDefaultWidgetState(previewTheme.defaultWidgetIds)}');
    return {code,map:null};
  }
  if(path.endsWith('/src/studio-theme-layout-v264.js'))return {code:once(code,'  const studio = document.querySelector(".tn-layout-studio");','  const studio = document.querySelector(".tn-layout-studio");\n  if(studio?.dataset.layoutV428 === "true") return;'),map:null};
  return prior;
}
