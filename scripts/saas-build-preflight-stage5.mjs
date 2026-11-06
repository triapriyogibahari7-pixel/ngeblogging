const accountId = '095e57b46e7ba7f6b188480d9e4e5fe7';
const zoneId = '7658e226c2f165a24f3bbb1cf31db238';
const token = String(process.env.CLOUDFLARE_DOMAIN_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '').trim();
async function get(path) {
 const response = await fetch('https://api.cloudflare.com/client/v4' + path, {method: 'GET', redirect: 'error', headers: {authorization: 'Bearer ' + token, accept: 'application/json'}, signal: AbortSignal.timeout(15000)});
 const data = await response.json().catch(() => ({}));
 if (!response.ok || data.success !== true) throw Error('CLOUDFLARE_READ_FAILED_HTTP_' + response.status);
 return data.result;
}
try {
 if (!token) throw Error('BUILD_API_TOKEN_REQUIRED');
 const zone = await get('/zones/' + zoneId);
 if (zone.name !== 'ngeblogging.com' || zone.account?.id !== accountId || zone.status !== 'active') throw Error('ZONE_IDENTITY_OR_STATUS_MISMATCH');
 const fallback = await get('/zones/' + zoneId + '/custom_hostnames/fallback_origin');
 if (fallback.status !== 'active' || fallback.origin !== 'connect.ngeblogging.com') throw Error('EXPECTED_FALLBACK_ORIGIN_NOT_ACTIVE');
 const hostnames = await get('/zones/' + zoneId + '/custom_hostnames?per_page=5');
 if (!Array.isArray(hostnames)) throw Error('CUSTOM_HOSTNAMES_RESPONSE_INVALID');
 console.log(JSON.stringify({configuration: 'saas-build-preflight-stage5', zoneId, zoneActive: true, fallbackActive: true, customHostnamesReadable: true, writePermissionVerified: false, runtimeTokenVerified: false, dnsVerified: false, httpsVerified: false, siteContentVerified: false, productionActivated: false, migrationsPerformed: false}));
} catch (error) {
 const code = String(error?.message || 'PREFLIGHT_FAILED');
 console.error(JSON.stringify({productionActivated: false, error: /^[A-Z0-9_]+$/.test(code) ? code : 'PREFLIGHT_NETWORK_OR_API_FAILURE'}));
 process.exitCode = 1;
}
