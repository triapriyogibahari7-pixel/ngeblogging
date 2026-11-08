export const CONNECTOR_CATALOG = Object.freeze([
  Object.freeze({ id: 'supabase', label: 'Supabase' }),
  Object.freeze({ id: 'github', label: 'GitHub' }),
  Object.freeze({ id: 'cloudflare-one-waf', label: 'Cloudflare One & WAF' }),
  Object.freeze({ id: 'cloudflare', label: 'Cloudflare' }),
  Object.freeze({ id: 'cloudflare-browser-rendering', label: 'Cloudflare Browser Rendering' })
]);
const fail = () => { throw new Error('INVALID_CONNECTION'); };
export function normalizeConnection(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail();
  const fields = ['provider', 'label', 'accountId', 'zoneId', 'projectRef', 'repository'];
  if (Object.keys(input).some(key => !fields.includes(key))) fail();
  if (!CONNECTOR_CATALOG.some(item => item.id === input.provider)) fail();
  if (typeof input.label !== 'string' || !input.label.trim() || input.label.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(input.label)) fail();
  const result = { provider: input.provider, label: input.label.trim() };
  const allowed = input.provider === 'supabase' ? ['projectRef'] : input.provider === 'github' ? ['repository'] : input.provider === 'cloudflare-one-waf' ? ['accountId', 'zoneId'] : ['accountId'];
  for (const key of fields.slice(2)) if (input[key] !== undefined && !allowed.includes(key)) fail();
  if (input.provider === 'supabase') {
    if (!/^[a-z]{20}$/.test(input.projectRef || '')) fail();
    result.projectRef = input.projectRef;
  } else if (input.provider === 'github') {
    if (typeof input.repository !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(input.repository)) fail();
    if (['.', '..'].includes(input.repository.split('/')[1])) fail();
    result.repository = input.repository;
  } else {
    if (!/^[a-f0-9]{32}$/.test(input.accountId || '')) fail();
    result.accountId = input.accountId;
    if (input.zoneId !== undefined) {
      if (!/^[a-f0-9]{32}$/.test(input.zoneId)) fail();
      result.zoneId = input.zoneId;
    }
    if (input.provider === 'cloudflare-one-waf' && !result.zoneId) fail();
  }
  return result;
}
export function publicConnection(record) {
  const config = normalizeConnection(record.config);
  if (!['disconnected', 'checking', 'connected', 'error'].includes(record.status)) fail();
  return { id: record.id, ...config, status: record.status, enabled: record.enabled === true, checkedAt: record.checkedAt || null, mode: 'read-only' };
}
