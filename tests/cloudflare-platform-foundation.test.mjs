import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {httpsUrl,profileInput,publisherId,adsTxt} from '../cloudflare/platform/validation.mjs';
import {getProfile,saveProfile,listContents,saveAdsense} from '../cloudflare/platform/repository.mjs';

// Test-only D1 adapter. Python SQLite supplies real FK/trigger/transaction
// semantics without adding a native runtime dependency to the production app.
const py=String.raw`
import sys,json,sqlite3
args=json.load(sys.stdin)
con=sqlite3.connect(sys.argv[1])
con.row_factory=sqlite3.Row
con.execute("PRAGMA foreign_keys=ON")
try:
  if "script" in args: con.executescript(args["script"])
  out=[]
  with con:
    for stmt in args.get("statements",[]):
      cur=con.execute(stmt["sql"],stmt.get("params",[]))
      out.append({"results":[dict(r) for r in cur.fetchall()] if cur.description else []})
  print(json.dumps(out))
except Exception as exc:
  print(json.dumps({"error":str(exc)}))
  sys.exit(1)
finally:
  con.close()
`;
const schema=readFileSync(new URL('../cloudflare/platform/migrations/0001_platform.sql',import.meta.url),'utf8');
function database(t) {
  const dir=mkdtempSync(join(tmpdir(),'ngb-d1-test-')),path=join(dir,'db.sqlite');
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const call=input=>{
    const r=spawnSync('python3',['-c',py,path],{input:JSON.stringify(input),encoding:'utf8',maxBuffer:16*1024*1024});
    if (r.error) throw r.error;
    const output=JSON.parse(r.stdout||'{}');
    if (r.status!==0) throw new Error(output.error||r.stderr);
    return output;
  };
  call({script:schema});
  return {
    script(sql){call({script:sql});},
    prepare(sql) {
      const s={sql,params:[],bind(...params){this.params=params;return this;},
        async first(){return call({statements:[s]})[0].results[0]??null;},
        async all(){return call({statements:[s]})[0];},
        async run(){return call({statements:[s]})[0];}};
      return s;
    },
    async batch(statements){return call({statements});}
  };
}
function fixture(t) {
  const db=database(t);
  db.script(`
    INSERT INTO users(id,email,status,email_verified_at) VALUES
      ('owner-a','a@example.invalid','active','2026-10-17'),
      ('owner-b','b@example.invalid','active','2026-10-17'),
      ('reader','r@example.invalid','active','2026-10-17'),
      ('pending','pending@example.invalid','pending',NULL);
    INSERT INTO accounts(id,owner_user_id) VALUES ('acct-a','owner-a'),('acct-b','owner-b');
    INSERT INTO sites(id,account_id,slug,name) VALUES ('site-a','acct-a','site-a','A'),('site-b','acct-b','site-b','B');
    INSERT INTO site_memberships(site_id,user_id,role) VALUES ('site-a','reader','reader');
    INSERT INTO contents(id,account_id,site_id,author_user_id,kind,slug,title)
      VALUES ('post-a','acct-a','site-a','owner-a','article','post-a','A');
  `);
  return db;
}

