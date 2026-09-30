import "./studio-theme-code-editor-v358.css";

export const STUDIO_THEME_CODE_EDITOR_RELEASE_V358="studio-theme-code-editor-v358-20260930";

const SIDEBAR="#ngeblogging-studio-sidebar";
const MODAL=".tn-modal-layer";
let frame=0;

function findEditorLayer(){
  if(typeof document==="undefined") return null;
  for(const layer of document.querySelectorAll(MODAL)){
    if(layer.querySelector(".tn-code-workspace .tn-code-pane textarea")) return layer;
  }
  return null;
}

function sync(){
  frame=0;
  if(typeof window==="undefined"||typeof document==="undefined") return;
  const layer=findEditorLayer();
  if(!layer) return;

  layer.dataset.v358CodeEditor="ready";

  if(window.innerWidth<=760){
    layer.style.setProperty("--tn-v358-sidebar-right","0px");
    return;
  }

  /* READ ONLY: measure the existing sidebar. Never change its DOM, class,
     style, width, position, z-index, or event handlers. */
  let right=232;
  const sidebar=document.querySelector(SIDEBAR);
  if(sidebar){
    const rect=sidebar.getBoundingClientRect();
    if(Number.isFinite(rect.right)) right=Math.max(0,Math.ceil(rect.right));
  }
  layer.style.setProperty("--tn-v358-sidebar-right",right+"px");

  /* Keep the existing real 1–10,000 gutter synchronized with the source. */
  layer.querySelectorAll(".tn-code-pane textarea").forEach((textarea)=>{
    textarea.wrap="soft";
    textarea.spellcheck=false;
    textarea.style.whiteSpace="pre-wrap";
    textarea.style.overflowWrap="anywhere";
    textarea.style.wordBreak="break-word";
    textarea.style.overflowX="hidden";
    const gutter=textarea.parentElement?.querySelector(":scope > .tn-code-gutter-v350");
    if(gutter) gutter.scrollTop=textarea.scrollTop;
  });
}

function schedule(){
  if(frame) return;
  frame=requestAnimationFrame(sync);
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
