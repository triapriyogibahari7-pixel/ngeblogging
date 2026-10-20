import {transformPhoneSpace} from './editor-phone-space-v439.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('V440: pola tindakan tema berubah; build dihentikan agar tidak menimpa bagian lain.');return s.replace(a,b);}
export function transformThemeActions(source,id){const prior=transformPhoneSpace(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');
  if(path.endsWith('/src/ThemeStudio.jsx')){code="import ThemeBackupButton from './components/theme/ThemeBackupButtonV440';\nimport './styles/theme-actions-v440.css';\n"+code;code=once(code,'>Edit Custom HTML / Upload</button></section><LayoutMap',`>Edit Custom HTML / Upload</button><ThemeBackupButton key={site?.id||'no-site'} site={site} user={user}/></section><LayoutMap`);return {code,map:null};}
  if(path.endsWith('/src/components/theme/ThemeLayoutDiagramV433.jsx')){code=once(code,`,mode='desktop',onModeChange`,'');code=once(code,'data-mode={mode}','data-mode="auto"');code=once(code,`<div className="ts433-controls"><button type="button" aria-pressed={mode==='desktop'} onClick={()=>onModeChange?.('desktop')}>Desktop</button><button type="button" aria-pressed={mode==='mobile'} onClick={()=>onModeChange?.('mobile')}>Mobile</button></div>`,'');return {code,map:null};}
  return prior;
}
