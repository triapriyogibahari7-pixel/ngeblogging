const PLANS = {
  pro_monthly: { label: "Ngeblogging Pro Bulanan", amount: "5.00", currency: "USD", durationDays: 31, tier: "pro" },
  pro_yearly: { label: "Ngeblogging Pro Tahunan", amount: "50.00", currency: "USD", durationDays: 366, tier: "pro" },
  supporter: { label: "Ngeblogging Supporter", amount: "2.00", currency: "USD", durationDays: 31, tier: "supporter" },
};

const FINAL_STATUSES = new Set(["completed", "refunded", "cancelled"]);
const LOCAL_METHODS = new Set(["qris", "bank_transfer", "virtual_account", "ewallet", "card"]);

function response(status, body, requestId = "", headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(requestId ? { "x-request-id": requestId } : {}),
      ...headers,
    },
  });
}

function htmlResponse(status, html, filename, requestId = "") {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function supabaseConfig(env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "",
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function requireAdmin(env) {
  const config = supabaseConfig(env);
  if (!config.url || !config.serviceKey) throw Object.assign(new Error("Penyimpanan transaksi server belum dikonfigurasi."), { status: 503, code: "BILLING_STORAGE_REQUIRED" });
  return config;
}

async function verifyUser(request, env) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error("Silakan masuk untuk melanjutkan pembayaran."), { status: 401, code: "AUTH_REQUIRED" });
  const { url, publishableKey } = supabaseConfig(env);
  if (!url || !publishableKey) throw Object.assign(new Error("Konfigurasi autentikasi pembayaran belum lengkap."), { status: 503 });
  const result = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publishableKey, authorization: `Bearer ${token}` } });
  if (!result.ok) throw Object.assign(new Error("Sesi pengguna tidak valid."), { status: 401, code: "INVALID_SESSION" });
  return { user: await result.json(), token };
}

function adminHeaders(serviceKey, prefer = "") {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

async function adminJson(env, path, options = {}) {
  const { url, serviceKey } = requireAdmin(env);
  const result = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { ...adminHeaders(serviceKey, options.prefer), ...(options.headers || {}) },
  });
  const payload = await result.json().catch(() => null);
  if (!result.ok) {
    console.error("Billing database request failed", { path, status: result.status, code: payload?.code });
    throw Object.assign(new Error("Penyimpanan pembayaran belum dapat diproses."), { status: 503, code: "BILLING_DATABASE_ERROR" });
  }
  return payload;
}

