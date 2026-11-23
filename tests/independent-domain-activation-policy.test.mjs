import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateIndependentActivation as evaluate, validCustomerHostname} from '../server/independent-domain-activation-policy.mjs';
const hostname = 'triapriyoginotes.my.id', siteId = '605a655a-f763-4bd3-9c85-bffb6a7a3bda', nowMs = 1800000000000;
const base = () => ({hostname, siteId, nowMs, gatewayReady:true, evidence:{hostname,siteId,checkedAtMs:nowMs,
  ownershipVerified:true,dnsToGateway:true,tlsTrusted:true,tlsHostname:hostname,tlsExpiresAtMs:nowMs+86400000,
  httpStatus:200,finalUrl:'https://'+hostname+'/',renderedSiteId:siteId,tenantProofVerified:true}});
test('all trusted evidence permits completion, not an automatic database write', () => {
  const r=evaluate(base()); assert.equal(r.outcome,'complete'); assert.equal(r.nextAttemptAtMs,null);
  assert.equal('is_primary' in r,false); assert.equal('custom_domain' in r,false); assert.equal('status' in r,false);
});
test('missing gateway blocks activation', () => assert.equal(evaluate({...base(),gatewayReady:false}).reason,'GATEWAY_NOT_READY'));
for (const [key,value,reason] of [['ownershipVerified',false,'OWNERSHIP_PENDING'],['dnsToGateway',false,'DNS_PENDING'],
  ['tlsTrusted',false,'TLS_PENDING'],['tlsHostname','other.example','TLS_PENDING'],['tlsExpiresAtMs',nowMs,'TLS_PENDING'],
  ['httpStatus',403,'HTTP_NOT_READY'],['checkedAtMs',nowMs-300001,'FRESH_PROBE_REQUIRED'],
  ['checkedAtMs',nowMs+1,'FRESH_PROBE_REQUIRED'],['tenantProofVerified',false,'TENANT_PROOF_MISMATCH'],
  ['renderedSiteId','ba3c10ac-fdcc-45ec-8a52-31bd3a99fc30','TENANT_PROOF_MISMATCH'],
  ['hostname','other.example','EVIDENCE_SCOPE_MISMATCH'],['domainConflict',true,'DOMAIN_CONFLICT']]) {
  test(key+' failure never completes', () => {const input=base();input.evidence[key]=value;const r=evaluate(input);assert.equal(r.reason,reason);assert.notEqual(r.outcome,'complete');});
}
for (const finalUrl of ['http://'+hostname+'/', 'https://ngeblogging.com/', 'https://user@'+hostname+'/', 'https://'+hostname+':8443/']) {
  test('reject final origin '+finalUrl,()=>{const input=base();input.evidence.finalUrl=finalUrl;assert.equal(evaluate(input).reason,'PUBLIC_ORIGIN_MISMATCH');});
}
test('retry delay is capped and retry budget is finite',()=>{const input=base();input.evidence.httpStatus=503;
  assert.equal(evaluate(input).nextAttemptAtMs,nowMs+30000);
  assert.equal(evaluate({...input,attempt:19}).nextAttemptAtMs,nowMs+3600000);
  assert.equal(evaluate({...input,attempt:20}).reason,'RETRY_BUDGET_EXHAUSTED');});
test('reject invalid inputs and platform/free-site hostnames',()=>{for(const h of ['ngeblogging.com','burneoprime.ngeblogging.com','localhost','127.0.0.1','bad..example','https://example.com','EXAMPLE.COM'])assert.equal(validCustomerHostname(h),false);
  for(const attempt of [-1,NaN,Infinity,1.5])assert.throws(()=>evaluate({...base(),attempt}),TypeError);});
