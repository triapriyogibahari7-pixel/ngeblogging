-- DRAFT ONLY: issue #730, stage 5 prerequisite, NOT the transfer RPC.
-- Outside automatic migrations. Never apply on commit or to production.
-- PostgreSQL execution, RLS tests and rollback tests have NOT been run.
-- Audit 2026-10-30 observed d.site_id = d.site_id in write policies.
-- Test only in disposable PostgreSQL with matching schema and authenticated roles.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

-- Stabilize the consistency scan while this draft changes policies.
-- Run as a migration role with complete visibility, not a restricted app user.
LOCK TABLE public.site_domains, public.site_domain_redirects
  IN SHARE ROW EXCLUSIVE MODE;

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.site_domain_redirects AS r
    LEFT JOIN public.site_domains AS d ON d.id = r.domain_id
    WHERE d.id IS NULL OR d.site_id IS DISTINCT FROM r.site_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'REDIRECT_SITE_MISMATCH_REQUIRES_REVIEW';
  END IF;
END;
$preflight$;

ALTER POLICY redirects_insert_admins ON public.site_domain_redirects
  TO authenticated
  WITH CHECK (
    private.has_site_role(
      site_domain_redirects.site_id,
      ARRAY['owner'::public.member_role, 'admin'::public.member_role]
    )
    AND EXISTS (
      SELECT 1 FROM public.site_domains AS d
      WHERE d.id = site_domain_redirects.domain_id
        AND d.site_id = site_domain_redirects.site_id
    )
  );

ALTER POLICY redirects_update_admins ON public.site_domain_redirects
  TO authenticated
  USING (
    private.has_site_role(
      site_domain_redirects.site_id,
      ARRAY['owner'::public.member_role, 'admin'::public.member_role]
    )
  )
  WITH CHECK (
    private.has_site_role(
      site_domain_redirects.site_id,
      ARRAY['owner'::public.member_role, 'admin'::public.member_role]
    )
    AND EXISTS (
      SELECT 1 FROM public.site_domains AS d
      WHERE d.id = site_domain_redirects.domain_id
        AND d.site_id = site_domain_redirects.site_id
    )
  );

COMMIT;

-- Required isolated tests before promotion:
-- 1. Matching domain/site insert and update by owner/admin succeed.
-- 2. Mismatched site/domain writes fail, including when actor owns both sites.
-- 3. Anonymous, viewer and unrelated-user writes fail.
-- 4. Moving a redirect to another site without moving its domain fails.
-- 5. Consistent redirect reparenting after a domain move works within one transaction.
-- 6. Forced transfer failure rolls back both domain and redirect changes.
-- 7. Pre-existing mismatches abort the whole draft without data cleanup.
-- 8. Repeat application preserves policy behavior; verify no other permissive
--    write policies can bypass these checks in the actual test schema.
-- This corrects write-policy correlation only. It is NOT a foreign-key
-- invariant against later domain.site_id updates and does NOT move redirects.
-- Transfer V2 must explicitly handle dependencies and final consistency.
-- Keep public read policy, grants and application behavior otherwise unchanged.
-- No SECURITY DEFINER function, service_role bypass, DNS call or data deletion.
-- Stage 4 and stage 5 remain OPEN.
