import "./studio-theme-code-editor-v359.css";

export const STUDIO_THEME_CODE_EDITOR_RELEASE_V359="studio-theme-code-editor-v359-20260930";

const SIDEBAR="#ngeblogging-studio-sidebar";
const MODAL=".tn-modal-layer";
let raf=0;

function findEditorLayer(){
  if(typeof document==="undefined") return null;
  for(const layer of document.querySelectorAll(MODAL)){
    if(layer.querySelector(".tn-code-workspace .tn-code-pane textarea")) return layer;
  }
  return null;
}

function sync(){
  raf=0;
  if(typeof window==="undefined"||typeof document==="undefined") return;
  const layer=findEditorLayer();
  if(!layer) return;

  layer.dataset.v359CodeEditor="ready";

  if(window.innerWidth<=760){
    layer.style.setProperty("--tn-v359-sidebar-right","0px");
    return;
  }

  // Read-only sidebar measurement. No sidebar DOM/style/class/event is changed.
  let right=232;
  const sidebar=document.querySelector(SIDEBAR);
  if(sidebar){
    const rect=sidebar.getBoundingClientRect();
    if(Number.isFinite(rect.right)) right=Math.max(0,Math.ceil(rect.right));
  }
  layer.style.setProperty("--tn-v359-sidebar-right",right+"px");

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
