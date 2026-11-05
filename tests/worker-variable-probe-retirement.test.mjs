import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_VARIABLE_REMOVALS,assertLegacyVariableRemoval} from '../scripts/worker-variable-retirement-policy.mjs';

test('obsolete passed probe metadata is explicitly eligible for retirement',()=>{
  assert(LEGACY_VARIABLE_REMOVALS.includes('NARA_PRODUCTION_PROBE'));
  assert.doesNotThrow(()=>assertLegacyVariableRemoval({name:'NARA_PRODUCTION_PROBE',type:'plain_text',text:'passed'}));
});
test('changed or absent probe values stop retirement',()=>{
  for(const text of ['failed','temporary-ui-audit','',undefined])assert.throws(()=>assertLegacyVariableRemoval({name:'NARA_PRODUCTION_PROBE',type:'plain_text',text}),/RETIREMENT_VALUE_CHANGED/);
});
test('probe retirement never removes secrets or JSON bindings',()=>{
  for(const type of ['secret_text','json'])assert.throws(()=>assertLegacyVariableRemoval({name:'NARA_PRODUCTION_PROBE',type,text:'passed'}),/REMOVAL_TARGET_IS_NOT_PLAIN_TEXT/);
});
test('merchant, credentials and service gates are not retirement targets',()=>{
  for(const name of ['DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID','DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY','DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON','DOMAIN_PAYMENT_PRODUCTION_ENABLED','DOMAIN_CUSTOMER_PRODUCTION_ENABLED','NARA_PRODUCTION_READY','SUPABASE_SERVICE_ROLE_KEY','CLOUDFLARE_REGISTRAR_API_TOKEN']){
    assert.equal(LEGACY_VARIABLE_REMOVALS.includes(name),false);
    assert.throws(()=>assertLegacyVariableRemoval({name,type:'plain_text',text:'passed'}),/UNKNOWN_RETIREMENT_TARGET/);
  }
});
