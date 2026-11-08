import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePrivateNaraRoute } from '../server/nara-private-execution-policy.mjs';
const owner = { id:'91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3',email:'triapriyogibahari7@gmail.com',email_confirmed_at:'2026-07-21T10:49:16Z' };
const select = (model='nara-max',intelligence='xhigh',hasImage=false) => ({model,intelligence,hasImage});
test('designated owner gets private maximum route only after database authorization',async()=>{
 let actor;const value=await resolvePrivateNaraRoute(owner,select(),async id=>{actor=id;return true;});
 assert.equal(actor,owner.id);assert.equal(value.route,'private-max');assert.equal(value.enhanced,true);assert.equal(value.model,'nara-max');assert.equal(value.intelligence,'xhigh');
});
test('vision selection and supported image requests choose private vision',async()=>{
 assert.equal((await resolvePrivateNaraRoute(owner,select('nara-vision','standard'),async()=>true)).route,'private-vision');
 assert.equal((await resolvePrivateNaraRoute(owner,select('nara-max','xhigh',true),async()=>true)).route,'private-vision');
});
test('ordinary users and guests retain existing routing without database lookup',async()=>{
 for(const user of [null,{...owner,id:'other-user'},{...owner,email:'other@example.com'},{...owner,email_confirmed_at:null}]){
  const value=await resolvePrivateNaraRoute(user,select(),async()=>{throw Error('MUST_NOT_QUERY');});assert.equal(value.route,'public-existing');assert.equal(value.enhanced,false);
 }
});
test('owner ordinary selections remain unchanged',async()=>{
 const value=await resolvePrivateNaraRoute(owner,select('nara-mini','standard'),async()=>{throw Error('MUST_NOT_QUERY');});assert.equal(value.route,'public-existing');
});
test('inactive database authorization does not grant enhanced access',async()=>{
 for(const active of [false,null,undefined,'true',1])assert.equal((await resolvePrivateNaraRoute(owner,select(),async()=>active)).enhanced,false);
});
test('authorization outages fail closed',async()=>{
 await assert.rejects(resolvePrivateNaraRoute(owner,select(),async()=>{throw Error('PRIVATE_DETAIL');}),{message:'PRIVATE_NARA_AUTH_UNAVAILABLE'});
 await assert.rejects(resolvePrivateNaraRoute(owner,select()),{message:'PRIVATE_NARA_AUTH_UNAVAILABLE'});
});
test('payload cannot request administrative identity or a private route directly',async()=>{
 for(const extra of [{admin:true},{route:'private-max'},{user:owner}])await assert.rejects(resolvePrivateNaraRoute(owner,{...select(),...extra},async()=>true),/INVALID_NARA_SELECTION/);
});
test('Writer image limitations and unknown selections are not bypassed',async()=>{
 await assert.rejects(resolvePrivateNaraRoute(owner,select('nara-writer','xhigh',true),async()=>true),/VISION_MODEL_REQUIRED/);
 await assert.rejects(resolvePrivateNaraRoute(owner,select('constructor'),async()=>true),/INVALID_NARA_SELECTION/);
});
