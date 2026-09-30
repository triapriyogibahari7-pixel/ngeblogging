import "./studio-theme-code-editor-v353.css";
export const STUDIO_THEME_CODE_EDITOR_RELEASE_V353="studio-theme-code-editor-v353-20260930";

function schedule(){
  if(typeof document==="undefined") return;
  requestAnimationFrame(()=>{
    document.querySelectorAll('.tn-modal-layer[data-v342-code-layer="ready"]').forEach(layer=>{
      layer.dataset.v353Editor="ready";
    });
  });
}
if(typeof window!=="undefined"&&typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
  window.addEventListener("resize",schedule,{passive:true});
  document.addEventListener("click",schedule,{passive:true});
}
