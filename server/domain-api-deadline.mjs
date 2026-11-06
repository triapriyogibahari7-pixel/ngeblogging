export const DOMAIN_BACKEND_TIMEOUT_MS = 22_000;
const PATHS = new Set(['/api/domains/register', '/api/domains/refresh']);
export function isDomainDeadlineRequest(request) {
  return request.method === 'POST' && PATHS.has(new URL(request.url).pathname);
}
function errorResponse(request, env, requestId, timedOut) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-request-id': requestId,
    'x-ngeblogging-domain-deadline': 'backend-v1',
  });
  const origin = request.headers.get('origin') || '';
  const allowed = new Set(['https://ngeblogging.com', 'https://www.ngeblogging.com', String(env?.PUBLIC_SITE_URL || '').replace(/\/$/, ''), ...String(env?.PUBLIC_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)]);
  if (origin && allowed.has(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-expose-headers', 'x-request-id, x-ngeblogging-domain-deadline');
    headers.set('vary', 'Origin');
  }
  return new Response(JSON.stringify({
    code: timedOut ? 'DOMAIN_API_BACKEND_TIMEOUT' : 'DOMAIN_API_BACKEND_ERROR',
    error: timedOut
      ? 'Proses domain di server melewati batas waktu. Hasil penyambungan belum dapat dipastikan; gunakan Muat ulang untuk membaca status sebelum mencoba kembali. Permintaan tidak dikirim ulang otomatis.'
      : 'Proses domain di server terputus. Hasil perubahan belum dapat dipastikan; baca ulang status domain sebelum mencoba kembali.',
    requestId, mutationOutcome: 'unknown', retryAutomatically: false, statusReadRequired: true,
  }), { status: timedOut ? 504 : 503, headers });
}
export async function withDomainDeadline(request, env, context, operation, { timeoutMs = DOMAIN_BACKEND_TIMEOUT_MS } = {}) {
  const requestId = crypto.randomUUID();
  let timer;
  const task = Promise.resolve().then(operation).catch(() => errorResponse(request, env, requestId, false));
  // A timeout is not a rollback: let the one original operation settle, never replay it.
  if (typeof context?.waitUntil === 'function') context.waitUntil(task.then(() => undefined));
  try {
    return await Promise.race([task, new Promise(resolve => {
      timer = setTimeout(() => resolve(errorResponse(request, env, requestId, true)), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}
