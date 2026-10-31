import assert from 'node:assert/strict';
export async function runCapacitySupplement(Client){
 const base={host:'127.0.0.1',port:5432,user:'postgres',password:'isolated-ci-only',connectionTimeoutMillis:5000};
 const name='stage5_capacity_test',admin=new Client({...base,database:'postgres'});let db,created=false;
 const result={scope:'Capacity helper and modeled profiles constraint only; not Auth, lifecycle triggers, full schema or transfer E2E',tests:[],productionConnection:false};
 try{
  await admin.connect();const v=Number((await admin.query("SELECT current_setting('server_version_num') AS n")).rows[0].n);assert.ok(v>=170000&&v<180000);result.serverVersionNum=v;
  await admin.query('CREATE DATABASE '+name);created=true;db=new Client({...base,database:name});await db.connect();
  await db.query(`CREATE SCHEMA private;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,plan text NOT NULL DEFAULT 'free' CHECK(plan IN ('free','pro','business','supporter')),plan_expires_at timestamptz);
CREATE FUNCTION private.site_limit_for_plan(plan_name text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE WHEN plan_name IN ('business','max') THEN 50 ELSE 12 END; $$;
CREATE FUNCTION private.site_limit_for_owner(target_user uuid,plan_name text DEFAULT 'free') RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT COALESCE((SELECT CASE WHEN p.plan IN ('pro','business') AND p.plan_expires_at > now() THEN private.site_limit_for_plan(p.plan) ELSE 12 END FROM public.profiles p WHERE p.id=target_user),12); $$;
CREATE FUNCTION private.site_collaborator_limit() RETURNS integer LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT 20; $$;`);
  const id='00000000-0000-0000-0000-000000000010';
  const check=async(label,sql,args,expected)=>{assert.equal((await db.query(sql,args)).rows[0].n,expected,label);result.tests.push({name:label,passed:true});};
  for(const [p,n]of [['business',50],['max',50],['pro',12],['free',12],['unknown',12],[null,12]])await check('helper '+String(p),'SELECT private.site_limit_for_plan($1::text) AS n',[p],n);
  await check('collaborators','SELECT private.site_collaborator_limit() AS n',[],20);
  await check('missing profile','SELECT private.site_limit_for_owner($1::uuid) AS n',[id],12);
  for(const [p,active,n]of [['free',true,12],['pro',true,12],['business',true,50],['business',false,12],['supporter',true,12]]){
   await db.query("INSERT INTO public.profiles VALUES($1,$2,now()+CASE WHEN $3 THEN interval '1 day' ELSE interval '-1 day' END) ON CONFLICT(id) DO UPDATE SET plan=EXCLUDED.plan,plan_expires_at=EXCLUDED.plan_expires_at",[id,p,active]);
   await check('owner '+p+' active='+active,'SELECT private.site_limit_for_owner($1::uuid) AS n',[id],n);
  }
  await db.query('UPDATE public.profiles SET plan_expires_at=NULL WHERE id=$1',[id]);await check('null expiry','SELECT private.site_limit_for_owner($1::uuid) AS n',[id],12);
  await db.query("UPDATE public.profiles SET plan='business',plan_expires_at=now()+interval '1 day' WHERE id=$1",[id]);await check('profile controls limit',"SELECT private.site_limit_for_owner($1::uuid,'free') AS n",[id],50);
  let code;try{await db.query("UPDATE public.profiles SET plan='max' WHERE id=$1",[id]);}catch(e){code=e.code;}assert.equal(code,'23514');result.tests.push({name:'modeled profile rejects max',passed:true});
  assert.equal(result.tests.length,16);
  result.lifecycle=await runLifecycleChecks(db,id);assert.equal(result.lifecycle.passed,true);assert.equal(result.lifecycle.passedCount,8);
 }finally{
  try{if(db)await db.end();if(created){await admin.query('DROP DATABASE '+name);result.testDatabaseRemoved=true;}}finally{await admin.end();}
 }
 result.passed=true;result.passedCount=result.tests.length;result.nativeSessionsClosed=true;return result;
}
async function runLifecycleChecks(db,id){
 const result={scope:'Selected audited site/member INSERT triggers on modeled tables with auth.uid claim shim; no real Auth, managed-subdomain trigger or transfer integration',tests:[]};
 await db.query(`CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
CREATE TYPE public.member_role AS ENUM ('owner','admin','editor','author','contributor','viewer');
CREATE TABLE public.sites(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES public.profiles(id));
CREATE TABLE public.site_members(site_id uuid NOT NULL REFERENCES public.sites(id),user_id uuid NOT NULL REFERENCES public.profiles(id),role public.member_role NOT NULL DEFAULT 'viewer',PRIMARY KEY(site_id,user_id));
CREATE TABLE public.site_invitations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),site_id uuid NOT NULL REFERENCES public.sites(id),accepted_at timestamptz,expires_at timestamptz NOT NULL);
CREATE FUNCTION private.enforce_owned_site_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE request_user uuid:=auth.uid();account_plan text:='free';current_count integer:=0;allowed_count integer:=1000;
BEGIN
 IF request_user IS NOT NULL AND new.owner_id<>request_user THEN RAISE EXCEPTION USING errcode='42501',message='Pemilik situs tidak cocok dengan akun aktif.';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text,0));
 SELECT coalesce(profile.plan,'free') INTO account_plan FROM public.profiles profile WHERE profile.id=new.owner_id;
 allowed_count:=private.site_limit_for_owner(new.owner_id,account_plan);
 SELECT count(*)::integer INTO current_count FROM public.sites site WHERE site.owner_id=new.owner_id;
 IF current_count>=allowed_count THEN RAISE EXCEPTION USING errcode='P0001',message='SITE_CAPACITY_REACHED: Kapasitas situs akun saat ini telah terpakai dan perlu diperluas.';END IF;RETURN new;
END;$$;
CREATE FUNCTION public.enforce_owner_site_limit_v169() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owned_sites bigint;allowed_sites integer;BEGIN PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text,0));allowed_sites:=private.site_limit_for_owner(new.owner_id);SELECT count(*) INTO owned_sites FROM public.sites WHERE owner_id=new.owner_id;IF owned_sites>=allowed_sites THEN RAISE EXCEPTION USING errcode='P0001',message='SITE_CAPACITY_REACHED: Batas situs akun tercapai ('||allowed_sites||').';END IF;RETURN new;END;$$;
CREATE FUNCTION private.enforce_site_collaborator_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE active_count integer;pending_count integer;allowed_count integer:=private.site_collaborator_limit();BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.site_id::text,37));
 SELECT count(*)::integer INTO active_count FROM public.site_members sm WHERE sm.site_id=new.site_id;
 SELECT count(*)::integer INTO pending_count FROM public.site_invitations si WHERE si.site_id=new.site_id AND si.accepted_at IS NULL AND si.expires_at>pg_catalog.now();
 IF tg_table_name='site_members' THEN IF active_count>=allowed_count THEN RAISE EXCEPTION USING errcode='P0001',message=format('SITE_MEMBER_LIMIT_REACHED: maksimum %s anggota tim per situs.',allowed_count);END IF;
 ELSE IF active_count+pending_count>=allowed_count THEN RAISE EXCEPTION USING errcode='P0001',message=format('SITE_MEMBER_LIMIT_REACHED: maksimum %s anggota dan undangan aktif per situs.',allowed_count);END IF;END IF;RETURN new;END;$$;
CREATE FUNCTION private.enforce_site_collaborator_limit_v176() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_total integer;BEGIN PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.site_id::text,176));SELECT (SELECT count(*) FROM public.site_members sm WHERE sm.site_id=new.site_id)+(SELECT count(*) FROM public.site_invitations si WHERE si.site_id=new.site_id AND si.accepted_at IS NULL AND si.expires_at>pg_catalog.now()) INTO current_total;IF current_total>=private.site_collaborator_limit() THEN RAISE EXCEPTION 'Batas anggota situs adalah % orang.',private.site_collaborator_limit() USING errcode='P0001';END IF;RETURN new;END;$$;
CREATE FUNCTION private.add_owner_membership() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN INSERT INTO public.site_members(site_id,user_id,role) VALUES(new.id,new.owner_id,'owner');RETURN new;END;$$;
CREATE TRIGGER enforce_owned_site_limit BEFORE INSERT ON public.sites FOR EACH ROW EXECUTE FUNCTION private.enforce_owned_site_limit();
CREATE TRIGGER enforce_owner_site_limit_v169 BEFORE INSERT ON public.sites FOR EACH ROW EXECUTE FUNCTION public.enforce_owner_site_limit_v169();
CREATE TRIGGER on_site_created AFTER INSERT ON public.sites FOR EACH ROW EXECUTE FUNCTION private.add_owner_membership();
CREATE TRIGGER enforce_site_member_limit BEFORE INSERT ON public.site_members FOR EACH ROW EXECUTE FUNCTION private.enforce_site_collaborator_limit();
CREATE TRIGGER enforce_site_member_limit_v176 BEFORE INSERT ON public.site_members FOR EACH ROW EXECUTE FUNCTION private.enforce_site_collaborator_limit_v176();`);
 const site=async()=> (await db.query('INSERT INTO public.sites(owner_id) VALUES($1) RETURNING id',[id])).rows[0].id;
 const member=async s=>{const u=(await db.query('INSERT INTO public.profiles(id) VALUES(gen_random_uuid()) RETURNING id')).rows[0].id;await db.query("INSERT INTO public.site_members VALUES($1,$2,'viewer')",[s,u]);};
 const rejects=async(fn,expected)=>{await db.query('SAVEPOINT rejection');let code;try{await fn();}catch(e){code=e.code;}await db.query('ROLLBACK TO SAVEPOINT rejection');await db.query('RELEASE SAVEPOINT rejection');assert.equal(code,expected);};
 const test=async(name,fn)=>{await db.query('BEGIN');try{await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[id]);await db.query("UPDATE public.profiles SET plan='free',plan_expires_at=NULL WHERE id=$1",[id]);await fn();result.tests.push({name,passed:true});}finally{await db.query('ROLLBACK');}};
 await test('site creation adds exactly one owner membership',async()=>{const s=await site();const rows=(await db.query('SELECT user_id,role FROM public.site_members WHERE site_id=$1',[s])).rows;assert.equal(rows.length,1);assert.equal(rows[0].user_id,id);assert.equal(rows[0].role,'owner');});
 for(const [plan,active,limit]of [['free',false,12],['business',true,50],['business',false,12]])await test(plan+' active='+active+' INSERT capacity boundary',async()=>{await db.query("UPDATE public.profiles SET plan=$2,plan_expires_at=now()+CASE WHEN $3 THEN interval '1 day' ELSE interval '-1 day' END WHERE id=$1",[id,plan,active]);for(let i=0;i<limit;i++)await site();await rejects(site,'P0001');assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.sites')).rows[0].n),limit);assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.site_members')).rows[0].n),limit);});
 await test('site owner must match fixture actor',async()=>{const other=(await db.query('INSERT INTO public.profiles(id) VALUES(gen_random_uuid()) RETURNING id')).rows[0].id;await rejects(()=>db.query('INSERT INTO public.sites(owner_id) VALUES($1)',[other]),'42501');});
 await test('owner counts toward 20-member capacity',async()=>{const s=await site();for(let i=0;i<19;i++)await member(s);await rejects(()=>member(s),'P0001');assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.site_members WHERE site_id=$1',[s])).rows[0].n),20);});
 await test('active pending invitations consume member capacity',async()=>{const s=await site();await db.query("INSERT INTO public.site_invitations(site_id,expires_at) SELECT $1,now()+interval '1 day' FROM generate_series(1,19)",[s]);await rejects(()=>member(s),'P0001');});
 await test('expired invitations do not consume member capacity',async()=>{const s=await site();await db.query("INSERT INTO public.site_invitations(site_id,expires_at) SELECT $1,now()-interval '1 day' FROM generate_series(1,20)",[s]);await member(s);assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.site_members WHERE site_id=$1',[s])).rows[0].n),2);});
 assert.equal(result.tests.length,8);result.passed=true;result.passedCount=8;return result;
}
