# Premium Gratis release candidate

Owner decision: 2026-11-23. Premium denotes the design collection, not a requirement to pay. This patch is a release candidate, not an approved production release.

## Actual implementation
The theme-system import switches from the original catalog to a compatibility adapter. The rest of theme-system is preserved. The adapter appends signature themes 001–040, keeps every original catalog object and default in its original order, supplies the UI-required fields, and labels the new category Premium • Gratis. Active candidate metadata has price 0, no checkout, and no paid-entitlement requirement. Existing site quotas and the earlier no-resale/no-redistribution design terms are not broadened. No purchase, grant, billing, or database operation is added.

The original isolated premium-theme-catalog.mjs remains an archival prototype dependency containing superseded price metadata; it is not the active catalog or pricing authority. Its generated 100 designs are not added to the active collection. Candidate pricing overrides source-prototype pricing in premium-free-catalog.mjs. Do not mistake archival exports for the active free access policy. A later cleanup can remove the superseded archival metadata without changing the live policy.

## Public content compatibility
The adapter adds the existing public-home selectors for branding, page navigation, hero identity, and a twelve-slot post feed. PublicSiteNext already populates those selectors from published content and hides unused post cards. Its source and the publication flow are not changed. Static sample editorial sections remain demo content until a site owner customizes theme code; this patch is not a general CMS-block mapping system. Existing generic color/font controls are not newly wired to every hard-coded signature CSS declaration; use custom CSS/code for those declarations until a separately tested customizer mapping exists.

## Asset hold
Themes 041–050 are deliberately not imported into the active adapter. Their third-party reference imagery remains uncleared. The forty candidates use their existing code-drawn visuals rather than replacement stock photos. A source scan rejects external media elements, remote URLs, CSS imports, and CSS URL resources before catalog construction. These scans are guardrails, not a legal rights audit.

## Verification
Tests cover original catalog preservation, default stability, free access metadata, theme activation, normalization, backup/import identity, public selector slots, and image-batch exclusion. The new workflow runs production regressions, build, Worker dry-run, and a network-blocked Chromium check across 390/820/1440 widths. It has no deployment credentials or deployment step. Browser output contains 120 candidate/viewport checks and screenshots only if that job actually runs successfully. Basic browser checks are not a full accessibility or visual-quality audit and do not exercise authenticated Studio cloud saves or the complete live public-content injection.

No tests, build, screenshots, dry-run, merge, or deployment are claimed successful merely because these files exist. Earlier PR checks included failures whose causes have not been verified. Do not bypass failed checks or merge until actual results and remaining customization/public-rendering limitations are reviewed. Main has an automatic production deployment workflow.

No Domain, Nara billing, Post/Page editor, publication-flow, database, or Midtrans transaction changes are part of this patch.
