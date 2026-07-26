import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../src/domain-full-zone-v54.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/domain-full-zone-v54.css", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const quotaBridge = await readFile(new URL("../src/site-quota-bridge.js", import.meta.url), "utf8");
const quotaMigration = await readFile(new URL("../supabase/migrations/20260725150000_expand_all_accounts_to_12_sites.sql", import.meta.url), "utf8");

const requiredEndpoints = [
  "/api/domains/list",
  "/api/domains/register",
  "/api/domains/refresh",
  "/api/domains/address",
  "/api/domains/remove",
];

test("halaman Domain full-zone aktif dan mendukung lepas-pasang per situs", () => {
  for (const endpoint of requiredEndpoints) assert.match(bridge, new RegExp(endpoint.replaceAll("/", "\\/")));
  assert.match(bridge, /confirmFinal/);
  assert.match(bridge, /additional_hostnames/);
  assert.match(bridge, /Tambahkan www atau subdomain/);
  assert.match(bridge, /Verifikasi nameserver/i);
  assert.match(bridge, /ACTIVE_SITE_STORAGE_KEY/);
  assert.match(bridge, /listUserSites/);
  assert.doesNotMatch(bridge, /cloud\.console/i);
  assert.match(index, /domain-full-zone-v54\.css/);
  assert.match(index, /domain-full-zone-v54\.js/);
});

test("tampilan memiliki mode desktop, tablet, mobile, perangkat sentuh, dan reduced motion", () => {
  assert.match(styles, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(styles, /@media\(max-width:1100px\)/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:480px\)/);
  assert.match(styles, /@media\(hover:none\) and \(pointer:coarse\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /\.dfz-switch\.active/);
});

test("batas dua belas situs diterapkan di database dan ditampilkan di UI", () => {
  assert.match(quotaMigration, /select 12;/);
  assert.match(quotaMigration, /owned_count >= allowed_limit/);
  assert.match(quotaMigration, /pg_advisory_xact_lock/);
  assert.match(quotaBridge, /MAX_SITES_PER_ACCOUNT = 12/);
  assert.match(quotaBridge, /KAPASITAS 12 SITUS PER AKUN/);
  assert.match(quotaBridge, /Batas 12 situs tercapai/);
});
