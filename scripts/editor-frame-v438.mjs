import {transformEditorRepair} from './theme-editor-repair-v436.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('V438: pola editor berubah; build dihentikan untuk mencegah perubahan salah.');return s.replace(a,b);}
export function transformEditorFrame(source,id){const prior=transformEditorRepair(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');if(!path.endsWith('/src/components/theme/ThemeCodeDialogV434.jsx'))return prior;
  code="import {withEditorDeadline} from '../../lib/editor-deadline-v438.mjs';\nimport {readableEditorText} from '../../lib/readable-editor-v437.mjs';\nimport frameStyles from '../../styles/editor-frame-v438.css?inline';\n"+code;
  code=once(code,'  const sourceField=useRef(null);','  const [editedTabs,setEditedTabs]=useState({});\n  const sourceField=useRef(null);');
  const before='  const ready=Boolean(snapshot&&draft&&loaded);const dirty=ready&&!sameCode(draft,loaded.code);';
  const hooks=`\n  useEffect(()=>setEditedTabs({}),[loaded]);\n  useEffect(()=>{if(guide.current)guide.current.scrollTop=0;},[tab]);\n  useLayoutEffect(()=>{const layer=surfaceRoot?.querySelector('.tc438-frame');if(!layer)return;const sidebar=document.querySelector('#ngeblogging-studio-sidebar');let frame=0;const sync=()=>{frame=0;const right=sidebar?.getBoundingClientRect().right||0;const left=window.innerWidth<=760?0:Math.max(0,Math.min(right,window.innerWidth*.45));layer.style.setProperty('--tc438-left',left+'px');};const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};sync();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);if(sidebar)observer?.observe(sidebar);window.addEventListener('resize',schedule);document.addEventListener('click',schedule,true);return()=>{if(frame)cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',schedule);document.removeEventListener('click',schedule,true);};},[surfaceRoot]);\n`;
  code=once(code,before,before+hooks);
  code=once(code,'className="tc434-layer"','className="tc434-layer tc438-frame"');
  code=once(code,'baseStyles+accessStyles+surfaceStyles','baseStyles+accessStyles+surfaceStyles+frameStyles');
  const auth='const auth=await supabase.auth.getUser();';if(code.split(auth).length!==3)throw Error('V438: pemeriksaan akun tidak cocok.');code=code.replaceAll(auth,"const auth=await withEditorDeadline(supabase.auth.getUser(),'Memeriksa sesi akun',12000);");
  code=once(code,'const stored=await loadSiteThemeState(site.id);',"const stored=await withEditorDeadline(loadSiteThemeState(site.id),'Memuat sumber tema situs',15000);");
  code=once(code,'const fresh=await loadSiteThemeState(site.id);',"const fresh=await withEditorDeadline(loadSiteThemeState(site.id),'Memeriksa versi tema sebelum simpan',15000);");
  code=once(code,'const readback=await loadSiteThemeState(site.id);',"const readback=await withEditorDeadline(loadSiteThemeState(site.id),'Memeriksa hasil simpan di server',15000);");
  code=once(code,"  const text=String(draft?.[tab]||'');","  const text=useMemo(()=>readableEditorText(draft,tab,Boolean(editedTabs[tab])),[draft,tab,editedTabs]);");
  code=once(code,'onChange={e=>setDraft({...draft,[tab]:e.target.value})}','onChange={e=>{const value=e.target.value;setEditedTabs(previous=>({...previous,[tab]:true}));setDraft(previous=>({...previous,[tab]:value}));}}');
  code=once(code,'setDraft(result.code);setPreview(false);','setEditedTabs({});setDraft(result.code);setPreview(false);');
  code=once(code,'Sumber template lengkap, bukan HTML gabungan postingan. Tidak ada kode yang dipotong saat ditampilkan.','Tampilan HTML/CSS dipadatkan dibuka dalam bentuk rapi. Sumber asli tetap dipertahankan sampai Anda mengetik. JavaScript tetap sesuai sumber.');
  code=once(code,'baris sumber</span>','baris tampilan</span>');
  return {code,map:null};
}
