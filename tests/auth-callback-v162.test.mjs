import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const callback = read("src/lib/auth-callback-v162.js");
const supabase = read("src/lib/supabase.js");
const main = read("src/main.jsx");
const modal = read("src/AuthModal.jsx");
const patcher = read("scripts/patch-auth-callback-v162.mjs");

const providers = ["google", "linkedin_oidc"];

test("PKCE callback v162 is explicitly exchanged once and survives callback refreshes", () => {
  assert.match(callback, /auth-callback-v162-20260730/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /let callbackPromise = null/);
  assert.match(callback, /existing\.data\?\.session\?\.access_token/);
  assert.match(callback, /isConsumedCodeError/);
  assert.match(callback, /recovered\.data\?\.session\?\.access_token/);
  assert.match(callback, /access_token/);
  assert.match(callback, /refresh_token/);
  assert.match(callback, /ngeblogging:auth-callback-complete/);
});

test("successful callbacks move to Studio without leaving provider secrets in the URL", () => {
  for (const key of ["code", "error", "error_code", "error_description", "state"]) {
    assert.ok(callback.includes(`"${key}"`), `callback cleanup missing ${key}`);
  }
  assert.match(callback, /url\.pathname = recovery \? "\/reset-password" : success \? "\/studio"/);
  assert.match(callback, /auth_success/);
  assert.match(callback, /history\.replaceState/);
  assert.doesNotMatch(callback, /location\.reload/);
});

test("React bootstrap listens before exchange and only opens Studio with a real access token", () => {
  assert.match(main, /consumeAuthCallbackV162/);
  assert.match(main, /onAuthStateChange/);
  assert.ok(main.indexOf("onAuthStateChange") < main.indexOf("consumeAuthCallbackV162().then"));
  assert.match(main, /openVerifiedStudio/);
  assert.match(main, /nextSession\?\.access_token/);
  assert.match(main, /subscription\?\.unsubscribe\(\)/);
  assert.match(main, /Sesi lokal tetap dipertahankan/);
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
  assert.match(patcher, /PATCH_AUTH_V162_INCOMPLETE/);
});

test("logout remains explicit and transient callback errors do not sign the user out", () => {
  assert.match(main, /const leaveStudio = async \(\) =>/);
  assert.match(main, /await signOut\(\)/);
  assert.doesNotMatch(callback, /signOut/);
  assert.doesNotMatch(callback, /localStorage\.clear/);
  assert.doesNotMatch(callback, /sessionStorage\.clear/);
});
