import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v318 keeps Theme modal, code editor and layout map inside the viewport", async () => {
  const [css, runtime, release] = await Promise.all([
    read("src/studio-hotfix-v318.css"),
    read("src/studio-content-editor-responsive-v308.js"),
    read("public/release-v318.json"),
  ]);
  assert.match(runtime, /studio-hotfix-v318\.css/);
  assert.match(runtime, /studio-screenshot-hotfix-v318-20260806/);
  assert.match(css, /\.tn-modal-layer\{position:fixed!important;inset:0!important/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /data-theme-code-v312="line-numbers-10000"/);
  assert.match(css, /tn-layout-models-v312/);
  assert.match(css, /\.tn-layout-studio\{grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(release, /"themeModalViewportSafe": true/);
  assert.match(release, /"themeMapModelsPreserved": 2/);
  assert.match(release, /"themeLayoutAreasPreserved": 26/);
  assert.match(release, /"themeCountPreserved": 100/);
});

test("v318 preserves compact sidebar, domain and API containment", async () => {
  const css = await read("src/studio-hotfix-v318.css");
  assert.match(css, /#ngeblogging-studio-sidebar>nav>button\{flex:0 0 38px!important/);
  assert.match(css, /#ngeblogging-studio-sidebar>nav>button:last-child:not\(\.active\)\{color:#53657b!important/);
  assert.match(css, /\.sn-api-modal-layer\{position:fixed!important;inset:0!important/);
  assert.match(css, /\.sv124-domain-page/);
  assert.doesNotMatch(css, /display:none!important[^\n]*(?:API|Domain|nav>button)/i);
});

test("v318 API key migration includes the Supabase extensions schema", async () => {
  const [migration, release] = await Promise.all([
    read("supabase/migrations/20260806053000_api_keys_pgcrypto_search_path_v318.sql"),
    read("public/release-v318.json"),
  ]);
  assert.match(migration, /alter function public\.create_api_key\(text, text\[\], integer\)/);
  assert.match(migration, /alter function public\.rotate_api_key\(uuid\)/);
  assert.match(migration, /search_path = public, extensions, pg_temp/);
  assert.match(release, /"apiKeyCryptoSearchPathFixed": true/);
  assert.match(release, /"apiKeyCreateListRevokeRotateValidated": true/);
});
