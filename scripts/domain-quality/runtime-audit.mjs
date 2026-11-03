import {parseDomainPricingSnapshot} from '../../server/domain-pricing-snapshot.mjs';
const account='095e57b46e7ba7f6b188480d9e4e5fe7',origin='https://ngeblogging.com';
async function readJson(url,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);let reader;
 try{
  const response=await fetch(url,{...options,redirect:'error',cache:'no-store',signal:controller.signal});
  reader=response.body?.getReader();if(!reader)return {status:response.status,data:null};
  const chunks=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>524288)throw Error('RESPONSE_LIMIT');chunks.push(part.value);}
  const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}
  let data=null;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{}
  return {status:response.status,data};
 }finally{clearTimeout(timer);if(reader){try{await reader.cancel();}catch{}try{reader.releaseLock();}catch{}}}
}
async function runtime(){
 const token=process.env.CLOUDFLARE_API_TOKEN;
 if(typeof token!=='string'||!token.trim())return {status:'not_verified',reason:'BUILD_API_TOKEN_UNAVAILABLE'};
 try{
  const response=await readJson('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/services/ngeblogging/environments/production/settings',{method:'GET',headers:{authorization:'Bearer '+token.trim(),accept:'application/json'}});
  if(response.status!==200||response.data?.success!==true)return {status:'not_verified',reason:'RUNTIME_SETTINGS_READ_REJECTED',httpStatus:response.status};
  const rows=response.data.result?.bindings;if(!Array.isArray(rows))return {status:'not_verified',reason:'RUNTIME_SETTINGS_RESPONSE_INVALID'};
  const bindings=new Map(rows.map(row=>[row.name,row]));
  const names=['DOMAIN_CUSTOMER_SEARCH_ENABLED','DOMAIN_CUSTOMER_SEARCH_HTTP_BUDGET','DOMAIN_CUSTOMER_REGISTRAR_PROVIDER','DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED','CLOUDFLARE_REGISTRAR_API_TOKEN','CLOUDFLARE_REGISTRAR_QUOTE_EXTENSIONS_JSON','CLOUDFLARE_REGISTRAR_QUOTES_TAX_INCLUDED','DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'];
  let pricingSnapshotValid=null;const snapshot=bindings.get('DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT');
  if(snapshot?.type==='plain_text'){try{parseDomainPricingSnapshot(snapshot.text,{environment:'production',now:Date.now()});pricingSnapshotValid=true;}catch{pricingSnapshotValid=false;}}
  return {status:'metadata_read',bindings:names.map(name=>({name,present:bindings.has(name)})),searchEnabled:bindings.get('DOMAIN_CUSTOMER_SEARCH_ENABLED')?.text==='true',cloudflareQuoteEnabled:bindings.get('DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED')?.text==='true',pricingSnapshotValid};
 }catch{return {status:'not_verified',reason:'RUNTIME_SETTINGS_REQUEST_FAILED'};}
}
async function probe({name,path,method,requestOrigin,expectedStatus,expectedCode}){
 try{
  const response=await readJson(origin+path,{method,headers:{origin:requestOrigin,'x-site-id':'22222222-2222-4222-8222-222222222222',accept:'application/json'}});
  const code=typeof response.data?.code==='string'&&/^[A-Z0-9_]{1,80}$/.test(response.data.code)?response.data.code:null;
  return {name,httpStatus:response.status,code,passed:response.status===expectedStatus&&code===expectedCode};
 }catch{return {name,passed:false,reason:'HTTP_PROBE_FAILED'};}
}
const path='/api/domains/commerce/search/ngeblogging';
const [settings,http]=await Promise.all([runtime(),Promise.all([
 {name:'search_requires_login',path,method:'POST',requestOrigin:origin,expectedStatus:401,expectedCode:'AUTH_REQUIRED'},
 {name:'check_requires_login',path:'/api/domains/commerce/check/ngeblogging.com',method:'POST',requestOrigin:origin,expectedStatus:401,expectedCode:'AUTH_REQUIRED'},
 {name:'search_rejects_get',path,method:'GET',requestOrigin:origin,expectedStatus:405,expectedCode:'METHOD_NOT_ALLOWED'},
 {name:'search_rejects_foreign_origin',path,method:'POST',requestOrigin:'https://example.com',expectedStatus:403,expectedCode:'ORIGIN_NOT_ALLOWED'}
].map(probe))]);
process.stdout.write(JSON.stringify({schemaVersion:1,observedAt:new Date().toISOString(),target:'production',runtime:settings,http,unauthenticatedHttpChecksPassed:http.every(item=>item.passed),releaseAuthorized:false,doesNotVerify:['authenticated-owner-search','registrar-account-access','actual-tax-treatment','server-cost-allocation','live-net-margin','payments','registration','installation']}));
