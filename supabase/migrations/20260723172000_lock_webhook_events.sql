drop policy if exists "billing_webhook_events_deny_clients" on public.billing_webhook_events;
create policy "billing_webhook_events_deny_clients"
on public.billing_webhook_events
as restrictive
for all
to anon,authenticated
using (false)
with check (false);
