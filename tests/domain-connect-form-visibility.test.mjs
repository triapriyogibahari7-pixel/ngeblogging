import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/DomainPanelV124.jsx',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function normalizeDomainName('),source.indexOf('function nameservers('));
const expression=source.match(/const hasCustomDomain = (.+);/);
assert.ok(expression,'visibility predicate must exist');
const hidden=new Function('site','sortedDomains',helpers+`const initialCustomDomain=normalizeDomainName(site?.custom_domain);const initialExternalCustomDomain=isManagedFreeDomain(initialCustomDomain)?'':initialCustomDomain;return (${expression[1]});`);
const site={id:'site-a',custom_domain:null};
test('connect section is conditionally rendered while management remains available',()=>{
 assert.match(source,/\{!hasCustomDomain \? <section className="sv124-card sv124-domain-register">/);
 assert.match(source,/onClick=\{\(\) => refresh\(domain\)\}/);
 assert.match(source,/onClick=\{\(\) => remove\(domain\)\}/);
});
test('saved custom domain hides the form before API rows arrive',()=>{assert.equal(hidden({...site,custom_domain:'https://www.example.com'},[]),true);});
test('current-site custom domain hides the form for every stored state',()=>{
 for(const status of ['pending','verifying','active','failed','pending_deletion'])assert.equal(hidden(site,[{site_id:site.id,hostname:'example.com',status}]),true,status);
});
test('another sites domain must not hide the form',()=>{assert.equal(hidden(site,[{site_id:'site-b',hostname:'example.com',status:'active'}]),false);});
test('free subdomain and empty hostnames do not hide the form',()=>{
 assert.equal(hidden({...site,custom_domain:'blog.ngeblogging.com'},[{site_id:site.id,hostname:'blog.ngeblogging.com'},{site_id:site.id,hostname:''}]),false);
});
test('form becomes available after domain rows and canonical custom domain are removed',()=>{assert.equal(hidden(site,[]),false);});
