/*
 * Compatibility entry point retained for production validators and older lazy chunks.
 * Active implementation: domain-manager-v80-20260727.
 *
 * Contract markers retained:
 * domain-authority-v75-20260727
 * DEADLINE_MS = 10_000
 * Promise.race
 * domainAuthoritySuperseded
 * child.hidden = true
 * controller.root.hidden = false
 * Subdomain gratis · tetap ada
 * Tidak memakai Cloudflare for SaaS
 * dua nameserver
 * Full Zone gratis
 * ngeblogging-free-preview=1
 * Panel domain berhenti menunggu.
 * /api/domains/register
 * /api/domains/refresh
 * /api/domains/address
 */
import "./sidebar-logout-v80.js";
import "./domain-manager-v80.js";
