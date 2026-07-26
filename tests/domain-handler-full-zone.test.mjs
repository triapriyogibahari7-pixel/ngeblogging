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

test(
  "refresh full-zone aktif memasang apex dan www ke Worker",
  async () => {
    const DOMAIN_ID =
      "33333333-3333-4333-8333-333333333333";

    const originalFetch =
      globalThis.fetch;

    const attachedHostnames = [];
    let savedDomainUpdate = null;

    const storedDomain = {
      id: DOMAIN_ID,
      site_id: SITE_ID,
      hostname: "example.com",
      status: "verifying",
      provider:
        "cloudflare-full-zone",
      provider_hostname_id: ZONE_ID,
      provider_status: "pending",
      ssl_status: "pending",
      ownership_verification: {},
      ssl_validation: [],
      is_primary: false,
      verified_at: null,
      created_at:
        "2026-07-26T10:00:01Z",
      updated_at:
        "2026-07-26T10:00:01Z",
      last_checked_at:
        "2026-07-26T10:00:01Z",
      error_message: null,
      verification_token: null,
    };

    globalThis.fetch = async (
      input,
      options = {},
    ) => {
      const url =
        new URL(String(input));
      const method =
        options.method || "GET";

      if (
        url.pathname ===
        "/auth/v1/user"
      ) {
        return jsonResponse({
          id: USER_ID,
          email: "owner@example.com",
        });
      }

      if (
        url.pathname ===
        "/rest/v1/site_domains"
        && method === "GET"
      ) {
        return jsonResponse([
          storedDomain,
        ]);
      }

      if (
        url.pathname ===
        "/rest/v1/site_members"
        && method === "GET"
      ) {
        return jsonResponse([
          {
            role: "owner",
          },
        ]);
      }

      if (
        url.hostname ===
          "api.cloudflare.com"
        && url.pathname ===
          `/client/v4/zones/${ZONE_ID}`
        && method === "GET"
      ) {
        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: ZONE_ID,
            name: "example.com",
            status: "active",
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
            activated_on:
              "2026-07-26T11:00:00Z",
          },
        });
      }

      if (
        url.hostname ===
          "api.cloudflare.com"
        && url.pathname ===
          `/client/v4/accounts/${ACCOUNT_ID}/workers/domains`
        && method === "PUT"
      ) {
        const body =
          JSON.parse(options.body);

        attachedHostnames.push(
          body.hostname,
        );

        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: crypto.randomUUID(),
            cert_id:
              crypto.randomUUID(),
            hostname: body.hostname,
            service: body.service,
            zone_id: body.zone_id,
            zone_name: body.zone_name,
          },
        });
      }

      if (
        url.pathname ===
          "/rest/v1/site_domains"
        && method === "PATCH"
      ) {
        const body =
          JSON.parse(options.body);

        if (
          url.searchParams.get("id")
          === `eq.${DOMAIN_ID}`
        ) {
          savedDomainUpdate = body;

          return jsonResponse([
            {
              ...storedDomain,
              ...body,
            },
          ]);
        }

        return jsonResponse([]);
      }

      if (
        url.pathname ===
          "/rest/v1/sites"
        && method === "PATCH"
      ) {
        return jsonResponse([]);
      }

      throw new Error(
        `Fetch tidak terduga: ${method} ${url}`,
      );
    };

    try {
      const request = new Request(
        "https://ngeblogging.com/api/domains/refresh",
        {
          method: "POST",
          headers: {
            authorization:
              "Bearer user-session-test",
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            domainId: DOMAIN_ID,
          }),
        },
      );

      const response =
        await handleDomainRequest(
          request,
          ENV,
          "request-test-refresh",
        );

      const payload =
        await response.json();

      assert.equal(
        response.status,
        200,
      );

      assert.equal(
        payload.zone.status,
        "active",
      );

      assert.equal(
        payload.attached,
        true,
      );

      assert.deepEqual(
        attachedHostnames,
        [
          "example.com",
          "www.example.com",
        ],
      );

      assert.equal(
        savedDomainUpdate.status,
        "active",
      );

      assert.equal(
        savedDomainUpdate
          .provider_status,
        "active",
      );

      assert.equal(
        savedDomainUpdate.ssl_status,
        "active",
      );

      assert.equal(
        savedDomainUpdate.is_primary,
        true,
      );

      assert.ok(
        savedDomainUpdate.verified_at,
      );

      assert.equal(
        savedDomainUpdate
          .ssl_validation.length,
        2,
      );

      assert.equal(
        payload.workerDomains
          .apex.hostname,
        "example.com",
      );

      assert.equal(
        payload.workerDomains
          .www.hostname,
        "www.example.com",
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  },
);

