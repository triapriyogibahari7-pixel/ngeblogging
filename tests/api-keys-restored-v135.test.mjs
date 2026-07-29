import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("API Keys panel uses the real secured Supabase RPCs", () => {
  const panel = read("src/ApiKeysPanel.jsx");
  assert.match(panel, /rpc\("list_api_keys"\)/);
  assert.match(panel, /rpc\("create_api_key"/);
  assert.match(panel, /rpc\("revoke_api_key"/);
  assert.match(panel, /rpc\("rotate_api_key"/);
  assert.match(panel, /functions\/v1\/ngeblogging-api/);
  assert.match(panel, /Secret hanya sekali|SECRET HANYA SEKALI/);
  assert.match(panel, /Uji koneksi/);
});

test("API Keys route is injected after Domain without replacing Studio", () => {
  const bridge = read("src/api-keys-studio-bridge.jsx");
  assert.match(bridge, /ngeblogging-api-keys-nav-v135/);
  assert.match(bridge, /ngeblogging-api-keys-v135/);
  assert.match(bridge, /labelOf\(candidate\) === "Domain"/);
  assert.match(bridge, /nav\.insertBefore\(button, domain\.nextElementSibling\)/);
  assert.match(bridge, /createRoot\(host\)/);
  assert.match(bridge, /<ApiKeysPanel setToast=\{toast\}\/>/);
  assert.doesNotMatch(bridge, /Nara AI<\/span>/);
});

test("API Keys route hides only the current content surface while active", () => {
  const css = read("src/api-keys-studio-bridge.css");
  assert.match(css, /sn-api-keys-active-v135/);
  assert.match(css, /:not\(\.sn-top\):not\(#ngeblogging-api-keys-v135\)/);
  assert.match(css, /#ngeblogging-api-keys-v135\{display:block!important/);
  assert.doesNotMatch(css, /\.sn-side\{[^}]*width/);
  assert.doesNotMatch(css, /\.nara-assistant/);
});

test("existing loaded runtime starts the independent API Keys bridge", () => {
  const runtime = read("src/nara-connectors-v29.js");
  assert.match(runtime, /import\("\.\/api-keys-studio-bridge\.jsx"\)/);
  assert.match(runtime, /connector UI and connector actions remain disabled/);
});

test("API Keys interface remains responsive on phone and desktop", () => {
  const css = read("src/api-keys-studio.css");
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /sn-api-table>article/);
  assert.match(css, /sn-api-secret-modal/);
});

test("v135 rotates stale clients while preserving the restored Studio baseline", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v135-api-keys-20260729/);
  assert.match(worker, /pre-api-ui-plus-api-keys-v135-20260729/);
  assert.match(worker, /pwa-v135-api-keys/);
  assert.match(worker, /restored pre-API-Keys v123 Studio baseline/);
});
