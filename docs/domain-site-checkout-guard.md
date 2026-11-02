# Site-bound checkout guard

When DOMAIN_ORDER_SITE_BINDING_ENABLED is true on production, the checkout handler calls domain_begin_site_production_checkout instead of the legacy begin RPC. No flag is enabled here. Sandbox and disabled rollout behavior remain unchanged. The checkout request still accepts only orderId; the destination comes exclusively from the stored binding.

The new RPC checks the trusted server role, locks the buyer's production order, requires a matching production binding, locks and revalidates the current site owner, then delegates to the existing checkout begin function in the same database transaction. Existing price, registrant, payment-state, expiry and idempotency rules remain the responsibility of that existing function. No gateway call is made by this SQL.

The handler rejects binding/owner errors before creating a gateway transaction and does not fall back to an unbound begin RPC if the wrapper fails. Reused checkout sessions also pass through the wrapper. Ownership can change after this transaction; installation must independently revalidate current ownership, paid state and confirmed registration. This guard is not a permanent ownership lock or proof of successful installation.

Nine candidate handler tests passed locally on Node v20.20.1 with all database and Midtrans responses mocked. The SQL has not been executed or applied; these tests do not prove row-lock privileges, real RPC behavior or concurrency. Test those in isolated PostgreSQL, then validate the supported Node >=22.12.0 build. Apply the binding migration and this guard migration before activating the rollout flag, and finish the browser integration first. No deployment, live payment or registration is part of this commit.
