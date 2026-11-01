import test from 'node:test';
import assert from 'node:assert/strict';
import {domainOrderStatusPageResponse} from '../server/domain-order-status-page.mjs';
const id='DOM-'+'a'.repeat(40);
test('customer page uses canonical Cloudflare asset URL and discards gateway query',async()=>{
 const calls=[],html='<meta name="ngeblogging-domain-order-status" content="v1"/><div id="domain-order-status-root"></div>';
 const env={ASSETS:{fetch:async request=>{calls.push(request);const u=new URL(request.url);if(u.pathname==='/domain-order-status.html')return new Response(null,{status:307,headers:{location:'/domain-order-status'}});if(u.pathname==='/domain-order-status')return new Response(html,{headers:{'content-type':'text/html'}});throw Error('Unexpected asset path');}}};
 const response=await domainOrderStatusPageResponse(new Request('https://ngeblogging.com/domains/orders/'+id+'?transaction_status=settlement'),env);
 assert.equal(response.status,200);assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/domain-order-status');assert.equal(new URL(calls[0].url).search,'');assert.equal(calls[0].method,'GET');assert.equal(await response.text(),html);assert(response.headers.get('cache-control').includes('no-store'));assert(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
});
test('wrong SPA fallback remains rejected, not shown as the customer status page',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('<html>Unrelated landing page</html>',{headers:{'content-type':'text/html'}})}};
 const response=await domainOrderStatusPageResponse(new Request('https://ngeblogging.com/domains/orders/'+id),env);assert.equal(response.status,503);
});
