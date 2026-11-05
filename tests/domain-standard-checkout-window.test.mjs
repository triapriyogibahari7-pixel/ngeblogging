// Pure time contracts only. No database, gateway, or payment authorization.
import test from 'node:test';
import assert from 'node:assert/strict';
import {STANDARD_CHECKOUT_POLICY,STANDARD_CHECKOUT_MINUTES,STANDARD_CHECKOUT_MS,standardOrderPaymentDeadline,validateStandardCheckoutWindow as validate} from '../shared/domain-standard-checkout-window.mjs';
const created=Date.parse('2026-11-05T05:30:00Z'),iso=t=>new Date(t).toISOString();
const snapshot=()=>({action:'create',environment:'production',payment_window_policy:STANDARD_CHECKOUT_POLICY,order_created_at:iso(created),payment_window_expires_at:iso(created+7200000),expiry_anchor_at:iso(created),expires_at:iso(created+7200000),duration_minutes:120,fixture_only:false});
test('normal checkout policy is exactly 120 minutes',()=>{assert.equal(STANDARD_CHECKOUT_MINUTES,120);assert.equal(STANDARD_CHECKOUT_MS,7200000);});
test('deadline derives only from original order creation and never slides on retry',()=>{const stamp=iso(created);for(let i=0;i<3;i++)assert.equal(standardOrderPaymentDeadline(stamp),created+7200000);});
test('invalid creation times are rejected',()=>{for(const x of [null,undefined,123,'invalid'])assert.throws(()=>standardOrderPaymentDeadline(x));});
test('valid trusted snapshot supports a two-hour normal window',()=>{const s=snapshot();assert.equal(validate(s,created+1000),s);});
test('delayed first checkout uses remaining time rather than a fresh two hours',()=>{const s={...snapshot(),expiry_anchor_at:iso(created+3600000),duration_minutes:60};assert.equal(validate(s,created+3601000),s);});
test('declared deadline cannot be extended or rolled forward',()=>{const s=snapshot();assert.throws(()=>validate({...s,payment_window_expires_at:iso(created+7260000)},created+1000));assert.throws(()=>validate({...s,expiry_anchor_at:iso(created+3600000),expires_at:iso(created+10800000)},created+3601000));});
test('recovery or sandbox markers cannot masquerade as normal production policy',()=>{const s=snapshot();assert.throws(()=>validate({...s,payment_window_policy:'same-order-recovery-2h-v2'},created+1000));assert.throws(()=>validate({...s,environment:'sandbox'},created+1000));});
test('fixture, fractional or excessive duration is rejected',()=>{const s=snapshot();for(const patch of [{fixture_only:true},{duration_minutes:120.5},{duration_minutes:121},{duration_minutes:119}])assert.throws(()=>validate({...s,...patch},created+1000));});
test('elapsed, future or non-second-aligned snapshots are rejected',()=>{const s=snapshot();assert.throws(()=>validate(s,created+7200000));assert.throws(()=>validate(s,created-6000));assert.throws(()=>validate({...s,expiry_anchor_at:iso(created+1)},created+1000));});
test('reuse retains its original bounded deadline',()=>{const s={...snapshot(),action:'reuse'};delete s.duration_minutes;assert.equal(validate(s,created+3600000).expires_at,iso(created+7200000));});
