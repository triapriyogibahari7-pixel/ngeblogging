import { getBillingProduct } from './billing-catalog.mjs';
import { handleMidtrans as baseHandler, paths } from './midtrans-api.mjs';
export { paths };
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
        if (typeof data?.token === 'string' && /^[a-zA-Z0-9_-]{10,200}$/.test(data.token)) snapToken = data.token;
      }
    }
    return result;
  }});
  if (!response.ok || !(isCreate || (path === '/api/billing/midtrans/config' && request.method === 'GET'))) return response;
  const data = await response.json();
  if (path.endsWith('/config')) {
    data.clientKey = typeof env.MIDTRANS_CLIENT_KEY === 'string' ? env.MIDTRANS_CLIENT_KEY.trim() : '';
    data.embeddedReady = Boolean(data.ready && data.clientKey);
  } else if (snapToken) data.snapToken = snapToken;
  return new Response(JSON.stringify(data), { status: response.status, headers: response.headers });
}