test('Cloudflare foundation: migration repeatable with expected tables and no users',async t=>{
  const db=database(t);db.script(schema);
  const row=await db.prepare('SELECT count(*) n FROM users').first();assert.equal(row.n,0);
  assert.equal((await db.prepare('SELECT count(*) n FROM schema_migrations').first()).n,1);
  const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(r=>r.name);
  assert.equal(names.length,18);
});
test('Cloudflare foundation: 12 sites permitted; site 13 rejected atomically',async t=>{
  const db=fixture(t);
  for(let n=2;n<=12;n++)await db.prepare('INSERT INTO sites(id,account_id,slug,name) VALUES (?,?,?,?)').bind(`s${n}`,'acct-a',`site-${n}`,`Site ${n}`).run();
  await assert.rejects(()=>db.prepare("INSERT INTO sites(id,account_id,slug,name) VALUES ('s13','acct-a','site-13','13')").run(),/SITE_QUOTA_EXCEEDED/);
  assert.equal((await db.prepare("SELECT count(*) n FROM sites WHERE account_id='acct-a'").first()).n,12);
  await db.prepare("INSERT INTO sites(id,account_id,slug,name) VALUES ('b2','acct-b','site-b2','B2')").run();
});
test('Cloudflare foundation: 5000 articles across account; archives and page conversions cannot bypass',async t=>{
  const db=fixture(t);
  db.script(`WITH RECURSIVE seq(x) AS (SELECT 2 UNION ALL SELECT x+1 FROM seq WHERE x<5000)
    INSERT INTO contents(id,account_id,site_id,author_user_id,kind,slug,title,status)
    SELECT 'p'||x,'acct-a','site-a','owner-a','article','p'||x,'Article '||x,'archived' FROM seq;`);
  await assert.rejects(()=>db.prepare(`INSERT INTO contents(id,account_id,site_id,author_user_id,kind,slug,title)
    VALUES ('overflow','acct-a','site-a','owner-a','article','overflow','Overflow')`).run(),/ARTICLE_QUOTA_EXCEEDED/);
  await db.prepare(`INSERT INTO contents(id,account_id,site_id,author_user_id,kind,slug,title)
    VALUES ('page','acct-a','site-a','owner-a','page','page','Page')`).run();
  await assert.rejects(()=>db.prepare("UPDATE contents SET kind='article' WHERE id='page'").run(),/ARTICLE_QUOTA_EXCEEDED/);
  assert.equal((await db.prepare("SELECT count(*) n FROM contents WHERE account_id='acct-a' AND kind='article'").first()).n,5000);
});
test('Cloudflare foundation: cannot mismatch site/account FK or transfer tenant by update',async t=>{
  const db=fixture(t);
  await assert.rejects(()=>db.prepare(`INSERT INTO contents(id,account_id,site_id,author_user_id,kind,slug,title)
    VALUES ('wrong','acct-b','site-a','owner-b','article','wrong','Wrong')`).run(),/FOREIGN KEY/);
  await assert.rejects(()=>db.prepare("UPDATE sites SET account_id='acct-b' WHERE id='site-a'").run(),/TRANSFER_REQUIRES_MIGRATION/);
  await assert.rejects(()=>db.prepare("UPDATE contents SET site_id='site-b',account_id='acct-b' WHERE id='post-a'").run(),/TRANSFER_REQUIRES_MIGRATION/);
});
test('Cloudflare foundation: own content and reader membership work; cross-tenant denied',async t=>{
  const db=fixture(t);
  assert.equal((await listContents(db,{userId:'owner-a'},'site-a')).length,1);
  assert.equal((await listContents(db,{userId:'reader'},'site-a')).length,1);
  await assert.rejects(()=>listContents(db,{userId:'owner-b'},'site-a'),/NOT_FOUND/);
  await assert.rejects(()=>listContents(db,{userId:'pending'},'site-a'),/AUTH_REQUIRED/);
  await assert.rejects(()=>listContents(db,null,'site-a'),/AUTH_REQUIRED/);
  await assert.rejects(()=>listContents(db,{userId:'owner-a'},'site-a',{limit:100000}),/INVALID_PAGINATION/);
});
test('Cloudflare foundation: private profile roundtrip, social replacement and SQL-like text',async t=>{
  const db=fixture(t),actor={userId:'owner-a'};
  await saveProfile(db,actor,{displayName:"O'Brien; DROP TABLE users;--",bio:'Baris satu\nBaris dua',socialLinks:{github:'https://github.com/example'}});
  let result=await getProfile(db,actor);
  assert.equal(result.profile.display_name,"O'Brien; DROP TABLE users;--");
  assert.equal(result.profile.is_public,0);
  assert.equal(result.socialLinks.github,'https://github.com/example');
  await saveProfile(db,actor,{displayName:'Nama',socialLinks:{youtube:'https://www.youtube.com/@example'}});
  result=await getProfile(db,actor);assert.equal(result.socialLinks.github,undefined);
  assert.equal((await getProfile(db,{userId:'owner-b'})).profile,null);
  assert.equal((await db.prepare('SELECT count(*) n FROM users').first()).n,4);
  await assert.rejects(()=>saveProfile(db,actor,{userId:'owner-b',displayName:'spoof'}),/UNKNOWN_PROFILE_FIELD/);
});
test('Cloudflare foundation: unsafe links and invalid profile fields rejected',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,x','http://example.com','https://user:secret@example.com'])
    assert.throws(()=>httpsUrl(url));
  assert.throws(()=>profileInput({socialLinks:{unknown:'https://example.com'}}),/INVALID_SOCIAL_PROVIDER/);
  assert.throws(()=>profileInput({timezone:'Invalid/Zone'}),/INVALID_TIMEZONE/);
  assert.throws(()=>profileInput({displayName:'a'.repeat(121)}),/INVALID_PROFILE_FIELD/);
  assert.throws(()=>profileInput({isPublic:'true'}),/INVALID_VISIBILITY/);
});
test('Cloudflare foundation: AdSense IDs validated, never auto-approved, reader cannot change',async t=>{
  const db=fixture(t),id='ca-pub-1234567890123456';
  assert.equal(publisherId(id),id);
  assert.equal(adsTxt(id),'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
  assert.throws(()=>publisherId(`${id}\n<script>`),/INVALID_ADSENSE_ID/);
  await assert.rejects(()=>saveAdsense(db,{userId:'reader'},'site-a',{publisherId:id}),/NOT_FOUND/);
  assert.deepEqual(await saveAdsense(db,{userId:'owner-a'},'site-a',{publisherId:id}),
    {publisherId:id,autoAds:false,reviewStatus:'not_submitted'});
});
test('Cloudflare foundation: duplicate payment order idempotency key rejected',async t=>{
  const db=fixture(t),sql=`INSERT INTO payment_orders(id,account_id,environment,sku,amount_idr,idempotency_key)
    VALUES (?,'acct-a','sandbox','test-only',10000,'same-key')`;
  await db.prepare(sql).bind('o1').run();
  await assert.rejects(()=>db.prepare(sql).bind('o2').run(),/UNIQUE/);
  assert.equal((await db.prepare("SELECT tier FROM accounts WHERE id='acct-a'").first()).tier,'free');
});
test('Cloudflare foundation: batch failure rolls back earlier mutation',async t=>{
  const db=fixture(t);
  await assert.rejects(()=>db.batch([
    db.prepare("INSERT INTO profiles(user_id,display_name) VALUES ('owner-a','Do not persist')"),
    db.prepare("INSERT INTO profiles(user_id,display_name) VALUES ('does-not-exist','Bad')"),
  ]),/FOREIGN KEY/);
  assert.equal((await db.prepare("SELECT count(*) n FROM profiles").first()).n,0);
});
