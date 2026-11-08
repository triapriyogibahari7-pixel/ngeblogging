import { normalizeConnection } from '../shared/nara-connector-registry.mjs';
import { readGitHubRepositoryTool } from './nara-github-repository-tool.mjs';
const operations = { 'github.file':['github','path','ref'], 'github.directory':['github','path','ref'], 'cloudflare.deployments':['cloudflare','worker'], 'cloudflare.versions':['cloudflare','worker'], 'supabase.functions':['supabase'], 'waf.rulesets':['cloudflare-one-waf'], 'browser.sessions':['cloudflare-browser-rendering'] };
export function isConnectorToolInput(input) {
 if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.hasOwn(operations,input.operation)) return false;
 return Object.keys(input).every(key => key === 'operation' || operations[input.operation].slice(1).includes(key));
}
const fail = code => { throw Error(code); };
const text = value => typeof value === 'string' ? value.slice(0,200) : '';
export async function readConnectorTool(rawConfig,token,input,fetcher=fetch) {
 const config = normalizeConnection(rawConfig);
 if (!isConnectorToolInput(input) || operations[input.operation][0] !== config.provider) fail('CONNECTOR_INVALID_REQUEST');
 if (config.provider === 'github') return readGitHubRepositoryTool(config,token,input,fetcher);
 if (typeof token !== 'string' || !token || token.length > 8192 || /[\s\u0000-\u001f\u007f]/.test(token)) fail('INVALID_CREDENTIAL');
 const cf = 'https://api.cloudflare.com/client/v4';
 let target;
 if (config.provider === 'cloudflare') {
  if (typeof input.worker !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(input.worker)) fail('CONNECTOR_INVALID_REQUEST');
  target = cf+'/accounts/'+config.accountId+'/workers/scripts/'+encodeURIComponent(input.worker)+'/'+(input.operation === 'cloudflare.deployments' ? 'deployments' : 'versions');
 } else if (config.provider === 'supabase') target = 'https://api.supabase.com/v1/projects/'+config.projectRef+'/functions';
 else if (config.provider === 'cloudflare-one-waf') target = cf+'/zones/'+config.zoneId+'/rulesets';
 else target = cf+'/accounts/'+config.accountId+'/browser-rendering/devtools/session';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try {
  const response=await fetcher(target,{method:'GET',headers:{authorization:'Bearer '+token,accept:'application/json','user-agent':'Ngeblogging-Nara'},redirect:'error',signal:controller.signal});
  if(!response.ok) fail(response.status===401||response.status===403?'CONNECTOR_ACCESS_DENIED':response.status===429?'CONNECTOR_RATE_LIMITED':'CONNECTOR_READ_FAILED');
  if(!response.body||!response.headers.get('content-type')?.includes('application/json')) fail('CONNECTOR_INVALID_RESPONSE');
  const reader=response.body.getReader(),chunks=[];let size=0;
  try {while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>524288){await reader.cancel();fail('CONNECTOR_RESPONSE_TOO_LARGE');}chunks.push(next.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const payload=JSON.parse(new TextDecoder().decode(bytes));
  const cloudflare=config.provider!=='supabase';
  if(cloudflare&&payload?.success!==true)fail('CONNECTOR_INVALID_RESPONSE');
  const result=cloudflare?payload.result:payload;
  const rows=Array.isArray(result)?result:input.operation==='cloudflare.deployments'?result?.deployments:input.operation==='cloudflare.versions'?result?.items:null;
  if(!Array.isArray(rows))fail('CONNECTOR_INVALID_RESPONSE');
  if(input.operation==='browser.sessions')return {provider:config.provider,verifiedCapability:'browser-session-metadata:read',sessionCountInResponse:rows.length,renderingVerified:false,firstPageOnly:true,untrustedProviderData:true};
  const entries=rows.slice(0,100).map(item=>{
   if(input.operation==='cloudflare.deployments')return {id:text(item.id),createdOn:text(item.created_on),source:text(item.source),versions:Array.isArray(item.versions)?item.versions.slice(0,20).map(version=>({id:text(version.version_id),percentage:Number.isFinite(version.percentage)?version.percentage:null})):[]};
   if(input.operation==='cloudflare.versions')return {id:text(item.id),createdOn:text(item.metadata?.created_on),source:text(item.metadata?.source)};
   if(input.operation==='supabase.functions')return {id:text(item.id),slug:text(item.slug),name:text(item.name),status:text(item.status),version:Number.isFinite(item.version)?item.version:null,verifyJwt:item.verify_jwt===true};
   return {id:text(item.id),name:text(item.name),kind:text(item.kind),phase:text(item.phase),version:text(item.version)};
  });
  const clean=JSON.parse(JSON.stringify(entries).split(token).join('[REDACTED]'));
  return {provider:config.provider,verifiedCapability:input.operation+':read',target:config.provider==='cloudflare'?input.worker:config.provider==='supabase'?config.projectRef:config.zoneId,entries:clean,truncated:rows.length>100,firstPageOnly:true,untrustedProviderData:true};
 } finally {clearTimeout(timer);}
}
