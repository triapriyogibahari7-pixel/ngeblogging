import { readFile, writeFile } from "node:fs/promises";

const RELEASE = "auth-callback-session-recovery-v315-20260806";
const ACTION_RELEASE = "auth-action-singleflight-v315-20260806";
const VERSION = "ngeblogging-app-v315-auth-callback-recovery-20260806";
const CACHE = "auth-callback-recovery-cache-v315";
const V314_VERSION_COMPAT = "ngeblogging-app-v314-domain-fullzone-20260806";
const V314_CACHE_COMPAT = "studio-domain-fullzone-cache-v314";

const callbackFile = new URL("../src/lib/auth-callback-v162.js", import.meta.url);
const modalFile = new URL("../src/AuthModal.jsx", import.meta.url);
const supabaseFile = new URL("../src/lib/supabase.js", import.meta.url);
const releaseFile = new URL("../public/release-v315.json", import.meta.url);
const swFile = new URL("../public/sw.js", import.meta.url);

function replaceRequired(source, before, after, code) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(code);
  return source.replace(before, after);
}

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V315_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

let callback = await readFile(callbackFile, "utf8");
callback = callback.replace(
  'export const AUTH_CALLBACK_RELEASE = "auth-callback-singleflight-v162-20260730";',
  `export const AUTH_CALLBACK_RELEASE = "${RELEASE}";`,
);
if (!callback.includes(RELEASE)) throw new Error("V315_CALLBACK_RELEASE_MARKER_MISSING");

callback = replaceRequired(
  callback,
  `async function currentSession() {\n  const { data, error } = await supabase.auth.getSession();\n  if (error) throw error;\n  return data?.session || null;\n}\n\nfunction announce(status, session, mode) {`,
  `async function currentSession() {\n  const { data, error } = await supabase.auth.getSession();\n  if (error) throw error;\n  return data?.session || null;\n}\n\nasync function recoverExistingSessionFromCallbackError(error, mode, codeFingerprint) {\n  if (!isConsumedCodeError(error) || !supabaseConfigured || !supabase) return null;\n  const session = await currentSession().catch(() => null);\n  if (!session?.access_token || !session?.refresh_token) return null;\n\n  writeMarker({\n    codeFingerprint,\n    mode,\n    status: "recovered-stale-provider-callback",\n    session,\n  });\n  cleanCallbackUrl({ success: true, recovery: mode === "recovery" });\n  announce("recovered-stale-provider-callback", session, mode);\n  return callbackResult("recovered", {\n    session,\n    mode,\n    singleFlight: true,\n    staleCallback: true,\n    existingSession: true,\n  });\n}\n\nfunction announce(status, session, mode) {`,
  "V315_CURRENT_SESSION_ANCHOR_MISSING",
);

callback = replaceRequired(
  callback,
  `  const oauthError = callbackErrorFromUrl(url);\n  if (oauthError) {\n    cleanCallbackUrl();\n    return callbackResult("error", { error: oauthError, mode });\n  }`,
  `  const oauthError = callbackErrorFromUrl(url);\n  if (oauthError) {\n    const recovered = await recoverExistingSessionFromCallbackError(oauthError, mode, codeFingerprint);\n    if (recovered) return recovered;\n    cleanCallbackUrl();\n    return callbackResult("error", { error: oauthError, mode });\n  }`,
  "V315_OAUTH_ERROR_ANCHOR_MISSING",
);

for (const marker of [
  RELEASE,
  "recoverExistingSessionFromCallbackError",
  "recovered-stale-provider-callback",
  "staleCallback: true",
  "existingSession: true",
  "exchangeCodeForSession(code)",
]) if (!callback.includes(marker)) throw new Error(`V315_CALLBACK_MARKER_MISSING:${marker}`);
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(callback)) throw new Error("V315_DESTRUCTIVE_CALLBACK_RUNTIME");
await writeFile(callbackFile, callback);

