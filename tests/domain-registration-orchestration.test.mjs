import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../server/cloudflare-full-zone-provider.mjs',import.meta.url),'utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'Production source anchors must match');return source.slice(a,b);}
const code=section('async function hydrateNameservers(', 'export async function getOrCreateFullZone(')+section('export async function getOrCreateFullZone(', 'export async function getFullZoneStatus(').replace('export async function','async function');
const zone={id:'b'.repeat(32),name:'customer.example',status:'pending',name_servers:[]};
function setup(find,create){const calls=[];const context=vm.createContext({normalizeZoneName:value=>value,findFullZone:async(...args)=>{calls.push('find');return find(...args);},createFullZone:async(...args)=>{calls.push('create');return create(...args);},getFullZoneStatus:()=>{throw Error('Registration must not poll zone status');},setTimeout:()=>{throw Error('Registration must not sleep');}});vm.runInContext(code,context);return {calls,run:()=>context.getOrCreateFullZone({},'customer.example')};}
test('existing pending zone returns without polling or creation',async()=>{const h=setup(()=>zone,()=>{throw Error('duplicate');});const result=await h.run();assert.equal(result.zone,zone);assert.equal(result.reused,true);assert.deepEqual(h.calls,['find']);});
test('new pending zone returns even before nameservers are assigned',async()=>{const h=setup(()=>null,()=>zone);const result=await h.run();assert.equal(result.zone,zone);assert.equal(result.reused,false);assert.deepEqual(h.calls,['find','create']);});
test('assigned nameservers are preserved without substituting branding',async()=>{const ready={...zone,name_servers:['one.ns.example','two.ns.example']};const h=setup(()=>ready,()=>null);const result=await h.run();assert.deepEqual(result.zone.name_servers,ready.name_servers);});
test('creation race reuses the zone found on the next lookup',async()=>{let count=0;const h=setup(()=>++count===1?null:zone,()=>{throw Error('conflict');});const result=await h.run();assert.equal(result.zone,zone);assert.equal(result.reused,true);assert.deepEqual(h.calls,['find','create','find']);});
test('provider error is not disguised as a successful pending zone',async()=>{const error=Error('permission denied'),h=setup(()=>null,()=>{throw error;});await assert.rejects(h.run(),e=>e===error);});
test('same sequential registration is reused rather than created twice',async()=>{let saved=null,creates=0;const h=setup(()=>saved,()=>{creates++;return saved=zone;});await h.run();await h.run();assert.equal(creates,1);});
