import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
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
   results.push({group,exitCode:r.status,counts});
  }
 }finally{rmSync(work,{recursive:true,force:true});}
 console.log('[domain-lifecycle] REGRESSION '+JSON.stringify({commit,results,liveVerification:false}));
 const account='095e57b46e7ba7f6b188480d9e4e5fe7',worker='ngeblogging',token=env.CLOUDFLARE_API_TOKEN;
 if(!token)throw Error('DOMAIN_DIAGNOSTIC_BUILD_TOKEN_UNAVAILABLE');
 if(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!==account)throw Error('DOMAIN_DIAGNOSTIC_ACCOUNT_MISMATCH');
 const read=async suffix=>{const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+worker+suffix,{method:'GET',headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('DOMAIN_DIAGNOSTIC_HTTP_'+r.status);const p=await r.json();if(p.success!==true)throw Error('DOMAIN_DIAGNOSTIC_API_REJECTED');return p.result;};
 const settings=await read('/settings');
 if(!Array.isArray(settings?.bindings))throw Error('DOMAIN_DIAGNOSTIC_BINDINGS_INVALID');
 const names=['DOMAIN_CUSTOMER_REGISTRAR_PROVIDER','DOMAIN_CUSTOMER_SEARCH_ENABLED','DOMAIN_CUSTOMER_SEARCH_HTTP_BUDGET','DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED','DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT','CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON','CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED','CLOUDFLARE_REGISTRAR_QUOTE_TIMEOUT_MS','CLOUDFLARE_REGISTRAR_API_TOKEN','OPENSRS_USERNAME','OPENSRS_API_KEY','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','MIDTRANS_SERVER_KEY','MIDTRANS_ENV'];
 const bindingPresence=Object.fromEntries(names.map(name=>[name,settings.bindings.some(b=>b.name===name)]));
 const selected=settings.bindings.find(b=>b.name==='DOMAIN_CUSTOMER_REGISTRAR_PROVIDER');
 const provider=selected?.type==='plain_text'&&['cloudflare','opensrs'].includes(selected.text)?selected.text:selected?'invalid_or_non_plaintext':'implicit_cloudflare_default';
 const flags=Object.fromEntries(['DOMAIN_CUSTOMER_SEARCH_ENABLED','DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED'].map(name=>{const b=settings.bindings.find(b=>b.name===name);return [name,b?.type==='plain_text'&&['true','false'].includes(b.text)?b.text:'missing_or_invalid'];}));
 const data=await read('/deployments');
 const deployments=(Array.isArray(data)?data:data?.deployments||[]).slice(0,5).map(d=>({id:d.id,createdOn:d.created_on,source:d.source,versions:(d.versions||[]).map(v=>({versionId:v.version_id,percentage:v.percentage}))}));
 console.log('[domain-lifecycle] LIVE_CONFIGURATION '+JSON.stringify({commit,worker,provider,flags,bindingPresence,deployments,secretValuesIncluded:false,registrarNetworkVerified:false,purchaseAllowed:false,productionChanged:false}));
 throw Error('DOMAIN_LIFECYCLE_DIAGNOSTIC_COMPLETE_NO_DEPLOY');
}
