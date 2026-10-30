// Fixture integration only; no credentials or active Worker wiring.
import {createRedirectLookup} from './domain-transfer-redirect-lookup.mjs';
function unavailable(request) {
  return new Response(request.method === 'HEAD' ? null : JSON.stringify({code: 'REDIRECT_LOOKUP_UNAVAILABLE'}), {
    status: 503, headers: {'content-type': 'application/json', 'cache-control': 'no-store'},
  });
}
export function createTestRedirectPipeline({origin, fetchImpl, cache, namespace, timeoutMs = 2000}) {
  const base = new URL(origin);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  const allowed = (local && ['http:', 'https:'].includes(base.protocol)) || (base.hostname.endsWith('.test') && base.protocol === 'https:');
  if (!allowed || base.username || base.password || base.pathname !== '/' || base.search || base.hash || typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) throw new TypeError('TEST_REDIRECT_CONFIG_REQUIRED');
  const fetchRule = async host => {
    const url = new URL('/rest/v1/site_domain_redirects', base);
    for (const [key, value] of Object.entries({source_hostname: `eq.${host}`, enabled: 'eq.true', select: 'target_url,permanent,preserve_path', limit: '2'})) url.searchParams.set(key, value);
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, reject) => {timer = setTimeout(() => {controller.abort(); reject(new Error('REDIRECT_READ_TIMEOUT'));}, timeoutMs);});
    const read = (async () => {
      const response = await fetchImpl(url.href, {method: 'GET', cache: 'no-store', redirect: 'error', signal: controller.signal, headers: {accept: 'application/json', 'cache-control': 'no-cache'}});
      if (!response.ok) {
        try { response.body?.cancel()?.catch(() => {}); } catch { /* Best effort. */ }
        return {ok: false};
      }
      const text = await response.text();
      return {ok: true, json: async () => JSON.parse(text)};
    })();
    try { return await Promise.race([read, deadline]); }
    finally { clearTimeout(timer); }
  };
  const lookup = createRedirectLookup({namespace, fetchRule, cache});
  const resolve = async (request, {fresh = true} = {}) => {
    if (!['GET', 'HEAD'].includes(request.method)) return null;
    const url = new URL(request.url);
    if (url.hostname === 'ngeblogging.com' || url.hostname.endsWith('.ngeblogging.com')) return null;
    try {
      const result = await lookup(url.hostname, {fresh});
      if (result.kind === 'missing') return null;
      if (result.kind !== 'found') return unavailable(request);
      const target = new URL(result.rule.target_url);
      if (target.hostname === url.hostname) return unavailable(request);
      if (result.rule.preserve_path !== false) {
        if (target.pathname === '/') target.pathname = url.pathname;
        else if (url.pathname !== '/') target.pathname = `${target.pathname.replace(/\/$/, '')}/${url.pathname.replace(/^\//, '')}`;
        if (!target.search && url.search) target.search = url.search;
      }
      return new Response(null, {status: result.rule.permanent === false ? 307 : 308, headers: {location: target.href, 'cache-control': 'no-store'}});
    } catch { return unavailable(request); }
  };
  return {lookup, resolve};
}
