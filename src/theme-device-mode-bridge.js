const LABELS = {
  mobile: "Mobile",
  tablet: "Tablet",
  laptop: "Laptop",
  desktop: "Komputer",
};

function realPhone() {
  if (navigator.userAgentData?.mobile === true) return true;
  if (/Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")) return true;
  return document.documentElement.dataset.deviceMode === "mobile";
}

function switchFrame(deviceSwitch, mode) {
  const container = deviceSwitch.closest(".tn-active-stage,.tn-modal");
  const frame = container?.querySelector(".tn-frame-shell");
  if (!frame) return;
  frame.classList.remove("mobile", "tablet", "laptop", "desktop");
  frame.classList.add(mode);
  frame.dataset.previewDevice = mode;
  deviceSwitch.dataset.previewDevice = mode;
  deviceSwitch.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.deviceMode === mode);
    button.setAttribute("aria-pressed", String(button.dataset.deviceMode === mode));
  });
}

function prepareNativeButton(button, mode) {
  button.dataset.deviceMode = mode;
  button.title = LABELS[mode];
  button.setAttribute("aria-label", `Pratinjau ${LABELS[mode]}`);
  const label = button.querySelector("span");
  if (label) label.textContent = LABELS[mode];
  if (button.dataset.deviceBridgeBound === "true") return;
  button.dataset.deviceBridgeBound = "true";
  button.addEventListener("click", () => {
    const deviceSwitch = button.closest(".tn-device-switch");
    if (!deviceSwitch) return;
    delete deviceSwitch.dataset.forcedDevice;
    requestAnimationFrame(() => switchFrame(deviceSwitch, mode));
  });
}

function laptopButton(deviceSwitch) {
  let button = deviceSwitch.querySelector('[data-device-mode="laptop"]');
  if (button) return button;
  button = document.createElement("button");
  button.type = "button";
  button.dataset.deviceMode = "laptop";
  button.className = "tn-laptop-mode";
  button.title = LABELS.laptop;
  button.setAttribute("aria-label", "Pratinjau Laptop");
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 18h19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Laptop</span>';
  const desktop = deviceSwitch.querySelector('[data-device-mode="desktop"]');
  if (desktop) deviceSwitch.insertBefore(button, desktop);
  else deviceSwitch.append(button);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deviceSwitch.dataset.forcedDevice = "laptop";
    switchFrame(deviceSwitch, "laptop");
  });
  return button;
}

function prepareSwitch(deviceSwitch) {
  const native = [...deviceSwitch.querySelectorAll(":scope > button")].filter((button) => !button.classList.contains("tn-laptop-mode"));
  const modeOrder = native.length >= 3 ? ["desktop", "tablet", "mobile"] : [];
  native.forEach((button, index) => prepareNativeButton(button, modeOrder[index] || button.dataset.deviceMode || "desktop"));
  laptopButton(deviceSwitch);

  if (!deviceSwitch.dataset.previewInitialized) {
    deviceSwitch.dataset.previewInitialized = "true";
    const preferred = realPhone() ? "mobile" : window.innerWidth <= 1100 ? "laptop" : "desktop";
    const button = deviceSwitch.querySelector(`[data-device-mode="${preferred}"]`);
    if (preferred === "laptop") button?.click();
    else if (button && !button.classList.contains("active")) button.click();
    else switchFrame(deviceSwitch, preferred);
  } else if (deviceSwitch.dataset.forcedDevice === "laptop") {
    switchFrame(deviceSwitch, "laptop");
  }
}

function scan() {
  document.querySelectorAll(".tn-device-switch").forEach(prepareSwitch);
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("ngeblogging:device-mode", schedule);
schedule();
