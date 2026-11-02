import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261102071100_domain_registration_terminal_ack_contract.sql');
const original=read('supabase/migrations/20261101060741_domain_production_registration_ledger_v1.sql');
const oldAck=migration.match(/old_ack text := \$old\$([\s\S]*?)\$old\$;/)?.[1];
const newAck=migration.match(/new_ack text := \$new\$([\s\S]*?)\$new\$;/)?.[1];
// Source contract checks only; these do not execute PostgreSQL or prove a live migration.
test('replacement is anchored to exactly one original terminal acknowledgement',()=>{assert.ok(oldAck);assert.equal(original.split(oldAck).length-1,1);assert.ok(migration.includes('RAISE EXCEPTION'));assert.ok(migration.includes('EXECUTE pg_catalog.replace(definition,old_ack,new_ack)'));});
test('terminal acknowledgement supplies production and persisted-evidence fields',()=>{assert.ok(newAck);for(const part of ["'environment','production'","'observation_recorded',true","'observation_reused',true","'registration_action_taken',false","o.registration_state='registered' AND o.payment_state='paid'"])assert.ok(newAck.includes(part));});
test('migration does not insert jobs, change grants, or activate new registrations',()=>{assert.equal(/\b(?:INSERT|UPDATE|DELETE|GRANT|REVOKE)\b/i.test(migration),false);assert.equal(migration.includes('new_registration_allowed'),false);assert.equal(migration.includes('domain_claim_production_registration'),false);});
