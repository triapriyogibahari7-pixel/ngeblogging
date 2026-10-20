import {formatThemeCodeForEditing} from '../theme-code-format.js';
export function readableEditorText(code,tab,edited=false){const raw=String(code?.[tab]??'');if(edited||!['html','css'].includes(tab))return raw;try{const formatted=formatThemeCodeForEditing({html:tab==='html'?raw:'',css:tab==='css'?raw:'',javascript:''});return String(formatted?.[tab]??raw);}catch{return raw;}}
