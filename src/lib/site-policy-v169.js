import { createUserSite, listUserSites } from "./studio-data.js";
import { supabase } from "./supabase";

export const SITE_POLICY_RELEASE = "site-policy-paid-max-20261029";
export const MAX_SITES_PER_ACCOUNT = 50;

export function siteLimitForProfile(profile, now = Date.now()) {
  const expiry = Date.parse(profile?.plan_expires_at || "");
  return profile?.plan === "business" && Number.isFinite(expiry) && expiry > now ? 50 : 12;
}

export function siteLimitError(limit = 12) {
  const error = new Error(`Batas paket akun ini adalah ${limit} situs milik sendiri, termasuk draft.`);
  error.code = "SITE_CAPACITY_REACHED";
  error.limit = limit;
  return error;
}

export async function getSiteQuota(userId) {
  if (!userId || !supabase) throw new Error("Sesi dan koneksi akun diperlukan untuk memeriksa kuota situs.");
  const [sites, profileResult] = await Promise.all([
    listUserSites(userId),
    supabase.from("profiles").select("plan,plan_expires_at").eq("id", userId).maybeSingle(),
  ]);
  if (profileResult.error) throw profileResult.error;
  const limit = siteLimitForProfile(profileResult.data);
  const ownedSites = sites.filter((site) => String(site.role || "").toLowerCase() === "owner");
  return {
    sites,
    ownedSites,
    used: ownedSites.length,
    limit,
    remaining: Math.max(0, limit - ownedSites.length),
    canCreate: ownedSites.length < limit,
    release: SITE_POLICY_RELEASE,
  };
}

export async function createUserSiteWithPolicy(input) {
  if (!input?.userId) throw new Error("Akun pengguna tidak ditemukan.");
  const quota = await getSiteQuota(input.userId);
  if (!quota.canCreate) throw siteLimitError(quota.limit);
  try {
    return await createUserSite(input);
  } catch (error) {
    const message = String(error?.message || "");
    if (error?.code === "SITE_LIMIT_REACHED_25" || error?.code === "SITE_CAPACITY_REACHED" || /SITE_LIMIT_REACHED_25|SITE_CAPACITY_REACHED/.test(message)) {
      throw siteLimitError(quota.limit);
    }
    throw error;
  }
}
