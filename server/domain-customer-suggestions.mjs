import {normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
const COUNT=50,UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const issue=code=>Object.assign(new Error(code),{code});
const aborted=()=>Object.assign(issue('DOMAIN_SEARCH_ABORTED'),{name:'AbortError'});
function time(value){if(!Number.isSafeInteger(value)||Math.abs(value)>8640000000000000)throw issue('INVALID_SEARCH_CLOCK');return value;}
export function buildCustomerDomainSuggestions(query,extensions){
 if(typeof query!=='string'||!Array.isArray(extensions)||!extensions.length||extensions.length>2000||extensions.some(s=>typeof s!=='string'||s.length>189||s.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))||new Set(extensions).size!==extensions.length)throw issue('INVALID_SUGGESTION_INPUT');
 const value=query.trim();if(!value||value.length>253)throw issue('INVALID_SUGGESTION_INPUT');
 const preferred=['com','net','org'],suffixes=[...preferred.filter(s=>extensions.includes(s)),...extensions.filter(s=>!preferred.includes(s))];
 let parsed,requestedDomain=null;
 try{
  if(value.includes('.')){parsed=normalizeRegistrarDomain(value,suffixes);requestedDomain=parsed.domain;}
  else{if(value.length>100||!/^[-\p{L}\p{M}\p{N} ]+$/u.test(value))throw Error();parsed=normalizeRegistrarDomain(value.replace(/ +/g,'-')+'.'+suffixes[0],suffixes);}
 }catch{throw issue('INVALID_SUGGESTION_INPUT');}
 const primaryDomain=requestedDomain&&suffixes.includes(parsed.extension)?requestedDomain:null;
 const seen=new Set(primaryDomain?[primaryDomain]:[]),suggestions=[];
 const add=domain=>{if(suggestions.length>=COUNT)return;try{const p=normalizeRegistrarDomain(domain,suffixes);if(!suffixes.includes(p.extension)||seen.has(p.domain))return;seen.add(p.domain);suggestions.push(p.domain);}catch{}};
 for(const suffix of suffixes)add(parsed.name+'.'+suffix);
 const stem=parsed.name.slice(0,48),affixes=['blog','studio','online','hub','media','digital','journal','notes','space','works','home','world','today','plus','site','web','daily','story','lab','my'];
 for(const affix of affixes)for(const suffix of suffixes){add(affix+'-'+stem+'.'+suffix);add(stem+'-'+affix+'.'+suffix);}
 for(let n=1;n<=100&&suggestions.length<COUNT;n++)for(const suffix of suffixes)add('web'+n+'-'+stem+'.'+suffix);
 if(suggestions.length!==COUNT)throw issue('INSUFFICIENT_VALID_SUGGESTIONS');
 return Object.freeze({query:value,requestedDomain,primaryDomain,requestedExtensionSupported:requestedDomain===null?null:primaryDomain!==null,suggestions:Object.freeze(suggestions)});
}
function safeResult(result,domain,siteId,now,isPrimary){
 if(result?.code!=='DOMAIN_CUSTOMER_PRICE_CHECK'||result.environment!=='production'||result.siteId!==siteId||result.domain!==domain||result.indicative!==true||result.purchaseAllowed!==false||result.checkoutAvailable!==false)throw issue('SEARCH_RESULT_UNVERIFIED');
 if(result.availability==='unavailable'&&result.price===null)return Object.freeze({domain,isPrimary,status:'unavailable',price:null});
 if(typeof result.checkedAt!=='string'||result.checkedAt.length>64||typeof result.expiresAt!=='string'||result.expiresAt.length>64)throw issue('SEARCH_RESULT_UNVERIFIED');
 const p=result.price,checked=Date.parse(result.checkedAt),expires=Date.parse(result.expiresAt);
 if(result.availability!=='available'||p?.currency!=='IDR'||!Number.isSafeInteger(p.amountIdr)||p.amountIdr<1||p.amountIdr>1000000000000||p.termYears!==1||p.indicative!==true||p.purchaseAllowed!==false||p.expiresAt!==result.expiresAt||!Number.isFinite(checked)||!Number.isFinite(expires)||checked>now||expires<=now||expires<=checked||expires-checked>300000)throw issue('SEARCH_RESULT_UNVERIFIED');
 return Object.freeze({domain,isPrimary,status:'available',checkedAt:result.checkedAt,expiresAt:result.expiresAt,price:Object.freeze({currency:'IDR',amountIdr:p.amountIdr,termYears:1,expiresAt:p.expiresAt,indicative:true,purchaseAllowed:false})});
}
// Caller must authorize the site once. check() must reuse that trusted context, not call the per-domain public endpoint in a loop.
export async function checkCustomerDomainSuggestions(query,{extensions,siteId,check,signal,clock=Date.now,concurrency=3,timeoutMs=15000}={}){
 if(typeof siteId!=='string'||!UUID.test(siteId)||typeof check!=='function'||typeof clock!=='function'||!Number.isInteger(concurrency)||concurrency<1||concurrency>4||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>20000)throw issue('INVALID_SEARCH_CONFIGURATION');
 siteId=siteId.toLowerCase();
 if(signal?.aborted)throw aborted();
 const plan=buildCustomerDomainSuggestions(query,extensions),domains=[...(plan.primaryDomain?[plan.primaryDomain]:[]),...plan.suggestions],started=time(clock());
 const rows=domains.map(domain=>Object.freeze({domain,isPrimary:domain===plan.primaryDomain,status:'not_checked',price:null}));
 const controller=new AbortController();let stop,timedOut=false,next=0,attempted=0;
 const ended=new Promise((_,reject)=>{stop=()=>reject(aborted());controller.signal.addEventListener('abort',stop,{once:true});});
 const cancel=()=>controller.abort(),timer=setTimeout(()=>{timedOut=true;cancel();},timeoutMs);signal?.addEventListener('abort',cancel,{once:true});
 try{
  const worker=async()=>{
   while(next<domains.length&&!controller.signal.aborted){
    const index=next++,domain=domains[index];
    try{const result=await Promise.race([Promise.resolve().then(()=>{if(controller.signal.aborted)throw aborted();attempted++;return check(domain,{siteId,signal:controller.signal});}),ended]);if(controller.signal.aborted)throw aborted();rows[index]=safeResult(result,domain,siteId,time(clock()),domain===plan.primaryDomain);}
    catch{rows[index]=Object.freeze({domain,isPrimary:domain===plan.primaryDomain,status:'unverified',price:null});}
   }
  };
  await Promise.all(Array.from({length:concurrency},worker));
  if(signal?.aborted)throw aborted();
  const completed=time(clock());if(completed<started)throw issue('INVALID_SEARCH_CLOCK');
  for(let i=0;i<rows.length;i++)if(rows[i].status==='available'&&Date.parse(rows[i].expiresAt)<=completed)rows[i]=Object.freeze({domain:rows[i].domain,isPrimary:rows[i].isPrimary,status:'unverified',price:null});
  const checked=rows.filter(row=>['available','unavailable'].includes(row.status)).length;
  return Object.freeze({query:plan.query,siteId,primaryDomain:plan.primaryDomain,requestedDomain:plan.requestedDomain,requestedExtensionSupported:plan.requestedExtensionSupported,suggestionCount:plan.suggestions.length,candidateCount:rows.length,attemptedCount:attempted,checkedCount:checked,unverifiedCount:rows.filter(row=>row.status==='unverified').length,notCheckedCount:rows.filter(row=>row.status==='not_checked').length,complete:checked===rows.length,timedOut,startedAt:new Date(started).toISOString(),completedAt:new Date(completed).toISOString(),candidates:Object.freeze(rows),indicative:true,purchaseAllowed:false,checkoutAvailable:false});
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',stop);controller.abort();}
}
