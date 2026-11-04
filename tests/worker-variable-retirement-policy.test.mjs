import test from 'node:test';
import assert from 'node:assert/strict';
import {RETIRED_COMPAT_VALUES,RETIRED_RELEASE_VALUES,LEGACY_VARIABLE_REMOVALS,assertLegacyVariableRemoval} from '../scripts/worker-variable-retirement-policy.mjs';

test('five release bindings are explicitly allowlisted with known values',()=>{
  assert.deepEqual(Object.keys(RETIRED_RELEASE_VALUES),['STUDIO_STABILITY_RELEASE','STUDIO_THEME_CODE_EDITOR_PREVIOUS_RELEASE','STUDIO_THEME_CODE_EDITOR_BASE_RELEASE','STUDIO_PRODUCTION_POLISH_RELEASE','STUDIO_SCREENSHOT_HOTFIX_RELEASE']);
  assert.equal(new Set(LEGACY_VARIABLE_REMOVALS).size,LEGACY_VARIABLE_REMOVALS.length);
  for(const [name,values] of Object.entries(RETIRED_RELEASE_VALUES)){
    assert.ok(LEGACY_VARIABLE_REMOVALS.includes(name));
    for(const text of values)assert.doesNotThrow(()=>assertLegacyVariableRemoval({name,type:'plain_text',text}));
    assert.throws(()=>assertLegacyVariableRemoval({name,type:'plain_text',text:'changed'}),/RETIREMENT_VALUE_CHANGED/);
    const secret={name,type:'secret_text'};
    Object.defineProperty(secret,'text',{get(){throw Error('SECRET_VALUE_ACCESSED');}});
    assert.throws(()=>assertLegacyVariableRemoval(secret),/REMOVAL_TARGET_IS_NOT_PLAIN_TEXT/);
  }
});

test('existing retirement policy remains valid and unrelated keys are protected',()=>{
  for(const [name,text] of Object.entries(RETIRED_COMPAT_VALUES))assert.doesNotThrow(()=>assertLegacyVariableRemoval({name,type:'plain_text',text}));
  for(const name of ['MIDTRANS_SERVER_KEY','DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY','DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID','DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PUBLISHABLE_KEY','DOMAIN_ORDER_ENV','DOMAIN_PAYMENT_PRODUCTION_ENABLED']){
    assert.throws(()=>assertLegacyVariableRemoval({name,type:'plain_text',text:'mock'}),/UNKNOWN_RETIREMENT_TARGET/);
  }
});
