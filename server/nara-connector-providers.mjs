// Internal adapter only. Caller must enforce verified admin, ownership and enabled state.
const CF = 'https://api.cloudflare.com/client/v4';
const id32 = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const text = value => typeof value === 'string' ? value.slice(0, 200) : '';
function invalid() { throw new Error('INVALID_CONNECTOR_TARGET'); }
export async function readConnectorMetadata(config, token, fetcher = fetch) {
 if (!config || typeof token !== 'string' || !token || token.length > 8192 || /[\s\u0000-\u001f\u007f]/.test(token)) invalid();
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 15000);
 async function get(url, cloudflare = false) {
  let response;
  try { response = await fetcher(url, { method: 'GET', headers: { authorization: `Bearer ${token}`, accept: 'application/json', 'user-agent': 'Ngeblogging-Nara', ...(url.startsWith('https://api.github.com/') ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}) }, redirect: 'manual', signal: controller.signal }); }
  catch { throw new Error('CONNECTOR_UPSTREAM_UNAVAILABLE'); }
  if (response.status >= 300 && response.status < 400) { await response.body?.cancel().catch(() => {}); throw new Error('CONNECTOR_REDIRECT_REJECTED'); }
  if (!response.ok) { await response.body?.cancel().catch(() => {}); throw new Error(response.status === 401 || response.status === 403 ? 'CONNECTOR_ACCESS_DENIED' : response.status === 429 ? 'CONNECTOR_RATE_LIMITED' : 'CONNECTOR_UPSTREAM_UNAVAILABLE'); }
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json') || !response.body) { await response.body?.cancel().catch(() => {}); throw new Error('CONNECTOR_INVALID_RESPONSE'); }
  const reader = response.body.getReader(), chunks = []; let length = 0;
  try {
   while (true) {
    const next = await reader.read(); if (next.done) break;
    length += next.value.byteLength;
    if (length > 524288) { await reader.cancel(); throw new Error('CONNECTOR_RESPONSE_TOO_LARGE'); }
    chunks.push(next.value);
   }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let data; try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('CONNECTOR_INVALID_RESPONSE'); }
  if (cloudflare) { if (data?.success !== true) throw new Error('CONNECTOR_INVALID_RESPONSE'); return data.result; }
  return data;
 }
 try {
  if (config.provider === 'github') {
   if (typeof config.repository !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(config.repository) || ['.', '..'].includes(config.repository.split('/')[1])) invalid();
   const data = await get(`https://api.github.com/repos/${config.repository}`);
   if (typeof data?.full_name !== 'string' || data.full_name.toLowerCase() !== config.repository.toLowerCase()) throw new Error('CONNECTOR_TARGET_MISMATCH');
   return { provider: config.provider, verifiedCapability: 'repository-metadata:read', resources: [{ name: text(data.full_name), private: data.private === true }], firstPageOnly: false };
  }
  if (config.provider === 'supabase') {
   if (typeof config.projectRef !== 'string' || !/^[a-z]{20}$/.test(config.projectRef)) invalid();
   const data = await get(`https://api.supabase.com/v1/projects/${config.projectRef}`);
   if ((data?.ref || data?.id) !== config.projectRef) throw new Error('CONNECTOR_TARGET_MISMATCH');
   return { provider: config.provider, verifiedCapability: 'project-metadata:read', resources: [{ name: text(data.name), projectRef: config.projectRef, status: text(data.status) }], firstPageOnly: false };
  }
  if (!['cloudflare', 'cloudflare-one-waf', 'cloudflare-browser-rendering'].includes(config.provider) || !id32(config.accountId)) invalid();
  if (config.provider === 'cloudflare-one-waf') {
   if (!id32(config.zoneId)) invalid();
   const zone = await get(`${CF}/zones/${config.zoneId}`, true);
   if (zone?.id !== config.zoneId || zone?.account?.id !== config.accountId) throw new Error('CONNECTOR_TARGET_MISMATCH');
   const apps = await get(`${CF}/accounts/${config.accountId}/access/apps?per_page=20`, true);
   const rules = await get(`${CF}/zones/${config.zoneId}/rulesets`, true);
   if (!Array.isArray(apps) || !Array.isArray(rules)) throw new Error('CONNECTOR_INVALID_RESPONSE');
   return { provider: config.provider, verifiedCapability: 'access-apps-and-zone-rulesets:read', resources: [...apps.slice(0,20).map(item => ({ kind: 'access-app', name: text(item.name) })), ...rules.slice(0,50).map(item => ({ kind: 'ruleset', name: text(item.name), phase: text(item.phase) }))], firstPageOnly: true };
  }
  if (config.provider === 'cloudflare-browser-rendering') {
   const sessions = await get(`${CF}/accounts/${config.accountId}/browser-rendering/devtools/session`, true);
   if (!Array.isArray(sessions)) throw new Error('CONNECTOR_INVALID_RESPONSE');
   return { provider: config.provider, verifiedCapability: 'browser-session-metadata:read', resources: [], sessionCountInResponse: sessions.length, renderingVerified: false, firstPageOnly: true };
  }
  const workers = await get(`${CF}/accounts/${config.accountId}/workers/scripts`, true);
  if (!Array.isArray(workers)) throw new Error('CONNECTOR_INVALID_RESPONSE');
  return { provider: config.provider, verifiedCapability: 'worker-list:read', resources: workers.slice(0,100).map(item => ({ name: text(item.id) })), firstPageOnly: true };
 } catch (error) {
  const allowed = new Set(['INVALID_CONNECTOR_TARGET','CONNECTOR_UPSTREAM_UNAVAILABLE','CONNECTOR_REDIRECT_REJECTED','CONNECTOR_ACCESS_DENIED','CONNECTOR_RATE_LIMITED','CONNECTOR_INVALID_RESPONSE','CONNECTOR_RESPONSE_TOO_LARGE','CONNECTOR_TARGET_MISMATCH']);
  throw new Error(allowed.has(error?.message) ? error.message : 'CONNECTOR_UPSTREAM_UNAVAILABLE');
 } finally { clearTimeout(timer); }
}
