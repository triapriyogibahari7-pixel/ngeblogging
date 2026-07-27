const RELEASE = "studio-domain-backup-v35-20260725";
const DOMAIN_OWNER = "domain-manager-v78-20260727";
const BACKUP_SELECTOR = "#ngeblogging-backup-center";
let frame = 0;

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
  document.documentElement.dataset.domainLayoutOwner = DOMAIN_OWNER;
  // Halaman Domain tidak lagi diubah oleh runtime v35. Domain Manager v78 memiliki satu root terisolasi.
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
