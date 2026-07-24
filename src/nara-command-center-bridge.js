const RELEASE = "nara-command-center-v13-20260724";
const ROOT = document.getElementById("root") || document.documentElement;
const attached = new WeakSet();
let scanFrame = 0;

const COMMANDS = [
  { id: "projects", label: "Projects", tab: "Projects", icon: "folder" },
  { id: "memory", label: "Memori", tab: "Memory", icon: "memory" },
  { id: "images", label: "Buat gambar", tab: "Images", icon: "image" },
  { id: "plugins", label: "Plugins", tab: "Plugins", icon: "plugin" },
  { id: "qr", label: "Baca QR", icon: "qr" },
];

const ICONS = {
  folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5h6l2 2H21v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 7.5V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1.5"/></svg>',
  memory: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M19 9h4M19 15h4M1 9h4M1 15h4"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m4 17 5-5 4 4 2-2 5 5"/></svg>',
  plugin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3H5a2 2 0 0 0-2 2v3.5a2.5 2.5 0 1 1 0 5V17a2 2 0 0 0 2 2h3.5a2.5 2.5 0 1 0 5 0H17a2 2 0 0 0 2-2v-3.5a2.5 2.5 0 1 0 0-5V5a2 2 0 0 0-2-2h-3.5a2.5 2.5 0 1 1-5 0Z"/></svg>',
  qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><path d="M14 14h3v3h-3zM18 14h3M21 17v4h-4M14 18v3h2"/></svg>',
};

function text(node) {
  return node?.textContent?.replace(/\s+/g, " ").trim() || "";
}

function setStatus(shell, message, tone = "info") {
  let status = shell.querySelector(".nara-command-status");
  if (!status) {
    status = document.createElement("div");
    status.className = "nara-command-status";
    const shortcuts = shell.querySelector(".nara-capability-shortcuts");
    shortcuts?.insertAdjacentElement("afterend", status);
  }
  status.dataset.tone = tone;
  status.textContent = message;
  clearTimeout(Number(status.dataset.timer || 0));
  status.dataset.timer = String(window.setTimeout(() => {
    if (status.isConnected) status.remove();
  }, 4200));
}

function setComposerValue(shell, value) {
  const textarea = shell.querySelector(".nara-composer textarea");
  if (!textarea) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) setter.call(textarea, value);
  else textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus({ preventScroll: true });
}

function findWorkspaceRoute() {
  return [...document.querySelectorAll(".sn-side nav button")].find((button) => {
    return button.dataset.naraWorkspaceRoute === "true" || text(button) === "Nara AI";
  }) || null;
}

function selectWorkspaceTab(label, attempt = 0) {
  const tab = [...document.querySelectorAll(".nw-tabs button")].find((button) => text(button) === label);
  if (tab) {
    tab.click();
    tab.focus({ preventScroll: true });
    return;
  }
  if (attempt < 40) window.setTimeout(() => selectWorkspaceTab(label, attempt + 1), 50);
}

function openWorkspace(shell, tabLabel) {
  const route = findWorkspaceRoute();
  if (!route) {
    setStatus(shell, "Masuk ke Studio untuk membuka workspace Nara.", "warning");
    return;
  }
  const close = shell.querySelector('.nara-assistant-header button[title="Tutup"]');
  close?.click();
  window.requestAnimationFrame(() => {
    route.click();
    selectWorkspaceTab(tabLabel);
  });
}

async function supportedQrFormats() {
  if (!("BarcodeDetector" in window)) return [];
  if (typeof BarcodeDetector.getSupportedFormats !== "function") return ["qr_code"];
  try { return await BarcodeDetector.getSupportedFormats(); } catch { return []; }
}

async function decodeQr(shell, file) {
  if (!file?.type?.startsWith("image/")) {
    setStatus(shell, "Pilih gambar yang berisi kode QR.", "error");
    return;
  }
  setStatus(shell, "Membaca kode QR…");
  try {
    const formats = await supportedQrFormats();
    if (formats.includes("qr_code") && window.createImageBitmap) {
      const bitmap = await createImageBitmap(file);
      try {
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        const results = await detector.detect(bitmap);
        const value = results.find((item) => item.rawValue)?.rawValue?.trim();
        if (value) {
          setComposerValue(shell, `Analisis isi kode QR ini dan jelaskan dengan aman:\n${value}`);
          setStatus(shell, "Kode QR berhasil dibaca dan dimasukkan ke percakapan.", "success");
          return;
        }
      } finally {
        bitmap.close?.();
      }
    }
    setComposerValue(shell, "Baca kode QR pada gambar terlampir, tuliskan isi lengkapnya, lalu jelaskan tujuan dan risiko tautannya sebelum saya membukanya.");
    setStatus(shell, "QR akan dibaca oleh Nara Vision dari gambar terlampir.", "warning");
  } catch (error) {
    console.warn("QR detection failed", error);
    setComposerValue(shell, "Baca kode QR pada gambar terlampir dan tuliskan isi lengkapnya.");
    setStatus(shell, "Pemindai perangkat gagal; gambar tetap dikirim ke Nara Vision.", "warning");
  }
}

function openQrPicker(shell) {
  const imageInput = [...shell.querySelectorAll('.nara-composer input[type="file"][accept*="image"]')]
    .find((input) => input.multiple) || shell.querySelector('.nara-composer input[type="file"][accept*="image"]');
  if (!imageInput) {
    setStatus(shell, "Pemilih gambar QR belum tersedia.", "error");
    return;
  }
  imageInput.dataset.naraQrMode = "true";
  imageInput.click();
}

function handleCommand(shell, command) {
  if (command.id === "qr") openQrPicker(shell);
  else openWorkspace(shell, command.tab);
}

function attach(shell) {
  if (attached.has(shell)) return;
  const quickPrompts = shell.querySelector(".nara-quick-prompts");
  const composer = shell.querySelector(".nara-composer");
  if (!quickPrompts || !composer) return;
  attached.add(shell);

  const shortcuts = document.createElement("div");
  shortcuts.className = "nara-capability-shortcuts";
  shortcuts.dataset.release = RELEASE;
  shortcuts.setAttribute("aria-label", "Kemampuan Nara");

  for (const command of COMMANDS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.command = command.id;
    button.innerHTML = `<span>${ICONS[command.icon]}</span><b>${command.label}</b>`;
    button.addEventListener("click", () => handleCommand(shell, command));
    shortcuts.append(button);
  }

  quickPrompts.insertAdjacentElement("beforebegin", shortcuts);
  shell.dataset.commandCenter = RELEASE;
}

ROOT.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.dataset.naraQrMode !== "true") return;
  delete input.dataset.naraQrMode;
  const shell = input.closest(".nara-assistant-shell");
  const file = input.files?.[0];
  if (shell && file) window.setTimeout(() => decodeQr(shell, file), 0);
}, true);

function scan() {
  document.documentElement.dataset.naraCommandCenter = RELEASE;
  document.querySelectorAll(".nara-assistant-shell").forEach(attach);
}

function scheduleScan() {
  cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(scan);
}

new MutationObserver(scheduleScan).observe(ROOT, { childList: true, subtree: true });
scan();
