import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../src/DomainOrderSummaryCard.mjs',import.meta.url),'utf8');
const css=await readFile(new URL('../src/domain-order-summary-flow.css',import.meta.url),'utf8');
// Tree fixture only: no browser layout or real React rendering is asserted.
const react={createElement:(type,props,...children)=>({type,props:props||{},children})};
const fixtureSource=source.replace(/^import[^\n]+;\n/gm,'').replace('export function domainOrderSummary','function domainOrderSummary').replace('export default function DomainOrderSummaryCard','function DomainOrderSummaryCard');
const {Card,summary}=new vm.Script(fixtureSource+';({Card:DomainOrderSummaryCard,summary:domainOrderSummary});').runInNewContext({React:react,Intl,Date,Number,String,Object,Array});
const order=i=>({orderId:'DOM-'+i.toString(16).padStart(40,'0'),domain:'checkout-'+i+'.com',currency:'IDR',amountIdr:285000,paymentState:'pending',registrationState:'not_started',resolution:'none',registrar:{}});
function nodes(tree){if(!tree||typeof tree!=='object')return [];return [tree,...tree.children.flatMap(nodes)];}
test('card removes the duplicated Domain publication label and generic header',()=>{const tree=Card({order:order(1)});assert.equal(nodes(tree).some(n=>n.type==='header'),false);assert.equal(JSON.stringify(tree).includes('DOMAIN & PUBLIKASI'),false);});
test('domain remains inside its own normal-flow card heading',()=>{const tree=Card({order:order(2)}),heading=tree.children[0];assert.equal(heading.type,'div');assert.equal(heading.props.className,'nd-summary-heading');assert.equal(heading.children[0].props.className,'nd-summary-domain');assert.equal(heading.children[0].children[0],'checkout-2.com');});
test('50 independent card trees keep their own domain and detail URL',()=>{for(let i=1;i<=50;i++){const o=order(i),tree=Card({order:o}),link=nodes(tree).find(n=>n.type==='a');assert.equal(tree.children[0].children[0].children[0],o.domain);assert.equal(link.props.href,'/domains/orders/'+o.orderId);assert.equal(nodes(tree).some(n=>n.type==='header'),false);assert.equal(JSON.stringify(tree).includes('/50'),false);}});
test('refresh callback is retained without invoking payment',()=>{let calls=0;const callback=()=>calls++,tree=Card({order:order(3),onRefresh:callback}),button=nodes(tree).find(n=>n.type==='button');assert.equal(button.props.onClick,callback);button.props.onClick();assert.equal(calls,1);});
test('invalid order is still rejected',()=>{assert.equal(Card({order:{...order(4),orderId:'bad'}}),null);});
test('unverified payment and registration remain unverified',()=>{const view=summary({...order(5),paymentState:'paid',registrationState:'registered'});assert.equal(view.payment,'Perlu verifikasi');assert.equal(view.registration,'Pendaftaran belum terverifikasi');assert.equal(view.expiry,'Belum tersedia');});
test('new stylesheet only targets the order card heading',()=>{const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');const selectors=[...clean.matchAll(/([^{}]+)\{/g)].map(m=>m[1].trim());assert.equal(selectors.length,2);assert.ok(selectors.every(s=>s.startsWith('.nd-order-summary>.nd-summary-heading')));assert.equal((clean.match(/position:static!important/g)||[]).length,2);assert.ok(clean.includes('white-space:normal!important'));assert.ok(clean.includes('overflow-wrap:anywhere'));assert.equal(/position\s*:\s*(fixed|sticky|absolute)/.test(clean),false);});
