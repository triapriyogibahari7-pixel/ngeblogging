import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  Copy,
  Crown,
  File,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  RefreshCw,
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
const MAX_SOURCE_IMAGE_BYTES = 12_000_000;
const MAX_IMAGE_EDGE = 1600;
const TEXT_FILE_PATTERN = /\.(txt|md|csv|json)$/i;
const NARA_SIZE_KEY = "ngeblogging-nara-size-v148";
const NARA_VOICE_KEY = "ngeblogging-nara-auto-voice-v148";
const VALID_NARA_SIZES = new Set(["small", "medium", "full"]);

const NARA_GLOBAL_AUTHORITY_V271 = \`
/* Nara v271: kecil/medium non-modal, penuh modal, dan header aman di layar sempit. */
.nara-assistant-layer[data-nara-interaction="nonmodal"] {
  position: fixed !important;
  inset: 0 !important;
  display: block !important;
  pointer-events: none !important;
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
.nara-assistant-layer[data-nara-interaction="nonmodal"] > .nara-assistant-backdrop {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.nara-assistant-layer[data-nara-interaction="nonmodal"] > .nara-assistant-shell {
  position: fixed !important;
  pointer-events: auto !important;
  max-width: calc(100vw - 24px) !important;
  max-height: calc(100dvh - 24px) !important;
}
.nara-assistant-layer[data-nara-interaction="modal"] {
  position: fixed !important;
  inset: 0 !important;
  display: flex !important;
  align-items: stretch !important;
  justify-content: stretch !important;
  pointer-events: auto !important;
  background: rgba(8, 18, 38, 0.54) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  backdrop-filter: blur(8px) !important;
}
.nara-assistant-layer[data-nara-interaction="modal"] > .nara-assistant-backdrop {
  position: absolute !important;
  inset: 0 !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  background: transparent !important;
}
.nara-assistant-layer[data-nara-interaction="modal"] > .nara-assistant-shell {
  position: fixed !important;
  inset: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)) !important;
  z-index: 2 !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 20px !important;
  pointer-events: auto !important;
}
body.nara-fullscreen-open-v148 {
  overflow: hidden !important;
  overscroll-behavior: none !important;
}
.nara-assistant-shell .nara-assistant-header,
.nara-assistant-shell .nara-assistant-header > * {
  min-width: 0 !important;
  max-width: 100%;
}
.nara-assistant-shell .nara-assistant-header > button,
.nara-assistant-shell .nara-size-controls-v147 > button {
  flex: 0 0 auto !important;
  visibility: visible !important;
  opacity: 1 !important;
}
.nara-assistant-shell .nara-assistant-header > button[aria-label="Tutup Nara"] {
  display: inline-grid !important;
  place-items: center !important;
}
@media (max-width: 600px) {
  .nara-assistant-layer[data-nara-interaction="nonmodal"] > .nara-assistant-shell[data-nara-size="small"] {
    inset: auto max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) auto !important;
    width: min(420px, calc(100vw - 24px)) !important;
    height: min(640px, calc(100dvh - 24px)) !important;
    border-radius: 20px !important;
  }
  .nara-assistant-layer[data-nara-interaction="nonmodal"] > .nara-assistant-shell[data-nara-size="medium"] {
    inset: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)) !important;
    width: auto !important;
    height: auto !important;
    border-radius: 20px !important;
  }
  .nara-assistant-layer[data-nara-interaction="modal"] > .nara-assistant-shell[data-nara-size="full"] {
    inset: 0 !important;
    width: 100vw !important;
    height: 100dvh !important;
    border-radius: 0 !important;
    padding-top: env(safe-area-inset-top) !important;
    padding-right: env(safe-area-inset-right) !important;
    padding-bottom: env(safe-area-inset-bottom) !important;
    padding-left: env(safe-area-inset-left) !important;
  }
  .nara-assistant-shell .nara-assistant-header {
    display: grid !important;
    grid-template-columns: 36px minmax(0, 1fr) 36px 36px 36px !important;
    grid-template-rows: auto auto !important;
    align-items: center !important;
    gap: 6px !important;
  }
  .nara-assistant-shell .nara-assistant-header > .nara-brand-orb {
    grid-column: 1 !important;
    grid-row: 1 !important;
  }
  .nara-assistant-shell .nara-assistant-header > div:nth-child(2) {
    grid-column: 2 !important;
    grid-row: 1 !important;
    overflow: hidden !important;
  }
  .nara-assistant-shell .nara-assistant-header > .nara-size-controls-v147 {
    grid-column: 1 / -1 !important;
    grid-row: 2 !important;
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    width: 100% !important;
  }
  .nara-assistant-shell .nara-assistant-header > .nara-auto-voice-v148 {
    grid-column: 3 !important;
    grid-row: 1 !important;
  }
  .nara-assistant-shell .nara-assistant-header > button[title="Percakapan baru"] {
    grid-column: 4 !important;
    grid-row: 1 !important;
  }
  .nara-assistant-shell .nara-assistant-header > button[aria-label="Tutup Nara"] {
    grid-column: 5 !important;
    grid-row: 1 !important;
  }
  .nara-assistant-shell .nara-composer,
  .nara-assistant-shell .nara-composer-tools,
  .nara-assistant-shell .nara-quick-prompts {
    min-width: 0 !important;
    max-width: 100% !important;
  }
}
\`;

const intelligenceOptions = [
  { id: "light", label: "Instan", description: "Cepat untuk pertanyaan singkat", pro: false },
  { id: "standard", label: "Sedang", description: "Seimbang untuk menulis dan SEO", pro: false },
  { id: "high", label: "Tinggi", description: "Analisis lebih dalam dan panjang", pro: true },
  { id: "xhigh", label: "Maksimal", description: "Penalaran maksimum untuk pekerjaan kompleks", pro: true },
];

const modelOptions = [
  { id: "nara-mini", label: "Nara Mini", detail: "Cepat & hemat", pro: false },
  { id: "nara-writer", label: "Nara Writer", detail: "Konten profesional", pro: true },
  { id: "nara-vision", label: "Nara Vision", detail: "Memahami gambar", pro: true },
  { id: "nara-max", label: "Nara Max", detail: "Kualitas tertinggi", pro: true },
];

function readPreference(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { return localStorage.getItem(key) || fallback; }
  catch { return fallback; }
}

function writePreference(key, value) {
  try { localStorage.setItem(key, value); }
  catch { /* Penyimpanan browser tidak boleh memblokir Nara. */ }
}

function NaraWindowIcon({ size }) {
  if (size === "small") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="m3 3 6 6"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><path d="m21 21-6-6"/></svg>;
  if (size === "medium") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>;
}

function SpeakerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>;
}

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
  if (status === 503) return message || "Mesin Nara belum diaktifkan pada server. Hubungkan penyedia model AI di Netlify untuk mulai menggunakannya.";
  if (status === 504) return message || "Jawaban belum selesai dalam batas waktu. Tekan Coba lagi.";
  return message || "Nara belum dapat menjawab. Periksa koneksi lalu coba lagi.";
}

function readAsDataUrl(blob, name) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Gagal membaca ${name}.`));
    reader.readAsDataURL(blob);
  });
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeImage(file) {
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error(`${file.name} terlalu besar. Maksimal foto asli 12 MB.`);
  }

  let source;
  let release = () => {};
  try {
    if (globalThis.createImageBitmap) {
      source = await createImageBitmap(file);
      release = () => source.close?.();
    } else {
      const objectUrl = URL.createObjectURL(file);
      source = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`${file.name} bukan gambar yang didukung.`));
        image.src = objectUrl;
      });
      release = () => URL.revokeObjectURL(objectUrl);
    }

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Browser belum dapat memproses gambar ini.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);

    let optimized;
    for (const quality of [0.88, 0.76, 0.64]) {
      optimized = await canvasBlob(canvas, "image/webp", quality);
      if (optimized && optimized.size <= MAX_ATTACHMENT_BYTES) break;
    }
    if (!optimized) throw new Error(`Gagal mengoptimalkan ${file.name}.`);
    if (optimized.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`${file.name} masih lebih besar dari 2,5 MB setelah dioptimalkan.`);
    }

    const dataUrl = await readAsDataUrl(optimized, file.name);
    return {
      id: uid(),
      name: file.name,
      type: optimized.type || "image/webp",
      size: optimized.size,
      originalSize: file.size,
      kind: "image",
      dataUrl,
      preview: dataUrl,
    };
  } catch (error) {
    if (error?.message?.includes(file.name)) throw error;
    throw new Error(`${file.name} belum dapat dibaca. Gunakan JPG, PNG, atau WebP.`);
  } finally {
    release();
  }
}

