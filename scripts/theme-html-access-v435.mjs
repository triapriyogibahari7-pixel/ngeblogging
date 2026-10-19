import {transformThemeEditor} from './theme-editor-v434.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('V435: pola akses HTML berubah; build dihentikan untuk mencegah perubahan salah.');return s.replace(a,b);}
export function transformHtmlAccess(source,id){const prior=transformThemeEditor(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');
  if(path.endsWith('/src/ThemeStudio.jsx')){
    code="import './styles/theme-html-access-v435.css';\n"+code;
    code=once(code,'<button onClick={() => setModal("code")}><Code2/> Edit HTML</button>','');
    code=once(code,'<LayoutMap theme={previewTheme}','<section className="ts435-source-bar" aria-label="Akses sumber tema aktif"><div><strong>Sumber tema aktif: {activeTheme.name}</strong><small>Situs: {site?.name||"Belum dipilih"}. Buka HTML, CSS dan JavaScript yang digunakan situs ini.</small></div><button type="button" className="ts435-open" onClick={()=>setModal("code")}>Edit HTML</button></section><LayoutMap theme={previewTheme}');
    return {code,map:null};
  }
  if(path.endsWith('/src/components/theme/ThemeCodeDialogV434.jsx')){
    code="import {lineGuide,lineTarget} from '../../lib/theme-code-lines-v435.mjs';\n"+code;
    code=once(code,'  const root=useRef(null),guide=useRef(null),live=useRef(true),lock=useRef(false);','  const sourceField=useRef(null);\n  const root=useRef(null),guide=useRef(null),live=useRef(true),lock=useRef(false);');
    code=once(code,'[wrap,setWrap]=useState(true)','[wrap]=useState(false)');
    code=once(code,'<button type="button" aria-pressed={wrap} onClick={()=>setWrap(!wrap)}>Bungkus baris</button>',`<button type="button" disabled={busy} onClick={()=>{const value=window.prompt('Ke nomor baris (1–10.000)','1');if(value===null)return;const field=sourceField.current;if(!field)return;const target=lineTarget(field.value,value);field.focus();field.setSelectionRange(target.start,target.end);const height=parseFloat(getComputedStyle(field).lineHeight)||22;field.scrollTop=Math.max(0,(target.line-1)*height);if(guide.current)guide.current.scrollTop=field.scrollTop;}}>Ke baris</button>`);
    code=once(code,"{Array.from({length:count},(_,i)=>i+1).join('\\n')}",'{lineGuide(text)}');
    code=once(code,'<textarea key={tab}','<textarea ref={sourceField} key={tab}');
    code=once(code,'baris sumber</span></div>','baris sumber</span>{count>10000&&<span className="tc435-line-note">Nomor ditampilkan sampai 10.000. Seluruh sumber setelahnya tetap dapat dibaca dan tidak dipotong.</span>}</div>');
    return {code,map:null};
  }
  return prior;
}
