import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CONTENT_CAPACITY_RELEASE_V331,
  CONTENT_CAPACITY_TARGET_V331,
  assertContentCapacitySimulationV331,
  expectedPageCount,
  simulateContentCapacityV331,
} from "../scripts/content-capacity-v331.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v331 traverses every virtual article for the 25-site x 100,000 target without gaps, duplicates or cross-site leakage", () => {
  const result = assertContentCapacitySimulationV331(simulateContentCapacityV331());
  assert.equal(result.release, CONTENT_CAPACITY_RELEASE_V331);
  assert.equal(result.siteCount, 25);
  assert.equal(result.articlesPerSite, 100_000);
  assert.equal(result.processed, 2_500_000);
  assert.equal(result.pages, 100_000);
  assert.equal(result.orderingViolations, 0);
  assert.equal(result.crossSiteViolations, 0);
  assert.equal(result.checksum, result.expectedChecksum);
  assert.equal(result.constantMemoryModel, true);
  assert.equal(result.realDatabaseLoadTest, false);
});

test("v331 validates current supported cursor page sizes without changing the 2.5m logical result", () => {
  for (const pageSize of [25, 50, 100]) {
    const result = assertContentCapacitySimulationV331(simulateContentCapacityV331({ pageSize }));
    assert.equal(result.processed, 2_500_000);
    assert.equal(result.pages, expectedPageCount({ siteCount: 25, articlesPerSite: 100_000, pageSize }));
  }
  assert.equal(expectedPageCount({ siteCount: 25, articlesPerSite: 100_000, pageSize: 25 }), 100_000);
  assert.equal(expectedPageCount({ siteCount: 25, articlesPerSite: 100_000, pageSize: 50 }), 50_000);
  assert.equal(expectedPageCount({ siteCount: 25, articlesPerSite: 100_000, pageSize: 100 }), 25_000);
});

test("v331 keeps Studio article listing keyset-paginated, site-scoped and body-light", async () => {
  const source = await read("src/lib/content-data.js");
  const start = source.indexOf("export async function listContentPage");
  const end = source.indexOf("export async function getContentDocument");
  assert.ok(start >= 0 && end > start, "listContentPage source block must exist");
  const listBlock = source.slice(start, end);

  assert.match(source, /export const CONTENT_PAGE_SIZE = 25/);
  assert.match(listBlock, /Math\.min\(100,/);
  assert.match(listBlock, /\.eq\("site_id", siteId\)/);
  assert.match(listBlock, /\.order\("updated_at", \{ ascending: false \}\)/);
  assert.match(listBlock, /\.order\("id", \{ ascending: false \}\)/);
  assert.match(listBlock, /\.limit\(safeLimit \+ 1\)/);
  assert.match(listBlock, /updated_at\.lt\.\$\{cursor\.updatedAt\}/);
  assert.match(listBlock, /id\.lt\.\$\{cursor\.id\}/);
  assert.doesNotMatch(listBlock, /body_html/);
});

test("v331 documents the difference between the observed app quota and the 25-site hard ceiling", () => {
  assert.equal(CONTENT_CAPACITY_TARGET_V331.observedAppSiteQuota, 12);
  assert.equal(CONTENT_CAPACITY_TARGET_V331.hardSiteCeiling, 25);
  assert.equal(CONTENT_CAPACITY_TARGET_V331.targetArticlesAtObservedQuota, 1_200_000);
  assert.equal(CONTENT_CAPACITY_TARGET_V331.targetArticlesAtHardCeiling, 2_500_000);
});
