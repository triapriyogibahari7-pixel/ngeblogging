import test from 'node:test';
import assert from 'node:assert/strict';
import { ensurePaymentPopupLayer, paymentPopupVisible, openPaymentPopup } from '../src/midtrans-popup-sdk.mjs';
test('payment layer stylesheet is scoped, highest, and installed once',()=>{
 const nodes=[]; const doc={getElementById:id=>nodes.find(n=>n.id===id),createElement:()=>({}),head:{appendChild:n=>nodes.push(n)}};
 ensurePaymentPopupLayer(doc);ensurePaymentPopupLayer(doc);
 assert.equal(nodes.length,1);
 assert.match(nodes[0].textContent,/z-index: 2147483647 !important/);
 assert.match(nodes[0].textContent,/iframe#snap-midtrans/);
 assert.doesNotMatch(nodes[0].textContent,/display:|visibility:|opacity:|\.nara-/);
});
function fixture({covered=false,hidden=false,offscreen=false,src='https://app.midtrans.com/snap/v4/popup/token'}={}){
 const frame={src,getBoundingClientRect:()=>offscreen?{left:500,top:0,right:600,bottom:100,width:100,height:100}:{left:0,top:0,right:360,bottom:640,width:360,height:640}};
 const doc={querySelectorAll:()=>[frame],elementFromPoint:()=>covered?{}:frame};
 const win={innerWidth:360,innerHeight:640,getComputedStyle:()=>({display:hidden?'none':'block',visibility:'visible',opacity:'1'})};
 return {doc,win};
}
for(const [name,options,expected] of [
 ['visible payment',{},true],['covered by Nara overlay',{covered:true},false],['SDK hidden state',{hidden:true},false],['outside viewport',{offscreen:true},false],['foreign origin',{src:'https://evil.example/snap/popup'},false],['wrong environment',{src:'https://app.sandbox.midtrans.com/snap/popup'},false]
])test(name,()=>{const {doc,win}=fixture(options);assert.equal(paymentPopupVisible(doc,win,'production'),expected);});
test('sandbox popup detected only in sandbox',()=>{const {doc,win}=fixture({src:'https://app.sandbox.midtrans.com/snap/popup'});assert.equal(paymentPopupVisible(doc,win,'sandbox'),true);});
test('same token and callbacks are forwarded unchanged',()=>{const events=[];const callbacks={onClose:()=>{}};const sdk={hide:()=>events.push('hide'),pay:(token,cb)=>events.push([token,cb])};openPaymentPopup(sdk,'same-order-token',callbacks);assert.deepEqual(events,['hide',['same-order-token',callbacks]]);});
