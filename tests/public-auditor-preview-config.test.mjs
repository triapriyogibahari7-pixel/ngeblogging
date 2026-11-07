import test from 'node:test';
import assert from 'node:assert/strict';
import {previewAuditorConfig,provisionPublicAuditorPreview} from '../scripts/provision-public-auditor-preview.mjs';
test('removes auditor bindings from copied main and preview configuration only',()=>{
 const config={name:'ngeblogging',services:[{binding:'LIVE',service:'production'},{binding:'PUBLIC_AUDITOR',service:'ngeblogging-public-auditor'}],vars:{KEEP:'value'},previews:{vars:{MODE:'sandbox'},services:[{binding:'OTHER',service:'other'},{binding:'ALIAS',service:'ngeblogging-public-auditor'}]}};
 const before=JSON.stringify(config),next=previewAuditorConfig(config);
 assert.equal(JSON.stringify(config),before);
 assert.deepEqual(next.services,[{binding:'LIVE',service:'production'}]);
 assert.deepEqual(next.previews.services,[{binding:'OTHER',service:'other'}]);
 assert.deepEqual(next.vars,config.vars);assert.deepEqual(next.previews.vars,config.previews.vars);
 assert.deepEqual(previewAuditorConfig(next),next);
});
test('does not add absent services or previews',()=>{assert.deepEqual(previewAuditorConfig({name:'ngeblogging'}),{name:'ngeblogging'});});
test('rejects wrong application conflicting binding and malformed lists',()=>{
 assert.throws(()=>previewAuditorConfig({name:'other'}),/TARGET_MISMATCH/);
 assert.throws(()=>previewAuditorConfig({name:'ngeblogging',services:[{binding:'PUBLIC_AUDITOR',service:'other'}]}),/BINDING_CONFLICT/);
 assert.throws(()=>previewAuditorConfig({name:'ngeblogging',previews:{services:{}}}),/CONFIG_INVALID/);
});
test('retired provisioning reports no live changes or deletion',async()=>{assert.deepEqual(await provisionPublicAuditorPreview(),{retired:true,auditorCreated:false,liveBindingsChanged:false,workerDeleted:false});});
