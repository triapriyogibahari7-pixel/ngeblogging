import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio loads one static final device authority", () => {
  const studio = read("src/Studio.jsx");
  const runtime = read("src/studio-device-mode-v137.js");
  assert.match(studio, /studio-device-mode-v137\.js/);
  assert.match(runtime, /^import "\.\/studio-device-modes-v137\.css";/);
  assert.doesNotMatch(runtime, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  assert.doesNotMatch(runtime, /visualViewport/);
  assert.match(runtime, /SMALL_QUERY = "\(max-width: 700px\)"/);
});

test("React owns the same small-screen contract and exposes the n menu control", () => {
  const source = read("src/StudioNext.jsx");
  assert.match(source, /PHONE_QUERY = "\(max-width: 700px\)"/);
  assert.match(source, /smallScreen \? \(mobileSidebar/);
  assert.match(source, /sn-sidebar-toggle-mark/);
  assert.match(source, />n<\/span><PanelLeftClose/);
  assert.match(source, /aria-controls="ngeblogging-studio-sidebar"/);
  assert.match(source, /id="ngeblogging-studio-sidebar"/);
});

test("mobile drawer has no blur and desktop geometry is exact", () => {
  const css = read("src/studio-device-modes-v137.css");
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /transform:translate3d\(-102%,0,0\)!important/);
  assert.match(css, /\.sn-shell>\.sn-side\.mobile-open/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /sn-sidebar-toggle-mark/);
  assert.match(css, /--studio-side-open:220px/);
  assert.match(css, /--studio-side-closed:70px/);
  assert.match(css, /width:calc\(100% - var\(--studio-side-open\)\)!important/);
});

test("legacy authorities cannot rewrite sidebar geometry repeatedly", () => {
  const index = read("index.html");
  const shell = read("src/studio-shell-v30.js");
  const precision = read("src/studio-mobile-precision-v99.js");
  const final = read("src/studio-final-v106.js");
  assert.match(index, /superseded-by-react-sidebar-v138/);
  assert.doesNotMatch(shell.match(/function sync\(\) \{[\s\S]*?\n\}/)?.[0] || "", /syncSidebar|autoOpenNara/);
  assert.doesNotMatch(precision.match(/function sync\(\) \{[\s\S]*?\n\}/)?.[0] || "", /syncSidebarGeometry|stabilizeCommentsRow|ensureFinalStyle/);
  assert.doesNotMatch(final, /setInterval\(sync,\s*700\)/);
});

test("Domain, API Keys, comments, and Nara remain present and isolated", () => {
  const css = read("src/studio-device-modes-v137.css");
  const index = read("index.html");
  const connectors = read("src/nara-connectors-v29.js");
  assert.match(css, /#ngeblogging-api-keys-v135/);
  assert.match(css, /sn-comments-nav-host-v93/);
  assert.match(css, /nara-assistant-shell/);
  assert.match(index, /comments-studio-runtime-v93\.jsx/);
  assert.match(index, /studio-final-v106\.js/);
  assert.match(connectors, /api-keys-studio-bridge\.jsx/);
});

test("PWA cache rotates to the v138 sidebar authority", () => {
  const runtime = read("src/pwa-runtime.js");
  const worker = read("public/sw.js");
  assert.match(runtime, /ngeblogging-pwa-v138-20260729/);
  assert.match(runtime, /pwa-v138/);
  assert.match(worker, /ngeblogging-app-v138-sidebar-20260729/);
  assert.match(worker, /single-react-sidebar-v138-20260729/);
  assert.match(worker, /studio-device-modes-v137\.css/);
});
