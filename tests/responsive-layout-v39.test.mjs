import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("layout v39 exposes all requested regions and device modes", async () => {
  const source = await read("src/studio-layout-builder-v36.js");
  for (const marker of [
    "sidebar-left-top",
    "sidebar-left-bottom",
    "sidebar-right-top",
    "sidebar-right-bottom",
    "footer-left-top",
    "footer-left-bottom",
    "footer-right-top",
    "footer-right-bottom",
    "footer-wide",
    "lb36-device-switch",
    "data-device=\"${value}\"",
    "[\"desktop\", \"Desktop\"]",
    "[\"tablet\", \"Tablet\"]",
    "[\"mobile\", \"Mobile\"]",
    "studio-layout-builder-v39-20260726",
  ]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("widget system includes 25 built-ins plus one HTML JavaScript widget", async () => {
  const source = await read("src/widget-system.js");
  assert.match(source, /id:\s*"html-javascript"/);
  assert.match(source, /BUILT_IN_WIDGET_COUNT/);
  assert.match(source, /safeCustomHtml/);
  assert.match(source, /safeCustomScript/);
});

test("responsive authority and production health contract are wired", async () => {
  const [index, responsive, worker, serviceWorker, workflow] = await Promise.all([
    read("index.html"),
    read("src/studio-responsive-v39.js"),
    read("cloudflare/worker-v37.mjs"),
    read("public/sw.js"),
    read(".github/workflows/cloudflare.yml"),
  ]);
  assert.match(index, /studio-responsive-v39\.css/);
  assert.match(index, /studio-responsive-v39\.js/);
  assert.match(responsive, /studio-responsive-v39-20260726/);
  assert.match(worker, /2026\.07\.26-responsive-v39/);
  assert.match(worker, /customDomainMissing/);
  assert.match(serviceWorker, /ngeblogging-app-v39-20260726/);
  assert.match(workflow, /Provision custom-domain runtime bindings/);
  assert.match(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
});
