const RELEASE = "studio-flow-integrity-v111-20260728";
const DOMAIN_STYLE_MARKER = "data-domain-flow-integrity-v111";

const DOMAIN_FLOW_CSS = String.raw`
:host{
  display:block!important;
  position:relative!important;
  inset:auto!important;
  transform:none!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  height:auto!important;
  min-height:0!important;
  overflow:visible!important;
  isolation:isolate!important;
  contain:layout style!important;
  font-size:16px!important;
  line-height:1.5!important;
  -webkit-text-size-adjust:100%!important;
  text-size-adjust:100%!important;
}
.app,.app *,.app *::before,.app *::after{box-sizing:border-box!important;min-width:0}
.app{
  display:block!important;
  position:relative!important;
  inset:auto!important;
  transform:none!important;
  float:none!important;
  width:100%!important;
  max-width:1480px!important;
  min-height:0!important;
  height:auto!important;
  margin:0 auto!important;
  overflow:visible!important;
  font-size:16px!important;
  line-height:1.5!important;
}
.app :where(header,section,article,aside,div,span,label,form,nav,footer,h1,h2,h3,h4,p,small,b,strong,em,i,input,button){
  transform:none!important;
  float:none!important;
}
.app :where(h1,h2,h3,h4,p,small,b,strong,em,i,span,label){
  max-width:100%!important;
  overflow-wrap:anywhere!important;
  word-break:normal!important;
}
.hero,.workspace,.card,.metrics,.free,.section-head,.register-form,.field,.provider-note,.domain-list-head,.audit-head,.domain,.routing,.address,.address-form{
  position:relative!important;
  inset:auto!important;
  height:auto!important;
  min-height:0!important;
  transform:none!important;
}
.hero{align-items:start!important}
h1{font-size:clamp(38px,4.8vw,66px)!important;line-height:1.02!important;white-space:normal!important}
.workspace h2,.free h2,.section-head h2,.domain-list-head h2,.audit-head h2{line-height:1.2!important;white-space:normal!important}
.workspace p,.free p,.section-head p,.domain-list-head p,.audit-head p{line-height:1.6!important;white-space:normal!important}
.section-head{align-items:start!important}
.section-head>div{position:relative!important;display:block!important;height:auto!important;min-height:0!important}
.register-form{align-items:end!important}
.field{position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;align-content:start!important;gap:7px!important;width:100%!important;height:auto!important;min-height:0!important;margin:0!important}
.field>span,.field>small{position:relative!important;inset:auto!important;display:block!important;width:100%!important;height:auto!important;min-height:0!important;margin:0!important;line-height:1.45!important;white-space:normal!important}
.field>span{font-size:12px!important}.field>small{font-size:11px!important}
.input{
  position:relative!important;
  inset:auto!important;
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  height:50px!important;
  min-height:50px!important;
  margin:0!important;
  font-size:16px!important;
  line-height:1.25!important;
}
.register-form>.btn,.address-form>.btn{position:relative!important;inset:auto!important;height:auto!important;min-height:46px!important;margin:0!important;white-space:normal!important}
.provider-note{line-height:1.5!important;white-space:normal!important}

@media(max-width:1100px){
  .workspace{grid-template-columns:minmax(0,1fr)!important}
  .register-form,.address-form{grid-template-columns:minmax(0,1fr)!important;align-items:stretch!important}
  .register-form>.btn,.address-form>.btn{justify-self:start!important}
}
@media(max-width:700px){
  :host{font-size:16px!important}
  .app{padding:18px 12px max(56px,env(safe-area-inset-bottom))!important;font-size:16px!important;overflow-x:hidden!important}
  .hero{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important;margin-bottom:18px!important}
  .hero .btn{justify-self:start!important;margin:0!important}
  h1{font-size:clamp(34px,10vw,48px)!important;line-height:1.04!important;margin:6px 0 9px!important}
  .hero p{font-size:13px!important;line-height:1.6!important}
  .workspace,.free,.section-head,.register-form{padding:16px!important}
  .workspace{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:14px!important}
  .workspace h2{font-size:21px!important;line-height:1.2!important}
  .workspace aside{width:100%!important}
  .metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .free{display:grid!important;grid-template-columns:48px minmax(0,1fr)!important;gap:12px!important;align-items:start!important}
  .free .iconbox{width:48px!important;height:48px!important;border-radius:14px!important}
  .free h2{font-size:19px!important;line-height:1.2!important}
  .free aside{grid-column:1/-1!important;justify-content:flex-start!important}
  .section-head{display:grid!important;grid-template-columns:40px minmax(0,1fr)!important;gap:12px!important}
  .section-head h2{font-size:21px!important;line-height:1.2!important;margin:4px 0 6px!important}
  .section-head p{font-size:12px!important;line-height:1.55!important}
  .register-form{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:14px!important;align-items:stretch!important}
  .field{gap:8px!important}
  .input{height:50px!important;min-height:50px!important;font-size:16px!important}
  .register-form>.btn{justify-self:stretch!important;width:100%!important;min-height:48px!important}
  .provider-note{margin:0 16px 16px!important;padding:12px!important;font-size:12px!important}
  .domain-list-head,.audit-head{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important;padding:16px!important}
}
@media(max-width:430px){
  .app{padding-left:10px!important;padding-right:10px!important}
  h1{font-size:clamp(31px,10.5vw,42px)!important}
  .metrics{grid-template-columns:minmax(0,1fr)!important}
  .free{grid-template-columns:42px minmax(0,1fr)!important;padding:14px!important}
  .free .iconbox{width:42px!important;height:42px!important}
  .section-head{grid-template-columns:38px minmax(0,1fr)!important;padding:14px!important}
  .section-head .iconbox{width:38px!important;height:38px!important}
  .register-form{padding:14px!important}
  .provider-note{margin:0 14px 14px!important}
}
`;

function installDomainFlowIntegrity(root) {
  if (!(root instanceof ShadowRoot)) return;
  if (!root.querySelector("#domain-manager-v80")) return;
  if (root.querySelector(`style[${DOMAIN_STYLE_MARKER}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(DOMAIN_STYLE_MARKER, RELEASE);
  style.textContent = DOMAIN_FLOW_CSS;
  root.append(style);
  root.host?.setAttribute?.("data-domain-flow-integrity-v111", RELEASE);
}

function sync() {
  document.documentElement.dataset.studioFlowIntegrityV111 = RELEASE;
  document.querySelectorAll(".d80-host").forEach((host) => installDomainFlowIntegrity(host.shadowRoot));
  document.querySelectorAll(".csm-page-v93").forEach((page) => {
    page.dataset.flowIntegrityV111 = RELEASE;
    page.style.setProperty("position", "relative", "important");
    page.style.setProperty("inset", "auto", "important");
    page.style.setProperty("transform", "none", "important");
    page.style.setProperty("height", "auto", "important");
    page.style.setProperty("min-height", "0", "important");
  });
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "attributes")) schedule();
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-comments-open-v93"],
});

window.addEventListener("pageshow", schedule);
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("ngeblogging:active-site-ready", schedule);
window.addEventListener("ngeblogging:active-site-change", schedule);

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
else schedule();

export { RELEASE, DOMAIN_FLOW_CSS, installDomainFlowIntegrity };
