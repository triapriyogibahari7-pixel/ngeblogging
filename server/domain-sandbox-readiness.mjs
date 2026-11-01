export function domainSandboxReadiness(env={}){
 const checks=[];
 for(const [id,name] of [['quote','DOMAIN_QUOTE_PREVIEW_ENABLED'],['order','DOMAIN_ORDER_PREVIEW_ENABLED'],['checkout','DOMAIN_CHECKOUT_PREVIEW_ENABLED'],['notification','DOMAIN_PAYMENT_NOTIFICATION_PREVIEW_ENABLED']]){
  const v=env[name];checks.push({id,status:v==='true'?'enabled':v==='false'?'disabled':v===undefined?'missing':'invalid'});
 }
 checks.push({id:'environment',status:env.DOMAIN_ORDER_ENV==='sandbox'?'sandbox':env.DOMAIN_ORDER_ENV===undefined?'missing':'invalid'});
 const key=env.DOMAIN_MIDTRANS_SANDBOX_SERVER_KEY;
 checks.push({id:'sandbox_key',status:typeof key!=='string'||!key?'missing':/^SB-Mid-server-[A-Za-z0-9_-]{10,200}$/.test(key)?'configured':'invalid'});
 checks.push({id:'service_role',status:typeof env.SUPABASE_SERVICE_ROLE_KEY==='string'&&!!env.SUPABASE_SERVICE_ROLE_KEY?'configured':'missing'});
 let pricing='missing';const raw=env.DOMAIN_PRICING_SNAPSHOT_JSON;
 if(typeof raw==='string'&&raw){pricing='invalid';try{if(raw.length<=131072){const p=JSON.parse(raw);if(p&&typeof p==='object'&&!Array.isArray(p))pricing='configured';}}catch{}}
 checks.push({id:'pricing_snapshot',status:pricing});
 return {scope:'preview_runtime_configuration_only',checks,configurationGateSatisfied:checks.every(c=>['enabled','sandbox','configured'].includes(c.status)),readyForPayments:false,purchaseAllowed:false,checkoutCreated:false,registrationStarted:false,verificationRequired:['pricing_and_fx','midtrans_credentials','database_rpc_access','sandbox_payment_delivery']};
}
