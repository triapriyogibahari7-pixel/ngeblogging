const RELEASE = "nara-interface-authority-v147-20260729";
const VALID_SIZES = new Set(["small", "medium", "full"]);
let frame = 0;
let speakingButton = null;

function stopSpeech() {
  try { window.speechSynthesis?.cancel(); } catch { /* browser tanpa speech synthesis */ }
  if (speakingButton) {
    speakingButton.classList.remove("speaking");
    speakingButton.setAttribute("aria-pressed", "false");
    speakingButton = null;
  }
}

function setSize(shell, size) {
  if (!(shell instanceof HTMLElement)) return;
  const normalized = VALID_SIZES.has(size) ? size : "small";
  shell.dataset.naraSize = normalized;
  shell.dataset.naraSizeAuthority = RELEASE;
  document.documentElement.dataset.naraAssistantSize = normalized;
  shell.querySelectorAll(".nara-size-controls-v147 button").forEach((button) => {
    const active = button.dataset.size === normalized;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function createSizeControls(shell, header) {
  let controls = header.querySelector(":scope > .nara-size-controls-v147");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "nara-size-controls-v147";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Ukuran jendela Nara AI");
    controls.dataset.release = RELEASE;

    const options = [
      ["small", "Kecil", "Buka Nara sebagai widget kecil"],
      ["medium", "Medium", "Perbesar Nara ke ukuran medium"],
      ["full", "Penuh", "Buka Nara memenuhi layar"],
    ];

    for (const [size, label, title] of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.size = size;
      button.textContent = label;
      button.title = title;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSize(shell, size);
      });
      controls.append(button);
    }

    const actionButtons = [...header.querySelectorAll(":scope > button")];
    header.insertBefore(controls, actionButtons[0] || null);
  }

  if (!shell.dataset.naraSizeAuthority) setSize(shell, "small");
  else setSize(shell, shell.dataset.naraSize || "small");
}

function speakMessage(button, text) {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    button.title = "Speaker balasan suara belum didukung browser ini";
    return;
  }
  if (speakingButton === button) {
    stopSpeech();
    return;
  }

  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(String(text || "").trim());
  utterance.lang = "id-ID";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onend = stopSpeech;
  utterance.onerror = stopSpeech;
  speakingButton = button;
  button.classList.add("speaking");
  button.setAttribute("aria-pressed", "true");
  window.speechSynthesis.speak(utterance);
}

function enhanceSpeech(message) {
  const content = message.querySelector(".nara-message-content");
  if (!content || message.querySelector(".nara-speech-action-v147")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nara-message-action nara-speech-action-v147";
  button.title = "Bacakan balasan Nara";
  button.setAttribute("aria-label", "Bacakan balasan Nara");
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg><span>Dengar</span>';
  button.addEventListener("click", () => speakMessage(button, content.textContent));
  const copyButton = message.querySelector(".nara-message-action:not(.retry)");
  if (copyButton) copyButton.insertAdjacentElement("afterend", button);
  else message.querySelector(":scope > div")?.append(button);
}

function synchronizeIntelligenceLabels(shell) {
  const select = shell.querySelector(".nara-select.intelligence select");
  if (!select) return;
  const labels = {
    light: "Instan",
    standard: "Sedang",
    high: "Tinggi",
    xhigh: "Maksimal · Pro",
  };
  [...select.options].forEach((option) => {
    const label = labels[option.value];
    if (label) option.textContent = label;
  });
  const visible = shell.querySelector(".nara-select.intelligence > span");
  if (visible) visible.textContent = labels[select.value]?.replace(" · Pro", "") || "Sedang";
  if (!select.dataset.naraLabelListener) {
    select.dataset.naraLabelListener = RELEASE;
    select.addEventListener("change", () => schedule());
  }
}

function enhanceNara() {
  frame = 0;
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => {
    const header = shell.querySelector(":scope > .nara-assistant-header");
    if (!header) return;
    createSizeControls(shell, header);
    synchronizeIntelligenceLabels(shell);
    shell.querySelectorAll(".nara-message.assistant").forEach(enhanceSpeech);
  });
  document.documentElement.dataset.naraSizeAuthority = RELEASE;
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(enhanceNara);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("beforeunload", stopSpeech);
document.addEventListener("click", (event) => {
  if (event.target.closest(".nara-assistant-header button[title='Tutup']")) stopSpeech();
});

schedule();

export { RELEASE, enhanceNara, setSize, stopSpeech };
