import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../src/auth-readiness-bridge.js", import.meta.url), "utf8");
const domains = readFileSync(new URL("../src/domain-management-bridge.js", import.meta.url), "utf8");
const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");

test("email signup actions stay absent until branded delivery is proven", () => {
  assert.match(auth, /emailRegistrationReady = health\.emailRegistration === true/);
  assert.match(auth, /leaveSignupMode\(modal\)/);
  assert.match(auth, /\.magic-link-button,\.forgot-link/);
  assert.doesNotMatch(auth, /Email resmi sedang dikunci/);
  assert.doesNotMatch(auth, /auth-readiness-notice[^\n]*innerHTML/);
});

test("custom-domain controls render only after production provisioning is enabled", () => {
  assert.match(domains, /if \(loading \|\| error \|\| !config\?\.enabled\)/);
  assert.match(domains, /container\.hidden = true/);
  assert.match(domains, /container\.hidden = false/);
  assert.doesNotMatch(domains, /Belum dibuka untuk produksi/);
  assert.doesNotMatch(domains, /Pengelolaan domain belum dapat dimuat/);
});

test("free managed subdomain remains visible while inactive payment is removed", () => {
  assert.match(studio, /SUBDOMAIN GRATIS/);
  assert.match(studio, /\.ngeblogging\.com/);
  assert.doesNotMatch(studio, /<span>Pembayaran<\/span>/);
  assert.doesNotMatch(studio, /view==="billing"/);
});
