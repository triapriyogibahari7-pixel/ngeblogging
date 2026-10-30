// Isolated candidate only. Not imported by any Worker or active handler.
function hostname(value) {
  const host = String(value || '').trim().toLowerCase().replace(/\.$/, '');
  const labels = host.split('.');
  if (host.length > 253 || labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new TypeError('INVALID_HOSTNAME');
  return host;
}
function rule(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.target_url !== 'string') return null;
  if ([value.permanent, value.preserve_path].some(v => v != null && typeof v !== 'boolean')) return null;
  try {
    const target = new URL(value.target_url);
    if (target.protocol !== 'https:' || target.username || target.password || target.port) return null;
    return {target_url: target.href, permanent: value.permanent !== false, preserve_path: value.preserve_path !== false};
  } catch { return null; }
}
export function createRedirectLookup({namespace, fetchRule, cache}) {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(namespace || '') || typeof fetchRule !== 'function' || typeof cache?.get !== 'function' || typeof cache?.set !== 'function') throw new TypeError('INVALID_LOOKUP_DEPENDENCIES');
  return async function lookup(input, {fresh = false} = {}) {
    if (typeof fresh !== 'boolean') throw new TypeError('INVALID_FRESH_OPTION');
    const host = hostname(input);
    const key = `https://domain-transfer-redirect-cache.invalid/${namespace}/${encodeURIComponent(host)}`;
    if (!fresh) {
      try {
        const cached = await cache.get(key);
        if (cached?.kind === 'missing') return {kind: 'missing'};
        const valid = cached?.kind === 'found' ? rule(cached.rule) : null;
        if (valid) return {kind: 'found', rule: valid};
      } catch { /* Cache failure must not masquerade as backend absence. */ }
    }
    let response;
    try { response = await fetchRule(host, {cache: 'no-store'}); }
    catch { return {kind: 'unavailable', reason: 'transport'}; }
    if (!response?.ok) return {kind: 'unavailable', reason: 'http'};
    let rows;
    try { rows = await response.json(); }
    catch { return {kind: 'unavailable', reason: 'payload'}; }
    if (!Array.isArray(rows) || rows.length > 1) return {kind: 'unavailable', reason: 'payload'};
    const valid = rows.length ? rule(rows[0]) : null;
    if (rows.length && !valid) return {kind: 'unavailable', reason: 'payload'};
    const result = valid ? {kind: 'found', rule: valid} : {kind: 'missing'};
    if (!fresh) {
      const stored = valid ? {kind: 'found', rule: {...valid}} : {kind: 'missing'};
      try { await cache.set(key, stored, valid ? 30 : 15); }
      catch { /* A failed cache write does not invalidate a successful read. */ }
    }
    return result;
  };
}