test(
  "remove full-zone melepaskan Worker tetapi tidak menghapus zone",
  async () => {
    const DOMAIN_ID =
      "44444444-4444-4444-8444-444444444444";

    const APEX_WORKER_DOMAIN_ID =
      "55555555-5555-4555-8555-555555555555";

    const WWW_WORKER_DOMAIN_ID =
      "66666666-6666-4666-8666-666666666666";

    const originalFetch =
      globalThis.fetch;

    const detachedIds = [];
    const zoneDeleteCalls = [];
    let savedDomainUpdate = null;
    let savedSiteUpdate = null;

    const storedDomain = {
      id: DOMAIN_ID,
      site_id: SITE_ID,
      hostname: "example.com",
      status: "active",
      provider:
        "cloudflare-full-zone",
      provider_hostname_id: ZONE_ID,
      provider_status: "active",
      ssl_status: "active",
      ownership_verification: {
        method: "nameserver",
        required_name_servers: [
          "alice.ns.cloudflare.com",
          "bob.ns.cloudflare.com",
        ],
      },
      ssl_validation: [
        {
          id: APEX_WORKER_DOMAIN_ID,
          hostname: "example.com",
        },
        {
          id: WWW_WORKER_DOMAIN_ID,
          hostname: "www.example.com",
        },
      ],
      is_primary: true,
      verified_at:
        "2026-07-26T11:00:00Z",
      created_at:
        "2026-07-26T10:00:00Z",
      updated_at:
        "2026-07-26T11:00:00Z",
      last_checked_at:
        "2026-07-26T11:00:00Z",
      error_message: null,
      verification_token: null,
    };

    globalThis.fetch = async (
      input,
      options = {},
    ) => {
      const url =
        new URL(String(input));

      const method =
        options.method || "GET";

      if (
        url.pathname ===
        "/auth/v1/user"
      ) {
        return jsonResponse({
          id: USER_ID,
          email: "owner@example.com",
        });
      }

      if (
        url.pathname ===
          "/rest/v1/site_domains"
        && method === "GET"
      ) {
        return jsonResponse([
          storedDomain,
        ]);
      }

      if (
        url.pathname ===
          "/rest/v1/site_members"
        && method === "GET"
      ) {
        return jsonResponse([
          {
            role: "owner",
          },
        ]);
      }

      if (
        url.hostname ===
          "api.cloudflare.com"
        && url.pathname.startsWith(
          `/client/v4/accounts/${ACCOUNT_ID}/workers/domains/`,
        )
        && method === "DELETE"
      ) {
        detachedIds.push(
          url.pathname.split("/").at(-1),
        );

        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: null,
        });
      }

      if (
        url.hostname ===
          "api.cloudflare.com"
        && url.pathname ===
          `/client/v4/zones/${ZONE_ID}`
        && method === "DELETE"
      ) {
        zoneDeleteCalls.push(
          url.toString(),
        );

        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: ZONE_ID,
          },
        });
      }

      if (
        url.pathname ===
          "/rest/v1/site_domains"
        && method === "PATCH"
      ) {
        savedDomainUpdate =
          JSON.parse(options.body);

        return jsonResponse([
          {
            ...storedDomain,
            ...savedDomainUpdate,
          },
        ]);
      }

      if (
        url.pathname ===
          "/rest/v1/sites"
        && method === "PATCH"
      ) {
        savedSiteUpdate =
          JSON.parse(options.body);

        return jsonResponse([]);
      }

      throw new Error(
        `Fetch tidak terduga: ${method} ${url}`,
      );
    };

    try {
      const request = new Request(
        "https://ngeblogging.com/api/domains/remove",
        {
          method: "POST",
          headers: {
            authorization:
              "Bearer user-session-test",
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            domainId: DOMAIN_ID,
          }),
        },
      );

      const response =
        await handleDomainRequest(
          request,
          ENV,
          "request-test-remove",
        );

      const payload =
        await response.json();

      assert.equal(
        response.status,
        202,
      );

      assert.deepEqual(
        detachedIds.sort(),
        [
          APEX_WORKER_DOMAIN_ID,
          WWW_WORKER_DOMAIN_ID,
        ].sort(),
      );

      assert.equal(
        zoneDeleteCalls.length,
        0,
      );

      assert.equal(
        savedDomainUpdate.status,
        "pending_deletion",
      );

      assert.equal(
        savedDomainUpdate.is_primary,
        false,
      );

      assert.equal(
        savedDomainUpdate.verified_at,
        null,
      );

      assert.deepEqual(
        savedDomainUpdate.ssl_validation,
        [],
      );

      assert.equal(
        savedSiteUpdate.custom_domain,
        null,
      );

      assert.equal(
        payload.removal.zoneDeleted,
        false,
      );

      assert.equal(
        payload.removal
          .finalConfirmationRequired,
        true,
      );

      assert.equal(
        payload
          .detachedWorkerDomainCount,
        2,
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  },
);

