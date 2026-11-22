import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/lib/public-data.js',import.meta.url),'utf8');
const importLine='import { supabase, supabaseConfigured } from "./supabase.js";';
assert.equal(source.split(importLine).length,2,'Source import changed; review harness');
const executable=source.replace(importLine,'').replace(/^export /gm,'');
function fixture({pending=false,hidden=false,legacy=false,lookupError=false}={}) {
 const site={id:'site-a',slug:'burneoprime',name:'Burneo Prime',status:'active',is_public:!hidden,
  custom_domain:legacy?'triapriyoginotes.my.id':'burneoprime.ngeblogging.com',
  theme_key:'existing-theme',blueprint:'blog',settings:{logo:'existing-logo',navigation:['Home','About']}};
 const theme={site_id:site.id,active_theme_id:'published-theme',published_config:{color:'#123456'},
  code:{css:'.existing{display:block}'},widgets:[{id:'existing-widget'}]};
 const tables={sites:[site],site_theme_settings:[theme],site_domains:[{site_id:site.id,
  hostname:'triapriyoginotes.my.id',status:pending?'verifying':'active',
  provider_status:pending?'pending':'active',ssl_status:pending?'pending':'active'}]};
 const writes=[];
 const db={from(table){let predicates=[],maximum=Infinity;const q={
  select(){return q;},eq(k,v){predicates.push(r=>r[k]===v);return q;},
  in(k,values){predicates.push(r=>values.includes(r[k]));return q;},
  not(k,op,v){assert.equal(op,'is');predicates.push(r=>r[k]!==v);return q;},
  order(){return q;},limit(n){maximum=n;return q;},
  insert(){writes.push('insert');throw Error('READ_ONLY');},
  update(){writes.push('update');throw Error('READ_ONLY');},
  delete(){writes.push('delete');throw Error('READ_ONLY');},
  maybeSingle(){return Promise.resolve(result(true));},
  then(resolve,reject){return Promise.resolve(result(false)).then(resolve,reject);}
 };function result(single){if(lookupError&&table==='site_domains')return {data:null,error:Error('unavailable')};
  const rows=(tables[table]||[]).filter(r=>predicates.every(p=>p(r))).slice(0,maximum);
  return {data:single?(rows[0]||null):rows,error:null};}return q;}};
 const context=vm.createContext({supabase:db,supabaseConfigured:true,setTimeout,clearTimeout,
  console:{warn(){}},URL});
 vm.runInContext(executable+';globalThis.subject={resolvePublishedSite};',context,{timeout:1000});
 return {resolve:context.subject.resolvePublishedSite,site,theme,writes,tables};
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('free and connected custom hostname return the same site and published theme',async()=>{
 const f=fixture(),before=JSON.stringify(f.tables);
 const free=await f.resolve({hostname:'burneoprime.ngeblogging.com'});
 const custom=await f.resolve({hostname:'triapriyoginotes.my.id'});
 assert.deepEqual(plain(custom),plain(free));assert.equal(custom.id,'site-a');
 assert.deepEqual(plain(custom.theme),f.theme);assert.equal(JSON.stringify(f.tables),before);
 assert.deepEqual(f.writes,[]);
});
test('same theme settings code widgets and navigation are preserved',async()=>{
 const f=fixture(),result=await f.resolve({hostname:'triapriyoginotes.my.id'});
 assert.equal(result.theme_key,f.site.theme_key);assert.deepEqual(plain(result.settings),f.site.settings);
 assert.deepEqual(plain(result.theme.code),f.theme.code);assert.deepEqual(plain(result.theme.widgets),f.theme.widgets);
});
test('pending additional domain is not resolved as an active site',async()=>{
 const f=fixture({pending:true});assert.equal(await f.resolve({hostname:'triapriyoginotes.my.id'}),null);
});
test('unknown hostname cannot select a site using the path slug',async()=>{
 const f=fixture();assert.equal(await f.resolve({hostname:'unconnected.example',slug:'burneoprime'}),null);
});
test('missing free hostname cannot select a different tenant from the path',async()=>{
 const f=fixture();assert.equal(await f.resolve({hostname:'missing.ngeblogging.com',slug:'burneoprime'}),null);
});
test('unpublished site is hidden for both free and custom hostnames',async()=>{
 const f=fixture({hidden:true});for(const hostname of ['burneoprime.ngeblogging.com','triapriyoginotes.my.id'])
 assert.equal(await f.resolve({hostname}),null);
});
test('www fallback returns the same site and theme',async()=>{
 const f=fixture();assert.deepEqual(plain(await f.resolve({hostname:'www.triapriyoginotes.my.id'})),
 plain(await f.resolve({hostname:'triapriyoginotes.my.id'})));
});
test('legacy recovery preserves site identity when domain lookup is unavailable',async()=>{
 const f=fixture({legacy:true,lookupError:true});const result=await f.resolve({hostname:'triapriyoginotes.my.id'});
 assert.equal(result.id,'site-a');assert.deepEqual(plain(result.theme),f.theme);assert.deepEqual(f.writes,[]);
});
