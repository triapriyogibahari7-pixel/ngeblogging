const RELEASE = "domain-feedback-authority-v60-20260727";
const REVERSIBLE_DETACH_RELEASE = "domain-feedback-reversible-detach-v64-20260727";
const STORAGE_KEY = "ngeblogging:last-reversible-domain-detach:v64";
const FAILURE_PATTERN = /(belum berhasil|gagal|belum dapat|tidak dapat|tidak valid|belum lengkap|tidak ditemukan|ditolak|error|gangguan|tidak tersedia|belum terpasang)/i;

function alertIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>';
}

function infoIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
}

function linkIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg>';
}

function operationNotice() {
  return document.querySelector("[data-domain-v60-operation-error]");
}

function clearConfirmedFailure() {
  operationNotice()?.remove();
}

function normalizeHostname(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

function currentFreeAddress() {
  return normalizeHostname(
    document.querySelector(".dfz-free-card h2")?.textContent
    || document.querySelector(".dfz-free-card strong")?.textContent
    || "",
  );
}

function currentConnectedHostname(button = null) {
  return normalizeHostname(
    button?.closest(".dfz-panel")?.querySelector(".dfz-hostname-row strong")?.textContent
    || document.querySelector(".dfz-hostname-row strong")?.textContent
    || "",
  );
}

function readDetachedDomain() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!value || !normalizeHostname(value.hostname)) return null;
    return {
      hostname: normalizeHostname(value.hostname),
      freeAddress: normalizeHostname(value.freeAddress),
      detachedAt: String(value.detachedAt || ""),
    };
  } catch {
    return null;
  }
}

function rememberDetachedDomain(hostname) {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      hostname: normalized,
      freeAddress: currentFreeAddress(),
      detachedAt: new Date().toISOString(),
    }));
  } catch {
    // Penyimpanan lokal tidak wajib; pelepasan server tetap berjalan.
  }
}

function forgetDetachedDomain(hostname = "") {
  const saved = readDetachedDomain();
  if (hostname && saved?.hostname !== normalizeHostname(hostname)) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Tidak ada tindakan tambahan.
  }
  document.querySelector("[data-domain-v64-reattach]")?.remove();
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
    if (!/^(Lepaskan domain|Lepaskan dari situs)$/i.test(text)) return;
    const svg = button.querySelector("svg")?.outerHTML || "";
    button.innerHTML = `${svg}Lepaskan dari situs`;
    button.dataset.reversibleDetach = REVERSIBLE_DETACH_RELEASE;
    button.title = "Lepaskan domain dari situs tanpa menghapus zone Cloudflare, agar dapat dipasang kembali kapan saja.";
    button.setAttribute("aria-label", "Lepaskan domain dari situs dan simpan konfigurasi agar dapat dipasang kembali");
  });
}

function reattachMarkup(saved) {
  const hostname = saved.hostname.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const freeAddress = (saved.freeAddress || currentFreeAddress() || "alamat-gratis.ngeblogging.com")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  return `
    <section class="d64-reattach" data-domain-v64-reattach>
      <span class="d64-reattach-icon">${linkIcon()}</span>
      <div class="d64-reattach-copy">
        <small>DOMAIN TERSIMPAN UNTUK DIPASANG KEMBALI</small>
        <b>${hostname}</b>
        <p>Zone Cloudflare dan nameserver tidak dihapus. Alamat gratis <strong>${freeAddress}</strong> tetap aktif sebagai alamat utama sementara.</p>
      </div>
      <button type="button" data-domain-v64-reattach-button data-hostname="${hostname}">Pasang kembali</button>
      <button type="button" class="d64-forget" data-domain-v64-forget>Lupakan</button>
    </section>
  `;
}

function ensureReattachCard() {
  const root = document.querySelector(".dfz-root");
  const form = root?.querySelector(".dfz-root-form");
  const connected = root?.querySelector(".dfz-root-state");
  const existing = root?.querySelector("[data-domain-v64-reattach]");

  if (!root || !form || connected) {
    existing?.remove();
    return;
  }

  const saved = readDetachedDomain();
  if (!saved) {
    existing?.remove();
    return;
  }

  if (!existing) form.insertAdjacentHTML("afterend", reattachMarkup(saved));
}

function submitReattach(hostname) {
  const form = document.querySelector(".dfz-root-form");
  const input = form?.querySelector('input[name="hostname"]');
  if (!form || !input) return;

  input.value = hostname;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  form.requestSubmit?.();
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
    if (/domain terhubung|domain aktif|berhasil dihubungkan/i.test(text)) {
      forgetDetachedDomain();
    }
    repairDetachButtons();
    queueMicrotask(ensureReattachCard);
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
  ensureReattachCard();
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("pointerdown", (event) => {
  const removeButton = event.target.closest('button[data-action="remove-root"]');
  if (removeButton) rememberDetachedDomain(currentConnectedHostname(removeButton));
}, true);

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-domain-v60-dismiss]")) clearConfirmedFailure();

  const reattach = event.target.closest("[data-domain-v64-reattach-button]");
  if (reattach) submitReattach(reattach.dataset.hostname || "");

  if (event.target.closest("[data-domain-v64-forget]")) forgetDetachedDomain();
});

window.addEventListener("ngeblogging:api-failover", () => {
  document.documentElement.dataset.domainApiFailoverUsed = "true";
});

repairDetachButtons();
ensureReattachCard();
document.documentElement.dataset.domainFeedbackAuthorityV60 = RELEASE;
document.documentElement.dataset.reversibleDomainDetachV64 = REVERSIBLE_DETACH_RELEASE;
