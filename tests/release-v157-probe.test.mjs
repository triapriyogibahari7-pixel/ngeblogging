import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const release = JSON.parse(readFileSync(new URL("../public/release-v157.json", import.meta.url), "utf8"));

test("static v157 release probe rejects WHITE-R4", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-system-shell-v157");
  assert.equal(release.authRelease, "2026.07.30-auth-shell-v157");
  assert.equal(release.legacyWhiteR4, false);
  assert.equal(release.shell, "react-dist-index");
});
