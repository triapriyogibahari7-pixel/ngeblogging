const RELEASE="studio-precision-v98-20260728";

function labelOf(button){return button?.querySelector("span")?.textContent?.trim()||button?.textContent?.trim()||""}
function copyRowGeometry(){
  const nav=document.querySelector(".sn-side>nav");
  if(!nav)return;
  const comments=nav.querySelector(".sn-comments-nav-button-v93");
  const reference=[...nav.querySelectorAll(":scope>button")].find((b)=>!b.hidden&&!["Nara AI","Komentar"].includes(labelOf(b)));
  if(!(comments instanceof HTMLElement)||!(reference instanceof HTMLElement))return;
  const cs=getComputedStyle(reference);
  ["min-height","height","padding-top","padding-right","padding-bottom","padding-left","gap","border-radius","font-family","font-size","font-weight","line-height","letter-spacing","color","background-color","text-align"].forEach((p)=>{const v=cs.getPropertyValue(p);if(v)comments.style.setProperty(p,v,"important")});
  const refIcon=reference.querySelector("svg"),icon=comments.querySelector("svg");
  if(refIcon&&icon){const ir=getComputedStyle(refIcon);icon.style.setProperty("width",ir.width,"important");icon.style.setProperty("height",ir.height,"important")}
  comments.dataset.nativeRowV98="true";
}
async function copyCode(workspace,button){
  const textarea=workspace.querySelector("textarea");if(!(textarea instanceof HTMLTextAreaElement))return;
  try{await navigator.clipboard.writeText(textarea.value)}catch{textarea.focus();textarea.select();document.execCommand("copy")}
  const old=button.textContent;button.textContent="Tersalin";setTimeout(()=>button.textContent=old,1200);
}
function installThemeTools(layer){
  if(!(layer instanceof HTMLElement)||layer.dataset.toolsV98==="true")return;
  const workspace=layer.querySelector(".tn-code-workspace"),footer=layer.querySelector(".tn-modal>footer");
  if(!(workspace instanceof HTMLElement)||!(footer instanceof HTMLElement))return;
  layer.dataset.toolsV98="true";workspace.dataset.previewOpenV98="false";
  const tools=document.createElement("div");tools.className="tn-v98-tools";
  const copy=document.createElement("button");copy.type="button";copy.className="tn-v98-tool";copy.textContent="Salin";copy.addEventListener("click",()=>copyCode(workspace,copy));
  const preview=document.createElement("button");preview.type="button";preview.className="tn-v98-tool";preview.textContent="Preview";preview.addEventListener("click",()=>{const open=workspace.dataset.previewOpenV98!=="true";workspace.dataset.previewOpenV98=String(open);preview.classList.toggle("active",open);preview.textContent=open?"Kembali ke kode":"Preview"});
  tools.append(copy,preview);footer.prepend(tools);
}
function sync(){
  document.documentElement.dataset.studioPrecision=RELEASE;
  copyRowGeometry();
  document.querySelectorAll(".tn-modal-layer").forEach(installThemeTools);
}
let raf=0;function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(sync)}
new MutationObserver((m)=>{if(m.some(x=>x.addedNodes.length||x.removedNodes.length))schedule()}).observe(document.body,{childList:true,subtree:true});
window.addEventListener("resize",schedule,{passive:true});window.addEventListener("pageshow",schedule,{passive:true});schedule();
