import {readFileSync,realpathSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {createRequire} from 'node:module';
if(process.env.DOMAIN_TRANSFER_DISPOSABLE!=='true'||process.env.PGHOST!=='127.0.0.1'||process.env.PGDATABASE!=='domain_transfer_test')throw Error('DISPOSABLE_DATABASE_REQUIRED');
const {Client}=createRequire(import.meta.url)('pg');
const root=realpathSync(process.cwd());
function expand(text,base){return text.replace(/^\\set ON_ERROR_STOP on\r?$/gm,'').replace(/^\\ir[ \t]+([^\r\n]+)\r?$/gm,(_,file)=>{const path=realpathSync(resolve(base,file.trim()));if(!path.startsWith(root+sep)||!path.endsWith('.sql'))throw Error('TEST_INCLUDE_OUTSIDE_REPOSITORY');return expand(readFileSync(path,'utf8'),dirname(path));});}
const fixture=resolve(root,'tests/sql/domain-transfer-v2-smoke.sql');
const marker='\\ir ../../docs/drafts/domain-site-transfer-v2.sql';
let text=readFileSync(fixture,'utf8');if(text.split(marker).length!==2)throw Error('TRANSFER_FIXTURE_CHANGED');
text=text.replace(marker,marker+'\n\\ir ../../supabase/migrations/20261105080000_domain_move_row_locks_v3.sql');
const sql=expand(text,dirname(fixture));
if(/^\\[a-z]/m.test(sql))throw Error('UNSUPPORTED_TEST_META_COMMAND');
const options={host:'127.0.0.1',port:5432,database:'domain_transfer_test',user:'postgres',password:process.env.PGPASSWORD};
const db=new Client(options),a=new Client(options),b=new Client(options);
await db.connect();
try{
 const checked=await db.query('select current_database() as name');if(checked.rows[0].name!=='domain_transfer_test')throw Error('DISPOSABLE_DATABASE_REQUIRED');
 await db.query(sql);
 const definition=await db.query("select pg_get_functiondef('public.move_site_domain_v2(uuid,uuid,uuid,text)'::regprocedure) as definition");
 if(definition.rows[0].definition.includes('IN SHARE ROW EXCLUSIVE MODE')||!definition.rows[0].definition.includes('FOR UPDATE NOWAIT'))throw Error('ROW_LOCK_PATCH_NOT_INSTALLED');
 await db.query("insert into public.sites(id,owner_id,slug,status) values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010','unrelated','active')");
 await a.connect();await b.connect();
 await a.query('BEGIN');await a.query('SET LOCAL ROLE authenticated');
 await a.query("select set_config('request.jwt.claim.sub',$1,true)",['00000000-0000-0000-0000-000000000010']);
 const args=['00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','example.test'];
 await a.query('select public.move_site_domain_v2($1,$2,$3,$4)',args);
 await b.query("set statement_timeout='1000ms'");
 const unrelated=await b.query("update public.sites set updated_at=clock_timestamp() where id='00000000-0000-0000-0000-000000000003'");
 if(unrelated.rowCount!==1)throw Error('UNRELATED_WRITE_NOT_CONFIRMED');
 await b.query('BEGIN');await b.query('SET LOCAL ROLE authenticated');
 await b.query("select set_config('request.jwt.claim.sub',$1,true)",['00000000-0000-0000-0000-000000000010']);
 let rejected=false;
 try{await b.query('select public.move_site_domain_v2($1,$2,$3,$4)',args);}catch(error){if(error.code!=='55P03')throw error;rejected=true;}finally{await b.query('ROLLBACK');}
 if(!rejected)throw Error('CONCURRENT_MOVE_NOT_REJECTED');
 await a.query('ROLLBACK');
 console.log(JSON.stringify({representativeSmokePassed:true,unrelatedWritesConfirmed:unrelated.rowCount,concurrentMoveRejected:rejected,productionAccess:false}));
}finally{
 await Promise.allSettled([a.query('ROLLBACK'),b.query('ROLLBACK')]);
 await Promise.allSettled([a.end(),b.end(),db.end()]);
}
