import "./studio-theme-code-editor-v355.css";
export const STUDIO_THEME_CODE_EDITOR_RELEASE_V355="studio-theme-code-editor-v355-20260930";

const LAYER='.tn-modal-layer[data-v342-code-layer="ready"]';
const SIDEBAR="#ngeblogging-studio-sidebar";
let raf=0;

function sync(){
  raf=0;
  if(typeof document==="undefined"||typeof window==="undefined") return;
  const layer=document.querySelector(LAYER);
  if(!layer) return;
  layer.dataset.v355Editor="ready";

  const mobile=window.innerWidth<=760;
  if(mobile){
    Object.assign(layer.style,{left:"0px",right:"0px",top:"0px",bottom:"0px",width:"100%",maxWidth:"100%",height:"100dvh",padding:"6px",boxSizing:"border-box"});
    return;
  }

  const sidebar=document.querySelector(SIDEBAR);
  let left=232;
  if(sidebar){
    const rect=sidebar.getBoundingClientRect();
    if(Number.isFinite(rect.right)&&rect.right>0) left=Math.max(0,Math.ceil(rect.right));
  }
  const viewport=Math.max(0,window.innerWidth-left);
  Object.assign(layer.style,{
    left:left+"px",
    right:"0px",
    top:"0px",
    bottom:"0px",
    width:viewport+"px",
    maxWidth:viewport+"px",
    height:"100dvh",
    padding:"12px",
    boxSizing:"border-box",
    overflow:"hidden"
  });

  const modal=layer.querySelector(':scope > .tn-modal[data-v342-code-modal="ready"]');
  if(modal){
    const available=Math.max(0,viewport-24);
    modal.style.width=Math.min(1480,available)+"px";
    modal.style.maxWidth="100%";
    modal.style.margin="0";
    modal.style.transform="none";
    modal.style.boxSizing="border-box";
  }
}

function schedule(){
  if(raf) return;
  raf=requestAnimationFrame(sync);
}

if(typeof window!=="undefined"&&typeof document!=="undefined"){
  const start=()=>{schedule();setTimeout(schedule,50);setTimeout(schedule,250);setTimeout(schedule,700)};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true}); else start();
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",schedule,{passive:true});
  document.addEventListener("click",schedule,{passive:true});
  window.addEventListener("scroll",schedule,{passive:true});
  const observeRoot=new MutationObserver(schedule);
  observeRoot.observe(document.body,{childList:true,subtree:true});
  const observeSidebar=()=>{
    const sidebar=document.querySelector(SIDEBAR);
    if(!sidebar) return;
    new MutationObserver(schedule).observe(sidebar,{attributes:true,attributeFilter:["class","style"]});
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",observeSidebar,{once:true}); else observeSidebar();
}
