import test from "node:test";
import assert from "node:assert/strict";

import {
  attachDefaultWorkerDomains,
  fullZoneProviderReady,
  getOrCreateFullZone,
  normalizeZoneName,
  publicZoneState,
} from "../server/cloudflare-full-zone-provider.mjs";

const ACCOUNT_ID = "a".repeat(32);
const ZONE_ID = "b".repeat(32);

const ENV = {
  CLOUDFLARE_API_TOKEN: "token-test-tidak-dikirim",
  CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
  CLOUDFLARE_WORKER_SERVICE: "ngeblogging",
};

function cloudflareResponse(result, status = 200) {
  return new Response(
    JSON.stringify({
      success: status >= 200 && status < 300,
      errors: [],
      messages: [],
      result,
    }),
    {
      status,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

async function withMockFetch(mockFetch, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("normalizeZoneName membersihkan domain akar", () => {
  assert.equal(
    normalizeZoneName(" Example.COM. "),
    "example.com",
  );

  assert.equal(
    normalizeZoneName("https://contoh.id"),
    "contoh.id",
  );
});

test("normalizeZoneName menolak www, path, dan subdomain Ngeblogging", () => {
  assert.throws(
    () => normalizeZoneName("www.example.com"),
    (error) => error?.code === "INVALID_ROOT_DOMAIN",
  );

  assert.throws(
    () => normalizeZoneName("example.com/artikel"),
    (error) => error?.code === "INVALID_DOMAIN",
  );

  assert.throws(
    () => normalizeZoneName("toko.ngeblogging.com"),
    (error) => error?.code === "USE_MANAGED_SUBDOMAIN",
  );
});

test("publicZoneState hanya mengembalikan data aman untuk frontend", () => {
  const state = publicZoneState({
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
    created_on: "2026-07-26T10:00:00Z",
    activated_on: null,
    data_rahasia: "tidak-boleh-keluar",
  });

  assert.deepEqual(state, {
    id: ZONE_ID,
    name: "example.com",
    status: "pending",
    active: false,
    nameServers: [
      "alice.ns.cloudflare.com",
      "bob.ns.cloudflare.com",
    ],
    originalNameServers: [
      "ns1.registrar.example",
      "ns2.registrar.example",
    ],
    createdOn: "2026-07-26T10:00:00Z",
    activatedOn: null,
  });

  assert.equal("data_rahasia" in state, false);
});

test("fullZoneProviderReady memeriksa konfigurasi", () => {
  assert.equal(fullZoneProviderReady({}), false);

  assert.equal(
    fullZoneProviderReady({
      CLOUDFLARE_API_TOKEN: "token-test",
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
    }),
    true,
  );
});

test("getOrCreateFullZone memakai zone lama jika sudah ada", async () => {
  const calls = [];

  await withMockFetch(
    async (url, options = {}) => {
      calls.push({
        url: String(url),
        options,
      });

      return cloudflareResponse([
        {
          id: ZONE_ID,
          name: "example.com",
          status: "pending",
          name_servers: [
            "alice.ns.cloudflare.com",
            "bob.ns.cloudflare.com",
          ],
        },
      ]);
    },
    async () => {
      const result = await getOrCreateFullZone(
        ENV,
        "example.com",
      );

      assert.equal(result.reused, true);
      assert.equal(result.zone.id, ZONE_ID);
      assert.equal(result.zone.name, "example.com");
    },
  );

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/zones\?/);
  assert.equal(calls[0].options.method ?? "GET", "GET");
});

test("getOrCreateFullZone membuat zone jika belum ditemukan", async () => {
  const calls = [];

  await withMockFetch(
    async (url, options = {}) => {
      calls.push({
        url: String(url),
        options,
      });

      if ((options.method ?? "GET") === "GET") {
        return cloudflareResponse([]);
      }

      const requestBody = JSON.parse(options.body);

      assert.equal(options.method, "POST");
      assert.equal(requestBody.name, "example.com");
      assert.equal(requestBody.type, "full");
      assert.equal(requestBody.account.id, ACCOUNT_ID);

      return cloudflareResponse({
        id: ZONE_ID,
        name: "example.com",
        status: "pending",
        name_servers: [
          "alice.ns.cloudflare.com",
          "bob.ns.cloudflare.com",
        ],
      });
    },
    async () => {
      const result = await getOrCreateFullZone(
        ENV,
        "example.com",
      );

      assert.equal(result.reused, false);
      assert.equal(result.zone.id, ZONE_ID);
      assert.equal(result.zone.status, "pending");
    },
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, "POST");
});

test("attachDefaultWorkerDomains menolak zone yang belum aktif", async () => {
  await assert.rejects(
    () =>
      attachDefaultWorkerDomains(ENV, {
        id: ZONE_ID,
        name: "example.com",
        status: "pending",
      }),
    (error) => error?.code === "ZONE_NOT_ACTIVE",
  );
});

test("attachDefaultWorkerDomains memasang apex dan www", async () => {
  const requests = [];

  await withMockFetch(
    async (url, options = {}) => {
      const body = JSON.parse(options.body);

      requests.push({
        url: String(url),
        method: options.method,
        body,
      });

      return cloudflareResponse({
        id: crypto.randomUUID(),
        hostname: body.hostname,
        service: body.service,
        zone_id: body.zone_id,
        zone_name: body.zone_name,
      });
    },
    async () => {
      const result = await attachDefaultWorkerDomains(
        ENV,
        {
          id: ZONE_ID,
          name: "example.com",
          status: "active",
        },
      );

      assert.equal(
        result.apex.hostname,
        "example.com",
      );

      assert.equal(
        result.www.hostname,
        "www.example.com",
      );
    },
  );

  assert.equal(requests.length, 2);

  assert.deepEqual(
    requests.map((request) => request.body.hostname),
    [
      "example.com",
      "www.example.com",
    ],
  );

  for (const request of requests) {
    assert.equal(request.method, "PUT");
    assert.match(
      request.url,
      new RegExp(
        `/accounts/${ACCOUNT_ID}/workers/domains$`,
      ),
    );
    assert.equal(request.body.service, "ngeblogging");
    assert.equal(request.body.zone_id, ZONE_ID);
    assert.equal(request.body.zone_name, "example.com");
  }
});
