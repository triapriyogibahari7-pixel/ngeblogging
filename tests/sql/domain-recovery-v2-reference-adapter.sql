-- Disposable fixture adapter, NOT an exact production validator snapshot.
-- Delegate pricing to the repository's unmodified budget validator. This suite
-- proves recovery transactions on a schema slice, not full production parity.
CREATE FUNCTION public.domain_reference_quote_valid_v1(p_environment text,p_provider text,p_years integer,p_sale bigint,p_registrar bigint,p_other bigint,p_payment bigint,p_version text,p_cost jsonb,p_checked timestamptz,p_expires timestamptz,p_usd numeric,p_rate numeric,p_source text,p_observed timestamptz,p_fx_expires timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT public.domain_reference_budget_quote_valid_v1(jsonb_build_object('environment',p_environment,'provider_id',p_provider,'operation','registration','years',p_years,'currency','IDR','display_currency','USD','pricing_version',p_version,'sale_price_idr',p_sale,'registrar_cost_idr',p_registrar,'other_direct_costs_idr',p_other,'payment_cost_idr',p_payment,'sale_price_usd',p_usd,'fx_rate_usd_idr',p_rate,'fx_source',p_source,'checked_at',p_checked,'expires_at',p_expires,'fx_observed_at',p_observed,'fx_expires_at',p_fx_expires,'cost_basis',p_cost))
$f$;
