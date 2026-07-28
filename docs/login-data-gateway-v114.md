# Login and Studio data gateway v114

Release: `login-data-gateway-v114-20260729`

## Incident

A valid persisted session reached Studio, but the first membership query could be sent to a same-origin `/api/*` route that returned the SPA HTML document with HTTP 200. The client accepted every non-502/503/504 response as a valid Supabase response, so HTML was passed to the Supabase parser and the onboarding gate showed `Koneksi data belum selesai`.

## Contract

- A gateway response is accepted only when it contains the expected `x-ngeblogging-auth-gateway` or `x-ngeblogging-data-gateway` marker.
- Transport order is same-origin gateway, configured Ngeblogging API worker, then direct Supabase.
- A false HTML 200 response never blocks login or Studio data loading.
- Persisted sessions are not deleted for network or routing failures.
- PWA cache release is `ngeblogging-app-v114-20260729` / `pwa-v114`.
