import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareOwnerGeneralMessages as prepare, NARA_GENERAL_SYSTEM } from '../server/nara-owner-general-messages.mjs';
const owner={id:'91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3',email:'triapriyogibahari7@gmail.com',email_confirmed_at:'2026-11-08T00:00:00Z'};
const mode={model:'nara-max',intelligence:'xhigh'};
const context='\n\nKonteks Ngeblogging:\n'+JSON.stringify({siteName:'Situs Admin',article:'Artikel otomatis'});
test('general coding task replaces blogging system and removes automatic site context',()=>{
 const messages=[{role:'system',content:'Bantu artikel dan SEO'},{role:'user',content:'Perbaiki fungsi JavaScript berikut'+context+'\n\n--- Lampiran kode.js ---\nconst answer=42;'}];
 const result=prepare(owner,mode,messages);assert.equal(result[0].content,NARA_GENERAL_SYSTEM);assert.ok(!JSON.stringify(result).includes('Situs Admin'));assert.match(result[1].content,/const answer=42/);assert.ok(messages[1].content.includes('Situs Admin'));
});
test('explicit site work retains site context',()=>{const result=prepare(owner,mode,[{role:'user',content:'Periksa domain saya'+context}]);assert.ok(result[1].content.includes('Situs Admin'));});
test('connector evidence and image payload remain available',()=>{
 const image={type:'image_url',image_url:{url:'data:image/png;base64,test'}};
 const text='Analisis gambar ini\n\nKonteks Ngeblogging:\n'+JSON.stringify({siteName:'remove',naraConnectorEvidence:{results:[{status:'read_succeeded'}]}});
 const result=prepare(owner,mode,[{role:'user',content:[{type:'text',text},image]}]);assert.match(result[1].content[0].text,/read_succeeded/);assert.ok(!result[1].content[0].text.includes('siteName'));assert.equal(result[1].content[1],image);
});
test('other accounts and modes are unchanged',()=>{const messages=[{role:'system',content:'Existing'},{role:'user',content:'Hello'}];assert.equal(prepare({...owner,email:'other@example.com'},mode,messages),messages);assert.equal(prepare(owner,{...mode,intelligence:'standard'},messages),messages);});
