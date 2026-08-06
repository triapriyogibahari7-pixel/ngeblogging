export const CONTENT_CAPACITY_RELEASE_V331 = "content-capacity-v331-20260806";

export const CONTENT_CAPACITY_TARGET_V331 = Object.freeze({
  hardSiteCeiling: 25,
  observedAppSiteQuota: 12,
  articlesPerSite: 100_000,
  defaultPageSize: 25,
  maximumListPageSize: 100,
  targetArticlesAtHardCeiling: 2_500_000,
  targetArticlesAtObservedQuota: 1_200_000,
});

export function expectedPageCount({ siteCount, articlesPerSite, pageSize }) {
  return siteCount * Math.ceil(articlesPerSite / pageSize);
}

export function expectedOrdinalChecksum(totalArticles) {
  const n = BigInt(totalArticles);
  return (n * (n + 1n)) / 2n;
}

export function simulateContentCapacityV331({
  siteCount = CONTENT_CAPACITY_TARGET_V331.hardSiteCeiling,
  articlesPerSite = CONTENT_CAPACITY_TARGET_V331.articlesPerSite,
  pageSize = CONTENT_CAPACITY_TARGET_V331.defaultPageSize,
} = {}) {
  if (!Number.isSafeInteger(siteCount) || siteCount < 1) throw new TypeError("siteCount must be a positive integer");
  if (!Number.isSafeInteger(articlesPerSite) || articlesPerSite < 1) throw new TypeError("articlesPerSite must be a positive integer");
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > CONTENT_CAPACITY_TARGET_V331.maximumListPageSize) {
    throw new RangeError(`pageSize must be between 1 and ${CONTENT_CAPACITY_TARGET_V331.maximumListPageSize}`);
  }

  const startedAt = performance.now();
  const totalExpected = siteCount * articlesPerSite;
  const pagesExpected = expectedPageCount({ siteCount, articlesPerSite, pageSize });
  let processed = 0;
  let pages = 0;
  let checksum = 0n;
  let orderingViolations = 0;
  let crossSiteViolations = 0;

  for (let siteIndex = 0; siteIndex < siteCount; siteIndex += 1) {
    let previousUpdatedRank = Number.POSITIVE_INFINITY;
    let previousIdRank = Number.POSITIVE_INFINITY;

    for (let offset = 0; offset < articlesPerSite; offset += pageSize) {
      pages += 1;
      const end = Math.min(offset + pageSize, articlesPerSite);

      for (let rowIndex = offset; rowIndex < end; rowIndex += 1) {
        // Virtual keyset cursor: newest rows have the largest update/id rank and
        // every following row must be strictly older. No row body is allocated.
        const updatedRank = articlesPerSite - rowIndex;
        const idRank = updatedRank;
        if (!(updatedRank < previousUpdatedRank || (updatedRank === previousUpdatedRank && idRank < previousIdRank))) {
          orderingViolations += 1;
        }
        previousUpdatedRank = updatedRank;
        previousIdRank = idRank;

        const globalOrdinal = siteIndex * articlesPerSite + rowIndex + 1;
        const derivedSite = Math.floor((globalOrdinal - 1) / articlesPerSite);
        if (derivedSite !== siteIndex) crossSiteViolations += 1;

        checksum += BigInt(globalOrdinal);
        processed += 1;
      }
    }
  }

  const durationMs = performance.now() - startedAt;
  return {
    release: CONTENT_CAPACITY_RELEASE_V331,
    siteCount,
    articlesPerSite,
    pageSize,
    processed,
    expected: totalExpected,
    pages,
    expectedPages: pagesExpected,
    orderingViolations,
    crossSiteViolations,
    checksum,
    expectedChecksum: expectedOrdinalChecksum(totalExpected),
    durationMs,
    recordsPerSecond: durationMs > 0 ? Math.round(processed / (durationMs / 1000)) : null,
    constantMemoryModel: true,
    realDatabaseLoadTest: false,
  };
}

export function assertContentCapacitySimulationV331(result) {
  if (result.processed !== result.expected) throw new Error(`V331_COUNT_MISMATCH:${result.processed}/${result.expected}`);
  if (result.pages !== result.expectedPages) throw new Error(`V331_PAGE_COUNT_MISMATCH:${result.pages}/${result.expectedPages}`);
  if (result.orderingViolations !== 0) throw new Error(`V331_CURSOR_ORDERING_VIOLATION:${result.orderingViolations}`);
  if (result.crossSiteViolations !== 0) throw new Error(`V331_SITE_ISOLATION_VIOLATION:${result.crossSiteViolations}`);
  if (result.checksum !== result.expectedChecksum) throw new Error(`V331_CHECKSUM_MISMATCH:${result.checksum}/${result.expectedChecksum}`);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scenarios = [25, 50, 100].map((pageSize) => assertContentCapacitySimulationV331(simulateContentCapacityV331({ pageSize })));
  const report = scenarios.map((result) => ({
    release: result.release,
    sites: result.siteCount,
    articlesPerSite: result.articlesPerSite,
    totalArticles: result.processed,
    pageSize: result.pageSize,
    pageTraversals: result.pages,
    cursorOrderingViolations: result.orderingViolations,
    crossSiteViolations: result.crossSiteViolations,
    checksumValid: result.checksum === result.expectedChecksum,
    durationMs: Number(result.durationMs.toFixed(2)),
    virtualRecordsPerSecond: result.recordsPerSecond,
    realDatabaseLoadTest: false,
  }));
  console.log(JSON.stringify({
    release: CONTENT_CAPACITY_RELEASE_V331,
    note: "Deterministic virtual-record simulation only; this does not claim measured Supabase throughput for 2.5 million stored rows.",
    observedAppSiteQuota: CONTENT_CAPACITY_TARGET_V331.observedAppSiteQuota,
    hardSiteCeiling: CONTENT_CAPACITY_TARGET_V331.hardSiteCeiling,
    scenarios: report,
  }, null, 2));
}
