# Stage 6 editorial domain catalog

Add a single catalog launcher after the existing preview Check/Search form. Opening and closing the native dialog preserve the original form and results. Explicit selection may prepare the existing input and clear an old result with an explanatory message; it never sends a lookup or order. Existing free-site, audit, publication, billing, DNS and main are untouched.

Data contains 200 unique editorial suffix entries across six categories, com first. This is neither a worldwide popularity ranking nor an independently verified registry/provider coverage list. Categories and descriptions are editorial, not registrar eligibility advice. Some entries are restricted or require documents. All provider support is not_verified, IDR prices are null and purchases disabled.

Twenty cards per page, category/query filters, detail view, native modal focus handling, Escape/close, body-scroll restoration and mobile layout are included. The prepare-check action is withheld for compound suffixes not recognized by the current normalizer. Single-label syntax recognition is not provider support. Lookup still requires an explicit Check click and the existing admin/auth flow.

Catalog content/order is currently changed through its configuration module and deployment. No admin editor, runtime catalog database, automatic tariff synchronization, 10,000-domain generator or checkout is implemented by this commit. Do not label placeholder prices as live prices. Future price synchronization must use verified source costs, IDR conversion, fees, quote expiry and the separately drafted margin policy.

Evidence: 13 local data/filter/selection tests passed. React/dialog integration, focus, mobile rendering and the updated JSX build have not yet been verified. Earlier React fixture results predate this catalog and do not cover it.

Run: node --test tests/domain-catalog-stage6.test.mjs

Existing stage 6 and release holds remain. No main merge or transaction activation authorized.
