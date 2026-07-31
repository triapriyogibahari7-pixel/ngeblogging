import "./studio-production-recovery-v180.css";

const RELEASE = "production-recovery-v180-20260731";

function markRuntime() {
  document.documentElement.dataset.studioProductionRecoveryV180 = RELEASE;
  document.documentElement.dataset.studioSessionPolicyV180 = "persist-until-explicit-logout";

  const sidebar = document.querySelector(".sn-shell>.sn-side");
  if (sidebar?.classList.contains("mobile-open")) {
    sidebar.removeAttribute("inert");
    sidebar.setAttribute("aria-hidden", "false");
  }

  const nara = document.querySelector(".nara-assistant-shell");
  const size = nara?.dataset.naraSize || nara?.getAttribute("data-size") || "small";
  if (nara && size !== "full") {
    document.body.classList.remove("nara-scroll-lock", "nara-fullscreen-open", "sm177-nara-full");
    document.documentElement.classList.remove("nara-scroll-lock");
  }
}

const observer = new MutationObserver(() => requestAnimationFrame(markRuntime));
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size", "aria-hidden", "inert"],
});

window.addEventListener("pageshow", markRuntime, { passive: true });
window.addEventListener("online", markRuntime, { passive: true });
markRuntime();

export { RELEASE, markRuntime };
