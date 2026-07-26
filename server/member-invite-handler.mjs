function json(status, body, requestId = "") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

function enabled(value) {
  return ["1", "true", "yes", "on", "enabled"].includes(String(value || "").trim().toLowerCase());
}

function config(env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    publishableKey: String(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ""),
    publicSite: String(env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/, ""),
  };
}

export function memberInvitesReady(env) {
  const cfg = config(env);
  return Boolean(
    cfg.url
    && cfg.publishableKey
    && enabled(env.AUTH_MEMBER_INVITES_READY)
    && String(env.AUTH_EMAIL_DELIVERY_PROBE || "").toLowerCase() === "passed",
  );
}

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.trim() : "";
}

function actionFromPath(pathname) {
  if (pathname.endsWith("/create")) return "create";
  if (pathname.endsWith("/accept")) return "accept";
  if (pathname.endsWith("/cancel")) return "cancel";
  return "";
}

export async function handleMemberInviteRequest(request, env, requestId = "") {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json(405, { error: "Metode tidak didukung." }, requestId);
  if (!memberInvitesReady(env)) return json(503, { code: "MEMBER_INVITES_NOT_READY", error: "Undangan email belum diaktifkan pada server produksi." }, requestId);

  const authorization = bearer(request);
  if (!authorization) return json(401, { code: "AUTH_REQUIRED", error: "Silakan masuk terlebih dahulu." }, requestId);
  const action = actionFromPath(new URL(request.url).pathname);
  if (!action) return json(404, { error: "Endpoint undangan tidak ditemukan." }, requestId);

  const cfg = config(env);
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${cfg.url}/functions/v1/member-invitations`, {
    method: "POST",
    headers: {
      apikey: cfg.publishableKey,
      authorization,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ ...body, action, publicSite: cfg.publicSite }),
  });
  const payload = await response.json().catch(() => ({ error: "Respons undangan tidak valid." }));
  return json(response.status, payload, requestId);
}
