# Stage 6 compound-suffix normalization correction

Reproduced default normalizer rejection of brand.co.uk, brand.org.uk and brand.me.uk. The Search reader accepts these names, while the Check handler and Check adapter call normalizeRegistrarDomain without a provider suffix catalog. They therefore treated the brand as a subdomain of uk.

Add only these three explicit compound suffixes to the default normalization catalog. Preserve Indonesian suffixes, exact input identity, longest-suffix matching, caller-provided suffixes and rejection of actual subdomains. This is a limited catalog correction, not a complete Public Suffix List implementation or a promise of all extensions.

Syntax recognition does not mean a provider supports registration or transfer. Cloudflare TLD policies list these suffixes, but availability through the current API still depends on the provider response. No provider, token, transaction, FX, sale price or UI change is included. Existing .co.id provider-support blocker remains.

Evidence: baseline new regression suite had 9 passes and 7 failures; corrected module passed all 51 tests (35 original quote-router tests plus 16 new tests). Original router and original suite were verified against Git blob SHAs 8eeb31ea1ff0d19f712fba7e47ba44b81de13a72 and 8fc45dafd883bbfc11310211b9e95116f9b4e659 before modification. Provider callbacks are local mocks; this does not establish full Check handler, React, real registrar or admin-session acceptance.

Run: node --test tests/domain-registrar-quote-router.test.mjs tests/registrar-compound-suffix.test.mjs

No changes to billing, DNS, free-site publication or main. Existing release holds remain.
