import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v130 device authority loads after historical Studio geometry", () => {
  const html = read("index.html");
  const oldAuthority = html.indexOf("studio-geometry-recovery-v126.css?v=130");
  const newAuthority = html.indexOf("studio-device-authority-v130.css?v=130");
  assert.ok(oldAuthority >= 0, "historical geometry remains available");
  assert.ok(newAuthority > oldAuthority, "v130 authority must load last");
  assert.match(html, /nara-panel-controls-v130\.js\?v=130/);
});

test("v130 locks full-width operational pages and permanent panel toggle", () => {
  const css = read("src/studio-device-authority-v130.css");
  assert.match(css, /#ngeblogging-operational-surface-v125/);
  assert.match(css, /data-desktop-site-phone="true"/);
  assert.match(css, /\.sv124-desktop-toggle\{display:grid!important/);
  assert.match(css, /\.sv124-mobile-toggle\{display:none!important/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-size="full"/);
});

test("Nara and Domain API failures retry through the Worker origin", () => {
  const failover = read("src/api-origin-failover-v60.js");
  assert.match(failover, /api-origin-failover-v130/);
  assert.match(failover, /\/api\/nara/);
  assert.match(failover, /\/api\/domains\//);
  assert.match(failover, /500, 502, 503, 504/);
  assert.match(failover, /ngeblogging\.triapriyogibahari7\.workers\.dev/);
});

test("service worker rotates stale Studio caches", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v130-20260729/);
  assert.match(worker, /studio-device-nara-domain-v130-20260729/);
  assert.match(worker, /pwa-v130/);
});
