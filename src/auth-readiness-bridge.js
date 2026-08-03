import { supabaseConfigured } from "./lib/supabase.js";

export const AUTH_READINESS_RELEASE_V249 = "auth-readiness-nondestructive-v249-20260803";

let resolved = false;
let healthReachable = false;
let health = null;

document.documentElement.dataset.authReadinessV249 = AUTH_READINESS_RELEASE_V249;
document.documentElement.dataset.emailRegistration = "pending";
document.documentElement.dataset.authHealth = "pending";

function ensureStatus(modal) {
  modal.dataset.authReadinessV249 = AUTH_READINESS_RELEASE_V249;
  modal.dataset.authHealth = resolved ? (healthReachable ? "reachable" : "unreachable") : "pending";
  modal.dataset.emailRegistration = resolved && healthReachable
    ? String(health?.emailRegistration === true)
    : "unknown";

  // /api/health is diagnostic only. A timeout or temporary backend problem must
  // never hide Google, LinkedIn, email/password, magic link, signup, resend,
  // recovery, or password-reset controls. The real auth request is authoritative.
  modal.querySelectorAll(".auth-readiness-notice[data-v249-health]").forEach((node) => node.remove());

  if (!resolved || healthReachable || !supabaseConfigured) return;
  const anchor = modal.querySelector(".auth-divider") || modal.querySelector(".password-form");
  if (!anchor?.parentElement) return;
  const notice = document.createElement("p");
  notice.className = "auth-readiness-notice";
  notice.dataset.v249Health = "deferred";
  notice.setAttribute("role", "status");
  notice.textContent = "Pemeriksaan status server sedang tidak tersedia. Opsi login tetap aktif dan akan menggunakan jalur autentikasi yang tersedia.";
  anchor.insertAdjacentElement("beforebegin", notice);
}

function scan() {
  document.querySelectorAll(".auth-modal").forEach(ensureStatus);
}

async function resolveReadiness() {
  try {
    const response = await fetch("/api/health", {
      cache: "no-store",
      headers: { accept: "application/json", "cache-control": "no-cache" },
    });
    if (!response.ok) throw new Error(`Health ${response.status}`);
    health = await response.json().catch(() => ({}));
    healthReachable = true;
  } catch {
    health = null;
    healthReachable = false;
  } finally {
    resolved = true;
    document.documentElement.dataset.authHealth = healthReachable ? "reachable" : "unreachable";
    document.documentElement.dataset.emailRegistration = healthReachable
      ? String(health?.emailRegistration === true)
      : "unknown";
    scan();
  }
}

new MutationObserver((records) => {
  if (records.some((record) => record.addedNodes.length || record.removedNodes.length)) scan();
}).observe(document.documentElement, { childList: true, subtree: true });

resolveReadiness();
