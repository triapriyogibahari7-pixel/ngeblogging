import "./studio-content-editor-final-v314.css";

export const STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V314 = "studio-content-editor-final-v314-20260806";
export const CONTENT_WORD_LIMIT_V314 = 5000;
export const CONTENT_WORD_WARNING_V314 = 4500;

let frame = 0;
let timer = 0;

function countWords(editor) {
  const text = String(editor?.innerText || editor?.textContent || "").replace(/\u00a0/g, " ").trim();
  return text ? text.split(/\s+/u).filter(Boolean).length : 0;
}

function editorApp(node = document) {
  return node?.closest?.(".ce-app") || node?.querySelector?.(".ce-app") || document.querySelector(".ce-app");
}

function ensureNotice(app) {
  if (!app) return null;
  let notice = app.querySelector(".ce-word-limit-v314");
  if (notice) return notice;
  const status = app.querySelector(".ce-word-status");
  if (!status) return null;
  notice = document.createElement("div");
  notice.className = "ce-word-limit-v314";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  status.insertAdjacentElement("afterend", notice);
  return notice;
}

export function syncContentWordLimitV314(root = document) {
  const app = editorApp(root);
  const editor = app?.querySelector(".ce-paper[contenteditable]");
  if (!app || !editor) return { words: 0, over: false, warning: false };
  const words = countWords(editor);
  const remaining = CONTENT_WORD_LIMIT_V314 - words;
  const warning = words >= CONTENT_WORD_WARNING_V314;
  const over = words > CONTENT_WORD_LIMIT_V314;
  app.dataset.contentWordsV314 = String(words);
  app.dataset.contentWordLimitV314 = String(CONTENT_WORD_LIMIT_V314);
  app.dataset.contentWordStateV314 = over ? "blocked" : warning ? "warning" : "ok";
  const notice = ensureNotice(app);
  if (notice) {
    notice.dataset.state = over ? "blocked" : warning ? "warning" : "ok";
    if (over) notice.innerHTML = `<strong>${words.toLocaleString("id-ID")} / ${CONTENT_WORD_LIMIT_V314.toLocaleString("id-ID")} kata.</strong> Kurangi ${Math.abs(remaining).toLocaleString("id-ID")} kata sebelum diterbitkan. Draf tetap aman dan tidak dipotong.`;
    else if (warning) notice.innerHTML = `<strong>${words.toLocaleString("id-ID")} / ${CONTENT_WORD_LIMIT_V314.toLocaleString("id-ID")} kata.</strong> Tersisa ${remaining.toLocaleString("id-ID")} kata sebelum batas publikasi.`;
    else notice.innerHTML = `<strong>${words.toLocaleString("id-ID")} / ${CONTENT_WORD_LIMIT_V314.toLocaleString("id-ID")} kata.</strong> Draf tersimpan penuh; batas hanya menahan publikasi.`;
  }
  return { words, over, warning };
}

function scheduleSync(root = document) {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    frame = 0;
    syncContentWordLimitV314(root);
  });
  if (timer) clearTimeout(timer);
  timer = window.setTimeout(() => syncContentWordLimitV314(root), 90);
}

function blockPublish(event, app) {
  const state = syncContentWordLimitV314(app || document);
  if (!state.over) return false;
  event.preventDefault();
  event.stopPropagation();
  const editor = app?.querySelector(".ce-paper[contenteditable]");
  editor?.focus({ preventScroll: true });
  app?.querySelector(".ce-word-limit-v314")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  return true;
}

function onClick(event) {
  const button = event.target?.closest?.(".ce-app .ce-actions .ce-primary");
  if (button) {
    const label = String(button.textContent || "").trim().toLowerCase();
    if (!label.includes("jadikan draf") && blockPublish(event, button.closest(".ce-app"))) return;
  }
  scheduleSync(event.target || document);
}

function onChange(event) {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement) || !select.closest(".ce-app")) return;
  const isStatus = Boolean(select.querySelector('option[value="published"]'));
  if (isStatus && select.value === "published") {
    const app = select.closest(".ce-app");
    const state = syncContentWordLimitV314(app);
    if (state.over) {
      event.preventDefault();
      event.stopPropagation();
      select.value = "draft";
      app.querySelector(".ce-word-limit-v314")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
  }
  scheduleSync(select);
}

function onInput(event) {
  if (event.target?.closest?.(".ce-app")) scheduleSync(event.target);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.documentElement.dataset.studioContentEditorFinalV314 = STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V314;
  document.addEventListener("click", onClick, true);
  document.addEventListener("change", onChange, true);
  document.addEventListener("input", onInput, false);
  window.addEventListener("pageshow", () => scheduleSync(document), { passive: true });
  window.addEventListener("popstate", () => scheduleSync(document), { passive: true });
  window.addEventListener("hashchange", () => scheduleSync(document), { passive: true });
  scheduleSync(document);
}
