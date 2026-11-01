import test from 'node:test';
import assert from 'node:assert/strict';
import { registrarDiagnosticResponse as handle } from '../server/registrar-diagnostic-handler.mjs';
const host='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const path='/api/admin/registrar/diagnostic';
test('exact preview host reaches method guard',async()=>{assert.equal((await handle(new Request('https://'+host+path),{})).status,405);});
test('preview remains disabled without admin',async()=>{const r=await handle(new Request('https://'+host+path,{method:'POST'}),{});assert.equal(r.status,503);assert.equal((await r.json()).code,'DIAGNOSTIC_DISABLED');});
test('lookalike preview host rejected',async()=>{assert.equal((await handle(new Request('https://'+host+'.example.org'+path,{method:'POST'}),{})).status,404);});
test('other workers dev hosts rejected',async()=>{assert.equal((await handle(new Request('https://other-ngeblogging.triapriyogibahari7.workers.dev'+path,{method:'POST'}),{})).status,404);});
