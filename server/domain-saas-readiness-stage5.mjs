const text = value => String(value || '').trim();
export function saasReadiness(env = {}) {
 const missing = [];
 if (text(env.CUSTOM_DOMAIN_PROVIDER).toLowerCase() !== 'cloudflare-custom-hostnames') missing.push('CUSTOM_DOMAIN_PROVIDER');
 if (text(env.CLOUDFLARE_SAAS_ENABLED).toLowerCase() !== 'true') missing.push('CLOUDFLARE_SAAS_ENABLED');
 if (text(env.CLOUDFLARE_CUSTOM_HOSTNAMES_READY).toLowerCase() !== 'true') missing.push('CLOUDFLARE_CUSTOM_HOSTNAMES_READY');
 if (!text(env.CLOUDFLARE_API_TOKEN)) missing.push('CLOUDFLARE_API_TOKEN');
 if (!/^[a-f0-9]{32}$/i.test(text(env.CLOUDFLARE_ZONE_ID))) missing.push('CLOUDFLARE_ZONE_ID');
 const target = text(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET).toLowerCase().replace(/\.$/, '');
 if (target.length > 253 || !target.includes('.') || target.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) missing.push('CLOUDFLARE_CUSTOM_HOSTNAME_TARGET');
 if (!text(env.SUPABASE_URL || env.VITE_SUPABASE_URL)) missing.push('SUPABASE_URL');
 if (!text(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)) missing.push('SUPABASE_PUBLISHABLE_KEY');
 return {configurationReady: missing.length === 0, missing, provider: 'cloudflare-custom-hostnames', evidence: 'configuration-only', providerApiVerified: false, dnsVerified: false, httpsVerified: false, siteContentVerified: false, migrationPerformed: false};
}
export function guardSaasRequest(request, env, requestId = '') {
 const path = new URL(request.url).pathname;
 if (!path.startsWith('/api/domains/') || request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS' || path === '/api/domains/remove') return null;
 if (text(env.CUSTOM_DOMAIN_PROVIDER).toLowerCase() === 'cloudflare-full-zone') return null;
 const readiness = saasReadiness(env);
 if (readiness.configurationReady) return null;
 return new Response(JSON.stringify({code: 'SAAS_CONFIGURATION_NOT_READY', error: 'Le mode SaaS belum siap. Konfigurasi provider harus lengkap dan diaktifkan secara eksplisit; domain tidak dimigrasikan.', readiness}), {status: 503, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...(requestId ? {'x-request-id': requestId} : {})}});
}
