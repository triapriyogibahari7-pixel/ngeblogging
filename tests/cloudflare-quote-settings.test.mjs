import test from 'node:test';
import assert from 'node:assert/strict';
import {readCloudflareQuoteSettings as read} from '../server/cloudflare-quote-settings.mjs';
const fixture=()=>({CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON:'["com","net"]',CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED:'false'});
test('existing text configuration retains its meaning',()=>{assert.deepEqual(read(fixture()),{extensions:['com','net'],taxIncluded:false,timeoutMs:10000});});
test('native JSON bindings support the same verified operator inputs',()=>{
 const env={...fixture(),CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON:['com','net'],CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED:true,CLOUDFLARE_REGISTRAR_QUOTE_TIMEOUT_MS:15000};
 const out=read(env);assert.equal(out.taxIncluded,true);assert.equal(out.timeoutMs,15000);assert.deepEqual(out.extensions,['com','net']);assert.ok(Object.isFrozen(out));assert.ok(Object.isFrozen(out.extensions));env.CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON.push('org');assert.deepEqual(out.extensions,['com','net']);
});
test('missing or malformed extensions never acquire an invented default',()=>{
 for(const value of [undefined,null,{},'','not-json','[]',['com','com'],['COM'],['bad/path'],['']])assert.throws(()=>read({...fixture(),CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON:value}));
});
test('tax status must be explicit, without guessing',()=>{
 for(const value of [undefined,null,0,1,'TRUE',' false '])assert.throws(()=>read({...fixture(),CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED:value}));
 for(const value of [false,'false'])assert.equal(read({...fixture(),CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED:value}).taxIncluded,false);
});
test('timeout validation stays bounded for text and native JSON',()=>{
 for(const value of [0,30001,1.5,'0','0001','30001',null,true])assert.throws(()=>read({...fixture(),CLOUDFLARE_REGISTRAR_QUOTE_TIMEOUT_MS:value}));
 assert.equal(read({...fixture(),CLOUDFLARE_REGISTRAR_QUOTE_TIMEOUT_MS:'15000'}).timeoutMs,15000);
});
