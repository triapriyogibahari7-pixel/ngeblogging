import { requireConnectorAdminIdentity } from './nara-connector-admin-identity.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const SITE=/\b(ngeblogging|situs saya|situs aktif|website saya|blog saya|artikel saya|domain saya|editor situs|seo situs)\b/i;
export function prepareOwnerInput(input,user){
 try{requireConnectorAdminIdentity(user);}catch{return input;}
 if(!input||typeof input!=='object'||Array.isArray(input)||(input.model!=='nara-max'&&input.intelligence!=='xhigh'))return input;
 const message=String(input.message||'').trim();
 const attachments=Array.isArray(input.attachments)?input.attachments:[];
 if(!message||message.length>7400)return input;
 const smoke=!attachments.length&&/^(?:tes|test|testing|ping|halo|hai|hello)(?:[.!?\s]*)$/i.test(message);
 const site=SITE.test(message);
 const evidence=input.context&&typeof input.context==='object'?input.context.naraConnectorEvidence:null;
 const context=smoke?null:site?input.context:evidence?{naraConnectorEvidence:evidence}:null;
 const directive=smoke?'Jawab pesan tes atau sapaan ini secara singkat. Jangan mengaudit situs, menghitung dokumen, menawarkan SEO, atau menyimpulkan status konektor maupun riset karena tidak diminta.':site?'Jawab tugas situs yang secara eksplisit diminta.':'Jawab permintaan di atas sebagai tugas umum, bukan audit situs atau saran artikel/SEO. Jangan mengalihkan topik. Jangan menyimpulkan konektor tidak terhubung dari completeProjectScan:false; gunakan hanya bukti konektor yang tersedia jika relevan.';
 return {...input,message:message+'\n\n'+directive,context,...(smoke?{history:[]}:{}),...(smoke?{connectorReads:undefined}:{})};
}
export async function filterOwnerInputEvent(event,env,fetcher=fetch){
 if(String(event.httpMethod).toUpperCase()!=='POST'||typeof event.body!=='string')return event;
 let input;try{input=JSON.parse(event.body);}catch{return event;}
 if(!input||typeof input!=='object'||Array.isArray(input)||(input.model!=='nara-max'&&input.intelligence!=='xhigh'))return event;
 const authorization=event.headers?.authorization||event.headers?.Authorization||'';
 if(!/^Bearer [^\s]{1,8192}$/.test(authorization))return event;
 if(String(env.SUPABASE_URL||'').replace(/\/$/,'')!==BASE||!env.SUPABASE_PUBLISHABLE_KEY)return event;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetcher(BASE+'/auth/v1/user',{headers:{authorization,apikey:env.SUPABASE_PUBLISHABLE_KEY},redirect:'error',signal:controller.signal});
  if(!response.ok||!response.body||!response.headers.get('content-type')?.includes('application/json'))return event;
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>16384){await reader.cancel();return event;}chunks.push(next.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const user=JSON.parse(new TextDecoder().decode(bytes)),prepared=prepareOwnerInput(input,user);
  return prepared===input?event:{...event,body:JSON.stringify(prepared)};
 }catch{return event;}finally{clearTimeout(timer);}
}
