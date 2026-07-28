import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio v111 loads a final non-overlapping authority for Comments and Domain", async () => {
  const [secure, css, runtime, domainCss, serviceWorker] = await Promise.all([
    read("src/StudioSecure.jsx"),
    read("src/studio-flow-integrity-v111.css"),
    read("src/studio-flow-integrity-v111.js"),
    read("src/domain-manager-v80.css.js"),
    read("public/sw.js"),
  ]);

  assert.ok(secure.includes('import "./studio-flow-integrity-v111.css"'));
  assert.ok(secure.includes('import "./studio-flow-integrity-v111.js"'));

  for (const marker of [
    "comments-domain-flow-integrity-v111",
    ".csm-title-v93",
    ".csm-site-v93",
    "height:auto!important",
    "text-size-adjust:100%",
    "@media(max-width:760px)",
    "@media(max-width:430px)",
  ]) assert.ok(css.includes(marker), marker);

  for (const marker of [
    "studio-flow-integrity-v111-20260728",
    "DOMAIN_FLOW_CSS",
    "data-domain-flow-integrity-v111",
    "#domain-manager-v80",
    "MutationObserver",
  ]) assert.ok(runtime.includes(marker), marker);

  for (const marker of [
    "domain-manager-flow-integrity-v111",
    "-webkit-text-size-adjust:100%",
    ".register-form",
    ".field>span",
    ".input{position:relative",
    "@media(max-width:700px)",
    "@media(max-width:430px)",
  ]) assert.ok(domainCss.includes(marker), marker);

  assert.match(serviceWorker, /ngeblogging-app-v111-20260728/);
  assert.match(serviceWorker, /studio-flow-integrity-v111-20260728/);
  assert.match(serviceWorker, /pwa-v111/);
  assert.ok(serviceWorker.includes("/src/studio-flow-integrity-v111.css"));
  assert.ok(serviceWorker.includes("/src/studio-flow-integrity-v111.js"));
});

test("v111 does not restore fixed or absolute positioning on affected content", async () => {
  const [css, domainCss] = await Promise.all([
    read("src/studio-flow-integrity-v111.css"),
    read("src/domain-manager-v80.css.js"),
  ]);

  assert.doesNotMatch(css, /\.csm-(?:title|site)-v93[^{}]*\{[^}]*position\s*:\s*(?:absolute|fixed)/s);
  assert.doesNotMatch(domainCss, /\.(?:section-head|register-form|field)[^{}]*\{[^}]*position\s*:\s*(?:absolute|fixed)/s);
});
