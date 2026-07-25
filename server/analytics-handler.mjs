import { resolveSeoSite } from "./seo-handler.mjs";

const BOT_PATTERN = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|google-inspectiontool|lighthouse|pagespeed|headlesschrome|phantomjs|wget|curl|python-requests|go-http-client|uptimerobot|semrush|ahrefs|mj12bot|yandexbot|baiduspider)/i;
const HUMAN_BROWSER_PATTERN = /(chrome|crios|firefox|fxios|safari|edg|opr|samsungbrowser|ucbrowser)/i;

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

function supabaseConfig(env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    serviceKey: String(env.SUPABASE_SERVICE_ROLE_KEY || ""),
  };
}

function ready(env) {
  const config = supabaseConfig(env);
  return Boolean(config.url && config.serviceKey);
}

function safeText(value, limit = 500) {
  return String(value || "").trim().slice(0, limit);
}

function safePath(value) {
  const input = safeText(value || "/", 1000);
  try {
    const parsed = new URL(input, "https://tenant.invalid");
    return `${parsed.pathname}${parsed.search}`.slice(0, 1000) || "/";
  } catch {
    return "/";
  }
}

function safeReferrer(value, hostname) {
  const input = safeText(value, 1200);
  if (!input) return "";
  try {
    const parsed = new URL(input);
    return parsed.hostname.toLowerCase() === hostname.toLowerCase() ? "" : parsed.hostname.toLowerCase().slice(0, 253);
  } catch {
    return "";
  }
}

function deviceType(userAgent) {
  const ua = String(userAgent || "");
  if (/(ipad|tablet|kindle|silk|playbook)|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/(mobile|iphone|ipod|android|windows phone|opera mini|iemobile)/i.test(ua)) return "mobile";
  if (/(smart-tv|smarttv|hbbtv|netcast|viera|roku|appletv|googletv)/i.test(ua)) return "tv";
  if (ua) return "desktop";
  return "unknown";
}

function botName(userAgent) {
  const ua = String(userAgent || "");
  const known = [
    ["Googlebot", /googlebot|google-inspectiontool/i],
    ["Bingbot", /bingbot|bingpreview/i],
    ["Facebook", /facebookexternalhit/i],
    ["Twitter", /twitterbot/i],
    ["LinkedIn", /linkedinbot/i],
    ["Ahrefs", /ahrefs/i],
    ["Semrush", /semrush/i],
    ["Yandex", /yandexbot/i],
    ["Baidu", /baiduspider/i],
    ["Uptime monitor", /uptimerobot|statuscake|pingdom/i],
  ];
  return known.find(([, pattern]) => pattern.test(ua))?.[0] || (BOT_PATTERN.test(ua) ? "Bot lain" : "");
}

function classification(request, userAgent) {
  const cf = request.cf || {};
  const verifiedBot = Boolean(cf.botManagement?.verifiedBot || cf.botManagement?.corporateProxy === false && cf.botManagement?.score === 1);
  const score = Number(cf.botManagement?.score);
  if (verifiedBot || BOT_PATTERN.test(userAgent) || (Number.isFinite(score) && score > 0 && score <= 20)) return "bot";
  if (HUMAN_BROWSER_PATTERN.test(userAgent) || (Number.isFinite(score) && score >= 30)) return "human";
  return "unknown";
}

function clientAddress(request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "anonymous";
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function insertEvent(env, event) {
  const config = supabaseConfig(env);
  const response = await fetch(`${config.url}/rest/v1/analytics_events`, {
    method: "POST",
    headers: {
      apikey: config.serviceKey,
      authorization: `Bearer ${config.serviceKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(event),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Analytics insert failed", { status: response.status, code: error?.code });
    throw new Error("Analytics storage unavailable");
  }
}

export function analyticsReady(env) {
  return ready(env);
}

export async function handleAnalyticsRequest(request, env, requestId = "") {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json(405, { error: "Metode tidak didukung." }, requestId);
  if (!ready(env)) return json(503, { code: "ANALYTICS_NOT_CONFIGURED", error: "Penyimpanan analitik belum dikonfigurasi." }, requestId);

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).hostname.toLowerCase() !== url.hostname.toLowerCase()) return json(403, { error: "Origin analitik tidak diizinkan." }, requestId);
    } catch {
      return json(403, { error: "Origin analitik tidak valid." }, requestId);
    }
  }

  const site = await resolveSeoSite(url.hostname, env);
  if (!site) return json(404, { error: "Tenant publik tidak ditemukan." }, requestId);

  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > 12_000) return json(413, { error: "Payload analitik terlalu besar." }, requestId);
  const body = await request.json().catch(() => ({}));
  const userAgent = safeText(request.headers.get("user-agent"), 600);
  const className = classification(request, userAgent);
  const day = new Date().toISOString().slice(0, 10);
  const secret = String(env.ANALYTICS_HASH_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || "ngeblogging-analytics").slice(-128);
  const suppliedVisitor = safeText(body.visitorId, 160);
  const suppliedSession = safeText(body.sessionId, 160);
  const address = clientAddress(request);
  const visitorHash = await sha256(`${site.id}|${day}|${suppliedVisitor || address}|${userAgent}|${secret}`);
  const sessionHash = suppliedSession ? await sha256(`${site.id}|${day}|${suppliedSession}|${secret}`) : null;
  const path = safePath(body.path || url.pathname);
  const slug = decodeURIComponent(path.split("?")[0].split("/").filter(Boolean)[0] || "").slice(0, 180) || null;
  const screenWidth = Math.max(0, Math.min(10000, Number(body.screenWidth) || 0));

  await insertEvent(env, {
    site_id: site.id,
    event_type: "page_view",
    path,
    content_slug: slug,
    visitor_hash: visitorHash,
    session_hash: sessionHash,
    classification: className,
    bot_name: className === "bot" ? botName(userAgent) || "Bot terdeteksi" : null,
    device_type: deviceType(userAgent),
    referrer_host: safeReferrer(body.referrer, url.hostname),
    country_code: safeText(request.cf?.country, 2).toUpperCase() || null,
    metadata: {
      language: safeText(body.language, 24) || null,
      screenBucket: screenWidth ? (screenWidth < 480 ? "small" : screenWidth < 900 ? "medium" : screenWidth < 1440 ? "large" : "xlarge") : "unknown",
      doNotTrack: body.doNotTrack === true,
      release: "analytics-v37",
    },
  });

  return json(202, { recorded: true, classification: className }, requestId);
}
