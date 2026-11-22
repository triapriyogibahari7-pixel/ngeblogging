-- Requires domain-connection-installation-v1.sql before deployment.
-- Read-only authorization; does not activate, renew, or mutate domains.
begin;
set local lock_timeout='2s';
set local statement_timeout='30s';
create function public.domain_connection_serving_v1(p_hostname text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare root text;managed boolean;j public.domain_connection_installations%rowtype;d public.site_domains%rowtype;e public.domain_connection_entitlements%rowtype;r public.domain_connection_orders%rowtype;outside jsonb;denied jsonb;
begin
 if p_hostname is null or length(p_hostname)>253 or p_hostname<>lower(p_hostname) or p_hostname ~ '[^a-z0-9.-]' then raise exception 'SERVING_HOSTNAME_INVALID';end if;
 outside:=jsonb_build_object('version','connection-serving-v1','hostname',p_hostname,'applies',false,'allowed',false);
 denied:=jsonb_build_object('version','connection-serving-v1','hostname',p_hostname,'applies',true,'allowed',false);
 if p_hostname='ngeblogging.com' or p_hostname like '%.ngeblogging.com' then return outside;end if;
 root:=case when left(p_hostname,4)='www.' then substr(p_hostname,5) else p_hostname end;
 select exists(select 1 from public.domain_connection_installations where hostname in (p_hostname,root)) into managed;
 select * into d from public.site_domains where hostname=p_hostname;
 if not managed and found and coalesce(d.provider,'') not in ('cloudflare','cloudflare-custom-hostnames') then return outside;end if;
 select * into e from public.domain_connection_entitlements where hostname=root;
 if not found then if managed then return denied;else return outside;end if;end if;
 -- Journal evidence prevents a mutable public provider field from bypassing billing.
 select * into j from public.domain_connection_installations where hostname=p_hostname;
 if not found then return denied;end if;
 if j.state is distinct from 'observed' or j.site_id is distinct from e.site_id or j.domain_id is distinct from d.id or j.hostname is distinct from d.hostname or j.provider_hostname_id is null or j.provider_hostname_id is distinct from d.provider_hostname_id or (j.provider_snapshot->>'id') is distinct from j.provider_hostname_id or (j.provider_snapshot->>'hostname') is distinct from p_hostname then return denied;end if;
 if e.hostname is distinct from root or e.review_required is distinct from false or e.expires_at is null or e.expires_at<=clock_timestamp() or e.last_order_id is null or d.site_id is distinct from e.site_id or d.is_primary is distinct from false or coalesce(d.provider,'') not in ('cloudflare','cloudflare-custom-hostnames') or d.status is distinct from 'active'::public.domain_status or d.provider_status is distinct from 'active' or d.ssl_status is distinct from 'active' or d.verified_at is null then return denied;end if;
 select * into r from public.domain_connection_orders where order_id=e.last_order_id;
 if not found then return denied;end if;
 if r.hostname is distinct from root or r.site_id is distinct from e.site_id or r.user_id is distinct from j.user_id or r.environment is distinct from 'production' or r.purpose is distinct from 'custom-domain-connection' or r.payment_state is distinct from 'paid' or r.amount_idr is distinct from 99000 or r.currency is distinct from 'IDR' or r.period_months is distinct from 12 or r.includes_www is distinct from true or r.grant_expires_at is null or r.grant_expires_at<=clock_timestamp() then return denied;end if;
 if not exists(select 1 from public.sites where id=e.site_id and status='active' and is_public=true) then return denied;end if;
 return jsonb_build_object('version','connection-serving-v1','hostname',p_hostname,'applies',true,'allowed',true,'siteId',d.site_id,'domainId',d.id,'providerHostnameId',j.provider_hostname_id,'orderId',r.order_id,'expiresAt',least(e.expires_at,r.grant_expires_at));
end;$$;
revoke all on function public.domain_connection_serving_v1(text) from public,anon,authenticated;
grant execute on function public.domain_connection_serving_v1(text) to service_role;
comment on function public.domain_connection_serving_v1(text) is 'Backend-only read-only paid alias access check. Existing non-SaaS domains without a paid installation journal remain outside scope. Journaled hostnames cannot bypass expiry by changing the public provider or deleting an entitlement. Active registry, original provider identity, latest paid rights, and public published site are required. No positive authorization caching or visitor billing details are exposed by the HTTP guard.';
commit;
