import {transformAccountNames} from './account-names-v422.mjs';
function once(source,before,after){if(source.split(before).length!==2)throw Error('V427: pola integrasi berubah; build dihentikan untuk mencegah patch salah.');return source.replace(before,after);}
export function transformWidgetCode(source,id){const prior=transformAccountNames(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');
  if(path.endsWith('/src/ThemeStudio.jsx')){
    const start=code.indexOf('function WidgetStudio({ value, onChange }) {');const end=code.indexOf('function LayoutMap(',start);
    if(start<0||end<=start||code.split('function WidgetStudio({ value, onChange }) {').length!==2)throw Error('V427: batas WidgetStudio tidak cocok.');
    code="import WidgetStudio from './components/theme/WidgetStudioV427';\n"+code.slice(0,start)+code.slice(end);
    const hook=`\n  useEffect(()=>{const open=(event)=>{const area=event.detail?.area;if(typeof area!=='string'||!area)return;if(site?.id&&syncStatus!=='synced'){setToast('Tunggu sinkronisasi tema situs aktif berhasil sebelum mengubah kode widget.');return;}setWidgetDraft(current=>{const all=Array.isArray(current)?current:[];const existing=all.find(x=>x.id==='custom-html');const entry={...existing,id:'custom-html',enabled:true,area,order:existing?.order??all.length,title:existing?.title||'HTML / JavaScript',settings:existing?.settings||{html:'',javascript:''}};return existing?all.map(x=>x.id==='custom-html'?entry:x):[...all,entry];});setModal('widgets');};window.addEventListener('ngeblogging:open-widget-code-v427',open);return()=>window.removeEventListener('ngeblogging:open-widget-code-v427',open);},[site?.id,syncStatus,setToast]);\n`;
    return {code:once(code,'  const fileInput = useRef(null);','  const fileInput = useRef(null);'+hook),map:null};
  }
  if(path.endsWith('/src/studio-theme-layout-v264.js')){
    const start=code.indexOf('function openCodeEditor() {');const end=code.indexOf('function sync() {',start);
    if(start<0||end<=start)throw Error('V427: tombol kode area tidak ditemukan.');
    code=code.slice(0,start)+`function openCodeEditor(area) { window.dispatchEvent(new CustomEvent('ngeblogging:open-widget-code-v427',{detail:{area}})); }\n\n`+code.slice(end);
    code=once(code,'        openCodeEditor();','        openCodeEditor(area);');
    code=once(code,'        pendingAssignment = { widgetId: action.dataset.widget, area };',`        if(action.dataset.widget==='custom-html'){closePopover();openCodeEditor(area);return;}\n        pendingAssignment = { widgetId: action.dataset.widget, area };`);
    return {code,map:null};
  }
  return prior;
}
