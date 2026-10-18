import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { catalogEnvironment } from "../server/midtrans-catalog-api.mjs";
import { stateOf } from "../server/midtrans-api.mjs";

const source=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("catalog exposes authoritative Pro and Max prices",()=>{
 const env=catalogEnvironment({MIDTRANS_ENV:"sandbox"});
 assert.deepEqual(JSON.parse(env.MIDTRANS_PLAN_PRICES_JSON),{pro_monthly:300000,pro_yearly:3000000,max_yearly:5000000});
});

test("only verified successful Midtrans states become paid",()=>{
 assert.equal(stateOf({status_code:"200",transaction_status:"settlement"}),"paid");
 assert.equal(stateOf({status_code:"200",transaction_status:"capture",fraud_status:"accept"}),"paid");
 assert.equal(stateOf({status_code:"200",transaction_status:"capture",fraud_status:"challenge"}),"pending");
 assert.equal(stateOf({status_code:"201",transaction_status:"settlement"}),"pending");
 assert.equal(stateOf({status_code:"200",transaction_status:"refund"}),"review_required");
});

test("checkout never trusts client price and enforces official Midtrans origins",()=>{
 const api=source("server/midtrans-api.mjs");
 assert.match(api,/const plan=plans\.find\(p=>p\.id===b\.planId\)/);
 assert.doesNotMatch(api,/b\.amount|body\.amount/);
 assert.match(api,/u\.origin===base/);
 assert.match(api,/SHA-512/);
 assert.match(api,/MAX_PLAN_ACTIVE/);
});

test("database migration activates Max and remains idempotent",()=>{
 const sql=source("supabase/migrations/20261018090000_nara_max_midtrans.sql");
 assert.match(sql,/billing_tier IN \('free','pro','max'\)/);
 assert.match(sql,/o\.plan_id='max_yearly'/);
 assert.match(sql,/o\.activated_at IS NOT NULL/);
 assert.match(sql,/o\.environment='sandbox'/);
 assert.match(sql,/v_tier='max'.*v_target_tier='pro'/s);
});

test("professional checkout clearly separates Pro and Max",()=>{
 const ui=source("src/BillingView.jsx");
 assert.match(ui,/Pilih paket yang tepat untuk berkembang/);
 assert.match(ui,/Pro Bulanan/);
 assert.match(ui,/Pro Tahunan/);
 assert.match(ui,/Max Tahunan/);
 assert.match(ui,/Tidak ada uang nyata yang diterima/);
 assert.match(ui,/Ngeblogging tidak meminta transfer manual/);
});
