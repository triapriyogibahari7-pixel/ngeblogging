-- get_site_comment_dashboard creates the default settings row when absent,
-- therefore it must be VOLATILE rather than STABLE.
alter function public.get_site_comment_dashboard(uuid) volatile;
