import "./studio-theme-code-editor-v360.css";

export const STUDIO_THEME_CODE_EDITOR_RELEASE_V360="studio-theme-code-editor-v360-20260930";

const SIDEBAR="#ngeblogging-studio-sidebar";
const WORKSPACE=".tn-code-workspace .tn-code-pane textarea";
let raf=0;

function findLayer(){
  if(typeof document==="undefined") return null;
  for(const layer of document.querySelectorAll(".tn-modal-layer")){
    if(layer.querySelector(WORKSPACE)) return layer;
  }
  return null;
}

function sync(){
  raf=0;
  if(typeof window==="undefined"||typeof document==="undefined") return;
  const layer=findLayer();
  if(!layer) return;

  layer.dataset.v360CodeEditor="ready";

  if(window.innerWidth<=760){
    layer.style.setProperty("--tn-v360-editor-left","0px");
    return;
  }

  /* Read-only geometry. The sidebar itself is never changed. */
  let left=232;
  const sidebar=document.querySelector(SIDEBAR);
  if(sidebar){
    const rect=sidebar.getBoundingClientRect();
    if(Number.isFinite(rect.right)&&rect.right>0) left=Math.ceil(rect.right);
  }
  layer.style.setProperty("--tn-v360-editor-left",Math.max(0,left)+"px");

  layer.querySelectorAll(".tn-code-pane textarea").forEach((textarea)=>{
    textarea.wrap="soft";
    textarea.spellcheck=false;
    textarea.style.whiteSpace="pre-wrap";
    textarea.style.overflowWrap="anywhere";
    textarea.style.wordBreak="break-word";
    textarea.style.overflowX="hidden";
  });
}

function schedule(){
  if(raf) return;
  raf=requestAnimationFrame(sync);
}

if(typeof window!=="undefined"&&typeof document!=="undefined"){
  const boot=()=>{
    schedule();
    setTimeout(schedule,80);
    setTimeout(schedule,240);
    setTimeout(schedule,600);
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();

  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",schedule,{passive:true});
  window.addEventListener("pageshow",schedule,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()},{passive:true});
}
