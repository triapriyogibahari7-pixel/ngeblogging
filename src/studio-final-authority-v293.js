import "./studio-final-authority-v293.css";
import "./studio-theme-layout-v264.css";
import "./studio-theme-layout-v264.js";

export const RELEASE = "studio-final-authority-v293-20260805";
export const CONTENT_WORD_LIMIT = 5_000;
export const CONTENT_WORD_WARNING = 4_500;
export const CODE_LINE_LIMIT = 10_000;
export const STUDIO_FINAL_AUTHORITY_V293_SCOPE_V298 = "editor-only-v298-20260805";

const codeEditors = new WeakMap();

function lineNumbers(value) {
  const total = Math.min(CODE_LINE_LIMIT, Math.max(1, String(value || "").split("\n").length));
  return Array.from({ length: total }, (_, index) => index + 1).join("\n");
}

function syncCodeEditor() {
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.setAttribute("data-max-lines", String(CODE_LINE_LIMIT));
    textarea.setAttribute("spellcheck", "false");
    let record = codeEditors.get(textarea);
    let gutter = record?.gutter || textarea.parentElement?.querySelector(":scope>.tn-code-gutter-v293");
    if (!gutter) {
      gutter = document.createElement("pre");
      gutter.className = "tn-code-gutter-v293";
      gutter.setAttribute("aria-hidden", "true");
      textarea.insertAdjacentElement("beforebegin", gutter);
    }
    if (!record) {
      const update = () => {
        if (!textarea.isConnected || !gutter.isConnected) return;
        const next = lineNumbers(textarea.value);
        if (gutter.textContent !== next) gutter.textContent = next;
      };
      const scroll = () => { if (gutter.isConnected) gutter.scrollTop = textarea.scrollTop; };
      textarea.addEventListener("input", update, { passive:true });
      textarea.addEventListener("scroll", scroll, { passive:true });
      record = { gutter, update, scroll };
      codeEditors.set(textarea, record);
    }
    record.update();
  });
}

function editorWords() {
  const editor = document.querySelector(".ce-paper[contenteditable='true'],.ce-paper[contenteditable]");
  return String(editor?.innerText || editor?.textContent || "").trim().split(/\s+/).filter(Boolean).length;
}

function syncWordLimit() {
  const status = document.querySelector(".ce-word-status");
  if (!status) return;
  const words = editorWords();
  status.dataset.wordLimitV293 = String(CONTENT_WORD_LIMIT);
  const first = status.querySelector("span");
  if (first) first.textContent = `${words.toLocaleString("id-ID")} / ${CONTENT_WORD_LIMIT.toLocaleString("id-ID")} kata`;
  let warning = status.querySelector(".ce-word-warning-v293");
  if (!warning) {
    warning = document.createElement("strong");
    warning.className = "ce-word-warning-v293";
    status.append(warning);
  }
  warning.textContent = words > CONTENT_WORD_LIMIT
    ? `Kurangi ${(words - CONTENT_WORD_LIMIT).toLocaleString("id-ID")} kata sebelum diterbitkan.`
    : words >= CONTENT_WORD_WARNING
      ? `${(CONTENT_WORD_LIMIT - words).toLocaleString("id-ID")} kata tersisa sebelum batas publikasi.`
      : "";
}

function guardPublish(event) {
  const button = event.target.closest?.(".ce-actions .ce-primary,.ce-titlebar .ce-primary");
  if (!button || /Jadikan draf/i.test(button.textContent || "")) return;
  const words = editorWords();
  if (words <= CONTENT_WORD_LIMIT) return;
  event.preventDefault();
  event.stopPropagation();
  window.alert(`Konten berisi ${words.toLocaleString("id-ID")} kata. Draf tetap aman, tetapi publikasi ditahan sampai maksimal ${CONTENT_WORD_LIMIT.toLocaleString("id-ID")} kata.`);
}

function syncEditorContainment() {
  document.querySelectorAll(".ce-app,.ce-app>*,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane,.tn-layout-studio,.tn-layout-map-v264").forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

/* Legacy marker kept for v294 compatibility; Nara is owned only by v298. */
function syncNara() { return false; }

export function syncStudioV293() {
  if (!document.querySelector(".ce-app,.tn-code-pane,.tn-layout-studio")) return;
  document.documentElement.dataset.studioFinalAuthorityV293 = RELEASE;
  document.documentElement.dataset.studioFinalAuthorityV293Scope = STUDIO_FINAL_AUTHORITY_V293_SCOPE_V298;
  syncCodeEditor();
  syncWordLimit();
  syncEditorContainment();
}

function scheduleEditorSync() {
  requestAnimationFrame(syncStudioV293);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", guardPublish, true);
  document.addEventListener("input", (event) => {
    if (event.target.closest?.(".ce-app,.tn-code-pane")) scheduleEditorSync();
  }, { passive:true });
  window.addEventListener("pageshow", scheduleEditorSync, { passive:true });
  window.addEventListener("ngeblogging:studio-device-mode-change", scheduleEditorSync);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleEditorSync, { once:true });
  else scheduleEditorSync();
}

export { guardPublish, syncCodeEditor, syncNara };
