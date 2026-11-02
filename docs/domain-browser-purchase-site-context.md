# Browser purchase destination context

The purchase model now accepts an optional siteId. The React form does not pass it yet, so this commit alone does not enable site-bound orders in the UI or activate any server flag.

For a site-scoped purchase, the UUID is normalized and stored on the existing per-owner purchase attempt before the first API request. The owner-wide browser lock and storage key are preserved so switching sites cannot create independent concurrent attempts. Retries must keep the same site and idempotency key. Legacy attempts without site metadata are not automatically assigned to the current site; bound attempts cannot silently drop or change their target. Invalid stored metadata fails closed without deleting the record.

Only the order request receives x-site-id. Before saving registrant details or requesting checkout, the model requires the server siteBinding to match order, user and site, acknowledge binding explicitly, and confirm that no checkout or registration action was taken by that response. Checkout still sends only orderId; the backend guard must use the authoritative database binding. Browser storage is a recovery aid, not an authorization source.

Order/binding failures retain the original key and target except the existing explicit quote-expired/not-found rejection paths. Do not delete local records to bypass uncertain outcomes. Existing unscoped callers remain supported when the server rollout is disabled, but they cannot accept an unexpected site-bound response.

Twelve candidate model tests passed on local Node v20.20.1 with real source dependencies and mocked endpoints. This is not React rendering, PostgreSQL execution, supported Node >=22.12.0 build validation or live commerce verification. Finish the UI context/error handling and apply/test backend migrations before coordinating activation. No deployment, workflow execution, payment or registration occurs in this commit.
