import React, { useEffect, useMemo, useState } from "react";
import { Blocks, Check, Database, FolderKanban, Github, LoaderCircle, Plus, Save, Server, ShieldCheck, Sparkles, Trash2, X, Zap } from "lucide-react";
import {
  createNaraMemory, createNaraProject, deleteNaraMemory, deleteNaraProject,
  disableIntegration, INTEGRATION_CATALOG, listNaraMemories, listNaraProjects,
  listUserIntegrations, requestIntegration, updateNaraProject,
} from "./lib/nara-data";
import "./nara-workspace.css";

function providerIcon(id) {
  if (id === "github") return Github;
  if (id === "supabase") return Database;
  if (id === "cloudflare") return Server;
  return Blocks;
}

function Modal({ title, onClose, children, footer }) {
  return <div className="nw-modal-layer"><button className="nw-modal-backdrop" onClick={onClose} aria-label="Tutup"/><section><header><h2>{title}</h2><button onClick={onClose}><X/></button></header><div>{children}</div>{footer && <footer>{footer}</footer>}</section></div>;
}

export default function NaraWorkspace({ user, site, setToast, onOpenAssistant }) {
  const [tab,setTab] = useState("projects");
  const [projects,setProjects] = useState([]);
  const [memories,setMemories] = useState([]);
  const [integrations,setIntegrations] = useState([]);
  const [activeProjectId,setActiveProjectId] = useState("");
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState(null);
  const [draft,setDraft] = useState({name:"",description:"",instructions:"",title:"",content:"",importance:3});

  const activeProject = projects.find((project) => project.id === activeProjectId) || null;
  const integrationMap = useMemo(() => new Map(integrations.map((item) => [item.provider,item])), [integrations]);

  const refresh = async () => {
    if (!user?.id || !site?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [projectRows,integrationRows] = await Promise.all([listNaraProjects(user.id,site.id),listUserIntegrations(user.id,site.id)]);
      setProjects(projectRows);
      setIntegrations(integrationRows);
      const preferred = activeProjectId || projectRows[0]?.id || "";
      setActiveProjectId(preferred);
      setMemories(await listNaraMemories({userId:user.id,siteId:site.id,projectId:preferred || null}));
    } catch(error){ console.error("Nara workspace load failed",error); setToast(error.message || "Nara Workspace belum dapat dimuat"); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [user?.id,site?.id]);
  useEffect(() => {
    if (!user?.id || !site?.id) return;
    listNaraMemories({userId:user.id,siteId:site.id,projectId:activeProjectId || null}).then(setMemories).catch(() => {});
  }, [activeProjectId]);

  const createProject = async () => {
    try { const project = await createNaraProject({userId:user.id,siteId:site.id,name:draft.name,description:draft.description,instructions:draft.instructions}); setProjects((all) => [project,...all]); setActiveProjectId(project.id); setModal(null); setDraft({name:"",description:"",instructions:"",title:"",content:"",importance:3}); setToast("Proyek Nara dibuat"); }
    catch(error){ setToast(error.message || "Proyek belum dapat dibuat"); }
  };
  const saveProject = async (values) => {
    if (!activeProject) return;
    try { const updated = await updateNaraProject(activeProject.id,values); setProjects((all) => all.map((item) => item.id === updated.id ? updated : item)); setToast("Instruksi proyek disimpan"); }
    catch(error){ setToast(error.message || "Proyek belum tersimpan"); }
  };
  const addMemory = async () => {
    try { const memory = await createNaraMemory({userId:user.id,siteId:site.id,projectId:activeProjectId || null,title:draft.title,content:draft.content,importance:draft.importance}); setMemories((all) => [memory,...all]); setModal(null); setDraft((current) => ({...current,title:"",content:"",importance:3})); setToast("Memori Nara disimpan"); }
    catch(error){ setToast(error.message || "Memori belum dapat disimpan"); }
  };
  const connect = async (provider) => {
    try { const record = await requestIntegration({userId:user.id,siteId:site.id,provider,scopes:INTEGRATION_CATALOG.find((item) => item.id === provider)?.scopes || []}); setIntegrations((all) => [record,...all.filter((item) => item.provider !== provider)]); setToast("Permintaan koneksi tersimpan. OAuth/server secret wajib diselesaikan di backend."); }
    catch(error){ setToast(error.message || "Plugin belum dapat diminta"); }
  };

  return <div className="nw-page"><header><div><small>NARA CONTROL CENTER</small><h1>Projects, memory, dan plugins.</h1><p>Nara memahami alur kerja situs melalui konteks yang Anda izinkan. Tindakan sensitif tetap memerlukan konfirmasi.</p></div><button className="nw-primary" onClick={onOpenAssistant}><Sparkles/> Buka Nara</button></header><nav className="nw-tabs">{[["projects","Projects"],["memory","Memory"],["plugins","Plugins"]].map(([id,label]) => <button key={id} className={tab===id?"active":""} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {loading ? <div className="nw-loading"><LoaderCircle className="spin"/> Menyiapkan Nara Workspace…</div> : tab === "projects" ? <section className="nw-project-layout"><aside><button className="nw-add" onClick={() => setModal("project")}><Plus/> Proyek baru</button>{projects.map((project) => <button key={project.id} className={activeProjectId===project.id?"active":""} onClick={() => setActiveProjectId(project.id)}><FolderKanban/><span><b>{project.name}</b><small>{project.description || "Tanpa deskripsi"}</small></span></button>)}{!projects.length && <p>Belum ada proyek.</p>}</aside><main>{activeProject ? <><div className="nw-project-title"><div><small>PROYEK AKTIF</small><h2>{activeProject.name}</h2><p>{activeProject.description}</p></div><button className="danger" onClick={async () => {if(!window.confirm("Hapus proyek Nara ini?")) return; await deleteNaraProject(activeProject.id); setProjects((all) => all.filter((item) => item.id!==activeProject.id)); setActiveProjectId("");}}><Trash2/></button></div><label>Instruksi permanen proyek<textarea defaultValue={activeProject.instructions || ""} onBlur={(event) => saveProject({instructions:event.target.value})} placeholder="Contoh: gunakan bahasa Indonesia, jangan menerbitkan tanpa konfirmasi, prioritaskan SEO dan aksesibilitas."/></label><div className="nw-guardrails"><article><ShieldCheck/><b>Konfirmasi wajib</b><p>Publikasi, penghapusan, pembayaran, dan perubahan integrasi tidak boleh otomatis.</p></article><article><Zap/><b>Konteks terarah</b><p>Projects dan memory membatasi konteks agar lebih relevan dan dapat diaudit.</p></article></div></> : <div className="nw-empty"><FolderKanban/><h3>Buat proyek pertama</h3><p>Kelompokkan percakapan, instruksi, memori, situs, dan pekerjaan Nara.</p></div>}</main></section> : tab === "memory" ? <section className="nw-memory"><header><div><h2>Memori jangka panjang</h2><p>Memori tersimpan di database dengan RLS milik pengguna, bukan hanya riwayat browser.</p></div><button className="nw-primary" onClick={() => setModal("memory")}><Plus/> Tambah memori</button></header><div>{memories.map((memory) => <article key={memory.id}><span>{memory.importance}</span><div><small>{memory.scope} · {memory.metadata?.title || memory.memory_key}</small><p>{memory.memory_text}</p></div><button onClick={async () => {await deleteNaraMemory(memory.id);setMemories((all)=>all.filter((item)=>item.id!==memory.id));}}><Trash2/></button></article>)}</div>{!memories.length && <div className="nw-empty"><Sparkles/><h3>Belum ada memori</h3><p>Simpan preferensi, keputusan, fakta, dan tujuan yang memang perlu diingat.</p></div>}</section> : <section className="nw-plugins"><header><div><h2>Plugin & connectors</h2><p>Secret OAuth/API tidak disimpan di browser. Koneksi berstatus pending sampai backend server menyelesaikan OAuth atau secret vault.</p></div><span><ShieldCheck/> Permission-first</span></header><div className="nw-plugin-grid">{INTEGRATION_CATALOG.map((plugin) => { const record=integrationMap.get(plugin.id); const Icon=providerIcon(plugin.id); return <article key={plugin.id}><span><Icon/></span><div><small>{plugin.category}</small><h3>{plugin.name}</h3><p>{plugin.description}</p><nav>{plugin.scopes.map((scope)=><i key={scope}>{scope}</i>)}</nav></div>{record ? <button className={record.status} onClick={() => record.status !== "disabled" && disableIntegration({userId:user.id,integrationId:record.id}).then((updated)=>setIntegrations((all)=>all.map((item)=>item.id===updated.id?updated:item)))}>{record.status === "connected" ? <><Check/> Connected</> : record.status === "disabled" ? "Disabled" : "Pending setup"}</button> : <button onClick={() => connect(plugin.id)}>Minta koneksi</button>}</article>; })}</div></section>}
    {modal === "project" && <Modal title="Buat proyek Nara" onClose={() => setModal(null)} footer={<><button onClick={() => setModal(null)}>Batal</button><button className="nw-primary" onClick={createProject}><Save/> Simpan proyek</button></>}><label>Nama proyek<input value={draft.name} onChange={(event)=>setDraft({...draft,name:event.target.value})}/></label><label>Deskripsi<textarea value={draft.description} onChange={(event)=>setDraft({...draft,description:event.target.value})}/></label><label>Instruksi Nara<textarea value={draft.instructions} onChange={(event)=>setDraft({...draft,instructions:event.target.value})}/></label></Modal>}
    {modal === "memory" && <Modal title="Tambah memori Nara" onClose={() => setModal(null)} footer={<><button onClick={() => setModal(null)}>Batal</button><button className="nw-primary" onClick={addMemory}><Save/> Simpan memori</button></>}><label>Judul<input value={draft.title} onChange={(event)=>setDraft({...draft,title:event.target.value})}/></label><label>Isi memori<textarea value={draft.content} onChange={(event)=>setDraft({...draft,content:event.target.value})}/></label><label>Tingkat kepentingan<select value={draft.importance} onChange={(event)=>setDraft({...draft,importance:Number(event.target.value)})}>{[1,2,3,4,5].map((value)=><option key={value} value={value}>{value}</option>)}</select></label></Modal>}
  </div>;
}
