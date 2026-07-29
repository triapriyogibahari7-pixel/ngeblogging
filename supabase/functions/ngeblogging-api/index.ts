import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.7";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-client-info",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-max-age": "86400",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hasScope(scopes: string[], required: string) {
  return scopes.includes(required) || scopes.includes("*");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return json(405, {
      code: "METHOD_NOT_ALLOWED",
      error: "Gunakan metode GET.",
    });
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("ngb_live_") || token.length < 40) {
    return json(401, {
      code: "API_KEY_REQUIRED",
      error: "API key Ngeblogging tidak ditemukan atau formatnya salah.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return json(503, {
      code: "SERVICE_NOT_CONFIGURED",
      error: "Layanan API belum dikonfigurasi.",
    });
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = await sha256(token);
  const { data: key, error: keyError } = await admin
    .from("api_keys")
    .select("id,user_id,name,prefix,last_four,scopes,status,expires_at,last_used_at,created_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (keyError) {
    return json(503, {
      code: "API_KEY_LOOKUP_FAILED",
      error: "API key belum dapat diverifikasi.",
    });
  }
  if (!key || key.status !== "active") {
    return json(401, {
      code: "API_KEY_INVALID",
      error: "API key tidak aktif.",
    });
  }
  if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) {
    return json(401, {
      code: "API_KEY_EXPIRED",
      error: "API key sudah kedaluwarsa.",
    });
  }

  const ip = (
    request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")
    || ""
  ).split(",")[0].trim().slice(0, 80);
  await admin.from("api_keys").update({
    last_used_at: new Date().toISOString(),
    last_used_ip: ip || null,
    updated_at: new Date().toISOString(),
  }).eq("id", key.id);

  const url = new URL(request.url);
  const marker = "/ngeblogging-api";
  const markerIndex = url.pathname.indexOf(marker);
  const path = markerIndex >= 0
    ? url.pathname.slice(markerIndex + marker.length) || "/v1/me"
    : url.pathname;
  const scopes = Array.isArray(key.scopes) ? key.scopes : [];

  if (path === "/" || path === "/v1" || path === "/v1/me") {
    return json(200, {
      api: "Ngeblogging API",
      version: "v1",
      accountId: key.user_id,
      key: {
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        lastFour: key.last_four,
        scopes,
        createdAt: key.created_at,
      },
      endpoints: [
        "GET /v1/me",
        "GET /v1/sites",
        "GET /v1/sites/:siteId",
        "GET /v1/sites/:siteId/content",
      ],
    });
  }

  if (path === "/v1/sites") {
    if (!hasScope(scopes, "sites:read")) {
      return json(403, {
        code: "SCOPE_REQUIRED",
        error: "Scope sites:read diperlukan.",
      });
    }

    const { data: memberships } = await admin
      .from("site_members")
      .select("site_id")
      .eq("user_id", key.user_id);
    const memberIds = (memberships || [])
      .map((row: { site_id: string }) => row.site_id);
    const filter = memberIds.length
      ? `owner_id.eq.${key.user_id},id.in.(${memberIds.join(",")})`
      : `owner_id.eq.${key.user_id}`;
    const { data, error } = await admin
      .from("sites")
      .select("id,name,slug,description,status,is_public,custom_domain,blueprint,locale,timezone,created_at,updated_at")
      .or(filter)
      .order("created_at", { ascending: true });

    if (error) {
      return json(503, {
        code: "SITES_UNAVAILABLE",
        error: "Daftar situs belum dapat dimuat.",
      });
    }
    return json(200, { data: data || [], count: data?.length || 0 });
  }

  const siteMatch = path.match(
    /^\/v1\/sites\/([0-9a-f-]{36})(?:\/(content))?$/i,
  );
  if (siteMatch) {
    const siteId = siteMatch[1];
    const resource = siteMatch[2] || "site";
    const [{ data: site }, { data: membership }] = await Promise.all([
      admin.from("sites")
        .select("id,owner_id,name,slug,description,status,is_public,custom_domain,blueprint,locale,timezone,created_at,updated_at")
        .eq("id", siteId)
        .maybeSingle(),
      admin.from("site_members")
        .select("role")
        .eq("site_id", siteId)
        .eq("user_id", key.user_id)
        .maybeSingle(),
    ]);

    if (!site || (site.owner_id !== key.user_id && !membership)) {
      return json(404, {
        code: "SITE_NOT_FOUND",
        error: "Situs tidak ditemukan atau tidak dapat diakses.",
      });
    }

    if (resource === "site") {
      if (!hasScope(scopes, "sites:read")) {
        return json(403, {
          code: "SCOPE_REQUIRED",
          error: "Scope sites:read diperlukan.",
        });
      }
      const { owner_id: _ownerId, ...safeSite } = site;
      return json(200, {
        data: safeSite,
        role: site.owner_id === key.user_id
          ? "owner"
          : membership?.role || "member",
      });
    }

    if (!hasScope(scopes, "content:read")) {
      return json(403, {
        code: "SCOPE_REQUIRED",
        error: "Scope content:read diperlukan.",
      });
    }
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || 25)),
    );
    const { data, error } = await admin.from("contents")
      .select("id,kind,title,slug,status,excerpt,published_at,created_at,updated_at")
      .eq("site_id", siteId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      return json(503, {
        code: "CONTENT_UNAVAILABLE",
        error: "Konten belum dapat dimuat.",
      });
    }
    return json(200, { data: data || [], count: data?.length || 0, limit });
  }

  return json(404, {
    code: "ENDPOINT_NOT_FOUND",
    error: "Endpoint API tidak ditemukan.",
  });
});
