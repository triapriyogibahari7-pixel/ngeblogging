import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

function count(source, marker) {
  return source.split(marker).length - 1;
}

test("patch v174 is idempotent and final CSS authorities are loaded last", () => {
  execFileSync(process.execPath, [new URL("../scripts/run-patch-mobile-stability-v174.mjs", import.meta.url).pathname], { stdio: "pipe" });
  execFileSync(process.execPath, [new URL("../scripts/run-patch-mobile-stability-v174.mjs", import.meta.url).pathname], { stdio: "pipe" });
  const studio = read("src/Studio.jsx");
  const editor = read("src/ContentEditor.jsx");
  assert.equal(count(studio, 'import "./studio-mobile-stability-v174.css";'), 1);
  assert.ok(studio.indexOf("studio-mobile-stability-v174.css") > studio.indexOf("studio-continuity-v152.css"));
  assert.equal(count(editor, 'import "./content-editor-v174.css";'), 1);
  assert.ok(editor.indexOf("content-editor-v174.css") > editor.indexOf("content-editor-v162.css"));
  assert.equal(count(editor, 'data-mobile-editor-authority="v174"'), 1);
});

test("Studio v174 prevents per-letter wrapping, blurry logo, blocked drawer, and page overlap", () => {
  const css = read("src/studio-mobile-stability-v174.css");
  for (const marker of [
    'overflow-wrap:break-word!important',
    'word-break:normal!important',
    '-webkit-text-fill-color:#1e5fc9!important',
    'filter:none!important',
    '.sn-side.mobile-open',
    'pointer-events:auto!important',
    'backdrop-filter:none!important',
    '.sv124-page-title',
    '.sv124-toggle-row input',
    '.sn-api-page',
    '@media(max-width:900px)',
    '@media(max-width:430px)',
  ]) assert.ok(css.includes(marker), `Studio stability CSS missing ${marker}`);
  assert.doesNotMatch(css, /overflow-wrap:anywhere!important[^\n]*:is\(h1/);
});

test("profile, settings, install app, site quota, and permanent View Site action are wired", () => {
  const studio = read("src/StudioNext.jsx");
  const summary = read("src/StudioContentV161.jsx");
  for (const marker of [
    "sn-profile-dropdown", "Profil</button>", "Pengaturan</button>", "Dapatkan aplikasi",
    "beforeinstallprompt", 'data-profile-page-v174="true"', "sn-site-settings-v174",
    "MAX_SITES_PER_ACCOUNT", "createUserSiteWithPolicy", "limitReached",
  ]) assert.ok(studio.includes(marker), `StudioNext missing ${marker}`);
  assert.ok(summary.includes("openSiteManager"));
  assert.match(summary, /publicUrl \? <a[^>]+>.*Lihat situs<\/a> : <button[^>]+>.*Lihat situs<\/button>/s);
  assert.ok(studio.includes('view === "profile"'));
  assert.ok(studio.includes('view === "settings"'));
});

test("Post and Page editor mobile authority wins over legacy v151 geometry", () => {
  const css = read("src/content-editor-v174.css");
  for (const marker of [
    'data-mobile-editor-authority="v174"',
    'grid-template-columns:44px minmax(0,1fr) auto!important',
    'position:sticky!important',
    'overflow-x:auto!important',
    'grid-template-columns:minmax(0,1fr)!important',
    'word-break:normal!important',
    '@media(max-width:760px)',
    '@media(max-width:390px)',
  ]) assert.ok(css.includes(marker), `Editor v174 CSS missing ${marker}`);
  assert.ok(css.includes(".ce-tabs"));
  assert.ok(css.includes(".ce-ribbon"));
  assert.ok(css.includes(".ce-paper"));
  assert.ok(css.includes(".ce-sidebar"));
});

test("Domain, Comments, and API Keys stop endless loading and retain real states", () => {
  const domain = read("src/DomainPanelV124.jsx");
  const comments = read("src/CommentsPanelV124.jsx");
  const api = read("src/ApiKeysPanel.jsx");
  assert.ok(domain.includes("MAX_SITES_PER_ACCOUNT"));
  assert.ok(domain.includes("setLoading(false); setError(\"Pilih atau buat situs aktif"));
  assert.ok(!domain.includes("/12 situs dalam akun"));
  assert.ok(!domain.includes("`${sites.length}/12`"));
  assert.ok(comments.includes("setLoading(false); setError(!site?.id"));
  assert.ok(comments.includes("MOOD_EMOJIS_V174"));
  assert.ok(comments.includes("REACTIONS_V174"));
  assert.equal((comments.match(/😀|😃|😄|😁|😊|😍|🥰|😎|🤩|😂/g) || []).length >= 10, true);
  assert.equal((comments.match(/😀|😊|😍|😂|😮|😢|😡|👍|❤️|🎉/g) || []).length >= 10, true);
  assert.ok(comments.includes('data-comment-preview-v174="true"'));
  assert.ok(api.includes("API_KEY_REQUEST_TIMEOUT_V174 = 12000"));
  assert.ok(api.includes('withDeadlineV174(supabase.rpc("list_api_keys"))'));
});

test("service worker rotates cache without losing v171 compatibility", () => {
  const worker = read("public/sw.js");
  assert.ok(worker.includes('const VERSION = "ngeblogging-app-v174-mobile-stability-20260731"'));
  assert.ok(worker.includes('MOBILE_PUBLIC_COMPAT_VERSION = "ngeblogging-app-v171-mobile-public-20260730"'));
  assert.ok(worker.includes('CACHE_RELEASE = "mobile-stability-cache-v174"'));
  assert.ok(worker.includes('mobileStabilityRelease: "mobile-stability-v174-20260731"'));
});
