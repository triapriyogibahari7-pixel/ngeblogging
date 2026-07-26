import test from "node:test";
import assert from "node:assert/strict";

import {
  handleDomainRequest,
} from "../server/domain-handler.mjs";

const ACCOUNT_ID = "a".repeat(32);
const ZONE_ID = "b".repeat(32);
const SITE_ID =
  "11111111-1111-4111-8111-111111111111";
const USER_ID =
  "22222222-2222-4222-8222-222222222222";

const ENV = {
  CUSTOM_DOMAIN_PROVIDER:
    "cloudflare-full-zone",
  CLOUDFLARE_API_TOKEN:
    "account-token-test",
  CLOUDFLARE_ACCOUNT_ID:
    ACCOUNT_ID,
  CLOUDFLARE_WORKER_SERVICE:
    "ngeblogging",
  SUPABASE_URL:
    "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY:
    "publishable-test",
  SUPABASE_SERVICE_ROLE_KEY:
    "service-role-test",
};

function jsonResponse(
  body,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

test(
  "register full-zone membuat zone pending dan mengembalikan nameserver",
  async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    let insertedDomain = null;

    globalThis.fetch = async (
      input,
      options = {},
    ) => {
      const url = new URL(String(input));
      const method = options.method || "GET";

      calls.push({
        url: url.toString(),
        method,
        body: options.body || null,
      });

      if (
        url.pathname === "/auth/v1/user"
      ) {
        return jsonResponse({
          id: USER_ID,
          email: "owner@example.com",
        });
      }

      if (
        url.pathname === "/rest/v1/site_members"
      ) {
        return jsonResponse([
          {
            role: "owner",
          },
        ]);
      }

      if (
        url.pathname === "/rest/v1/site_domains"
        && method === "GET"
      ) {
        return jsonResponse([]);
      }

      if (
        url.hostname === "api.cloudflare.com"
        && url.pathname === "/client/v4/zones"
        && method === "GET"
      ) {
        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: [],
        });
      }

      if (
        url.hostname === "api.cloudflare.com"
        && url.pathname === "/client/v4/zones"
        && method === "POST"
      ) {
        const requestBody =
          JSON.parse(options.body);

        assert.equal(
          requestBody.name,
          "example.com",
        );

        assert.equal(
          requestBody.account.id,
          ACCOUNT_ID,
        );

        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: ZONE_ID,
            name: "example.com",
            status: "pending",
            name_servers: [
              "alice.ns.cloudflare.com",
              "bob.ns.cloudflare.com",
            ],
            original_name_servers: [
              "ns1.registrar.example",
              "ns2.registrar.example",
            ],
            created_on:
              "2026-07-26T10:00:00Z",
            activated_on: null,
          },
        });
      }

      if (
        url.pathname === "/rest/v1/site_domains"
        && method === "POST"
      ) {
        insertedDomain =
          JSON.parse(options.body);

        return jsonResponse([
          {
            id: crypto.randomUUID(),
            created_at:
              "2026-07-26T10:00:01Z",
            ...insertedDomain,
          },
        ]);
      }

      throw new Error(
        `Fetch tidak terduga: ${method} ${url}`,
      );
    };

    try {
      const request = new Request(
        "https://ngeblogging.com/api/domains/register",
        {
          method: "POST",
          headers: {
            authorization:
              "Bearer user-session-test",
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            siteId: SITE_ID,
            hostname: "example.com",
          }),
        },
      );

      const response =
        await handleDomainRequest(
          request,
          ENV,
          "request-test-full-zone",
        );

      const payload =
        await response.json();

      assert.equal(response.status, 201);
      assert.equal(
        payload.provider,
        "cloudflare-full-zone",
      );
      assert.equal(
        payload.zone.id,
        ZONE_ID,
      );
      assert.equal(
        payload.zone.status,
        "pending",
      );
      assert.deepEqual(
        payload.instructions.nameServers,
        [
          "alice.ns.cloudflare.com",
          "bob.ns.cloudflare.com",
        ],
      );

      assert.equal(
        insertedDomain.provider,
        "cloudflare-full-zone",
      );
      assert.equal(
        insertedDomain.provider_hostname_id,
        ZONE_ID,
      );
      assert.equal(
        insertedDomain.provider_status,
        "pending",
      );
      assert.equal(
        insertedDomain.status,
        "verifying",
      );

      assert.deepEqual(
        insertedDomain
          .ownership_verification
          .required_name_servers,
        [
          "alice.ns.cloudflare.com",
          "bob.ns.cloudflare.com",
        ],
      );

      assert.equal(
        calls.some(
          (call) =>
            call.url.includes(
              "/custom_hostnames",
            ),
        ),
        false,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);
