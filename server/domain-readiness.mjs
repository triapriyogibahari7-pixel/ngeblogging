function present(value) {
  return Boolean(String(value || "").trim());
}

export function customDomainReadiness(env = {}) {
  const target = String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || env.CUSTOM_DOMAIN_CNAME_TARGET || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  const checks = {
    CLOUDFLARE_API_TOKEN: present(env.CLOUDFLARE_API_TOKEN),
    CLOUDFLARE_ZONE_ID: present(env.CLOUDFLARE_ZONE_ID),
    CLOUDFLARE_CUSTOM_HOSTNAME_TARGET: present(target),
    SUPABASE_URL: present(env.SUPABASE_URL || env.VITE_SUPABASE_URL),
    SUPABASE_PUBLISHABLE_KEY: present(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: present(env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const missing = Object.entries(checks).filter(([, ready]) => !ready).map(([name]) => name);
  return { enabled: missing.length === 0, missing, cnameTarget: target || null };
}
