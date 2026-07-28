import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("login and Studio data reject false HTML gateway success and continue through safe fallbacks", async () => {
  const [supabase, index, worker] = await Promise.all([
    read("src/lib/supabase.js"),
    read("index.html"),
    read("public/sw.js"),
  ]);

  assert.match(supabase, /login-data-gateway-v114-20260729/);
  assert.match(supabase, /meta\[name="ngeblogging-api-origin"\]/);
  assert.match(index, /meta name="ngeblogging-api-origin"/);
  assert.match(supabase, /DEFAULT_API_ORIGIN = "https:\/\/ngeblogging\.triapriyogibahari7\.workers\.dev"/);
  assert.match(supabase, /marker: "x-ngeblogging-auth-gateway"/);
  assert.match(supabase, /marker: "x-ngeblogging-data-gateway"/);
  assert.match(supabase, /function gatewayResponseAccepted\(response, descriptor\)/);
  assert.match(supabase, /response\.headers\.get\(descriptor\.marker\)/);
  assert.match(supabase, /if \(!marker\) return false/);
  assert.match(supabase, /for \(const origin of gatewayOrigins\(\)\)/);
  assert.match(supabase, /"api-worker"/);
  assert.match(supabase, /nativeFetch\(source\.clone\(\)\)/);
  assert.match(supabase, /"direct-fallback"/);
  assert.match(supabase, /GATEWAY_RESPONSE_MISMATCH/);

  assert.match(worker, /ngeblogging-app-v114-20260729/);
  assert.match(worker, /login-data-gateway-v114-20260729/);
  assert.match(worker, /pwa-v114/);
  assert.match(worker, /service-worker-activated-login-data-gateway-v114/);
});
