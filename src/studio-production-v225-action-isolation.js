import "./studio-production-v225-action-isolation.css";
import "./studio-production-v225-nara-size-final.css";

const RELEASE = "studio-production-v225-action-isolation-20260803";
let frame = 0;
const LABELS = Object.freeze({ html:"Edit HTML", css:"Edit CSS", javascript:"Edit JavaScript" });

function expose(button) {
  const kind = button.dataset.v222CodeTab || "html";
  const label = LABELS[kind] || "Edit Kode";
  button.hidden = false; button.disabled = false; button.tabIndex = 0;
  button.removeAttribute("hidden"); button.removeAttribute("inert"); button.removeAttribute("aria-hidden"); button.removeAttribute("data-v209-hidden-duplicate");
  button.dataset.v225ActionIsolation = "true";
  button.setAttribute("aria-label",label); button.setAttribute("title",label);
  let labelNode = button.querySelector(":scope>.v209-button-label");
  if (!labelNode) {
    labelNode = document.createElement("span"); labelNode.className = "v209-button-label";
    [...button.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => node.remove());
    button.append(labelNode);
  }
  labelNode.textContent = label;
}

function isolateHero() {
  const hero = document.querySelector(".tn-studio .tn-hero-actions");
  if (!hero) return;
  const explicit = [...hero.querySelectorAll("button[data-v222-code-tab]")];
  if (!explicit.length) return;
  let wrapper = hero.querySelector(":scope>.v225-theme-code-actions");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "v225-theme-code-actions";
    wrapper.dataset.v225ThemeCodeIsolation = "outside-v209-direct-button-sweep";
    const site = [...hero.children].find((node) => node.matches?.("button") && /lihat situs|buka situs/i.test(node.textContent || node.getAttribute("aria-label") || ""));
    if (site) hero.insertBefore(wrapper,site); else hero.append(wrapper);
  }
  explicit.forEach((button) => { expose(button); if (button.parentElement !== wrapper) wrapper.append(button); });
  wrapper.hidden = false; wrapper.removeAttribute("hidden"); wrapper.removeAttribute("inert"); wrapper.removeAttribute("aria-hidden");
  hero.dataset.v225ThemeCodeActions = "html-css-javascript-visible";
}

function exposeCommandTabs() {
  document.querySelectorAll(".tn-studio .tn-command nav button[data-v222-code-tab]").forEach(expose);
}
function sync() { frame = 0; document.documentElement.dataset.studioProductionV225ActionIsolation = RELEASE; isolateHero(); exposeCommandTabs(); }
function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
new MutationObserver(schedule).observe(document.documentElement,{ childList:true,subtree:true,attributes:true,attributeFilter:["hidden","class","aria-hidden","data-v209-hidden-duplicate","data-v222-code-tab"] });
for (const eventName of ["pageshow","resize","orientationchange"]) window.addEventListener(eventName,schedule,{passive:true});
schedule();

export { RELEASE, isolateHero };
