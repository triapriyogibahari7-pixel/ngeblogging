import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSiteUrl,
  getTenantSlug,
  isPlatformHost,
  normalizeSiteSlug,
  validateSiteSlug,
} from "../src/lib/subdomain.js";

test("nama situs dinormalisasi menjadi slug subdomain", () => {
  assert.equal(normalizeSiteSlug("  Kopi Enak Pontianak  "), "kopi-enak-pontianak");
});

test("subdomain sistem tidak dapat digunakan", () => {
  assert.equal(validateSiteSlug("admin").valid, false);
  assert.equal(validateSiteSlug("studio").valid, false);
});

test("hostname tenant mengembalikan slug situs", () => {
  assert.equal(getTenantSlug("kopi-enak.ngeblogging.com"), "kopi-enak");
  assert.equal(getTenantSlug("www.ngeblogging.com"), null);
});

test("URL situs gratis menggunakan wildcard ngeblogging.com", () => {
  assert.equal(buildSiteUrl("kopi-enak"), "https://kopi-enak.ngeblogging.com");
});

test("hostname utama dan lokal dikenali sebagai platform", () => {
  assert.equal(isPlatformHost("ngeblogging.com"), true);
  assert.equal(isPlatformHost("localhost:5173"), true);
  assert.equal(isPlatformHost("kopi-enak.ngeblogging.com"), false);
});
