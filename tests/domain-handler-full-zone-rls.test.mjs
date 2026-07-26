import test from "node:test";
import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

const source = await readFile(
  new URL(
    "../server/domain-handler.mjs",
    import.meta.url,
  ),
  "utf8",
);

test(
  "full-zone domain handler memakai JWT pengguna dan Supabase RLS",
  () => {
    assert.match(
      source,
      /DOMAIN_USER_TOKEN/,
    );

    assert.match(
      source,
      /authorization: `Bearer \$\{token\}`/,
    );

    assert.match(
      source,
      /databaseMode: "user-jwt-rls"/,
    );

    assert.match(
      source,
      /Object\.create\(env\)/,
    );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY/,
    );

    assert.doesNotMatch(
      source,
      /\bserviceKey\b/,
    );

    assert.doesNotMatch(
      source,
      /\badminJson\b/,
    );

    assert.doesNotMatch(
      source,
      /\badminHeaders\b/,
    );
  },
);
