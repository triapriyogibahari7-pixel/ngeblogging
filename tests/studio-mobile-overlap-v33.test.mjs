import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v33 is loaded after v32 and cleanup-only connector compatibility is loaded", async () => {
  const html = await read("index.html");
  assert.match(html, /studio-mobile-polish-v32\.css[\s\S]*studio-mobile-overlap-v33\.css/);
  assert.match(html, /<script[^>]+nara-connectors-v29\.js/);
});

test("Studio removes the Nara AI navigation route", async () => {
  const source = await read("src/StudioSecure.jsx");
  assert.match(source, /buttonLabel\(button\) === "Nara AI"/);
  assert.match(source, /forEach\(\(button\) => button\.remove\(\)\)/);
});

test("connector runtime is cleanup-only and performs no connection action", async () => {
  const source = await read("src/nara-connectors-v29.js");
  assert.match(source, /nara-connectors-disabled-v33/);
  assert.match(source, /nara-plugin-trigger-v29/);
  assert.match(source, /removeConnectorUi/);
  assert.doesNotMatch(source, /from\s+["']\.\/lib\/nara-data|await\s+requestIntegration|await\s+listUserIntegrations|await\s+disableIntegration/);
});

test("compact title, domain card and Nara toolbar cannot overlap", async () => {
  const css = await read("src/studio-mobile-overlap-v33.css");
  assert.match(css, /\.sn-page-title\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /\.sn-domain-card\s*\{[\s\S]*grid-template-columns:\s*36px minmax\(0, 1fr\)/);
  assert.match(css, /\.nara-plugin-panel-v29[\s\S]*display:\s*none !important/);
  assert.match(css, /\.nara-composer-tools\s*\{[\s\S]*30px !important/);
});

test("PWA cache rotates to v33", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v33-20260725/);
});
