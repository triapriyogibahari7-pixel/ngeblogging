export const STUDIO_THEME_LAYOUT_RELEASE_V311 = "studio-theme-layout-models-v311-20260806";

const MODEL_KEY = "ngeblogging-theme-layout-model-v311";
const MODELS = [
  { id: "editorial", label: "Editorial" },
  { id: "portal", label: "Portal" },
];

function activeThemeId() {
  try { return JSON.parse(localStorage.getItem("ngeblogging-theme-studio-v3") || "null")?.activeThemeId || "default"; }
  catch { return "default"; }
}
function storageKey() { return `${MODEL_KEY}:${activeThemeId()}`; }
function readModel() {
  try {
    const value = localStorage.getItem(storageKey()) || "editorial";
    return MODELS.some((item) => item.id === value) ? value : "editorial";
  } catch { return "editorial"; }
}
function saveModel(value) {
  try { localStorage.setItem(storageKey(), value); } catch { /* storage optional */ }
}
function renderSwitch(map) {
  if (!map || map.querySelector(".tn-layout-models-v311")) return;
  const control = document.createElement("div");
  control.className = "tn-layout-models-v311";
  control.setAttribute("role", "group");
  control.setAttribute("aria-label", "Model tata letak");
  control.innerHTML = MODELS.map((item) => `<button type="button" data-layout-model-v311="${item.id}">${item.label}</button>`).join("");
  map.prepend(control);
}
function applyModel(map, model = readModel()) {
  if (!map) return;
  map.dataset.layoutModelV311 = model;
  map.querySelectorAll("[data-layout-model-v311]").forEach((button) => {
    const active = button.dataset.layoutModelV311 === model;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.documentElement.dataset.studioThemeLayoutV311 = STUDIO_THEME_LAYOUT_RELEASE_V311;
}
function enhance() {
  const map = document.querySelector(".tn-layout-map-v264");
  if (!map) return false;
  renderSwitch(map);
  applyModel(map);
  return true;
}
function schedule() { requestAnimationFrame(enhance); }

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const modelButton = event.target.closest?.("[data-layout-model-v311]");
    if (modelButton) {
      event.preventDefault();
      const map = modelButton.closest(".tn-layout-map-v264");
      const model = modelButton.dataset.layoutModelV311;
      if (!MODELS.some((item) => item.id === model)) return;
      saveModel(model);
      applyModel(map, model);
      return;
    }
    schedule();
  }, false);
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  window.addEventListener("storage", (event) => { if (String(event.key || "").startsWith(MODEL_KEY)) schedule(); });
  schedule();
}
