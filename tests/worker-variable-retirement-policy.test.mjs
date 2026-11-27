import test from 'node:test';
import assert from 'node:assert/strict';
import {RETIRED_COMPAT_VALUES,RETIRED_RELEASE_VALUES,LEGACY_VARIABLE_REMOVALS,assertLegacyVariableRemoval} from '../scripts/worker-variable-retirement-policy.mjs';
test('twenty-one release metadata bindings require exact known values',()=>{
 assert.deepEqual(Object.keys(RETIRED_RELEASE_VALUES),['PUBLIC_EDGE_RELEASE','PRODUCTION_ROUTE_AUTHORITY','PRODUCTION_CUSTOM_DOMAIN_RELEASE','PRODUCTION_UI_RELEASE','CURRENT_STUDIO_UI_RELEASE','STUDIO_SIDEBAR_HARD_LOCK_RELEASE','STUDIO_THEME_CATALOG_RELEASE','NARA_PRODUCTION_PROBE','STUDIO_STABILITY_RELEASE','STUDIO_THEME_CODE_EDITOR_PREVIOUS_RELEASE','STUDIO_THEME_CODE_EDITOR_BASE_RELEASE','STUDIO_PRODUCTION_POLISH_RELEASE','STUDIO_SCREENSHOT_HOTFIX_RELEASE','STUDIO_CONTENT_EDITOR_DESKTOP_SITE_COMPAT','STUDIO_SIDEBAR_DIRECT_RELEASE','AUTH_GATEWAY_RELEASE','AUTH_ENTRY_RELEASE','STUDIO_ROUTE_RELEASE','AUTH_EDITOR_RELEASE','UI_AUTHORITY_RELEASE','APP_RELEASE']);
 assert.equal(new Set(LEGACY_VARIABLE_REMOVALS).size,LEGACY_VARIABLE_REMOVALS.length);
 for(const [name,values] of Object.entries(RETIRED_RELEASE_VALUES)){
  assert.ok(LEGACY_VARIABLE_REMOVALS.includes(name));
  for(const text of values)assert.doesNotThrow(()=>assertLegacyVariableRemoval({name,type:'plain_text',text}));
  assert.throws(()=>assertLegacyVariableRemoval({name,type:'plain_text',text:'changed'}),/RETIREMENT_VALUE_CHANGED/);
  const secret={name,type:'secret_text'};Object.defineProperty(secret,'text',{get(){throw Error('SECRET_VALUE_ACCESSED');}});
  assert.throws(()=>assertLegacyVariableRemoval(secret),/REMOVAL_TARGET_IS_NOT_PLAIN_TEXT/);
  assert.throws(()=>assertLegacyVariableRemoval({name,type:'json',json:{}}),/REMOVAL_TARGET_IS_NOT_PLAIN_TEXT/);
 }
});
test('existing compatibility values remain valid and active settings are protected',()=>{
 for(const [name,text] of Object.entries(RETIRED_COMPAT_VALUES))assert.doesNotThrow(()=>assertLegacyVariableRemoval({name,type:'plain_text',text}));
 for(const name of ['MIDTRANS_SERVER_KEY','DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY','DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID','DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PUBLISHABLE_KEY','DOMAIN_ORDER_ENV','DOMAIN_PAYMENT_PRODUCTION_ENABLED','DOMAIN_ORDER_RECOVERY_ENABLED','DOMAIN_ORDER_CANCELLATION_ENABLED','DOMAIN_IMPORT_ENABLED','DOMAIN_IMPORT_TRANSFER_ENABLED','DOMAIN_CUSTOMER_SEARCH_ENABLED','CLOUDFLARE_SAAS_ENABLED','CUSTOM_DOMAIN_BYOD_ENABLED'])assert.throws(()=>assertLegacyVariableRemoval({name,type:'plain_text',text:'mock'}),/UNKNOWN_RETIREMENT_TARGET/);
});
test('four candidate releases have fixed values and reject missing values',()=>{
 const expected={AUTH_GATEWAY_RELEASE:'2026.07.30-auth-gateway-v153',AUTH_ENTRY_RELEASE:'2026.07.30-auth-entry-v158',STUDIO_ROUTE_RELEASE:'2026.07.30-studio-route-v160',AUTH_EDITOR_RELEASE:'2026.07.30-auth-editor-v162'};
 for(const [name,text] of Object.entries(expected)){
  assert.deepEqual(RETIRED_RELEASE_VALUES[name],[text]);
  assert.throws(()=>assertLegacyVariableRemoval({name,type:'plain_text'}),/RETIREMENT_VALUE_CHANGED/);
 }
});
test('APP_RELEASE is retired only with its known value and DOMAIN_IMPORT_TRANSFER_ENABLED stays protected',()=>{
 assert.deepEqual(RETIRED_RELEASE_VALUES.APP_RELEASE,['2026.08.05-studio-sidebar-hard-lock-v301']);
 assert.doesNotThrow(()=>assertLegacyVariableRemoval({name:'APP_RELEASE',type:'plain_text',text:'2026.08.05-studio-sidebar-hard-lock-v301'}));
 assert.throws(()=>assertLegacyVariableRemoval({name:'APP_RELEASE',type:'plain_text',text:'2026.07.24-studio-v14'}),/RETIREMENT_VALUE_CHANGED/);
 assert.equal(LEGACY_VARIABLE_REMOVALS.includes('DOMAIN_IMPORT_TRANSFER_ENABLED'),false);
});
