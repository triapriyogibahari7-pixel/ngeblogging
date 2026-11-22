import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const sql=await readFile(new URL('../supabase/migrations/20261122020000_preserve_unrelated_site_domain_mapping.sql',import.meta.url),'utf8');
test('canonical fallback only replaces the hostname previously mapped by this row',()=>{
 const fallback=sql.slice(sql.indexOf('if previous_hostname is not null then'));
 assert.match(fallback,/where id = target_site_id\s+and custom_domain = previous_hostname/);
 assert.doesNotMatch(fallback,/custom_domain is null|or not exists/i);
 assert.match(fallback,/custom_domain is distinct from next_hostname/);
});
test('explicit active primary selection remains separate from additional-domain fallback',()=>{
 assert.match(sql,/new\.status = 'active'::domain_status and new\.is_primary is true/);
 assert.match(sql,/set custom_domain = new\.hostname/);
 assert.match(sql,/d\.status = 'active'::domain_status/);
 assert.match(sql,/d\.is_primary is true/);
});
test('migration only replaces the existing trigger function and performs no backfill or scheduling',()=>{
 assert.match(sql,/security definer\s+set search_path = public, private, pg_temp/);
 assert.match(sql,/if tg_op = 'DELETE' then return old; end if;/);
 assert.doesNotMatch(sql,/drop trigger|create trigger|delete from|insert into|cron\.|http_post/i);
});
