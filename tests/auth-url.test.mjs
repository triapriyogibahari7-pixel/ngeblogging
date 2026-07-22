import test from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_SITE_URL, createAppUrl, resolveSiteOrigin } from "../src/lib/site-url.js";

test("deployment publik selalu kembali ke domain resmi jika env masih localhost", () => {
  assert.equal(
    resolveSiteOrigin("http://localhost:3000", "https://ngeblogging.netlify.app"),
    CANONICAL_SITE_URL,
  );
});

test("development lokal tetap memakai alamat development", () => {
  assert.equal(
    resolveSiteOrigin("http://localhost:3000", "http://localhost:5173"),
    "http://localhost:3000",
  );
});

test("custom production URL yang valid dihormati", () => {
  assert.equal(
    createAppUrl("/?auth=callback", "https://www.ngeblogging.com/", "https://preview.example.com"),
    "https://www.ngeblogging.com/?auth=callback",
  );
});

test("tanpa konfigurasi, callback publik memakai domain kanonis", () => {
  assert.equal(
    createAppUrl("/?auth=recovery", "", "https://ngeblogging.netlify.app"),
    "https://ngeblogging.com/?auth=recovery",
  );
});
