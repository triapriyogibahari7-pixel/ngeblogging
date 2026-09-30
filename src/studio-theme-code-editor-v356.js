import "./studio-theme-code-editor-v356.css";
export const STUDIO_THEME_CODE_EDITOR_RELEASE_V356="studio-theme-code-editor-v356-20260930";

const LAYER='.tn-modal-layer[data-v342-code-layer="ready"]';
const SIDEBAR="#ngeblogging-studio-sidebar";
let raf=0;

function sync(){
  raf=0;
  if(typeof document==="undefined"||typeof window==="undefined") return;
  const layer=document.querySelector(LAYER);
  if(!layer) return;

  layer.dataset.v355Editor="ready";
  const sidebar=document.querySelector(SIDEBAR);
  const mobile=window.innerWidth<=760;

  if(mobile){
    layer.style.setProperty("--tn-v356-editor-left","0px");
    return;
  }

  /* READ the sidebar geometry only. Nothing on the sidebar is modified. */
  let left=232;
  if(sidebar){
    const rect=sidebar.getBoundingClientRect();
    if(Number.isFinite(rect.right)) left=Math.max(0,Math.ceil(rect.right));
  }

  layer.style.setProperty("--tn-v356-editor-left",left+"px");
}

function schedule(){
  if(raf) return;
  raf=requestAnimationFrame(sync);
}

if(typeof window!=="undefined"&&typeof document!=="undefined"){
  const start=()=>{
    schedule();
    setTimeout(schedule,50);
    setTimeout(schedule,200);
    setTimeout(schedule,500);
  };
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",schedule,{passive:true});
  document.addEventListener("click",schedule,{passive:true});

  const bodyObserver=new MutationObserver(schedule);
  bodyObserver.observe(document.body,{childList:true,subtree:true});

  const sidebarObserver=new MutationObserver(schedule);
  const watchSidebar=()=>{
    const sidebar=document.querySelector(SIDEBAR);
    if(sidebar) sidebarObserver.observe(sidebar,{attributes:true,attributeFilter:["class","style"]});
  };
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",watchSidebar,{once:true});
  else watchSidebar();
}
