import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const studio = read("src/Studio.jsx");
const runtime = read("src/studio-screenshot-recovery-v191.js");
const css = read("src/studio-screenshot-recovery-v191.css");
const hotfix = read("src/studio-screenshot-recovery-v191-hotfix.css");
const supabase = read("src/lib/supabase.js");
const authPatch = read("scripts/patch-auth-callback-v162.mjs");
const modal = read("src/AuthModal.jsx");
const release = JSON.parse(read("public/release-v191.json"));
const workflow = read(".github/workflows/cloudflare-token-diagnostic.yml");

test("v191 is the final Studio authority and removes desktop-site root scaling", () => {
  assert.match(studio, /studio-screenshot-recovery-v191\.js/);
  assert.match(runtime, /studio-screenshot-recovery-v191-20260801/);
  assert.match(runtime, /full-synthetic-width-no-root-scale/);
  assert.doesNotMatch(runtime, /setImportant\(appRoot,\s*"zoom",\s*String\(/);
  assert.doesNotMatch(runtime, /setImportant\(appRoot,\s*"transform",\s*`scale\(/);
  assert.match(css, /data-studio-desktop-site-phone-v191="true"/);
  assert.match(css, /zoom:\s*1\s*!important/);
  assert.match(css, /transform:\s*none\s*!important/);
});

test("physical mobile layout contains the screenshot failure surfaces", () => {
  for (const marker of [
    ".sc161-hero-actions",
    ".mv176-title-actions",
    ".mv176-site-strip",
    ".mv176-metrics",
    ".mv176-tools",
    ".op41-chart-grid",
    ".op41-table-wrap",
    ".sn-media-tools>nav",
    ".ce-ribbon",
    ".tn-code-tabs",
  ]) assert.ok(css.includes(marker), `${marker} must be governed by v191`);
  assert.match(css, /grid-template-columns:\s*minmax\(0,1fr\)\s*!important/);
  assert.match(css, /overflow-x:\s*clip\s*!important/);
});

test("drawer stays clickable, unblurred, centered logo and menu begins near Create Post", () => {
  assert.match(runtime, /drawerBlockingV191 = "false"/);
  assert.match(css, /#ngeblogging-studio-sidebar>nav[\s\S]*justify-content:\s*flex-start\s*!important/);
  assert.match(css, /\.sn-mobile-menu-mark[\s\S]*place-items:\s*center\s*!important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:\s*transparent\s*!important/);
  assert.match(css, /backdrop-filter:\s*none\s*!important/);
  assert.match(hotfix, /left:\s*min\(82vw,326px\)\s*!important/);
});

test("Nara small and medium are non-modal with stable launcher and visible close", () => {
  assert.match(runtime, /v191NaraMode/);
  assert.match(runtime, /pointer-events", "none"/);
  assert.match(runtime, /close\.hidden = false/);
  assert.match(css, /data-v191-nara-mode="nonmodal"/);
  assert.match(css, /\.nara-floating-button[\s\S]*animation:\s*none\s*!important/);
  assert.match(css, /\.nara-floating-button[\s\S]*transition:\s*none\s*!important/);
  assert.match(css, /button\[aria-label="Tutup Nara AI"\]/);
  assert.match(css, /\.nara-composer-tools[\s\S]*grid-template-columns:42px 42px minmax\(0,1fr\) 42px/);
});

test("Profile and Settings are separate account surfaces", () => {
  assert.match(runtime, /profile-only/);
  assert.match(runtime, /settings-only/);
  assert.match(runtime, /settingsSection\.hidden = true/);
  assert.match(runtime, /profileSection\.hidden = true/);
  assert.match(css, /section\[hidden\]/);
});

test("auth remains persistent and build patch hands the verified session into Studio", () => {
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
  assert.match(supabase, /direct-supabase-oauth/);
  assert.match(authPatch, /finishAuth = \(nextSession = null\)/);
  assert.match(authPatch, /onAuthenticated\(data\.session\)/);
  assert.match(modal, /signInWithProvider/);
  assert.match(modal, /linkedin_oidc/);
  assert.match(modal, /signInWithPassword/);
});

test("release is truthful and deployment rejects stale WHITE-R4", () => {
  assert.equal(release.release, "studio-screenshot-recovery-v191-20260801");
  assert.equal(release.repairs.legacyWhiteR4RejectedByDeployment, true);
  assert.match(release.validation.capacity, /No 900-million-user/i);
  assert.match(workflow, /WHITE-R4-2026\.07\.12/);
  assert.match(workflow, /release-v191\.json/);
  assert.match(workflow, /studio-screenshot-recovery-v191-20260801/);
});
