import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const provider = read("src/auth-provider-gateway-v250.js");
const supabase = read("src/lib/supabase.js");
const modal = read("src/AuthModal.jsx");
const gateway = read("server/auth-gateway-v108.mjs");

test("OAuth provider navigation uses the canonical Supabase authorize URL directly", () => {
  assert.match(provider, /auth-provider-navigation-v260-20260804/);
  assert.match(provider, /direct-provider-authorize/);
  assert.doesNotMatch(provider, /new URL\(`\$\{AUTH_GATEWAY_PREFIX\}/);
  assert.match(provider, /return new URL\(String\(value\)\)\.toString\(\)/);
});

test("Google GitHub and LinkedIn remain available from the login modal", () => {
  assert.match(modal, /\{ id: "google", label: "Google" \}/);
  assert.match(modal, /\{ id: "github", label: "GitHub"/);
  assert.match(modal, /\{ id: "linkedin_oidc", label: "LinkedIn"/);
  assert.match(modal, /signInWithProvider\(id\)/);
});

test("email/password and magic-link calls retain resilient same-origin plus direct fallback", () => {
  assert.match(supabase, /GATEWAY_DEADLINE_MS_V259 = 8_500/);
  assert.match(supabase, /DIRECT_DEADLINE_MS_V259 = 12_000/);
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
  assert.match(supabase, /flowType:\s*"pkce"/);
  assert.match(supabase, /signInWithPassword/);
  assert.match(supabase, /signInWithOtp/);
  assert.match(gateway, /AUTH_UPSTREAM_TIMEOUT_MS = 7_000/);
  assert.doesNotMatch(supabase, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});
