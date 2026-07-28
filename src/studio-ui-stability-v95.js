const RELEASE = "studio-ui-stability-v100-20260728";

function start() {
  const shell = document.querySelector(".sn-shell");
  if (shell) shell.dataset.uiStabilityRelease = RELEASE;

  window.addEventListener("pageshow", () => {
    const current = document.querySelector(".sn-shell");
    if (current) current.dataset.uiStabilityRelease = RELEASE;
  }, { passive: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
