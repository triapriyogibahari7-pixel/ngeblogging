import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const release = JSON.parse(read("public/release-v226.json"));

test("v226 diagnostic gate keeps the native green layout release present", () => {
  assert.equal(release.release, "studio-production-v226-native-green-layout-20260803");
  assert.equal(release.themeLayout.nativeReactMap, true);
  assert.equal(release.widgets.count, 26);
  assert.equal(release.themeCatalog.builtInThemes, 100);
  assert.equal(release.authentication.forcedLogoutAdded, false);
});
