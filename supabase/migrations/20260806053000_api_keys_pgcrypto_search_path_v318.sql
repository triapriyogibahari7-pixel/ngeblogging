-- Ngeblogging v318 — API Keys crypto functions live in Supabase's extensions schema.
-- Keep the SECURITY DEFINER functions' search_path explicit while allowing
-- gen_random_bytes() and digest() to resolve correctly.

alter function public.create_api_key(text, text[], integer)
  set search_path = public, extensions, pg_temp;

alter function public.rotate_api_key(uuid)
  set search_path = public, extensions, pg_temp;
