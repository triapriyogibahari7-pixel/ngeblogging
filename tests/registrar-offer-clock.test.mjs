import test from 'node:test';
import assert from 'node:assert/strict';
import {readTimedRegistrarOfferView as read,registrarOfferClockNow as clockNow} from '../src/lib/registrar-offer-clock.mjs';
const checked=Date.parse('2026-10-31T09:00:00Z'),domain='example.com';
function good(){const checkedAt=new Date(checked).toISOString();return {code:'REGISTRAR_CHECK',domain,providerId:'cloudflare',status:'checked',registrable:true,tier:'standard',lookupOnly:true,purchaseAllowed:false,mustRecheckBeforePurchase:true,checkedAt,offerStatus:'indicative_offer',offer:{contract:'registrar-check-indicative-v1',domain,providerId:'cloudflare',registrable:true,tier:'standard',indicative:true,mustRecheckBeforePurchase:true,purchaseAllowed:false,ownership:'not_acquired',connectedToSite:false,registrantEligibility:'not_checked',taxStatus:'unknown',quoteId:'fixture-quote-001',checkedAt,expiresAt:new Date(checked+60000).toISOString(),prices:{registration:{amount:'10.50',currency:'USD',termYears:1,taxIncluded:null},renewal:{amount:'11.25',currency:'USD',termYears:1,taxIncluded:null},transfer:{status:'not_quoted'}}}};}
const options={domain,requestStartedAt:1000,receivedAt:2000};
for(const offset of [-86400000,-3600000,-1000,0,1000,3600000,86400000])test('wall clock offset '+offset+' does not change price acceptance',()=>{const old=Date.now;Date.now=()=>checked+offset;try{const r=read(good(),options);assert.equal(r.registration,'10.50');assert.equal(r.clockAnchorMs,checked+1000);}finally{Date.now=old;}});
test('network/request duration is subtracted conservatively',()=>{const r=read(good(),options);assert.equal(Date.parse(r.expiresAt)-clockNow(r,2000),59000);});
test('price reaches expiry after remaining monotonic duration',()=>{const r=read(good(),options);assert.equal(clockNow(r,61000),Date.parse(r.expiresAt));});
test('long request already past validity produces no price',()=>{const r=read(good(),{domain,requestStartedAt:0,receivedAt:60000});assert.equal(r.currency,undefined);assert.match(r.message,/kedaluwarsa/);});
test('later wall clock jumps do not extend the offer',()=>{const r=read(good(),options),old=Date.now;Date.now=()=>0;try{assert.equal(clockNow(r,61000),checked+60000);}finally{Date.now=old;}});
test('backward monotonic clock fails closed',()=>assert.equal(Number.isNaN(clockNow(read(good(),options),1999)),true));
test('invalid monotonic measurement rejected',()=>assert.throws(()=>read(good(),{...options,receivedAt:NaN}),/INVALID_OFFER_CLOCK/));
test('negative duration rejected',()=>assert.throws(()=>read(good(),{...options,receivedAt:999}),/INVALID_OFFER_CLOCK/));
test('wrong domain still rejected',()=>{const d=good();d.offer.domain='other.com';assert.throws(()=>read(d,options));});
test('invalid prices still rejected',()=>{const d=good();d.offer.prices.registration.amount='-1';assert.throws(()=>read(d,options));});
test('enabled purchase still rejected',()=>{const d=good();d.offer.purchaseAllowed=true;assert.throws(()=>read(d,options));});
test('inconsistent timestamps still rejected',()=>{const d=good();d.checkedAt=new Date(checked-1).toISOString();assert.throws(()=>read(d,options));});
