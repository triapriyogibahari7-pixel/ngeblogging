import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  Crown,
  File,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { supabase, supabaseConfigured } from "./lib/supabase";

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 2_500_000;

const intelligenceOptions = [
  { id: "light", label: "Ringan", description: "Cepat untuk pertanyaan singkat", pro: false },
  { id: "standard", label: "Sedang", description: "Seimbang untuk menulis dan SEO", pro: false },
  { id: "high", label: "Tinggi", description: "Analisis lebih dalam dan panjang", pro: true },
  { id: "xhigh", label: "Ekstra tinggi", description: "Penalaran maksimum untuk pekerjaan kompleks", pro: true },
];

const modelOptions = [
  { id: "nara-mini", label: "Nara Mini", detail: "Cepat & hemat", pro: false },
  { id: "nara-writer", label: "Nara Writer", detail: "Konten profesional", pro: true },
  { id: "nara-vision", label: "Nara Vision", detail: "Memahami gambar", pro: true },
  { id: "nara-max", label: "Nara Max", detail: "Kualitas tertinggi", pro: true },
];

function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function fileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function friendlyError(error, status) {
  const message = String(error || "");
  if (status === 429) return message || "Batas penggunaan hari ini sudah tercapai.";
  if (status === 403) return message || "Pilihan ini memerlukan paket Nara Pro.";
  if (status === 503) return "Mesin Nara belum diaktifkan pada server. Hubungkan penyedia model AI di Netlify untuk mulai menggunakannya.";
  if (status === 504) return "Nara memerlukan waktu terlalu lama. Coba pertanyaan yang lebih singkat.";
  return message || "Nara belum dapat menjawab. Periksa koneksi lalu coba lagi.";
}

async function prepareFile(file) {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} lebih besar dari 2,5 MB.`);
  }

  const attachment = {
    id: uid(),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    kind: file.type.startsWith("image/") ? "image" : file.type.startsWith("text/") || /\.(md|csv|json)$/i.test(file.name) ? "text" : "file",
  };

  if (attachment.kind === "image") {
    attachment.dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}.`));
      reader.readAsDataURL(file);
    });
    attachment.preview = attachment.dataUrl;
  } else if (attachment.kind === "text") {
    attachment.text = (await file.text()).slice(0, 50_000);
  }

  return attachment;
}

