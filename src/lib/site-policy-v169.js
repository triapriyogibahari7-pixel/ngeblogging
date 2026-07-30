import { createUserSite, listUserSites } from "./studio-data.js";

export const SITE_POLICY_RELEASE = "site-policy-v169-20260730";
export const MAX_SITES_PER_ACCOUNT = 25;

export function siteLimitError() {
  const error = new Error(`Setiap akun dapat memiliki maksimal ${MAX_SITES_PER_ACCOUNT} situs milik sendiri.`);
  error.code = "SITE_LIMIT_REACHED_25";
  error.limit = MAX_SITES_PER_ACCOUNT;
  return error;
}

export async function getSiteQuota(userId) {
  const sites = await listUserSites(userId);
  const ownedSites = sites.filter((site) => String(site.role || "").toLowerCase() === "owner");
  return {
    sites,
    ownedSites,
    used: ownedSites.length,
    limit: MAX_SITES_PER_ACCOUNT,
    remaining: Math.max(0, MAX_SITES_PER_ACCOUNT - ownedSites.length),
    canCreate: ownedSites.length < MAX_SITES_PER_ACCOUNT,
    release: SITE_POLICY_RELEASE,
  };
}

export async function createUserSiteWithPolicy(input) {
  if (!input?.userId) throw new Error("Akun pengguna tidak ditemukan.");
  const quota = await getSiteQuota(input.userId);
  if (!quota.canCreate) throw siteLimitError();
  try {
    return await createUserSite(input);
  } catch (error) {
    const message = String(error?.message || "");
    if (error?.code === "SITE_LIMIT_REACHED_25" || message.includes("SITE_LIMIT_REACHED_25")) {
      throw siteLimitError();
    }
    throw error;
  }
}
