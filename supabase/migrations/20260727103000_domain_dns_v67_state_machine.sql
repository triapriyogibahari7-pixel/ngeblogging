-- Ngeblogging custom-domain state machine v67.
-- Keep registration durable and make every public verification code collision-safe.

do $$
begin
  alter type public.domain_status add value if not exists 'pending_deletion';
exception
  when duplicate_object then null;
end $$;

create unique index if not exists site_domains_verification_token_uq
  on public.site_domains (verification_token);

create index if not exists site_domains_verification_queue_idx
  on public.site_domains (last_checked_at asc nulls first, created_at asc)
  where status in ('pending'::public.domain_status, 'verifying'::public.domain_status);

comment on column public.site_domains.verification_token is
  'Public, high-entropy ownership token used to derive the unique verify-<token>.ngeblogging.com DNS target.';

comment on column public.site_domains.ownership_verification is
  'Versioned custom-domain DNS contract, resolver checks, Cloudflare ownership metadata, and activation state.';
