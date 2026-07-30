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
const index = read("index.html");

const providers = ["google", "linkedin_oidc"];

function occurrences(source, marker) {
  return source.split(marker).length - 1;
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

test("email password and immediate signup sessions are passed directly to Studio", () => {
  assert.match(modal, /const data = await signInWithPassword\(email, password\)/);
  const handoffs = modal.match(/onAuthenticated\(data\.session\)/g) || [];
  assert.ok(handoffs.length >= 2, "signin and signup must both pass the created session");
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
  assert.match(patcher, /satu pertukaran PKCE/);
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