async function prepareFile(file) {
  if (file.type.startsWith("image/")) return optimizeImage(file);
  if (!file.type.startsWith("text/") && !TEXT_FILE_PATTERN.test(file.name)) {
    throw new Error(`${file.name} belum didukung. Pilih gambar atau file .txt, .md, .csv, atau .json.`);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error(`${file.name} lebih besar dari 2,5 MB.`);

  const attachment = {
    id: uid(),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    kind: "text",
  };

  attachment.text = (await file.text()).slice(0, 50_000);
  return attachment;
}

function inlineText(text, prefix) {
  return String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={`${prefix}-${index}`}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={`${prefix}-${index}`}>{part.slice(1, -1)}</code>;
    return <React.Fragment key={`${prefix}-${index}`}>{part}</React.Fragment>;
  });
}

function RichMessage({ text }) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith("```")) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      index += 1;
      blocks.push(<pre key={`code-${index}`}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = `h${Math.min(heading[1].length + 2, 5)}`;
      blocks.push(<Tag key={`heading-${index}`}>{inlineText(heading[2], `heading-${index}`)}</Tag>);
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) items.push(lines[index++].replace(/^[-*]\s+/, ""));
      blocks.push(<ul key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inlineText(item, `list-${index}-${itemIndex}`)}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index])) items.push(lines[index++].replace(/^\d+[.)]\s+/, ""));
      blocks.push(<ol key={`ordered-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inlineText(item, `ordered-${index}-${itemIndex}`)}</li>)}</ol>);
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s+|^[-*]\s+|^\d+[.)]\s+|^```/.test(lines[index])) paragraph.push(lines[index++]);
    blocks.push(<p key={`paragraph-${index}`}>{inlineText(paragraph.join("\n"), `paragraph-${index}`)}</p>);
  }
  return <div className="nara-rich-text">{blocks}</div>;
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
  const [processingLabel, setProcessingLabel] = useState("Nara sedang berpikir");
  const [copiedId, setCopiedId] = useState("");
  const [size, setSize] = useState(() => {
    const stored = readPreference(NARA_SIZE_KEY, "small");
    return VALID_NARA_SIZES.has(stored) ? stored : "small";
  });
  const [autoVoice, setAutoVoice] = useState(() => readPreference(NARA_VOICE_KEY, "false") === "true");
  const [speakingId, setSpeakingId] = useState("");
  const cameraInput = useRef(null);
  const imageInput = useRef(null);
  const fileInput = useRef(null);
  const recognition = useRef(null);
  const activeRequest = useRef(null);
  const scrollArea = useRef(null);
  const layerRef = useRef(null);

  const stopSpeech = () => {
    try { window.speechSynthesis?.cancel(); } catch { /* Browser tanpa speech synthesis. */ }
    setSpeakingId("");
  };

  const speakMessage = (message) => {
    if (!message?.text) return;
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setNotice("Speaker balasan suara belum didukung browser ini.");
      return;
    }
    if (speakingId === message.id) {
      stopSpeech();
      return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.lang = "id-ID";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setSpeakingId("");
    utterance.onerror = () => { setSpeakingId(""); setNotice("Balasan suara belum dapat diputar."); };
    setSpeakingId(message.id);
    window.speechSynthesis.speak(utterance);
  };

  const closeNara = () => {
    stopSpeech();
    setOpen(false);
  };

  const changeSize = (next) => {
    if (!VALID_NARA_SIZES.has(next)) return;
    setSize(next);
    writePreference(NARA_SIZE_KEY, next);
  };

  const toggleAutoVoice = () => {
    const next = !autoVoice;
    setAutoVoice(next);
    writePreference(NARA_VOICE_KEY, String(next));
    if (!next) stopSpeech();
  };

  useEffect(() => {
    setMessages((current) => current.length ? current : [{
      id: uid(),
      role: "assistant",
      text: user
        ? `Halo ${user.user_metadata?.full_name?.split(" ")[0] || ""}. Saya Nara, asisten Ngeblogging Anda. Saya bisa membantu menulis, meriset ide, memperbaiki SEO, dan memahami lampiran.`.replace("Halo .", "Halo." )
        : "Halo, saya Nara—Asisten AI Resmi Ngeblogging. Anda dapat bertanya, berbicara melalui mikrofon, atau menambahkan gambar dan file teks.",
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

  useEffect(() => {
    writePreference(NARA_SIZE_KEY, size);
    const layer = layerRef.current;
    const fullScreen = open && size === "full";
    const interaction = fullScreen ? "modal" : "nonmodal";
    const synchronizeInteraction = () => {
      if (layer) {
        if (layer.dataset.naraInteraction !== interaction) layer.dataset.naraInteraction = interaction;
        if (layer.getAttribute("aria-modal") !== String(fullScreen)) {
          layer.setAttribute("aria-modal", String(fullScreen));
        }
      }
      document.body.classList.toggle("nara-fullscreen-open-v148", fullScreen);
    };

    synchronizeInteraction();
    const observer = layer && typeof MutationObserver !== "undefined"
      ? new MutationObserver(synchronizeInteraction)
      : null;
    observer?.observe(layer, {
      attributes: true,
      attributeFilter: ["aria-modal", "data-nara-interaction"],
    });
    const frame = requestAnimationFrame(synchronizeInteraction);

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      if (fullScreen) document.body.classList.remove("nara-fullscreen-open-v148");
    };
  }, [open, size]);

  useEffect(() => () => {
    recognition.current?.stop?.();
    activeRequest.current?.abort?.();
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
  }, []);

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
      const optimizedCount = prepared.filter((item) => item.kind === "image" && item.originalSize > item.size).length;
      if (optimizedCount) setNotice(`${optimizedCount} gambar dioptimalkan agar Nara lebih cepat membacanya.`);
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
    activeRequest.current?.abort?.();
    activeRequest.current = null;
    stopSpeech();
    setMessages([{ id: uid(), role: "assistant", text: "Percakapan baru dimulai. Apa yang ingin Anda kerjakan?" }]);
    setInput("");
    setAttachments([]);
  };

  const copyAnswer = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId((current) => current === message.id ? "" : current), 1800);
    } catch {
      setNotice("Jawaban belum dapat disalin otomatis. Tekan lama pada teks untuk menyalin.");
    }
  };

  const requestPro = async () => {
    if (!user) {
      setShowUpgrade(false);
      closeNara();
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

  const send = async (retryOutgoing = null, errorId = "") => {
    const retryRequest = retryOutgoing?.role === "user" ? retryOutgoing : null;
    const text = retryRequest?.text || input.trim();
    const requestAttachments = retryRequest?.attachments || attachments;
    if ((!text && !requestAttachments.length) || busy) return;
    const requestModel = retryRequest?.requestModel || model;
    const requestIntelligence = retryRequest?.requestIntelligence || intelligence;
    const modelOption = modelOptions.find((item) => item.id === requestModel);
    const intelligenceOption = intelligenceOptions.find((item) => item.id === requestIntelligence);
    if ((modelOption?.pro || intelligenceOption?.pro) && plan !== "pro") {
      setShowUpgrade(true);
      return;
    }

    const outgoing = retryRequest || {
      id: uid(),
      role: "user",
      text: text || "Tolong analisis lampiran ini.",
      attachments: requestAttachments,
      requestModel,
      requestIntelligence,
    };
    if (retryRequest) setMessages((current) => current.filter((message) => message.id !== errorId));
    else {
      setMessages((current) => [...current, outgoing]);
      setInput("");
      setAttachments([]);
    }
    setNotice("");
    setProcessingLabel(outgoing.attachments.some((item) => item.kind === "image") ? "Nara sedang membaca gambar" : "Nara sedang menyusun jawaban");
    setBusy(true);

    const controller = new AbortController();
    activeRequest.current = controller;
    const clientTimer = setTimeout(() => controller.abort(), 58_000);
    try {
      let accessToken = "";
      if (supabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token || "";
      }
      const response = await fetch("/api/nara", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: outgoing.text,
          model: requestModel,
          intelligence: requestIntelligence,
          context,
          attachments: outgoing.attachments.map(({ name, type, size: attachmentSize, kind, dataUrl, text: fileText }) => ({ name, type, size: attachmentSize, kind, dataUrl, text: fileText })),
          history: messages
            .filter((message) => message.role !== "error" && message.id !== outgoing.id)
            .slice(-16)
            .map(({ role, text: messageText }) => ({ role, content: messageText })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 403 && data.code === "PLAN_REQUIRED") setShowUpgrade(true);
        throw Object.assign(new Error(friendlyError(data.error, response.status)), {
          status: response.status,
          code: data.code,
          retryable: data.retryable ?? (response.status >= 500 || response.status === 429),
        });
      }
      setMessages((current) => [...current, {
        id: uid(),
        role: "assistant",
        text: data.answer || "Nara belum menghasilkan jawaban.",
        model: data.modelLabel,
        mode: data.intelligenceLabel,
        remaining: data.remaining,
      }]);
    } catch (error) {
      if (activeRequest.current !== controller) return;
      const cancelled = error.name === "AbortError";
      setMessages((current) => [...current, {
        id: uid(),
        role: "error",
        text: cancelled ? "Permintaan dihentikan. Anda dapat mencoba lagi saat siap." : friendlyError(error.message, error.status),
        retry: cancelled || error.retryable ? outgoing : null,
      }]);
    } finally {
      clearTimeout(clientTimer);
      if (activeRequest.current === controller) activeRequest.current = null;
      setBusy(false);
    }
  };

  return (
    <>
      <style data-nara-global-authority-v271>{NARA_GLOBAL_AUTHORITY_V271}</style>
      <button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">
        <span><Sparkles /></span>
        <b>Nara AI</b>
        <small>Assistant</small>
      </button>

      {open && (
        <div ref={layerRef} className="nara-assistant-layer" data-nara-interaction={size === "full" ? "modal" : "nonmodal"} role="dialog" aria-modal={size === "full"} aria-label="Nara AI Assistant">
          <button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} onClick={closeNara} aria-label="Tutup Nara" />
          <aside className="nara-assistant-shell" aria-busy={busy} data-nara-size={size} data-nara-native-size="v149">
            <div className="nara-assistant-header">
              <div className="nara-brand-orb"><Sparkles /></div>
              <div>
                <span><b>Nara</b><em>AI</em>{plan === "pro" && <i>PRO</i>}</span>
                <small><i /> Asisten resmi Ngeblogging</small>
              </div>
              <div className="nara-size-controls-v147 nara-native-size-controls-v149" role="group" aria-label="Ukuran jendela Nara AI">
                {["small", "medium", "full"].map((option) => <button type="button" key={option} data-size={option} className={size === option ? "active" : ""} aria-pressed={size === option} aria-label={option === "small" ? "Ukuran kecil" : option === "medium" ? "Ukuran medium" : "Layar penuh"} title={option === "small" ? "Kecil" : option === "medium" ? "Medium" : "Layar penuh"} onClick={() => changeSize(option)}><NaraWindowIcon size={option}/></button>)}
              </div>
              <button className={`nara-auto-voice-v148 nara-native-auto-voice-v149${autoVoice ? " active" : ""}`} onClick={toggleAutoVoice} aria-label="Balasan suara otomatis" aria-pressed={autoVoice} title={autoVoice ? "Matikan balasan suara otomatis" : "Aktifkan balasan suara otomatis"}><SpeakerIcon/></button>
              <button onClick={resetChat} title="Percakapan baru"><RotateCcw /></button>
              <button onClick={closeNara} aria-label="Tutup Nara" title="Tutup"><X /></button>
            </div>

            <div className="nara-context-bar">
              <span><ShieldCheck /> Jawaban privat</span>
              <button onClick={() => setShowUpgrade(true)}>{plan === "pro" ? <><Crown /> Pro aktif</> : <><Zap /> Upgrade Pro</>}</button>
            </div>

            <div className="nara-assistant-messages" ref={scrollArea} aria-live="polite">
              {messages.map((message) => (
                <div className={`nara-message ${message.role}`} key={message.id}>
                  {message.role !== "user" && <span className="nara-message-avatar">{message.role === "error" ? "!" : <Sparkles />}</span>}
                  <div>
                    {message.role === "assistant"
                      ? <div className="nara-message-content"><RichMessage text={message.text} /></div>
                      : <p>{message.text}</p>}
                    {message.attachments?.some((item) => item.preview) && (
                      <div className="nara-message-image-grid">
                        {message.attachments.filter((item) => item.preview).map((item) => <img key={item.id} src={item.preview} alt={`Lampiran ${item.name}`} />)}
                      </div>
                    )}
                    {message.attachments?.length > 0 && (
                      <div className="nara-message-files">{message.attachments.map((item) => <small key={item.id}><Paperclip />{item.name}</small>)}</div>
                    )}
                    {(message.model || message.mode || Number.isFinite(message.remaining)) && (
                      <small className="nara-message-meta">
                        {[message.model, message.mode].filter(Boolean).join(" · ")}
                        {Number.isFinite(message.remaining) ? ` · ${message.remaining} respons tersisa hari ini` : ""}
                      </small>
                    )}
                    {message.role === "assistant" && message.text && (
                      <div className="nara-message-actions-v149">
                        <button className="nara-message-action" onClick={() => copyAnswer(message)}>
                          {copiedId === message.id ? <Check /> : <Copy />}{copiedId === message.id ? "Tersalin" : "Salin"}
                        </button>
                        <button className={`nara-message-action nara-speech-action-v147 nara-speech-action-v149${speakingId === message.id ? " speaking" : ""}`} onClick={() => speakMessage(message)} aria-label="Bacakan balasan Nara" aria-pressed={speakingId === message.id} title="Bacakan balasan Nara"><SpeakerIcon/><span>{speakingId === message.id ? "Hentikan" : "Dengar"}</span></button>
                      </div>
                    )}
                    {message.role === "error" && message.retry && (
                      <button className="nara-message-action retry" onClick={() => send(message.retry, message.id)}>
                        <RefreshCw /> Coba lagi
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="nara-message assistant"><span className="nara-message-avatar"><Sparkles /></span><div className="nara-thinking"><i/><i/><i/><span>{processingLabel}</span><button onClick={() => activeRequest.current?.abort?.()}>Batalkan</button></div></div>}
            </div>

            <div className="nara-quick-prompts">
              {["Buat ide artikel", "Perbaiki tulisan", "Audit SEO", "Jelaskan gambar"].map((prompt) => (
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
                  <button disabled={busy} className={attachmentMenu ? "active" : ""} onClick={() => setAttachmentMenu(!attachmentMenu)} title="Tambahkan lampiran"><Plus /></button>
                  {attachmentMenu && (
                    <div className="nara-attachment-menu">
                      <button onClick={() => cameraInput.current?.click()}><Camera /><span><b>Kamera</b><small>Ambil foto sekarang</small></span></button>
                      <button onClick={() => imageInput.current?.click()}><ImageIcon /><span><b>Foto</b><small>Pilih dari perangkat</small></span></button>
                      <button onClick={() => fileInput.current?.click()}><File /><span><b>File teks</b><small>TXT, Markdown, CSV, atau JSON</small></span></button>
                    </div>
                  )}
                </div>
                <button disabled={busy} className={listening ? "listening" : ""} onClick={startVoice} title="Pertanyaan suara" aria-label={listening ? "Hentikan mikrofon" : "Mulai mikrofon"}>{listening ? <MicOff /> : <Mic />}</button>
                <label className="nara-select intelligence">
                  <span>{selectedIntelligence?.label}</span><ChevronDown />
                  <select disabled={busy} value={intelligence} onChange={(event) => selectPremiumAware("intelligence", event.target.value)} aria-label="Tingkat kecerdasan">
                    {intelligenceOptions.map((item) => <option value={item.id} key={item.id}>{item.label}{item.pro ? " · Pro" : ""}</option>)}
                  </select>
                </label>
                <label className="nara-select model">
                  <span>{selectedModel?.label}{selectedModel?.pro && <LockKeyhole />}</span><ChevronDown />
                  <select disabled={busy} value={model} onChange={(event) => selectPremiumAware("model", event.target.value)} aria-label="Model Nara">
                    {modelOptions.map((item) => <option value={item.id} key={item.id}>{item.label}{item.pro ? " · Pro" : ""}</option>)}
                  </select>
                </label>
                <button className="nara-send" aria-label="Kirim pesan" disabled={busy || (!input.trim() && !attachments.length)} onClick={() => send()}>{busy ? <LoaderCircle className="spin" /> : <Send />}</button>
              </div>
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
              <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
              <input ref={fileInput} type="file" accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
            </div>
          </aside>

          {showUpgrade && (
            <div className="nara-upgrade-card">
              <button className="nara-upgrade-close" aria-label="Tutup pilihan Pro" onClick={() => setShowUpgrade(false)}><X /></button>
              <span className="nara-upgrade-icon"><Crown /></span>
              <small>NARA PRO</small>
              <h2>Lebih dalam. Lebih panjang. Lebih bertenaga.</h2>
              <p>Buka kecerdasan Tinggi dan Maksimal, model khusus penulisan, analisis gambar, serta batas pemakaian yang lebih besar.</p>
              <div className="nara-plan-grid">
                <article><b>Gratis</b><strong>Rp0</strong><span><Check /> Instan & Sedang</span><span><Check /> Nara Mini</span><span><Check /> Lampiran dasar</span></article>
                <article className="featured"><b>Pro</b><strong>Premium</strong><span><Check /> Tinggi & Maksimal</span><span><Check /> Semua model Nara</span><span><Check /> Prioritas & riwayat panjang</span></article>
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
