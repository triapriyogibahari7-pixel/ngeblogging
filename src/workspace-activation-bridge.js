const ACTIVE_SITE_KEY = "ngeblogging-active-site-id";

function activeSiteId() {
  try {
    return localStorage.getItem(ACTIVE_SITE_KEY) || "";
  } catch {
    return "";
  }
}

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.classList.contains("workspace-create-site")) return;
  const previous = activeSiteId();
  let checks = 0;
  const timer = window.setInterval(() => {
    checks += 1;
    const next = activeSiteId();
    const message = form.querySelector('[role="status"]')?.textContent || "";
    if (next && next !== previous && /berhasil dibuat/i.test(message)) {
      window.clearInterval(timer);
      location.reload();
      return;
    }
    if (checks >= 80 || /belum dapat|sudah digunakan|tidak ditemukan/i.test(message)) {
      window.clearInterval(timer);
    }
  }, 125);
}, true);
