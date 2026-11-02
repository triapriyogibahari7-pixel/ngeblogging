import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
// Render the actual component. Only auth/data/child-component dependencies are
// stubbed; this verifies DOM placement, not production visual certification.
const stubs={
 './lib/auth-session-v76.js':"export async function getVerifiedSession(){throw Error('AUTH_CALL_FORBIDDEN_IN_HEADING_TEST');}",
 './lib/domain-customer-search.mjs':"export async function fetchCustomerDomainSearch(){throw Error('NETWORK_FORBIDDEN_IN_HEADING_TEST');} export const currentCustomerSearchView=()=>null; export const normalizeCustomerSearchQuery=x=>x;",
 './DomainCustomerReview.jsx':'export default function Review(){return null;}',
 './DomainCatalogStage6.jsx':'export default function Catalog(){return null;}',
 './lib/domain-catalog-stage6.mjs':'export const prepareCatalogDomain=x=>x;'
};
const prefix='\0domain-heading-test:';let server,Component;
before(async()=>{
 server=await createServer({configFile:false,envFile:false,logLevel:'error',appType:'custom',server:{middlewareMode:true,watch:null},ssr:{external:['react','react-dom']},resolve:{dedupe:['react','react-dom']},plugins:[{name:'isolated-domain-heading-dependencies',enforce:'pre',resolveId(source,importer){if(importer?.split('?')[0].endsWith('/src/DomainCustomerSearch.jsx')&&Object.hasOwn(stubs,source))return prefix+source;},load(id){if(id.startsWith(prefix))return stubs[id.slice(prefix.length)];}}]});
 Component=(await server.ssrLoadModule('/src/DomainCustomerSearch.jsx')).default;
},{timeout:30000});
after(async()=>{await server?.close();});
function render(){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{origin:'https://ngeblogging.com'}}});
 try{return renderToStaticMarkup(React.createElement(Component,{user:{id:'11111111-1111-4111-8111-111111111111'},siteId:'22222222-2222-4222-8222-222222222222',siteName:'Situs uji'}));}
 finally{if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;}
}
test('search title is inside the form directly before the query label',()=>{
 const html=render(),form=html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/)?.[1];assert.ok(form);
 const marker=form.indexOf('data-domain-search-heading="above-query"'),brand=form.indexOf('NGEBLOGGING DOMAINS'),title=form.indexOf('Temukan domain untuk situs Anda'),label=form.indexOf('Nama domain atau kata kunci');
 assert.ok(marker>=0&&brand>marker&&title>brand&&label>title);
 assert.match(form,/Temukan domain untuk situs Anda<\/h2><\/div><label/);
 assert.equal((html.match(/NGEBLOGGING DOMAINS/g)||[]).length,1);assert.equal((html.match(/Temukan domain untuk situs Anda/g)||[]).length,1);
});
test('site context precedes the form and the search card adds no page header element',()=>{
 const html=render();assert.ok(html.indexOf('Situs yang dikelola:')<html.indexOf('<form'));assert.ok(html.includes('Situs uji'));assert.doesNotMatch(html,/<header\b/);assert.ok(html.includes('Cari domain dan harga'));assert.ok(html.includes('Saran nama domain'));
});
test('heading has a scoped full-width form row and remains in normal document flow',()=>{
 const css=readFileSync(new URL('../src/domain-customer-search.css',import.meta.url),'utf8');
 const rule=css.match(/\.dcs-panel\s+\.dcs-form\s*>\s*\.dcs-search-heading\s*\{([^}]+)\}/)?.[1];assert.ok(rule);
 assert.match(rule,/flex:\s*0\s+0\s+100%/);assert.match(rule,/width:\s*100%/);assert.match(rule,/position:\s*static/);
 assert.match(css,/@media\s*\(max-width:\s*720px\)/);
});
