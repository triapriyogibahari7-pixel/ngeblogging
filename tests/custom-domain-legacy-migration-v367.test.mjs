import test from "node:test";
import assert from "node:assert/strict";

import { handleDomainRequest } from "../server/domain-handler.mjs";

const ACCOUNT_ID = "a".repeat(32);
const ZONE_ID = "b".repeat(32);
const SITE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const DOMAIN_ID = "33333333-3333-4333-8333-333333333333";

const ENV = {
  CUSTOM_DOMAIN_PROVIDER: "cloudflare-full-zone",
  CLOUDFLARE_API_TOKEN: "account-token-test",
  CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
  CLOUDFLARE_WORKER_SERVICE: "ngeblogging",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "publishable-test",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("register custom domain migrates a stale legacy provider row and returns both nameservers", async () => {
  const originalFetch = globalThis.fetch;
  const patches = [];
  const workerAttachments = [];
  const storedDomain = {
    id: DOMAIN_ID,
    site_id: SITE_ID,
    hostname: "example.com",
    status: "failed",
    provider: "cloudflare",
    provider_hostname_id: "legacy-provider-id",
    provider_status: "failed",
    ssl_status: "failed",
    ownership_verification: {},
    ssl_validation: [],
    is_primary: false,
    verified_at: null,
    created_at: "2026-07-26T10:00:00Z",
    updated_at: "2026-07-26T10:00:00Z",
    last_checked_at: null,
    error_message: "legacy provider",
    verification_token: null,
  };

  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || "GET";

    if (url.pathname === "/auth/v1/user") return json({ id: USER_ID });
    if (url.pathname === "/rest/v1/site_members") return json([{ role: "owner" }]);

    if (url.pathname === "/rest/v1/site_domains" && method === "GET") {
      return json([storedDomain]);
    }

    if (url.pathname === "/rest/v1/sites" && method === "PATCH") {
      patches.push({ path: url.pathname, body: JSON.parse(options.body) });
      return json([]);
    }

    if (url.hostname === "api.cloudflare.com" && url.pathname === "/client/v4/zones" && method === "GET") {
      return json({
        success: true,
        result: [{
          id: ZONE_ID,
          name: "example.com",
          status: "pending",
          name_servers: ["alice.ns.cloudflare.com", "bob.ns.cloudflare.com"],
          original_name_servers: ["ns1.registrar.example", "ns2.registrar.example"],
        }],
      });
    }

    if (url.hostname === "api.cloudflare.com" && url.pathname === "/client/v4/zones" && method === "POST") {
      throw new Error("Legacy migration must reuse the existing Cloudflare zone when present.");
    }

    if (url.pathname === "/rest/v1/site_domains" && method === "PATCH") {
      const body = JSON.parse(options.body);
      patches.push({ path: url.pathname, body });
      return json([{ ...storedDomain, ...body }]);
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  };

  try {
    const request = new Request("https://ngeblogging.com/api/domains/register", {
      method: "POST",
      headers: {
        authorization: "Bearer user-session-test",
        "content-type": "application/json",
      },
      body: JSON.stringify({ siteId: SITE_ID, hostname: "example.com" }),
    });

    const response = await handleDomainRequest(request, ENV, "request-legacy-migration");
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.provider, "cloudflare-full-zone");
    assert.equal(payload.migratedFromProvider, "cloudflare");
    assert.deepEqual(payload.instructions.nameServers, [
      "alice.ns.cloudflare.com",
      "bob.ns.cloudflare.com",
    ]);
    assert.equal(payload.domain.provider, "cloudflare-full-zone");
    assert.equal(payload.domain.provider_hostname_id, ZONE_ID);
    assert.deepEqual(payload.domain.ownership_verification.required_name_servers, [
      "alice.ns.cloudflare.com",
      "bob.ns.cloudflare.com",
    ]);
    assert.equal(
      patches.some((item) => item.path === "/rest/v1/sites" && item.body.custom_domain === null),
      true,
    );
    assert.equal(workerAttachments.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
