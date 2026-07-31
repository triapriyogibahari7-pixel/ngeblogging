import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const auth = read("src/lib/supabase.js");
const callback = read("src/lib/auth-callback-v162.js");
const handoff = read("src/auth-studio-bootstrap-v106.js");
const capacity = JSON.parse(read("public/auth-capacity-v162.json"));
const release = JSON.parse(read("public/release-v177.json"));

test("Google, LinkedIn OIDC, email password and magic link stay wired", () => {
  for (const marker of [
    '"google"',
    '"linkedin_oidc"',
    "signInWithProvider",
    "signInWithPassword",
    "signInWithMagicLink",
    "signUpWithPassword",
  ]) assert.ok(auth.includes(marker), `auth marker missing ${marker}`);
});

test("sessions persist and refresh until explicit local logout", () => {
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /detectSessionInUrl:\s*false/);
  assert.match(auth, /signOut\(\{ scope: "local" \}\)/);
  assert.match(auth, /AUTH_GATEWAY_PREFIX = "\/api\/auth-proxy"/);
});

test("OAuth callback exchanges once and hands the session to Studio", () => {
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /Symbol\.for\("ngeblogging\.auth\.callbackOperationV162"\)/);
  assert.match(callback, /recovered-consumed-code/);
  assert.match(callback, /url\.pathname = recovery \? "\/reset-password" : success \? "\/studio"/);
  assert.match(handoff, /const target = new URL\("\/studio", window\.location\.origin\)/);
  assert.match(handoff, /target\.searchParams\.set\("auth_success", AUTH_SUCCESS_VALUE\)/);
  assert.match(handoff, /const AUTH_SUCCESS_VALUE = "v158"/);
  assert.match(handoff, /window\.location\.replace\(`\$\{target\.pathname\}\$\{target\.search\}`\)/);
});

test("release reports evidence honestly instead of claiming all providers verified", () => {
  assert.equal(release.auth.persistSession, true);
  assert.equal(release.auth.autoRefreshToken, true);
  assert.equal(release.auth.googleBackendSessionObserved, true);
  assert.equal(release.auth.linkedinEndToEndVerified, false);
  assert.equal(release.auth.emailPasswordEndToEndVerified, false);
  assert.match(release.auth.reasonUnverified, /kredensial dan tindakan pengguna/i);
});

test("900 juta miliar remains a capacity model, never a fake production load-test claim", () => {
  assert.equal(capacity.status, "model-only");
  assert.equal(capacity.interpretation.logicalUsers, "900000000000000000");
  assert.equal(capacity.safetyPolicy.productionCredentialLoadTest, false);
  assert.equal(capacity.safetyPolicy.massAccountCreation, false);
  assert.equal(release.capacity.status, "model-only");
  assert.equal(release.capacity.productionCredentialLoadTest, false);
  assert.equal(release.capacity.massAccountCreation, false);
  assert.equal(release.capacity.claim, "not-claimed");
});
