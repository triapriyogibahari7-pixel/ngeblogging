import test from "node:test";
import assert from "node:assert/strict";
import { configurationDiagnostics, handleMidtrans } from "../server/midtrans-catalog-api.mjs";

const complete = { MIDTRANS_ENV: "production", MIDTRANS_SERVER_KEY: "private-server-sentinel", SUPABASE_URL: "https://example.invalid", SUPABASE_PUBLISHABLE_KEY: "public-sentinel", SUPABASE_SERVICE_ROLE_KEY: "private-role-sentinel" };

test("diagnostics identify missing bindings without returning values", () => {
  const env = { ...complete, SUPABASE_SERVICE_ROLE_KEY: "" };
  const result = configurationDiagnostics(env);
  assert.deepEqual(result.missing, ["SUPABASE_SERVICE_ROLE_KEY"]);
  assert.equal(result.environmentValid, true);
  for (const value of Object.values(complete)) assert.equal(JSON.stringify(result).includes(value), false);
});

test("invalid mode is reported without echoing input", () => {
  const result = configurationDiagnostics({ ...complete, MIDTRANS_ENV: "invalid-mode-sentinel" });
  assert.equal(result.environmentValid, false);
  assert.equal(JSON.stringify(result).includes("invalid-mode-sentinel"), false);
});

test("config retains readiness and never calls upstream services", async () => {
  for (const env of [complete, { ...complete, SUPABASE_SERVICE_ROLE_KEY: "" }]) {
    const response = await handleMidtrans(new Request("https://example.invalid/api/billing/midtrans/config"), env, { fetchImpl: () => { throw new Error("Unexpected upstream call"); } });
    const body = await response.json();
    assert.equal(body.ready, Boolean(env.SUPABASE_SERVICE_ROLE_KEY));
    assert.equal(body.environment, "production");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(JSON.stringify(body).includes(complete.MIDTRANS_SERVER_KEY), false);
    assert.equal(JSON.stringify(body).includes(complete.SUPABASE_SERVICE_ROLE_KEY), false);
    assert.ok(body.diagnostics);
  }
});
