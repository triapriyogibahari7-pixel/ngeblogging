import { canPollNameservers, nextNameserverPoll, NAMESERVER_POLL_LIMIT } from './domain-nameserver-poll.mjs';
const RELEASE = "domain-operation-authority-v65-20260727";
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

function ensureFreeFallbackLink(card, freeHostname, active) {
  const actions = card.querySelector(".dfz-free-actions");
  if (!actions) return;

  let link = actions.querySelector("[data-domain-v65-free-preview]");
  if (!active || !freeHostname.endsWith(".ngeblogging.com")) {
    link?.remove();
    return;
  }

  if (!link) {
    link = document.createElement("a");
    link.dataset.domainV65FreePreview = RELEASE;
    link.className = "dfz-free-preview";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Buka alamat cadangan";
    actions.append(link);
  }

  link.href = `https://${freeHostname}/?ngeblogging-free-preview=1`;
  link.setAttribute("aria-label", `Buka ${freeHostname} tanpa dialihkan`);
}

function syncCanonicalExperience() {
  const domain = connectedDomain();
  const card = freeCard();
  if (!card) return;

  const active = Boolean(domain?.hostname && domain.status.includes("aktif"));
  const freeHostname = normalizeHostname(card.querySelector("h2")?.textContent);
  const eyebrow = card.querySelector("small");
  const description = card.querySelector("p");
  const preview = root()?.querySelector(".dfz-title > a");

  ensureFreeFallbackLink(card, freeHostname, active);

  if (active) {
    if (eyebrow) eyebrow.textContent = "ALAMAT CADANGAN";
    if (description) description.textContent = "Alamat gratis tetap tersedia sebagai cadangan. Secara normal pengunjung otomatis dialihkan ke domain utama Anda.";
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

function pendingNameserverNotice() {
  const panel = root(), domain = connectedDomain();
  const existing = panel?.querySelector('[data-nameservers-pending]');
  if (!domain?.state || !canPollNameservers(domain)) { existing?.remove(); return; }
  let node = existing;
  if (!node) {
    node = document.createElement('p');
    node.className = 'dfz-inline-warning';
    node.dataset.nameserversPending = 'true';
    node.setAttribute('role','status');
    domain.state.querySelector('.dfz-actions')?.before(node);
  }
  const attempts = pollState.get(panel)?.get(domain.hostname)?.count || 0;
  const message = attempts >= NAMESERVER_POLL_LIMIT
    ? 'Nameserver belum tersedia setelah pemeriksaan otomatis. Tekan Periksa koneksi untuk mencoba kembali; jangan mengganti nameserver di registrar sebelum nilai asli domain ini tampil.'
    : 'Nameserver domain ini belum tersedia. Pemeriksaan otomatis berjalan terbatas. Gunakan hanya nameserver yang ditampilkan untuk domain ini, bukan nameserver domain Ngeblogging atau nama bermerek yang belum aktif.';
  if (node.textContent !== message) node.textContent = message;
}

function schedulePoll() {
  const panel = root(), domain = connectedDomain();
  if (!panel || !canPollNameservers(domain, busy())) return;
  let domains = pollState.get(panel);
  if (!domains) { domains = new Map(); pollState.set(panel, domains); }
  const current = domains.get(domain.hostname) || { count: 0, timer: 0 };
  domains.set(domain.hostname, current);
  const next = nextNameserverPoll(current.count);
  if (current.timer || !next) return;
  current.timer = window.setTimeout(() => {
    current.timer = 0;
    if (!panel.isConnected || root() !== panel) return;
    const fresh = connectedDomain();
    if (fresh?.hostname !== domain.hostname || !canPollNameservers(fresh, busy())) return;
    const button = fresh.state.querySelector('[data-action="refresh-root"]');
    if (!button || button.disabled) return;
    current.count = next.count;
    button.click();
  }, next.delay);
}

function reconcile() {
  repairNotice();
  syncCanonicalExperience();
  schedulePoll();
  pendingNameserverNotice();
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
