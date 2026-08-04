import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const studioNext = read("src/StudioNext.jsx");
const runtime = read("src/studio-editor-navigation-v266.js");
const css = read("src/studio-editor-navigation-v266.css");

test("v266 editor navigation loads after the final v265 shell hotfix", () => {
  const hotfix = studio.indexOf('import "./studio-shell-v265-final-hotfix.css";');
  const runtimeIndex = studio.indexOf('import "./studio-editor-navigation-v266.js";');
  const cssIndex = studio.indexOf('import "./studio-editor-navigation-v266.css";');
  assert.ok(hotfix >= 0);
  assert.ok(runtimeIndex > hotfix);
  assert.ok(cssIndex > runtimeIndex);
});

test("React still renders ContentEditor outside the shell and v266 deliberately fills that navigation gap", () => {
  assert.match(studioNext, /if \(view === "editor" && active\) return <>/);
  assert.match(studioNext, /<ContentEditor/);
  assert.match(runtime, /cacheStudioSidebar/);
  assert.match(runtime, /buildEditorNavigation/);
  assert.match(runtime, /document\.querySelector\("\.ce-app"\)/);
  assert.match(runtime, /cachedSidebar \|\| fallbackSidebar\(\)/);
});

test("editor navigation contains every required Studio destination and routes through React after Back", () => {
  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.ok(runtime.includes(label), `v266 editor navigation missing ${label}`);
  assert.match(runtime, /document\.querySelector\("\.ce-app \.ce-back"\)/);
  assert.match(runtime, /waitForStudio/);
  assert.match(runtime, /#ngeblogging-studio-sidebar nav button/);
  assert.match(runtime, /\.sn-account-logout-v135/);
});

test("large editor navigation expands and collapses while the editor width follows it", () => {
  assert.match(runtime, /editor-v266-large/);
  assert.match(runtime, /editor-v266-expanded/);
  assert.match(runtime, /editor-v266-collapsed/);
  assert.match(css, /html\.editor-v266-large \.ce-app\{width:calc\(100% - 232px\)!important/);
  assert.match(css, /html\.editor-v266-large\.editor-v266-collapsed \.ce-app\{width:calc\(100% - 72px\)!important/);
  assert.match(css, /#ngeblogging-editor-nav-v266\.collapsed \.ce-editor-side-v266\{width:72px!important/);
});

test("small editor navigation is one n when closed and a bounded drawer when open", () => {
  assert.match(runtime, /editor-v266-small/);
  assert.match(css, /html\.editor-v266-small \.ce-editor-sidebar-toggle-v266\{display:grid\}/);
  assert.match(css, /html\.editor-v266-small \.ce-editor-side-v266[\s\S]*width:min\(82vw,320px\)/);
  assert.match(css, /#ngeblogging-editor-nav-v266\.mobile-open \.ce-editor-side-v266/);
  assert.match(css, /\.ce-editor-sidebar-backdrop-v266[\s\S]*background:transparent/);
});

test("editor navigation is session-safe and does not force reloads", () => {
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /signOut\s*\(/);
  assert.doesNotMatch(runtime, /location\.reload\s*\(/);
});
