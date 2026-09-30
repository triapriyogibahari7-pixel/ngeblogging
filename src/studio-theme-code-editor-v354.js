import "./studio-theme-code-editor-v354.css";
export const STUDIO_THEME_CODE_EDITOR_RELEASE_V354="studio-theme-code-editor-v354-20260930";

const SIDEBAR="#ngeblogging-studio-sidebar";
const LAYER='.tn-modal-layer[data-v342-code-layer="ready"]';

function sync(){
  if(typeof document==="undefined") return;
  const layer=document.querySelector(LAYER);
  if(!layer) return;
  const sidebar=document.querySelector(SIDEBAR);
  const large=document.documentElement.classList.contains("studio-v265-large") || window.innerWidth>760;
  if(!large) {
    layer.dataset.v354Collapsed="false";
    return;
  }
  const collapsed=Boolean(sidebar?.classList.contains("collapsed"));
  layer.dataset.v354Collapsed=collapsed?"true":"false";
}

let raf=0;
function schedule(){
  if(raf) return;
  raf=requestAnimationFrame(()=>{raf=0;sync()});
}
if(typeof window!=="undefined"&&typeof document!=="undefined"){
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",schedule,{once:true});
  else schedule();
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",schedule,{passive:true});
  document.addEventListener("click",schedule,{passive:true});
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
}
