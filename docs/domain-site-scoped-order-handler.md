# Opt-in site-scoped order handler

The existing order endpoint now supports x-site-id only when DOMAIN_ORDER_SITE_BINDING_ENABLED is exactly true on production. The flag is not enabled by this commit. Supplying a site intent while the feature is disabled returns an explicit error instead of silently creating an unbound order. With the flag enabled, a valid site header is mandatory. Sandbox requests cannot opt in.

The handler verifies the session, checks site ownership with the user JWT before creating an order, preserves the existing price and order validation, then calls the private binding RPC using the verified user identity. A successful response includes the validated siteBinding. It does not create checkout, process payment, register a domain or install it.

Order creation and binding are separate RPC calls. Binding failure can leave a pending order. After order creation, binding errors explicitly require retryWithSameKey=true; clients must retain the existing idempotency key and must not continue to checkout without a matching binding acknowledgement. The binding RPC independently checks current ownership and locks the order; the earlier ownership read does not replace that check.

This is server integration only. The browser flow, checkout binding guard and installation dispatcher still require integration. Apply and test the binding migration in isolated PostgreSQL before enabling the feature. Do not activate the flag until all clients send and validate the intended site, and do not infer historical order targets from the current browser selection.

Ten candidate handler tests passed locally on Node v20.20.1 using mocked Supabase responses and the real binding parser. This does not prove live SQL permissions, locking, atomicity, the full build, or the project-supported Node >=22.12.0 runtime.
