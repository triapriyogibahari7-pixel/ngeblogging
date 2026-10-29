const origins = { production: 'https://api.midtrans.com', sandbox: 'https://api.sandbox.midtrans.com' };
export class QrisError extends Error {
  constructor(code, uncertain = false) { super(code); this.name = 'QrisError'; this.code = code; this.uncertain = uncertain; }
}
function originFor(environment) {
  if (!Object.hasOwn(origins, environment)) throw new QrisError('INVALID_ENVIRONMENT');
  return origins[environment];
}
function orderAmount(value) {
  const text = String(value);
  if (!/^\d{1,9}(?:\.00)?$/.test(text)) throw new QrisError('INVALID_AMOUNT');
  const result = Number(text);
  if (!Number.isSafeInteger(result) || result <= 0 || result > 100000000) throw new QrisError('INVALID_AMOUNT');
  return result;
}
export function validateQrisOrder(order) {
  if (!order || !/^NARA-[a-f0-9]{40}$/.test(order.order_id || '')) throw new QrisError('INVALID_ORDER');
  originFor(order.environment);
  if (!['pro_monthly','pro_yearly','max_monthly','max_yearly'].includes(order.plan_id)) throw new QrisError('INVALID_PLAN');
  return orderAmount(order.amount);
}
export function qrisImageUrl(value, environment) {
  const origin = originFor(environment);
  try {
    const url = new URL(value);
    if (url.origin !== origin || url.username || url.password || url.hash || url.search) return null;
    if (!/^\/v2\/qris\/[a-f0-9-]{36}\/qr-code$/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}
export function validateQrisTransaction(data, order) {
  const expected = validateQrisOrder(order);
  if (!data || data.order_id !== order.order_id || data.currency !== 'IDR' || data.payment_type !== 'qris' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data.transaction_id || '')) throw new QrisError('TRANSACTION_MISMATCH');
  if (orderAmount(data.gross_amount) !== expected) throw new QrisError('TRANSACTION_MISMATCH');
  if (order.transaction_id && data.transaction_id !== order.transaction_id) throw new QrisError('TRANSACTION_MISMATCH');
  return data;
}
export function qrisState(data) {
  if (['refund','partial_refund','chargeback','partial_chargeback'].includes(data?.transaction_status)) return 'review_required';
  if (String(data?.status_code) === '200' && data.transaction_status === 'settlement' && (!data.fraud_status || data.fraud_status === 'accept')) return 'paid';
  return ['deny','cancel','expire','failure'].includes(data?.transaction_status) ? 'failed' : 'pending';
}
export function makeQrisClient({environment, serverKey, fetchImpl = fetch, timeoutMs = 12000}) {
  const origin = originFor(environment);
  if (typeof serverKey !== 'string' || !serverKey || serverKey.startsWith('SB-') !== (environment === 'sandbox') || !/^[\x21-\x7e]+$/.test(serverKey)) throw new QrisError('INVALID_SERVER_KEY');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new QrisError('INVALID_TIMEOUT');
  async function request(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(origin + path, {method: body ? 'POST' : 'GET', redirect: 'error', signal: controller.signal, headers:{authorization:'Basic '+btoa(serverKey+':'), accept:'application/json', ...(body ? {'content-type':'application/json'} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new QrisError(response.status === 401 || response.status === 403 ? 'QRIS_ACCESS_DENIED' : 'QRIS_PROVIDER_ERROR', Boolean(body));
      if (!data || !['200','201'].includes(String(data.status_code))) throw new QrisError('QRIS_PROVIDER_REJECTED', Boolean(body));
      return data;
    } catch (error) {
      if (error instanceof QrisError) throw error;
      throw new QrisError(body ? 'QRIS_CREATION_UNKNOWN_RECONCILE' : 'QRIS_STATUS_UNAVAILABLE', Boolean(body));
    } finally { clearTimeout(timer); }
  }
  return {
    async chargeReservedOrder(order) {
      const amount = validateQrisOrder(order);
      if (order.environment !== environment || order.status !== 'pending' || order.checkout_url || order.snap_token || order.transaction_id) throw new QrisError('ORDER_NOT_ELIGIBLE');
      const data = validateQrisTransaction(await request('/v2/charge', {payment_type:'qris', transaction_details:{order_id:order.order_id,gross_amount:amount}, qris:{acquirer:'gopay'}}), order);
      const action = Array.isArray(data.actions) && data.actions.find(item => item.name === 'generate-qr-code' && item.method === 'GET');
      const qrUrl = qrisImageUrl(action?.url, environment);
      if (!qrUrl || data.transaction_status !== 'pending') throw new QrisError('QRIS_RESPONSE_REQUIRES_RECONCILIATION', true);
      return {transactionId:data.transaction_id, qrUrl, providerStatus:data.transaction_status, expiryTime:typeof data.expiry_time === 'string' ? data.expiry_time : null};
    },
    async status(order) {
      validateQrisOrder(order);
      if (order.environment !== environment) throw new QrisError('ORDER_NOT_ELIGIBLE');
      const data = validateQrisTransaction(await request('/v2/'+encodeURIComponent(order.order_id)+'/status'), order);
      return {transactionId:data.transaction_id, state:qrisState(data), providerStatus:data.transaction_status};
    }
  };
}
