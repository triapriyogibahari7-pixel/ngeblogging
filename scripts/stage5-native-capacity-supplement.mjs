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
 }finally{
  try{if(db)await db.end();if(created){await admin.query('DROP DATABASE '+name);result.testDatabaseRemoved=true;}}finally{await admin.end();}
 }
 result.passed=true;result.passedCount=result.tests.length;result.nativeSessionsClosed=true;return result;
}
