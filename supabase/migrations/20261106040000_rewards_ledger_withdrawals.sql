begin;
create table public.nb_rewards_payout_config (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 minimum_idr bigint not null default 1 check(minimum_idr>0)
);
insert into public.nb_rewards_payout_config(singleton) values(true);
create table public.nb_rewards_recipients (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 provider text not null,
 provider_recipient_id text not null,
 masked_account text not null,
 verified_at timestamptz,
 disabled_at timestamptz,
 unique(provider,provider_recipient_id)
);
create table public.nb_rewards_withdrawals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 recipient_id uuid not null references public.nb_rewards_recipients(id),
 amount_idr bigint not null check(amount_idr>0),
 idempotency_key uuid not null,
 status text not null default 'requested' check(status in ('requested','processing','unknown','paid','failed','cancelled')),
 provider_reference text unique,
 requested_at timestamptz not null default now(),
 confirmed_at timestamptz,
 unique(user_id,idempotency_key),
 check(status<>'paid' or (provider_reference is not null and confirmed_at is not null))
);
create table public.nb_rewards_ledger (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 kind text not null check(kind in ('earning','withdrawal_reserve','withdrawal_release')),
 amount_idr bigint not null check(amount_idr<>0),
 source_reference text not null unique,
 withdrawal_id uuid references public.nb_rewards_withdrawals(id),
 created_at timestamptz not null default now(),
 check((kind='earning' and amount_idr>0 and withdrawal_id is null) or (kind='withdrawal_reserve' and amount_idr<0 and withdrawal_id is not null) or (kind='withdrawal_release' and amount_idr>0 and withdrawal_id is not null)),
 unique(withdrawal_id,kind)
);
create index nb_rewards_ledger_owner_idx on public.nb_rewards_ledger(user_id,created_at desc);
alter table public.nb_rewards_payout_config enable row level security;
alter table public.nb_rewards_recipients enable row level security;
alter table public.nb_rewards_withdrawals enable row level security;
alter table public.nb_rewards_ledger enable row level security;
revoke all on public.nb_rewards_payout_config, public.nb_rewards_recipients, public.nb_rewards_withdrawals, public.nb_rewards_ledger from public, anon, authenticated;

create or replace function public.nb_rewards_ledger_immutable() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'REWARDS_LEDGER_APPEND_ONLY'; end; $$;
revoke all on function public.nb_rewards_ledger_immutable() from public,anon,authenticated;
create trigger rewards_ledger_no_update_delete before update or delete on public.nb_rewards_ledger for each row execute function public.nb_rewards_ledger_immutable();

create or replace function public.nb_rewards_wallet() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); balance numeric; history jsonb; recipients jsonb; cfg public.nb_rewards_payout_config%rowtype;
begin
 if uid is null then raise exception 'REWARDS_AUTH_REQUIRED' using errcode='42501'; end if;
 select coalesce(sum(amount_idr),0) into balance from public.nb_rewards_ledger where user_id=uid;
 select * into cfg from public.nb_rewards_payout_config where singleton;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.requested_at desc),'[]'::jsonb) into history from (select id,amount_idr,status,requested_at,confirmed_at from public.nb_rewards_withdrawals where user_id=uid order by requested_at desc limit 50)t;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'provider',provider,'maskedAccount',masked_account)),'[]'::jsonb) into recipients from public.nb_rewards_recipients where user_id=uid and verified_at is not null and disabled_at is null;
 return jsonb_build_object('currency','IDR','availableIdr',balance::text,'payoutEnabled',coalesce(cfg.enabled,false),'minimumIdr',cfg.minimum_idr::text,'recipients',recipients,'withdrawals',history);
end; $$;

create or replace function public.nb_request_rewards_withdrawal(target_recipient uuid, requested_idr bigint, request_key uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); cfg public.nb_rewards_payout_config%rowtype; existing public.nb_rewards_withdrawals%rowtype; balance numeric; request_id uuid;
begin
 if uid is null then raise exception 'REWARDS_AUTH_REQUIRED' using errcode='42501'; end if;
 if request_key is null or requested_idr is null or requested_idr<=0 then raise exception 'REWARDS_INVALID_REQUEST'; end if;
 perform 1 from public.nb_rewards_publishers where user_id=uid for update;
 if not found then raise exception 'REWARDS_NOT_ENROLLED'; end if;
 select * into existing from public.nb_rewards_withdrawals where user_id=uid and idempotency_key=request_key;
 if found then
  if existing.amount_idr<>requested_idr or existing.recipient_id<>target_recipient then raise exception 'REWARDS_IDEMPOTENCY_MISMATCH'; end if;
  return jsonb_build_object('id',existing.id,'status',existing.status,'amountIdr',existing.amount_idr::text);
 end if;
 select * into cfg from public.nb_rewards_payout_config where singleton for share;
 if not found or not cfg.enabled then raise exception 'REWARDS_PAYOUT_NOT_ENABLED'; end if;
 if not exists(select 1 from public.nb_rewards_publishers where user_id=uid and status='approved') then raise exception 'REWARDS_NOT_APPROVED'; end if;
 perform 1 from public.nb_rewards_recipients where id=target_recipient and user_id=uid and verified_at is not null and disabled_at is null for share;
 if not found then raise exception 'REWARDS_RECIPIENT_NOT_VERIFIED'; end if;
 if requested_idr<cfg.minimum_idr then raise exception 'REWARDS_BELOW_MINIMUM'; end if;
 select coalesce(sum(amount_idr),0) into balance from public.nb_rewards_ledger where user_id=uid;
 if balance<requested_idr then raise exception 'REWARDS_INSUFFICIENT_BALANCE'; end if;
 insert into public.nb_rewards_withdrawals(user_id,recipient_id,amount_idr,idempotency_key) values(uid,target_recipient,requested_idr,request_key) returning id into request_id;
 insert into public.nb_rewards_ledger(user_id,kind,amount_idr,source_reference,withdrawal_id) values(uid,'withdrawal_reserve',-requested_idr,'reserve:'||request_id::text,request_id);
 return jsonb_build_object('id',request_id,'status','requested','amountIdr',requested_idr::text);
end; $$;
revoke all on function public.nb_rewards_wallet() from public,anon;
revoke all on function public.nb_request_rewards_withdrawal(uuid,bigint,uuid) from public,anon;
grant execute on function public.nb_rewards_wallet() to authenticated;
grant execute on function public.nb_request_rewards_withdrawal(uuid,bigint,uuid) to authenticated;
commit;
