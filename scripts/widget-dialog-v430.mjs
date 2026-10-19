import {transformThemeStage3} from './theme-stage3-v429.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('V430: pola dialog berubah; build dihentikan untuk mencegah patch salah.');return s.replace(a,b);}
export function transformWidgetDialog(source,id){const prior=transformThemeStage3(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');if(!path.endsWith('/src/ThemeStudio.jsx'))return prior;
  code="import './styles/widget-dialog-v430.css';\n"+code;
  code=once(code,'  const surface = <div',"  const isWidgetDialog = React.isValidElement(children) && children.type === WidgetStudio;\n  if(isWidgetDialog) layerClassName += ' tn-widget-modal-layer tn-widget-modal-v430';\n  const surface = <div");
  code=once(code,'if (portal && typeof document !== "undefined")','if ((portal || isWidgetDialog) && typeof document !== "undefined")');
  return {code,map:null};
}
