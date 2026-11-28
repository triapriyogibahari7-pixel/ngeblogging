import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILT_IN_THEMES as original } from '../src/theme-catalog.js';
import { BUILT_IN_THEMES, PREMIUM_FREE_THEMES, PREMIUM_FREE_ACCESS, PREMIUM_FREE_COUNT, THEME_COUNT, themeCodeFor } from '../src/premium-free-catalog.mjs';
import { activateTheme, buildThemeSrcDoc, createDefaultThemeState, getTheme, normalizeThemeState, parseThemeFile, serializeThemeBackup } from '../src/theme-system.js';

test('original themes and default remain unchanged; free candidates are appended',()=>{
  assert.equal(PREMIUM_FREE_COUNT,122);
  assert.equal(THEME_COUNT,original.length+122);
  assert.deepEqual(BUILT_IN_THEMES.slice(0,original.length),original);
  assert.equal(createDefaultThemeState().activeThemeId,original[0].id);
  for (const theme of original) assert.equal(getTheme(theme.id),theme);
  assert.equal(new Set(BUILT_IN_THEMES.map(t=>t.id)).size,THEME_COUNT);
});

test('Premium is free without checkout or paid entitlement',()=>{
  assert.equal(PREMIUM_FREE_ACCESS.amountIdr,0);
  assert.equal(PREMIUM_FREE_ACCESS.requiresCheckout,false);
  for (const theme of PREMIUM_FREE_THEMES) {
    assert.equal(theme.premium,true);assert.equal(theme.free,true);assert.equal(theme.priceIdr,0);
    assert.equal(theme.licenseRequired,false);assert.equal(theme.access.requiresPayment,false);
    assert.equal(theme.access.requiresPaidEntitlement,false);
    assert.equal(theme.pricing.personal.amountIdr,0);assert.equal(theme.pricing.multisite.amountIdr,0);
    assert.equal(theme.category,'Premium • Gratis');assert.ok(theme.blueprints.includes('blog'));
    assert.ok(theme.colors.primary);assert.ok(theme.font);assert.ok(Array.isArray(theme.features));
    assert.equal(themeCodeFor(theme),theme.code);
  }
});

test('activation, normalization and backup retain each premium ID and code without payment state',()=>{
  for (const theme of PREMIUM_FREE_THEMES) {
    const next=activateTheme(createDefaultThemeState(),theme.id);
    assert.equal(next.activeThemeId,theme.id);assert.equal(next.previewThemeId,theme.id);
    assert.equal(next.code.html,theme.code.html);assert.equal(normalizeThemeState(next).activeThemeId,theme.id);
    const restored=parseThemeFile(serializeThemeBackup(next));
    assert.equal(restored.activeThemeId,theme.id);assert.equal(restored.code.css,theme.code.css);
    assert.equal(restored.history[0].note,'Tema diimpor');
    const doc=buildThemeSrcDoc(theme.code,next.publishedConfig,[]);
    assert.ok(doc.includes('Content-Security-Policy'));assert.ok(doc.includes('psig-feed'));
  }
});

test('public home selectors expose a real post feed, brand and page navigation',()=>{
  for (const theme of PREMIUM_FREE_THEMES) {
    assert.match(theme.code.html,/ng-theme/);assert.match(theme.code.html,/ng-header/);
    assert.match(theme.code.html,/ng-brand/);assert.match(theme.code.html,/ng-hero/);
    assert.match(theme.code.html,/id="posts"/);assert.match(theme.code.html,/class="ng-cards"/);
    assert.equal((theme.code.html.match(/<article><small>CONTOH POST /g)||[]).length,12);
  }
  const publicSource=readFileSync(new URL('../src/PublicSiteNext.jsx',import.meta.url),'utf8');
  for(const selector of ['.ng-brand','.ng-header nav','.ng-cards article']) assert.ok(publicSource.includes(selector));
});

test('uncleared image batches and generated catalog themes are not active premium candidates',()=>{
  for(const theme of PREMIUM_FREE_THEMES){
    const number=Number(theme.id.split('-')[1]);assert.ok((number>=1&&number<=40)||(number>=51&&number<=132));
    assert.equal(theme.imageReadiness,'no-external-assets');
    assert.doesNotMatch(theme.code.html,/<(?:img|iframe|video|audio)\b|https?:\/\//i);
    assert.doesNotMatch(theme.code.css,/@import\b|url\s*\(|https?:\/\//i);
  }
  assert.equal(BUILT_IN_THEMES.some(t=>/^signature-04[1-9]-|^signature-050-/.test(t.id)),false);
  const adapter=readFileSync(new URL('../src/premium-free-catalog.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(adapter,/from ['"]\.\/premium-signature-themes-04[16]-/);
  assert.doesNotMatch(adapter,/fetch\s*\(|midtrans|checkout\/|entitlements\//i);
});
