import "./studio-theme-code-editor-v363.css";

export const STUDIO_THEME_CODE_EDITOR_RELEASE_V363="studio-theme-code-editor-v363-20260930";

const WORKSPACE=".tn-code-workspace .tn-code-pane textarea";
const SIDEBAR="#ngeblogging-studio-sidebar";
const LINE_GUIDE=Array.from({length:10000},(_,i)=>String(i+1)).join("\n");
let raf=0;
let layerObserver=null;

function findLayer(){
  if(typeof document==="undefined") return null;
  for(const layer of document.querySelectorAll(".tn-modal-layer")){
    if(layer.querySelector(WORKSPACE)) return layer;
  }
  return null;
}

function readSidebarRight(){
  const sidebar=document.querySelector(SIDEBAR);
  if(!sidebar) return 232;
  const rect=sidebar.getBoundingClientRect();
  return Number.isFinite(rect.right)&&rect.right>0?Math.ceil(rect.right):232;
}

function ensureGutter(textarea){
  const pane=textarea.parentElement;
  if(!pane) return null;
  let gutter=pane.querySelector(":scope > .tn-code-gutter-v363");
  if(!gutter){
    gutter=document.createElement("pre");
    gutter.className="tn-code-gutter-v363";
    gutter.setAttribute("aria-hidden","true");
    textarea.insertAdjacentElement("beforebegin",gutter);
  }
  if(gutter.textContent!==LINE_GUIDE) gutter.textContent=LINE_GUIDE;
  return gutter;
}

function sync(){
  raf=0;
  if(typeof window==="undefined"||typeof document==="undefined") return;
  const layer=findLayer();
  if(!layer) return;

  layer.dataset.v363CodeEditor="ready";

  const mobile=window.innerWidth<=760;
  const left=mobile?0:readSidebarRight();
  layer.style.setProperty("--tn-v363-editor-left",String(Math.max(0,left))+"px");

  layer.querySelectorAll(".tn-code-pane textarea").forEach((textarea)=>{
    const gutter=ensureGutter(textarea);
    textarea.wrap="soft";
    textarea.spellcheck=false;
    textarea.autocomplete="off";
    textarea.style.whiteSpace="pre-wrap";
    textarea.style.overflowWrap="anywhere";
    textarea.style.wordBreak="break-word";
    textarea.style.overflowX="hidden";
    if(gutter) gutter.scrollTop=textarea.scrollTop;
    if(!textarea.__ngebloggingV363Scroll){
      textarea.__ngebloggingV363Scroll=true;
      textarea.addEventListener("scroll",()=>{
        const active=textarea.parentElement?.querySelector(":scope > .tn-code-gutter-v363");
        if(active) active.scrollTop=textarea.scrollTop;
      },{passive:true});
    }
  });
}

function schedule(){
  if(raf) return;
  raf=requestAnimationFrame(sync);
}

function observeLayer(layer){
  if(layerObserver) layerObserver.disconnect();
  if(typeof MutationObserver!=="undefined"){
    layerObserver=new MutationObserver(()=>schedule());
    layerObserver.observe(layer,{childList:true,subtree:true});
  }
}

function boot(){
  schedule();
  setTimeout(schedule,60);
  setTimeout(schedule,180);
  setTimeout(schedule,420);
  const layer=findLayer();
  if(layer) observeLayer(layer);
}

if(typeof window!=="undefined"&&typeof document!=="undefined"){
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();

  document.addEventListener("click",()=>{
    schedule();
    setTimeout(()=>{
      schedule();
      const layer=findLayer();
      if(layer) observeLayer(layer);
    },80);
    setTimeout(schedule,240);
  },{passive:true});

  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",schedule,{passive:true});
  window.addEventListener("pageshow",schedule,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()},{passive:true});
}
