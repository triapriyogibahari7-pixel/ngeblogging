import "./nara-controls-v135.css";

const RELEASE = "nara-controls-v135-20260729";
const CONTROL_CLASS = "nara-fullscreen-toggle-v135";
const FULLSCREEN_CLASS = "nara-fullscreen-v135";

function icon(fullscreen) {
  return fullscreen
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M16 3v3a2 2 0 0 0 2 2h3"/><path d="M8 21v-3a2 2 0 0 0-2-2H3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
}

function setFullscreen(shell, button, fullscreen) {
  shell.classList.toggle(FULLSCREEN_CLASS, fullscreen);
  shell.dataset.naraDisplayMode = fullscreen ? "fullscreen" : "compact";
  document.body.classList.toggle("nara-fullscreen-open-v135", fullscreen);
  button.dataset.fullscreen = String(fullscreen);
  button.title = fullscreen ? "Kembali ke ukuran sedang" : "Buka layar penuh";
  button.setAttribute("aria-label", button.title);
  button.innerHTML = icon(fullscreen);
}

function install(shell) {
  if (!shell || shell.dataset.naraControlsRelease === RELEASE) return;
  const header = shell.querySelector(".nara-assistant-header");
  if (!header) return;

  shell.dataset.naraControlsRelease = RELEASE;
  header.dataset.naraControlsV135 = "true";

  let button = header.querySelector(`.${CONTROL_CLASS}`);
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = CONTROL_CLASS;
    const closeButton = header.lastElementChild;
    if (closeButton) header.insertBefore(button, closeButton);
    else header.append(button);
  }

  setFullscreen(shell, button, false);
  button.addEventListener("click", () => {
    setFullscreen(shell, button, !shell.classList.contains(FULLSCREEN_CLASS));
  });

  const closeButton = [...header.querySelectorAll(":scope > button")]
    .find((candidate) => candidate !== button && /tutup/i.test(candidate.title || candidate.getAttribute("aria-label") || ""))
    || header.lastElementChild;
  closeButton?.addEventListener("click", () => {
    document.body.classList.remove("nara-fullscreen-open-v135");
  });
}

function sync() {
  const shell = document.querySelector(".nara-assistant-shell");
  if (shell) install(shell);
  else document.body.classList.remove("nara-fullscreen-open-v135");
}

if (typeof document !== "undefined") {
  const observer = new MutationObserver(sync);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
