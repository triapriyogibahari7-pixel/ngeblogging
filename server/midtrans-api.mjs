const out=(status,body)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
export const paths=new Set(["/api/billing/midtrans/config","/api/billing/midtrans/create","/api/billing/midtrans/orders","/api/billing/midtrans/webhook"]);
function config(env){let prices={};try{prices=JSON.parse(env.MIDTRANS_PLAN_PRICES_JSON||"{}");}catch{}const labels={pro_monthly:"Nara Pro Bulanan",pro_yearly:"Nara Pro Tahunan",max_monthly:"Nara Max Bulanan",max_yearly:"Nara Max Tahunan"};return Object.keys(labels).filter(id=>Number.isSafeInteger(prices[id])&&prices[id]>0&&prices[id]<=100000000).map(id=>({id,label:labels[id],amount:prices[id],currency:"IDR",durationDays:id.endsWith("_monthly")?31:366}));}
export function stateOf(s){if(["refund","partial_refund","chargeback","partial_chargeback"].includes(s.transaction_status))return "review_required";if(String(s.status_code)==="200"&&(!s.fraud_status||s.fraud_status==="accept")&&(s.transaction_status==="settlement"||(s.transaction_status==="capture"&&s.fraud_status==="accept")))return "paid";return ["deny","cancel","expire","failure"].includes(s.transaction_status)?"failed":"pending";}
function amount(v){const s=String(v);if(!/^\d{1,12}(\.\d{1,2})?$/.test(s))throw Error("INVALID_AMOUNT");const [a,b=""]=s.split(".");return BigInt(a)*100n+BigInt(b.padEnd(2,"0"));}
async function hash(algorithm,value){const d=await crypto.subtle.digest(algorithm,new TextEncoder().encode(value));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function bodyOf(request){const r=request.body?.getReader();if(!r)throw Error("INVALID_BODY");const chunks=[];let n=0;while(true){const v=await r.read();if(v.done)break;n+=v.value.length;if(n>65536){await r.cancel();throw Error("BODY_TOO_LARGE");}chunks.push(v.value);}const b=new Uint8Array(n);let i=0;for(const c of chunks){b.set(c,i);i+=c.length;}return JSON.parse(new TextDecoder().decode(b));}
export async function handleMidtrans(request,env,{fetchImpl=fetch}={}){
 const path=new URL(request.url).pathname;
 const plans=config(env);
 const configured=Boolean(["sandbox","production"].includes(env.MIDTRANS_ENV)&&env.MIDTRANS_SERVER_KEY&&env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY&&env.SUPABASE_SERVICE_ROLE_KEY);
 if(path.endsWith("/config")&&request.method==="GET")return out(200,{brand:"Ngeblogging",provider:"midtrans",ready:configured&&plans.length>0,environment:env.MIDTRANS_ENV==="production"?"production":"sandbox",plans});
 if(!paths.has(path))return out(404,{error:"NOT_FOUND"});
 if(!configured)return out(503,{error:"MIDTRANS_NOT_CONFIGURED"});
 if(!((request.method==="POST"&&(/\/(create|webhook)$/.test(path)))||(request.method==="GET"&&path.endsWith("/orders"))))return out(405,{error:"METHOD_NOT_ALLOWED"});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 const db=env.SUPABASE_URL.replace(/\/$/,"");
 async function call(url,options={}){const r=await fetchImpl(url,{...options,signal:controller.signal});let value;try{value=await r.json();}catch{value=null;}if(!r.ok)throw Error("UPSTREAM_UNAVAILABLE");return value;}
 const admin={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,"content-type":"application/json"};
 const rest=(path,options={})=>call(`${db}/rest/v1/${path}`,{...options,headers:{...admin,...options.headers}});
 try{
 if(path.endsWith("/webhook")){
  let p;try{p=await bodyOf(request);if(!p||typeof p.order_id!=="string"||!/^[A-Za-z0-9_-]{1,50}$/.test(p.order_id)||!/^\d{3}$/.test(String(p.status_code))||typeof p.gross_amount!=="string")throw Error();amount(p.gross_amount);}catch{return out(400,{error:"INVALID_PAYLOAD"});}
  const expected=await hash("SHA-512",`${p.order_id}${p.status_code}${p.gross_amount}${env.MIDTRANS_SERVER_KEY}`);
  if(typeof p.signature_key!=="string"||!/^[a-f0-9]{128}$/i.test(p.signature_key))return out(401,{error:"INVALID_SIGNATURE"});
  let diff=0;for(let i=0;i<128;i++)diff|=expected.charCodeAt(i)^p.signature_key.toLowerCase().charCodeAt(i);if(diff)return out(401,{error:"INVALID_SIGNATURE"});
  const base=env.MIDTRANS_ENV==="production"?"https://api.midtrans.com":"https://api.sandbox.midtrans.com";
  const s=await call(`${base}/v2/${encodeURIComponent(p.order_id)}/status`,{headers:{authorization:`Basic ${btoa(env.MIDTRANS_SERVER_KEY+":")}`,accept:"application/json"}});
  if(s.order_id!==p.order_id||s.currency!=="IDR"||typeof s.transaction_id!=="string"||!s.transaction_id||s.transaction_id.length>128||amount(s.gross_amount)!==amount(p.gross_amount))return out(409,{error:"TRANSACTION_MISMATCH"});
  const applied=await rest("rpc/nara_apply_midtrans",{method:"POST",body:JSON.stringify({p_order:s.order_id,p_transaction:s.transaction_id,p_amount:String(s.gross_amount),p_environment:env.MIDTRANS_ENV,p_state:stateOf(s)})});
  return applied?.ok===true?out(200,{received:true,...applied}):out(409,{error:applied?.error||"ORDER_MISMATCH"});
 }
 const authorization=request.headers.get("authorization")||"";
 if(!/^Bearer \S+$/.test(authorization))return out(401,{error:"AUTH_REQUIRED"});
 const authResponse=await fetchImpl(`${db}/auth/v1/user`,{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization},signal:controller.signal});
 if(!authResponse.ok)return out(authResponse.status===401||authResponse.status===403?401:503,{error:"SESSION_VERIFICATION_FAILED"});
 const user=await authResponse.json();if(!/^[a-f0-9-]{36}$/i.test(user?.id||""))return out(401,{error:"INVALID_SESSION"});
 const fields="order_id,plan_id,amount,status,activated_at,expires_at,created_at,review_required";
 if(path.endsWith("/orders"))return out(200,{orders:await rest(`nara_midtrans_orders?user_id=eq.${encodeURIComponent(user.id)}&environment=eq.${env.MIDTRANS_ENV}&select=${fields}&order=created_at.desc&limit=30`)});
 let b;try{b=await bodyOf(request);}catch{return out(400,{error:"INVALID_BODY"});}
 if(!b||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(b.idempotencyKey||""))return out(400,{error:"INVALID_REQUEST"});
 const plan=plans.find(p=>p.id===b.planId);if(!plan)return out(503,{error:"PLAN_PRICE_NOT_CONFIGURED"});
 const id="NARA-"+(await hash("SHA-256",`${env.MIDTRANS_ENV}:${user.id}:${b.idempotencyKey}`)).slice(0,40);
 await rest("nara_midtrans_orders?on_conflict=order_id",{method:"POST",headers:{prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({order_id:id,user_id:user.id,plan_id:plan.id,duration_days:plan.durationDays,amount:plan.amount,environment:env.MIDTRANS_ENV})});
 const order=(await rest(`nara_midtrans_orders?order_id=eq.${id}&select=*`))?.[0];
 if(!order||order.user_id!==user.id||order.plan_id!==plan.id||order.environment!==env.MIDTRANS_ENV)return out(409,{error:"IDEMPOTENCY_CONFLICT"});
 if(order.status!=="pending")return out(409,{error:"ORDER_ALREADY_PROCESSED",orderId:id,status:order.status});
 const base=env.MIDTRANS_ENV==="production"?"https://app.midtrans.com":"https://app.sandbox.midtrans.com";
 function validUrl(v){try{const u=new URL(v);return u.origin===base&&!u.username&&!u.password?u.href:null;}catch{return null;}}
 if(order.checkout_url){const u=validUrl(order.checkout_url);if(!u)return out(503,{error:"INVALID_STORED_CHECKOUT"});return out(200,{orderId:id,checkoutUrl:u,reused:true});}
 const n=Number(order.amount);if(!Number.isSafeInteger(n)||n<=0||n>100000000)return out(409,{error:"INVALID_STORED_PRICE"});
 const snap=await call(`${base}/snap/v1/transactions`,{method:"POST",headers:{authorization:`Basic ${btoa(env.MIDTRANS_SERVER_KEY+":")}`,"content-type":"application/json"},body:JSON.stringify({transaction_details:{order_id:id,gross_amount:n},item_details:[{id:plan.id,price:n,quantity:1,name:plan.label}],customer_details:{email:user.email||undefined}})});
 const u=validUrl(snap?.redirect_url);if(!u)return out(502,{error:"INVALID_CHECKOUT_URL",orderId:id});
 await rest(`nara_midtrans_orders?order_id=eq.${id}`,{method:"PATCH",headers:{prefer:"return=minimal"},body:JSON.stringify({checkout_url:u})});
 return out(200,{orderId:id,checkoutUrl:u});
 }catch{return out(503,{error:"PAYMENT_RETRY_OR_RECONCILIATION_REQUIRED"});}finally{clearTimeout(timer);}
}