export default function NaraAssistant({
  user = null,
  context = null,
  onRequestLogin,
  open: controlledOpen,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [attachmentMenu, setAttachmentMenu] = useState(false);
  const [intelligence, setIntelligence] = useState("standard");
  const [model, setModel] = useState("nara-mini");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [plan, setPlan] = useState(user ? "free" : "guest");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [notice, setNotice] = useState("");
  const cameraInput = useRef(null);
  const imageInput = useRef(null);
  const fileInput = useRef(null);
  const recognition = useRef(null);
  const scrollArea = useRef(null);

  useEffect(() => {
    setMessages((current) => current.length ? current : [{
      id: uid(),
      role: "assistant",
      text: user
        ? `Halo ${user.user_metadata?.full_name?.split(" ")[0] || ""}. Saya Nara, asisten Ngeblogging Anda. Saya bisa membantu menulis, meriset ide, memperbaiki SEO, dan memahami lampiran.`.replace("Halo .", "Halo." )
        : "Halo, saya Nara. Anda dapat bertanya, berbicara melalui mikrofon, atau menambahkan gambar dan file. Masuk untuk menyimpan riwayat dan membuka fitur akun.",
    }]);
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!user || !supabaseConfigured || !supabase) {
      setPlan(user ? "free" : "guest");
      return undefined;
    }
    supabase
      .from("profiles")
      .select("plan, plan_expires_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        const valid = data.plan === "pro" && (!data.plan_expires_at || new Date(data.plan_expires_at) > new Date());
        setPlan(valid ? "pro" : "free");
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!scrollArea.current) return;
    scrollArea.current.scrollTop = scrollArea.current.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => () => recognition.current?.stop?.(), []);

  const selectedModel = useMemo(() => modelOptions.find((item) => item.id === model), [model]);
  const selectedIntelligence = useMemo(() => intelligenceOptions.find((item) => item.id === intelligence), [intelligence]);

  const selectPremiumAware = (kind, value) => {
    const options = kind === "model" ? modelOptions : intelligenceOptions;
    const option = options.find((item) => item.id === value);
    if (option?.pro && plan !== "pro") {
      setShowUpgrade(true);
      return;
    }
    if (kind === "model") setModel(value);
    else setIntelligence(value);
  };

  const addFiles = async (fileList) => {
    setAttachmentMenu(false);
    setNotice("");
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setNotice(`Maksimal ${MAX_ATTACHMENTS} lampiran dalam satu pesan.`);
      return;
    }
    try {
      const prepared = await Promise.all(files.map(prepareFile));
      setAttachments((current) => [...current, ...prepared]);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const startVoice = () => {
    if (listening) {
      recognition.current?.stop?.();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("Pertanyaan suara belum didukung browser ini. Gunakan Chrome terbaru atau ketik pertanyaan Anda.");
      return;
    }
    const instance = new SpeechRecognition();
    recognition.current = instance;
    instance.lang = "id-ID";
    instance.interimResults = true;
    instance.continuous = false;
    instance.onstart = () => { setListening(true); setNotice("Nara sedang mendengarkan…"); };
    instance.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ");
      setInput(transcript);
    };
    instance.onerror = () => setNotice("Suara belum berhasil dibaca. Periksa izin mikrofon lalu coba lagi.");
    instance.onend = () => { setListening(false); setNotice(""); };
    instance.start();
  };

  const resetChat = () => {
    setMessages([{ id: uid(), role: "assistant", text: "Percakapan baru dimulai. Apa yang ingin Anda kerjakan?" }]);
    setInput("");
    setAttachments([]);
  };

  const requestPro = async () => {
    if (!user) {
      setShowUpgrade(false);
      setOpen(false);
      onRequestLogin?.();
      return;
    }
    if (!supabase) {
      setNotice("Supabase belum tersambung pada deployment ini.");
      return;
    }
    const { error } = await supabase.from("plan_upgrade_requests").insert({
      user_id: user.id,
      requested_plan: "pro",
      source: "nara_assistant",
    });
    if (error && !String(error.code).includes("23505")) {
      setNotice("Permintaan Pro belum tersimpan. Coba lagi sebentar.");
      return;
    }
    setShowUpgrade(false);
    setNotice("Permintaan akses awal Nara Pro sudah tersimpan.");
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !attachments.length) || busy) return;
    if ((selectedModel?.pro || selectedIntelligence?.pro) && plan !== "pro") {
      setShowUpgrade(true);
      return;
    }

    const outgoing = { id: uid(), role: "user", text: text || "Tolong analisis lampiran ini.", attachments };
    const history = [...messages, outgoing];
    setMessages(history);
    setInput("");
    setAttachments([]);
    setNotice("");
    setBusy(true);

    try {
      let accessToken = "";
      if (supabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token || "";
      }
      const response = await fetch("/api/nara", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: outgoing.text,
          model,
          intelligence,
          context,
          attachments: outgoing.attachments.map(({ name, type, size, kind, dataUrl, text: fileText }) => ({ name, type, size, kind, dataUrl, text: fileText })),
          history: messages.slice(-8).map(({ role, text: messageText }) => ({ role, content: messageText })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 403 && data.code === "PLAN_REQUIRED") setShowUpgrade(true);
        throw Object.assign(new Error(friendlyError(data.error, response.status)), { status: response.status });
      }
      setMessages((current) => [...current, {
        id: uid(),
        role: "assistant",
        text: data.answer || "Nara belum menghasilkan jawaban.",
        model: data.modelLabel,
        remaining: data.remaining,
      }]);
    } catch (error) {
      setMessages((current) => [...current, { id: uid(), role: "error", text: friendlyError(error.message, error.status) }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">
        <span><Sparkles /></span>
        <b>Nara AI</b>
        <small>Assistant</small>
      </button>

      {open && (
        <div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">
          <button className="nara-assistant-backdrop" onClick={() => setOpen(false)} aria-label="Tutup Nara" />
          <aside className="nara-assistant-shell">
            <div className="nara-assistant-header">
              <div className="nara-brand-orb"><Sparkles /></div>
              <div>
                <span><b>Nara</b><em>AI</em>{plan === "pro" && <i>PRO</i>}</span>
                <small><i /> Asisten resmi Ngeblogging</small>
              </div>
              <button onClick={resetChat} title="Percakapan baru"><RotateCcw /></button>
              <button onClick={() => setOpen(false)} title="Tutup"><X /></button>
            </div>

            <div className="nara-context-bar">
              <span><ShieldCheck /> Jawaban privat</span>
              <button onClick={() => setShowUpgrade(true)}>{plan === "pro" ? <><Crown /> Pro aktif</> : <><Zap /> Upgrade Pro</>}</button>
            </div>

            <div className="nara-assistant-messages" ref={scrollArea}>
              {messages.map((message) => (
                <div className={`nara-message ${message.role}`} key={message.id}>
                  {message.role !== "user" && <span className="nara-message-avatar">{message.role === "error" ? "!" : <Sparkles />}</span>}
                  <div>
                    <p>{message.text}</p>
                    {message.attachments?.length > 0 && (
                      <div className="nara-message-files">{message.attachments.map((item) => <small key={item.id}><Paperclip />{item.name}</small>)}</div>
                    )}
                    {(message.model || Number.isFinite(message.remaining)) && <small className="nara-message-meta">{message.model}{Number.isFinite(message.remaining) ? ` · ${message.remaining} respons tersisa hari ini` : ""}</small>}
                  </div>
                </div>
              ))}
              {busy && <div className="nara-message assistant"><span className="nara-message-avatar"><Sparkles /></span><div className="nara-thinking"><i/><i/><i/><span>Nara sedang berpikir</span></div></div>}
            </div>

            <div className="nara-quick-prompts">
              {["Buat ide artikel", "Perbaiki tulisan", "Audit SEO"].map((prompt) => (
                <button key={prompt} onClick={() => setInput(prompt)}>{prompt}</button>
              ))}
            </div>

            <div className="nara-composer">
              {attachments.length > 0 && (
                <div className="nara-attachment-list">
                  {attachments.map((item) => (
                    <span key={item.id}>
                      {item.preview ? <img src={item.preview} alt="" /> : <File />}
                      <i><b>{item.name}</b><small>{fileSize(item.size)}</small></i>
                      <button onClick={() => setAttachments((current) => current.filter((fileItem) => fileItem.id !== item.id))}><X /></button>
                    </span>
                  ))}
                </div>
              )}
              {notice && <div className="nara-notice">{notice}</div>}
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); }
                }}
                placeholder="Tanyakan apa saja kepada Nara…"
                rows={3}
              />
              <div className="nara-composer-tools">
                <div className="nara-attachment-menu-wrap">
                  <button className={attachmentMenu ? "active" : ""} onClick={() => setAttachmentMenu(!attachmentMenu)} title="Tambahkan lampiran"><Plus /></button>
                  {attachmentMenu && (
                    <div className="nara-attachment-menu">
                      <button onClick={() => cameraInput.current?.click()}><Camera /><span><b>Kamera</b><small>Ambil foto sekarang</small></span></button>
                      <button onClick={() => imageInput.current?.click()}><ImageIcon /><span><b>Foto</b><small>Pilih dari perangkat</small></span></button>
                      <button onClick={() => fileInput.current?.click()}><File /><span><b>File</b><small>Teks, PDF, atau dokumen</small></span></button>
                    </div>
                  )}
                </div>
                <button className={listening ? "listening" : ""} onClick={startVoice} title="Pertanyaan suara">{listening ? <MicOff /> : <Mic />}</button>
                <label className="nara-select intelligence">
                  <span>{selectedIntelligence?.label}</span><ChevronDown />
                  <select value={intelligence} onChange={(event) => selectPremiumAware("intelligence", event.target.value)} aria-label="Tingkat kecerdasan">
                    {intelligenceOptions.map((item) => <option value={item.id} key={item.id}>{item.label}{item.pro ? " · Pro" : ""}</option>)}
                  </select>
                </label>
                <label className="nara-select model">
                  <span>{selectedModel?.label}{selectedModel?.pro && <LockKeyhole />}</span><ChevronDown />
                  <select value={model} onChange={(event) => selectPremiumAware("model", event.target.value)} aria-label="Model Nara">
                    {modelOptions.map((item) => <option value={item.id} key={item.id}>{item.label}{item.pro ? " · Pro" : ""}</option>)}
                  </select>
                </label>
                <button className="nara-send" disabled={busy || (!input.trim() && !attachments.length)} onClick={send}>{busy ? <LoaderCircle className="spin" /> : <Send />}</button>
              </div>
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
              <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
              <input ref={fileInput} type="file" accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
            </div>
          </aside>

          {showUpgrade && (
            <div className="nara-upgrade-card">
              <button className="nara-upgrade-close" onClick={() => setShowUpgrade(false)}><X /></button>
              <span className="nara-upgrade-icon"><Crown /></span>
              <small>NARA PRO</small>
              <h2>Lebih dalam. Lebih panjang. Lebih bertenaga.</h2>
              <p>Buka kecerdasan Tinggi dan Ekstra tinggi, model khusus penulisan, analisis gambar, serta batas pemakaian yang lebih besar.</p>
              <div className="nara-plan-grid">
                <article><b>Gratis</b><strong>Rp0</strong><span><Check /> Ringan & Sedang</span><span><Check /> Nara Mini</span><span><Check /> Lampiran dasar</span></article>
                <article className="featured"><b>Pro</b><strong>Premium</strong><span><Check /> Tinggi & Ekstra tinggi</span><span><Check /> Semua model Nara</span><span><Check /> Prioritas & riwayat panjang</span></article>
              </div>
              <button className="nara-upgrade-cta" onClick={requestPro}>{user ? "Minta akses awal Pro" : "Masuk untuk memilih Pro"}</button>
              <em>Pembayaran belum ditagihkan. Harga final ditampilkan sebelum paket komersial diaktifkan.</em>
            </div>
          )}
        </div>
      )}
    </>
  );
}
