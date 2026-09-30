import "./studio-theme-code-editor-v352.css";
export const STUDIO_THEME_CODE_EDITOR_RELEASE_V352="studio-theme-code-editor-v352-20260930";

const DESKTOP_BREAKPOINT=760;
const SIDEBAR_SELECTOR="#ngeblogging-studio-sidebar";
let frame=0;

function applyEditorGeometry(){
  frame=0;
  if(typeof window==="undefined"||typeof document==="undefined") return;
  const layers=document.querySelectorAll('.tn-modal-layer[data-v342-code-layer="ready"]');
  if(!layers.length) return;
  const desktop=window.innerWidth>DESKTOP_BREAKPOINT;
  let left=0;
  if(desktop){
    const sidebar=document.querySelector(SIDEBAR_SELECTOR);
    if(sidebar){
      const rect=sidebar.getBoundingClientRect();
      const visible=rect.width>0 && rect.height>0 && rect.right>0;
      if(visible) left=Math.max(0,Math.min(window.innerWidth-320,Math.ceil(rect.right)));
    }
  }
  layers.forEach(layer=>{
    layer.dataset.v352EditorLeft="ready";
    layer.style.setProperty("--tn-code-safe-left",desktop?left+"px":"0px");
    if(desktop){
      const available=Math.max(420,window.innerWidth-left-24);
      const width=Math.min(1480,available);
      const modal=layer.querySelector(':scope > .tn-modal[data-v342-code-modal="ready"]');
      if(modal){
        modal.style.width=width+"px";
        modal.style.maxWidth=width+"px";
        modal.style.margin="0";
      }
    }else{
      const modal=layer.querySelector(':scope > .tn-modal[data-v342-code-modal="ready"]');
      if(modal){modal.style.width="100%";modal.style.maxWidth="100%";modal.style.margin="0"}
    }
  });
}

function schedule(delay=0){
  if(typeof window==="undefined") return;
  if(delay){window.setTimeout(()=>schedule(),delay);return}
  if(frame) return;
  frame=window.requestAnimationFrame(applyEditorGeometry);
}

if(typeof window!=="undefined"&&typeof document!=="undefined"){
  document.addEventListener("click",()=>{schedule();schedule(100);schedule(300);schedule(700)},{passive:true});
  window.addEventListener("resize",()=>schedule(),{passive:true});
  window.addEventListener("orientationchange",()=>schedule(80),{passive:true});
  window.addEventListener("pageshow",()=>schedule(),{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>schedule(),{once:true});
  else schedule();
  schedule(250);
  schedule(900);
}