function paypalBase(env) {
  return String(env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken(env) {
  const clientId = env.PAYPAL_CLIENT_ID || "";
  const secret = env.PAYPAL_CLIENT_SECRET || "";
  if (!clientId || !secret) throw Object.assign(new Error("PayPal belum dikonfigurasi pada Cloudflare secrets."), { status: 503, code: "PAYPAL_CONFIG_REQUIRED" });
  const result = await fetch(`${paypalBase(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: { authorization: `Basic ${btoa(`${clientId}:${secret}`)}`, "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok || !payload.access_token) throw Object.assign(new Error("Autentikasi PayPal gagal."), { status: 502, code: "PAYPAL_AUTH_FAILED" });
  return payload.access_token;
}

async function paypalRequest(env, path, options = {}) {
  const token = await paypalAccessToken(env);
  const result = await fetch(`${paypalBase(env)}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
      prefer: "return=representation",
      "paypal-request-id": options.requestId || crypto.randomUUID(),
      ...(options.headers || {}),
    },
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) {
    console.error("PayPal request failed", { path, status: result.status, name: payload?.name, debugId: payload?.debug_id, issue: payload?.details?.[0]?.issue });
    throw Object.assign(new Error(payload?.message || "Permintaan PayPal belum berhasil."), { status: 502, code: payload?.details?.[0]?.issue || payload?.name || "PAYPAL_REQUEST_FAILED", providerStatus: result.status });
  }
  return payload;
}

function validIdempotency(value) {
  return /^[a-zA-Z0-9_-]{16,108}$/.test(String(value || ""));
}

function invoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `NGB-${date}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

function parseLocalPrices(env) {
  try {
    const input = JSON.parse(env.LOCAL_PLAN_PRICES_JSON || "{}");
    const output = {};
    for (const [planId, value] of Object.entries(input)) {
      if (!PLANS[planId] || !value || typeof value !== "object") continue;
      const amount = Number(value.amount);
      const currency = String(value.currency || "IDR").toUpperCase();
      if (Number.isFinite(amount) && amount > 0 && /^[A-Z]{3}$/.test(currency)) output[planId] = { amount, currency };
    }
    return output;
  } catch {
    return {};
  }
}

async function findOrderByIdempotency(env, userId, key) {
  const rows = await adminJson(env, `billing_orders?user_id=eq.${encodeURIComponent(userId)}&idempotency_key=eq.${encodeURIComponent(key)}&select=*&limit=1`);
  return rows?.[0] || null;
}

async function findOrderByProviderId(env, providerOrderId) {
  const rows = await adminJson(env, `billing_orders?provider_order_id=eq.${encodeURIComponent(providerOrderId)}&select=*&limit=1`);
  return rows?.[0] || null;
}

async function findOrderByCaptureId(env, captureId) {
  const rows = await adminJson(env, `billing_orders?provider_capture_id=eq.${encodeURIComponent(captureId)}&select=*&limit=1`);
  return rows?.[0] || null;
}

async function createOrderRecord(env, payload) {
  const rows = await adminJson(env, "billing_orders", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify(payload),
  });
  return rows?.[0] || null;
}

async function patchOrder(env, providerOrderId, patch, extraFilter = "") {
  const rows = await adminJson(env, `billing_orders?provider_order_id=eq.${encodeURIComponent(providerOrderId)}${extraFilter}&select=*`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return rows?.[0] || null;
}

async function readProfile(env, userId) {
  const rows = await adminJson(env, `profiles?id=eq.${encodeURIComponent(userId)}&select=id,plan,plan_expires_at&limit=1`);
  return rows?.[0] || null;
}

async function activatePlan(env, userId, planId) {
  const plan = PLANS[planId];
  if (!plan) throw Object.assign(new Error("Paket transaksi tidak valid."), { status: 409, code: "INVALID_STORED_PLAN" });
  const profile = await readProfile(env, userId);
  const current = profile?.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : 0;
  const base = Math.max(Date.now(), Number.isFinite(current) ? current : 0);
  const expires = new Date(base + plan.durationDays * 86400000).toISOString();
  await adminJson(env, `profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ plan: plan.tier, plan_expires_at: expires, updated_at: new Date().toISOString() }),
  });
  return expires;
}

async function finalizePaidOrder(env, order, details = {}) {
  if (!order) throw Object.assign(new Error("Transaksi tidak ditemukan."), { status: 404, code: "ORDER_NOT_FOUND" });
  if (order.status === "completed" && order.plan_expires_at) return { order, completed: true, expiresAt: order.plan_expires_at, alreadyCompleted: true };
  const lockable = ["created", "approved", "pending", "payer_action_required", "activation_pending", "failed"].includes(String(order.status || "").toLowerCase());
  if (!lockable && order.status === "processing_activation") return { order, completed: false, processing: true };
  const locked = await patchOrder(env, order.provider_order_id, {
    status: "processing_activation",
    provider_capture_id: details.captureId || order.provider_capture_id,
    provider_event_id: details.eventId || order.provider_event_id,
    payer_email: details.payerEmail || order.payer_email,
    paid_at: details.paidAt || new Date().toISOString(),
    provider_payload: { ...(order.provider_payload || {}), ...(details.providerPayload || {}) },
  }, `&status=in.(${["created", "approved", "pending", "payer_action_required", "activation_pending", "failed"].join(",")})`);
  if (!locked) {
    const current = await findOrderByProviderId(env, order.provider_order_id);
    return { order: current || order, completed: current?.status === "completed", expiresAt: current?.plan_expires_at || null, processing: current?.status === "processing_activation" };
  }
  try {
    const expiresAt = await activatePlan(env, locked.user_id, locked.plan);
    const completedOrder = await patchOrder(env, locked.provider_order_id, {
      status: "completed",
      plan_expires_at: expiresAt,
      failure_code: null,
      failure_message: null,
    });
    return { order: completedOrder || locked, completed: true, expiresAt };
  } catch (error) {
    await patchOrder(env, locked.provider_order_id, { status: "activation_pending", failure_code: error.code || "ACTIVATION_PENDING", failure_message: error.message });
    throw Object.assign(new Error("Pembayaran diterima, tetapi aktivasi paket masih menunggu pemulihan otomatis."), { status: 503, code: "ACTIVATION_PENDING" });
  }
}

