const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,ID=/^[a-f0-9]{32}$/i;
const outcome=(state,reason,evidence={})=>({outcome:state,reason,evidence:{...evidence,siteContentVerified:false}});
function hostname(value){const n=String(value||'').trim().toLowerCase().replace(/\.$/,'');if(n.length>253||!n.includes('.')||!/[a-z]/i.test(n.split('.').at(-1))||/(?:^|\.)(localhost|local|internal)$/.test(n)||n.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw Error('HOST_INVALID');return n;}
export async function processCustomDomainSync(job,env,ops,{signal}={}){
 let name,zoneId;try{name=hostname(job.hostname);zoneId=job.providerHostnameId;if(!UUID.test(job.domainId)||!UUID.test(job.siteId)||!UUID.test(job.ownerId)||!ID.test(zoneId)||!ID.test(env.CLOUDFLARE_ACCOUNT_ID||''))throw Error();}catch{return outcome('blocked','SYNC_INPUT_INVALID');}
 if(job.provider!=='cloudflare-full-zone')return outcome('blocked','PROVIDER_ADAPTER_REQUIRED');
 const check=async()=>{if(signal?.aborted||await ops.validate(job)!==true)throw Error('LEASE_INVALID');};
 let evidence={domainId:job.domainId,siteId:job.siteId,ownerId:job.ownerId,hostname:name,zoneId};
 try{
  await check();const zone=await ops.readZone(zoneId,{signal});
  if(zone?.id!==zoneId||zone?.name!==name||zone?.account?.id!==env.CLOUDFLARE_ACCOUNT_ID||zone.type!=='full'||zone.paused===true)return outcome('blocked','ZONE_IDENTITY_MISMATCH',evidence);
  const nameservers=[...new Set((zone.name_servers||[]).map(hostname))].sort();if(nameservers.length<2)return outcome('retry','ASSIGNED_NAMESERVERS_PENDING',evidence);
  evidence={...evidence,providerStatus:zone.status,requiredNameservers:nameservers};
  if(zone.status==='pending'){
   if(env.CUSTOM_DOMAIN_ACTIVATION_CHECK_ENABLED!=='true')return outcome('retry','ACTIVATION_CHECK_NOT_ENABLED',evidence);
   await check();if(await ops.claimActivation(job,zone)!==true)return outcome('retry','ACTIVATION_CHECK_COOLDOWN',evidence);
   await check();const accepted=await ops.activationCheck(zoneId,{signal});return outcome('retry',accepted===true?'ACTIVATION_CHECK_REQUESTED':'ACTIVATION_CHECK_UNCONFIRMED',evidence);
  }
  if(zone.status==='moved')return outcome('blocked','ZONE_MOVED',evidence);
  if(zone.status!=='active')return outcome('retry','PROVIDER_PENDING',evidence);
  const dns=await ops.readDns({hostname:name,zoneName:name,expectedNameservers:nameservers,signal});const age=Date.now()-Date.parse(dns?.checkedAt);
  if(dns?.hostname!==name||dns?.zoneName!==name||!Number.isFinite(age)||age< -60000||age>300000||!Array.isArray(dns.checks)||dns.checks.length!==2||new Set(dns.checks.map(x=>x.resolver)).size!==2||dns.checks.some(x=>!['dns.google','cloudflare-dns.com'].includes(x.resolver)))return outcome('retry','DNS_EVIDENCE_UNVERIFIED',evidence);
  if(dns.checks.some(c=>[c.a,c.aaaa,c.ns].some(x=>x?.dnsStatus===2||x?.reason==='DNS_SERVFAIL')))return outcome('retry','DNS_SERVFAIL',evidence);
  const nsMatch=dns.checks.every(c=>{if(c.ns?.state!=='resolved'||!Array.isArray(c.ns.answers))return false;const seen=[...new Set(c.ns.answers.map(hostname))].sort();return seen.length===nameservers.length&&seen.every((x,i)=>x===nameservers[i]);});
  if(!nsMatch)return outcome('retry','NAMESERVER_DELEGATION_PENDING',evidence);
  if(dns.ready!==true||!dns.checks.every(c=>c.a?.state==='resolved'||c.aaaa?.state==='resolved'))return outcome('retry','DNS_ADDRESS_PENDING',evidence);
  const settings=Array.isArray(job.additionalHostnames)?job.additionalHostnames:[];if(settings.length>12)return outcome('blocked','ALIAS_BATCH_LIMIT',evidence);
  const hosts=[name],www=settings.find(x=>x?.host==='www');if(!www||www.enabled!==false)hosts.push('www.'+name);
  for(const x of settings){if(x?.enabled===false||x?.host==='www')continue;const h=hostname(x.hostname);if(!h.endsWith('.'+name))return outcome('blocked','ALIAS_OUTSIDE_ZONE',evidence);hosts.push(h);}
  const expected=[...new Set(hosts)],bindings=[];
  for(const h of expected){
   await check();const rows=await ops.readBindings(h,{signal});if(!Array.isArray(rows)||rows.length>64)return outcome('retry','BINDING_RESPONSE_INVALID',evidence);
   const found=rows.filter(x=>x.hostname===h);if(found.length>1)return outcome('blocked','BINDING_AMBIGUOUS',evidence);const b=found[0];
   if(b){if(!b.id||b.service!==env.CLOUDFLARE_WORKER_SERVICE||b.zone_id!==zoneId)return outcome('blocked','EXISTING_BINDING_CONFLICT',evidence);if(!b.cert_id)return outcome('retry','CERTIFICATE_REFERENCE_PENDING',evidence);bindings.push({id:String(b.id),hostname:h,service:b.service,zoneId,zoneName:name,certificateId:String(b.cert_id)});continue;}
   if(env.CUSTOM_DOMAIN_ATTACH_ENABLED!=='true')return outcome('retry','DOMAIN_ATTACH_NOT_ENABLED',evidence);
   await check();if(await ops.claimWrite(job)!==true)return outcome('retry','PROVIDER_WRITE_RATE_LIMITED',evidence);await check();await ops.attach({hostname:h,zoneId,zoneName:name},{signal});return outcome('retry','ROUTING_PROPAGATING',evidence);
  }
  const proofs=await Promise.all(expected.map(h=>ops.verifyTenant({...job,hostname:h},{signal})));
  for(let i=0;i<proofs.length;i++){const p=proofs[i];if(p?.verified!==true||p.hostname!==expected[i]||p.domainId!==job.domainId||p.siteId!==job.siteId||p.tenantMappingVerified!==true)return outcome('retry','TENANT_PROOF_UNVERIFIED',evidence);const delta=Date.now()-Date.parse(p.checkedAt);if(!Number.isFinite(delta)||delta< -60000||delta>60000)return outcome('retry','TENANT_PROOF_STALE',evidence);}
  await check();return outcome('complete','CONNECTION_OBSERVED',{...evidence,providerActive:true,dnsReady:true,bindingsReady:true,httpsReady:true,tenantMappingVerified:true,readinessSource:'signed-tenant-route-proof',dnsCheckedAt:dns.checkedAt,checkedAt:new Date().toISOString(),bindings,proofs:proofs.map(p=>({hostname:p.hostname,domainId:p.domainId,siteId:p.siteId,checkedAt:p.checkedAt}))});
 }catch(error){const code=String(error?.code||'');return outcome(code==='PROVIDER_AUTH_REQUIRED'?'blocked':'retry',code==='PROVIDER_AUTH_REQUIRED'?code:code==='PROVIDER_RATE_LIMITED'?code:signal?.aborted?'SYNC_DEADLINE':'SYNC_OUTCOME_UNVERIFIED',evidence);}
}
