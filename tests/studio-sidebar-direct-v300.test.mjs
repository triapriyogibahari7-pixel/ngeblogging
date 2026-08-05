import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v300 makes the visible n a direct target and loads final geometry last", async () => {
  const [studio, runtime, css, content, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-sidebar-direct-v300.js"),
    read("src/studio-sidebar-direct-v300.css"),
    read("src/lib/content-data.js"),
    read("public/release-v300.json"),
  ]);

  const legacyCssIndex = studio.indexOf('import "./studio-responsive-lock-v285.css"');
  const v300JsIndex = studio.indexOf('import "./studio-sidebar-direct-v300.js"');
  const v300CssIndex = studio.indexOf('import "./studio-sidebar-direct-v300.css"');
  assert.ok(legacyCssIndex >= 0 && v300JsIndex > legacyCssIndex && v300CssIndex > v300JsIndex, "v300 must load after historical Studio CSS");

  assert.match(runtime, /studio-sidebar-direct-v300-20260805/);
  assert.match(runtime, /mark\.addEventListener\("click", directToggle/);
  assert.match(runtime, /event\.stopPropagation\(\)/);
  assert.match(runtime, /reactToggle\(\)/);
  assert.match(runtime, /toggle\.click\(\)/);
  assert.match(runtime, /side\.querySelectorAll\(":scope>\.sn-new,:scope>nav,:scope>nav>button,:scope>\.sn-account-footer/);

  assert.match(css, /\.sn-shell\[data-device-mode="small"\]>#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /\.sn-shell\[data-device-mode="small"\]>#ngeblogging-studio-sidebar\.mobile-open/);
  assert.match(css, /width:min\(78vw,336px\)!important/);
  assert.match(css, /margin:0!important;padding-left:0!important;width:100%!important/);
  assert.match(css, /\.mobile-open>nav>button>span/);
  assert.match(css, /--v300-open:220px/);
  assert.match(css, /--v300-rail:70px/);
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /grid-template-areas:"code" "preview"/);
  assert.match(css, /grid-template-areas:"code preview"/);

  assert.match(content, /CONTENT_QUERY_TIMEOUT_MS = 12_000/);
  assert.match(content, /Promise\.race/);
  assert.match(content, /Memuat daftar konten/);
  assert.match(release, /studio-sidebar-direct-v300-20260805/);
  assert.match(release, /"smallOpenDrawerComplete": true/);
  assert.match(release, /"contentLoadingCannotSpinIndefinitely": true/);

  for (const source of [runtime, content]) {
    assert.doesNotMatch(source, /new MutationObserver|setInterval\s*\(|stopImmediatePropagation/);
    assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
  }
});
