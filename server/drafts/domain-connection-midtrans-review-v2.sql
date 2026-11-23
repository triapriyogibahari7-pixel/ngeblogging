begin;
alter table public.domain_connection_orders add column review_reason text, add column review_transaction_id text;
create function public.domain_connection_payment_hold_v2(p_order text,p_reason text,p_transaction text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.domain_connection_orders%rowtype;
begin
 if p_reason is null or p_reason not in ('refund','partial_refund','chargeback','partial_chargeback','payment_mismatch','transaction_changed','status_regression','status_disappeared') then raise exception 'INVALID_REVIEW_REASON'; end if;
 if p_transaction is not null and p_transaction !~ '^[A-Za-z0-9_-]{1,128}$' then raise exception 'INVALID_TRANSACTION'; end if;
 select * into r from public.domain_connection_orders where order_id=p_order for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 perform pg_advisory_xact_lock(hashtextextended('domain-connection-production:'||r.hostname,0));
 update public.domain_connection_orders set payment_state='review_required',review_reason=p_reason,review_transaction_id=coalesce(p_transaction,review_transaction_id) where order_id=r.order_id;
 if r.grant_expires_at is not null then
  update public.domain_connection_entitlements set review_required=true where hostname=r.hostname and site_id=r.site_id;
 end if;
 return jsonb_build_object('ok',true,'orderId',r.order_id,'reviewRequired',true);
end; $$;
create function public.domain_connection_payment_ready_v2()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version','connection-midtrans-v2','amountIdr',99000,'periodMonths',12)
 where pg_catalog.to_regprocedure('public.domain_connection_reserve_v1(uuid,uuid,text,uuid,text)') is not null
 and pg_catalog.to_regprocedure('public.domain_connection_save_checkout_v1(text,uuid,text,text)') is not null
 and pg_catalog.to_regprocedure('public.domain_connection_apply_status_v1(text,text,text,text,text,text,text,text)') is not null;
$$;
revoke all on function public.domain_connection_payment_hold_v2(text,text,text) from public,anon,authenticated;
revoke all on function public.domain_connection_payment_ready_v2() from public,anon,authenticated;
grant execute on function public.domain_connection_payment_hold_v2(text,text,text) to service_role;
grant execute on function public.domain_connection_payment_ready_v2() to service_role;
comment on function public.domain_connection_payment_hold_v2(text,text,text) is 'Trusted backend only, after independently checking Midtrans. Does not rebind transaction IDs, extend rights, call providers, or touch registrar purchases. Pauses an existing entitlement only when this order previously granted service.';
commit;
