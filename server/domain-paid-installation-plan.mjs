const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i,ORDER=/^DOM-[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const ROOT='/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/registrations/';
const uuid=value=>typeof value==='string'&&UUID.test(value);
const time=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
// Input must come from trusted backend database reads, never browser evidence.
// A plan is not a claim, permission to mutate, or installation confirmation.
export async function planRegisteredDomainInstallation(evidence,{now=Date.now()}={}){
 const blocked=code=>Object.freeze({eligible:false,code,installationStarted:false,installationConfirmed:false,purchaseAllowed:false});
 if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000)return blocked('INSTALLATION_CLOCK_UNVERIFIED');
 const {order:o,registration:r,binding:b,site:s,quote:q,paymentEvents:events,domains}=evidence||{};
 if(!o||typeof o.order_id!=='string'||!ORDER.test(o.order_id)||!uuid(o.user_id)||!uuid(o.quote_id)||o.environment!=='production'||o.currency!=='IDR'||!Number.isSafeInteger(o.amount_idr)||o.amount_idr<1||o.amount_idr>1000000000000)return blocked('INSTALLATION_ORDER_UNVERIFIED');
 if(o.payment_state!=='paid'||o.registration_state!=='registered'||o.review_reason!==null||!time(o.paid_at)||!time(o.registered_at)||Date.parse(o.paid_at)>now+300000||Date.parse(o.registered_at)>now+300000||typeof o.midtrans_transaction_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(o.midtrans_transaction_id))return blocked('INSTALLATION_CONFIRMATIONS_REQUIRED');
 if(!Array.isArray(events)||events.length<1||events.length>10||!events.some(e=>e?.order_id===o.order_id&&e.environment==='production'&&e.provider==='midtrans'&&e.currency==='IDR'&&e.amount_idr===o.amount_idr&&e.transaction_id===o.midtrans_transaction_id&&e.verified_state==='paid'))return blocked('INSTALLATION_PAYMENT_EVIDENCE_REQUIRED');
 if(!b||b.order_id!==o.order_id||b.user_id!==o.user_id||b.environment!=='production'||!uuid(b.site_id))return blocked('INSTALLATION_SITE_BINDING_REQUIRED');
 if(!s||s.id!==b.site_id||s.owner_id!==o.user_id)return blocked('INSTALLATION_SITE_OWNER_REQUIRED');
 if(!q||q.id!==o.quote_id||q.user_id!==o.user_id||q.environment!=='production'||q.currency!=='IDR'||q.sale_price_idr!==o.amount_idr||q.provider_id!=='cloudflare'||q.operation!=='registration'||q.years!==1||typeof q.domain!=='string'||q.domain.length>253||q.domain.split('.').length!==2||q.domain.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))||q.domain==='ngeblogging.com')return blocked('INSTALLATION_QUOTE_UNVERIFIED');
 const ref=ROOT+q.domain;
 const orderRef=ref;
 if(!r||r.order_id!==o.order_id||r.user_id!==o.user_id||r.quote_id!==o.quote_id||r.amount_idr!==o.amount_idr||r.domain!==q.domain||r.state!=='succeeded'||r.provider_state!=='succeeded'||!uuid(r.attempt_id)||typeof r.evidence_sha256!=='string'||!HASH.test(r.evidence_sha256)||r.provider_resource_ref!==ref||o.registrar_domain_ref!==orderRef||!time(r.post_started_at)||!time(r.provider_updated_at)||Date.parse(r.post_started_at)>now+300000||Date.parse(r.provider_updated_at)>now+300000||Date.parse(o.registered_at)<Date.parse(r.post_started_at)-300000)return blocked('INSTALLATION_REGISTRATION_EVIDENCE_REQUIRED');
 if(!Array.isArray(domains)||domains.length>1||domains.some(d=>!d||!uuid(d.id)||!uuid(d.site_id)||d.hostname!==q.domain))return blocked('INSTALLATION_DOMAIN_STATE_UNVERIFIED');
 if(domains.some(d=>d.site_id!==b.site_id||d.provider!=='cloudflare-full-zone'))return blocked('INSTALLATION_DOMAIN_CONFLICT');
 return Object.freeze({eligible:true,code:'DOMAIN_INSTALLATION_PLAN_READY',action:domains.length?'reconcile_existing':'prepare_mapping',orderId:o.order_id,userId:o.user_id,siteId:b.site_id,domain:q.domain,registrationRef:ref,requiresFreshOwnershipCheck:true,requiresDomainReservation:true,requiresZoneAccountVerification:true,requiresDnsHttpsVerification:true,installationStarted:false,installationConfirmed:false,purchaseAllowed:false});
}
