# OpenSRS read-only quote runtime

This module assembles the read-only transport and quote provider. It does not register an HTTP route, enable checkout, change Worker bindings, or provision domains.

## Server settings

These are project-defined setting names. No credentials belong in source control or browser code.

| Setting | Requirement |
| --- | --- |
| OPENSRS_QUOTE_ENABLED | Exact string `true`; otherwise disabled. |
| OPENSRS_QUOTE_PRODUCTION_ENABLED | Additional exact string `true` for a production deployment; otherwise production quotes remain disabled. |
| OPENSRS_ENV | `test` for `isolated-test`, `live` for `production`; mismatches are blocked. |
| OPENSRS_ACCOUNT_CURRENCY | Explicit uppercase three-letter currency after account verification; do not assume USD. |
| OPENSRS_QUOTES_TAX_INCLUDED | Explicit string `true` or `false` after verifying the price basis. |
| OPENSRS_QUOTE_EXTENSIONS_JSON | Nonempty JSON array of supported lowercase suffixes, without leading dots or duplicates; at most 2000 entries and 32768 characters. Verify support against the reseller account. |
| OPENSRS_TRANSFER_TERMS_JSON | Optional JSON object of suffix to extra term years, integer 0-10; keys must be in the configured suffix list. Omission disables transfer price queries rather than guessing an extra year. |
| OPENSRS_QUOTE_TIMEOUT_MS | Optional integer string 1-30000; default 10000 per transport request. The outer quote router has its own total deadline. |
| OPENSRS_RESELLER_USERNAME | Backend-only reseller username. |
| OPENSRS_API_KEY | Backend secret; never paste into chat, logs, repository files, or frontend variables. |

Pass `deploymentEnvironment` from trusted server configuration, never from customer input. Supported values are `production` and `isolated-test`; unknown deployment contexts are blocked.

## Status contract

`disabled` means an explicit enable flag is absent. `blocked` means configuration is inconsistent or incomplete. `configured` means constructors accepted local settings only: it is not proof of API authentication, allowed egress/IP, account funding, or provider connectivity. The factory reports `accountVerified: false`, `networkVerified: false`, and `purchaseAllowed: false`. Construction performs no HTTP requests.

The factory does not return credential values. Do not expose the internal provider object as a public readiness API. A caller must still authenticate the customer, verify ownership of the active site, preserve quote provider/environment, apply the sale-price policy, and keep paid provisioning separate.

## Verification and release

Run `node --test tests/opensrs-quote-runtime.test.mjs`. These tests use mock HTTP and fake credentials, including the live-endpoint selection case. They do not verify a real OpenSRS account or deploy a Worker. Keep all live settings unchanged until account currency, tax basis, supported suffixes, egress access, and production release are separately verified and approved.
