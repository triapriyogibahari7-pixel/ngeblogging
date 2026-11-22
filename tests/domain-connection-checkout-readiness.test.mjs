import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const flags=['CUSTOM_DOMAIN_BYOD_ENABLED','CUSTOM_DOMAIN_BYOD_SAAS_READY','DOMAIN_CONNECTION_INSTALLER_ENABLED','DOMAIN_CONNECTION_PROOF_ENABLED','DOMAIN_CONNECTION_MIDTRANS_ENABLED','DOMAIN_CONNECTION_PROVISIONING_READY'];
const complete=()=>Object.fromEntries([...flags.map(name=>[name,'true']),['DOMAIN_CONNECTION_PROOF_SECRET','test-only-proof-key-not-a-secret-123456789']]);
async function fixture(){
 const calls=[];
 const deny=()=>{throw Error('LIVE_NETWORK_OR_INSTALLATION_FORBIDDEN');};
 const context=vm.createContext({Request,Response,URL,TextDecoder,AbortSignal,console,fetch:deny});
 const dependencies={
  './domain-connection-annual-price.mjs':{domainConnectionAnnualPriceResponse:(request,env)=>{calls.push({request,env});return new Response('payment-preflight-stub',{status:202});}},
  './domain-connection-install-and-bind.mjs':{installAndBindPaidConnectionPair:deny},
  '../shared/domain-connection-annual-price.mjs':{DOMAIN_CONNECTION_ANNUAL_PRICE:{amountIdr:99000,billingPurpose:'custom-domain-connection'}},
  '../shared/customer-domain-connection.mjs':{customerHost:value=>value},
 };
 const module=new vm.SourceTextModule(readFileSync(new URL('../server/domain-connection-payment-installation.mjs',import.meta.url),'utf8'),{context});
 await module.link(name=>{const values=dependencies[name];assert.ok(values,'Unexpected dependency '+name);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context});});
 await module.evaluate();return {route:module.namespace.domainConnectionPaymentInstallationResponse,calls};
}
const request=()=>new Request('https://ngeblogging.com/api/domains/connection-checkout',{method:'POST'});
for(const flag of flags)for(const value of [undefined,'false',true])test('checkout stays closed for '+flag+'='+String(value),async()=>{
 const f=await fixture(),env=complete();if(value===undefined)delete env[flag];else env[flag]=value;
 const response=await f.route(request(),env),body=await response.json();
 assert.equal(response.status,503);assert.equal(body.charged,false);assert.equal(body.checkoutReady,false);assert.equal(f.calls.length,0);
});
for(const value of [undefined,'short',' '.repeat(32),'x'.repeat(4097)])test('checkout rejects invalid proof key '+String(value?.length),async()=>{
 const f=await fixture(),env={...complete(),DOMAIN_CONNECTION_PROOF_SECRET:value};
 const response=await f.route(request(),env);assert.equal(response.status,503);assert.equal(f.calls.length,0);
});
test('fully staged checkout reaches existing payment preflight exactly once without installation',async()=>{
 const f=await fixture(),env=Object.freeze(complete()),r=request();
 const response=await f.route(r,env);assert.equal(response.status,202);assert.equal(f.calls.length,1);assert.equal(f.calls[0].request,r);assert.equal(f.calls[0].env,env);
});
for(const suffix of ['search','checkout','register'])test('unrelated '+suffix+' route is delegated unchanged',async()=>{
 const f=await fixture(),r=new Request('https://ngeblogging.com/api/domains/'+suffix,{method:'POST'});
 assert.equal((await f.route(r,{})).status,202);assert.equal(f.calls.length,1);assert.equal(f.calls[0].request,r);
});
