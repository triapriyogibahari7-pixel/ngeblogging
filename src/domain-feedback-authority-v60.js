const RELEASE = "domain-feedback-authority-v60-20260727";
const REVERSIBLE_DETACH_RELEASE = "domain-feedback-reversible-detach-v64-20260727";
const FAILURE_PATTERN = /(belum berhasil|gagal|belum dapat|tidak dapat|tidak valid|belum lengkap|tidak ditemukan|ditolak|error|gangguan|tidak tersedia|belum terpasang)/i;

function alertIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>';
}

function infoIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
}

function operationNotice() {
  return document.querySelector("[data-domain-v60-operation-error]");
}

function clearConfirmedFailure() {
  operationNotice()?.remove();
}

function rewriteLegacyDetachMessage(node) {
  const span = node.querySelector("span");
  const text = span?.textContent || node.textContent || "";
  if (!/ganti nameserver sebelum konfirmasi final/i.test(text)) return;
  if (span) {
    span.textContent = "Domain dilepaskan dari situs. Zone Cloudflare dan nameserver tetap tersimpan sehingga domain dapat dipasang kembali kapan saja.";
  }
}

function repairDetachButtons(root = document) {
  root.querySelectorAll?.('button[data-action="remove-root"]').forEach((button) => {
    const text = button.textContent?.trim() || "";
    if (!/^Lepaskan domain$/i.test(text)) return;
    const svg = button.querySelector("svg")?.outerHTML || "";
    button.innerHTML = `${svg}Lepaskan dari situs`;
    button.dataset.reversibleDetach = REVERSIBLE_DETACH_RELEASE;
    button.title = "Lepaskan domain dari situs tanpa menghapus zone Cloudflare, agar dapat dipasang kembali kapan saja.";
    button.setAttribute("aria-label", "Lepaskan domain dari situs dan simpan konfigurasi agar dapat dipasang kembali");
  });
}

function confirmedDomainState(node) {
  return Boolean(
    node.matches?.(".dfz-root-state")
    || node.querySelector?.(".dfz-root-state"),
  );
}

function classifyToast(node) {
  if (!(node instanceof HTMLElement) || !node.matches(".dfz-toast")) return;
  rewriteLegacyDetachMessage(node);
  const text = node.textContent?.trim() || "";
  const danger = FAILURE_PATTERN.test(text);
  node.classList.toggle("danger", danger);
  node.classList.toggle("success", !danger);
  const svg = node.querySelector("svg");
  if (danger && svg) svg.outerHTML = alertIcon();
  node.setAttribute("role", danger ? "alert" : "status");
  node.setAttribute("aria-live", danger ? "assertive" : "polite");

  if (!danger) {
    clearConfirmedFailure();
    repairDetachButtons();
    return;
  }

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
      if (confirmedDomainState(added)) clearConfirmedFailure();
      if (added.matches(".dfz-toast")) classifyToast(added);
      added.querySelectorAll?.(".dfz-toast").forEach(classifyToast);
      repairDetachButtons(added);
    }
  }
  repairDetachButtons();
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-domain-v60-dismiss]")) {
    clearConfirmedFailure();
  }
});

window.addEventListener("ngeblogging:api-failover", () => {
  document.documentElement.dataset.domainApiFailoverUsed = "true";
});

repairDetachButtons();
document.documentElement.dataset.domainFeedbackAuthorityV60 = RELEASE;
document.documentElement.dataset.reversibleDomainDetachV64 = REVERSIBLE_DETACH_RELEASE;
