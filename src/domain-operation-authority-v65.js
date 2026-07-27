const RELEASE = "domain-operation-authority-v65-20260727";
const POLL_LIMIT = 8;
const pollState = new WeakMap();
let frame = 0;
let lastDiagnostic = window.__ngebloggingLastDomainDiagnostic || null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeHostname(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

function root() {
  return document.querySelector(".dfz-root");
}

function connectedDomain() {
  const state = root()?.querySelector(".dfz-root-state");
  if (!state) return null;
  return {
    state,
    hostname: normalizeHostname(state.querySelector(".dfz-hostname-row strong")?.textContent),
    status: state.querySelector(".dfz-status")?.textContent?.trim().toLowerCase() || "",
    nameservers: [...state.querySelectorAll(".dfz-nameservers code")]
      .map((node) => node.textContent?.trim())
      .filter(Boolean),
  };
}

function busy() {
  return Boolean(root()?.querySelector(".dfz-spinner"));
}

function notice() {
  return root()?.querySelector("[data-domain-v60-operation-error]");
}

function diagnosticMessage(data) {
  const status = Number(data?.status || 0);
  const code = String(data?.code || "DOMAIN_REQUEST_FAILED");
  const requestId = String(data?.requestId || "");
  const error = String(data?.error || "Permintaan domain belum selesai.");
  const title = status === 401
    ? "Sesi domain perlu diperbarui"
    : status === 403
      ? "Izin domain ditolak"
      : status === 409
        ? "Domain memiliki konflik"
        : status === 429
          ? "Permintaan domain dibatasi sementara"
          : "Pemasangan domain belum selesai";

  return {
    title,
    error,
    detail: `${code}${requestId ? ` · ID ${requestId}` : ""}`,
  };
}

function repairNotice() {
  const node = notice();
  if (!node) return;
  const text = node.textContent || "";

  /*
   * Begitu server mengembalikan baris domain (verifying maupun active),
   * banner kegagalan lama tidak lagi mencerminkan keadaan otoritatif.
   */
  if (connectedDomain()?.hostname && !node.dataset.domainV65Diagnostic) {
    node.remove();
    lastDiagnostic = null;
    window.__ngebloggingLastDomainDiagnostic = null;
    return;
  }

  if (!/Permintaan domain belum berhasil|Permintaan domain tidak selesai/i.test(text)) return;

  const data = lastDiagnostic || window.__ngebloggingLastDomainDiagnostic;
  if (!data) return;
  const message = diagnosticMessage(data);
  const icon = node.querySelector(":scope > svg")?.outerHTML || "";
  const button = node.querySelector("button")?.outerHTML || '<button type="button" data-domain-v60-dismiss>Tutup</button>';
  node.innerHTML = `${icon}<div><b>${escapeHtml(message.title)}</b><p>${escapeHtml(message.error)}</p><small>${escapeHtml(message.detail)}</small></div>${button}`;
  node.dataset.domainV65Diagnostic = RELEASE;
}

function freeCard() {
  return root()?.querySelector(".dfz-free-card");
}

function syncCanonicalExperience() {
  const domain = connectedDomain();
  const card = freeCard();
  if (!card) return;

  const active = Boolean(domain?.hostname && domain.status.includes("aktif"));
  const eyebrow = card.querySelector("small");
  const description = card.querySelector("p");
  const preview = root()?.querySelector(".dfz-title > a");

  if (active) {
    if (eyebrow) eyebrow.textContent = "ALAMAT CADANGAN";
    if (description) description.textContent = "Alamat gratis tetap tersedia sebagai cadangan dan otomatis mengarahkan pengunjung ke domain utama Anda.";
    if (preview) {
      preview.href = `https://${domain.hostname}`;
      preview.lastChild && (preview.lastChild.textContent = "Buka domain utama");
      preview.setAttribute("aria-label", `Buka ${domain.hostname}`);
    }
    card.dataset.canonicalDomain = domain.hostname;
  } else {
    card.removeAttribute("data-canonical-domain");
  }
}

function shouldPoll(domain) {
  if (!domain?.state || busy()) return false;
  if (domain.status.includes("aktif") || domain.status.includes("gagal") || domain.status.includes("hapus")) return false;
  return domain.nameservers.length < 2 || domain.status.includes("verifikasi") || domain.status.includes("propagasi");
}

function schedulePoll() {
  const domain = connectedDomain();
  if (!shouldPoll(domain)) return;

  const current = pollState.get(domain.state) || { count: 0, timer: 0 };
  if (current.timer || current.count >= POLL_LIMIT) return;

  const delay = Math.min(3500 + current.count * 2000, 15000);
  current.timer = window.setTimeout(() => {
    current.timer = 0;
    if (!domain.state.isConnected || busy()) return;
    const button = domain.state.querySelector('[data-action="refresh-root"]');
    if (!button || button.disabled) return;
    current.count += 1;
    pollState.set(domain.state, current);
    button.click();
  }, delay);
  pollState.set(domain.state, current);
}

function reconcile() {
  repairNotice();
  syncCanonicalExperience();
  schedulePoll();
  document.documentElement.dataset.domainOperationAuthorityV65 = RELEASE;
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(reconcile);
}

window.addEventListener("ngeblogging:domain-api-diagnostic", (event) => {
  lastDiagnostic = event.detail || null;
  schedule();
});

window.addEventListener("ngeblogging:api-failover", schedule);
window.addEventListener("pageshow", schedule);
window.addEventListener("online", schedule);

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "characterData")) schedule();
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});

reconcile();