test(
  "konfirmasi final menolak zone yang masih aktif",
  async () => {
    const DOMAIN_ID =
      "77777777-7777-4777-8777-777777777777";

    const originalFetch =
      globalThis.fetch;

    let zoneDeleteCount = 0;

    const storedDomain = {
      id: DOMAIN_ID,
      site_id: SITE_ID,
      hostname: "example.com",
      status: "pending_deletion",
      provider:
        "cloudflare-full-zone",
      provider_hostname_id: ZONE_ID,
      provider_status: "active",
      ssl_status: "pending",
      ownership_verification: {},
      ssl_validation: [],
      is_primary: false,
      verified_at: null,
      created_at:
        "2026-07-26T10:00:00Z",
      updated_at:
        "2026-07-26T12:00:00Z",
      last_checked_at:
        "2026-07-26T12:00:00Z",
      error_message: null,
      verification_token: null,
    };

    globalThis.fetch = async (
      input,
      options = {},
    ) => {
      const url =
        new URL(String(input));

      const method =
        options.method || "GET";

      if (
        url.pathname ===
        "/auth/v1/user"
      ) {
        return jsonResponse({
          id: USER_ID,
        });
      }

      if (
        url.pathname ===
          "/rest/v1/site_domains"
        && method === "GET"
      ) {
        return jsonResponse([
          storedDomain,
        ]);
      }

      if (
        url.pathname ===
          "/rest/v1/site_members"
        && method === "GET"
      ) {
        return jsonResponse([
          {
            role: "owner",
          },
        ]);
      }

      if (
        url.hostname ===
          "api.cloudflare.com"
        && url.pathname ===
          `/client/v4/zones/${ZONE_ID}`
        && method === "GET"
      ) {
        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: ZONE_ID,
            name: "example.com",
            status: "active",
            name_servers: [
              "alice.ns.cloudflare.com",
              "bob.ns.cloudflare.com",
            ],
          },
        });
      }

      if (
        url.hostname ===
          "api.cloudflare.com"
        && url.pathname ===
          `/client/v4/zones/${ZONE_ID}`
        && method === "DELETE"
      ) {
        zoneDeleteCount += 1;

        return jsonResponse({
          success: true,
          result: {
            id: ZONE_ID,
          },
        });
      }

      throw new Error(
        `Fetch tidak terduga: ${method} ${url}`,
      );
    };

    try {
      const request = new Request(
        "https://ngeblogging.com/api/domains/remove",
        {
          method: "POST",
          headers: {
            authorization:
              "Bearer user-session-test",
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            domainId: DOMAIN_ID,
            confirmFinal: true,
            confirmation:
              "example.com",
          }),
        },
      );

      const response =
        await handleDomainRequest(
          request,
          ENV,
          "request-final-active",
        );

      const payload =
        await response.json();

      assert.equal(
        response.status,
        409,
      );

      assert.equal(
        payload.code,
        "FULL_ZONE_STILL_AUTHORITATIVE",
      );

      assert.equal(
        payload.zone.status,
        "active",
      );

      assert.equal(
        zoneDeleteCount,
        0,
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  },
);

