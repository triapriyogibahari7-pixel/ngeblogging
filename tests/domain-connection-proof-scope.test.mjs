import test from 'node:test';
import assert from 'node:assert/strict';
import {paidConnectionProofEnvironment,domainConnectionPaidRefreshResponse,paidConnectionTenantProofResponse} from '../server/domain-connection-proof-scope.mjs';

test('paid proof does not inherit legacy activation or legacy key',()=>{
 const env=Object.freeze({CUSTOM_DOMAIN_PROOF_ENABLED:'true',CUSTOM_DOMAIN_PROOF_SECRET:'legacy-test-key',CUSTOM_DOMAIN_PROVIDER:'legacy-provider'});
 const scoped=paidConnectionProofEnvironment(env);
 assert.notStrictEqual(scoped,env);
 assert.equal(scoped.CUSTOM_DOMAIN_PROOF_ENABLED,'false');
 assert.equal(scoped.CUSTOM_DOMAIN_PROOF_SECRET,undefined);
 assert.equal(scoped.CUSTOM_DOMAIN_PROVIDER,env.CUSTOM_DOMAIN_PROVIDER);
 assert.equal(env.CUSTOM_DOMAIN_PROOF_ENABLED,'true');
 assert.equal(env.CUSTOM_DOMAIN_PROOF_SECRET,'legacy-test-key');
});

test('dedicated paid proof bindings only affect the copied environment',()=>{
 const assets=Object.freeze({label:'test-assets'});
 const env=Object.freeze({DOMAIN_CONNECTION_PROOF_ENABLED:'true',DOMAIN_CONNECTION_PROOF_SECRET:'dedicated-test-key',CUSTOM_DOMAIN_PROOF_ENABLED:'false',CUSTOM_DOMAIN_PROOF_SECRET:'legacy-test-key',ASSETS:assets,SUPABASE_SERVICE_ROLE_KEY:'test-service-role-placeholder'});
 const scoped=paidConnectionProofEnvironment(env);
 assert.equal(scoped.CUSTOM_DOMAIN_PROOF_ENABLED,'true');
 assert.equal(scoped.CUSTOM_DOMAIN_PROOF_SECRET,'dedicated-test-key');
 assert.equal(scoped.ASSETS,assets);
 assert.equal(scoped.SUPABASE_SERVICE_ROLE_KEY,env.SUPABASE_SERVICE_ROLE_KEY);
 assert.equal(env.CUSTOM_DOMAIN_PROOF_ENABLED,'false');
 assert.equal(env.CUSTOM_DOMAIN_PROOF_SECRET,'legacy-test-key');
});

test('paid activation requires the literal string true and never falls back to a legacy key',()=>{
 for(const flag of [undefined,false,true,'false','TRUE','1']){
  const scoped=paidConnectionProofEnvironment({DOMAIN_CONNECTION_PROOF_ENABLED:flag,CUSTOM_DOMAIN_PROOF_ENABLED:'true',CUSTOM_DOMAIN_PROOF_SECRET:'legacy-test-key'});
  assert.equal(scoped.CUSTOM_DOMAIN_PROOF_ENABLED,'false');
  assert.equal(scoped.CUSTOM_DOMAIN_PROOF_SECRET,undefined);
 }
 const missing=paidConnectionProofEnvironment({DOMAIN_CONNECTION_PROOF_ENABLED:'true',CUSTOM_DOMAIN_PROOF_SECRET:'legacy-test-key'});
 assert.equal(missing.CUSTOM_DOMAIN_PROOF_SECRET,undefined);
 assert.equal(paidConnectionProofEnvironment().CUSTOM_DOMAIN_PROOF_ENABLED,'false');
});

test('adapter preserves synchronous null responses outside its paid routes without network calls',()=>{
 const request=new Request('https://ngeblogging.com/unrelated');
 assert.equal(domainConnectionPaidRefreshResponse(request,{}),null);
 assert.equal(paidConnectionTenantProofResponse(request,{}),null);
});
