import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {resolve,join,dirname,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import net from 'node:net';
const BRANCH='feature/domain-stages5-10-integration-20261030';
export const selected=env=>env.WORKERS_CI==='1'&&env.WORKERS_CI_BRANCH===BRANCH;
export function nativePath(root,value){assert.equal(typeof value,'string');const p=resolve(root,value),native=join(root,'native')+sep;assert.ok(p.startsWith(native),'SYMLINK_OUTSIDE_NATIVE_PACKAGE');return p;}
const git=(args,env)=>execFileSync('git',args,{encoding:'utf8',env,stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024}).trim();
function redactCommandText(value){return String(value).replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]').replace(/(?:sb_secret_|ghp_|github_pat_)[A-Za-z0-9_]+/g,'[REDACTED]').replace(/((?:password|authorization|token|api[_-]?key)\s*[:=]\s*)[^\s,;]+/gi,'$1[REDACTED]');}
export async function command(file,args,{timeoutMs=180000,...options}={}){
  const name=file.split(/[\\/]/).at(-1);assert.ok(Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=180000);
  await new Promise((done,reject)=>{
    let tail='',settled=false;
    const child=spawn(file,args,{...options,stdio:['ignore','pipe','pipe']});
    const failure=(code)=>Error('NATIVE_BUILD_COMMAND_FAILED '+name+' '+code+'\n'+redactCommandText(tail));
    const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):done();};
    const capture=stream=>chunk=>{const text=chunk.toString('utf8');tail=(tail+text).slice(-4096);stream.write(redactCommandText(text));};
    child.stdout.on('data',capture(process.stdout));child.stderr.on('data',capture(process.stderr));
    const timer=setTimeout(()=>{child.kill('SIGTERM');finish(failure('TIMEOUT'));},timeoutMs);
    child.on('error',error=>finish(failure(error.code||error.name)));child.on('close',(code,signal)=>finish(code===0?null:failure(code??signal)));
  });
}
export async function runStage5NativeBuild(){
  if(!selected(process.env)){console.log('[stage5-native] skipped outside the selected Cloudflare preview branch');return;}
  assert.equal(process.platform,'linux','LINUX_BUILDER_REQUIRED');assert.equal(process.arch,'x64','X64_BUILDER_REQUIRED');assert.notEqual(process.getuid?.(),0,'UNPRIVILEGED_BUILDER_REQUIRED_NO_SYSTEM_USERS_CREATED');
  const sha=process.env.WORKERS_CI_COMMIT_SHA;assert.match(sha||'',/^[0-9a-f]{40}$/);assert.equal(git(['rev-parse','HEAD']),sha,'BUILD_COMMIT_MISMATCH');
  const bytes=await readFile('scripts/domain-stage5-native-acceptance.mjs');assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'b347638d60c3824da67dce9f0e443aa873c105af','NATIVE_ASSERTIONS_CHANGED');
  await new Promise((done,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(5432,'127.0.0.1',()=>server.close(done));});
  const work=await mkdtemp('/tmp/ngeblogging-stage5-native-'),deps=join(work,'deps'),data=join(work,'data'),socket=join(work,'socket');let binaries,started=false,nativeResult;
  const clean={PATH:process.env.PATH,HOME:work,TMPDIR:work,LANG:'C.UTF-8',CI:'true'};
  try{
    await mkdir(deps);await mkdir(socket);await writeFile(join(deps,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{pg:'8.13.1','@embedded-postgres/linux-x64':'17.6.0-beta.15'}}));
    await command('npm',['install','--prefix',deps,'--ignore-scripts','--no-package-lock','--no-audit','--no-fund','--registry=https://registry.npmjs.org'],{cwd:deps,env:clean});
    const require=createRequire(join(deps,'package.json')),entry=require.resolve('@embedded-postgres/linux-x64'),binaryRoot=resolve(dirname(entry),'..');
    const links=JSON.parse(await readFile(join(binaryRoot,'native/pg-symlinks.json'),'utf8'));assert.ok(Array.isArray(links));
    for(const link of links){const source=nativePath(binaryRoot,link.source),target=nativePath(binaryRoot,link.target);try{await symlink(relative(dirname(target),source),target);}catch(e){if(e.code!=='EEXIST')throw e;}}
    binaries=await import(pathToFileURL(entry).href);const env={...clean,LD_LIBRARY_PATH:resolve(dirname(binaries.postgres),'../lib')};
    const pw=join(work,'password');await writeFile(pw,'isolated-ci-only\n',{mode:0o600});
    await command(binaries.initdb,['-D',data,'-U','postgres','--auth=scram-sha-256','--pwfile='+pw,'--locale=C','--encoding=UTF8'],{env});
    await command(binaries.pg_ctl,['-D',data,'-l',join(work,'postgres.log'),'-o','-h 127.0.0.1 -p 5432 -k '+socket,'-w','start'],{env});started=true;
    const {Client}=require('pg'),client=new Client({host:'127.0.0.1',port:5432,user:'postgres',password:'isolated-ci-only',database:'postgres',connectionTimeoutMillis:5000});
    await client.connect();try{const version=(await client.query("SELECT current_setting('server_version_num')::int AS n")).rows[0].n;assert.ok(version>=170000&&version<180000);await client.query('CREATE DATABASE domain_transfer_test');}finally{await client.end();}
    const pins=['cbcfe16210356d37a6bb25c732430f86eaa49cc3','323fce910fa37599f97aa3176acff85edfed5190'];
    for(const pin of pins){try{git(['cat-file','-e',pin+'^{commit}'],clean);}catch{await command('git',['fetch','--no-tags','--depth=1','https://github.com/triapriyogibahari7-pixel/ngeblogging.git',pin],{env:clean});}}
    await command(process.execPath,['scripts/domain-stage5-native-acceptance.mjs'],{env:{...env,NODE_PATH:join(deps,'node_modules'),STAGE5_DISPOSABLE_NATIVE:'true',PGHOST:'127.0.0.1',PGPORT:'5432',PGUSER:'postgres',PGDATABASE:'domain_transfer_test',PGPASSWORD:'isolated-ci-only'}});
    nativeResult=JSON.parse(await readFile('output/stage5-native/result.json','utf8'));assert.equal(nativeResult.passed,true);assert.equal(nativeResult.catalog?.passedCount,33);assert.equal(nativeResult.catalog?.failedCount,0);assert.equal(nativeResult.nativeConcurrencyPassed,3);assert.equal(nativeResult.nativeSessionsClosed,true);assert.equal(nativeResult.productionConnection,false);
  }finally{
    if(started)await command(binaries.pg_ctl,['-D',data,'-m','fast','-w','stop'],{env:{...clean,LD_LIBRARY_PATH:resolve(dirname(binaries.postgres),'../lib')}});
    await rm(work,{recursive:true,force:true});
  }
  const artifact={...nativeResult,execution:'Native PostgreSQL 17 in temporary Cloudflare build process',cloudflareBuild:{branch:BRANCH,commit:sha,buildId:process.env.WORKERS_CI_BUILD_UUID||null},nativeServerStopped:true,temporaryFilesRemoved:true};
  await mkdir('public/stage5-native',{recursive:true});await writeFile('public/stage5-native/'+sha+'.json',JSON.stringify(artifact,null,2)+'\n');console.log('[stage5-native] PASS: catalog 33/33 and concurrent-session scenarios 3/3; ephemeral server stopped');
}
if(process.argv.includes('--self-test')){
  assert.equal(selected({}),false);assert.equal(selected({WORKERS_CI:'1',WORKERS_CI_BRANCH:'main'}),false);assert.equal(selected({WORKERS_CI:'0',WORKERS_CI_BRANCH:BRANCH}),false);assert.equal(selected({WORKERS_CI:'1',WORKERS_CI_BRANCH:BRANCH}),true);
  assert.equal(nativePath('/tmp/pkg','native/lib/test'),'/tmp/pkg/native/lib/test');assert.throws(()=>nativePath('/tmp/pkg','../escape'));assert.throws(()=>nativePath('/tmp/pkg','/etc/passwd'));console.log(JSON.stringify({selectionChecks:4,symlinkBoundaryChecks:3,nativeDatabaseExecuted:false}));
}else if(import.meta.url===pathToFileURL(resolve(process.argv[1]||'')).href){runStage5NativeBuild().catch(error=>{console.error('[stage5-native] FAILED:',error.message);process.exitCode=1;});}
