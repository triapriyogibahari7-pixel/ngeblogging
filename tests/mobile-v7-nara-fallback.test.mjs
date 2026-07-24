import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../src/studio-final-mobile.css", import.meta.url), "utf8");
const hardening = readFileSync(new URL("../src/studio-v8-hardening.css", import.meta.url), "utf8");
const authority = readFileSync(new URL("../src/studio-v10-authority.css", import.meta.url), "utf8");
const guard = readFileSync(new URL("../src/studio-production-guard.js", import.meta.url), "utf8");
const capabilities = readFileSync(new URL("../src/nara-availability-bridge.js", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const billing = readFileSync(new URL("../src/billing-availability-bridge.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const fallback = readFileSync(new URL("../server/workers-ai-nara.mjs", import.meta.url), "utf8");
const wrangler = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");


test("phone navigation is sidebar-only with one edge control and a visible icon rail", () => {
  assert.match(mobile, /\.sn-mobile-nav,[\s\S]*display: none !important/);
  assert.match(hardening, /--sn-phone-panel: min\(82vw, 272px\)/);
  assert.match(authority, /--sn-phone-rail: 68px/);
  assert.match(authority, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-rail-width\) !important/);
  assert.match(authority, /\.sn-side\.collapsed > nav > button[\s\S]*justify-content: center !important/);
  assert.match(authority, /\.sn-icon[\s\S]*position: fixed !important/);
  assert.match(guard, /querySelectorAll\(":scope > \.sn-mobile-nav, :scope > \.sn-mobile-sheet-layer"\)/);
  assert.match(guard, /mergeSidebarMenus\(side\)/);
  assert.match(guard, /dataset\.sidebarAuthority = "single"/);
  assert.match(guard, /querySelectorAll\(":scope > \.sn-side > \.sn-side-close"\)/);
  assert.match(guard, /hideNaraSidebarRoute\(side\)/);
  assert.match(index, /studio-v8-hardening\.css/);
  assert.match(index, /studio-v10-authority\.css/);
  assert.ok(index.indexOf("studio-v10-authority.css") > index.indexOf("studio-v8-hardening.css"));
  assert.match(index, /studio-production-guard\.js/);
});


test("settings, site manager, theme modals, widget studio, content lists, and Nara cannot overlap", () => {
  assert.match(secure, /ngeblogging-settings-extras/);
  assert.match(secure, /saveButton\.insertAdjacentElement\("afterend", extras\)/);
  assert.match(mobile, /\.sn-view-pad:has\(\.sn-settings-grid\)[\s\S]*gap: 18px/);
  assert.match(authority, /\.sn-settings-extras[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(authority, /\.sn-content-tools[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(authority, /\.sn-doc-row[\s\S]*grid-template-areas: "title trash" "status time"/);
  assert.match(authority, /\.sn-site-manager,[\s\S]*height: 100dvh !important/);
  assert.match(authority, /\.tn-modal,[\s\S]*height: 100dvh !important/);
  assert.match(authority, /\.nara-assistant-layer[\s\S]*z-index: 22000 !important/);
  assert.match(authority, /\.nara-assistant-shell[\s\S]*height: 100dvh !important/);
  assert.match(guard, /window\.scrollTo\(\{ top: 0, left: 0/);
});


test("Nara launcher stays clickable and all capabilities remain available", () => {
  assert.match(guard, /ensureFloatingNara\(\)/);
  assert.match(guard, /ensureNaraCapabilityShortcuts\(\)/);
  assert.match(guard, /requestQrScan/);
  assert.match(guard, /openNaraWorkspace/);
  assert.match(authority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(capabilities, /preserveAssistantCapabilities/);
  assert.match(capabilities, /\.nara-select option/);
  assert.match(capabilities, /\.nara-attachment-menu button/);
  assert.match(capabilities, /\.nara-composer input/);
  assert.doesNotMatch(capabilities, /removeInactiveOptions/);
  assert.doesNotMatch(capabilities, /controls\.forEach\(conceal\)/);
});


test("Nara has Qwen and authenticated Cloudflare Workers AI fallback", () => {
  assert.equal(wrangler.ai.binding, "AI");
  assert.equal(wrangler.env.production.ai.binding, "AI");
  assert.equal(wrangler.vars.CF_AI_MODEL, "@cf/zai-org/glm-4.7-flash");
  assert.match(worker, /handleWorkersAiNara, workersAiReady/);
  assert.match(worker, /qwenTextReady\(env\) \|\| workersAiReady\(env\)/);
  assert.match(worker, /naraProviders: \{ qwen: qwenTextReady\(env\), workersAi: workersAiReady\(env\) \}/);
  assert.match(fallback, /env\.AI\.run\(model/);
  assert.match(fallback, /DEFAULT_SUPABASE_URL/);
  assert.match(fallback, /DEFAULT_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(fallback, /NARA_SESSION_PROJECT_MISMATCH/);
  assert.match(fallback, /consume_nara_quota/);
  assert.match(fallback, /verifyUser\(request, env\)/);
});


test("inactive commerce stays hidden while PWA updates to v10", () => {
  assert.match(billing, /function upgradeButtons\(\)/);
  assert.match(billing, /upgrades\.forEach\(conceal\)/);
  assert.match(serviceWorker, /ngeblogging-app-v10-20260724/);
});
