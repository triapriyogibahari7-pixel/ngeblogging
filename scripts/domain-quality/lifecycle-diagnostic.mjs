import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const scrub=value=>String(value).replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]').replace(/(?:sb_secret_|sb_publishable_|ghp_|github_pat_)[A-Za-z0-9_-]+/g,'[REDACTED]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED_JWT]').slice(0,800);
export async function runLifecycleDiagnostic(){
 const env=process.env;
 if(env.WORKERS_CI!=='1'||env.WORKERS_CI_BRANCH!=='fix/domain-publication-lifecycle-20261103')return;
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!/^[a-f0-9]{40}$/.test(commit)||commit!==env.WORKERS_CI_COMMIT_SHA)throw Error('DOMAIN_DIAGNOSTIC_SHA_MISMATCH');
 const work=mkdtempSync(join(tmpdir(),'domain-lifecycle-'));
 const clean={PATH:env.PATH||'',HOME:work,TMPDIR:work,CI:'true',NODE_ENV:'test',LANG:'C.UTF-8',WRANGLER_SEND_METRICS:'false'};
 const results=[];
 try{
  for(const group of ['search','quotes','checkout','payments','registration','dns','transfer','isolation']){
   const r=spawnSync(process.execPath,['scripts/domain-quality/'+group+'.mjs'],{env:clean,encoding:'utf8',timeout:620000,maxBuffer:16777216});
   const counts={};
   for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const matches=[...(r.stdout||'').matchAll(new RegExp('^# '+key+' (\\d+)\\s*$','gm'))];counts[key]=matches.length?Number(matches.at(-1)[1]):null;}
   const failedTests=(r.stdout||'').split(/\r?\n/).filter(line=>/^\s*not ok \d+ - /.test(line)).map(scrub).slice(0,50);
   const locations=(r.stdout||'').split(/\r?\n/).filter(line=>/^\s*location: /.test(line)&&/tests\/[a-z0-9-]+\.test\.mjs/.test(line)).map(scrub).slice(0,50);
   const infrastructureFailure=r.error?(r.error.code==='ETIMEDOUT'?'TIMEOUT':r.error.code==='ENOBUFS'?'OUTPUT_LIMIT':'SPAWN_FAILURE'):r.signal?'PROCESS_SIGNAL':null;
   const row={group,exitCode:r.status,counts,failedTests,locations,infrastructureFailure};
   results.push(row);console.log('[domain-lifecycle] TEST_GROUP '+JSON.stringify({commit,...row}));
  }
 }finally{rmSync(work,{recursive:true,force:true});}
 const regressionPassed=results.every(r=>r.exitCode===0&&!r.infrastructureFailure&&Number.isSafeInteger(r.counts.tests)&&r.counts.tests>0&&r.counts.pass===r.counts.tests&&['fail','cancelled','skipped','todo'].every(k=>r.counts[k]===0));
 console.log('[domain-lifecycle] REGRESSION '+JSON.stringify({commit,results,regressionPassed,liveVerification:false}));
 const account='095e57b46e7ba7f6b188480d9e4e5fe7',worker='ngeblogging',token=env.CLOUDFLARE_API_TOKEN;
 if(!token)throw Error('DOMAIN_DIAGNOSTIC_BUILD_TOKEN_UNAVAILABLE');
 if(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!==account)throw Error('DOMAIN_DIAGNOSTIC_ACCOUNT_MISMATCH');
 const read=async suffix=>{try{const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+suffix,{method:'GET',headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(30000)});if(!r.ok){try{await r.body?.cancel();}catch{}return {ok:false,httpStatus:r.status};}let p;try{p=await r.json();}catch{return {ok:false,reason:'INVALID_JSON'};}return p?.success===true?{ok:true,result:p.result,resultInfo:p.result_info}:{ok:false,reason:'API_REJECTED'};}catch{return {ok:false,reason:'FETCH_UNAVAILABLE'};}};
 const settings=await read('/workers/scripts/'+worker+'/settings');
 if(!settings.ok||!Array.isArray(settings.result?.bindings)){console.log('[domain-lifecycle] SETTINGS_READ '+JSON.stringify({commit,ok:false,httpStatus:settings.httpStatus,reason:settings.reason}));throw Error('DOMAIN_DIAGNOSTIC_SETTINGS_UNAVAILABLE');}
 const bindings=settings.result.bindings;
 const names=['DOMAIN_CUSTOMER_REGISTRAR_PROVIDER','DOMAIN_CUSTOMER_SEARCH_ENABLED','DOMAIN_CUSTOMER_SEARCH_HTTP_BUDGET','DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED','DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT','CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON','CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED','CLOUDFLARE_REGISTRAR_QUOTE_TIMEOUT_MS','CLOUDFLARE_REGISTRAR_API_TOKEN','OPENSRS_USERNAME','OPENSRS_API_KEY','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','MIDTRANS_SERVER_KEY','MIDTRANS_ENV'];
 const bindingPresence=Object.fromEntries(names.map(name=>[name,bindings.some(b=>b.name===name)]));
 const selected=bindings.find(b=>b.name==='DOMAIN_CUSTOMER_REGISTRAR_PROVIDER');
 const provider=selected?.type==='plain_text'&&['cloudflare','opensrs'].includes(selected.text)?selected.text:selected?'invalid_or_non_plaintext':'implicit_cloudflare_default';
 const flags=Object.fromEntries(['DOMAIN_CUSTOMER_SEARCH_ENABLED','DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED'].map(name=>{const b=bindings.find(b=>b.name===name);return [name,b?.type==='plain_text'&&['true','false'].includes(b.text)?b.text:'missing_or_invalid'];}));
 const deployment=await read('/workers/scripts/'+worker+'/deployments');
 const data=deployment.result;
 const deployments=(Array.isArray(data)?data:Array.isArray(data?.deployments)?data.deployments:[]).slice(0,5).map(d=>({id:d.id,createdOn:d.created_on,source:d.source,versions:(d.versions||[]).map(v=>({versionId:v.version_id,percentage:v.percentage}))}));
 console.log('[domain-lifecycle] LIVE_CONFIGURATION '+JSON.stringify({commit,worker,provider,flags,bindingPresence,deployments,secretValuesIncluded:false,registrarNetworkVerified:false,purchaseAllowed:false,productionChanged:false}));
 let cursor='',pages=0,catalogComplete=false,catalogFailure=null;const extensions=new Set(),seen=new Set();
 while(pages<40){const query=new URLSearchParams({per_page:'50',...(cursor?{cursor}:{})});const response=await read('/registrar/extensions?'+query);pages++;if(!response.ok){catalogFailure={httpStatus:response.httpStatus,reason:response.reason};break;}if(!Array.isArray(response.result)||response.result.length>50){catalogFailure={reason:'INVALID_CATALOG'};break;}let valid=true;for(const item of response.result){const name=item?.metadata?.name;if(typeof name!=='string'||name.length>189||name.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))||extensions.has(name)){valid=false;break;}extensions.add(name);}if(!valid){catalogFailure={reason:'INVALID_EXTENSION'};break;}const next=response.resultInfo?.cursor;if(next===undefined||next===''){catalogComplete=true;break;}if(typeof next!=='string'||next.length>256||seen.has(next)){catalogFailure={reason:'INVALID_PAGINATION'};break;}seen.add(next);cursor=next;}
 console.log('[domain-lifecycle] BUILD_CREDENTIAL_CATALOG '+JSON.stringify({commit,credentialClass:'build',pages,catalogComplete,extensionCount:extensions.size,extensions:catalogComplete?[...extensions].sort():undefined,failure:catalogFailure,runtimeRegistrarCredentialVerified:false,configurationWritten:false,purchaseAllowed:false}));
 if(!regressionPassed)throw Error('DOMAIN_LIFECYCLE_REGRESSION_FAILED_NO_DEPLOY');
 throw Error('DOMAIN_LIFECYCLE_DIAGNOSTIC_COMPLETE_NO_DEPLOY');
}
