import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRegistrarDomain as normalize,createRegistrarQuoteRouter as router} from '../server/domain-registrar-quote-router.mjs';
for(const extension of ['co.uk','org.uk','me.uk']){
 test('default Check normalizer accepts brand.'+extension,()=>{const d=normalize('BRAND.'+extension+'.');assert.equal(d.domain,'brand.'+extension);assert.equal(d.extension,extension);assert.equal(d.name,'brand');});
 test('bare suffix '+extension+' is not a registrable brand',()=>assert.throws(()=>normalize(extension),/DOMAIN_NAME_REQUIRED/));
 test('real subdomain under '+extension+' remains rejected',()=>assert.throws(()=>normalize('www.brand.'+extension),/SUBDOMAIN_NOT_REGISTRABLE/));
}
for(const extension of ['co.id','my.id','web.id'])test('Indonesian compound suffix behavior retained for '+extension,()=>{assert.equal(normalize('brand.'+extension).extension,extension);assert.throws(()=>normalize('www.brand.'+extension),/SUBDOMAIN_NOT_REGISTRABLE/);assert.throws(()=>normalize(extension),/DOMAIN_NAME_REQUIRED/);});
test('ordinary single-label TLD behavior retained',()=>{for(const extension of ['com','org','online'])assert.equal(normalize('brand.'+extension).extension,extension);assert.throws(()=>normalize('www.brand.com'),/SUBDOMAIN_NOT_REGISTRABLE/);});
test('caller-provided compound suffix still honored',()=>assert.equal(normalize('brand.com.au',['com.au']).extension,'com.au'));
test('recognition does not claim provider support or invoke unmatched provider',async()=>{let calls=0;const r=await router({providers:[{id:'com-only',enabled:true,extensions:['com'],lookup:async()=>{calls++;}}]}).lookup({domain:'brand.co.uk'});assert.equal(r.status,'unsupported_extension');assert.equal(r.offer,null);assert.equal(r.purchaseAllowed,false);assert.equal(calls,0);});
test('configured compound-suffix provider receives the exact domain',async()=>{let seen;const money={amount:'12.00',currency:'USD',termYears:1,taxIncluded:false};const r=await router({clock:()=>1000,makeId:()=> 'fixture-quote-001',providers:[{id:'uk-fixture',enabled:true,extensions:['co.uk'],lookup:async input=>{seen=input;return {domain:input.domain,availability:'available',prices:{registration:money,renewal:money,transfer:{supported:false}}};}}]}).lookup({domain:'brand.co.uk'});assert.equal(seen.domain,'brand.co.uk');assert.equal(seen.extension,'co.uk');assert.equal(r.status,'quoted');assert.equal(r.purchaseAllowed,false);});
