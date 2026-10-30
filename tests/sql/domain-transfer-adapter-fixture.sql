-- TEST FIXTURE ONLY. Never apply to production.
GRANT SELECT ON public.site_members TO authenticated;
ALTER TABLE public.site_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage5_fixture_members_read_self ON public.site_members
FOR SELECT TO authenticated USING (user_id = auth.uid());
