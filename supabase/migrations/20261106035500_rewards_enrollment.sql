begin;
create table public.nb_rewards_publishers (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 status text not null default 'registered' check (status in ('registered','approved','suspended')),
 created_at timestamptz not null default now()
);
create table public.nb_rewards_placements (
 id uuid primary key default gen_random_uuid(),
 publisher_id uuid not null references public.nb_rewards_publishers(id),
 site_id uuid not null unique references public.sites(id) on delete cascade,
 status text not null default 'registered' check (status in ('registered','approved','suspended')),
 created_at timestamptz not null default now()
);
alter table public.nb_rewards_publishers enable row level security;
alter table public.nb_rewards_placements enable row level security;
revoke all on public.nb_rewards_publishers, public.nb_rewards_placements from public, anon, authenticated;
grant select on public.nb_rewards_publishers, public.nb_rewards_placements to authenticated;
create policy rewards_publisher_owner_read on public.nb_rewards_publishers for select to authenticated using (user_id = auth.uid());
create policy rewards_placement_owner_read on public.nb_rewards_placements for select to authenticated using (exists (select 1 from public.sites s where s.id = site_id and s.owner_id = auth.uid()) and exists (select 1 from public.nb_rewards_publishers p where p.id = publisher_id and p.user_id = auth.uid()));
create or replace function public.nb_enroll_rewards(target_site uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); publisher uuid; placement uuid;
begin
 if uid is null then raise exception 'REWARDS_AUTH_REQUIRED' using errcode='42501'; end if;
 perform 1 from public.sites where id=target_site and owner_id=uid for update;
 if not found then raise exception 'REWARDS_SITE_NOT_OWNED' using errcode='42501'; end if;
 insert into public.nb_rewards_publishers(user_id) values(uid) on conflict(user_id) do nothing;
 select id into publisher from public.nb_rewards_publishers where user_id=uid and status <> 'suspended';
 if publisher is null then raise exception 'REWARDS_PUBLISHER_UNAVAILABLE'; end if;
 insert into public.nb_rewards_placements(publisher_id,site_id) values(publisher,target_site) on conflict(site_id) do nothing;
 select id into placement from public.nb_rewards_placements where site_id=target_site and publisher_id=publisher and status <> 'suspended';
 if placement is null then raise exception 'REWARDS_PLACEMENT_UNAVAILABLE'; end if;
 return jsonb_build_object('publisherId',publisher,'placementId',placement,'siteId',target_site,'status','registered','adServingEnabled',false,'payoutEnabled',false);
end; $$;
revoke all on function public.nb_enroll_rewards(uuid) from public, anon;
grant execute on function public.nb_enroll_rewards(uuid) to authenticated;
commit;
