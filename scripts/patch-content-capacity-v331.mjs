import { readFile } from "node:fs/promises";
import {
  CONTENT_CAPACITY_RELEASE_V331,
  CONTENT_CAPACITY_TARGET_V331,
  assertContentCapacitySimulationV331,
  expectedPageCount,
  simulateContentCapacityV331,
} from "./content-capacity-v331.mjs";

const contentDataFile = new URL("../src/lib/content-data.js", import.meta.url);
const releaseFile = new URL("../public/release-v331.json", import.meta.url);

const [contentData, release] = await Promise.all([
  readFile(contentDataFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

const start = contentData.indexOf("export async function listContentPage");
const end = contentData.indexOf("export async function getContentDocument");
if (start < 0 || end <= start) throw new Error("V331_LIST_CONTENT_SOURCE_MISSING");
const listBlock = contentData.slice(start, end);

for (const marker of [
  "export const CONTENT_PAGE_SIZE = 25",
  ".eq(\"site_id\", siteId)",
  ".order(\"updated_at\", { ascending: false })",
  ".order(\"id\", { ascending: false })",
  ".limit(safeLimit + 1)",
  "updated_at.lt.${cursor.updatedAt}",
  "id.lt.${cursor.id}",
]) if (!listBlock.includes(marker) && !contentData.includes(marker)) throw new Error(`V331_CURSOR_CONTRACT_MISSING:${marker}`);

if (listBlock.includes("body_html")) throw new Error("V331_LIST_BODY_PAYLOAD_REGRESSION");
if (!contentData.includes("Math.min(100, Math.max(1")) throw new Error("V331_LIST_PAGE_BOUND_MISSING");
if (!contentData.includes("payload.body_html = String(values.content).slice(0, 5_000_000)")) throw new Error("V331_BODY_STORAGE_CEILING_REGRESSION");

for (const marker of [
  CONTENT_CAPACITY_RELEASE_V331,
  '"articlesPerSite": 100000',
  '"hardSiteCeiling": 25',
  '"articlesAtHardSiteCeiling": 2500000',
  '"observedNormalSiteCreationQuota": 12',
  '"realProductionRowsInserted": false',
  '"measuredProductionDatabaseThroughputClaimed": false',
  '"quotaAlignmentRequiredBeforeClaiming25SitesAvailableInProduct": true',
]) if (!release.includes(marker)) throw new Error(`V331_RELEASE_INVALID:${marker}`);

const result = assertContentCapacitySimulationV331(simulateContentCapacityV331());
if (result.processed !== CONTENT_CAPACITY_TARGET_V331.targetArticlesAtHardCeiling) throw new Error("V331_HARD_CEILING_TOTAL_MISMATCH");
if (result.pages !== 100_000) throw new Error(`V331_DEFAULT_PAGE_TRAVERSAL_MISMATCH:${result.pages}`);
if (expectedPageCount({ siteCount: 25, articlesPerSite: 100_000, pageSize: 100 }) !== 25_000) throw new Error("V331_MAX_PAGE_TRAVERSAL_MISMATCH");

console.log(JSON.stringify({
  release: CONTENT_CAPACITY_RELEASE_V331,
  simulation: "PASS",
  sites: result.siteCount,
  articlesPerSite: result.articlesPerSite,
  totalVirtualArticles: result.processed,
  pageSize: result.pageSize,
  pageTraversals: result.pages,
  orderingViolations: result.orderingViolations,
  crossSiteViolations: result.crossSiteViolations,
  checksumValid: result.checksum === result.expectedChecksum,
  durationMs: Number(result.durationMs.toFixed(2)),
  virtualRecordsPerSecond: result.recordsPerSecond,
  realProductionRowsInserted: false,
  measuredProductionDatabaseThroughput: false,
  note: "This is a deterministic scale-contract simulation. A separate disposable/staging database is required for a destructive 2.5M-row latency/load benchmark.",
}, null, 2));

// v337 supersedes the v332-v336 single-map/hide-secondary chain. Those patch
// files remain in Git as history, but the current product requirement keeps the
// former right-hand Editorial/Majalah design and moves it below the main map.
await import("./patch-studio-theme-layout-below-v337.mjs");
