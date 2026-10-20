import {transformEditorFrame} from './editor-frame-v438.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('V439: pola editor berubah; build dihentikan agar tidak memengaruhi bagian lain.');return s.replace(a,b);}
export function transformPhoneSpace(source,id){const prior=transformEditorFrame(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');if(!path.endsWith('/src/components/theme/ThemeCodeDialogV434.jsx'))return prior;
  code="import EditorHelp from './EditorHelpV439';\nimport {editorGutterWidth} from '../../lib/editor-gutter-v439.mjs';\nimport phoneSpaceStyles from '../../styles/editor-phone-space-v439.css?inline';\n"+code;
  code=once(code,'baseStyles+accessStyles+surfaceStyles+frameStyles','baseStyles+accessStyles+surfaceStyles+frameStyles+phoneSpaceStyles');
  const prefix='<div className="tc436-import-info"><p>';if(code.split(prefix).length!==2)throw Error('V439: blok petunjuk tidak cocok.');const start=code.indexOf(prefix)+'<div className="tc436-import-info">'.length;const end=code.indexOf('</p>',start);if(end<start)throw Error('V439: batas petunjuk tidak cocok.');code=code.slice(0,start)+'<EditorHelp/>'+code.slice(end+'</p>'.length);
  code=once(code,'<div className="tc434-code" data-wrap={wrap}>',`<div className="tc434-code" data-wrap={wrap} style={{'--tc439-gutter':editorGutterWidth(count)+'px'}}>`);
  return {code,map:null};
}
