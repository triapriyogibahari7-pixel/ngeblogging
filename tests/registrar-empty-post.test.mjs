import test from 'node:test';
import assert from 'node:assert/strict';
import { registrarDiagnosticResponse as handle } from '../server/registrar-diagnostic-handler.mjs';
const origin='https://ngeblogging.com';
const url=origin+'/api/admin/registrar/diagnostic';
const env={REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID:'91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3'};
test('closed empty stream reaches authentication guard',async()=>{
 const body=new ReadableStream({start(c){c.close();}});
 const request=new Request(url,{method:'POST',headers:{origin,'content-length':'0'},body,duplex:'half'});
 const response=await handle(request,env);
 assert.equal(response.status,401);assert.equal((await response.json()).code,'AUTH_REQUIRED');
});
test('bodyless POST reaches authentication guard',async()=>{
 const response=await handle(new Request(url,{method:'POST',headers:{origin}}),env);
 assert.equal(response.status,401);
});
test('nonempty stream remains rejected without content length',async()=>{
 const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{}'));c.close();}});
 const response=await handle(new Request(url,{method:'POST',headers:{origin},body,duplex:'half'}),env);
 assert.equal(response.status,400);assert.equal((await response.json()).code,'EMPTY_REQUEST_REQUIRED');
});
