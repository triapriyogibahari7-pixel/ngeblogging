# Stage 6 offer clock correction

## Reproduced defect
A local adapter-to-view fixture reproduced a valid server offer being rejected when the client wall clock was one second behind checkedAt. This is a possible cause of the owner's missing-price report, not a confirmed diagnosis of their browser session.

## Client correction
The compact preview card records performance.now() immediately before Check fetch and after response decoding/session verification. readTimedRegistrarOfferView validates the original offer against checkedAt plus the entire measured elapsed request time. This conservatively shortens remaining validity and avoids comparing server time directly with the device wall clock.

The result stores server-time and monotonic anchors. Both the expiry watcher and render-time expiry check use registrarOfferClockNow. Original server checkedAt/expiresAt remain the displayed timestamps. Invalid or backward monotonic measurements fail closed. This is for fresh authenticated no-store Check responses whose server decorator rejects expired offers, not replayed/stored quotes.

Domain, prices, offer identity, support restrictions and purchase-disabled validation remain. This client timer never authorizes a purchase and does not replace server-side revalidation. No changes to layout, free-site controls, billing, DNS or production.

## Evidence and limits
Candidate clock adapter passed 18 local fixture tests with the existing view reader, including plus/minus one day of wall-clock offset. Repository test imports are relocated; assertions unchanged. React integration, real browser lifecycle including OS sleep/resume, original full endpoint suite and live provider behavior remain unverified for this change. Build success alone will not establish acceptance.

Offline: node --test tests/registrar-offer-clock.test.mjs

Existing release holds remain. No merge to main is authorized.
