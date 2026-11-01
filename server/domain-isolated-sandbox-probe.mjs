export const PREVIEW_ORIGIN='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
export const PROBE_AMOUNT_IDR=10000;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ID=/^SBPROBE-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const fail=code=>{throw Object.assign(new Error(code),{code});};
function keyFor(env){
 if(env?.DOMAIN_ORDER_ENV!=='sandbox')fail('SANDBOX_REQUIRED');
 if(env.DOMAIN_SANDBOX_SNAP_PROBE_ENABLED!=='true')fail('PROBE_DISABLED');
 const key=env.DOMAIN_MIDTRANS_SANDBOX_SERVER_KEY;
 if(typeof key!=='string'||!/^SB-Mid-server-[A-Za-z0-9_-]{10,200}$/.test(key))fail('SANDBOX_KEY_REQUIRED');
 return key;
}
function probeId(id){if(typeof id!=='string'||!ID.test(id))fail('INVALID_PROBE_ID');return id;}
function scope(id){return {scope:'isolated_sandbox_probe',probeId:id,environment:'sandbox',currency:'IDR',amountIdr:PROBE_AMOUNT_IDR,customerQuoteCreated:false,domainOrderRecorded:false,registrationStarted:false,costBasisVerified:false};}
export function buildIsolatedSandboxSnapRequest({env,origin,attemptId,now=Date.now()}){
 const key=keyFor(env);
 if(origin!==PREVIEW_ORIGIN)fail('PREVIEW_REQUIRED');
 if(typeof attemptId!=='string'||!UUID.test(attemptId))fail('INVALID_ATTEMPT_ID');
 if(!Number.isSafeInteger(now)||now<0||now>4102444800000)fail('INVALID_CLOCK');
 const id='SBPROBE-'+attemptId.toLowerCase();
 const start=new Date(Math.floor(now/1000)*1000+25200000).toISOString().slice(0,19).replace('T',' ')+' +0700';
 const body={transaction_details:{order_id:id,gross_amount:PROBE_AMOUNT_IDR},item_details:[{id:'sandbox-probe-only',price:PROBE_AMOUNT_IDR,quantity:1,name:'SIMULASI SANDBOX - BUKAN PEMBELIAN DOMAIN'}],credit_card:{secure:true},customer_imposed_payment_fee:{enable:false},expiry:{start_time:start,unit:'minutes',duration:15},callbacks:{finish:origin+'/assets/registrar-diagnostic-stage6'}};
 const request=new Request('https://app.sandbox.midtrans.com/snap/v1/transactions',{method:'POST',redirect:'manual',credentials:'omit',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json','content-type':'application/json','X-Override-Notification':origin+'/api/admin/commerce/domains/sandbox-snap-probe/notification'},body:JSON.stringify(body)});
 return {...scope(id),request};
}
export function validateIsolatedSandboxSnapResult({status,data,probeId:id}){
 probeId(id);
 if(status!==201||typeof data?.token!=='string'||!/^[A-Za-z0-9_-]{10,200}$/.test(data.token)||!['https://app.sandbox.midtrans.com/snap/v2/vtweb/'+data.token,'https://app.sandbox.midtrans.com/snap/v4/redirection/'+data.token].includes(data.redirect_url))fail('SANDBOX_SNAP_RESULT_UNCLEAR');
 return {...scope(id),checkoutUrl:data.redirect_url,paymentConfirmed:false};
}
export function buildIsolatedSandboxStatusRequest({env,probeId:id}){
 const key=keyFor(env);probeId(id);
 return new Request('https://api.sandbox.midtrans.com/v2/'+encodeURIComponent(id)+'/status',{method:'GET',redirect:'manual',credentials:'omit',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'}});
}
export function classifyIsolatedSandboxStatus({status,data,probeId:id}){
 probeId(id);
 const result=state=>({...scope(id),state,paymentConfirmed:state==='paid'});
 if([200,404].includes(status)&&data?.status_code==='404')return result('not_yet_visible');
 if(status!==200||data?.order_id!==id||data.currency!=='IDR'||typeof data.gross_amount!=='string'||!/^10000(?:\.0{1,2})?$/.test(data.gross_amount)||typeof data.transaction_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(data.transaction_id))fail('PROBE_STATUS_UNVERIFIED');
 if((data.refund_amount!==undefined&&(typeof data.refund_amount!=='string'||!/^0(?:\.0{1,2})?$/.test(data.refund_amount)))||(data.refunds!==undefined&&(!Array.isArray(data.refunds)||data.refunds.length)))return result('review_required');
 if(['pending','authorize','deny','cancel','expire','failure'].includes(data.transaction_status))return result(data.transaction_status);
 if(data.status_code!=='200'||!['settlement','capture'].includes(data.transaction_status)||typeof data.payment_type!=='string'||!/^[a-z0-9_]{2,40}$/.test(data.payment_type)||(data.fraud_status!==undefined&&data.fraud_status!=='accept')||(data.transaction_status==='capture'&&(data.payment_type!=='credit_card'||data.fraud_status!=='accept')))return result('review_required');
 return result('paid');
}
