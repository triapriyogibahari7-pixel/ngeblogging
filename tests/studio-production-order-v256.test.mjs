import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v256 final order and auth timeout guards are present", () => {
  const finalizer = read("scripts/finalize-studio-v255-order.mjs");
  const gateway = read("server/auth-gateway-v108.mjs");
  assert.ok(finalizer.includes("studio-v255-post-activator-order-v256-20260804"));
  assert.ok(finalizer.includes("V256_V255_FINAL_ORDER_INVALID"));
  assert.ok(gateway.includes("auth-gateway-timeout-v256-20260804"));
  assert.ok(gateway.includes("AUTH_UPSTREAM_TIMEOUT_MS = 7_000"));
  assert.ok(gateway.includes("AUTH_UPSTREAM_TIMEOUT"));
});
