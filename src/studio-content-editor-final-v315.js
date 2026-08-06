import "./studio-content-editor-final-v315.css";

export const STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V315 = "studio-content-editor-final-v315-20260806";
export const CONTENT_WORD_LIMIT_V315 = 5000;
export const CONTENT_WORD_WARNING_V315 = 4500;

let frame = 0;

function countWords(editor) {
  const text = String(editor?.innerText || editor?.textContent || "").replace(/\u00a0/g, " ").trim();
  return text ? text.split(/\s+/u).filter(Boolean).length : 0;
}

function ensureNotice(app) {
  let notice = app.querySelector(".ce-word-limit-v315");
  if (notice) return notice;
  const status = app.querySelector(".ce-word-status");
  if (!status) return null;
  notice = document.createElement("div");
  notice.className = "ce-word-limit-v315";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  status.insertAdjacentElement("afterend", notice);
  return notice;
}

export function syncContentWordLimitV315(root = document) {
  const app = root?.closest?.(".ce-app") || root?.querySelector?.(".ce-app") || document.querySelector(".ce-app");
  const editor = app?.querySelector(".ce-paper[contenteditable]");
  if (!app || !editor) return { words: 0, over: false, warning: false };
  const words = countWords(editor);
  const remaining = CONTENT_WORD_LIMIT_V315 - words;
  const warning = words >= CONTENT_WORD_WARNING_V315;
  const over = words > CONTENT_WORD_LIMIT_V315;
  app.dataset.contentWordsV315 = String(words);
  app.dataset.contentWordStateV315 = over ? "blocked" : warning ? "warning" : "ok";
  const notice = ensureNotice(app);
  if (notice) {
    notice.dataset.state = over ? "blocked" : warning ? "warning" : "ok";
    if (over) notice.innerHTML = `<strong>${words.toLocaleString("id-ID")} / 5.000 kata.</strong> Kurangi ${Math.abs(remaining).toLocaleString("id-ID")} kata sebelum diterbitkan. Draf tetap aman dan tidak dipotong.`;
    else if (warning) notice.innerHTML = `<strong>${words.toLocaleString("id-ID")} / 5.000 kata.</strong> Tersisa ${remaining.toLocaleString("id-ID")} kata sebelum batas publikasi.`;
    else notice.innerHTML = `<strong>${words.toLocaleString("id-ID")} / 5.000 kata.</strong> Draf tersimpan penuh; batas hanya menahan publikasi.`;
  }
  const publishButton = app.querySelector(".ce-actions .ce-primary");
  if (publishButton && !String(publishButton.textContent || "").toLowerCase().includes("jadikan draf")) {
    publishButton.disabled = over;
    publishButton.setAttribute("aria-disabled", over ? "true" : "false");
    publishButton.title = over ? `Kurangi ${Math.abs(remaining).toLocaleString("id-ID")} kata sebelum diterbitkan.` : "";
  }
  const statusSelect = [...app.querySelectorAll("select")].find((select) => select.querySelector('option[value="published"]'));
  const publishedOption = statusSelect?.querySelector('option[value="published"]');
  if (publishedOption) publishedOption.disabled = over && statusSelect.value !== "published";
  return { words, over, warning };
}

function schedule(root = document) {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    frame = 0;
    syncContentWordLimitV315(root);
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.documentElement.dataset.studioContentEditorFinalV315 = STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V315;
  document.addEventListener("input", (event) => { if (event.target?.closest?.(".ce-app")) schedule(event.target); });
  document.addEventListener("change", (event) => { if (event.target?.closest?.(".ce-app")) schedule(event.target); });
  window.addEventListener("pageshow", () => schedule(document), { passive: true });
  window.addEventListener("popstate", () => schedule(document), { passive: true });
  window.addEventListener("hashchange", () => schedule(document), { passive: true });
  schedule(document);
}
