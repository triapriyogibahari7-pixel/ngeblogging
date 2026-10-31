export function domainCatalogGeometry({width,height,family,sidebarRight=0,sidebarWidth=0,sidebarVisibility='visible',sidebarDisplay='block',viewportHeight,viewportTop=0}={}){
 const valid=n=>Number.isFinite(n)&&n>0;
 const w=valid(width)?width:1,h=valid(viewportHeight)?viewportHeight:valid(height)?height:1;
 const compact=w<=760||family==='small';
 const visible=sidebarVisibility!=='hidden'&&sidebarVisibility!=='collapse'&&sidebarDisplay!=='none'&&valid(sidebarWidth);
 const left=!compact&&visible&&Number.isFinite(sidebarRight)?Math.max(0,Math.min(Math.ceil(sidebarRight),Math.max(0,w-280))):0;
 return {compact,left,height:h,top:Number.isFinite(viewportTop)?Math.max(0,viewportTop):0};
}
export function observeDomainCatalogFrame(node,win=window){
 const doc=win.document;let dead=false,frame=0,sidebar=null;
 const schedule=()=>{if(!dead&&!frame)frame=win.requestAnimationFrame(()=>{frame=0;sync();});};
 const resize=typeof win.ResizeObserver==='function'?new win.ResizeObserver(schedule):null;
 const sidebarChanges=typeof win.MutationObserver==='function'?new win.MutationObserver(schedule):null;
 function sync(){
  if(dead)return;const next=doc.querySelector('#ngeblogging-studio-sidebar');
  if(next!==sidebar){if(sidebar)resize?.unobserve(sidebar);sidebarChanges?.disconnect();sidebar=next;if(sidebar){resize?.observe(sidebar);sidebarChanges?.observe(sidebar,{attributes:true,attributeFilter:['class','style','hidden']});}}
  const rect=sidebar?.getBoundingClientRect(),style=sidebar?win.getComputedStyle(sidebar):null;
  const g=domainCatalogGeometry({width:win.innerWidth,height:win.innerHeight,family:doc.documentElement.dataset.v238Family,sidebarRight:rect?.right,sidebarWidth:rect?.width,sidebarVisibility:style?.visibility,sidebarDisplay:style?.display,viewportHeight:win.visualViewport?.height,viewportTop:win.visualViewport?.offsetTop});
  const vars={'--dc-sidebar-left':g.left+'px','--dc-viewport-height':g.height+'px','--dc-viewport-top':g.top+'px'};
  for(const [key,value] of Object.entries(vars))if(node.style.getPropertyValue(key)!==value)node.style.setProperty(key,value);
  node.dataset.compact=String(g.compact);
 }
 const modes=typeof win.MutationObserver==='function'?new win.MutationObserver(schedule):null;
 const tree=typeof win.MutationObserver==='function'?new win.MutationObserver(records=>{if(records.some(r=>!node.contains(r.target)))schedule();}):null;
 sync();modes?.observe(doc.documentElement,{attributes:true,attributeFilter:['class','data-v238-family','data-studio-device-mode','data-studio-desktop-sidebar-v238']});
 if(doc.body)tree?.observe(doc.body,{childList:true,subtree:true});
 win.addEventListener('resize',schedule,{passive:true});win.addEventListener('orientationchange',schedule,{passive:true});win.visualViewport?.addEventListener('resize',schedule,{passive:true});win.visualViewport?.addEventListener('scroll',schedule,{passive:true});
 return ()=>{dead=true;if(frame)win.cancelAnimationFrame(frame);resize?.disconnect();sidebarChanges?.disconnect();modes?.disconnect();tree?.disconnect();win.removeEventListener('resize',schedule);win.removeEventListener('orientationchange',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);};
}
