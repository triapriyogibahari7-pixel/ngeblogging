import "./studio-widget-studio-v366.css";

export const STUDIO_WIDGET_STUDIO_RELEASE_V367="studio-widget-studio-v367-20261001";

const SIDEBAR="#ngeblogging-studio-sidebar";
const LAYER=".tn-modal-layer";
const WIDGET=".tn-widget-studio";
let raf=0;
let observer=null;
let sidebarObserver=null;

function set(node,property,value){node?.style.setProperty(property,String(value),"important");}

function findLayer(){
  if(typeof document==="undefined") return null;
  for(const layer of document.querySelectorAll(LAYER)) if(layer.querySelector(WIDGET)) return layer;
  return null;
}

function getSidebarRight(){
  if(typeof window==="undefined"||window.innerWidth<=760) return 0;
  const sidebar=document.querySelector(SIDEBAR);
  if(!sidebar) return 0;
  const rect=sidebar.getBoundingClientRect();
  if(!Number.isFinite(rect.right)||rect.width<=0) return 0;
  return Math.max(0,Math.ceil(rect.right));
}

function getDeviceMode(){
  if(typeof document==="undefined") return "";
  const root=document.documentElement;
  return root.dataset.studioDeviceVariant||root.dataset.studioResponsiveMode||"";
}

function lock(layer){
  const modal=layer.querySelector(":scope > .tn-modal");
  const backdrop=layer.querySelector(":scope > .tn-modal-backdrop");
  const header=modal?.querySelector(":scope > header");
  const body=modal?.querySelector(":scope > .tn-modal-body");
  const footer=modal?.querySelector(":scope > footer");
  const studio=layer.querySelector(WIDGET);
  if(!modal||!studio) return;

  const desktop=window.innerWidth>760;
  const sidebarRight=getSidebarRight();
  layer.dataset.v366Widget="stable-responsive";
  layer.dataset.widgetDeviceMode=getDeviceMode();

  set(layer,"position","fixed"); set(layer,"top","0"); set(layer,"right","0"); set(layer,"bottom","0");
  set(layer,"left",desktop?sidebarRight+"px":"0px");
  set(layer,"width",desktop?"calc(100vw - "+sidebarRight+"px)":"100vw");
  set(layer,"height","100dvh");
  set(layer,"padding",desktop?"12px":"max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom))");
  set(layer,"display","grid"); set(layer,"place-items","center"); set(layer,"box-sizing","border-box");
  set(layer,"overflow","hidden"); set(layer,"z-index","100000");

  set(backdrop,"position","absolute"); set(backdrop,"inset","0"); set(backdrop,"width","100%"); set(backdrop,"height","100%");

  set(modal,"position","relative"); set(modal,"inset","auto"); set(modal,"transform","none");
  set(modal,"width","min(1240px,100%)"); set(modal,"max-width","100%"); set(modal,"min-width","0");
  set(modal,"height","min(760px,calc(100dvh - 24px))"); set(modal,"max-height","calc(100dvh - 24px)");
  set(modal,"min-height","0"); set(modal,"margin","0"); set(modal,"overflow","hidden");
  set(modal,"display","grid"); set(modal,"grid-template-rows","auto minmax(0,1fr) auto"); set(modal,"box-sizing","border-box");

  set(header,"position","relative"); set(header,"inset","auto"); set(header,"transform","none"); set(header,"width","100%");
  set(header,"min-width","0"); set(header,"min-height","72px"); set(header,"height","auto"); set(header,"padding","12px 16px");
  set(header,"display","grid"); set(header,"grid-template-columns","minmax(0,1fr) 44px"); set(header,"align-items","center");
  set(header,"gap","12px"); set(header,"overflow","hidden"); set(header,"box-sizing","border-box");

  const copy=header?.querySelector(":scope > div"), small=header?.querySelector("small"), title=header?.querySelector("h2"), close=header?.querySelector(":scope > button");
  set(copy,"position","static"); set(copy,"min-width","0"); set(copy,"max-width","100%"); set(copy,"overflow","hidden");
  set(small,"position","static"); set(small,"display","block"); set(small,"width","100%"); set(small,"max-width","100%");
  set(small,"margin","0 0 5px"); set(small,"white-space","normal"); set(small,"overflow-wrap","anywhere"); set(small,"word-break","normal"); set(small,"line-height","1.25");
  set(title,"position","static"); set(title,"display","block"); set(title,"width","100%"); set(title,"max-width","100%"); set(title,"margin","0");
  set(title,"white-space","normal"); set(title,"overflow-wrap","anywhere"); set(title,"word-break","normal"); set(title,"line-height","1.08"); set(title,"transform","none");
  set(close,"position","static"); set(close,"inset","auto"); set(close,"transform","none"); set(close,"width","44px"); set(close,"min-width","44px"); set(close,"max-width","44px"); set(close,"height","44px"); set(close,"min-height","44px");

  set(body,"width","100%"); set(body,"max-width","100%"); set(body,"min-width","0"); set(body,"min-height","0"); set(body,"overflow","auto"); set(body,"box-sizing","border-box");
  set(studio,"width","100%"); set(studio,"max-width","100%"); set(studio,"min-width","0"); set(studio,"min-height","0"); set(studio,"overflow","auto"); set(studio,"box-sizing","border-box");

  const summary=studio.querySelector(".tn-widget-summary"), grid=studio.querySelector(".tn-widget-grid");
  set(summary,"width","100%"); set(summary,"max-width","100%"); set(summary,"min-width","0"); set(summary,"box-sizing","border-box");
  set(grid,"width","100%"); set(grid,"max-width","100%"); set(grid,"min-width","0"); set(grid,"box-sizing","border-box");
  grid?.querySelectorAll(":scope > article").forEach(article=>{set(article,"min-width","0");set(article,"max-width","100%");set(article,"overflow","hidden");set(article,"box-sizing","border-box");});
  studio.querySelectorAll(".tn-widget-toggle").forEach(toggle=>{
    set(toggle,"width","100%");set(toggle,"max-width","100%");set(toggle,"min-width","0");set(toggle,"box-sizing","border-box");
    toggle.querySelectorAll("small,b,p").forEach(text=>{set(text,"position","static");set(text,"display","block");set(text,"width","100%");set(text,"max-width","100%");set(text,"white-space","normal");set(text,"overflow-wrap","anywhere");set(text,"word-break","normal");set(text,"line-height","1.35");set(text,"transform","none");});
  });
  set(footer,"width","100%"); set(footer,"max-width","100%"); set(footer,"min-width","0"); set(footer,"box-sizing","border-box");
}

function sync(){raf=0;const layer=findLayer();if(layer)lock(layer);}
function schedule(){if(raf)return;raf=requestAnimationFrame(sync);}

function boot(){
  schedule();
  observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  const sidebar=document.querySelector(SIDEBAR);
  if(typeof ResizeObserver!=="undefined"&&sidebar){sidebarObserver=new ResizeObserver(schedule);sidebarObserver.observe(sidebar);}
}
if(typeof window!=="undefined"&&typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",schedule,{passive:true});
  window.addEventListener("pageshow",schedule,{passive:true});
}
