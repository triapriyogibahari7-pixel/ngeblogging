let resolved = false;
let emailRegistrationReady = false;

document.documentElement.dataset.emailRegistration = "pending";

function text(node) {
  return node?.textContent?.replace(/\s+/g, " ").trim() || "";
}

function ensureNotice(modal) {
  if (modal.querySelector(".auth-readiness-notice")) return;
  const intro = modal.querySelector(".auth-intro");
  if (!intro) return;
  const notice = document.createElement("div");
  notice.className = "auth-readiness-notice";
  notice.setAttribute("role", "status");
  notice.innerHTML = "<b>Email resmi sedang dikunci</b><span>Pendaftaran, magic link, verifikasi, dan pemulihan email disembunyikan sampai pengirim <code>@ngeblogging.com</code>, SPF, DKIM, DMARC, dan SMTP produksi lolos uji. Akun baru tetap dapat dibuat melalui Google, GitHub, atau LinkedIn.</span>";
  intro.insertAdjacentElement("afterend", notice);
}

function hideEmailSendingActions(modal) {
  modal.querySelectorAll(".magic-link-button,.forgot-link").forEach((button) => {
    button.hidden = true;
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
  });

  modal.querySelectorAll(".auth-switch").forEach((row) => {
    if (text(row).includes("Belum punya akun")) row.hidden = true;
  });
}

function leaveSignupMode(modal) {
  const heading = modal.querySelector("h2");
  if (text(heading) !== "Buat akun Ngeblogging" || modal.dataset.emailRedirected === "true") return;
  const signinButton = [...modal.querySelectorAll(".auth-switch button")].find((button) => text(button) === "Masuk");
  if (!signinButton) return;
  modal.dataset.emailRedirected = "true";
  signinButton.click();
}

function apply(modal) {
  if (!resolved) return;
  modal.dataset.emailRegistration = String(emailRegistrationReady);
  if (emailRegistrationReady) return;
  leaveSignupMode(modal);
  hideEmailSendingActions(modal);
  ensureNotice(modal);
}

function scan() {
  document.querySelectorAll(".auth-modal").forEach(apply);
}

async function resolveReadiness() {
  try {
    const response = await fetch("/api/health", { cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Health endpoint unavailable");
    const health = await response.json().catch(() => ({}));
    emailRegistrationReady = health.emailRegistration === true;
  } catch {
    emailRegistrationReady = false;
  } finally {
    resolved = true;
    document.documentElement.dataset.emailRegistration = String(emailRegistrationReady);
    scan();
  }
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
resolveReadiness();
