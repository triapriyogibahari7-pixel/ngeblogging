import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../src/studio-shell-v29.js", import.meta.url), "utf8");
const enhancements = readFileSync(new URL("../src/studio-v9-enhancements.css", import.meta.url), "utf8");

 test("Studio source contains no bottom navigation or mobile more sheet", () => {
  assert.doesNotMatch(studio, /sn-mobile-nav/);
  assert.doesNotMatch(studio, /sn-mobile-sheet-layer/);
  assert.doesNotMatch(studio, /mobileMore/);
  assert.doesNotMatch(studio, /sn-side-bottom/);
  assert.match(secure, /sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(runtime, /sn-mobile-v29-scrim/);
});

test("Studio keeps one React toggle and adds one device-owned n. launcher on compact screens", () => {
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.match(studio, /<Settings\/><span>Pengaturan<\/span>/);
  assert.match(studio, /<LogOut\/><span>Keluar<\/span>/);
  assert.match(secure, /studio-source-navigation-v29-20260725/);
  assert.match(runtime, /source\.dataset\.v29SourceToggle = profile\.compact \? "programmatic" : "visible"/);
  assert.match(runtime, /sn-mobile-v29-launcher/);
  assert.match(runtime, /aria-label", "Buka menu Ngeblogging"/);
  assert.match(enhancements, /\.sn-side > nav \{[\s\S]*flex: 1 1 auto/);
});

test("Nara workspace is visible in the sidebar and duplicate top launchers remain hidden", () => {
  assert.match(secure, /naraRoute\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(secure, /naraRoute\.hidden = false/);
  assert.match(secure, /naraRoute\.disabled = false/);
  assert.match(secure, /naraRoute\.removeAttribute\("aria-hidden"\)/);
  assert.match(secure, /\.sn-top-actions \.sn-nara-button, \.ce-nara/);
  assert.match(secure, /button\.hidden = true/);
  assert.match(runtime, /autoOpenNara/);
  assert.match(runtime, /profile\.compact \? "mini" : "compact"/);
});

test("inactive payment is not rendered as a Studio destination", () => {
  assert.doesNotMatch(studio, /view==="billing"/);
  assert.doesNotMatch(studio, /<BillingView/);
  assert.doesNotMatch(studio, /<span>Pembayaran<\/span>/);
});

test("site owners can find the real public site from header home manager and domain page", () => {
  assert.ok((studio.match(/Lihat situs/g) || []).length >= 3);
  assert.match(studio, /className="sn-view-site"/);
  assert.match(studio, /className="sn-secondary-link" href=\{`https:\/\/\$\{site\.slug\}\.ngeblogging\.com`\}/);
  assert.match(studio, /<Eye\/> Lihat<\/a>/);
  assert.match(studio, /SUBDOMAIN GRATIS/);
  assert.match(enhancements, /\.sn-view-site/);
});
