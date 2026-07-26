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

const DOMAIN_ID =
  "33333333-3333-4333-8333-333333333333";

const ENV = {
  CUSTOM_DOMAIN_PROVIDER:
    "cloudflare-full-zone",
  CLOUDFLARE_API_TOKEN:
    "token-test",
  CLOUDFLARE_ACCOUNT_ID:
    ACCOUNT_ID,
  CLOUDFLARE_WORKER_SERVICE:
    "ngeblogging",
  SUPABASE_URL:
    "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY:
    "publishable-test",
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
        "content-type":
          "application/json",
      },
    },
  );
}

function activeDomain(
  overrides = {},
) {
  return {
    id: DOMAIN_ID,
    site_id: SITE_ID,
    hostname: "example.com",
    status: "active",
    provider:
      "cloudflare-full-zone",
    provider_hostname_id:
      ZONE_ID,
    provider_status: "active",
    ssl_status: "active",
    ownership_verification: {
      method: "nameserver",
      additional_hostnames: [],
    },
    ssl_validation: [
      {
        id: "apex-domain-id",
        certificateId:
          "apex-cert-id",
        hostname: "example.com",
        service: "ngeblogging",
      },
    ],
    is_primary: true,
    verified_at:
      "2026-07-26T10:00:00Z",
    created_at:
      "2026-07-26T09:00:00Z",
    updated_at:
      "2026-07-26T10:00:00Z",
    last_checked_at:
      "2026-07-26T10:00:00Z",
    error_message: null,
    verification_token: null,
    ...overrides,
  };
}

function zoneResponse() {
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

test(
  "alamat tambahan bertingkat memakai Worker Domain dan JWT pengguna",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const domain =
      activeDomain();

    let workerRequest = null;
    let savedUpdate = null;
    let databaseAuthorization = null;

    globalThis.fetch = async (
      input,
      options = {},
    ) => {
      const url =
        new URL(String(input));

      const method =
        options.method || "GET";

      if (
        url.pathname
        === "/auth/v1/user"
      ) {
        return jsonResponse({
          id: USER_ID,
        });
      }

      if (
        url.pathname
          === "/rest/v1/site_domains"
        && method === "GET"
      ) {
        databaseAuthorization =
          options.headers.authorization;

        return jsonResponse([
          domain,
        ]);
      }

      if (
        url.pathname
          === "/rest/v1/site_members"
        && method === "GET"
      ) {
        return jsonResponse([
          {
            role: "owner",
          },
        ]);
      }

      if (
        url.hostname
          === "api.cloudflare.com"
        && url.pathname
          === `/client/v4/zones/${ZONE_ID}`
        && method === "GET"
      ) {
        return zoneResponse();
      }

      if (
        url.hostname
          === "api.cloudflare.com"
        && url.pathname
          === `/client/v4/accounts/${ACCOUNT_ID}/workers/domains`
        && method === "PUT"
      ) {
        workerRequest =
          JSON.parse(options.body);

        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: {
            id:
              "docs-tim-worker-domain-id",
            cert_id:
              "docs-tim-certificate-id",
            hostname:
              workerRequest.hostname,
            service:
              workerRequest.service,
            zone_id:
              workerRequest.zone_id,
            zone_name:
              workerRequest.zone_name,
          },
        });
      }

      if (
        url.pathname
          === "/rest/v1/site_domains"
        && method === "PATCH"
      ) {
        savedUpdate =
          JSON.parse(options.body);

        return jsonResponse([
          {
            ...domain,
            ...savedUpdate,
          },
        ]);
      }

      throw new Error(
        `Fetch tidak terduga: ${method} ${url}`,
      );
    };

    try {
      const request = new Request(
        "https://ngeblogging.com/api/domains/address",
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
            host: "docs.tim",
            enabled: true,
          }),
        },
      );

      const result =
        await handleDomainRequest(
          request,
          ENV,
          "address-enable-test",
        );

      const payload =
        await result.json();

      assert.equal(
        result.status,
        200,
      );

      assert.equal(
        workerRequest.hostname,
        "docs.tim.example.com",
      );

      assert.equal(
        payload.address.host,
        "docs.tim",
      );

      assert.equal(
        payload.address.enabled,
        true,
      );

      assert.equal(
        savedUpdate
          .ownership_verification
          .additional_hostnames[0]
          .hostname,
        "docs.tim.example.com",
      );

      assert.equal(
        databaseAuthorization,
        "Bearer user-session-test",
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  },
);

test(
  "www dapat dinonaktifkan dan dilepaskan dari Worker",
  async () => {
    const originalFetch =
      globalThis.fetch;

    const WWW_ID =
      "www-worker-domain-id";

    const domain =
      activeDomain({
        ownership_verification: {
          method: "nameserver",
          additional_hostnames: [
            {
              host: "www",
              hostname:
                "www.example.com",
              enabled: true,
              workerDomainId:
                WWW_ID,
            },
          ],
        },
        ssl_validation: [
          {
            id: "apex-domain-id",
            hostname: "example.com",
          },
          {
            id: WWW_ID,
            hostname:
              "www.example.com",
          },
        ],
      });

    let detachedId = null;
    let savedUpdate = null;

    globalThis.fetch = async (
      input,
      options = {},
    ) => {
      const url =
        new URL(String(input));

      const method =
        options.method || "GET";

      if (
        url.pathname
        === "/auth/v1/user"
      ) {
        return jsonResponse({
          id: USER_ID,
        });
      }

      if (
        url.pathname
          === "/rest/v1/site_domains"
        && method === "GET"
      ) {
        return jsonResponse([
          domain,
        ]);
      }

      if (
        url.pathname
          === "/rest/v1/site_members"
        && method === "GET"
      ) {
        return jsonResponse([
          {
            role: "owner",
          },
        ]);
      }

      if (
        url.hostname
          === "api.cloudflare.com"
        && url.pathname
          === `/client/v4/zones/${ZONE_ID}`
        && method === "GET"
      ) {
        return zoneResponse();
      }

      if (
        url.hostname
          === "api.cloudflare.com"
        && url.pathname.startsWith(
          `/client/v4/accounts/${ACCOUNT_ID}/workers/domains/`,
        )
        && method === "DELETE"
      ) {
        detachedId =
          url.pathname.split("/").at(-1);

        return jsonResponse({
          success: true,
          errors: [],
          messages: [],
          result: null,
        });
      }

      if (
        url.pathname
          === "/rest/v1/site_domains"
        && method === "PATCH"
      ) {
        savedUpdate =
          JSON.parse(options.body);

        return jsonResponse([
          {
            ...domain,
            ...savedUpdate,
          },
        ]);
      }

      throw new Error(
        `Fetch tidak terduga: ${method} ${url}`,
      );
    };

    try {
      const request = new Request(
        "https://ngeblogging.com/api/domains/address",
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
            host: "www",
            enabled: false,
          }),
        },
      );

      const result =
        await handleDomainRequest(
          request,
          ENV,
          "address-disable-test",
        );

      const payload =
        await result.json();

      assert.equal(
        result.status,
        200,
      );

      assert.equal(
        detachedId,
        WWW_ID,
      );

      assert.equal(
        payload.address.enabled,
        false,
      );

      assert.equal(
        savedUpdate.ssl_validation
          .some(
            (record) =>
              record.hostname
              === "www.example.com",
          ),
        false,
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  },
);
