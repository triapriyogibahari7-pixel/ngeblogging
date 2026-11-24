import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const blob=text=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(text)),Buffer.from([0]),Buffer.from(text)])).digest('hex');
test('API insertion preserves every byte of existing domain delegation and scheduling',()=>{
 const restored=read('cloudflare/domain-recovery-worker-v2.mjs').replace("import {developerApiResponse} from '../server/developer-api-branding.mjs';\n",'').replace(' const developerApi=await developerApiResponse(request,env);\n if(developerApi)return developerApi;\n','');
 assert.equal(blob(restored),'31a2c6913e4845ef5eb312ae55314f146fd08762');
});
test('API Keys UI uses branded URL and env placeholder without changing secret copy or RPCs',()=>{
 const panel=read('src/ApiKeysPanel.jsx');
 assert.ok(panel.includes("const API_BASE='https://ngeblogging.com/api/developer';"));
 assert.ok(panel.includes("import './api-keys-secret-layout.css';"));
 const curl=panel.split('\n').find(line=>line.includes('const curlExample='));
 assert.ok(curl.includes('$NGEBLOGGING_API_KEY'));assert.doesNotMatch(curl,/revealed|ngb_live_/);
 assert.ok(panel.includes("supabase.rpc('list_api_keys')"));assert.ok(panel.includes("supabase.rpc('create_api_key'"));assert.ok(panel.includes('supabase.rpc(`${action}_api_key`'));
 assert.ok(panel.includes('copy(revealed.secret'));assert.ok(panel.includes('authorization:`Bearer ${revealed.secret}`'));
 assert.doesNotMatch(panel,/https:\/\/[^'"\s]*supabase\.co|Koneksi Supabase/);
});
