import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
function extract(name){
  const start=source.indexOf(`function ${name}()`);
  const end=source.indexOf('\n}\n',start);
  assert.ok(start>=0 && end>start,`Missing ${name}`);
  return source.slice(start,end+3);
}
function classify(hostname){
  const context=vm.createContext({window:{location:{hostname}}});
  vm.runInContext(extract('isPublicTenantHost')+'\n'+extract('detectPublishedSiteTarget'),context);
  return {inner:context.isPublicTenantHost(),outer:context.detectPublishedSiteTarget()};
}
test('Netlify PR preview uses the application in both routing checks',()=>{
  const result=classify('deploy-preview-729--ngeblogging.netlify.app');
  assert.equal(result.inner,false);
  assert.equal(result.outer,null);
});
test('Pages and Workers hosting routes agree with the existing entry check',()=>{
  for(const hostname of ['preview.ngeblogging.pages.dev','ngeblogging.triapriyogibahari7.workers.dev']){
    const result=classify(hostname);
    assert.equal(result.inner,false);
    assert.equal(result.outer,null);
  }
});
test('production app and local development remain non-tenant routes',()=>{
  for(const hostname of ['ngeblogging.com','www.ngeblogging.com','localhost','127.0.0.1']){
    const result=classify(hostname);
    assert.equal(result.inner,false);
    assert.equal(result.outer,null);
  }
});
test('free subdomains and customer domains retain public-site routing',()=>{
  for(const hostname of ['free-site.ngeblogging.com','customer.example','www.customer.example','preview.netlify.app.customer.example']){
    const result=classify(hostname);
    assert.equal(result.inner,true);
    assert.equal(result.outer.hostname,hostname);
  }
});
test('reserved studio and API hosts retain their existing inner classification',()=>{
  for(const hostname of ['studio.ngeblogging.com','api.ngeblogging.com'])assert.equal(classify(hostname).inner,false);
});
test('hostname normalization is retained',()=>{
  assert.equal(classify('DEPLOY-PREVIEW-729--NGEBLOGGING.NETLIFY.APP').inner,false);
  assert.equal(classify('CUSTOMER.EXAMPLE').inner,true);
});
test('inner classification remains safe without a browser window',()=>{
  const context=vm.createContext({});
  vm.runInContext(extract('isPublicTenantHost'),context);
  assert.equal(context.isPublicTenantHost(),false);
});
