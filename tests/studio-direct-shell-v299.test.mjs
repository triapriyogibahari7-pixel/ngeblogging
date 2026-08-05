import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v299 boots the v298 shell directly from the synchronous Studio entry", async () => {
  const [v281, v298, css, release] = await Promise.all([
    read("src/studio-native-controls-v281.js"),
    read("src/studio-shell-authority-v298.js"),
    read("src/studio-shell-authority-v298.css"),
    read("public/release-v299.json"),
  ]);

  assert.match(v281, /^import "\.\/studio-shell-authority-v298\.js";/m);
  assert.match(v281, /studio-direct-shell-boot-v299-20260805/);
  assert.match(v298, /function toggleN\(event\)/);
  assert.match(v298, /reactToggle\(\)\?\.click|toggle\.click\(\)/);
  assert.match(v298, /studio-single-n-owner-v298-20260805/);
  assert.match(css, /\.sn-shell\[data-device-mode="small"\]/);
  assert.match(css, /width:min\(78vw,336px\)!important/);
  assert.match(css, /--v298-side-open:220px/);
  assert.match(css, /--v298-side-rail:70px/);
  assert.match(release, /studio-direct-shell-boot-v299-20260805/);

  for (const source of [v281, v298]) {
    assert.doesNotMatch(source, /new MutationObserver|setInterval\s*\(|stopImmediatePropagation/);
    assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
  }
});