async function listAccount(env, user, token) {
  const { url, publishableKey } = supabaseConfig(env);
  const [profileResponse, ordersResponse] = await Promise.all([
    fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=plan,plan_expires_at`, { headers: { apikey: publishableKey, authorization: `Bearer ${token}` } }),
    fetch(`${url}/rest/v1/billing_orders?user_id=eq.${encodeURIComponent(user.id)}&select=id,provider,provider_order_id,invoice_number,plan,amount,currency,status,payment_method,payer_email,provider_capture_id,paid_at,plan_expires_at,refunded_at,created_at,updated_at&order=created_at.desc&limit=50`, { headers: { apikey: publishableKey, authorization: `Bearer ${token}` } }),
  ]);
  if (!profileResponse.ok || !ordersResponse.ok) throw Object.assign(new Error("Riwayat pembayaran belum dapat dimuat."), { status: 503 });
  return { profile: (await profileResponse.json())?.[0] || {}, orders: await ordersResponse.json() };
}

function extractCapture(order) {
  return order?.purchase_units?.flatMap((unit) => unit?.payments?.captures || [])?.[0] || null;
}

function validateCapturedAmount(stored, capture) {
  const amount = capture?.amount;
  if (!amount) return false;
  return String(amount.currency_code || "").toUpperCase() === String(stored.currency).toUpperCase()
    && Number(amount.value) === Number(stored.amount);
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function invoiceHtml(order, user) {
  const label = PLANS[order.plan]?.label || order.plan;
  const status = String(order.status || "").toUpperCase();
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(order.invoice_number || "Invoice Ngeblogging")}</title><style>body{max-width:760px;margin:40px auto;padding:0 24px;font:15px/1.6 system-ui;color:#17253c}.brand{font-size:28px;font-weight:900}.brand span{color:#2d6edf}.card{margin-top:30px;border:1px solid #dfe6ef;border-radius:18px;padding:28px}.row{display:flex;justify-content:space-between;gap:20px;padding:10px 0;border-bottom:1px solid #edf1f5}.row:last-child{border:0}.total{font-size:22px;font-weight:900}.status{display:inline-block;border-radius:999px;padding:7px 11px;background:#eaf7ef;color:#227651;font-weight:800}small{color:#758399}@media print{body{margin:0}.card{box-shadow:none}}</style></head><body><div class="brand">n<span>.</span>ngeblogging</div><p>Invoice pembayaran layanan digital Ngeblogging.</p><section class="card"><h1>${escapeHtml(order.invoice_number || "Invoice")}</h1><p class="status">${escapeHtml(status)}</p><div class="row"><span>Pelanggan</span><b>${escapeHtml(user.email || order.payer_email || order.user_id)}</b></div><div class="row"><span>Paket</span><b>${escapeHtml(label)}</b></div><div class="row"><span>Metode</span><b>${escapeHtml(order.payment_method || order.provider)}</b></div><div class="row"><span>Order ID</span><b>${escapeHtml(order.provider_order_id)}</b></div><div class="row"><span>Capture ID</span><b>${escapeHtml(order.provider_capture_id || "-")}</b></div><div class="row"><span>Tanggal</span><b>${escapeHtml(order.paid_at || order.created_at)}</b></div><div class="row total"><span>Total</span><b>${escapeHtml(order.currency)} ${escapeHtml(Number(order.amount).toFixed(2))}</b></div></section><p><small>Invoice dibuat dari catatan transaksi server. Status pembayaran final mengikuti hasil capture dan webhook penyedia pembayaran.</small></p></body></html>`;
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  const left = String(a || "").toLowerCase();
  const right = String(b || "").toLowerCase();
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index++) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function verifyPayPalWebhook(request, env, event) {
  if (!env.PAYPAL_WEBHOOK_ID) throw Object.assign(new Error("PAYPAL_WEBHOOK_ID belum dikonfigurasi."), { status: 503, code: "PAYPAL_WEBHOOK_CONFIG_REQUIRED" });
  const verification = await paypalRequest(env, "/v1/notifications/verify-webhook-signature", {
    method: "POST",
    requestId: `webhook-${event.id || crypto.randomUUID()}`,
    body: JSON.stringify({
      transmission_id: request.headers.get("paypal-transmission-id"),
      transmission_time: request.headers.get("paypal-transmission-time"),
      cert_url: request.headers.get("paypal-cert-url"),
      auth_algo: request.headers.get("paypal-auth-algo"),
      transmission_sig: request.headers.get("paypal-transmission-sig"),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    }),
  });
  return verification.verification_status === "SUCCESS";
}

async function createWebhookEvent(env, provider, eventId, eventType, payload, providerOrderId = null, captureId = null) {
  const existing = await adminJson(env, `billing_webhook_events?provider=eq.${encodeURIComponent(provider)}&provider_event_id=eq.${encodeURIComponent(eventId)}&select=id,status&limit=1`);
  if (existing?.length) return { duplicate: true, row: existing[0] };
  const rows = await adminJson(env, "billing_webhook_events", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ provider, provider_event_id: eventId, event_type: eventType, status: "received", provider_order_id: providerOrderId, provider_capture_id: captureId, payload }),
  });
  return { duplicate: false, row: rows?.[0] };
}

