const DEFAULT_SUPABASE_URL = "https://polvmlrhqoiflumibfqs.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jqz6qDzX4IKSunPoDT5zyQ_sk6EK4W-";
const DEFAULT_WORKERS_IMAGE_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";
const MAX_GENERATED_IMAGE_BYTES = 50 * 1024 * 1024;

function json(status, body, requestId = "") {
  return new Response(JSON.stringify(body), { status, headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "x-content-type-options":"nosniff", ...(requestId ? {"x-request-id":requestId} : {}) } });
}

function bearer(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function normalizeSupabaseUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && /^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname) ? url.origin : "";
  } catch {
    return "";
  }
}

function publishableKey(value) {
  const key = String(value || "").trim();
  return key.startsWith("sb_publishable_") || key.split(".").length === 3 ? key : "";
}

function supabaseConfig(env) {
  return {
    url:normalizeSupabaseUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL),
    key:publishableKey(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY),
  };
}

async function verify(request, env) {
  const token = bearer(request);
  const {url,key} = supabaseConfig(env);
  if (!token) throw Object.assign(new Error("Silakan masuk untuk membuat gambar."),{status:401,code:"IMAGE_SESSION_REQUIRED"});
  if (!url || !key) throw Object.assign(new Error("Layanan autentikasi gambar belum tersedia."),{status:503,code:"IMAGE_AUTH_CONFIG_MISSING"});
  const userResponse = await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:`Bearer ${token}`}});
  if (!userResponse.ok) throw Object.assign(new Error("Sesi pengguna tidak valid. Silakan masuk kembali."),{status:401,code:"IMAGE_SESSION_INVALID"});
  const user = await userResponse.json();
  const profileResponse = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=plan,plan_expires_at`,{headers:{apikey:key,authorization:`Bearer ${token}`}});
  const profile = profileResponse.ok ? (await profileResponse.json())?.[0] : null;
  const pro = profile?.plan === "pro" && (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date());
  return {token,user,pro,url,key};
}

async function verifySiteAccess(session, siteId) {
  const response = await fetch(`${session.url}/rest/v1/sites?id=eq.${encodeURIComponent(siteId)}&select=id`, {
    headers: { apikey:session.key, authorization:`Bearer ${session.token}` },
  });
  if (!response.ok) throw Object.assign(new Error("Akses situs belum dapat diverifikasi."),{status:503,code:"SITE_ACCESS_UNAVAILABLE"});
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) throw Object.assign(new Error("Anda tidak memiliki akses ke situs aktif ini."),{status:403,code:"SITE_ACCESS_DENIED"});
}

async function consumeImageQuota(session, model) {
  const response = await fetch(`${session.url}/rest/v1/rpc/consume_nara_quota`, {
    method:"POST",
    headers:{apikey:session.key,authorization:`Bearer ${session.token}`,"content-type":"application/json"},
    body:JSON.stringify({requested_model:model,requested_intelligence:"standard"}),
  });
  if (!response.ok) throw Object.assign(new Error("Batas penggunaan generator gambar belum dapat diperiksa."),{status:503,code:"IMAGE_QUOTA_UNAVAILABLE"});
  const payload = await response.json();
  const quota = Array.isArray(payload) ? payload[0] : payload;
  if (!quota?.allowed) {
    const planRequired = quota?.reason === "PLAN_REQUIRED";
    throw Object.assign(new Error(planRequired ? "Pilihan gambar ini memerlukan Nara Pro." : "Batas pembuatan gambar hari ini sudah tercapai."),{status:planRequired?403:429,code:planRequired?"PLAN_REQUIRED":"DAILY_LIMIT"});
  }
  return quota;
}

function qwenReady(env) {
  return Boolean((env.QWEN_API_KEY || env.DASHSCOPE_API_KEY) && String(env.QWEN_WORKSPACE_ID || "").trim());
}

function workersReady(env) {
  return Boolean(env?.AI && typeof env.AI.run === "function");
}

function workspaceEndpoint(env) {
  const workspaceId = String(env.QWEN_WORKSPACE_ID || "").trim();
  const region = String(env.QWEN_REGION || "singapore").toLowerCase();
  if (!workspaceId || !/^[a-z0-9-]+$/i.test(workspaceId)) throw Object.assign(new Error("Workspace generator utama belum dikonfigurasi."),{status:503});
  if (region === "singapore") return `https://${workspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`;
  if (region === "beijing") return `https://${workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`;
  throw Object.assign(new Error("Region generator gambar belum didukung."),{status:503});
}

