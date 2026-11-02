import {Buffer} from 'node:buffer';
// Local integration fixture only. No production route imports this module.
let blockedExternalCalls=0;
globalThis.fetch=()=>{blockedExternalCalls++;throw Error('UNMOCKED_EXTERNAL_FETCH_BLOCKED');};
const USER='11111111-1111-4111-8111-111111111111',SITE='22222222-2222-4222-8222-222222222222',OTHER='33333333-3333-4333-8333-333333333333';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co/',QUOTE='https://api.cloudflare.com/client/v4/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/domain-check';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const report=value=>json({fixtureOnly:true,blockedExternalCalls,...value});
function environment(){
 const now=Date.now(),iso=x=>new Date(x).toISOString();
 return {SUPABASE_URL:BASE,SUPABASE_PUBLISHABLE_KEY:'offline-fixture-public-key',DOMAIN_CUSTOMER_SEARCH_ENABLED:'true',DOMAIN_CUSTOMER_SEARCH_HTTP_BUDGET:'128',DOMAIN_CUSTOMER_REGISTRAR_PROVIDER:'cloudflare',DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED:'true',CLOUDFLARE_REGISTRAR_API_TOKEN:'offline-fixture-registrar-token',CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON:'["com"]',CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED:'true',DOMAIN_CUSTOMER_REVIEW_ENABLED:'true',DOMAIN_CUSTOMER_REVIEW_SIGNING_KEY:Buffer.from(new Uint8Array(32).fill(11)).toString('base64url'),
 DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT:JSON.stringify({environment:'production',fx:{base:'USD',quote:'IDR',rate:'20000',source:'offline-fixture',costBasisVerified:true,observedAt:iso(now-1000),expiresAt:iso(now+60000)},policy:{taxStatus:'verified',costScope:'registration_year_1',paymentFeeMode:'conservative_ceiling',sourceRef:'offline-fixture',taxSourceRef:'offline-fixture',paymentFeeSourceRef:'offline-fixture',version:'offline-native-v1',verifiedAt:iso(now-1000),expiresAt:iso(now+60000),otherDirectCostsIdr:1000,paymentFixedCostIdr:1000,minimumMarginIdr:25000,paymentFeeBasisPoints:100}})};
}
function incoming(kind='search',token='offline-fixture-session',signal){return new Request('https://ngeblogging.com/api/domains/commerce/'+kind+'/example.com',{method:'POST',headers:{origin:'https://ngeblogging.com',authorization:'Bearer '+token,'x-site-id':SITE},signal});}
export default {async fetch(request){
 const mode=new URL(request.url).pathname.slice(1);
 if(mode==='native-modes'){
  const probe=redirect=>{try{const r=new Request('https://offline.invalid/',{redirect});return {accepted:true,redirect:r.redirect};}catch(error){return {accepted:false,errorType:error.name};}};
  return report({runtime:'workerd',error:probe('error'),manual:probe('manual')});
 }
 const modes=['search','review','session-redirect','site-redirect','quote-redirect','expired','foreign','site-forbidden','api-key-rejected','timeout','parallel','rate-limit'];
 if(!modes.includes(mode))return new Response('Unknown isolated test scenario',{status:404});
 // Dynamic import runs after global network blocking, including singleton initialization.
 const {createCustomerDomainAuthBridge}=await import('../../server/domain-customer-auth-bridge.mjs');
 const controller=new AbortController(),calls={session:0,site:0,quote:0,unexpected:0,total:0};
 const fetchImpl=async(input,init)=>{
  // Native workerd Request parsing validates the actual options passed to fetch.
  const native=new Request(input,init);if(native.redirect!=='manual')throw Error('NON_MANUAL_REDIRECT_REACHED_RUNTIME');
  calls.total++;const url=new URL(native.url);
  if(url.origin===BASE.slice(0,-1)&&url.pathname==='/auth/v1/user'&&native.method==='GET'){
   calls.session++;
   if(mode==='parallel'&&native.headers.get('authorization')==='Bearer offline-fail'){await new Promise(resolve=>setTimeout(resolve,5));throw new TypeError('offline-fixture-transport-failure');}
   if(mode==='session-redirect')return new Response(null,{status:302,headers:{location:'https://must-not-follow.invalid/'}});
   if(mode==='expired')return json({message:'invalid JWT'},401);
   if(mode==='api-key-rejected')return json({message:'Invalid API key'},401);
   if(mode==='timeout')return new Promise((resolve,reject)=>{init.signal.addEventListener('abort',()=>reject(new Error('offline-fixture-abort')),{once:true});setTimeout(()=>controller.abort(),1);});
   return json({id:USER});
  }
  if(url.origin===BASE.slice(0,-1)&&url.pathname==='/rest/v1/sites'&&native.method==='GET'){
   calls.site++;if(url.searchParams.get('id')!=='eq.'+SITE||url.searchParams.get('select')!=='id,owner_id')throw Error('SITE_QUERY_CHANGED');
   if(mode==='site-redirect')return new Response(null,{status:307,headers:{location:'https://must-not-follow.invalid/'}});
   if(mode==='site-forbidden')return json({message:'permission denied'},403);
   return json([{id:SITE,owner_id:mode==='foreign'?OTHER:USER}]);
  }
  if(native.url===QUOTE&&native.method==='POST'){
   calls.quote++;if(native.headers.get('authorization')!=='Bearer offline-fixture-registrar-token')throw Error('FIXTURE_PROVIDER_CONTEXT_MISMATCH');
   if(mode==='quote-redirect')return new Response(null,{status:302,headers:{location:'https://must-not-follow.invalid/'}});
   const body=await native.json();if(!Array.isArray(body.domains)||body.domains.length!==1)throw Error('INVALID_FIXTURE_QUOTE_REQUEST');
   return json({success:true,errors:[],result:{domains:[{name:body.domains[0],registrable:true,tier:'standard',pricing:{currency:'USD',registration_cost:'5.00',renewal_cost:'8.00'}}]}});
  }
  calls.unexpected++;throw Error('UNEXPECTED_EXTERNAL_TARGET_BLOCKED');
 };
 const handler=createCustomerDomainAuthBridge({fetchImpl,log:()=>{}}),env=environment();
 const run=async(kind='search',token='offline-fixture-session')=>{const response=await handler(incoming(kind,token,controller.signal),env);return {status:response.status,body:await response.json()};};
 if(mode==='parallel'){const results=await Promise.all([run('search','offline-fail'),run('search','offline-success')]);return report({results,calls});}
 if(mode==='rate-limit'){env.DOMAIN_CUSTOMER_SEARCH_ENABLED='false';const results=[];for(let i=0;i<11;i++)results.push(await run());return report({results,calls});}
 return report({...await run(mode==='review'?'review':'search'),calls});
}};
