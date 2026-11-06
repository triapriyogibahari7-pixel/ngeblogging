import {checkCustomDomainDns} from './custom-domain-dns-readiness.mjs';
import {createWorkerRedirectSafeFetch} from './domain-worker-fetch.mjs';
import {networkDiagnostic} from './domain-network-diagnostic.mjs';
const RELEASE='public-dns-relay-v1-20261106';
function json(status,body){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-domain-dns-release':RELEASE}});}
export async function domainPublicDnsResponse(request){
 const url=new URL(request.url);if(url.pathname!=='/api/domains/dns-public')return null;
 if(request.method!=='GET')return json(405,{code:'METHOD_NOT_ALLOWED'});
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json(403,{code:'ORIGIN_NOT_ALLOWED'});
 if(url.search.length>2048)return json(400,{code:'DNS_QUERY_TOO_LARGE'});
 if([...url.searchParams.keys()].some(key=>!['hostname','zoneName','ns'].includes(key)))return json(400,{code:'INVALID_DNS_QUERY'});
 const hostname=url.searchParams.get('hostname')||'',zoneName=url.searchParams.get('zoneName')||'';
 const expectedNameservers=url.searchParams.getAll('ns');
 if(expectedNameservers.length>8||[hostname,zoneName,...expectedNameservers].some(value=>value.length>253||!/[a-z]/i.test(value.split('.').at(-1))||/(?:^|\.)(?:localhost|local|internal)$/i.test(value)))return json(400,{code:'INVALID_DNS_QUERY'});
 const diagnostics=[],safeFetch=createWorkerRedirectSafeFetch();
 const diagnosticFetch=async(input,init)=>{
  const target=new URL(String(input)),resolver=target.hostname,type=target.searchParams.get('type');
  if(!['cloudflare-dns.com','dns.google'].includes(resolver)||!['A','AAAA','NS'].includes(type))throw Error('DNS_TARGET_REJECTED');
  let result;
  try{result=await safeFetch(input,init);}catch(error){const diagnostic={resolver,type,...networkDiagnostic(error,{httpStatus:error?.status||0})};diagnostics.push(diagnostic);console.warn('[domain-dns-diagnostic]',JSON.stringify(diagnostic));throw error;}
  if(!result.ok){const diagnostic={resolver,type,...networkDiagnostic(null,{phase:'response',httpStatus:result.status})};diagnostics.push(diagnostic);console.warn('[domain-dns-diagnostic]',JSON.stringify(diagnostic));}
  return {ok:result.ok,status:result.status,json:async()=>{
   try{const data=await result.json();const dnsStatus=Number.isInteger(data?.Status)&&data.Status>=0&&data.Status<=65535?data.Status:null;diagnostics.push({resolver,type,phase:'complete',httpStatus:result.status,dnsStatus,reason:data?.TC===true?'DNS_TRUNCATED':dnsStatus===null?'DNS_RESPONSE_INVALID':'DNS_RESPONSE_RECEIVED'});return data;}
   catch(error){const diagnostic={resolver,type,...networkDiagnostic(error,{phase:'response-json',httpStatus:result.status})};diagnostics.push(diagnostic);console.warn('[domain-dns-diagnostic]',JSON.stringify(diagnostic));throw error;}
  }};
 };
 try{
  const dns=await checkCustomDomainDns({hostname,zoneName,expectedNameservers,fetchImpl:diagnosticFetch});
  return json(200,{release:RELEASE,diagnosticRelease:'domain-network-diagnostic-v1-20261106',diagnostics,scope:'public-recursive-dns-observation',ownershipVerified:false,...dns});
 }catch{return json(400,{code:'DNS_QUERY_INVALID_OR_UNAVAILABLE',diagnostics,error:'Pemeriksaan DNS belum menghasilkan bukti. Ini bukan konfirmasi domain rusak.'});}
}
