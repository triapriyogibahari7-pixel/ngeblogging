import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v257 six-mode visual authority and hard build-order guard remain installed", () => {
  const runtime = read("src/studio-visual-native-v257.js");
  const styles = read("src/studio-visual-native-v257.css");
  const finalizer = read("scripts/finalize-studio-v257-order.mjs");
  const vite = read("vite.config.js");

  assert.ok(runtime.includes("studio-visual-native-v257-20260804"));
  assert.ok(runtime.includes("studioV257Family"));
  assert.ok(runtime.includes("v257InitialSmall"));
  assert.ok(styles.includes("--v257-side-open:248px"));
  assert.ok(styles.includes(".nara-floating-button"));
  assert.ok(styles.includes(".v257-layout-blueprint"));
  assert.ok(finalizer.includes("studio-v257-post-build-order-20260804"));
  assert.ok(finalizer.includes("V257_FINAL_ORDER_INVALID"));
  assert.ok(vite.includes("finalizeStudioV257Order"));
});
