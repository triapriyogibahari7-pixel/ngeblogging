let blockedExternalCalls=0;
globalThis.fetch=()=>{blockedExternalCalls++;throw Error('UNMOCKED_EXTERNAL_FETCH_BLOCKED');};
const USER='11111111-1111-4111-8111-111111111111',SITE='22222222-2222-4222-8222-222222222222',ID='33333333-3333-4333-8333-333333333333',OTHER='44444444-4444-4444-8444-444444444444';
const DB='https://polvmlrhqoiflumibfqs.supabase.co',CF='https://api.cloudflare.com/client/v4/zones/'+'a'.repeat(32)+'/custom_hostnames';
const json=(v,status=200)=>Response.json(v,{status});
export default {async fetch(request){
 const mode=new URL(request.url).pathname.slice(1),report=v=>json({fixtureOnly:true,blockedExternalCalls,...v});
 if(mode==='native-modes'){const probe=redirect=>{try{return {accepted:true,redirect:new Request('https://offline.invalid/',{redirect}).redirect};}catch(e){return {accepted:false,errorType:e.name};}};return report({error:probe('error'),manual:probe('manual')});}
 const {createSaasHttpRegistration}=await import('../../server/customer-domain-http-registration.mjs');
 const {createHttpDcvHandler}=await import('../../server/customer-domain-http-dcv.mjs');
 const hostname=mode==='new-blog'?'blog.example.net':'www.example.com',calls={auth:0,providerCreates:0,databaseWrites:0,certificateReads:0,unexpected:0};
 const env={CUSTOM_DOMAIN_PROVIDER:'cloudflare-custom-hostnames',SUPABASE_URL:DB,SUPABASE_PUBLISHABLE_KEY:'fixture-public-key',CLOUDFLARE_API_TOKEN:'fixture-provider-token',CLOUDFLARE_ZONE_ID:'a'.repeat(32),CLOUDFLARE_CUSTOM_ORIGIN:'fallback.ngeblogging.com',CLOUDFLARE_CUSTOM_HOSTNAME_TARGET:'connect.ngeblogging.com'};
 const redirect=()=>new Response(null,{status:302,headers:{location:'https://must-not-follow.invalid/'}});
 const provider=()=>({id:ID,hostname:mode==='wrong-host'?'wrong.example.com':hostname,status:'pending',ssl:{method:'http',status:'pending_validation',validation_records:[]}});
 const fetchImpl=async(input,init)=>{
  const r=new Request(input,init);if(r.redirect!=='manual')throw Error('NON_MANUAL_REDIRECT_REACHED_RUNTIME');const url=new URL(r.url);
  if(url.origin===DB&&url.pathname==='/auth/v1/user'){calls.auth++;if(mode==='auth-redirect')return redirect();return json({id:USER});}
  if(url.origin===DB&&url.pathname==='/rest/v1/sites')return json([{id:SITE,owner_id:mode==='foreign-site'?OTHER:USER}]);
  if(url.origin===DB&&url.pathname==='/rest/v1/site_members')return json([]);
  if(url.origin===DB&&url.pathname==='/rest/v1/site_domains'&&r.method==='GET')return json([]);
  if(r.url===CF+'?hostname.exact='+encodeURIComponent(hostname)){if(mode==='snapshot-redirect')return redirect();return json({success:true,result:[]});}
  if(r.url===CF&&r.method==='POST'){calls.providerCreates++;if(r.headers.get('authorization')!=='Bearer fixture-provider-token')throw Error('WRONG_PROVIDER_CONTEXT');const body=await r.json();if(body.hostname!==hostname||body.ssl.method!=='http')throw Error('WRONG_CREATION_CONTEXT');if(mode==='create-redirect')return redirect();return json({success:true,result:provider()});}
  if(url.origin===DB&&url.pathname==='/rest/v1/site_domains'&&r.method==='POST'){calls.databaseWrites++;if(mode==='storage-fail')return json({message:'fixture-storage-error'},503);return json([{id:ID,...await r.json()}]);}
  if(r.url===CF+'/'+ID&&r.method==='GET'){calls.certificateReads++;if(mode==='certificate-redirect')return redirect();return json({success:true,result:provider()});}
  calls.unexpected++;throw Error('UNEXPECTED_EXTERNAL_TARGET_BLOCKED');
 };
 const registration=createSaasHttpRegistration({fetchImpl,legacyHandler:async()=>{throw Error('UNEXPECTED_LEGACY_ROUTE');}});
 const handler=createHttpDcvHandler({handler:registration,fetchImpl});
 const headers={'content-type':'application/json'};if(mode!=='no-auth')headers.authorization='Bearer fixture-session';
 const incoming=new Request('https://ngeblogging.com/api/domains/register',{method:'POST',headers,body:JSON.stringify({siteId:mode==='invalid-site'?'bad':SITE,hostname})});
 const result=await handler(incoming,env);return report({status:result.status,body:await result.json(),calls});
}};
