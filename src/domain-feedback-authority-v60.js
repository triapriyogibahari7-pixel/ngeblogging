const RELEASE = "domain-feedback-authority-v60-20260727";
const FAILURE_PATTERN = /(belum berhasil|gagal|belum dapat|tidak dapat|tidak valid|belum lengkap|tidak ditemukan|ditolak|error|gangguan|tidak tersedia|belum terpasang)/i;

function alertIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>';
}

function infoIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
}

function classifyToast(node) {
  if (!(node instanceof HTMLElement) || !node.matches(".dfz-toast")) return;
  const text = node.textContent?.trim() || "";
  const danger = FAILURE_PATTERN.test(text);
  node.classList.toggle("danger", danger);
  node.classList.toggle("success", !danger);
  const svg = node.querySelector("svg");
  if (danger && svg) svg.outerHTML = alertIcon();
  node.setAttribute("role", danger ? "alert" : "status");
  node.setAttribute("aria-live", danger ? "assertive" : "polite");

  if (!danger) return;
  const root = document.querySelector(".dfz-root");
  if (!root) return;
  let notice = root.querySelector("[data-domain-v60-operation-error]");
  if (!notice) {
    notice = document.createElement("section");
    notice.className = "d60-operation-error";
    notice.dataset.domainV60OperationError = "true";
    const grid = root.querySelector(".dfz-grid");
    grid?.insertAdjacentElement("beforebegin", notice);
  }
  notice.innerHTML = `${infoIcon()}<div><b>Permintaan domain tidak selesai</b><p>${node.querySelector("span")?.innerHTML || text}</p><small>Sistem tidak akan menampilkan tanda berhasil sebelum server benar-benar mengonfirmasi perubahan.</small></div><button type="button" data-domain-v60-dismiss>Tutup</button>`;
}

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const added of mutation.addedNodes) {
      if (!(added instanceof HTMLElement)) continue;
      if (added.matches(".dfz-toast")) classifyToast(added);
      added.querySelectorAll?.(".dfz-toast").forEach(classifyToast);
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-domain-v60-dismiss]")) {
    document.querySelector("[data-domain-v60-operation-error]")?.remove();
  }
});

window.addEventListener("ngeblogging:api-failover", () => {
  document.documentElement.dataset.domainApiFailoverUsed = "true";
});

document.documentElement.dataset.domainFeedbackAuthorityV60 = RELEASE;
