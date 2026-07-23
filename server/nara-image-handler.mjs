function json(status, body, requestId = "") {
  return new Response(JSON.stringify(body), { status, headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "x-content-type-options":"nosniff", ...(requestId ? {"x-request-id":requestId} : {}) } });
}

function bearer(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function supabaseConfig(env) {
  return {
    url:String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/,""),
    key:env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "",
  };
}

async function verify(request, env) {
  const token = bearer(request);
  const {url,key} = supabaseConfig(env);
  if (!token) throw Object.assign(new Error("Silakan masuk untuk membuat gambar."),{status:401});
  if (!url || !key) throw Object.assign(new Error("Konfigurasi autentikasi belum lengkap."),{status:503});
  const userResponse = await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:`Bearer ${token}`}});
  if (!userResponse.ok) throw Object.assign(new Error("Sesi pengguna tidak valid."),{status:401});
  const user = await userResponse.json();
  const profileResponse = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=plan,plan_expires_at`,{headers:{apikey:key,authorization:`Bearer ${token}`}});
  const profile = profileResponse.ok ? (await profileResponse.json())?.[0] : null;
  const pro = profile?.plan === "pro" && (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date());
  return {token,user,pro,url,key};
}

function workspaceEndpoint(env) {
  const workspaceId = String(env.QWEN_WORKSPACE_ID || "").trim();
  const region = String(env.QWEN_REGION || "singapore").toLowerCase();
  if (!workspaceId || !/^[a-z0-9-]+$/i.test(workspaceId)) throw Object.assign(new Error("QWEN_WORKSPACE_ID belum dikonfigurasi."),{status:503});
  if (region === "singapore") return `https://${workspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`;
  if (region === "beijing") return `https://${workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`;
  throw Object.assign(new Error("Region generator gambar belum didukung. Gunakan singapore atau beijing."),{status:503});
}

function safeName(prompt) {
  const slug = String(prompt || "gambar-nara").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60);
  return slug || "gambar-nara";
}

async function insertMetadata({url,key,token,userId,siteId,path,prompt,bytes,width,height,model}) {
  const result = await fetch(`${url}/rest/v1/media_assets`,{
    method:"POST",
    headers:{apikey:key,authorization:`Bearer ${token}`,"content-type":"application/json",prefer:"return=representation"},
    body:JSON.stringify({site_id:siteId,uploaded_by:userId,bucket_id:"site-public-media",object_path:path,filename:`${safeName(prompt)}.png`,mime_type:"image/png",bytes,width,height,alt_text:prompt.slice(0,500),metadata:{kind:"image",source:"nara-image",model,prompt:prompt.slice(0,2000)}}),
  });
  if (!result.ok) throw Object.assign(new Error("Metadata gambar belum dapat disimpan."),{status:503});
  return (await result.json())?.[0];
}

export async function handleNaraImage(request, env, requestId = crypto.randomUUID()) {
  try {
    if (request.method !== "POST") return json(405,{error:"Metode tidak didukung."},requestId);
    const {token,user,pro,url,key} = await verify(request,env);
    const body = await request.json().catch(() => ({}));
    const prompt = String(body.prompt || "").trim().slice(0,3000);
    const siteId = String(body.siteId || "").trim();
    if (prompt.length < 5) return json(400,{error:"Prompt gambar minimal 5 karakter."},requestId);
    if (!/^[0-9a-f-]{36}$/i.test(siteId)) return json(400,{error:"Situs aktif tidak valid."},requestId);
    const size = ["1K","2K","4K"].includes(body.size) ? body.size : "1K";
    if (size === "4K" && !pro) return json(403,{code:"PLAN_REQUIRED",error:"Resolusi 4K memerlukan paket Pro."},requestId);
    const requestedModel = body.model === "wan2.7-image-pro" ? "wan2.7-image-pro" : "wan2.7-image";
    const model = requestedModel === "wan2.7-image-pro" && !pro ? "wan2.7-image" : requestedModel;
    const apiKey = env.QWEN_API_KEY || env.DASHSCOPE_API_KEY || "";
    if (!apiKey) throw Object.assign(new Error("QWEN_API_KEY belum dikonfigurasi."),{status:503});

    const generation = await fetch(workspaceEndpoint(env),{
      method:"POST",
      headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},
      body:JSON.stringify({model,input:{messages:[{role:"user",content:[{text:prompt}]}]},parameters:{size,n:1,watermark:false,thinking_mode:true}}),
    });
    const payload = await generation.json().catch(() => ({}));
    if (!generation.ok) {
      console.error("Nara image provider failed",{status:generation.status,code:payload?.code,requestId:payload?.request_id});
      throw Object.assign(new Error("Model gambar belum menghasilkan hasil."),{status:502});
    }
    const imageContent = payload?.output?.choices?.flatMap((choice) => choice?.message?.content || []).find((item) => item?.type === "image" && item?.image);
    if (!imageContent?.image) throw Object.assign(new Error("URL hasil gambar tidak ditemukan."),{status:502});
    const source = await fetch(imageContent.image);
    if (!source.ok) throw Object.assign(new Error("Hasil gambar belum dapat diunduh dari penyedia."),{status:502});
    const bytes = await source.arrayBuffer();
    if (bytes.byteLength > 50 * 1024 * 1024) throw Object.assign(new Error("Hasil gambar melebihi batas Storage proyek gratis."),{status:413});
    const path = `${siteId}/${user.id}/generated/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeName(prompt)}.png`;
    const upload = await fetch(`${url}/storage/v1/object/site-public-media/${path.split("/").map(encodeURIComponent).join("/")}`,{
      method:"POST",
      headers:{apikey:key,authorization:`Bearer ${token}`,"content-type":"image/png","cache-control":"31536000","x-upsert":"false"},
      body:bytes,
    });
    if (!upload.ok) throw Object.assign(new Error("Gambar berhasil dibuat tetapi belum dapat disimpan ke pustaka media."),{status:503});
    const usageSize = String(payload?.usage?.size || "");
    const [width,height] = usageSize.split("*").map(Number);
    const asset = await insertMetadata({url,key,token,userId:user.id,siteId,path,prompt,bytes:bytes.byteLength,width:Number.isFinite(width)?width:null,height:Number.isFinite(height)?height:null,model});
    const publicUrl = `${url}/storage/v1/object/public/site-public-media/${path.split("/").map(encodeURIComponent).join("/")}`;
    return json(200,{asset:{...asset,url:publicUrl,kind:"image"},model,size,usage:payload?.usage || null},requestId);
  } catch(error) {
    console.error("Nara image handler failed",{requestId,name:error?.name,status:error?.status});
    return json(error.status || 500,{code:error.code || "IMAGE_GENERATION_ERROR",error:error.message || "Generator gambar mengalami gangguan."},requestId);
  }
}
