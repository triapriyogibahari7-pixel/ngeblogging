# Order-to-site binding foundation

## Scope

This commit adds a private destination ledger and a server-only binding RPC. It does not apply a migration, add an HTTP endpoint, change the current order body, require bindings for existing checkout, dispatch installation, or enable any production flag. The acknowledgement parser is a building block, not an integrated handler.

## Binding rules

The backend must derive p_user_id from a verified session, never from browser-supplied identity. The RPC locks the production order, checks that the buyer owns the site, and binds a new destination only while the order is pending, registration has not started, there is no review reason or checkout session, and the order is under 15 minutes old. Repeating the same binding returns binding_reused=true; requesting a different site returns ORDER_SITE_BINDING_CONFLICT. No UPDATE or DELETE grant is provided on the new table. service_role remains a trusted backend role with SELECT and INSERT, not an untrusted client identity.

site_id is an immutable UUID snapshot without a site foreign key. This intentionally avoids adding a new site-deletion restriction or deleting financial history with a site. A deleted or transferred site must block future installation; do not choose a replacement automatically. Binding-time ownership is not sufficient evidence of ownership at installation time.

## Rollout gates

The production metadata read confirmed the column names and types used here. It did not execute this SQL or prove locking, privileges or concurrency. Test the migration in isolated PostgreSQL, including same-order concurrent bindings, different destinations, site ownership changes, deleted sites, late attempts and simultaneous checkout. Verify existing service_role row-lock privileges without broadening existing table grants automatically.

Then connect authenticated order creation/binding and the browser flow before making the binding mandatory at checkout. Missing binding must fail closed for automatic installation. Do not backfill historical paid orders from the currently selected browser site. Revalidate payment, confirmed registration, site ownership, domain conflicts and provider routing before any installation action. DNS, HTTPS and routing need their own confirmation states.

## Tests

The eight parser unit tests passed locally on Node v20.20.1 using synthetic acknowledgements. They do not execute PostgreSQL, validate real RPC authorization or prove the complete checkout/site-installation flow. The project-supported Node >=22.12.0 build remains unverified.
