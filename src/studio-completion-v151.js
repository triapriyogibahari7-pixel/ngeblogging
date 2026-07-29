const RELEASE = "studio-completion-v151-20260729";
const MAX_EDITOR_WORDS = 5000;
const WARNING_EDITOR_WORDS = 4500;
let scheduledFrame = 0;

function countWords(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .length;
}

function enhanceContentEditor() {
  const app = document.querySelector(".ce-app");
  const paper = app?.querySelector(".ce-paper");
  const status = app?.querySelector(".ce-word-status");
  if (!app || !paper || !status) return;

  const words = countWords(paper.textContent);
  const warning = words >= WARNING_EDITOR_WORDS && words <= MAX_EDITOR_WORDS;
  const over = words > MAX_EDITOR_WORDS;
  app.dataset.editorRelease = RELEASE;
  app.dataset.wordCount = String(words);
  app.dataset.wordLimitState = over ? "over" : warning ? "warning" : "normal";
  paper.setAttribute("aria-describedby", "ce-word-limit-v151");

  let badge = status.querySelector(":scope > .ce-word-limit-v151");
  if (!badge) {
    badge = document.createElement("span");
    badge.id = "ce-word-limit-v151";
    badge.className = "ce-word-limit-v151";
    status.append(badge);
  }
  badge.classList.toggle("warning", warning);
  badge.classList.toggle("over", over);
  badge.textContent = `${words.toLocaleString("id-ID")} / ${MAX_EDITOR_WORDS.toLocaleString("id-ID")} kata`;
  badge.title = over
    ? `Tulisan melewati batas ${MAX_EDITOR_WORDS.toLocaleString("id-ID")} kata. Kurangi isi sebelum menerbitkan.`
    : warning
      ? `Mendekati batas ${MAX_EDITOR_WORDS.toLocaleString("id-ID")} kata.`
      : `Batas sasaran editor ${MAX_EDITOR_WORDS.toLocaleString("id-ID")} kata.`;

  let notice = app.querySelector(":scope > .ce-word-limit-notice-v151");
  if (over) {
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "ce-word-limit-notice-v151";
      notice.setAttribute("role", "alert");
      const titlebar = app.querySelector(":scope > .ce-titlebar");
      titlebar?.insertAdjacentElement("afterend", notice);
    }
    notice.textContent = `Batas publikasi adalah ${MAX_EDITOR_WORDS.toLocaleString("id-ID")} kata. Tulisan tidak dipotong; kurangi ${Math.max(0, words - MAX_EDITOR_WORDS).toLocaleString("id-ID")} kata sebelum menerbitkan.`;
  } else {
    notice?.remove();
  }

  const publishButton = app.querySelector(".ce-actions .ce-primary");
  if (publishButton) {
    const publishingAction = /terbitkan|publish|terjadwal/i.test(publishButton.textContent || "");
    if (over && publishingAction) {
      publishButton.disabled = true;
      publishButton.dataset.wordLimitDisabledV151 = "true";
      publishButton.setAttribute("aria-disabled", "true");
      publishButton.title = `Kurangi tulisan menjadi maksimal ${MAX_EDITOR_WORDS.toLocaleString("id-ID")} kata sebelum menerbitkan.`;
    } else if (publishButton.dataset.wordLimitDisabledV151 === "true") {
      publishButton.disabled = false;
      delete publishButton.dataset.wordLimitDisabledV151;
      publishButton.removeAttribute("aria-disabled");
      publishButton.removeAttribute("title");
    }
  }

  if (!paper.dataset.wordLimitBoundV151) {
    paper.dataset.wordLimitBoundV151 = RELEASE;
    paper.addEventListener("input", scheduleCompletion, { passive: true });
    paper.addEventListener("paste", scheduleCompletion, { passive: true });
  }
}

function protectStudioGeometry() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;
  shell.dataset.completionRelease = RELEASE;
  shell.querySelectorAll(".sn-main > *, .sn-view-pad > *, .sv124-page > *, .tn-studio > *").forEach((node) => {
    node.style.setProperty("min-width", "0");
    node.style.setProperty("max-width", "100%");
  });
}

function enhanceCompletion() {
  scheduledFrame = 0;
  enhanceContentEditor();
  protectStudioGeometry();
  document.documentElement.dataset.studioCompletionV151 = RELEASE;
}

function scheduleCompletion() {
  if (scheduledFrame) return;
  scheduledFrame = requestAnimationFrame(enhanceCompletion);
}

new MutationObserver(scheduleCompletion).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["class", "data-studio-responsive-mode", "data-studio-device-variant"],
});
window.addEventListener("resize", scheduleCompletion, { passive: true });
window.addEventListener("orientationchange", scheduleCompletion, { passive: true });
window.addEventListener("pageshow", scheduleCompletion, { passive: true });

scheduleCompletion();

export { RELEASE, MAX_EDITOR_WORDS, countWords, enhanceCompletion };
