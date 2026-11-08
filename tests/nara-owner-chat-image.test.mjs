import test from 'node:test';
import assert from 'node:assert/strict';
import { handleNaraImage } from '../server/nara-image-handler.mjs';
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
function environment() { return { SUPABASE_URL:'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test', AI:{run:async()=>({image:png})} }; }
function request() { return new Request('https://ngeblogging.com/api/nara/image',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify({chat:true,prompt:'Buat gambar pegunungan'})}); }
function mock(owner) {
  return async (url) => {
    if (String(url).endsWith('/auth/v1/user')) return Response.json({id:'test-user',email:owner?'triapriyogibahari7@gmail.com':'other@example.com',email_confirmed_at:'2026-11-08T00:00:00Z'});
    if (String(url).includes('/rest/v1/profiles?')) return Response.json([{plan:'pro',plan_expires_at:null}]);
    if (String(url).endsWith('/rpc/consume_nara_quota')) return Response.json({allowed:true,remaining:99});
    throw new Error('Unexpected site or storage request: '+url);
  };
}
test('verified owner generates chat image without site or public storage',async()=>{
  const original = globalThis.fetch; globalThis.fetch = mock(true);
  try { const response = await handleNaraImage(request(),environment(),'test'); const body = await response.json(); assert.equal(response.status,200); assert.equal(body.imageDataUrl,'data:image/png;base64,'+png); assert.equal(body.storage,'chat-only'); } finally { globalThis.fetch = original; }
});
test('non-owner cannot use site-free chat generation',async()=>{
  const original = globalThis.fetch; globalThis.fetch = mock(false);
  try { const response = await handleNaraImage(request(),environment(),'test'); assert.equal(response.status,403); assert.equal((await response.json()).code,'OWNER_REQUIRED'); } finally { globalThis.fetch = original; }
});
