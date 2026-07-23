const PLANS = {
  pro_monthly: { label: "Ngeblogging Pro Bulanan", amount: "5.00", currency: "USD", durationDays: 31 },
  pro_yearly: { label: "Ngeblogging Pro Tahunan", amount: "50.00", currency: "USD", durationDays: 366 },
  supporter: { label: "Ngeblogging Supporter", amount: "2.00", currency: "USD", durationDays: 31 },
};

function response(status, body, requestId = "") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
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

async function verifyUser(request, env) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error("Silakan masuk untuk melanjutkan pembayaran."), { status: 401 });
  const { url, publishableKey } = supabaseConfig(env);
  if (!url || !publishableKey) throw Object.assign(new Error("Konfigurasi autentikasi pembayaran belum lengkap."), { status: 503 });
  const result = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publishableKey, authorization: `Bearer ${token}` } });
  if (!result.ok) throw Object.assign(new Error("Sesi pengguna tidak valid."), { status: 401 });
  return { user: await result.json(), token };
}

function paypalBase(env) {
  return String(env.PAYPAL_ENV || "sandbox").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken(env) {
  const clientId = env.PAYPAL_CLIENT_ID || "";
  const secret = env.PAYPAL_CLIENT_SECRET || "";
  if (!clientId || !secret) throw Object.assign(new Error("PayPal belum dikonfigurasi pada Cloudflare secrets."), { status: 503, code: "PAYPAL_CONFIG_REQUIRED" });
  const result = await fetch(`${paypalBase(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!result.ok) throw Object.assign(new Error("Autentikasi PayPal gagal."), { status: 502 });
  return (await result.json()).access_token;
}

async function paypalRequest(env, path, options = {}) {
  const token = await paypalAccessToken(env);
  const result = await fetch(`${paypalBase(env)}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "paypal-request-id": options.requestId || crypto.randomUUID(),
      ...(options.headers || {}),
    },
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) {
    console.error("PayPal request failed", { path, status: result.status, name: payload?.name, debugId: payload?.debug_id });
    throw Object.assign(new Error("Permintaan PayPal belum berhasil."), { status: 502, providerStatus: result.status });
  }
  return payload;
}

async function writeBillingOrder(env, order, userId, planId, status) {
  const { url, serviceKey } = supabaseConfig(env);
  if (!url || !serviceKey) throw Object.assign(new Error("Penyimpanan transaksi server belum dikonfigurasi."), { status: 503 });
  const plan = PLANS[planId];
  const payload = {
    user_id: userId,
    provider: "paypal",
    provider_order_id: order.id,
    plan: planId,
    amount: Number(plan.amount),
    currency: plan.currency,
    status,
    payer_email: order?.payer?.email_address || null,
    provider_payload: {
      intent: order.intent,
      status: order.status,
      create_time: order.create_time,
      update_time: order.update_time,
      merchant_email: env.PAYPAL_MERCHANT_EMAIL || "",
    },
    updated_at: new Date().toISOString(),
  };
  const result = await fetch(`${url}/rest/v1/billing_orders?on_conflict=provider_order_id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!result.ok) throw Object.assign(new Error("Catatan transaksi belum dapat disimpan."), { status: 503 });
}

async function activatePlan(env, userId, planId) {
  const { url, serviceKey } = supabaseConfig(env);
  const plan = PLANS[planId];
  const expires = new Date(Date.now() + plan.durationDays * 86400000).toISOString();
  const result = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({ plan: "pro", plan_expires_at: expires, updated_at: new Date().toISOString() }),
  });
  if (!result.ok) throw Object.assign(new Error("Paket berhasil dibayar tetapi aktivasi otomatis belum selesai."), { status: 503, code: "ACTIVATION_PENDING" });
  return expires;
}

export async function handleBillingRequest(request, env, requestId = crypto.randomUUID()) {
  try {
    if (request.method === "GET" && new URL(request.url).pathname === "/api/billing/config") {
      return response(200, {
        paypal: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
        paypalEnvironment: String(env.PAYPAL_ENV || "sandbox"),
        paypalMerchantEmail: String(env.PAYPAL_MERCHANT_EMAIL || ""),
        localGateway: Boolean(env.LOCAL_PAYMENT_GATEWAY_URL && env.LOCAL_PAYMENT_GATEWAY_SECRET),
        methods: ["paypal", "qris", "bank_transfer"],
        plans: Object.entries(PLANS).map(([id, plan]) => ({ id, label: plan.label, amount: plan.amount, currency: plan.currency })),
      }, requestId);
    }

    const { user } = await verifyUser(request, env);
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    if (request.method === "POST" && url.pathname === "/api/billing/paypal/create") {
      const plan = PLANS[body.planId];
      if (!plan) return response(400, { code: "INVALID_PLAN", error: "Paket tidak valid." }, requestId);
      const siteUrl = String(env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/, "");
      const order = await paypalRequest(env, "/v2/checkout/orders", {
        method: "POST",
        requestId: `create-${user.id}-${body.planId}-${Date.now()}`,
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            custom_id: user.id,
            description: plan.label,
            amount: { currency_code: plan.currency, value: plan.amount },
          }],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: "Ngeblogging",
                user_action: "PAY_NOW",
                return_url: `${siteUrl}/?billing=return&plan=${encodeURIComponent(body.planId)}`,
                cancel_url: `${siteUrl}/?billing=cancel`,
              },
            },
          },
        }),
      });
      await writeBillingOrder(env, order, user.id, body.planId, "created");
      const approveUrl = order.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href || "";
      return response(200, { orderId: order.id, status: order.status, approveUrl }, requestId);
    }

    if (request.method === "POST" && url.pathname === "/api/billing/paypal/capture") {
      const orderId = String(body.orderId || "").trim();
      const plan = PLANS[body.planId];
      if (!orderId || !/^[A-Z0-9-]{8,40}$/i.test(orderId) || !plan) return response(400, { error: "Data capture tidak valid." }, requestId);
      const order = await paypalRequest(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", body: "{}" });
      const customId = order.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id || order.purchase_units?.[0]?.custom_id;
      if (customId && customId !== user.id) return response(403, { error: "Order tidak dimiliki pengguna ini." }, requestId);
      const completed = order.status === "COMPLETED";
      await writeBillingOrder(env, order, user.id, body.planId, completed ? "completed" : String(order.status || "pending").toLowerCase());
      const expiresAt = completed ? await activatePlan(env, user.id, body.planId) : null;
      return response(200, { orderId: order.id, status: order.status, completed, expiresAt }, requestId);
    }

    if (request.method === "POST" && url.pathname === "/api/billing/local/create") {
      if (!env.LOCAL_PAYMENT_GATEWAY_URL || !env.LOCAL_PAYMENT_GATEWAY_SECRET) return response(503, { code: "LOCAL_GATEWAY_CONFIG_REQUIRED", error: "QRIS dan bank transfer memerlukan gateway pembayaran Indonesia yang dikonfigurasi di server." }, requestId);
      return response(501, { code: "LOCAL_GATEWAY_ADAPTER_REQUIRED", error: "Adapter gateway lokal harus disesuaikan dengan kontrak API penyedia yang dipilih." }, requestId);
    }

    return response(404, { error: "Endpoint pembayaran tidak ditemukan." }, requestId);
  } catch (error) {
    console.error("Billing handler failed", { requestId, name: error?.name, code: error?.code });
    return response(error.status || 500, { code: error.code || "BILLING_ERROR", error: error.message || "Pembayaran mengalami gangguan sementara." }, requestId);
  }
}

export { PLANS };
