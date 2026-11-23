import test from "node:test";
import assert from "node:assert/strict";

import {
  attachDefaultWorkerDomains,
  deleteFullZone,
  detachWorkerDomain,
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
  const verifications = [];
  const attached = new Map();
  const sequence = [];
  const zoneReads = [];
  const dnsQueries = [];
  const nameservers = ["alice.ns.cloudflare.com", "bob.ns.cloudflare.com"];
  const resolvers = ["cloudflare-dns.com", "dns.google"];

  await withMockFetch(
    async (url, options = {}) => {
      const parsed = new URL(String(url));
      const method = options.method ?? "GET";
      if (resolvers.includes(parsed.hostname)) {
        assert.equal(parsed.protocol, "https:");
        assert.equal(parsed.port, "");
        assert.equal(parsed.pathname, parsed.hostname === "cloudflare-dns.com" ? "/dns-query" : "/resolve");
        assert.equal(method, "GET");
        assert.equal(options.body, undefined);
        assert.equal(options.headers?.authorization, undefined);
        assert.equal(options.headers?.accept, "application/dns-json");
        assert.equal(options.redirect, "manual");
        assert.deepEqual([...parsed.searchParams.keys()].sort(), ["name", "type"]);
        const type = parsed.searchParams.get("type");
        const name = parsed.searchParams.get("name");
        assert.ok(["A", "AAAA", "NS"].includes(type));
        const verifiedHostname = verifications.at(-1);
        assert.ok(attached.has(verifiedHostname), "DNS must follow verified attachment");
        assert.equal(name, type === "NS" ? "example.com" : verifiedHostname);
        dnsQueries.push(`${parsed.hostname}:${name}:${type}`);
        const Answer = type === "NS"
          ? nameservers.map(value => ({name, type: 2, data: value + "."}))
          : type === "A" ? [{name, type: 1, data: "192.0.2.1"}] : [];
        return Response.json({Status: 0, Answer});
      }
      assert.equal(parsed.origin, "https://api.cloudflare.com");
      if (parsed.pathname === `/client/v4/zones/${ZONE_ID}`) {
        assert.equal(method, "GET");
        assert.equal(parsed.search, "");
        assert.equal(options.body, undefined);
        zoneReads.push(parsed.pathname);
        return cloudflareResponse({
          id: ZONE_ID, name: "example.com", status: "active",
          account: {id: ACCOUNT_ID}, name_servers: nameservers,
        });
      }
      assert.equal(parsed.pathname, `/client/v4/accounts/${ACCOUNT_ID}/workers/domains`);
      sequence.push(method);
      if (method === "GET") {
        assert.equal(options.body, undefined);
        const hostname = parsed.searchParams.get("hostname");
        assert.ok(attached.has(hostname), "Verification must follow attachment");
        verifications.push(hostname);
        return cloudflareResponse([attached.get(hostname)]);
      }
      assert.equal(method, "PUT");
      assert.equal(parsed.search, "");
      assert.equal(zoneReads.length, attached.size + 1, "Zone must be checked before each attachment");
      const body = JSON.parse(options.body);
      requests.push({url: String(url), method, body});
      const domain = {
        id: `fixture-domain-${attached.size + 1}`,
        hostname: body.hostname,
        service: body.service,
        zone_id: body.zone_id,
        zone_name: body.zone_name,
      };
      attached.set(body.hostname, domain);
      return cloudflareResponse(domain);
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

      assert.equal(result.apex.hostname, "example.com");
      assert.equal(result.www.hostname, "www.example.com");
      assert.equal(result.apex.id, attached.get("example.com").id);
      assert.equal(result.www.id, attached.get("www.example.com").id);
      for (const domain of [result.apex, result.www]) {
        assert.equal(domain.dns_readiness.ready, true);
        assert.equal(domain.dns_readiness.state, "dns_ready");
        assert.equal(domain.dns_readiness.checks.length, 2);
        assert.equal(domain.dns_readiness.httpsVerified, false);
        assert.equal(domain.dns_readiness.siteContentVerified, false);
        assert.ok(domain.dns_readiness.checks.every(row => row.addressReady && row.nameserversMatch));
      }
    },
  );

  assert.equal(requests.length, 2);
  assert.deepEqual(sequence, ["PUT", "GET", "PUT", "GET"]);
  assert.deepEqual(verifications, ["example.com", "www.example.com"]);
  assert.deepEqual(zoneReads, Array(2).fill(`/client/v4/zones/${ZONE_ID}`));
  const expectedDnsQueries = ["example.com", "www.example.com"].flatMap(name =>
    resolvers.flatMap(resolver => ["A", "AAAA", "NS"].map(type =>
      `${resolver}:${type === "NS" ? "example.com" : name}:${type}`)));
  assert.deepEqual(dnsQueries.sort(), expectedDnsQueries.sort());

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

for (const [label, override, expectedCode] of [
  ["ID zona berbeda", {id: "c".repeat(32)}, "FULL_ZONE_MISMATCH"],
  ["nama domain berbeda", {name: "example.net"}, "FULL_ZONE_MISMATCH"],
  ["akun berbeda", {account: {id: "c".repeat(32)}}, "FULL_ZONE_MISMATCH"],
  ["status provider belum aktif", {status: "pending"}, "ZONE_NOT_ACTIVE"],
]) {
  test(`attachDefaultWorkerDomains menolak ${label} sebelum PUT`, async () => {
    const calls = [];
    await withMockFetch(async (url, options = {}) => {
      const parsed = new URL(String(url));
      calls.push({url: String(url), method: options.method ?? "GET"});
      assert.equal(parsed.origin, "https://api.cloudflare.com");
      assert.equal(parsed.pathname, `/client/v4/zones/${ZONE_ID}`);
      assert.equal(parsed.search, "");
      assert.equal(options.method ?? "GET", "GET");
      assert.equal(options.body, undefined);
      return cloudflareResponse({
        id: ZONE_ID, name: "example.com", status: "active",
        account: {id: ACCOUNT_ID},
        name_servers: ["alice.ns.cloudflare.com", "bob.ns.cloudflare.com"],
        ...override,
      });
    }, async () => {
      await assert.rejects(
        () => attachDefaultWorkerDomains(ENV, {id: ZONE_ID, name: "example.com", status: "active"}),
        error => error?.code === expectedCode,
      );
    });
    assert.equal(calls.length, 1);
    assert.equal(calls.some(call => call.method === "PUT"), false);
  });
}

test("detachWorkerDomain melepaskan hostname dari Worker", async () => {
  const WORKER_DOMAIN_ID =
    "11111111-1111-4111-8111-111111111111";

  const calls = [];

  await withMockFetch(
    async (url, options = {}) => {
      calls.push({
        url: String(url),
        method: options.method || "GET",
      });

      return cloudflareResponse(null);
    },
    async () => {
      const result =
        await detachWorkerDomain(
          ENV,
          WORKER_DOMAIN_ID,
        );

      assert.equal(result, null);
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].method,
    "DELETE",
  );

  assert.equal(
    calls[0].url,
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/domains/${WORKER_DOMAIN_ID}`,
  );
});

test("deleteFullZone menghapus zone melalui endpoint yang benar", async () => {
  const calls = [];

  await withMockFetch(
    async (url, options = {}) => {
      calls.push({
        url: String(url),
        method: options.method || "GET",
      });

      return cloudflareResponse({
        id: ZONE_ID,
      });
    },
    async () => {
      const result =
        await deleteFullZone(
          ENV,
          ZONE_ID,
        );

      assert.equal(
        result.id,
        ZONE_ID,
      );
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].method,
    "DELETE",
  );

  assert.equal(
    calls[0].url,
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}`,
  );
});
