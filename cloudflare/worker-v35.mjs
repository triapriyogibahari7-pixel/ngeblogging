import baseWorker from "./worker-v22.mjs";

const RELEASE = "2026.07.25-studio-v35";

export default {
  async fetch(request, env, context) {
    const response = await baseWorker.fetch(request, env, context);
    const url = new URL(request.url);

    if (url.pathname !== "/api/health" || !response.ok || request.method === "HEAD") return response;

    try {
      const payload = await response.clone().json();
      const headers = new Headers(response.headers);
      headers.set("content-type", "application/json; charset=utf-8");
      headers.set("cache-control", "no-store");
      return new Response(JSON.stringify({
        ...payload,
        release: RELEASE,
        siteLimits: { free: 12, maximum: 12 },
        independentSiteWorkspaces: true,
      }), { status: response.status, statusText: response.statusText, headers });
    } catch {
      return response;
    }
  },
};
