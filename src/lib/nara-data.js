import { supabase, supabaseConfigured } from "./supabase.js";

function client() {
  if (!supabaseConfigured || !supabase) throw new Error("Supabase belum dikonfigurasi.");
  return supabase;
}

function keyFrom(value) {
  const base = String(value || "memory").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,80) || "memory";
  return `${base}-${globalThis.crypto?.randomUUID?.().slice(0,8) || Math.random().toString(36).slice(2,10)}`;
}

export async function listNaraProjects(userId, siteId = null) {
  let request = client().from("nara_projects").select("id,user_id,site_id,name,description,instructions,archived,created_at,updated_at").eq("user_id",userId).order("updated_at",{ascending:false}).limit(100);
  if (siteId) request = request.or(`site_id.eq.${siteId},site_id.is.null`);
  const { data,error } = await request;
  if (error) throw error;
  return data || [];
}

export async function createNaraProject({userId,siteId,name,description="",instructions=""}) {
  const title = String(name || "").trim().slice(0,160);
  if (!title) throw new Error("Nama proyek wajib diisi.");
  const { data,error } = await client().from("nara_projects").insert({user_id:userId,site_id:siteId || null,name:title,description:String(description).slice(0,2000),instructions:String(instructions).slice(0,10000)}).select("id,user_id,site_id,name,description,instructions,archived,created_at,updated_at").single();
  if (error) throw error;
  return data;
}

export async function updateNaraProject(projectId,values) {
  const payload = { updated_at:new Date().toISOString() };
  if (values.name !== undefined) payload.name = String(values.name).slice(0,160);
  if (values.description !== undefined) payload.description = String(values.description).slice(0,2000);
  if (values.instructions !== undefined) payload.instructions = String(values.instructions).slice(0,10000);
  if (values.archived !== undefined) payload.archived = Boolean(values.archived);
  const { data,error } = await client().from("nara_projects").update(payload).eq("id",projectId).select("id,user_id,site_id,name,description,instructions,archived,created_at,updated_at").single();
  if (error) throw error;
  return data;
}

export async function deleteNaraProject(projectId) {
  const { error } = await client().from("nara_projects").delete().eq("id",projectId);
  if (error) throw error;
}

export async function listNaraMemories({userId,siteId,projectId=null}) {
  let request = client().from("nara_memories").select("id,site_id,owner_user_id,content_id,scope,memory_key,memory_text,metadata,project_id,importance,expires_at,created_at,updated_at").eq("owner_user_id",userId).eq("site_id",siteId).order("importance",{ascending:false}).order("updated_at",{ascending:false}).limit(200);
  if (projectId) request = request.eq("project_id",projectId);
  const { data,error } = await request;
  if (error) throw error;
  return data || [];
}

export async function createNaraMemory({userId,siteId,projectId=null,title="",content,importance=3,scope="user",metadata={}}) {
  const text = String(content || "").trim().slice(0,20000);
  if (!text) throw new Error("Isi memori wajib diisi.");
  const payload = {
    site_id:siteId,
    owner_user_id:userId,
    project_id:projectId || null,
    scope:["user","site","content"].includes(scope) ? scope : "user",
    memory_key:keyFrom(title || text.slice(0,50)),
    memory_text:text,
    metadata:{...metadata,title:String(title || "").slice(0,200),source:"nara-workspace"},
    importance:Math.max(1,Math.min(5,Number(importance)||3)),
  };
  const { data,error } = await client().from("nara_memories").insert(payload).select("id,site_id,owner_user_id,scope,memory_key,memory_text,metadata,project_id,importance,expires_at,created_at,updated_at").single();
  if (error) throw error;
  return data;
}

export async function deleteNaraMemory(memoryId) {
  const { error } = await client().from("nara_memories").delete().eq("id",memoryId);
  if (error) throw error;
}

export const INTEGRATION_CATALOG = [
  {id:"supabase",name:"Supabase",category:"Data",description:"Database, Auth, Storage, Realtime, dan Edge Functions.",scopes:["schema:read","data:read","data:write"]},
  {id:"neon",name:"Neon",category:"Data",description:"Postgres serverless, branching database, connection pooling, dan observability.",scopes:["projects:read","branches:read","branches:write","database:connect"]},
  {id:"github",name:"GitHub",category:"Developer",description:"Repository, issues, pull requests, deployment, dan audit perubahan.",scopes:["repo:read","issues:write","pull_requests:write"]},
  {id:"cloudflare",name:"Cloudflare",category:"Infrastructure",description:"Workers, DNS, R2, Images, Stream, cache, dan observability.",scopes:["workers:read","dns:read","analytics:read"]},
  {id:"paypal",name:"PayPal",category:"Payments",description:"Checkout, langganan, invoice, dan webhook pembayaran.",scopes:["orders:read","orders:write"]},
  {id:"qris",name:"QRIS Gateway",category:"Payments",description:"Pembayaran QRIS melalui penyedia pembayaran Indonesia yang berizin.",scopes:["payments:read","payments:create"]},
  {id:"google-drive",name:"Google Drive",category:"Content",description:"Impor dokumen, ekspor cadangan, dan pustaka aset.",scopes:["files:read","files:write"]},
  {id:"google-analytics",name:"Google Analytics",category:"Analytics",description:"Metrik trafik tambahan dengan persetujuan dan mode privasi.",scopes:["analytics:read"]},
  {id:"webhook",name:"Custom Webhook",category:"Automation",description:"Kirim event terpilih ke endpoint HTTPS yang Anda kelola.",scopes:["events:send"]},
];

export async function listUserIntegrations(userId,siteId) {
  const { data,error } = await client().from("user_integrations").select("id,user_id,site_id,provider,display_name,status,scopes,config,last_checked_at,created_at,updated_at").eq("user_id",userId).eq("site_id",siteId).order("provider");
  if (error) throw error;
  return data || [];
}

export async function requestIntegration({userId,siteId,provider,scopes=[]}) {
  const catalog = INTEGRATION_CATALOG.find((item) => item.id === provider);
  if (!catalog) throw new Error("Plugin tidak dikenal.");
  const safeScopes = scopes.filter((scope) => catalog.scopes.includes(scope));
  const { data,error } = await client().from("user_integrations").upsert({
    user_id:userId,site_id:siteId,provider,display_name:catalog.name,status:"pending",scopes:safeScopes,config:{requested_at:new Date().toISOString(),connection_mode:"server-oauth-required"},secret_reference:null,updated_at:new Date().toISOString(),
  },{onConflict:"user_id,site_id,provider"}).select("id,user_id,site_id,provider,display_name,status,scopes,config,last_checked_at,created_at,updated_at").single();
  if (error) throw error;
  await client().from("integration_audit_logs").insert({user_id:userId,integration_id:data.id,action:"connection_requested",result:"pending",metadata:{provider,scopes:safeScopes}});
  return data;
}

export async function disableIntegration({userId,integrationId}) {
  const { data,error } = await client().from("user_integrations").update({status:"disabled",updated_at:new Date().toISOString(),secret_reference:null}).eq("id",integrationId).select("id,user_id,site_id,provider,display_name,status,scopes,config,last_checked_at,created_at,updated_at").single();
  if (error) throw error;
  await client().from("integration_audit_logs").insert({user_id:userId,integration_id:integrationId,action:"disabled",result:"success"});
  return data;
}
