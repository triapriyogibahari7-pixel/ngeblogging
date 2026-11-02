DO $migration$
DECLARE
 definition text;
 old_ack text := $old$IF j.state='succeeded' THEN RETURN jsonb_build_object('ok',true,'order_id',p_order_id,'state',j.state,'registration_confirmed',o.registration_state='registered','registration_action_taken',false); END IF;$old$;
 new_ack text := $new$IF j.state='succeeded' THEN RETURN jsonb_build_object('ok',true,'order_id',p_order_id,'environment','production','state',j.state,'observation_recorded',true,'observation_reused',true,'registration_confirmed',o.registration_state='registered' AND o.payment_state='paid','registration_action_taken',false); END IF;$new$;
BEGIN
 PERFORM pg_catalog.set_config('lock_timeout','2s',true);
 definition := pg_catalog.pg_get_functiondef('public.domain_observe_production_registration(text,uuid,text,text,timestamptz,timestamptz,text)'::regprocedure);
 IF (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,old_ack,'')))/pg_catalog.length(old_ack) <> 1 THEN
  RAISE EXCEPTION 'Registration terminal acknowledgement anchor differs; stop for review';
 END IF;
 -- Only the acknowledgement of an existing succeeded ledger entry is replaced.
 -- observation_recorded refers to the existing terminal evidence; it is reused.
 -- No new observation, registration attempt, payment or site binding is created.
 EXECUTE pg_catalog.replace(definition,old_ack,new_ack);
END;
$migration$;
