# Domain connection menu

The menu is embedded inside the existing per-domain connection card, after a real site_domains record exists. Existing DNS/HTTPS audit controls remain intact. It stores a private planning document through user-session RPCs, with owner/admin authorization, row locks and optimistic revision checks. The migration is supplied as source only and must not be applied to production without separate review and approval. Missing RPCs leave saving unavailable rather than reporting success.

Registrar, DNS operator and destination platform are separate concepts. Nameservers entered by the user are unverified observations and never replace provider-assigned required_name_servers. Blogger uses a destination CNAME and account-specific verification CNAME; there are no universal Blogger nameservers. Consult https://support.google.com/blogger/answer/1233387 for the actual account instructions. Other platforms may supply different DNS records.

This editor supports bounded A/AAAA/CNAME/TXT/MX planning, not arbitrary DNS execution, apex CNAME flattening or guaranteed compatibility/capacity for millions of platforms. Saving does not modify registrar delegation, Cloudflare records, bindings, site publication or existing routing. Selecting Blogger/external does not migrate the active website.

Twelve input-model tests pass. React interaction, full Vite build, live SQL/RLS/concurrency tests, full queue/runtime integration and real-domain HTTP 530 acceptance are not certified by this commit. Check account switching and unsaved changes in browser tests before release. No production deployment is requested.
