import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v37 loads after v36 as the final Studio authority", async () => {
  const html = await read("index.html");
  assert.ok(html.indexOf("studio-production-audit-v37.css") > html.indexOf("studio-layout-builder-v36.css"));
  assert.ok(html.indexOf("studio-production-audit-v37.js") > html.indexOf("studio-layout-builder-v36.js"));
  assert.equal(html.match(/studio-production-audit-v37\.css/g)?.length, 1);
  assert.equal(html.match(/studio-production-audit-v37\.js/g)?.length, 1);
});

test("backup fix targets the actual BackupCenter DOM instead of obsolete class names", async () => {
  const component = await read("src/BackupCenter.jsx");
  const css = await read("src/studio-production-audit-v37.css");
  for (const marker of [".bc-center", ".bc-summary", ".bc-actions", ".bc-preserve", ".bc-note"]) {
    assert.ok(component.includes(marker.slice(1)), `component ${marker}`);
    assert.ok(css.includes(marker), `css ${marker}`);
  }
  assert.match(css, /#ngeblogging-backup-settings \.bc-summary/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) !important/);
});

test("physical phone, PWA and desktop-site phone receive safe theme and layout geometry", async () => {
  const css = await read("src/studio-production-audit-v37.css");
  for (const marker of [
    'html[data-physical-phone="true"]',
    'html[data-physical-screen-mobile="true"]',
    "html.studio-v30-compact",
    ".tn-card-mock.layout-newsroom main",
    ".lb36-content-row",
    ".lb36-footer-row",
  ]) assert.ok(css.includes(marker), marker);
  assert.match(css, /\.lb36-content-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
});

test("v37 never modifies the locked Studio navigation or Nara widget", async () => {
  const css = await read("src/studio-production-audit-v37.css");
  const runtime = await read("src/studio-production-audit-v37.js");
  for (const forbidden of [".sn-side", ".nara-"]) {
    assert.doesNotMatch(css, new RegExp(forbidden.replace(".", "\\.")));
    assert.doesNotMatch(runtime, new RegExp(forbidden.replace(".", "\\.")));
  }
});

test("analytics is a real server-collected, role-protected dashboard with explicit simulation", async () => {
  const migration = await read("supabase/migrations/20260725170000_real_analytics_and_member_quota.sql");
  const handler = await read("server/analytics-handler.mjs");
  const runtime = await read("src/studio-production-audit-v37.js");
  assert.match(migration, /create table if not exists public\.analytics_events/);
  assert.match(migration, /alter table public\.analytics_events enable row level security/);
  assert.match(migration, /get_site_analytics_dashboard/);
  assert.match(handler, /classification/);
  assert.match(handler, /visitor_hash/);
  assert.doesNotMatch(handler, /raw_ip|ip_address/);
  assert.match(runtime, /get_site_analytics_dashboard/);
  assert.match(runtime, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.match(runtime, /sp37-line-svg/);
  assert.match(runtime, /sp37-donut/);
});

test("member invitations are server verified and hidden until delivery is genuinely ready", async () => {
  const migration = await read("supabase/migrations/20260725170000_real_analytics_and_member_quota.sql");
  const handler = await read("server/member-invite-handler.mjs");
  const config = await read("wrangler.production.jsonc");
  const runtime = await read("src/studio-production-audit-v37.js");
  assert.match(migration, /site_collaborator_limit/);
  assert.match(migration, /select 100/);
  assert.match(migration, /get_site_member_quota/);
  assert.match(handler, /AUTH_MEMBER_INVITES_READY/);
  assert.match(handler, /AUTH_EMAIL_DELIVERY_PROBE/);
  assert.match(handler, /auth\/v1\/invite/);
  assert.match(config, /"AUTH_MEMBER_INVITES_READY": "false"/);
  assert.match(runtime, /state\.memberInvites === true/);
});

test("custom domain panel uses backend DNS values and supports generic valid TLDs", async () => {
  const runtime = await read("src/studio-production-audit-v37.js");
  const backend = await read("server/domain-handler.mjs");
  assert.match(runtime, /1 · Arahkan trafik/);
  assert.match(runtime, /2 · Verifikasi kepemilikan/);
  assert.match(runtime, /domain\.com atau berita\.my\.id/);
  assert.match(runtime, /api\/domains\/register/);
  assert.match(backend, /normalizeHostname/);
  assert.match(backend, /ownershipVerification/);
  assert.match(backend, /sslValidation/);
  assert.doesNotMatch(backend, /\.com\|\.id\|\.my\.id/);
});

test("Ringkasan clearly identifies and switches the active site", async () => {
  const runtime = await read("src/studio-production-audit-v37.js");
  assert.match(runtime, /SITUS YANG SEDANG DIKELOLA/);
  assert.match(runtime, /Ganti situs aktif/);
  assert.match(runtime, /ACTIVE_SITE_STORAGE_KEY/);
  assert.match(runtime, /\.sn-workspace/);
});

test("Cloudflare production worker routes analytics and member invitations", async () => {
  const config = await read("wrangler.production.jsonc");
  const worker = await read("cloudflare/worker-v37.mjs");
  assert.match(config, /worker-v37\.mjs/);
  assert.match(config, /worker-v35\.mjs/);
  assert.match(worker, /api\/analytics\/collect/);
  assert.match(worker, /api\/member-invitations/);
  assert.match(worker, /data-ngeblogging-analytics-v37/);
  assert.match(worker, /resolveSeoSite/);
});

test("PWA cache rotates to v37 and retains v36 compatibility", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v37-20260725/);
  assert.match(sw, /ngeblogging-app-v36-20260725/);
  assert.match(sw, /request\.mode === "navigate"/);
});
