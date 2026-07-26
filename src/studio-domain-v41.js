const RELEASE = "studio-domain-v41-20260726";
let frame = 0;
let healthCache = null;
let healthAt = 0;

function domainView() {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")]
    .find((view) => view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === "Domain & publikasi") || null;
}

async function health(force = false) {
  if (!force && healthCache && Date.now() - healthAt < 10_000) return healthCache;
  healthCache = await fetch("/api/health", { cache: "no-store", headers: { accept: "application/json", "cache-control": "no-cache" } })
    .then((response) => response.ok ? response.json() : {})
    .catch(() => ({}));
  healthAt = Date.now();
  return healthCache;
}

function readinessRows(state) {
  const bindings = state.customDomainBindings || {};
  return [
    ["Token Cloudflare", bindings.apiToken],
    ["Zone ngeblogging.com", bindings.zoneId],
    ["Target CNAME resmi", bindings.cnameTarget],
    ["Penyimpanan JWT + RLS", bindings.databaseAccess],
  ].map(([label, ready]) => `<li data-ready="${ready === true}">${ready === true ? "✓" : "○"} ${label}</li>`).join("");
}

async function repair() {
  document.documentElement.dataset.studioDomainV41 = RELEASE;
  const view = domainView();
  if (!view || view.dataset.domainV41Loading === "true") return;
  const panel = view.querySelector(".sp37-domain-readiness");
  if (!panel) return;
  view.dataset.domainV41Loading = "true";
  try {
    const state = await health();
    if (!view.isConnected) return;
    if (state.customDomains === true) {
      panel.remove();
      delete view.dataset.sp37Domain;
      const pulse = document.createElement("span");
      pulse.hidden = true;
      view.append(pulse);
      pulse.remove();
      return;
    }
    const heading = panel.querySelector("h2");
    const copy = panel.querySelector("p");
    const list = panel.querySelector("ul");
    if (heading) heading.textContent = "Custom domain menunggu koneksi Cloudflare";
    if (copy) copy.textContent = "Sistem domain, dua catatan DNS utama, dan validasi HTTPS sudah tersedia. Data domain disimpan memakai sesi pengguna dan Row Level Security; service-role server tidak diperlukan.";
    if (list) list.innerHTML = readinessRows(state);
  } finally {
    delete view.dataset.domainV41Loading;
  }
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(repair);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

repair();
