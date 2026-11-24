import {customerHost} from '../shared/customer-domain-connection.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const DB='https://polvmlrhqoiflumibfqs.supabase.co';
export function validJob(j){try{return UUID.test(j?.domain_id||'')&&UUID.test(j.site_id||'')&&UUID.test(j.lease_token||'')&&UUID.test(j.provider_hostname_id||'')&&customerHost(j.hostname)===j.hostname;}catch{return false;}}
export async function limitedJson(response,limit=65536){const reader=response.body?.getReader();if(!reader)throw Error('JSON_REQUIRED');let text='',size=0;const decoder=new TextDecoder();try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>limit)throw Error('RESPONSE_TOO_LARGE');text+=decoder.decode(p.value,{stream:true});}return JSON.parse(text+decoder.decode());}finally{await reader.cancel().catch(()=>{});}}
export function retryAfter(value,now=Date.now()){const seconds=/^\d+$/.test(value||'')?Number(value):Math.ceil((Date.parse(value)-now)/1000);return Number.isFinite(seconds)?Math.max(60,Math.min(seconds,86400)):300;}
export async function observeJob(j,{env,fetchImpl,signal,beforeProvider=async()=>{}}){
 if(!validJob(j))throw Error('JOB_INVALID');
 await beforeProvider();if(signal.aborted)throw Error('TICK_EXPIRED');
 const token=env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN;
 const cf=await fetchImpl('https://api.cloudflare.com/client/v4/zones/'+env.CLOUDFLARE_ZONE_ID+'/custom_hostnames/'+j.provider_hostname_id,{method:'GET',redirect:'error',signal,headers:{authorization:'Bearer '+token,accept:'application/json'}});
 if(cf.status===429){const seconds=retryAfter(cf.headers.get('retry-after'));await cf.body?.cancel();throw Object.assign(Error('PROVIDER_RATE_LIMITED'),{retrySeconds:seconds});}
 if(!cf.ok){await cf.body?.cancel();throw Error('PROVIDER_READ_FAILED');}
 const body=await limitedJson(cf),h=body?.result;
 if(body.success!==true||h?.id!==j.provider_hostname_id||h.hostname!==j.hostname||typeof h.status!=='string'||typeof h.ssl?.status!=='string')throw Error('PROVIDER_IDENTITY_MISMATCH');
 const evidence={provider_status:h.status,ssl_status:h.ssl.status,https_verified:false,dns_cname_observed:false,site_content_verified:false,live:false};
 if(h.status!=='active'||h.ssl.status!=='active')return {outcome:'pending',evidence};
 try{
  const dns=await fetchImpl('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(j.hostname)+'&type=CNAME',{method:'GET',redirect:'error',signal,headers:{accept:'application/dns-json'}});
  if(dns.ok){const d=await limitedJson(dns,16384),normal=x=>String(x||'').toLowerCase().replace(/\.$/,'');evidence.dns_cname_observed=d.Status===0&&Array.isArray(d.Answer)&&d.Answer.some(r=>r.type===5&&normal(r.name)===j.hostname&&normal(r.data)===normal(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET));}else await dns.body?.cancel();
 }catch{if(signal.aborted)throw Error('TICK_EXPIRED');}
 const response=await env.PUBLIC_AUDITOR.fetch(new Request('https://'+j.hostname+'/',{method:'GET',redirect:'manual',signal,headers:{accept:'text/html','cache-control':'no-cache'}}));
 const ok=response.status===200&&!response.headers.get('location');await response.body?.cancel();
 evidence.https_verified=ok;if(ok)evidence.http_status=200;
 return {outcome:ok?'https200':'pending',evidence};
}
export async function runMonitorTick(env,{fetchImpl=globalThis.fetch}={}){
 if(env.SAAS_SERVER_MONITOR_ENABLED!=='true')return {disabled:true};
 if(env.SUPABASE_URL!==DB||!env.SUPABASE_SERVICE_ROLE_KEY||!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ZONE_ID||'')||!(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN)||!env.PUBLIC_AUDITOR?.fetch||!/^([a-z0-9-]+\.)+ngeblogging\.com$/.test(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET||''))throw Error('MONITOR_CONFIGURATION_REQUIRED');
 const rpc=async(name,args={},signal=AbortSignal.timeout(5000))=>{const r=await fetchImpl(DB+'/rest/v1/rpc/'+name,{method:'POST',redirect:'error',signal,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json',accept:'application/json'},body:JSON.stringify(args)});if(!r.ok){await r.body?.cancel();throw Error('MONITOR_STORAGE_UNAVAILABLE');}return limitedJson(r);};
 const jobs=await rpc('saas_monitor_claim_v1');
 if(!Array.isArray(jobs)||jobs.length>60)throw Error('CLAIM_INVALID');
 await rpc('saas_monitor_seed_v1');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);let cursor=0,nextProvider=Date.now(),cooled=false,completed=0,stale=0;
 const beforeProvider=async()=>{const wait=Math.max(0,nextProvider-Date.now());nextProvider=Math.max(Date.now(),nextProvider)+500;if(wait)await new Promise((resolve,reject)=>{const signal=controller.signal,abort=()=>{clearTimeout(id);reject(Error('TICK_EXPIRED'));},id=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},wait);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});if(cooled||controller.signal.aborted)throw Error('PROVIDER_COOLDOWN');};
 try{
  await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{
   while(!controller.signal.aborted&&!cooled){
    const j=jobs[cursor++];if(!j)return;
    let result,retrySeconds=0;
    try{result=await observeJob(j,{env,fetchImpl,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)]),beforeProvider});}
    catch(error){retrySeconds=error.retrySeconds||0;if(retrySeconds){cooled=true;await rpc('saas_monitor_cooldown_v1',{p_seconds:retrySeconds});}result={outcome:'error',evidence:{https_verified:false,site_content_verified:false,live:false}};}
    const accepted=await rpc('saas_monitor_finish_v1',{p_domain_id:j.domain_id,p_token:j.lease_token,p_outcome:result.outcome,p_evidence:result.evidence,p_retry_seconds:retrySeconds});
    if(accepted===true)completed++;else stale++;
   }
  }));
 }finally{clearTimeout(timer);controller.abort();}
 return {claimed:jobs.length,completed,stale,cooled,liveVerified:0};
}
