import test from 'node:test';
import assert from 'node:assert/strict';
import {readRegistrarSearchView as read,normalizeRegistrarSearchInput as normalize} from '../src/lib/registrar-search-view.mjs';
const options={query:'example',requestStartedAt:1000,receivedAt:2000};
function good(){return {code:'REGISTRAR_SEARCH',query:'example',providerId:'cloudflare',status:'search_results',lookupOnly:true,purchaseAllowed:false,advisory:true,mustRecheckBeforePurchase:true,limit:50,count:1,searchedAt:'2026-10-31T09:00:00Z',domains:[{domain:'example.com',searchAvailability:'appears_available',reason:null,tier:'standard',prices:{currency:'USD',registration:{amount:'10.50',termYears:1},renewal:{amount:'11.25',termYears:1},taxIncluded:null},advisory:true,mustRecheckBeforePurchase:true,purchaseAllowed:false}]};}
test('valid candidate keeps only display fields and permits explicit Check',()=>{const r=read(good(),options);assert.equal(r.candidates[0].canCheck,true);assert.equal(r.candidates[0].prices.registration,'10.50');assert.equal(r.candidates[0].purchaseAllowed,undefined);assert.equal(Date.parse(r.expiresAt)-r.clockAnchorMs,59000);});
test('unsupported co.id is distinct from unavailable',()=>{const d=good();Object.assign(d.domains[0],{domain:'example.co.id',searchAvailability:'not_confirmed',reason:'extension_not_supported_via_api',prices:null});const r=read(d,options).candidates[0];assert.match(r.status,/registrar ini/);assert.equal(r.canCheck,false);});
test('unavailable does not offer Check price',()=>{const d=good();Object.assign(d.domains[0],{searchAvailability:'appears_unavailable',reason:'domain_unavailable',prices:null});assert.equal(read(d,options).candidates[0].canCheck,false);});
test('premium stays labelled without standard-price action',()=>{const d=good();d.domains[0].tier='premium';const r=read(d,options).candidates[0];assert.equal(r.premium,true);assert.equal(r.canCheck,false);});
test('empty search does not assert global unavailability',()=>{const d=good();d.domains=[];d.count=0;const r=read(d,options);assert.match(r.message,/bukan bukti/);assert.equal(r.candidates,undefined);});
test('expired response displays no prices or candidates',()=>assert.equal(read(good(),{...options,receivedAt:61000}).candidates,undefined));
test('wrong query rejected',()=>assert.throws(()=>read(good(),{...options,query:'other'})));
test('wrong count rejected',()=>{const d=good();d.count=100;assert.throws(()=>read(d,options));});
test('duplicate candidates rejected',()=>{const d=good();d.domains.push(d.domains[0]);d.count=2;assert.throws(()=>read(d,options));});
test('invalid price rejected',()=>{const d=good();d.domains[0].prices.registration.amount='-1';assert.throws(()=>read(d,options));});
test('purchase enabled response rejected',()=>{const d=good();d.purchaseAllowed=true;assert.throws(()=>read(d,options));});
test('unsafe input rejected and spaces normalized',()=>{assert.equal(normalize('  example   blog '),'example blog');for(const q of ['.co.id','https://example.com','example\ncom','a'.repeat(101)])assert.throws(()=>normalize(q));});
test('backwards monotonic duration rejected',()=>assert.throws(()=>read(good(),{...options,receivedAt:999})));
test('invalid server timestamp rejected',()=>{const d=good();d.searchedAt='invalid';assert.throws(()=>read(d,options));});
