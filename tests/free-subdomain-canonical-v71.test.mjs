import assert from "node:assert/strict";
import test from "node:test";
import { canonicalDomainRedirect } from "../server/canonical-domain-redirect.mjs";

const ENV = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
};

test("active custom domain redirects the persistent free subdomain with path and query intact", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/rest/v1/sites?")) {
      return Response.json([{
        id: "11111111-1111-4111-8111-111111111111",
        slug: "budi",
        custom_domain: "budi.com",
        status: "active",
        is_public: true,
      }]);
    }
    if (url.includes("/rest/v1/site_domains?")) {
      return Response.json([{
        id: "22222222-2222-4222-8222-222222222222",
        hostname: "budi.com",
        status: "active",
        provider_status: "active",
        ssl_status: "active",
        is_primary: true,
      }]);
    }
    return new Response(null, { status: 404 });
  };

  try {
    const response = await canonicalDomainRedirect(
      new Request("https://budi.ngeblogging.com/artikel1?utm_source=google&halaman=2"),
      ENV,
    );

    assert.ok(response);
    assert.equal(response.status, 308);
    assert.equal(
      response.headers.get("location"),
      "https://budi.com/artikel1?utm_source=google&halaman=2",
    );
    assert.equal(response.headers.get("x-ngeblogging-canonical-domain"), "budi.com");
    assert.equal(
      response.headers.get("x-ngeblogging-free-domain-fallback"),
      "available-with-preview-parameter",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("free preview parameter keeps the original subdomain available", async () => {
  const response = await canonicalDomainRedirect(
    new Request("https://budi.ngeblogging.com/artikel1?ngeblogging-free-preview=1"),
    ENV,
  );
  assert.equal(response, null);
});
