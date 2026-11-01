import {PREVIEW_ORIGIN} from '../server/domain-isolated-sandbox-probe.mjs';
import {isolatedSandboxProbeResponse} from '../server/domain-isolated-sandbox-handler.mjs';
import {isolatedSandboxNotificationResponse} from '../server/domain-isolated-sandbox-notification.mjs';
const BASE='/api/admin/commerce/domains/sandbox-snap-probe';
const PATHS=new Set([BASE,BASE+'/status',BASE+'/notification']);
// Worker must keep runtimeReady:false until a separately approved activation and integration test.
export async function isolatedSandboxPreviewResponse(request,env,{runtimeReady=false}={}){
 const url=new URL(request.url);
 if(url.pathname!==BASE&&!url.pathname.startsWith(BASE+'/'))return null;
 const reply=(status,code)=>new Response(JSON.stringify({code,scope:'isolated_sandbox_probe',runtimeEnabled:false,checkoutCreated:false,paymentCreated:false,customerQuoteCreated:false,domainOrderRecorded:false,registrationStarted:false,costBasisVerified:false}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-robots-tag':'noindex','x-ngeblogging-isolated-probe-router':'guarded-v1',...(status===405?{allow:'POST'}:{})}});
 if(url.origin!==PREVIEW_ORIGIN||url.username||url.password||!PATHS.has(url.pathname))return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search||url.hash)return reply(400,'QUERY_NOT_ALLOWED');
 if(runtimeReady!==true||env?.DOMAIN_SANDBOX_SNAP_PROBE_ENABLED!=='true')return reply(503,'ISOLATED_SANDBOX_PROBE_ROUTED_DISABLED');
 if(url.pathname===BASE+'/notification')return isolatedSandboxNotificationResponse(request,env);
 return isolatedSandboxProbeResponse(request,env,{notificationReceiverReady:true});
}
