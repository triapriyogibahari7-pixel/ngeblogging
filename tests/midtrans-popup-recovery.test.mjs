import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { embedFrameState } from '../src/midtrans-embed-watchdog.mjs';
const source=readFileSync(new URL('../src/PremiumCheckout.jsx',import.meta.url),'utf8');
const start=source.indexOf('const started=Date.now();let seen=false,missingSince=null;');
const end=source.indexOf('\n    }catch(error)',start);
assert.ok(start>=0&&end>start,'actual checkout monitor must be present');
const block=source.slice(start,end);
function harness(){
 let now=0,visible=false,tick;
 const monitor={current:null},live={current:true},lock={current:true},reports=[];
 const stop=()=>{monitor.current=null;lock.current=false;};
 vm.runInNewContext(block,{Date:{now:()=>now},monitor,live,stop,document:{},window:{},environment:'production',embedFrameState,paymentPopupVisible:()=>visible,report:(state,message)=>reports.push({state,message}),setInterval:(fn,ms)=>{assert.equal(ms,500);tick=fn;return 1;}});
 return {tick:(time,value)=>{now=time;visible=value;tick();},monitor,live,lock,reports};
}
test('visible popup is reported once and stays locked while open',()=>{
 const h=harness();h.tick(500,true);h.tick(1000,true);
 assert.equal(h.reports.length,1);assert.equal(h.reports[0].state,'open');assert.equal(h.lock.current,true);
});
test('missing popup unlocks the same-order button after two seconds without onClose',()=>{
 const h=harness();h.tick(500,true);h.tick(1000,false);h.tick(2999,false);
 assert.equal(h.lock.current,true);h.tick(3000,false);
 assert.equal(h.lock.current,false);assert.equal(h.monitor.current,null);
 assert.equal(h.reports.at(-1).state,'error');assert.match(h.reports.at(-1).message,/order yang sama/);
});
test('temporary disappearance does not unlock or report failure',()=>{
 const h=harness();h.tick(500,true);h.tick(1000,false);h.tick(2500,true);
 assert.equal(h.lock.current,true);assert.equal(h.reports.length,1);
});
test('visibility resets the continuous missing period',()=>{
 const h=harness();h.tick(500,true);h.tick(1000,false);h.tick(2500,true);h.tick(3000,false);h.tick(4999,false);
 assert.equal(h.lock.current,true);h.tick(5000,false);assert.equal(h.lock.current,false);
});
test('popup never appearing times out at twenty seconds',()=>{
 const h=harness();h.tick(19999,false);assert.equal(h.lock.current,true);h.tick(20000,false);
 assert.equal(h.lock.current,false);assert.equal(h.reports.at(-1).state,'error');assert.match(h.reports.at(-1).message,/belum terlihat/);
});
test('unmounted checkout stops without reporting new state',()=>{
 const h=harness();h.live.current=false;h.tick(500,false);
 assert.equal(h.lock.current,false);assert.equal(h.monitor.current,null);assert.equal(h.reports.length,0);
});
