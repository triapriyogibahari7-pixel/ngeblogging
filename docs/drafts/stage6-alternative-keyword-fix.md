# Stage 6 active alternative-search correction

Previously the Search adapter forwarded a complete input such as nama.co.id directly as the provider q parameter. The alternative action now uses the first label of a domain-like input as a broad suggestion keyword (nama), rather than continuing to bias the query toward the entered extension. Plain keywords and phrases stay unchanged. This is keyword extraction only, not public-suffix/ownership parsing or registration validation.

The response preserves normalized original query for the existing UI request/response check and adds searchTerm for transparency. Provider-returned names, prices and restrictions remain authoritative inputs to the existing validation. The exact-domain Check handler and adapter are not changed. No automatic Check loop, registrar fallback, invented candidates, new credentials or purchases are introduced.

This correction does not prove the cause of the owner's earlier live failures and cannot guarantee provider suggestions, .co.id support, any particular result count or live success. Search remains preview-admin only through the unchanged handler. Limit remains 50; purchaseAllowed remains false. IDR sale-price integration remains unfinished and is not activated by this commit.

Evidence: 16 local adapter tests passed with mocked provider responses. The baseline adapter was verified against Git blob 0c82a06719da27afcf1f4d251c5d09f8b47d3e82 before modification. This run did not test the React card, real provider or full endpoint suite.

Run: node --test tests/registrar-search-keyword.test.mjs

No changes to billing, free-site publication, DNS or main. Existing acceptance and release holds remain.
