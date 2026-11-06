export default {
  async fetch(request, env) {
    if (!env?.SITE_RUNTIME?.fetch) {
      return new Response('Custom domain runtime unavailable', {status: 503, headers: {'cache-control': 'no-store'}});
    }
    // Preserve the original URL and hostname for tenant resolution.
    return env.SITE_RUNTIME.fetch(request);
  }
};
