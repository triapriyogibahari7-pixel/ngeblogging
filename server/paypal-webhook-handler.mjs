import { PLANS } from "./billing-handler.mjs";

function json(status, body, requestId = "") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

function config(env) {
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) throw Object.assign(new Error("Penyimpanan webhook belum dikonfigurasi."), { status:503,code:"BILLING_STORAGE_REQUIRED" });
  return { url,serviceKey };
}

async function admin(env, path, options = {}) {
  const { url,serviceKey } = config(env);
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey:serviceKey,
      authorization:`Bearer ${serviceKey}`,
      "content-type":"application/json",
      ...(options.prefer ? { prefer:options.prefer } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error("Database webhook belum dapat diproses."),{status:503,code:"WEBHOOK_DATABASE_ERROR"});
  return payload;
}

function paypalBase(env) {
  return String(env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function paypalToken(env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw Object.assign(new Error("Credential PayPal belum tersedia."),{status:503,code:"PAYPAL_CONFIG_REQUIRED"});
  const response = await fetch(`${paypalBase(env)}/v1/oauth2/token`,{
    method:"POST",
    headers:{authorization:`Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,"content-type":"application/x-www-form-urlencoded"},
    body:"grant_type=client_credentials",
  });
  const payload = await response.json().catch(()=>({}));
  if(!response.ok||!payload.access_token)throw Object.assign(new Error("Autentikasi PayPal webhook gagal."),{status:502,code:"PAYPAL_AUTH_FAILED"});
  return payload.access_token;
}

async function verifySignature(request, env, event) {
  if (!env.PAYPAL_WEBHOOK_ID) throw Object.assign(new Error("PAYPAL_WEBHOOK_ID belum dikonfigurasi."),{status:503,code:"PAYPAL_WEBHOOK_CONFIG_REQUIRED"});
  const token=await paypalToken(env);
  const response=await fetch(`${paypalBase(env)}/v1/notifications/verify-webhook-signature`,{
    method:"POST",
    headers:{authorization:`Bearer ${token}`,"content-type":"application/json","paypal-request-id":`webhook-${event.id}`},
    body:JSON.stringify({
      transmission_id:request.headers.get("paypal-transmission-id"),
      transmission_time:request.headers.get("paypal-transmission-time"),
      cert_url:request.headers.get("paypal-cert-url"),
      auth_algo:request.headers.get("paypal-auth-algo"),
      transmission_sig:request.headers.get("paypal-transmission-sig"),
      webhook_id:env.PAYPAL_WEBHOOK_ID,
      webhook_event:event,
    }),
  });
  const payload=await response.json().catch(()=>({}));
  return response.ok&&payload.verification_status==="SUCCESS";
}

async function findOrder(env,{captureId,orderId}) {
  if(captureId){
    const byCapture=await admin(env,`billing_orders?provider_capture_id=eq.${encodeURIComponent(captureId)}&select=*&limit=1`);
    if(byCapture?.[0])return byCapture[0];
  }
  if(orderId){
    const byOrder=await admin(env,`billing_orders?provider_order_id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`);
    if(byOrder?.[0])return byOrder[0];
  }
  return null;
}

async function patchOrder(env,providerOrderId,values,filter="") {
  const rows=await admin(env,`billing_orders?provider_order_id=eq.${encodeURIComponent(providerOrderId)}${filter}&select=*`,{
    method:"PATCH",prefer:"return=representation",body:JSON.stringify({...values,updated_at:new Date().toISOString()}),
  });
  return rows?.[0]||null;
}

async function webhookEvent(env,event,order,captureId) {
  const existing=await admin(env,`billing_webhook_events?provider=eq.paypal&provider_event_id=eq.${encodeURIComponent(event.id)}&select=id,status&limit=1`);
  if(existing?.[0])return {duplicate:true,row:existing[0]};
  const rows=await admin(env,"billing_webhook_events",{
    method:"POST",prefer:"return=representation",body:JSON.stringify({provider:"paypal",provider_event_id:event.id,event_type:event.event_type,status:"received",provider_order_id:order?.provider_order_id||null,provider_capture_id:captureId||null,payload:{create_time:event.create_time,summary:event.summary,resource_status:event.resource?.status,resource_type:event.resource?.resource_type}}),
  });
  return {duplicate:false,row:rows?.[0]||null};
}

async function finishEvent(env,id,status,errorMessage=null) {
  if(!id)return;
  await admin(env,`billing_webhook_events?id=eq.${id}`,{method:"PATCH",prefer:"return=minimal",body:JSON.stringify({status,error_message:errorMessage,processed_at:new Date().toISOString()})});
}

function amountMatches(order,resource) {
  return String(resource?.amount?.currency_code||"").toUpperCase()===String(order.currency||"").toUpperCase()&&Number(resource?.amount?.value)===Number(order.amount);
}

async function activate(env,order,details) {
  if(order.status==="completed"&&order.plan_expires_at)return order;
  const lock=await patchOrder(env,order.provider_order_id,{status:"processing_activation",provider_capture_id:details.captureId||order.provider_capture_id,provider_event_id:details.eventId||order.provider_event_id,payer_email:details.payerEmail||order.payer_email,paid_at:details.paidAt||new Date().toISOString(),provider_payload:{...(order.provider_payload||{}),webhook_type:details.eventType}},"&status=in.(created,approved,pending,payer_action_required,activation_pending,failed)");
  if(!lock){
    const current=await findOrder(env,{orderId:order.provider_order_id});
    return current||order;
  }
  const plan=PLANS[lock.plan];
  if(!plan)throw Object.assign(new Error("Paket pada transaksi tidak valid."),{status:409,code:"INVALID_STORED_PLAN"});
  const profileRows=await admin(env,`profiles?id=eq.${encodeURIComponent(lock.user_id)}&select=plan,plan_expires_at&limit=1`);
  const currentExpiry=profileRows?.[0]?.plan_expires_at?new Date(profileRows[0].plan_expires_at).getTime():0;
  const base=Math.max(Date.now(),Number.isFinite(currentExpiry)?currentExpiry:0);
  const expiresAt=new Date(base+plan.durationDays*86400000).toISOString();
  try{
    await admin(env,`profiles?id=eq.${encodeURIComponent(lock.user_id)}`,{method:"PATCH",prefer:"return=minimal",body:JSON.stringify({plan:plan.tier,plan_expires_at:expiresAt,updated_at:new Date().toISOString()})});
    return await patchOrder(env,lock.provider_order_id,{status:"completed",plan_expires_at:expiresAt,failure_code:null,failure_message:null});
  }catch(error){
    await patchOrder(env,lock.provider_order_id,{status:"activation_pending",failure_code:error.code||"ACTIVATION_PENDING",failure_message:error.message});
    throw error;
  }
}

export async function handlePayPalWebhook(request,env,requestId=crypto.randomUUID()) {
  try{
    if(request.method!=="POST")return json(405,{error:"Metode webhook tidak didukung."},requestId);
    const event=await request.json().catch(()=>null);
    if(!event?.id||!event?.event_type)return json(400,{error:"Payload webhook PayPal tidak valid."},requestId);
    if(!(await verifySignature(request,env,event)))return json(401,{error:"Tanda tangan webhook PayPal tidak valid."},requestId);
    const resource=event.resource||{};
    const captureId=event.event_type.startsWith("PAYMENT.CAPTURE")?resource.id||null:null;
    const orderId=resource.supplementary_data?.related_ids?.order_id||(event.event_type.startsWith("CHECKOUT.ORDER")?resource.id:null);
    const order=await findOrder(env,{captureId,orderId});
    const storedEvent=await webhookEvent(env,event,order,captureId);
    if(storedEvent.duplicate)return json(200,{received:true,duplicate:true},requestId);
    try{
      if(!order){await finishEvent(env,storedEvent.row?.id,"ignored");return json(200,{received:true,ignored:true},requestId);}
      if(event.event_type==="PAYMENT.CAPTURE.COMPLETED"){
        if(!amountMatches(order,resource))throw Object.assign(new Error("Nominal webhook tidak cocok dengan invoice."),{status:409,code:"AMOUNT_MISMATCH"});
        await activate(env,order,{captureId:resource.id,eventId:event.id,eventType:event.event_type,paidAt:resource.create_time,payerEmail:resource.payee?.email_address});
      }else if(event.event_type==="CHECKOUT.ORDER.APPROVED"){
        await patchOrder(env,order.provider_order_id,{status:"approved",provider_event_id:event.id});
      }else if(["PAYMENT.CAPTURE.DENIED","PAYMENT.CAPTURE.DECLINED","CHECKOUT.PAYMENT-APPROVAL.REVERSED"].includes(event.event_type)){
        await patchOrder(env,order.provider_order_id,{status:"failed",provider_event_id:event.id,failure_code:resource.status_details?.reason||event.event_type,failure_message:event.summary||"Pembayaran ditolak."});
      }else if(event.event_type==="PAYMENT.CAPTURE.REFUNDED"){
        await patchOrder(env,order.provider_order_id,{status:"refunded",provider_event_id:event.id,provider_capture_id:captureId||order.provider_capture_id,refunded_at:resource.create_time||new Date().toISOString()});
      }
      await finishEvent(env,storedEvent.row?.id,"processed");
      return json(200,{received:true},requestId);
    }catch(error){await finishEvent(env,storedEvent.row?.id,"failed",error.message);throw error;}
  }catch(error){
    console.error("PayPal webhook failed",{requestId,code:error?.code,name:error?.name});
    return json(error.status||500,{code:error.code||"PAYPAL_WEBHOOK_ERROR",error:error.message||"Webhook PayPal belum dapat diproses."},requestId);
  }
}
