import { supabaseConfigured } from "./lib/supabase.js";

export const AUTH_READINESS_RELEASE_V248 = "auth-readiness-nondestructive-v248-20260803";

let resolved = false;
let healthReachable = false;
let health = null;

document.documentElement.dataset.authReadinessV248 = AUTH_READINESS_RELEASE_V248;
document.documentElement.dataset.emailRegistration = "pending";
document.documentElement.dataset.authHealth = "pending";

function ensureStatus(modal) {
  modal.dataset.authReadinessV248 = AUTH_READINESS_RELEASE_V248;
  modal.dataset.authHealth = resolved ? (healthReachable ? "reachable" : "unreachable") : "pending";
  modal.dataset.emailRegistration = resolved && healthReachable
    ? String(health?.emailRegistration === true)
    : "unknown";

  // A health endpoint is diagnostic only. It must never hide Google, LinkedIn,
  // GitHub, email/password, magic-link, signup, recovery, or password-reset UI.
  // AuthModal itself owns busy/disabled state and Supabase configuration.
  modal.querySelectorAll(".auth-readiness-notice[data-v248-health]").forEach((node) => node.remove());

  if (!resolved || healthReachable || !supabaseConfigured) return;
  const divider = modal.querySelector(".auth-divider") || modal.querySelector(".password-form");
  if (!divider?.parentElement) return;
  const notice = document.createElement("p");
  notice.className = "auth-readiness-notice";
  notice.dataset.v248Health = "deferred";
  notice.setAttribute("role", "status");
  notice.textContent = "Pemeriksaan status server sedang tidak tersedia. Opsi login tetap aktif dan akan menggunakan transport autentikasi yang tersedia.";
  divider.insertAdjacentElement("beforebegin", notice);
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
    // A temporary network/health failure is not proof that auth providers are
    // unavailable. Keep all login controls rendered and let the real auth call
    // return the authoritative result.
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