let modal = await readFile(modalFile, "utf8");
modal = replaceRequired(
  modal,
  'import React, { useEffect, useState } from "react";',
  'import React, { useEffect, useRef, useState } from "react";',
  "V315_AUTH_MODAL_REACT_IMPORT_MISSING",
);
if (!modal.includes("AUTH_ACTION_SINGLEFLIGHT_RELEASE")) {
  modal = replaceRequired(
    modal,
    'const AUTH_SESSION_HANDOFF_RELEASE = "auth-session-handoff-v255-20260804";',
    `const AUTH_SESSION_HANDOFF_RELEASE = "auth-session-handoff-v255-20260804";\nconst AUTH_ACTION_SINGLEFLIGHT_RELEASE = "${ACTION_RELEASE}";`,
    "V315_AUTH_MODAL_RELEASE_ANCHOR_MISSING",
  );
}
if (!modal.includes("const runLockRef = useRef(false);")) {
  modal = replaceRequired(
    modal,
    '  const [verificationPending, setVerificationPending] = useState(false);',
    '  const [verificationPending, setVerificationPending] = useState(false);\n  const runLockRef = useRef(false);',
    "V315_AUTH_MODAL_STATE_ANCHOR_MISSING",
  );
}
modal = replaceRequired(
  modal,
  `  const run = async (action, actionName = "form") => {\n    setBusy(true);\n    setBusyAction(actionName);`,
  `  const run = async (action, actionName = "form") => {\n    if (runLockRef.current) return;\n    runLockRef.current = true;\n    document.documentElement.dataset.authActionSingleflightV315 = AUTH_ACTION_SINGLEFLIGHT_RELEASE;\n    setBusy(true);\n    setBusyAction(actionName);`,
  "V315_AUTH_MODAL_RUN_ANCHOR_MISSING",
);
modal = replaceRequired(
  modal,
  `    } finally {\n      setBusy(false);\n      setBusyAction("");\n    }\n  };`,
  `    } finally {\n      setBusy(false);\n      setBusyAction("");\n      runLockRef.current = false;\n    }\n  };`,
  "V315_AUTH_MODAL_FINALLY_ANCHOR_MISSING",
);
modal = replaceRequired(
  modal,
  '<div className="modal auth-modal" data-auth-session-handoff-v255={AUTH_SESSION_HANDOFF_RELEASE} onMouseDown=',
  '<div className="modal auth-modal" data-auth-session-handoff-v255={AUTH_SESSION_HANDOFF_RELEASE} data-auth-action-singleflight-v315={AUTH_ACTION_SINGLEFLIGHT_RELEASE} onMouseDown=',
  "V315_AUTH_MODAL_ROOT_ANCHOR_MISSING",
);
for (const marker of [
  "useEffect, useRef, useState",
  ACTION_RELEASE,
  "const runLockRef = useRef(false)",
  "if (runLockRef.current) return",
  "runLockRef.current = true",
  "runLockRef.current = false",
  "data-auth-action-singleflight-v315",
  "linkedin_oidc",
  "google",
]) if (!modal.includes(marker)) throw new Error(`V315_AUTH_MODAL_MARKER_MISSING:${marker}`);
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(modal)) throw new Error("V315_DESTRUCTIVE_AUTH_MODAL_RUNTIME");
await writeFile(modalFile, modal);

const [supabase, release] = await Promise.all([
  readFile(supabaseFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);
for (const marker of ["persistSession: true", "autoRefreshToken: true", "flowType: \"pkce\""])
  if (!supabase.includes(marker)) throw new Error(`V315_SESSION_PERSISTENCE_MISSING:${marker}`);
for (const marker of [RELEASE, '"staleOAuthStateRecovery": true', '"providerDoubleTapGuard": true', '"sidebarUntouched": true', '"massiveCapacityClaimed": false'])
  if (!release.includes(marker)) throw new Error(`V315_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V314", "NGE_BLOGGING_UPDATE_AVAILABLE_V315")
  .replaceAll("service-worker-activated-domain-fullzone-v314", "service-worker-activated-auth-callback-recovery-v315");
sw = upsert(sw, "AUTH_CALLBACK_RECOVERY_RELEASE_V315", `"${RELEASE}"`);
sw = upsert(sw, "AUTH_ACTION_SINGLEFLIGHT_RELEASE_V315", `"${ACTION_RELEASE}"`);
sw = upsert(sw, "STUDIO_DOMAIN_FULLZONE_VERSION_COMPAT_V314", `"${V314_VERSION_COMPAT}"`);
sw = upsert(sw, "STUDIO_DOMAIN_FULLZONE_CACHE_COMPAT_V314", `"${V314_CACHE_COMPAT}"`);
sw = upsert(sw, "ACTIVE_VERSION_V315", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V315", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V315}-${ACTIVE_CACHE_RELEASE_V315}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${AUTH_ACTION_SINGLEFLIGHT_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V315}-${ACTIVE_CACHE_RELEASE_V315}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${AUTH_ACTION_SINGLEFLIGHT_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');
for (const marker of [RELEASE, ACTION_RELEASE, VERSION, CACHE, V314_VERSION_COMPAT, V314_CACHE_COMPAT, "STUDIO_NARA_NONMODAL_RELEASE_V313"])
  if (!sw.includes(marker)) throw new Error(`V315_SW_MARKER_MISSING:${marker}`);
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw)) throw new Error("V315_DESTRUCTIVE_SW_BEHAVIOR");
await writeFile(swFile, sw);

console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("../tests/auth-callback-recovery-v315.test.mjs");
