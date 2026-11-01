(async()=>{
 const origin='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev',base='/api/admin/commerce/domains/sandbox-snap-probe',page='/assets/isolated-probe-guard-check-v1.html',rows=[];
 let status='not_confirmed';
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),15000);
 const inspect=async(path,method)=>{
  const r=await fetch(origin+path,{method,credentials:'omit',redirect:'error',cache:'no-store',signal:c.signal});const d=await r.json();
  const row={path,method,httpStatus:r.status,marker:r.headers.get('x-ngeblogging-isolated-probe-router'),cacheControl:r.headers.get('cache-control'),code:d.code,scope:d.scope,runtimeEnabled:d.runtimeEnabled,checkoutCreated:d.checkoutCreated,paymentCreated:d.paymentCreated,customerQuoteCreated:d.customerQuoteCreated,domainOrderRecorded:d.domainOrderRecorded,registrationStarted:d.registrationStarted,costBasisVerified:d.costBasisVerified};rows.push(row);return row;
 };
 const safe=r=>r.marker==='guarded-v1'&&r.cacheControl==='no-store'&&r.scope==='isolated_sandbox_probe'&&['runtimeEnabled','checkoutCreated','paymentCreated','customerQuoteCreated','domainOrderRecorded','registrationStarted','costBasisVerified'].every(k=>r[k]===false);
 try{
  if(location.origin!==origin||location.pathname!==page||location.search||location.hash)throw Error('WRONG_LOCATION');
  const before=await inspect(base,'GET');if(before.httpStatus!==405||before.code!=='METHOD_NOT_ALLOWED'||!safe(before))throw Error('PREFLIGHT_NOT_CONFIRMED');
  for(const suffix of ['', '/status','/notification']){const r=await inspect(base+suffix,'POST');if(r.httpStatus!==503||r.code!=='ISOLATED_SANDBOX_PROBE_ROUTED_DISABLED'||!safe(r))throw Error('GUARD_NOT_CONFIRMED');}
  status='passed';
 }catch{status='not_confirmed';}
 finally{
  clearTimeout(timer);const output=document.getElementById('isolated-probe-guard-result');
  output.textContent=JSON.stringify({status,scope:'deployed_unauthenticated_closed_guard_only',rows,authenticatedFlowTested:false,midtransFlowTested:false,concurrencyTested:false},null,2);output.dataset.complete='true';
 }
})();
