import { resolveSeoSite } from "./seo-handler.mjs";

const RELEASE = "comments-v93-20260728";
const SYSTEM_HOSTS = new Set([
  "ngeblogging.com",
  "www.ngeblogging.com",
  "studio.ngeblogging.com",
  "api.ngeblogging.com",
]);
const MAX_BODY_BYTES = 16_000;

function config(env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    key: String(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ""),
  };
}

export function commentsReady(env) {
  const value = config(env);
  return Boolean(value.url && value.key);
}

function json(status, body, requestId = "") {
  return new Response(JSON.stringify({ ...body, release: RELEASE }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-ngeblogging-comments": RELEASE,
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

function safeText(value, limit = 500) {
  return String(value || "").trim().slice(0, limit);
}

function safePath(value) {
  try {
    const parsed = new URL(safeText(value || "/", 1200), "https://tenant.invalid");
    return `${parsed.pathname}${parsed.search}`.slice(0, 1000) || "/";
  } catch {
    return "/";
  }
}

function firstSlug(path) {
  return decodeURIComponent(String(path || "/").split("?")[0].split("/").filter(Boolean)[0] || "").slice(0, 180);
}

function deviceType(userAgent) {
  const ua = String(userAgent || "");
  if (/(ipad|tablet|kindle|silk|playbook)|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/(mobile|iphone|ipod|android|windows phone|opera mini|iemobile)/i.test(ua)) return "mobile";
  if (/(smart-tv|smarttv|hbbtv|netcast|viera|roku|appletv|googletv)/i.test(ua)) return "tv";
  return ua ? "desktop" : "unknown";
}

function addressOf(request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "anonymous";
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function visitorToken(request, siteId) {
  const day = new Date().toISOString().slice(0, 10);
  return sha256(`${siteId}|${day}|${addressOf(request)}|${request.headers.get("user-agent") || ""}|${RELEASE}`);
}

function apiHeaders(env, extra = {}) {
  const { key } = config(env);
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    accept: "application/json",
    ...extra,
  };
}

async function rest(env, path) {
  const { url } = config(env);
  const response = await fetch(`${url}/rest/v1/${path}`, { headers: apiHeaders(env) });
  if (!response.ok) return null;
  return response.json();
}

function errorStatus(payload, fallback = 500) {
  const code = String(payload?.code || "");
  const message = String(payload?.message || "");
  if (code === "42501") return 403;
  if (code === "P0002") return 404;
  if (code === "23505") return 409;
  if (code === "P0001" || message.includes("RATE_LIMITED")) return 429;
  if (code === "22023") return 400;
  return fallback;
}

function publicErrorMessage(payload, status) {
  const message = String(payload?.message || "");
  if (message.includes("COMMENTS_DISABLED")) return "Komentar sedang dinonaktifkan untuk konten ini.";
  if (message.includes("COMMENT_RATE_LIMITED")) return "Terlalu banyak komentar dalam waktu singkat. Coba kembali beberapa menit lagi.";
  if (message.includes("COMMENT_DUPLICATE")) return "Komentar yang sama sudah diterima.";
  if (message.includes("COMMENT_EMAIL_REQUIRED")) return "Email wajib diisi.";
  if (message.includes("COMMENT_EMAIL_INVALID")) return "Format email tidak valid.";
  if (message.includes("COMMENT_WEBSITE_INVALID")) return "Alamat website harus berupa URL http atau https.";
  if (status === 404) return "Post atau Page publik tidak ditemukan.";
  if (status === 403) return "Komentar tidak diizinkan pada konten ini.";
  if (status === 429) return "Batas pengiriman komentar tercapai. Coba kembali nanti.";
  return "Komentar belum dapat diproses.";
}

async function rpc(env, name, args) {
  const { url } = config(env);
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: apiHeaders(env, { "content-type": "application/json" }),
    body: JSON.stringify(args),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function resolveTarget(request, env, requestedPath) {
  const url = new URL(request.url);
  const site = await resolveSeoSite(url.hostname, env);
  if (!site) return { site: null, content: null, path: safePath(requestedPath || url.pathname) };
  const path = safePath(requestedPath || url.pathname);
  const slug = firstSlug(path);
  if (!slug) return { site, content: null, path };
  const rows = await rest(
    env,
    `contents?select=id,site_id,kind,title,slug,metadata,status,visibility&site_id=eq.${site.id}&slug=eq.${encodeURIComponent(slug)}&status=eq.published&visibility=eq.public&limit=1`,
  );
  return { site, content: rows?.[0] || null, path };
}

function sameHostOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).hostname.toLowerCase() === new URL(request.url).hostname.toLowerCase();
  } catch {
    return false;
  }
}

export async function handleCommentsRequest(request, env, requestId = "") {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!commentsReady(env)) return json(503, { code: "COMMENTS_NOT_CONFIGURED", error: "Penyimpanan komentar belum dikonfigurasi." }, requestId);
  if (!sameHostOrigin(request)) return json(403, { code: "COMMENTS_ORIGIN_FORBIDDEN", error: "Origin komentar tidak diizinkan." }, requestId);

  if (url.pathname === "/api/comments/public" && request.method === "GET") {
    const target = await resolveTarget(request, env, url.searchParams.get("path") || url.pathname);
    if (!target.site || !target.content) return json(200, { enabled: false, comments: [] }, requestId);
    const result = await rpc(env, "get_public_site_comments", {
      target_site: target.site.id,
      target_content: target.content.id,
    });
    if (!result.response.ok) {
      const status = errorStatus(result.payload, result.response.status);
      return json(status, { code: "COMMENTS_READ_FAILED", error: publicErrorMessage(result.payload, status) }, requestId);
    }
    return json(200, {
      ...result.payload,
      content: { id: target.content.id, title: target.content.title, slug: target.content.slug, kind: target.content.kind },
    }, requestId);
  }

  if (!["/api/comments/submit", "/api/comments/react"].includes(url.pathname)) {
    return json(404, { code: "COMMENTS_ENDPOINT_NOT_FOUND", error: "Endpoint komentar tidak ditemukan." }, requestId);
  }
  if (request.method !== "POST") return json(405, { code: "COMMENTS_METHOD_NOT_ALLOWED", error: "Metode tidak didukung." }, requestId);

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json(413, { code: "COMMENTS_PAYLOAD_TOO_LARGE", error: "Komentar terlalu besar." }, requestId);
  }
  const body = await request.json().catch(() => ({}));

  if (url.pathname === "/api/comments/submit") {
    if (safeText(body.company || body.middleName, 200)) {
      return json(202, { accepted: true, status: "pending", message: "Komentar diterima." }, requestId);
    }
    const target = await resolveTarget(request, env, body.path);
    if (!target.site || !target.content) return json(404, { code: "COMMENT_CONTENT_NOT_FOUND", error: "Post atau Page publik tidak ditemukan." }, requestId);
    const userAgent = safeText(request.headers.get("user-agent"), 600);
    const token = await visitorToken(request, target.site.id);
    const result = await rpc(env, "submit_site_comment", {
      target_site: target.site.id,
      target_content: target.content.id,
      commenter_name: safeText(body.name, 80),
      commenter_email: safeText(body.email, 254),
      commenter_website: safeText(body.website, 300),
      comment_body: safeText(body.body, 4000),
      mood: safeText(body.mood, 8),
      visitor_token: token,
      request_path: target.path,
      request_country: safeText(request.cf?.country, 2).toUpperCase(),
      request_device: deviceType(userAgent),
      request_user_agent: userAgent,
    });
    if (!result.response.ok) {
      const status = errorStatus(result.payload, result.response.status);
      return json(status, { code: "COMMENT_SUBMIT_FAILED", error: publicErrorMessage(result.payload, status) }, requestId);
    }
    return json(202, result.payload, requestId);
  }

  const target = await resolveTarget(request, env, body.path);
  if (!target.site) return json(404, { code: "COMMENT_SITE_NOT_FOUND", error: "Situs publik tidak ditemukan." }, requestId);
  const token = await visitorToken(request, target.site.id);
  const result = await rpc(env, "react_to_site_comment", {
    target_comment: safeText(body.commentId, 80),
    reaction_emoji: safeText(body.emoji, 8),
    visitor_token: token,
  });
  if (!result.response.ok) {
    const status = errorStatus(result.payload, result.response.status);
    return json(status, { code: "COMMENT_REACTION_FAILED", error: publicErrorMessage(result.payload, status) }, requestId);
  }
  return json(200, result.payload, requestId);
}

export async function injectPublicComments(request, response, env) {
  if (request.method !== "GET" || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  const url = new URL(request.url);
  if (SYSTEM_HOSTS.has(url.hostname.toLowerCase()) || !firstSlug(url.pathname)) return response;

  const html = await response.text();
  if (html.includes("data-ngeblogging-comments-v93")) return new Response(html, response);
  const style = '<link rel="stylesheet" href="/comments-v93.css?v=93" data-ngeblogging-comments-v93="style">';
  const script = '<script defer src="/comments-v93.js?v=93" data-ngeblogging-comments-v93="script"></script>';
  const enhanced = (/<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${style}</head>`) : `${style}${html}`)
    .replace(/<\/body>/i, `${script}</body>`);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("x-ngeblogging-comments", RELEASE);
  return new Response(enhanced, { status: response.status, statusText: response.statusText, headers });
}
