import "./studio-theme-code-editor-v364.css";
import "./styles/theme-editor-v432.css";
export const STUDIO_THEME_CODE_EDITOR_RELEASE_V364="studio-theme-code-editor-v364-20261001";
const WORKSPACE=".tn-code-workspace";
let timer=0,raf=0;
function findLayer(){if(typeof document==="undefined")return null;for(const layer of document.querySelectorAll(".tn-modal-layer"))if(layer.querySelector(WORKSPACE))return layer;return null;}
function lockWorkspace(layer){
  const modal=layer.querySelector(":scope > .tn-modal"),body=modal?.querySelector(":scope > .tn-modal-body"),workspace=layer.querySelector(WORKSPACE);if(!workspace)return;
  const set=(node,p,v)=>{if(node&&node.style.getPropertyValue(p)!==v)node.style.setProperty(p,v,"important");};
  const mobile=window.innerWidth<=760;const gutter=mobile?"48px":"60px";
  workspace.dataset.v364Layout="preview-top-code-bottom";workspace.dataset.editorGeometryV432="flexible";
  set(workspace,"display","grid");set(workspace,"grid-template-columns","minmax(0,1fr)");set(workspace,"grid-template-rows",mobile?"minmax(0,.42fr) minmax(0,.58fr)":"minmax(0,.52fr) minmax(0,.48fr)");set(workspace,"grid-template-areas",'"preview" "code"');set(workspace,"gap","0px");set(workspace,"width","100%");set(workspace,"max-width","100%");set(workspace,"min-width","0");set(workspace,"height","100%");set(workspace,"min-height","0");set(workspace,"overflow","hidden");set(workspace,"background","#f3f6fc");
  set(modal,"display","grid");set(modal,"grid-template-rows","auto minmax(0,1fr) auto");set(modal,"width","min(1440px,100%)");set(modal,"max-width","100%");set(modal,"min-width","0");set(modal,"min-height","0");set(modal,"overflow","hidden");
  set(body,"width","100%");set(body,"max-width","100%");set(body,"min-width","0");set(body,"min-height","0");set(body,"height","auto");set(body,"padding","0px");set(body,"overflow","hidden");
  const preview=workspace.querySelector(":scope > .tn-code-preview-pane"),pane=workspace.querySelector(":scope > .tn-code-pane");
  if(preview){set(preview,"grid-area","preview");set(preview,"grid-row","1");set(preview,"grid-column","1");set(preview,"order","0");set(preview,"width","100%");set(preview,"max-width","100%");set(preview,"min-width","0");set(preview,"min-height","0");set(preview,"height","100%");set(preview,"overflow","hidden");set(preview,"background","#edf3fb");}
  if(pane){
    set(pane,"grid-area","code");set(pane,"grid-row","2");set(pane,"grid-column","1");set(pane,"order","1");set(pane,"position","relative");set(pane,"width","100%");set(pane,"max-width","100%");set(pane,"min-width","0");set(pane,"min-height","0");set(pane,"height","100%");set(pane,"overflow","hidden");set(pane,"display","grid");set(pane,"grid-template-columns",gutter+" minmax(0,1fr)");set(pane,"grid-template-rows","auto auto auto minmax(0,1fr)");set(pane,"gap","0px");set(pane,"background","#fff");
    for(const [selector,row] of [[":scope > nav","1"],[":scope > .tn-code-status","2"],[":scope > .tn-code-v350-toolbar","3"]]){const node=pane.querySelector(selector);set(node,"position","static");set(node,"grid-row",row);set(node,"grid-column","1 / -1");set(node,"min-height","0");set(node,"margin","0px");}
    const guide=pane.querySelector(":scope > .tn-code-gutter-v363");if(guide){set(guide,"position","relative");set(guide,"inset","auto");set(guide,"grid-row","4");set(guide,"grid-column","1");set(guide,"width",gutter);set(guide,"min-width",gutter);set(guide,"max-width",gutter);set(guide,"height","100%");set(guide,"min-height","0");set(guide,"margin","0px");set(guide,"overflow","hidden");set(guide,"background","#edf3fb");set(guide,"color","#567291");}
    pane.querySelectorAll(":scope > textarea").forEach(t=>{set(t,"position","relative");set(t,"inset","auto");set(t,"grid-row","4");set(t,"grid-column","2");set(t,"width","100%");set(t,"max-width","100%");set(t,"min-width","0");set(t,"height","100%");set(t,"min-height","0");set(t,"box-sizing","border-box");set(t,"margin","0px");set(t,"background","#fff");set(t,"color","#173658");set(t,"caret-color","#245eb8");});
  }
}
function sync(){raf=0;const layer=findLayer();if(layer)lockWorkspace(layer);}
function schedule(){if(raf)return;raf=requestAnimationFrame(sync);}
function boot(){schedule();[60,180,420,900].forEach(d=>setTimeout(schedule,d));if(!timer)timer=setInterval(schedule,250);}
if(typeof window!=="undefined"&&typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();document.addEventListener("click",schedule,{passive:true});window.addEventListener("resize",schedule,{passive:true});window.addEventListener("orientationchange",schedule,{passive:true});window.addEventListener("pageshow",schedule,{passive:true});}
