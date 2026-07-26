const RELEASE = "studio-layout-device-v40-20260726";
const STORAGE_KEY = "ngeblogging-layout-preview-v40";
const attached = new WeakSet();
let frame = 0;

const MODES = [
  { id:"desktop", label:"Desktop", note:"Komputer dan laptop" },
  { id:"tablet", label:"Tablet", note:"Tablet dan layar sedang" },
  { id:"mobile", label:"Ponsel / aplikasi", note:"Handphone, PWA, dan layar kecil" },
];

function preferredMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (MODES.some((mode) => mode.id === saved)) return saved;
  } catch {}
  const device = document.documentElement.dataset.deviceMode;
  if (device === "mobile") return "mobile";
  if (device === "tablet") return "tablet";
  return "desktop";
}

function setMode(layer, mode) {
  const safeMode = MODES.some((item) => item.id === mode) ? mode : "desktop";
  layer.dataset.lb40Preview = safeMode;
  layer.querySelectorAll("[data-lb40-mode]").forEach((button) => {
    const active = button.dataset.lb40Mode === safeMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  const selected = MODES.find((item) => item.id === safeMode);
  const status = layer.querySelector(".lb40-preview-status");
  if (status && selected) status.textContent = `Pratinjau ${selected.label}: ${selected.note}.`;
  try { localStorage.setItem(STORAGE_KEY, safeMode); } catch {}
}

function switchMarkup() {
  return `<section class="lb40-preview-panel" aria-label="Mode pratinjau tata letak">
    <div class="lb40-preview-copy"><b>Tampilan per perangkat</b><span class="lb40-preview-status">Pilih bentuk layar untuk memeriksa susunan kotak.</span></div>
    <div class="lb40-preview-switch" role="group" aria-label="Pilih perangkat">
      ${MODES.map((mode) => `<button type="button" data-lb40-mode="${mode.id}" aria-pressed="false"><span aria-hidden="true">${mode.id === "desktop" ? "▰" : mode.id === "tablet" ? "▯" : "▯"}</span>${mode.label}</button>`).join("")}
    </div>
  </section>`;
}

function attach(layer) {
  if (attached.has(layer)) return;
  const host = layer.querySelector(".lb39-canvas-host");
  if (!host) return;
  attached.add(layer);
  host.insertAdjacentHTML("beforebegin", switchMarkup());
  layer.querySelectorAll("[data-lb40-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(layer, button.dataset.lb40Mode));
    button.addEventListener("keydown", (event) => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const buttons = [...layer.querySelectorAll("[data-lb40-mode]")];
      const index = buttons.indexOf(button);
      const nextIndex = event.key === 'Home' ? 0
        : event.key === 'End' ? buttons.length - 1
        : event.key === 'ArrowRight' ? (index + 1) % buttons.length
        : (index - 1 + buttons.length) % buttons.length;
      buttons[nextIndex]?.focus();
      buttons[nextIndex]?.click();
    });
  });
  setMode(layer, preferredMode());
}

function scan() {
  document.documentElement.dataset.studioLayoutDeviceV40 = RELEASE;
  document.querySelectorAll(".lb39-layer").forEach(attach);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList:true, subtree:true });

window.addEventListener("ngeblogging:device-mode", schedule);
scan();
