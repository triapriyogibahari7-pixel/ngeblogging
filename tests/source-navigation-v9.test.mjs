import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");

test("Studio source contains no bottom navigation or mobile more sheet", () => {
  assert.doesNotMatch(studio, /sn-mobile-nav/);
  assert.doesNotMatch(studio, /sn-mobile-sheet-layer/);
  assert.doesNotMatch(studio, /mobileMore/);
  assert.doesNotMatch(studio, /sn-side-bottom/);
});

test("Studio has exactly one sidebar toggle and keeps settings and sign out in the main sidebar", () => {
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.match(studio, /<Settings\/><span>Pengaturan<\/span>/);
  assert.match(studio, /<LogOut\/><span>Keluar<\/span>/);
  assert.match(secure, /studio-source-navigation-v9-20260724/);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
});

test("inactive payment is not rendered as a Studio destination", () => {
  assert.doesNotMatch(studio, /view==="billing"/);
  assert.doesNotMatch(studio, /<BillingView/);
  assert.doesNotMatch(studio, /<span>Pembayaran<\/span>/);
});
