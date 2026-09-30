import "./studio-theme-code-editor-v361.css";

export const STUDIO_THEME_CODE_EDITOR_RELEASE_V361="studio-theme-code-editor-v361-20260930";

const WORKSPACE=".tn-code-workspace .tn-code-pane textarea";
const SIDEBAR="#ngeblogging-studio-sidebar";
const LINE_GUIDE=Array.from({length:10000},(_,i)=>String(i+1)).join("\n");
let raf=0;
let observer=null;
let resizeObserver=null;

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

  layer.dataset.v361CodeEditor="ready";

  const modal=layer.querySelector(":scope > .tn-modal");
  const body=modal?.querySelector(":scope > .tn-modal-body");
  const workspace=modal?.querySelector(":scope > .tn-modal-body > .tn-code-workspace") || modal?.querySelector(".tn-code-workspace");
  if(!modal||!body||!workspace) return;

  const mobile=window.innerWidth<=760;
  let left=0;
  if(!mobile){
    const sidebar=document.querySelector(SIDEBAR);
    if(sidebar){
      const rect=sidebar.getBoundingClientRect();
      if(Number.isFinite(rect.right)&&rect.right>0) left=Math.ceil(rect.right);
    }
    if(left<=0) left=232;
  }

  /* Editor-only geometry. The sidebar is read, never mutated. */
  layer.style.setProperty("--tn-v361-editor-left",Math.max(0,left)+"px");
  layer.style.setProperty("--tn-v361-editor-right","0px");

  workspace.dataset.v361="ready";
  body.dataset.v361="ready";

  workspace.querySelectorAll(".tn-code-pane textarea").forEach((textarea)=>{
    const pane=textarea.parentElement;
    if(!pane) return;
    let gutter=pane.querySelector(":scope > .tn-code-gutter-v350");
    if(!gutter){
      gutter=document.createElement("pre");
      gutter.className="tn-code-gutter-v350";
      gutter.textContent=LINE_GUIDE;
      gutter.setAttribute("aria-hidden","true");
      textarea.insertAdjacentElement("beforebegin",gutter);
    }else if(gutter.textContent!==LINE_GUIDE){
      gutter.textContent=LINE_GUIDE;
    }
    textarea.wrap="soft";
    textarea.spellcheck=false;
    textarea.autocomplete="off";
    textarea.style.whiteSpace="pre-wrap";
    textarea.style.overflowWrap="anywhere";
    textarea.style.wordBreak="break-word";
    textarea.style.overflowX="hidden";
    if(gutter) gutter.scrollTop=textarea.scrollTop;
    if(!textarea.__ngebloggingV361Scroll){
      textarea.__ngebloggingV361Scroll=true;
      textarea.addEventListener("scroll",()=>{
        const active=textarea.parentElement?.querySelector(":scope > .tn-code-gutter-v350");
        if(active) active.scrollTop=textarea.scrollTop;
      },{passive:true});
    }
  });
}

function schedule(){
  if(raf) return;
  raf=requestAnimationFrame(sync);
}

function install(){
  schedule();
  setTimeout(schedule,50);
  setTimeout(schedule,180);
  setTimeout(schedule,420);
  if(observer) observer.disconnect();
  observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  if(resizeObserver) resizeObserver.disconnect();
  if(typeof ResizeObserver!=="undefined"){
    resizeObserver=new ResizeObserver(schedule);
    const sidebar=document.querySelector(SIDEBAR);
    if(sidebar) resizeObserver.observe(sidebar);
  }
}

if(typeof window!=="undefined"&&typeof document!=="undefined"){
  const boot=()=>install();
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  document.addEventListener("click",schedule,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",schedule,{passive:true});
  window.addEventListener("pageshow",schedule,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()},{passive:true});
}
