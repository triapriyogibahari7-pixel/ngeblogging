import assert from 'node:assert/strict';
export async function runManagedTransferChecks(Client){
 const db=new Client({host:'127.0.0.1',port:5432,user:'postgres',password:'isolated-ci-only',database:'domain_transfer_test',connectionTimeoutMillis:5000});
 const report={scope:'Audited managed-subdomain trigger plus existing transfer RPC in catalog-slice native database; fixture auth, not full schema, Auth/PostgREST or provider routing',tests:[],productionConnection:false};
 await db.connect();
 try{
  assert.equal((await db.query('SELECT current_database() AS n')).rows[0].n,'domain_transfer_test');
  const version=Number((await db.query("SELECT current_setting('server_version_num') AS n")).rows[0].n);assert.ok(version>=170000&&version<180000);
  await db.query('BEGIN');
  await db.query(`ALTER TABLE public.site_domains ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.site_domains ADD COLUMN provider_status text NOT NULL DEFAULT 'pending',ADD COLUMN ssl_status text NOT NULL DEFAULT 'pending',ADD COLUMN last_checked_at timestamptz,ADD COLUMN error_message text;
CREATE FUNCTION private.add_owner_membership() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN INSERT INTO public.site_members(site_id,user_id,role) VALUES(new.id,new.owner_id,'owner');RETURN new;END;$$;
CREATE TRIGGER on_site_created AFTER INSERT ON public.sites FOR EACH ROW EXECUTE FUNCTION private.add_owner_membership();
CREATE FUNCTION private.sync_managed_subdomain() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF tg_op='INSERT' THEN
 INSERT INTO public.site_domains(site_id,hostname,status,is_primary,verified_at,provider,provider_status,ssl_status,last_checked_at,error_message)
 VALUES(new.id,new.slug||'.ngeblogging.com','active',true,now(),'cloudflare','active','active',now(),null)
 ON CONFLICT(hostname) DO UPDATE SET site_id=excluded.site_id,status='active',is_primary=true,verified_at=now(),provider='cloudflare',provider_status='active',ssl_status='active',last_checked_at=now(),error_message=null;
 ELSIF new.slug IS DISTINCT FROM old.slug THEN
 UPDATE public.site_domains SET hostname=new.slug||'.ngeblogging.com',status='active',verified_at=now(),provider='cloudflare',provider_status='active',ssl_status='active',last_checked_at=now(),error_message=null WHERE site_id=new.id AND hostname=old.slug||'.ngeblogging.com';
 IF NOT FOUND THEN
 INSERT INTO public.site_domains(site_id,hostname,status,is_primary,verified_at,provider,provider_status,ssl_status,last_checked_at,error_message)
 VALUES(new.id,new.slug||'.ngeblogging.com','active',NOT EXISTS(SELECT 1 FROM public.site_domains d WHERE d.site_id=new.id AND d.is_primary),now(),'cloudflare','active','active',now(),null);
 END IF;END IF;RETURN new;
END;$$;
CREATE TRIGGER on_site_sync_managed_subdomain AFTER INSERT OR UPDATE OF slug ON public.sites FOR EACH ROW EXECUTE FUNCTION private.sync_managed_subdomain();`);
  const actor='00000000-0000-0000-0000-000000000010';
  const test=async(name,fn)=>{await db.query('SAVEPOINT managed_case');try{await fn();report.tests.push({name,passed:true});}finally{await db.query('ROLLBACK TO SAVEPOINT managed_case');await db.query('RELEASE SAVEPOINT managed_case');}};
  const fixture=async(status='active',privateTarget=false)=>{
   const ids=(await db.query('SELECT gen_random_uuid() AS a,gen_random_uuid() AS b,gen_random_uuid() AS d')).rows[0];
   const suffix=ids.a.replaceAll('-',''),source='source-'+suffix,target='target-'+suffix,hostname='domain-'+suffix+'.test';
   await db.query("INSERT INTO public.sites(id,owner_id,slug,status,is_public) VALUES($1,$3,$4,'active',true),($2,$3,$5,'active',$6)",[ids.a,ids.b,actor,source,target,!privateTarget]);
   const before=(await db.query('SELECT * FROM public.site_domains WHERE site_id=ANY($1::uuid[]) ORDER BY site_id',[[ids.a,ids.b]])).rows;assert.equal(before.length,2);
   if(status==='active')await db.query('UPDATE public.site_domains SET is_primary=false WHERE site_id=$1',[ids.a]);
   await db.query("INSERT INTO public.site_domains(id,site_id,hostname,status,provider,is_primary,ownership_verification) VALUES($1,$2,$3,$4,'cloudflare-full-zone',$5,$6::jsonb)",[ids.d,ids.a,hostname,status,status==='active',JSON.stringify({additional_hostnames:[{hostname:'www.'+hostname}]})]);
   await db.query('INSERT INTO public.site_domain_redirects(id,site_id,domain_id,source_hostname,target_url) VALUES(gen_random_uuid(),$1,$2,$3,$4)',[ids.a,ids.d,'go.'+hostname,'https://'+hostname+'/']);
   return {...ids,source,target,hostname,before,status};
  };
  const move=async f=>{await db.query('SET LOCAL ROLE authenticated');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor]);const receipt=(await db.query('SELECT public.move_site_domain_v2($1,$2,$3,$4) AS r',[f.d,f.a,f.b,f.hostname])).rows[0].r;assert.equal(receipt.status,'moved');assert.equal(receipt.providerCacheVerified,false);await db.query('SET CONSTRAINTS ALL IMMEDIATE');return receipt;};
  const state=async f=>(await db.query('SELECT jsonb_build_object(\'sites\',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM public.sites s WHERE id=ANY($1::uuid[])),\'domains\',(SELECT jsonb_agg(to_jsonb(d) ORDER BY id) FROM public.site_domains d WHERE site_id=ANY($1::uuid[])),\'redirects\',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.site_domain_redirects r WHERE domain_id=$2)) AS v',[[f.a,f.b],f.d])).rows[0].v;
  await test('site creation supplies managed domains and owner memberships',async()=>{const f=await fixture('pending');for(const d of f.before){assert.equal(d.provider,'cloudflare');assert.equal(d.status,'active');assert.equal(d.is_primary,true);}assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.site_members WHERE site_id=ANY($1::uuid[]) AND user_id=$2 AND role=\'owner\'',[[f.a,f.b],actor])).rows[0].n),2);});
  await test('slug rename preserves managed-domain identity and mapping',async()=>{const f=await fixture('pending'),old=f.before.find(d=>d.site_id===f.a);await db.query('UPDATE public.sites SET slug=$2 WHERE id=$1',[f.a,f.source+'-renamed']);const row=(await db.query('SELECT * FROM public.site_domains WHERE id=$1',[old.id])).rows[0];assert.equal(row.hostname,f.source+'-renamed.ngeblogging.com');assert.equal((await db.query('SELECT custom_domain FROM public.sites WHERE id=$1',[f.a])).rows[0].custom_domain,row.hostname);});
  for(const status of ['active','pending','verifying'])await test(status+' transfer retains auto-created managed domains',async()=>{const f=await fixture(status);await move(f);const s=await state(f);assert.equal(s.domains.find(d=>d.id===f.d).site_id,f.b);for(const old of f.before)assert.ok(s.domains.some(d=>d.id===old.id&&d.site_id===old.site_id&&d.hostname===old.hostname));assert.equal(s.sites.find(x=>x.id===f.a).custom_domain,f.source+'.ngeblogging.com');assert.equal(s.sites.find(x=>x.id===f.b).custom_domain,status==='active'?f.hostname:f.target+'.ngeblogging.com');assert.equal(s.redirects[0].site_id,f.b);});
  await test('forced redirect failure restores auto-created domain mappings',async()=>{const f=await fixture(),before=await state(f);await db.query('SAVEPOINT mutation');let message;try{await db.query("SELECT set_config('smoke.fail_redirect','on',true)");await move(f);}catch(e){message=e.message;}await db.query('ROLLBACK TO SAVEPOINT mutation');await db.query('RELEASE SAVEPOINT mutation');assert.ok(message?.includes('SMOKE_FORCED_FAILURE'));assert.deepEqual(await state(f),before);});
  await test('private target remains hidden to anonymous reads after transfer',async()=>{const f=await fixture('active',true);await move(f);await db.query('SET LOCAL ROLE anon');await db.query("SELECT set_config('request.jwt.claim.sub','',true)");assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.site_domains WHERE hostname=$1',[f.hostname])).rows[0].n),0);});
  assert.equal(report.tests.length,7);report.passed=true;report.passedCount=7;
 }finally{try{await db.query('ROLLBACK');report.schemaChangesRolledBack=true;}finally{await db.end();report.nativeSessionsClosed=true;}}
 return report;
}
