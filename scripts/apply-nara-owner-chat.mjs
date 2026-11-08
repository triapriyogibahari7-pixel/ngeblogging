import { readFile, writeFile } from 'node:fs/promises';
const paths = ['src/NaraAssistant.jsx', 'server/nara-handler.mjs', 'server/nara-image-handler.mjs'];
const sources = new Map(await Promise.all(paths.map(async path => [path, await readFile(path, 'utf8')])));
function replace(path, from, to) {
  const source = sources.get(path);
  if (!source.includes(from) || source.indexOf(from) !== source.lastIndexOf(from)) throw new Error(`Patch target changed: ${path}: ${from.slice(0,80)}`);
  sources.set(path, source.replace(from, to));
}
const ui = paths[0], core = paths[1], generator = paths[2];
replace(ui, '  const [internalOpen, setInternalOpen] = useState(false);', `  const ownerMultimodal = Boolean(user?.id && user?.email_confirmed_at && String(user.email || '').trim().toLowerCase() === 'triapriyogibahari7@gmail.com');
  const [internalOpen, setInternalOpen] = useState(false);`);
replace(ui, '  const [intelligence, setIntelligence] = useState("standard");', '  const [intelligence, setIntelligence] = useState(ownerMultimodal ? "xhigh" : "standard");');
replace(ui, '  const [model, setModel] = useState("nara-mini");', '  const [model, setModel] = useState(ownerMultimodal ? "nara-max" : "nara-mini");');
replace(ui, '    const outgoing = retryRequest ||', `    const imageTask = ownerMultimodal && requestModel === 'nara-max' && requestIntelligence === 'xhigh' && /^(?:(?:tolong|silakan|please)\\s+)?(?:buat(?:kan)?|hasilkan|generate|create|draw|gambarkan)\\b[\\s\\S]{0,80}\\b(?:gambar|ilustrasi|foto|image|picture|poster|logo)\\b/i.test(text);
    if (imageTask && requestAttachments.length) { setNotice('Pembuatan gambar dengan referensi lampiran belum didukung jalur ini. Kirim perintah tanpa lampiran; untuk membaca gambar, ajukan pertanyaan analisis.'); return; }
    const outgoing = retryRequest ||`);
replace(ui, '      const response = await fetch("/api/nara", {', '      const response = await fetch(imageTask ? "/api/nara/image" : "/api/nara", {');
replace(ui, 'body: JSON.stringify({ message: outgoing.text, model: requestModel, intelligence: requestIntelligence, context,', `body: JSON.stringify(imageTask ? { chat: true, prompt: outgoing.text, size: '1K' } : { message: outgoing.text, model: requestModel, intelligence: requestIntelligence, context,`);
replace(ui, 'history: messages.filter((message) => message.role !== "error" && message.id !== outgoing.id).slice(-16).map(({ role, text: messageText }) => ({ role, content: messageText }))', `history: (() => {
            let budget = 4 - outgoing.attachments.filter(item => item.kind === 'image').length;
            return messages.filter(message => message.role !== 'error' && message.id !== outgoing.id).slice(-16).reverse().map(message => {
              const images = ownerMultimodal && message.role === 'user' ? (message.attachments || []).filter(item => item.kind === 'image').slice(0, budget) : [];
              budget -= images.length;
              return { role: message.role, content: message.text, ...(images.length ? { attachments: images.map(({kind,dataUrl}) => ({kind,dataUrl})) } : {}) };
            }).reverse();
          })()`);
replace(ui, '      setMessages((current) => [...current, { id: uid(), role: "assistant", text: data.answer || "Nara belum menghasilkan jawaban.", model: data.modelLabel, mode: data.intelligenceLabel, remaining: data.remaining }]);', `      if (imageTask && !/^data:image\\/(png|jpeg|webp);base64,/.test(data.imageDataUrl || '')) throw new Error('Penyedia belum mengembalikan gambar yang dapat ditampilkan.');
      setMessages((current) => [...current, { id: uid(), role: 'assistant', text: imageTask ? 'Gambar berhasil dibuat. Hasil ini tidak otomatis disimpan ke media publik.' : data.answer || 'Nara belum menghasilkan jawaban.', generatedImage: imageTask ? data.imageDataUrl : null, model: data.modelLabel || data.model, mode: data.intelligenceLabel, remaining: data.remaining }]);`);
