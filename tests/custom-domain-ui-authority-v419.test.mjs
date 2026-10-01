import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("custom domain UI remains installable until the domain is actually active", async () => {
  const [panel, authority, studio] = await Promise.all([
    read("src/DomainPanelV124.jsx"),
    read("src/domain-authority-v75.js"),
    read("src/StudioNext.jsx"),
  ]);

  assert.match(panel, /const activeConnected = connected\.filter\(activeDomain\)/);
  assert.match(panel, /activeConnected\.length \? "Domain pribadi sudah aktif" : "Hubungkan domain pribadi"/);
  assert.match(panel, /connected\.length \? "Domain sebelumnya belum aktif/);
  assert.match(panel, /required_name_servers: nameServers/);
  assert.match(panel, /\/api\/domains\/refresh/);

  assert.match(authority, /DOMAIN_AUTHORITY_V75_COMPATIBILITY_ONLY = true/);
  assert.doesNotMatch(authority, /import\s+["']\.\/domain-manager-v80\.js["']/);
  assert.match(studio, /<DomainPanelV124 site=\{site\} sites=\{sites\}/);
});
