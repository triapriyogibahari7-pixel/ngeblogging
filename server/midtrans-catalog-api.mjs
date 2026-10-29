import { getBillingProduct } from './billing-catalog.mjs';
import { handleMidtrans as baseHandler, paths } from './midtrans-api.mjs';
export { paths };
const validToken = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{10,200}$/.test(value);
export function recoverStoredCheckoutToken(value, environment) {
  if (!['production', 'sandbox'].includes(environment) || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const origin = environment === 'production' ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
    if (url.origin !== origin || url.username || url.password || url.hash) return null;
    const match = /^\/snap\/(?:v2\/vtweb|v4\/redirection)\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.exec(url.pathname);
    return match ? match[1] : null;
  } catch { return null; }
}
export function catalogEnvironment(env) {
  const prices = Object.fromEntries(['pro_monthly','pro_yearly','max_monthly','max_yearly'].map(id => {
    const product = getBillingProduct(id);
    if (product.currency !== 'IDR' || !Number.isSafeInteger(product.amount) || product.amount <= 0) throw new Error('INVALID_CATALOG_PRICE');
    return [id, product.amount];
  }));
  return { ...env, MIDTRANS_PLAN_PRICES_JSON: JSON.stringify(prices) };
}
export async function handleMidtrans(request, env, options = {}) {
  const path = new URL(request.url).pathname;
  const isCreate = path === '/api/billing/midtrans/create' && request.method === 'POST';
  let snapToken;
  const upstream = options.fetchImpl || fetch;
  const response = await baseHandler(request, catalogEnvironment(env), { ...options, fetchImpl: async (url, init) => {
    const result = await upstream(url, init);
    if (isCreate && init?.method === 'POST') {
      const target = new URL(String(url));
      const origin = env.MIDTRANS_ENV === 'production' ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
      if (target.origin === origin && target.pathname === '/snap/v1/transactions' && result.ok) {
        const data = await result.clone().json().catch(() => null);
        if (validToken(data?.token)) snapToken = data.token;
      }
    }
    return result;
  }});
  if (!response.ok || !(isCreate || (path === '/api/billing/midtrans/config' && request.method === 'GET'))) return response;
  const data = await response.json();
  if (path.endsWith('/config')) {
    data.clientKey = typeof env.MIDTRANS_CLIENT_KEY === 'string' ? env.MIDTRANS_CLIENT_KEY.trim() : '';
    data.embeddedReady = Boolean(data.ready && data.clientKey);
  } else {
    const recovered = /^NARA-[a-f0-9]{40}$/.test(data.orderId || '') ? recoverStoredCheckoutToken(data.checkoutUrl, env.MIDTRANS_ENV) : null;
    data.snapToken = validToken(data.snapToken) ? data.snapToken : snapToken || recovered || null;
  }
  return new Response(JSON.stringify(data), { status: response.status, headers: response.headers });
}
