import { isNaraOwner } from '../shared/nara-owner-access.mjs';
const OWNER_ID = '91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3';
const PREFIX = '/api/nara/owner-connectors';
const HOSTS = new Set(['ngeblogging.com', 'www.ngeblogging.com', 'ngeblogging.triapriyogibahari7.workers.dev', 'agent-nara-owner-connectors-runtime-20261108-ngeblogging.triapriyogibahari7.workers.dev']);
const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'vary': 'Authorization, Origin', 'x-content-type-options': 'nosniff' } });
async function readJson(fetcher, url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher(url, { headers, redirect: 'error', signal: controller.signal });
    if (!response.ok) throw new Error('UPSTREAM_UNAVAILABLE');
    return await response.json();
  } finally { clearTimeout(timer); }
}
export async function naraOwnerConnectorsResponse(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (url.pathname !== PREFIX && !url.pathname.startsWith(PREFIX + '/')) return null;
  if (url.protocol !== 'https:' || !HOSTS.has(url.hostname)) return reply(404, { code: 'NOT_FOUND' });
  if (request.method !== 'GET') return reply(405, { code: 'READ_ONLY' });
  if (url.search) return reply(400, { code: 'QUERY_NOT_ALLOWED' });
  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, { code: 'ORIGIN_NOT_ALLOWED' });
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer [^\s]{1,8192}$/.test(authorization)) return reply(401, { code: 'AUTH_REQUIRED' });
  let user;
  try {
    if (String(env.SUPABASE_URL || '').replace(/\/$/, '') !== 'https://polvmlrhqoiflumibfqs.supabase.co' || !env.SUPABASE_PUBLISHABLE_KEY) throw new Error('AUTH_CONFIG');
    user = await readJson(fetcher, 'https://polvmlrhqoiflumibfqs.supabase.co/auth/v1/user', { authorization, apikey: env.SUPABASE_PUBLISHABLE_KEY });
  } catch { return reply(401, { code: 'SESSION_NOT_VERIFIED' }); }
  if (user.id !== OWNER_ID || !isNaraOwner(user)) return reply(403, { code: 'OWNER_REQUIRED' });
  const provider = url.pathname.slice(PREFIX.length + 1);
  if (!provider) return reply(200, { connectors: ['github', 'cloudflare'].map(id => ({ id, status: 'not_checked' })), readOnly: true });
  if (!['github', 'cloudflare'].includes(provider)) return reply(404, { code: 'UNKNOWN_CONNECTOR' });
  const token = provider === 'github' ? env.NARA_GITHUB_TOKEN : env.NARA_CLOUDFLARE_API_TOKEN;
  if (!token) return reply(200, { provider, status: 'setup_required', readOnly: true });
  try {
    if (provider === 'github') {
      const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'Ngeblogging-Nara', 'X-GitHub-Api-Version': '2022-11-28' };
      const identity = await readJson(fetcher, 'https://api.github.com/user', headers);
      if (identity.login !== 'triapriyogibahari7-pixel') return reply(502, { provider, status: 'account_mismatch' });
      const repositories = await readJson(fetcher, 'https://api.github.com/user/repos?per_page=30&sort=updated', headers);
      if (!Array.isArray(repositories)) throw new Error('INVALID_RESULT');
      return reply(200, { provider, status: 'connected', readOnly: true, repositories: repositories.map(item => ({ name: item.full_name, private: Boolean(item.private) })) });
    }
    const accountId = '095e57b46e7ba7f6b188480d9e4e5fe7';
    const data = await readJson(fetcher, `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, { authorization: `Bearer ${token}` });
    if (data.success !== true || !Array.isArray(data.result)) throw new Error('INVALID_RESULT');
    return reply(200, { provider, status: 'connected', readOnly: true, workers: data.result.map(item => ({ name: item.id })) });
  } catch { return reply(502, { provider, status: 'connection_failed', readOnly: true }); }
}
