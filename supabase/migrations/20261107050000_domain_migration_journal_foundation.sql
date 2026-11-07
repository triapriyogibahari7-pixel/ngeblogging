-- Foundation only: RPC locking/CAS and transactional record adapters are still required.
begin;
create table public.domain_migration_locks (
 domain_id uuid primary key references public.site_domains(id),
 migration_id uuid not null,
 site_id uuid not null references public.sites(id),
 actor_id uuid not null,
 fence uuid not null unique default gen_random_uuid(),
 acquired_at timestamptz not null default now()
);
create table public.domain_migration_journal (
 migration_id uuid primary key,
 domain_id uuid not null references public.site_domains(id),
 site_id uuid not null references public.sites(id),
 version bigint not null check(version>0),
 state jsonb not null check(jsonb_typeof(state)='object'),
 updated_at timestamptz not null default now()
);
create table public.domain_migration_provider_operations (
 migration_id uuid not null,
 operation_id text not null,
 domain_id uuid not null references public.site_domains(id),
 fence uuid not null,
 intent jsonb not null,
 outcome jsonb,
 phase text not null check(phase in ('intent','settled','needs_recovery')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(migration_id,operation_id)
);
alter table public.domain_migration_locks enable row level security;
alter table public.domain_migration_journal enable row level security;
alter table public.domain_migration_provider_operations enable row level security;
revoke all on public.domain_migration_locks,public.domain_migration_journal,public.domain_migration_provider_operations from public,anon,authenticated;
grant select,insert,update,delete on public.domain_migration_locks,public.domain_migration_journal,public.domain_migration_provider_operations to service_role;
commit;
