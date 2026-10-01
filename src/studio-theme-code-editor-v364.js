import "./studio-theme-code-editor-v364.css";

export const STUDIO_THEME_CODE_EDITOR_RELEASE_V364="studio-theme-code-editor-v364-20261001";
const WORKSPACE=".tn-code-workspace";
let timer=0,raf=0;
function findLayer(){if(typeof document==="undefined")return null;for(const layer of document.querySelectorAll(".tn-modal-layer"))if(layer.querySelector(WORKSPACE))return layer;return null;}
function lockWorkspace(layer){
 const modal=layer.querySelector(":scope > .tn-modal"),body=modal?.querySelector(":scope > .tn-modal-body"),workspace=layer.querySelector(WORKSPACE);if(!workspace)return;
 const set=(node,p,v)=>node?.style.setProperty(p,v,"important");
 set(workspace,"display","grid");set(workspace,"grid-template-columns","minmax(0,1fr)");set(workspace,"grid-template-rows","minmax(320px,52%) minmax(360px,48%)");set(workspace,"grid-template-areas",'"preview" "code"');set(workspace,"width","100%");set(workspace,"max-width","100%");set(workspace,"min-width","0");set(workspace,"height","100%");set(workspace,"min-height","0");set(workspace,"overflow","hidden");workspace.dataset.v364Layout="preview-top-code-bottom";
 set(modal,"width","min(1440px,100%)");set(modal,"max-width","100%");set(modal,"min-width","0");set(modal,"overflow","hidden");
 set(body,"width","100%");set(body,"max-width","100%");set(body,"min-width","0");set(body,"min-height","0");set(body,"overflow","hidden");
 const preview=workspace.querySelector(":scope > .tn-code-preview-pane"),pane=workspace.querySelector(":scope > .tn-code-pane");
 if(preview){set(preview,"grid-area","preview");set(preview,"order","0");set(preview,"width","100%");set(preview,"max-width","100%");set(preview,"min-width","0");set(preview,"min-height","0");set(preview,"overflow","hidden");}
 if(pane){set(pane,"grid-area","code");set(pane,"order","1");set(pane,"width","100%");set(pane,"max-width","100%");set(pane,"min-width","0");set(pane,"min-height","0");set(pane,"overflow","hidden");set(pane,"display","grid");set(pane,"grid-template-rows","auto auto minmax(0,1fr)");pane.querySelectorAll("textarea").forEach(t=>{set(t,"width","100%");set(t,"max-width","100%");set(t,"min-width","0");set(t,"min-height","0");set(t,"box-sizing","border-box");});}
}
function sync(){raf=0;const layer=findLayer();if(layer)lockWorkspace(layer);}
function schedule(){if(raf)return;raf=requestAnimationFrame(sync);}
function boot(){schedule();[60,180,420,900].forEach(d=>setTimeout(schedule,d));if(!timer)timer=setInterval(schedule,250);}
if(typeof window!=="undefined"&&typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();document.addEventListener("click",schedule,{passive:true});window.addEventListener("resize",schedule,{passive:true});window.addEventListener("orientationchange",schedule,{passive:true});window.addEventListener("pageshow",schedule,{passive:true});}