function safeName(prompt) {
  const slug = String(prompt || "gambar-nara").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60);
  return slug || "gambar-nara";
}

function decodeBase64(value) {
  const binary = atob(String(value || "").replace(/^data:image\/[^;]+;base64,/i, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function normalizeWorkersImage(output) {
  if (output instanceof ReadableStream) return new Response(output).arrayBuffer();
  if (output instanceof ArrayBuffer) return output;
  if (ArrayBuffer.isView(output)) return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
  if (typeof output === "string") return decodeBase64(output);
  if (typeof output?.image === "string") return decodeBase64(output.image);
  if (typeof output?.result?.image === "string") return decodeBase64(output.result.image);
  throw Object.assign(new Error("Format hasil gambar Workers AI belum dikenali."),{status:502,code:"WORKERS_IMAGE_FORMAT_INVALID"});
}

async function generateWithWorkers(env, prompt, size) {
  if (!workersReady(env)) throw Object.assign(new Error("Workers AI belum terhubung."),{status:503,code:"WORKERS_AI_NOT_BOUND"});
  if (size === "4K") throw Object.assign(new Error("Resolusi 4K menunggu penyedia gambar Pro. Gunakan 1K atau 2K."),{status:503,code:"IMAGE_4K_PROVIDER_REQUIRED"});
  const dimensions = size === "2K" ? 1536 : 1024;
  const model = String(env.CF_AI_IMAGE_MODEL || DEFAULT_WORKERS_IMAGE_MODEL);
  const output = await env.AI.run(model, {
    prompt,
    width:dimensions,
    height:dimensions,
    num_steps:4,
    guidance:7.5,
  });
  return { bytes:await normalizeWorkersImage(output), width:dimensions, height:dimensions, model, provider:"Cloudflare Workers AI" };
}

async function generateWithQwen(env, prompt, size, requestedModel) {
  const apiKey = env.QWEN_API_KEY || env.DASHSCOPE_API_KEY || "";
  const generation = await fetch(workspaceEndpoint(env),{
    method:"POST",
    headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},
    body:JSON.stringify({model:requestedModel,input:{messages:[{role:"user",content:[{text:prompt}]}]},parameters:{size,n:1,watermark:false,thinking_mode:true}}),
  });
  const payload = await generation.json().catch(() => ({}));
  if (!generation.ok) {
    console.error("Nara image provider failed",{status:generation.status,code:payload?.code,requestId:payload?.request_id});
    throw Object.assign(new Error("Model gambar utama belum menghasilkan hasil."),{status:502,code:"QWEN_IMAGE_UNAVAILABLE"});
  }
  const imageContent = payload?.output?.choices?.flatMap((choice) => choice?.message?.content || []).find((item) => item?.type === "image" && item?.image);
  if (!imageContent?.image) throw Object.assign(new Error("URL hasil gambar tidak ditemukan."),{status:502,code:"QWEN_IMAGE_URL_MISSING"});
  const source = await fetch(imageContent.image);
  if (!source.ok) throw Object.assign(new Error("Hasil gambar belum dapat diunduh dari penyedia."),{status:502,code:"QWEN_IMAGE_DOWNLOAD_FAILED"});
  const bytes = await source.arrayBuffer();
  const usageSize = String(payload?.usage?.size || "");
  const [width,height] = usageSize.split("*").map(Number);
  return { bytes, width:Number.isFinite(width)?width:null, height:Number.isFinite(height)?height:null, model:requestedModel, provider:"Qwen Image", usage:payload?.usage || null };
}

async function insertMetadata({url,key,token,userId,siteId,path,prompt,bytes,width,height,model,provider}) {
  const result = await fetch(`${url}/rest/v1/media_assets`,{
    method:"POST",
    headers:{apikey:key,authorization:`Bearer ${token}`,"content-type":"application/json",prefer:"return=representation"},
    body:JSON.stringify({site_id:siteId,uploaded_by:userId,bucket_id:"site-public-media",object_path:path,filename:`${safeName(prompt)}.png`,mime_type:"image/png",bytes,width,height,alt_text:prompt.slice(0,500),metadata:{kind:"image",source:"nara-image",model,provider,prompt:prompt.slice(0,2000)}}),
  });
  if (!result.ok) throw Object.assign(new Error("Metadata gambar belum dapat disimpan."),{status:503,code:"IMAGE_METADATA_FAILED"});
  return (await result.json())?.[0];
}

export function imageGenerationReady(env) {
  return qwenReady(env) || workersReady(env);
}

export async function handleNaraImage(request, env, requestId = crypto.randomUUID()) {
  try {
    if (request.method !== "POST") return json(405,{error:"Metode tidak didukung."},requestId);
    const session = await verify(request,env);
    const body = await request.json().catch(() => ({}));
    const prompt = String(body.prompt || "").trim().slice(0,3000);
    const siteId = String(body.siteId || "").trim();
    if (prompt.length < 5) return json(400,{error:"Prompt gambar minimal 5 karakter."},requestId);
    if (!/^[0-9a-f-]{36}$/i.test(siteId)) return json(400,{error:"Situs aktif tidak valid."},requestId);
    await verifySiteAccess(session,siteId);

    const size = ["1K","2K","4K"].includes(body.size) ? body.size : "1K";
    if (size === "4K" && !session.pro) return json(403,{code:"PLAN_REQUIRED",error:"Resolusi 4K memerlukan paket Pro."},requestId);
    const requestedModel = body.model === "wan2.7-image-pro" ? "wan2.7-image-pro" : "wan2.7-image";
    const selectedModel = requestedModel === "wan2.7-image-pro" && !session.pro ? "wan2.7-image" : requestedModel;
    const quota = await consumeImageQuota(session, selectedModel);

    let generated;
    if (qwenReady(env)) {
      try { generated = await generateWithQwen(env,prompt,size,selectedModel); }
      catch (error) {
        if (!workersReady(env) || size === "4K") throw error;
        generated = await generateWithWorkers(env,prompt,size);
      }
    } else {
      generated = await generateWithWorkers(env,prompt,size);
    }

    if (generated.bytes.byteLength > MAX_GENERATED_IMAGE_BYTES) throw Object.assign(new Error("Hasil gambar melebihi batas Storage proyek."),{status:413,code:"GENERATED_IMAGE_TOO_LARGE"});
    const path = `${siteId}/${session.user.id}/generated/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeName(prompt)}.png`;
    const upload = await fetch(`${session.url}/storage/v1/object/site-public-media/${path.split("/").map(encodeURIComponent).join("/")}`,{
      method:"POST",
      headers:{apikey:session.key,authorization:`Bearer ${session.token}`,"content-type":"image/png","cache-control":"31536000","x-upsert":"false"},
      body:generated.bytes,
    });
    if (!upload.ok) throw Object.assign(new Error("Gambar berhasil dibuat tetapi belum dapat disimpan ke pustaka media."),{status:503,code:"IMAGE_STORAGE_FAILED"});
    const asset = await insertMetadata({url:session.url,key:session.key,token:session.token,userId:session.user.id,siteId,path,prompt,bytes:generated.bytes.byteLength,width:generated.width,height:generated.height,model:generated.model,provider:generated.provider});
    const publicUrl = `${session.url}/storage/v1/object/public/site-public-media/${path.split("/").map(encodeURIComponent).join("/")}`;
    return json(200,{asset:{...asset,url:publicUrl,kind:"image"},model:generated.model,provider:generated.provider,size,usage:generated.usage || null,remaining:quota.remaining},requestId);
  } catch(error) {
    console.error("Nara image handler failed",{requestId,name:error?.name,status:error?.status,code:error?.code});
    return json(error.status || 500,{code:error.code || "IMAGE_GENERATION_ERROR",error:error.message || "Generator gambar mengalami gangguan."},requestId);
  }
}
