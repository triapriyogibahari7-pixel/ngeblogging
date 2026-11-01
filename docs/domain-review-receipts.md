# Domain review receipts

Server-only integrity envelope for a fresh single-domain customer price check. This is not a final order, a reserved domain, registrant consent, payment proof, checkout authorization, or a replay-prevention ledger.

## Issuance

Only pass a fresh server-computed `DOMAIN_CUSTOMER_PRICE_CHECK` result after authenticating the caller and checking ownership of the target site. Never sign a price object supplied by a browser. The caller must retain private pricing/preflight evidence separately when implementing the order ledger.

The HMAC-SHA256 context is dedicated to Ngeblogging domain reviews for OpenSRS live registration. Do not reuse that context for renewals, transfers, or another provider. The `NDR1` envelope binds the review nonce, authenticated user, target site, canonical domain, IDR amount, one-year term, and issuance/expiry timestamps. Its public payload contains no registrar credential or wholesale cost. Base64url is encoding, not encryption; identifiers and the price inside it are readable.

Use a dedicated cryptographically random 32-byte server key or its canonical unpadded base64url encoding. Do not reuse the OpenSRS API key, Midtrans key, browser variables, or a repository-stored credential. This commit does not install a signing key or enable issuance from an HTTP endpoint.

Source checks must be at most 30 seconds old. Receipt expiry never exceeds the source price expiry or two minutes from issuance. A changed or rotated signing key invalidates earlier receipts.

## Verification and future checkout

Verify the signature and require trusted current user, site, domain, and, when matching a stored order, the expected amount. Recheck site ownership against the database. A valid receipt can be verified repeatedly until expiry: it is intentionally not single-use.

Before any future checkout, implement a database transaction that prevents replay/duplicate orders, binds the registrar and site immutably, and preserves private price evidence. Genuine registrant details/terms consent, fresh registrar preflight, payment verification, and reconciliation are still required. Do not feed this receipt into the legacy Cloudflare-specific registration ledger.

Both issue and verify results keep `purchaseAllowed: false` and `checkoutAvailable: false`. No database, HTTP, payment, registrar, or DNS action occurs in this module.

## Tests

Run `node --test tests/domain-review-receipt.test.mjs`. Tests use a synthetic key and price checks in Node. They do not verify the complete checkout flow, Worker build, live registrar, database transactions, or production configuration.