replace(ui, '              {message.attachments?.some((item) => item.preview)', `              {message.generatedImage && <figure><img src={message.generatedImage} alt="Gambar hasil Nara" style={{maxWidth:'100%',height:'auto'}} /><a href={message.generatedImage} download="gambar-nara.png">Unduh gambar</a></figure>}
              {message.attachments?.some((item) => item.preview)`);
replace(ui, '["Buat ide artikel", "Perbaiki tulisan", "Audit SEO", "Jelaskan gambar"].map', '(ownerMultimodal ? ["Buat ide artikel", "Perbaiki tulisan", "Audit SEO"] : ["Buat ide artikel", "Perbaiki tulisan", "Audit SEO", "Jelaskan gambar"]).map');
replace(core, 'const INTELLIGENCE = {', `import { isNaraMultimodalOwner, buildOwnerMultimodalHistory } from './nara-owner-multimodal.mjs';
const INTELLIGENCE = {`);
replace(core, '  const hasImages = attachments.some((item) => item.kind === "image");', '  let hasImages = attachments.some((item) => item.kind === "image");');
replace(core, '  const controller = new AbortController();', `  let history = sanitizeHistory(input.history, intelligence.historyItems);
  if (isNaraMultimodalOwner(user)) {
    try {
      history = buildOwnerMultimodalHistory(input.history, user, intelligence.historyItems);
      const historyImages = history.reduce((sum, item) => sum + (Array.isArray(item.content) ? item.content.filter(part => part.type === 'image_url').length : 0), 0);
      const currentImages = attachments.filter(item => item.kind === 'image').length;
      if (historyImages + currentImages > 4) throw new Error('HISTORY_IMAGE_LIMIT');
      hasImages = hasImages || historyImages > 0;
      if (hasImages && !model.vision) return json(event, 400, { code: 'VISION_MODEL_REQUIRED', error: 'Gunakan Nara Max atau Nara Vision untuk melanjutkan konteks gambar.' }, env);
    } catch { return json(event, 400, { code: 'HISTORY_IMAGE_INVALID', error: 'Konteks gambar tidak valid atau melebihi empat gambar. Mulai percakapan baru atau kurangi gambar.' }, env); }
  }
  const controller = new AbortController();`);
replace(core, '...sanitizeHistory(input.history, intelligence.historyItems),', '...history,');
replace(generator, 'const DEFAULT_SUPABASE_URL =', `import { isNaraMultimodalOwner } from './nara-owner-multimodal.mjs';
const DEFAULT_SUPABASE_URL =`);
replace(generator, '    if (!/^[0-9a-f-]{36}$/i.test(siteId)) return json(400,{error:"Situs aktif tidak valid."},requestId);\n    await verifySiteAccess(session,siteId);', `    const chat = body.chat === true;
    if (chat && !isNaraMultimodalOwner(session.user)) return json(403,{code:'OWNER_REQUIRED',error:'Chat gambar ini khusus akun admin terverifikasi.'},requestId);
    if (!chat) {
      if (!/^[0-9a-f-]{36}$/i.test(siteId)) return json(400,{error:'Situs aktif tidak valid.'},requestId);
      await verifySiteAccess(session,siteId);
    }`);
replace(generator, '    const path =', `    if (chat) {
      if (generated.bytes.byteLength > 8 * 1024 * 1024) return json(413,{code:'CHAT_IMAGE_TOO_LARGE',error:'Gambar terlalu besar untuk dikirim langsung dalam chat.'},requestId);
      const bytes = new Uint8Array(generated.bytes);
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
      if (!png && !jpeg && !webp) throw Object.assign(new Error('Penyedia mengembalikan format bukan gambar yang didukung.'),{status:502,code:'CHAT_IMAGE_FORMAT_INVALID'});
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset,offset+8192));
      const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/webp';
      return json(200,{imageDataUrl:'data:'+mime+';base64,'+btoa(binary),model:generated.model,provider:generated.provider,size,remaining:quota.remaining,storage:'chat-only'},requestId);
    }
    const path =`);
for (const [path, content] of sources) await writeFile(path, content);
