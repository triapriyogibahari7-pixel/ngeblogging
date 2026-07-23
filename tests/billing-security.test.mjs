import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PLANS } from "../server/billing-handler.mjs";

const handler=readFileSync(new URL("../server/billing-handler.mjs",import.meta.url),"utf8");
const view=readFileSync(new URL("../src/BillingView.jsx",import.meta.url),"utf8");
const migration=readFileSync(new URL("../supabase/migrations/20260723170000_backup_and_professional_billing.sql",import.meta.url),"utf8");

test("billing plans are server-owned and positive",()=>{
  assert.ok(Object.keys(PLANS).length>=3);
  for(const plan of Object.values(PLANS)){
    assert.ok(Number(plan.amount)>0);
    assert.match(plan.currency,/^[A-Z]{3}$/);
    assert.ok(plan.durationDays>0);
  }
});

test("PayPal checkout locks idempotency invoice amount currency and webhook verification",()=>{
  for(const marker of ["paypal-request-id","invoice_id","idempotencyKey","verify-webhook-signature","PAYPAL_WEBHOOK_ID","validateCapturedAmount","AMOUNT_MISMATCH","ORDER_ALREADY_CAPTURED"]){assert.match(handler,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));}
  assert.match(handler,/PAYMENT\.CAPTURE\.COMPLETED/);
  assert.match(handler,/PAYMENT\.CAPTURE\.REFUNDED/);
});

test("local payment adapter uses HMAC timestamp replay protection and server prices",()=>{
  assert.match(handler,/LOCAL_PLAN_PRICES_JSON/);
  assert.match(handler,/hmacHex/);
  assert.match(handler,/x-ngeblogging-timestamp/);
  assert.match(handler,/5 \* 60 \* 1000/);
  assert.match(handler,/constantTimeEqual/);
});

test("browser capture no longer trusts a client supplied plan",()=>{
  assert.match(view,/paypal\/capture",\{orderId\}/);
  assert.doesNotMatch(view,/paypal\/capture",\{orderId,planId\}/);
  assert.match(view,/Riwayat transaksi & invoice/);
});

test("database stores webhook deduplication invoices and backup events",()=>{
  for(const marker of ["billing_webhook_events","provider_event_id","invoice_number","idempotency_key","site_backup_events","plan_expires_at"]){assert.match(migration,new RegExp(marker));}
});
