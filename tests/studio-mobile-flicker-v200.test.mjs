import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v200 is loaded after v199 and keeps the six responsive families", async () => {
  const studio = await read("src/Studio.jsx");
  const release = JSON.parse(await read("public/release-v200.json"));
  const v199Index = studio.indexOf('import "./studio-current-screenshot-v199.js";');
  const v200Index = studio.indexOf('import "./studio-mobile-flicker-v200.js";');
  assert.ok(v199Index >= 0, "v199 authority must remain loaded");
  assert.ok(v200Index > v199Index, "v200 must load after v199");
  assert.deepEqual(release.responsive.layoutFamiliesPreserved, [
    "application", "phone", "mobile", "compact", "tablet", "desktop-family",
  ]);
});

test("v200 prevents the legacy v193 observer from watching attributes it writes", async () => {
  const source = await read("src/studio-screenshot-recovery-v193.js");
  const observerStart = source.indexOf("new MutationObserver(scheduleV193)");
  assert.ok(observerStart >= 0, "v193 observer must still exist");
  const observerEnd = source.indexOf("});", observerStart);
  assert.ok(observerEnd > observerStart, "v193 observer options must be readable");
  const observer = source.slice(observerStart, observerEnd + 3);
  assert.doesNotMatch(observer, /"hidden"|"inert"|"aria-hidden"/);
  assert.match(source, /v200: do not observe hidden\/inert\/aria-hidden/);
});

test("API Keys mobile layout is forced back into normal full-width flow", async () => {
  const css = await read("src/studio-mobile-flicker-v200.css");
  for (const marker of [
    ".sn-api-page",
    ".sn-api-title",
    ".sn-api-list > header",
    ".sn-api-empty",
    ".sn-api-endpoint > header",
    "grid-template-columns: minmax(0,1fr) !important",
  ]) {
    assert.ok(css.includes(marker), `missing API Keys containment marker: ${marker}`);
  }
});

test("Nara small and medium remain non-modal and session continuity stays enabled", async () => {
  const css = await read("src/studio-mobile-flicker-v200.css");
  const supabase = await read("src/lib/supabase.js");
  assert.match(css, /data-nara-size=\"small\"/);
  assert.match(css, /data-nara-size=\"medium\"/);
  assert.match(css, /pointer-events: none !important/);
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
});

test("service worker release rotates without destructive session operations", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v200-mobile-flicker-20260802/);
  assert.match(sw, /mobile-flicker-cache-v200/);
  assert.match(sw, /studio-mobile-flicker-v200-20260802/);
  assert.doesNotMatch(sw, /await refreshStaleWindow\(client, url\);/);
  assert.doesNotMatch(sw, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});
