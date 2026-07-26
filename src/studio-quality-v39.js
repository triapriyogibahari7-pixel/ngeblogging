const RELEASE = "studio-quality-v39-20260726";
let frame = 0;
const retries = new WeakMap();

function pageView(title) {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")]
    .find((view) => view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === title) || null;
}

function pulse(view) {
  const node = document.createElement("span");
  node.hidden = true;
  node.dataset.sp39Pulse = "true";
  view.append(node);
  node.remove();
}

function retryEnhancement(view, datasetKey, reason) {
  const count = retries.get(view) || 0;
  if (count >= 3 || view.dataset.sp39Retrying === "true") return;
  retries.set(view, count + 1);
  view.dataset.sp39Retrying = "true";
  window.setTimeout(() => {
    delete view.dataset[datasetKey];
    delete view.dataset.sp39Retrying;
    view.dataset.sp39LastRetry = reason;
    pulse(view);
  }, 450 + count * 650);
}

function repairAnalytics() {
  const view = pageView("Analitik");
  if (!view) return;
  const host = view.querySelector(".sp37-analytics-host");
  const error = host?.querySelector(".sp37-error");
  if (error && /belum tersedia|function|schema cache|permission|akses analitik/i.test(error.textContent || "")) {
    retryEnhancement(view, "sp37Analytics", "analytics-rpc");
  }
}

function repairMembers() {
  const view = pageView("Anggota & tim");
  if (!view) return;
  const legacy = view.querySelector(".sn-members");
  if (view.dataset.sp37Members === "true" && legacy && !legacy.classList.contains("sp37-members-host")) {
    retryEnhancement(view, "sp37Members", "members-hydration");
  }
}

function openSiteManager(mode = "switch") {
  document.querySelector(".sn-workspace")?.click();
  if (mode !== "create") return;
  let attempts = 0;
  const focus = () => {
    const input = document.querySelector(".sn-site-manager .sn-create-site input");
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior:"smooth", block:"center" });
      return;
    }
    if (attempts++ < 20) window.setTimeout(focus, 75);
  };
  focus();
}

function ensureHomeActions() {
  const welcome = document.querySelector(".sn-main > .sn-view-pad > .sn-welcome");
  if (!welcome) return;
  const card = welcome.parentElement?.querySelector(":scope > .sp37-active-site");
  if (!card || card.classList.contains("sp52-site-switcher")) return;
  let actions = card.querySelector(".sp39-site-actions");
  if (!actions) {
    const existing = card.querySelector(":scope > button");
    actions = document.createElement("div");
    actions.className = "sp39-site-actions";
    const switchButton = existing || document.createElement("button");
    switchButton.type = "button";
    switchButton.textContent = "Beralih situs";
    switchButton.onclick = () => openSiteManager("switch");
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "primary";
    addButton.textContent = "Tambah situs";
    addButton.onclick = () => openSiteManager("create");
    actions.append(switchButton, addButton);
    card.append(actions);
  }

  const welcomeActions = welcome.querySelector(":scope > div:last-child");
  if (welcomeActions && !welcomeActions.querySelector("[data-sp39-add-site]")) {
    const add = document.createElement("button");
    add.type = "button";
    add.dataset.sp39AddSite = "true";
    add.textContent = "Tambah situs";
    add.addEventListener("click", () => openSiteManager("create"));
    welcomeActions.prepend(add);
  }
}

function updateWidgetLabels() {
  document.querySelectorAll(".tn-hero-actions button, .tn-command button").forEach((button) => {
    if (/^\s*25\s*widget\s*$/i.test(button.textContent || "")) {
      const text = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      if (text) text.textContent = " 26 Widget";
      else button.append(" 26 Widget");
    }
  });
  document.querySelectorAll(".tn-audit-strip article").forEach((article) => {
    if (/Widget bawaan/i.test(article.textContent || "")) article.querySelector("b") && (article.querySelector("b").textContent = "26");
  });
}

async function annotateDomainReadiness() {
  const view = pageView("Domain & publikasi");
  if (!view || view.dataset.sp39DomainReadiness === "true") return;
  const panel = view.querySelector(".sp37-domain-readiness");
  if (!panel) return;
  view.dataset.sp39DomainReadiness = "true";
  try {
    const response = await fetch("/api/health", { cache:"no-store", headers:{ accept:"application/json", "cache-control":"no-cache" } });
    const state = response.ok ? await response.json() : {};
    const bindings = state.customDomainBindings || {};
    const map = {
      CLOUDFLARE_API_TOKEN: bindings.apiToken,
      CLOUDFLARE_ZONE_ID: bindings.zoneId,
      CLOUDFLARE_CUSTOM_HOSTNAME_TARGET: bindings.cnameTarget,
      SUPABASE_SERVICE_ROLE_KEY: bindings.serviceRole,
    };
    panel.querySelectorAll("li").forEach((item) => {
      const key = item.textContent.trim();
      if (!(key in map)) return;
      item.dataset.ready = String(map[key] === true);
      item.textContent = `${map[key] === true ? "✓" : "○"} ${key}`;
    });
  } catch {
    delete view.dataset.sp39DomainReadiness;
  }
}

function scan() {
  document.documentElement.dataset.studioQualityV39 = RELEASE;
  ensureHomeActions();
  updateWidgetLabels();
  repairAnalytics();
  repairMembers();
  annotateDomainReadiness();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "characterData")) schedule();
}).observe(document.documentElement, { childList:true, subtree:true, characterData:true });

scan();