import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {domainOrderStatusPageResponse as handle} from '../server/domain-order-status-page.mjs';
const id='DOM-'+'a'.repeat(40),html='<html><head><meta name="ngeblogging-domain-order-status" content="v1"></head><body></body></html>';
const request=(path,method='GET',origin='https://ngeblogging.com')=>new Request(origin+path,{method});
function fixture(body=html){let reads=0;return {env:{ASSETS:{fetch:async req=>{reads++;assert.equal(new URL(req.url).pathname,'/domain-order-status');assert.equal(req.method,'GET');return new Response(body,{headers:{'content-type':'text/html'}});}}},reads:()=>reads};}
for(const path of ['/domains','/domains/','/domains?domain=example.com'])test('retire standalone purchase '+path,async()=>{const f=fixture(),r=await handle(request(path),f.env);assert.equal(r.status,410);assert.match(await r.text(),/Domain dan publikasi/);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(f.reads(),0);});
test('retired HEAD has no body or asset fetch',async()=>{const f=fixture(),r=await handle(request('/domains','HEAD'),f.env);assert.equal(r.status,410);assert.equal(await r.text(),'');assert.equal(f.reads(),0);});
test('retired purchase rejects POST',async()=>{const f=fixture(),r=await handle(request('/domains','POST'),f.env);assert.equal(r.status,405);assert.equal(f.reads(),0);});
test('retirement does not need asset configuration',async()=>{assert.equal((await handle(request('/domains'),{})).status,410);});
for(const suffix of ['', '/'])test('existing order status stays reachable '+suffix,async()=>{const f=fixture(),r=await handle(request('/domains/orders/'+id+suffix),f.env);assert.equal(r.status,200);assert.equal(await r.text(),html);assert.equal(f.reads(),1);assert.equal(r.headers.get('referrer-policy'),'no-referrer');});
test('order HEAD remains bodyless',async()=>{const f=fixture(),r=await handle(request('/domains/orders/'+id,'HEAD'),f.env);assert.equal(r.status,200);assert.equal(await r.text(),'');});
test('invalid order route fails before asset reads',async()=>{const f=fixture(),r=await handle(request('/domains/orders/not-valid'),f.env);assert.equal(r.status,404);assert.equal(f.reads(),0);});
test('canonical host and HTTPS restrictions remain',async()=>{for(const origin of ['http://ngeblogging.com','https://example.com']){const f=fixture(),r=await handle(request('/domains','GET',origin),f.env);assert.equal(r.status,404);assert.equal(f.reads(),0);}});
test('API and unrelated routes are untouched',async()=>{for(const path of ['/api/commerce/domains/order','/api/commerce/domains/orders/'+id,'/studio','/'])assert.equal(await handle(request(path),{}),null);});
test('order status still fails closed without valid assets',async()=>{assert.equal((await handle(request('/domains/orders/'+id),{})).status,503);assert.equal((await handle(request('/domains/orders/'+id),fixture('<html>invalid</html>').env)).status,503);});
test('shared browser entry cannot import standalone purchase page',async()=>{const text=await readFile(new URL('../src/domain-order-status-entry.jsx',import.meta.url),'utf8');assert.equal(text.includes('DomainPurchasePage'),false);assert.ok(text.includes("import('./DomainOrderStatusPage.jsx')"));assert.ok(text.includes('orderRoute.test(location.pathname)'));});