test(
  "konfirmasi final menghapus zone moved dan data domain",
  async () => {
    const DOMAIN_ID =
      "88888888-8888-4888-8888-888888888888";

    const originalFetch =
      globalThis.fetch;

    let zoneDeleteCount = 0;
    let domainDeleteCount = 0;
    let siteCleared = false;

    const storedDomain = {
      id: DOMAIN_ID,
      site_id: SITE_ID,
      hostname: "example.com",
      status: "pending_deletion",
      provider:
        "cloudflare-full-zone",
      provider_hostname_id: ZONE_ID,
      provider_status: "moved",
      ssl_status: "pending",
      ownership_verification: {},
      ssl_validation: [],
      is_primary: false,
      verified_at: null,
      created_at:
        "2026-07-26T10:00:00Z",
      updated_at:
        "2026-07-26T12:00:00Z",
      last_checked_at:
        "2026-07-26T12:00:00Z",
      error_message: null,
      verification_token: null,
    };

    globalThis.fetch = async (
      input,
      options = {},
    ) => {
      const url =
        new URL(String(input));

      const method =
        options.method || "GET";

      if (
        url.pathname ===
        "/auth/v1/user"
      ) {
        return jsonResponse({
          id: USER_ID,
        });
      }

      if (
        url.pathname ===
          "/rest/v1/site_domains"
        && method === "GET"
      ) {
        return jsonResponse([
          storedDomain,
        ]);
      }

      if (
        url.pathname ===
          "/rest/v1/site_members"
        && method === "GET"
      ) {
        return jsonResponse([
          {
            role: "owner",
          },
        ]);
      }

      if (
        url.hostname ===
          "api.cloudflare.com"
        && url.pathname ===
          `/client/v4/zones/${ZONE_ID}`
        && method === "GET"
      ) {
        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: ZONE_ID,
            name: "example.com",
            status: "moved",
            name_servers: [
              "alice.ns.cloudflare.com",
              "bob.ns.cloudflare.com",
            ],
          },
        });
      }

      if (
        url.hostname ===
          "api.cloudflare.com"
        && url.pathname ===
          `/client/v4/zones/${ZONE_ID}`
        && method === "DELETE"
      ) {
        zoneDeleteCount += 1;

        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: ZONE_ID,
          },
        });
      }

      if (
        url.pathname ===
          "/rest/v1/site_domains"
        && method === "DELETE"
      ) {
        domainDeleteCount += 1;

        return jsonResponse([]);
      }

      if (
        url.pathname ===
          "/rest/v1/sites"
        && method === "PATCH"
      ) {
        const body =
          JSON.parse(options.body);

        siteCleared =
          body.custom_domain === null;

        return jsonResponse([]);
      }

      throw new Error(
        `Fetch tidak terduga: ${method} ${url}`,
      );
    };

    try {
      const request = new Request(
        "https://ngeblogging.com/api/domains/remove",
        {
          method: "POST",
          headers: {
            authorization:
              "Bearer user-session-test",
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            domainId: DOMAIN_ID,
            confirmFinal: true,
            confirmation:
              "example.com",
          }),
        },
      );

      const response =
        await handleDomainRequest(
          request,
          ENV,
          "request-final-moved",
        );

      const payload =
        await response.json();

      assert.equal(
        response.status,
        200,
      );

      assert.equal(
        payload.removed,
        true,
      );

      assert.equal(
        payload.zoneDeleted,
        true,
      );

      assert.equal(
        zoneDeleteCount,
        1,
      );

      assert.equal(
        domainDeleteCount,
        1,
      );

      assert.equal(
        siteCleared,
        true,
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  },
);
