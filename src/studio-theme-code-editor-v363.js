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
  /* at least 1–10.000, and grows with the file so numbering never stops */
  const lines=String(textarea.value||"").split("\n").length;
  const want=Math.max(10000,lines);
  if(gutter.__ngebloggingLines!==want){
    gutter.__ngebloggingLines=want;
    gutter.textContent=want===10000?LINE_GUIDE:Array.from({length:want},(_,i)=>String(i+1)).join("\n");
  }
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
    /* Respect the "Bungkus baris" toggle (v350) instead of forcing wrap on every
     * sync. Phones start unwrapped so each code line == one numbered gutter line. */
    const wrapButton=textarea.parentElement?.querySelector(".tn-code-v350-toolbar [data-a='wrap']");
    if(mobile&&!textarea.__ngebloggingV411WrapInit){
      textarea.__ngebloggingV411WrapInit=true;
      if(wrapButton) wrapButton.dataset.active="false";
    }
    const wrapOn=wrapButton?wrapButton.dataset.active!=="false":!mobile;
    textarea.wrap=wrapOn?"soft":"off";
    textarea.spellcheck=false;
    textarea.autocomplete="off";
    textarea.style.whiteSpace=wrapOn?"pre-wrap":"pre";
    textarea.style.overflowWrap=wrapOn?"anywhere":"normal";
    textarea.style.wordBreak=wrapOn?"break-word":"normal";
    textarea.style.overflowX=wrapOn?"hidden":"auto";
    if(gutter){
      /* line numbers must use the code's exact metrics, or they drift per line */
      /* whole-pixel line height: fractional values (20.4px) are rounded
       * differently for <textarea> and <pre>, drifting ~1 line per 1.300 */
      const lhNow=parseFloat(getComputedStyle(textarea).lineHeight);
      if(Number.isFinite(lhNow)&&Math.round(lhNow)!==lhNow) textarea.style.setProperty("line-height",Math.round(lhNow)+"px","important");
      const tc=getComputedStyle(textarea);
      gutter.style.setProperty("font-size",tc.fontSize,"important");
      gutter.style.setProperty("line-height",tc.lineHeight,"important");
      gutter.style.setProperty("box-sizing","border-box","important");
      const gr=gutter.getBoundingClientRect(),tr=textarea.getBoundingClientRect();
      if(gr.height>0&&tr.height>0){
        const pad=Math.max(0,Math.round((tr.top+parseFloat(tc.borderTopWidth||"0")+parseFloat(tc.paddingTop||"0")-gr.top-parseFloat(getComputedStyle(gutter).borderTopWidth||"0"))*10)/10);
        gutter.style.setProperty("padding-top",pad+"px","important");
        gutter.style.setProperty("padding-bottom",tc.paddingBottom,"important");
      }
      gutter.scrollTop=textarea.scrollTop;
    }
    if(!textarea.__ngebloggingV363Scroll){
      textarea.__ngebloggingV363Scroll=true;
      textarea.addEventListener("input",()=>{ensureGutter(textarea);},{passive:true});
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
