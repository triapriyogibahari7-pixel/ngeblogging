import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Domain is permanently restored after Comments and never treated as an account footer action", async () => {
  const [runtime, css, studio, index, worker] = await Promise.all([
    read("src/studio-final-v106.js"),
    read("src/studio-final-v106.css"),
    read("src/StudioNext.jsx"),
    read("index.html"),
    read("public/sw.js"),
  ]);

  assert.match(studio, /<span>Anggota<\/span><\/button><button[^>]+view==="domain"/);
  assert.match(runtime, /function syncDomainMenuOrder\(\)/);
  assert.match(runtime, /side\.querySelectorAll\("button"\)/);
  assert.match(runtime, /labelOf\(button\) === "Domain"/);
  assert.match(runtime, /labelOf\(button\) === "Anggota"/);
  assert.match(runtime, /nav\.insertBefore\(domain, anchor\.nextElementSibling\)/);
  assert.match(runtime, /syncNativeCommentsButton\(\);\s*syncDomainMenuOrder\(\);/);
  assert.match(runtime, /sidebarDomainOrderV113/);

  assert.match(css, /sidebar-domain-order-v113/);
  assert.match(css, /nav>button:last-child/);
  assert.match(css, /position:static!important/);
  assert.match(css, /bottom:auto!important/);
  assert.doesNotMatch(css, /data-sidebar-domain-order-v113[^}]*margin-top:auto/s);
  assert.match(css, /sn-account-footer>button\[data-sidebar-domain-order-v113/);

  assert.match(index, /studio-final-v106\.css\?v=113/);
  assert.match(index, /studio-final-v106\.js\?v=113/);
  assert.match(worker, /ngeblogging-app-v113-20260729/);
  assert.match(worker, /sidebar-domain-order-v113-20260729/);
  assert.match(worker, /pwa-v113/);
});
