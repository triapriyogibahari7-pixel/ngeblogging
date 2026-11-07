export function domainRuntimeEnvironment(env={}) {
 const dedicated=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||'').trim();
 const fallback=String(env.CLOUDFLARE_API_TOKEN||'').trim();
 const provider=String(env.CUSTOM_DOMAIN_PROVIDER||'').trim().toLowerCase();
 return {...env,CLOUDFLARE_API_TOKEN:dedicated||fallback,CLOUDFLARE_WORKER_SERVICE:'ngeblogging-custom-domains',...(provider==='cloudflare-worker-custom-domain-v172'?{CUSTOM_DOMAIN_PROVIDER:'cloudflare-full-zone'}:{})};
}
