import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canonicalDomainsForSite, selectActiveSite } from "../src/lib/domain-scope-v112.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Domain v112 renders one authority and never mounts the legacy custom-domain panel", async () => {
  const [studio, secure, manager, auditLegacy, authorityCss, authorityRuntime, worker] = await Promise.all([
    read("src/StudioNext.jsx"),
    read("src/StudioSecure.jsx"),
    read("src/domain-manager-v80.js"),
    read("src/studio-production-audit-v37.js"),
    read("src/studio-domain-single-authority-v112.css"),
    read("src/studio-domain-single-authority-v112.js"),
    read("public/sw.js"),
  ]);

  assert.match(studio, /data-domain-manager-host-v112="true"/);
  assert.match(studio, /Hanya domain milik situs aktif/);
  assert.doesNotMatch(studio, /Hubungkan custom domain|Target CNAME resmi Ngeblogging/);
  assert.match(secure, /studio-domain-single-authority-v112\.css/);
  assert.match(secure, /studio-domain-single-authority-v112\.js/);
  assert.match(manager, /data-domain-manager-host-v112/);
  assert.match(manager, /domain-manager-v112-20260728/);
  assert.match(auditLegacy, /sp37DomainDisabled/);
  assert.doesNotMatch(auditLegacy, /if \(domain\) enhanceDomain\(domain\)/);
  assert.match(authorityCss, /\.sp37-domain-host/);
  assert.match(authorityCss, />\.d80-host/);
  assert.match(authorityRuntime, /LEGACY_SELECTORS/);
  assert.match(authorityRuntime, /node\.remove\(\)/);
  assert.match(worker, /ngeblogging-app-v112-20260728/);
  assert.match(worker, /domain-single-authority-v112-20260728/);
  assert.match(worker, /pwa-v112/);
});

test("12 sites in one account only expose the selected site's one root domain", () => {
  const sites = Array.from({ length: 12 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    slug: `situs-${index + 1}`,
    name: `Situs ${index + 1}`,
  }));
  const domains = sites.map((site, index) => ({
    id: `domain-${index + 1}`,
    site_id: site.id,
    hostname: `domain-${index + 1}.com`,
    status: "active",
    provider_status: "active",
    ssl_status: "active",
    is_primary: true,
    created_at: new Date(2026, 6, index + 1).toISOString(),
  }));
  domains.push({ ...domains[6], id: "duplicate-old", hostname: "old-domain-7.com", is_primary: false, status: "verifying", created_at: "2026-01-01T00:00:00Z" });

  const selected = selectActiveSite(sites, sites[6].id, sites[0]);
  const visible = canonicalDomainsForSite(domains, selected.id);
  assert.equal(selected.id, sites[6].id);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].hostname, "domain-7.com");
  assert.ok(visible.every((domain) => domain.site_id === selected.id));
});

test("server domain handler enforces one root domain per site and provides server-side audit", async () => {
  const [handler, worker] = await Promise.all([read("server/domain-handler-v112.mjs"), read("cloudflare/worker.mjs")]);
  for (const marker of [
    "SITE_DOMAIN_LIMIT_REACHED",
    "enforceOneDomainPerSite",
    "canonicalDomains",
    "/api/domains/audit",
    "domain-single-site-audit-v112-20260728",
    "HTML publik berhasil dimuat melalui HTTPS",
  ]) assert.ok(handler.includes(marker), marker);
  assert.match(handler, /baseList\(request, env, requestId, siteId\)/);
  assert.match(handler, /canonicalDomains\(payload\.domains, siteId\)/);
  assert.match(worker, /domain-handler-v112\.mjs/);
});
