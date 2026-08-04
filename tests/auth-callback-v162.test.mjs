import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const callback = read("src/lib/auth-callback-v162.js");
const authority = read("src/auth-callback-authority-v107.js");
const bootstrap = read("src/auth-studio-bootstrap-v106.js");
const supabase = read("src/lib/supabase.js");
const main = read("src/main.jsx");
const modal = read("src/AuthModal.jsx");
const patcher = read("scripts/patch-auth-callback-v162.mjs");
const lateRecovery = read("scripts/patch-auth-late-callback-v215.mjs");
const worker = read("public/sw.js");
const release215 = JSON.parse(read("public/release-v215.json"));
const index = read("index.html");

const providers = ["google", "linkedin_oidc"];

function occurrences(source, marker) {
  return source.split(marker).length - 1;
}

function v215RecoveryBlock() {
  const start = main.indexOf("const authLateCallbackRecoveryV215");
  const end = main.indexOf('setAuthMode("signin")', start);
  return start >= 0 && end > start ? main.slice(start, end) : "";
}

test("PKCE callback v162 has exactly one exchange owner with a global single-flight lock", () => {
  assert.match(callback, /auth-callback-singleflight-v162-20260730/);
  assert.match(callback, /Symbol\.for\("ngeblogging\.auth\.callbackOperationV162"\)/);
  assert.match(callback, /CALLBACK_MARKER/);
  assert.match(callback, /CALLBACK_TTL_MS/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.equal(occurrences(callback, "exchangeCodeForSession(code)"), 1);
  assert.doesNotMatch(authority, /exchangeCodeForSession/);
  assert.match(authority, /consumeAuthCallbackV162/);
  assert.match(authority, /AUTH_CALLBACK_RELEASE/);
  assert.match(callback, /isConsumedCodeError/);
  assert.match(callback, /recovered-consumed-code/);
  assert.match(callback, /access_token/);
  assert.match(callback, /refresh_token/);
});

test("successful callbacks clean provider secrets and move the browser state to Studio", () => {
  for (const key of ["code", "error", "error_code", "error_description", "state"]) {
    assert.ok(callback.includes(`"${key}"`), `callback cleanup missing ${key}`);
  }
  assert.match(callback, /url\.pathname = recovery \? "\/reset-password" : success \? "\/studio"/);
  assert.match(callback, /auth_success/);
  assert.match(callback, /source/);
  assert.match(callback, /history\.replaceState/);
  assert.doesNotMatch(callback, /location\.reload/);
  assert.match(authority, /callback-watchdog/);
});

test("legacy bootstrap and React consume the same callback promise instead of racing", () => {
  assert.match(authority, /consumeAuthCallbackV162\(\)/);
  assert.match(main, /consumeAuthCallbackV162/);
  assert.match(main, /onAuthStateChange/);
  assert.ok(main.indexOf("onAuthStateChange") < main.indexOf("consumeAuthCallbackV162().then"));
  assert.match(main, /openVerifiedStudio/);
  assert.match(main, /nextSession\?\.access_token/);
  assert.match(main, /nextSession\?\.refresh_token/);
  assert.match(main, /subscription\?\.unsubscribe\(\)/);
  assert.match(main, /Sesi lokal tetap dipertahankan/);
  assert.match(bootstrap, /auth-studio-route-v162-20260730/);
  assert.match(bootstrap, /AUTH_SUCCESS_VALUE = "v162"/);
  assert.match(index, /auth-studio-bootstrap-v106\.js\?v=162/);
});

test("email password and immediate signup sessions are verified before Studio handoff", () => {
  assert.match(modal, /const data = await signInWithPassword\(email, password\)/);
  if (modal.includes("auth-session-handoff-v255-20260804")) {
    assert.match(modal, /settleAuthenticatedSession/);
    assert.match(modal, /await settleAuthenticatedSession\(data\?\.session \|\| null\)/);
    assert.match(modal, /await settleAuthenticatedSession\(data\.session\)/);
    assert.match(modal, /supabase\.auth\.getSession\(\)/);
    assert.match(modal, /await onAuthenticated\?\.\(nextSession\)/);
    assert.match(modal, /ngeblogging:auth-session-ready/);
  } else {
    const handoffs = modal.match(/onAuthenticated\(data\.session\)/g) || [];
    assert.ok(handoffs.length >= 2, "signin and signup must both pass the created session");
  }
  assert.match(main, /finishAuth = \(nextSession = null\)/);
  assert.match(main, /setSession\(nextSession\)/);
});

test("Google LinkedIn email and persistent refresh remain configured", () => {
  for (const provider of providers) assert.ok(supabase.includes(`"${provider}"`), `missing ${provider}`);
  for (const marker of ["signInWithPassword", "signInWithOAuth", "persistSession: true", "autoRefreshToken: true", "flowType: \"pkce\""]) {
    assert.ok(supabase.includes(marker), `missing ${marker}`);
  }
  assert.match(supabase, /detectSessionInUrl: false/);
  assert.match(patcher, /PATCH_AUTH_V162/);
  assert.match(patcher, /modalHasV255Handoff/);
});

test("logout remains explicit and callback recovery never clears the stored session", () => {
  assert.match(main, /const leaveStudio = async \(\) =>/);
  assert.match(main, /await signOut\(\)/);
  assert.doesNotMatch(callback, /signOut/);
  assert.doesNotMatch(authority, /signOut/);
  assert.doesNotMatch(callback, /localStorage\.clear/);
  assert.doesNotMatch(callback, /sessionStorage\.clear/);
  assert.doesNotMatch(authority, /localStorage\.clear/);
});

test("v215 keeps v162 single-flight but lets an already verified session win over a late expired callback", () => {
  assert.match(lateRecovery, /auth-late-callback-recovery-v215-20260802/);
  assert.match(lateRecovery, /oauth state.*not found/);
  assert.match(lateRecovery, /await supabase\.auth\.getSession\(\)/);
  assert.match(lateRecovery, /openVerifiedStudio\(retainedSession\)/);
  assert.match(main, /authLateCallbackRecoveryV215/);
  assert.match(main, /retained-verified-session/);
  assert.match(main, /retainedSession\?\.access_token/);
  assert.match(main, /retainedSession\?\.refresh_token/);
  assert.equal(occurrences(callback, "exchangeCodeForSession(code)"), 1);
  const recovery = v215RecoveryBlock();
  assert.ok(recovery, "v215 recovery block must exist in generated main.jsx");
  assert.doesNotMatch(recovery, /exchangeCodeForSession/);
  assert.doesNotMatch(recovery, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("v215 rotates cache without forced navigation and records only observed provider evidence", () => {
  assert.match(worker, /ngeblogging-app-v215-auth-late-callback-20260802/);
  assert.match(worker, /auth-late-callback-cache-v215/);
  assert.match(worker, /auth-late-callback-recovery-v215-20260802/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
  assert.equal(release215.evidence.googlePkceProductionLoginObserved, true);
  assert.equal(release215.claims.googleEndToEndProductionEvidence, true);
  assert.equal(release215.claims.linkedinEndToEndProductionEvidence, false);
  assert.equal(release215.claims.emailPasswordEndToEndProductionEvidence, false);
  assert.equal(release215.claims.allProvidersProven, false);
  assert.equal(release215.claims.massLoginCapacityProven, false);
});