create index if not exists billing_orders_user_id_idx on public.billing_orders(user_id);
create index if not exists integration_audit_logs_integration_id_idx on public.integration_audit_logs(integration_id);
create index if not exists nara_conversations_project_id_idx on public.nara_conversations(project_id);
create index if not exists nara_projects_site_id_idx on public.nara_projects(site_id);
create index if not exists user_integrations_site_id_idx on public.user_integrations(site_id);