async function finishWebhookEvent(env, id, status, errorMessage = null) {
  if (!id) return;
  await adminJson(env, `billing_webhook_events?id=eq.${id}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ status, error_message: errorMessage, processed_at: new Date().toISOString() }),
  });
}

async function paypalWebhook(request, env, requestId) {
  const event = await request.json().catch(() => null);
  if (!event?.id || !event?.event_type) return response(400, { error: "Payload webhook PayPal tidak valid." }, requestId);
  if (!(await verifyPayPalWebhook(request, env, event))) return response(401, { error: "Tanda tangan webhook PayPal tidak valid." }, requestId);
  const resource = event.resource || {};
  const captureId = resource.resource_type === "capture" || event.event_type.startsWith("PAYMENT.CAPTURE") ? resource.id : null;
  const orderId = resource.supplementary_data?.related_ids?.order_id || resource.id || null;
  const stored = captureId ? await findOrderByCaptureId(env, captureId) : await findOrderByProviderId(env, orderId);
  const eventRow = await createWebhookEvent(env, "paypal", event.id, event.event_type, {
    create_time: event.create_time,
    resource_type: resource.resource_type,
    resource_status: resource.status,
    summary: event.summary,
  }, stored?.provider_order_id || orderId, captureId);
  if (eventRow.duplicate) return response(200, { received: true, duplicate: true }, requestId);
  try {
    if (!stored) {
      await finishWebhookEvent(env, eventRow.row?.id, "ignored");
      return response(200, { received: true, ignored: true }, requestId);
    }
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      if (!validateCapturedAmount(stored, resource)) throw Object.assign(new Error("Nominal webhook tidak cocok dengan invoice."), { status: 409, code: "AMOUNT_MISMATCH" });
      await finalizePaidOrder(env, stored, { captureId:resource.id,eventId:event.id,paidAt:resource.create_time,payerEmail:resource.payee?.email_address,providerPayload:{ webhook_type:event.event_type } });
    } else if (["PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED", "CHECKOUT.PAYMENT-APPROVAL.REVERSED"].includes(event.event_type)) {
      await patchOrder(env, stored.provider_order_id, { status:"failed",provider_event_id:event.id,failure_code:resource.status_details?.reason || event.event_type,failure_message:event.summary || "Pembayaran ditolak." });
    } else if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
      await patchOrder(env, stored.provider_order_id, { status:"refunded",provider_event_id:event.id,refunded_at:resource.create_time || new Date().toISOString() });
    } else if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      await patchOrder(env, stored.provider_order_id, { status:"approved",provider_event_id:event.id });
    }
    await finishWebhookEvent(env, eventRow.row?.id, "processed");
    return response(200, { received: true }, requestId);
  } catch (error) {
    await finishWebhookEvent(env, eventRow.row?.id, "failed", error.message);
    throw error;
  }
}

async function localWebhook(request, env, requestId) {
  const secret = env.LOCAL_PAYMENT_GATEWAY_SECRET || "";
  if (!secret) return response(503, { code:"LOCAL_GATEWAY_CONFIG_REQUIRED",error:"Gateway pembayaran lokal belum dikonfigurasi." }, requestId);
  const raw = await request.text();
  const timestamp = request.headers.get("x-ngeblogging-timestamp") || "";
  const signature = request.headers.get("x-ngeblogging-signature") || "";
  if (!/^\d{10,13}$/.test(timestamp)) return response(401, { error:"Timestamp webhook tidak valid." }, requestId);
  const milliseconds = timestamp.length === 10 ? Number(timestamp) * 1000 : Number(timestamp);
  if (Math.abs(Date.now() - milliseconds) > 5 * 60 * 1000) return response(401, { error:"Webhook kedaluwarsa." }, requestId);
  const expected = await hmacHex(secret, `${timestamp}.${raw}`);
  if (!constantTimeEqual(signature, expected)) return response(401, { error:"Tanda tangan webhook tidak valid." }, requestId);
  const event = JSON.parse(raw || "{}");
  if (!event.id || !event.referenceId || !event.status) return response(400, { error:"Payload webhook gateway lokal tidak valid." }, requestId);
  const stored = await findOrderByProviderId(env, String(event.referenceId));
  const eventRow = await createWebhookEvent(env, "local", String(event.id), String(event.type || "payment.updated"), { status:event.status,method:event.method }, stored?.provider_order_id || event.referenceId, event.captureId || null);
  if (eventRow.duplicate) return response(200, { received:true,duplicate:true }, requestId);
  try {
    if (!stored) {
      await finishWebhookEvent(env, eventRow.row?.id, "ignored");
      return response(200, { received:true,ignored:true }, requestId);
    }
    const status = String(event.status).toLowerCase();
    if (["paid", "completed", "settled"].includes(status)) {
      if (String(event.currency).toUpperCase() !== String(stored.currency).toUpperCase() || Number(event.amount) !== Number(stored.amount)) throw Object.assign(new Error("Nominal gateway lokal tidak cocok dengan invoice."), { status:409,code:"AMOUNT_MISMATCH" });
      await finalizePaidOrder(env, stored, { captureId:event.captureId,eventId:event.id,paidAt:event.paidAt,providerPayload:{ local_status:event.status } });
    } else if (["failed", "expired", "cancelled", "denied"].includes(status)) {
      await patchOrder(env, stored.provider_order_id, { status,failure_code:event.failureCode || status,failure_message:event.failureMessage || "Pembayaran tidak selesai.",provider_event_id:event.id });
    } else {
      await patchOrder(env, stored.provider_order_id, { status:"pending",provider_event_id:event.id });
    }
    await finishWebhookEvent(env, eventRow.row?.id, "processed");
    return response(200, { received:true }, requestId);
  } catch (error) {
    await finishWebhookEvent(env, eventRow.row?.id, "failed", error.message);
    throw error;
  }
}

export async function handleBillingRequest(request, env, requestId = crypto.randomUUID()) {
  try {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/billing/config") {
      const localPrices = parseLocalPrices(env);
      return response(200, {
        paypal: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
        paypalEnvironment: String(env.PAYPAL_ENV || "sandbox"),
        paypalWebhook: Boolean(env.PAYPAL_WEBHOOK_ID),
        paypalMerchantEmail: String(env.PAYPAL_MERCHANT_EMAIL || ""),
        localGateway: Boolean(env.LOCAL_PAYMENT_GATEWAY_URL && env.LOCAL_PAYMENT_GATEWAY_SECRET && Object.keys(localPrices).length),
        methods: ["paypal", "qris", "bank_transfer", "virtual_account", "ewallet", "card"],
        plans: Object.entries(PLANS).map(([id, plan]) => ({ id,label:plan.label,amount:plan.amount,currency:plan.currency,local:localPrices[id] || null,durationDays:plan.durationDays })),
      }, requestId);
    }

    if (request.method === "POST" && url.pathname === "/api/billing/paypal/webhook") return paypalWebhook(request, env, requestId);
    if (request.method === "POST" && url.pathname === "/api/billing/local/webhook") return localWebhook(request, env, requestId);

    const { user, token } = await verifyUser(request, env);

    if (request.method === "GET" && url.pathname === "/api/billing/account") {
      return response(200, await listAccount(env, user, token), requestId);
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/billing/invoice/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/billing/invoice/".length));
      const rows = await adminJson(env, `billing_orders?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);
      const order = rows?.[0];
      if (!order) return response(404, { error:"Invoice tidak ditemukan." }, requestId);
      return htmlResponse(200, invoiceHtml(order,user), `${order.invoice_number || "invoice-ngeblogging"}.html`, requestId);
    }

    const body = await request.json().catch(() => ({}));

    if (request.method === "POST" && url.pathname === "/api/billing/paypal/create") {
      const plan = PLANS[body.planId];
      const key = String(body.idempotencyKey || "");
      if (!plan) return response(400, { code:"INVALID_PLAN",error:"Paket tidak valid." }, requestId);
      if (!validIdempotency(key)) return response(400, { code:"INVALID_IDEMPOTENCY_KEY",error:"Kunci idempotensi checkout tidak valid." }, requestId);
      const existing = await findOrderByIdempotency(env,user.id,key);
      if (existing) {
        return response(200, { orderId:existing.provider_order_id,status:existing.status,approveUrl:existing.provider_payload?.approve_url || "",invoiceNumber:existing.invoice_number,reused:true }, requestId);
      }
      const invoice = invoiceNumber();
      const siteUrl = String(env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/, "");
      const order = await paypalRequest(env, "/v2/checkout/orders", {
        method: "POST",
        requestId: `create-${key}`,
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id:key,
            custom_id:user.id,
            invoice_id:invoice,
            description:plan.label,
            amount:{ currency_code:plan.currency,value:plan.amount,breakdown:{ item_total:{ currency_code:plan.currency,value:plan.amount } } },
            items:[{ name:plan.label,quantity:"1",unit_amount:{ currency_code:plan.currency,value:plan.amount },category:"DIGITAL_GOODS" }],
          }],
          payment_source:{ paypal:{ experience_context:{ brand_name:"Ngeblogging",locale:"id-ID",landing_page:"LOGIN",shipping_preference:"NO_SHIPPING",user_action:"PAY_NOW",return_url:`${siteUrl}/?billing=return`,cancel_url:`${siteUrl}/?billing=cancel` } } },
        }),
      });
      const approveUrl = order.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href || "";
      await createOrderRecord(env, {
        user_id:user.id,site_id:body.siteId || null,provider:"paypal",provider_order_id:order.id,idempotency_key:key,invoice_number:invoice,plan:body.planId,
        amount:Number(plan.amount),currency:plan.currency,status:"created",payment_method:"paypal",payer_email:null,
        provider_payload:{ intent:order.intent,status:order.status,create_time:order.create_time,approve_url:approveUrl,merchant_email:env.PAYPAL_MERCHANT_EMAIL || "" },
        metadata:{ source:"studio-billing-v2",request_id:requestId },
      });
      return response(200, { orderId:order.id,status:order.status,approveUrl,invoiceNumber:invoice }, requestId);
    }

    if (request.method === "POST" && url.pathname === "/api/billing/paypal/capture") {
      const orderId = String(body.orderId || "").trim();
      if (!orderId || !/^[A-Z0-9-]{8,40}$/i.test(orderId)) return response(400, { error:"Data capture tidak valid." }, requestId);
      const stored = await findOrderByProviderId(env,orderId);
      if (!stored || stored.user_id !== user.id) return response(404, { error:"Order pembayaran tidak ditemukan." }, requestId);
      if (stored.status === "completed") return response(200, { orderId,status:"COMPLETED",completed:true,expiresAt:stored.plan_expires_at,invoiceId:stored.id,alreadyCompleted:true }, requestId);
      let order;
      try {
        order = await paypalRequest(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method:"POST",requestId:`capture-${orderId}`,body:"{}" });
      } catch (error) {
        if (error.code !== "ORDER_ALREADY_CAPTURED") throw error;
        order = await paypalRequest(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method:"GET",requestId:`show-${orderId}` });
      }
      const capture = extractCapture(order);
      const customId = capture?.custom_id || order.purchase_units?.[0]?.custom_id;
      if (customId && customId !== user.id) return response(403, { error:"Order tidak dimiliki pengguna ini." }, requestId);
      if (!capture || !validateCapturedAmount(stored,capture)) return response(409, { code:"AMOUNT_MISMATCH",error:"Nominal atau currency capture tidak cocok dengan invoice server." }, requestId);
      const paid = capture.status === "COMPLETED" || order.status === "COMPLETED";
      if (!paid) {
        const pending = await patchOrder(env,orderId,{ status:String(capture.status || order.status || "pending").toLowerCase(),provider_capture_id:capture.id,payer_email:order?.payer?.email_address || null,provider_payload:{...(stored.provider_payload||{}),capture_status:capture.status} });
        return response(200,{ orderId,status:capture.status || order.status,completed:false,invoiceId:pending?.id || stored.id },requestId);
      }
      const completed = await finalizePaidOrder(env,stored,{ captureId:capture.id,paidAt:capture.create_time,payerEmail:order?.payer?.email_address,providerPayload:{ capture_status:capture.status,order_status:order.status } });
      return response(200,{ orderId,status:"COMPLETED",completed:true,expiresAt:completed.expiresAt,invoiceId:completed.order?.id || stored.id },requestId);
    }

    if (request.method === "POST" && url.pathname === "/api/billing/local/create") {
      const method = String(body.method || "");
      const plan = PLANS[body.planId];
      const key = String(body.idempotencyKey || "");
      const localPrices = parseLocalPrices(env);
      const price = localPrices[body.planId];
      if (!LOCAL_METHODS.has(method) || !plan || !price) return response(400,{ code:"INVALID_LOCAL_PAYMENT",error:"Metode, paket, atau harga lokal belum dikonfigurasi." },requestId);
      if (!validIdempotency(key)) return response(400,{ code:"INVALID_IDEMPOTENCY_KEY",error:"Kunci idempotensi checkout tidak valid." },requestId);
      if (!env.LOCAL_PAYMENT_GATEWAY_URL || !env.LOCAL_PAYMENT_GATEWAY_SECRET) return response(503,{ code:"LOCAL_GATEWAY_CONFIG_REQUIRED",error:"QRIS dan bank memerlukan gateway lokal yang dikonfigurasi di server." },requestId);
      const existing = await findOrderByIdempotency(env,user.id,key);
      if (existing) return response(200,{ orderId:existing.provider_order_id,status:existing.status,checkoutUrl:existing.provider_payload?.checkout_url || "",qrString:existing.provider_payload?.qr_string || "",qrImageUrl:existing.provider_payload?.qr_image_url || "",virtualAccount:existing.provider_payload?.virtual_account || "",expiresAt:existing.provider_payload?.expires_at || null,reused:true },requestId);
      const invoice = invoiceNumber();
      const referenceId = `local-${crypto.randomUUID()}`;
      const gatewayBody = JSON.stringify({ referenceId,invoiceNumber:invoice,idempotencyKey:key,method,amount:price.amount,currency:price.currency,description:plan.label,customer:{ id:user.id,email:user.email || "" },callbackUrl:`${String(env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/,"")}/api/billing/local/webhook`,returnUrl:`${String(env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/,"")}/?billing=local-return` });
      const timestamp = String(Date.now());
      const signature = await hmacHex(env.LOCAL_PAYMENT_GATEWAY_SECRET,`${timestamp}.${gatewayBody}`);
      const gatewayResponse = await fetch(`${String(env.LOCAL_PAYMENT_GATEWAY_URL).replace(/\/$/,"")}/payments`,{ method:"POST",headers:{"content-type":"application/json","x-ngeblogging-timestamp":timestamp,"x-ngeblogging-signature":signature,"idempotency-key":key},body:gatewayBody });
      const gateway = await gatewayResponse.json().catch(()=>({}));
      if(!gatewayResponse.ok) throw Object.assign(new Error(gateway.error || "Gateway pembayaran lokal belum berhasil."),{status:502,code:"LOCAL_GATEWAY_ERROR"});
      const providerOrderId = String(gateway.id || referenceId);
      await createOrderRecord(env,{ user_id:user.id,site_id:body.siteId || null,provider:"local",provider_order_id:providerOrderId,idempotency_key:key,invoice_number:invoice,plan:body.planId,amount:price.amount,currency:price.currency,status:String(gateway.status || "pending").toLowerCase(),payment_method:method,provider_payload:{ checkout_url:gateway.checkoutUrl || "",qr_string:gateway.qrString || "",qr_image_url:gateway.qrImageUrl || "",virtual_account:gateway.virtualAccount || "",expires_at:gateway.expiresAt || null },metadata:{source:"local-gateway-adapter-v1",request_id:requestId} });
      return response(200,{ orderId:providerOrderId,invoiceNumber:invoice,status:gateway.status || "pending",checkoutUrl:gateway.checkoutUrl || "",qrString:gateway.qrString || "",qrImageUrl:gateway.qrImageUrl || "",virtualAccount:gateway.virtualAccount || "",expiresAt:gateway.expiresAt || null },requestId);
    }

    return response(404,{error:"Endpoint pembayaran tidak ditemukan."},requestId);
  } catch (error) {
    console.error("Billing handler failed", { requestId,name:error?.name,code:error?.code,status:error?.status });
    return response(error.status || 500,{ code:error.code || "BILLING_ERROR",error:error.message || "Pembayaran mengalami gangguan sementara." },requestId);
  }
}

export { PLANS };
