import test from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_SITE_URL, createAppUrl, resolveSiteOrigin } from "../src/lib/site-url.js";

test("deployment publik kembali ke origin aktif jika env masih localhost", () => {
  assert.equal(
    resolveSiteOrigin("http://localhost:3000", "https://ngeblogging.netlify.app"),
    "https://ngeblogging.netlify.app",
  );
});

test("development lokal tetap memakai alamat development", () => {
  assert.equal(
    resolveSiteOrigin("http://localhost:3000", "http://localhost:5173"),
    "http://localhost:3000",
  );
});

test("custom production URL dipakai ketika origin browser tidak tersedia", () => {
  assert.equal(
    createAppUrl("/?auth=callback", "https://www.ngeblogging.com/", ""),
    "https://www.ngeblogging.com/?auth=callback",
  );
});

test("callback publik tetap pada origin yang sedang dipakai", () => {
  assert.equal(
    createAppUrl("/?auth=recovery", "", "https://ngeblogging.netlify.app"),
    "https://ngeblogging.netlify.app/?auth=recovery",
  );
});

test("domain resmi tidak pernah diarahkan kembali ke localhost", () => {
  assert.equal(
    createAppUrl("/?auth=callback", "http://localhost:3000", "https://ngeblogging.com"),
    "https://ngeblogging.com/?auth=callback",
  );
});

test("tanpa origin dan konfigurasi, callback memakai domain kanonis", () => {
  assert.equal(
    createAppUrl("/?auth=callback"),
    `${CANONICAL_SITE_URL}/?auth=callback`,
  );
});
