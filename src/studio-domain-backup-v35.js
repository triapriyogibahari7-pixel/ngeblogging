const RELEASE = "studio-domain-backup-v35-20260725";
const VIEW_SELECTOR = ".sn-main > .sn-view-pad";
const BACKUP_SELECTOR = "#ngeblogging-backup-center";
let frame = 0;

function normalizeDomain(view) {
  if (!(view instanceof Element)) return;
  const title = view.querySelector(":scope > .sn-page-title");
  const heading = title?.querySelector("h1");
  if (!title || !heading || heading.textContent.trim() !== "Domain & publikasi") return;

  view.classList.add("sn-domain-view-v35");
  title.classList.add("sn-domain-title-v35");

  const card = view.querySelector(":scope > .sn-domain-card");
  const action = title.querySelector(":scope > .sn-secondary-link, :scope > a, :scope > button");
  let row = view.querySelector(":scope > .sn-domain-preview-row-v35");

  if (!row) {
    row = document.createElement("div");
    row.className = "sn-domain-preview-row-v35";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Pratinjau situs publik");
    title.insertAdjacentElement("afterend", row);
  }

  if (action && action.parentElement !== row) row.append(action);
  if (card && row.nextElementSibling !== card) row.insertAdjacentElement("afterend", card);
  card?.classList.add("sn-domain-card-v35");
}

function normalizeBackup(section) {
  if (!(section instanceof Element)) return;
  section.dataset.backupFlowV35 = "true";
  section.querySelectorAll(".nb-backup-head, .nb-backup-grid, .nb-backup-card, .nb-backup-manifest")
    .forEach((node) => {
      node.style.removeProperty("top");
      node.style.removeProperty("left");
      node.style.removeProperty("right");
      node.style.removeProperty("bottom");
      node.style.removeProperty("transform");
    });
}

function scan() {
  document.documentElement.dataset.studioDomainBackupV35 = RELEASE;
  document.querySelectorAll(VIEW_SELECTOR).forEach(normalizeDomain);
  const backup = document.querySelector(BACKUP_SELECTOR);
  if (backup) normalizeBackup(backup);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.body, { childList: true, subtree: true });

document.addEventListener("popstate", schedule);
scan();
