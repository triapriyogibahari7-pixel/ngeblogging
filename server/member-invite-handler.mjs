const ALLOWED_ROLES = new Set(["admin", "editor", "author", "contributor", "viewer"]);
const MEMBER_LIMIT = 100;

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
    serviceKey: String(env.SUPABASE_SERVICE_ROLE_KEY || ""),
    publicSite: String(env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/, ""),
  };
}

export function memberInvitesReady(env) {
  const cfg = config(env);
  return Boolean(
    cfg.url
    && cfg.publishableKey
    && cfg.serviceKey
    && enabled(env.AUTH_MEMBER_INVITES_READY)
    && String(env.AUTH_EMAIL_DELIVERY_PROBE || "").toLowerCase() === "passed",
  );
}

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function verifyUser(request, env) {
  const token = bearer(request);
  if (!token) throw Object.assign(new Error("Silakan masuk terlebih dahulu."), { status: 401, code: "AUTH_REQUIRED" });
  const cfg = config(env);
  const response = await fetch(`${cfg.url}/auth/v1/user`, {
    headers: { apikey: cfg.publishableKey, authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw Object.assign(new Error("Sesi pengguna tidak valid."), { status: 401, code: "INVALID_SESSION" });
  return { user: await response.json(), token };
}

function adminHeaders(env, prefer = "") {
  const cfg = config(env);
  return {
    apikey: cfg.serviceKey,
    authorization: `Bearer ${cfg.serviceKey}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

async function adminJson(env, path, options = {}) {
  const cfg = config(env);
  const response = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers: { ...adminHeaders(env, options.prefer), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Member invitation database request failed", { path, status: response.status, code: payload?.code });
    throw Object.assign(new Error(payload?.message || "Penyimpanan anggota belum dapat diproses."), { status: 503, code: payload?.code || "MEMBER_DATABASE_ERROR" });
  }
  return payload;
}

async function verifyManager(env, siteId, userId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(siteId || ""))) throw Object.assign(new Error("Situs tidak valid."), { status: 400, code: "INVALID_SITE" });
  const rows = await adminJson(env, `site_members?site_id=eq.${encodeURIComponent(siteId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`);
  const role = rows?.[0]?.role;
  if (!new Set(["owner", "admin"]).has(role)) throw Object.assign(new Error("Hanya pemilik atau admin yang dapat mengundang anggota."), { status: 403, code: "SITE_MANAGER_REQUIRED" });
  return role;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase().slice(0, 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) throw Object.assign(new Error("Alamat email tidak valid."), { status: 400, code: "INVALID_EMAIL" });
  return email;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function counts(env, siteId) {
  const [members, invitations] = await Promise.all([
    adminJson(env, `site_members?site_id=eq.${encodeURIComponent(siteId)}&select=user_id`),
    adminJson(env, `site_invitations?site_id=eq.${encodeURIComponent(siteId)}&accepted_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id`),
  ]);
  return { active: members?.length || 0, pending: invitations?.length || 0 };
}

async function sendAuthInvite(env, email, redirectTo, metadata) {
  const cfg = config(env);
  const response = await fetch(`${cfg.url}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: adminHeaders(env),
    body: JSON.stringify({ email, data: metadata }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || "Email undangan belum dapat dikirim.";
    throw Object.assign(new Error(message), { status: response.status === 429 ? 429 : 409, code: payload?.code || "INVITE_DELIVERY_FAILED" });
  }
  return payload;
}

async function createInvitation(request, env, requestId) {
  if (!memberInvitesReady(env)) return json(503, { code: "MEMBER_INVITES_NOT_READY", error: "Undangan email belum diaktifkan pada server produksi." }, requestId);
  const { user } = await verifyUser(request, env);
  const body = await request.json().catch(() => ({}));
  const siteId = String(body.siteId || "");
  const email = normalizeEmail(body.email);
  const role = String(body.role || "viewer").toLowerCase();
  if (!ALLOWED_ROLES.has(role)) return json(400, { error: "Peran undangan tidak valid." }, requestId);
  await verifyManager(env, siteId, user.id);

  const quota = await counts(env, siteId);
  if (quota.active + quota.pending >= MEMBER_LIMIT) return json(409, { code: "SITE_MEMBER_LIMIT_REACHED", error: `Maksimum ${MEMBER_LIMIT} anggota dan undangan aktif per situs.` }, requestId);

  const existing = await adminJson(env, `site_invitations?site_id=eq.${encodeURIComponent(siteId)}&email=eq.${encodeURIComponent(email)}&accepted_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,email,role,expires_at&limit=1`);
  if (existing?.[0]) return json(409, { code: "INVITATION_EXISTS", error: "Email tersebut sudah memiliki undangan aktif." }, requestId);

  const token = randomToken();
  const tokenHash = await hashToken(token);
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await adminJson(env, "site_invitations?select=id,site_id,email,role,expires_at,created_at", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ site_id: siteId, email, role, token_hash: tokenHash, invited_by: user.id, expires_at: expiry }),
  });
  const invitation = rows?.[0];
  const redirectTo = `${config(env).publicSite}/?member_invite=${encodeURIComponent(token)}`;

  try {
    await sendAuthInvite(env, email, redirectTo, { site_id: siteId, member_role: role, invitation_id: invitation?.id });
  } catch (error) {
    if (invitation?.id) await adminJson(env, `site_invitations?id=eq.${encodeURIComponent(invitation.id)}`, { method: "DELETE", prefer: "return=minimal" }).catch(() => null);
    throw error;
  }

  return json(201, { invitation, delivered: true, remaining: Math.max(MEMBER_LIMIT - quota.active - quota.pending - 1, 0) }, requestId);
}

async function acceptInvitation(request, env, requestId) {
  const { user } = await verifyUser(request, env);
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  if (!/^[0-9a-f]{64}$/i.test(token)) return json(400, { error: "Token undangan tidak valid." }, requestId);
  const tokenHash = await hashToken(token);
  const rows = await adminJson(env, `site_invitations?token_hash=eq.${encodeURIComponent(tokenHash)}&accepted_at=is.null&select=id,site_id,email,role,expires_at&limit=1`);
  const invitation = rows?.[0];
  if (!invitation) return json(404, { error: "Undangan tidak ditemukan atau sudah digunakan." }, requestId);
  if (new Date(invitation.expires_at).getTime() <= Date.now()) return json(410, { error: "Undangan sudah kedaluwarsa." }, requestId);
  if (String(user.email || "").toLowerCase() !== String(invitation.email || "").toLowerCase()) return json(403, { error: "Masuk menggunakan email yang menerima undangan." }, requestId);

  const existing = await adminJson(env, `site_members?site_id=eq.${encodeURIComponent(invitation.site_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`);
  if (!existing?.[0]) {
    await adminJson(env, "site_members?on_conflict=site_id,user_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify({ site_id: invitation.site_id, user_id: user.id, role: invitation.role }),
    });
  }
  await adminJson(env, `site_invitations?id=eq.${encodeURIComponent(invitation.id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ accepted_at: new Date().toISOString() }),
  });
  return json(200, { accepted: true, siteId: invitation.site_id, role: existing?.[0]?.role || invitation.role }, requestId);
}

async function cancelInvitation(request, env, requestId) {
  const { user } = await verifyUser(request, env);
  const body = await request.json().catch(() => ({}));
  const invitationId = String(body.invitationId || "");
  const rows = await adminJson(env, `site_invitations?id=eq.${encodeURIComponent(invitationId)}&select=id,site_id&limit=1`);
  const invitation = rows?.[0];
  if (!invitation) return json(404, { error: "Undangan tidak ditemukan." }, requestId);
  await verifyManager(env, invitation.site_id, user.id);
  await adminJson(env, `site_invitations?id=eq.${encodeURIComponent(invitation.id)}`, { method: "DELETE", prefer: "return=minimal" });
  return json(200, { removed: true }, requestId);
}

export async function handleMemberInviteRequest(request, env, requestId = "") {
  const pathname = new URL(request.url).pathname;
  try {
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    if (request.method !== "POST") return json(405, { error: "Metode tidak didukung." }, requestId);
    if (pathname.endsWith("/create")) return await createInvitation(request, env, requestId);
    if (pathname.endsWith("/accept")) return await acceptInvitation(request, env, requestId);
    if (pathname.endsWith("/cancel")) return await cancelInvitation(request, env, requestId);
    return json(404, { error: "Endpoint undangan tidak ditemukan." }, requestId);
  } catch (error) {
    return json(error.status || 500, { code: error.code || "MEMBER_INVITE_ERROR", error: error.message || "Undangan anggota belum dapat diproses." }, requestId);
  }
}
