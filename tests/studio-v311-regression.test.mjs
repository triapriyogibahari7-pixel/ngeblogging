import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Theme Studio v311 keeps eight preview profiles and a real numbered code editor', async () => {
  const [theme, css, layoutJs, layoutCss] = await Promise.all([
    read('src/ThemeStudio.jsx'), read('src/theme-studio-v311.css'),
    read('src/studio-theme-layout-v311.js'), read('src/studio-theme-layout-v311.css'),
  ]);
  for (const label of ['Aplikasi','Handphone','Mobile','Perangkat kecil','Tablet','Laptop','Situs desktop','Komputer']) assert.match(theme, new RegExp(label));
  assert.match(theme, /tn-code-line-numbers-v311/);
  assert.match(theme, /Math\.min\(totalLines, 10_000\)/);
  assert.match(theme, /wrap="off"/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /\.tn-code-preview-pane\{order:1!important/);
  assert.match(css, /\.tn-code-pane\{order:2!important/);
  assert.match(layoutJs, /Editorial/);
  assert.match(layoutJs, /Portal/);
  assert.doesNotMatch(layoutJs, /MutationObserver|setInterval\s*\(/);
  assert.match(layoutCss, /data-layout-model-v311="editorial"/);
  assert.match(layoutCss, /data-layout-model-v311="portal"/);
});

test('Nara small and medium are non-modal and attachments remain available', async () => {
  const [jsx, css] = await Promise.all([read('src/NaraAssistant.jsx'), read('src/nara-v311.css')]);
  assert.match(jsx, /aria-modal=\{size === "full" \? "true" : "false"\}/);
  assert.match(jsx, /size === "full" && <button className="nara-assistant-backdrop"/);
  for (const marker of ['Camera','ImageIcon','File']) assert.match(jsx, new RegExp(marker));
  assert.match(css, /data-nara-layer-size="small"/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /\.nara-assistant-shell\{pointer-events:auto!important/);
  assert.match(css, /position:fixed!important/);
  assert.doesNotMatch(css, /animation:[^;]*(blink|pulse)/i);
});

test('Members v311 exposes five role choices and secure owner transfer', async () => {
  const [jsx, migration] = await Promise.all([
    read('src/MembersPanelV176.jsx'), read('supabase/migrations/20260806031000_transfer_site_owner_v311.sql'),
  ]);
  for (const role of ['Owner','Admin','Editor','Author','Viewer']) assert.match(jsx, new RegExp(`>${role}<|"${role}"`));
  assert.match(jsx, /MoreHorizontal/);
  assert.match(jsx, /transfer_site_owner_v311/);
  assert.match(jsx, /remove_site_member_v176/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /current_owner <> request_user/);
  assert.match(migration, /target_owned_count >= 25/);
  assert.match(migration, /set role = 'admin'/);
  assert.match(migration, /set role = 'owner'/);
});

test('First-site onboarding does not fake-fail a real create after 15 seconds', async () => {
  const [gate, css] = await Promise.all([read('src/StudioOnboardingGate.jsx'), read('src/studio-onboarding-v311.css')]);
  assert.match(gate, /site = await createUserSiteWithPolicy\(/);
  assert.doesNotMatch(gate, /createUserSiteWithPolicy\([\s\S]{0,220}\), 15_000/);
  assert.match(gate, /listUserSitesStartupV292\(userId\)/);
  assert.match(gate, /data-creating=\{creating \? "true" : "false"\}/);
  assert.match(css, /filter:none!important/);
  assert.match(css, /opacity:1!important/);
});

test('Custom-domain v311 uses Full Zone and migrates legacy rows instead of returning provider mismatch', async () => {
  const [wrangler, handler, builder, panelCss] = await Promise.all([
    read('wrangler.production.jsonc'), read('server/domain-handler-v112.mjs'), read('scripts/build-active-zone-wrangler.mjs'), read('src/domain-panel-v311.css'),
  ]);
  assert.match(wrangler, /"CUSTOM_DOMAIN_PROVIDER": "cloudflare-full-zone"/);
  assert.match(builder, /CUSTOM_DOMAIN_PROVIDER: "cloudflare-full-zone"/);
  assert.match(handler, /domain-legacy-to-full-zone-v311-20260806/);
  assert.match(handler, /failure\?\.code !== "DOMAIN_PROVIDER_MISMATCH"/);
  assert.match(handler, /clearLegacyProviderPointer/);
  assert.match(handler, /migratedFromProvider/);
  assert.match(panelCss, /@media\(max-width:760px\)/);
  assert.match(panelCss, /width:100%!important/);
});
