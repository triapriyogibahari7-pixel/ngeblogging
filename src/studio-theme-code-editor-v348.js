import "./studio-theme-code-editor-v348.css";

export const STUDIO_THEME_CODE_EDITOR_RELEASE_V348 = "studio-theme-code-editor-v348-20260930";

const initialized = new WeakSet();
let frame = 0;

function languageFromPane(pane){
  const active = pane?.querySelector?.(":scope > nav > button.active, :scope > nav > button[aria-selected='true']");
  const text = String(active?.textContent || "").trim().toLowerCase();
  if (text.includes("javascript")) return "javascript";
  if (text.includes("css")) return "css";
  return "html";
}

function escapeHtml(value){
  return String(value).replace(/[&<>"]/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[char]));
}

function analyzeSource(source, language){
  const text = String(source || "");
  const lines = text.split("\n");
  const nonEmpty = lines.filter((line) => line.trim()).length;
  const counts = {
    htmlTags: language === "html" ? (text.match(/<\/?[a-zA-Z][^>]*>/g) || []).length : 0,
    cssRules: language === "css" ? (text.match(/[^{}]+\{/g) || []).length : 0,
    functions: language === "javascript" ? (text.match(/\b(?:function\s+[\w$]+|[\w$]+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g) || []).length : 0,
  };

  const mismatches = [];
  for (const pair of [["{","}"],["[","]"],["(",")"]]){
    const openCount = text.split(pair[0]).length - 1;
    const closeCount = text.split(pair[1]).length - 1;
    if (openCount !== closeCount) mismatches.push(pair[0] + pair[1] + ": " + openCount + "/" + closeCount);
  }

  if (language === "html"){
    const opens = [...text.matchAll(/<([a-zA-Z][\w:-]*)(?:\s[^>]*)?>/g)].map((m) => m[1].toLowerCase());
    const voids = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
    const stack = [];
    for (const tag of opens) if (!voids.has(tag)) stack.push(tag);
    const closes = [...text.matchAll(/<\/([a-zA-Z][\w:-]*)\s*>/g)].map((m) => m[1].toLowerCase());
    if (stack.length && closes.length < stack.length) mismatches.push("HTML tag stack belum tertutup: " + stack.slice(-3).join(", "));
  }

  return { lines: lines.length, nonEmpty, mismatches, counts };
}

function setStatus(pane, textarea){
  const language = languageFromPane(pane);
  const result = analyzeSource(textarea.value, language);
  const status = pane.querySelector(".tn-code-status");
  if (!status) return;

  let meta = status.querySelector(".tn-code-metrics-v348");
  if (!meta){
    meta = document.createElement("small");
    meta.className = "tn-code-metrics-v348";
    meta.style.cssText = "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8da0ba;font:500 9px/1.2 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;";
    status.insertBefore(meta, status.querySelector(".tn-code-status-v348"));
  }

  const detail = language === "html"
    ? (result.counts.htmlTags + " tag")
    : language === "css"
      ? (result.counts.cssRules + " rule")
      : (result.counts.functions + " function");

  meta.textContent = result.lines.toLocaleString("id-ID") + " baris · " + result.nonEmpty.toLocaleString("id-ID") + " terisi · " + detail;
  meta.title = result.mismatches.length
    ? "Periksa: " + result.mismatches.join(" · ")
    : "Struktur dasar terdeteksi tanpa ketidakseimbangan kurung";

  const analyze = pane.querySelector(".tn-code-analysis-v348");
  if (analyze){
    analyze.innerHTML = result.mismatches.length
      ? "<b>Perlu diperiksa</b><br><span class='warn'>" + result.mismatches.map(escapeHtml).join("<br>") + "</span>"
      : "<b>Struktur dasar terbaca</b><br><span class='ok'>" + detail + " · " + result.lines.toLocaleString("id-ID") + " baris · kurung seimbang.</span>";
  }
}

function indentFor(value){
  const before = String(value).split("\n").pop() || "";
  const base = (before.match(/^\s*/) || [""])[0];
  if (/[{[(]\s*$/.test(before) || /<([a-zA-Z][\w:-]*)(?:\s[^>]*)?>\s*$/.test(before) && !/<\/\w+>\s*$/.test(before)){
    return base + "  ";
  }
  return base;
}

function insertText(textarea, text){
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const nextValue = value.slice(0,start) + text + value.slice(end);
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) setter.call(textarea, nextValue);
  else textarea.value = nextValue;
  const caret = start + text.length;
  textarea.selectionStart = caret;
  textarea.selectionEnd = caret;
  textarea.dispatchEvent(new Event("input", { bubbles:true }));
}

function smartKeydown(event, textarea, pane){
  if (event.key === "Tab"){
    event.preventDefault();
    const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    if (selected && selected.includes("\n")){
      const indent = event.shiftKey ? "" : "  ";
      const replacement = selected.split("\n").map((line) => event.shiftKey ? line.replace(/^  /,"") : indent + line).join("\n");
      insertText(textarea, replacement);
    } else {
      insertText(textarea, "  ");
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f"){
    event.preventDefault();
    const bar = pane.querySelector(".tn-code-findbar-v348");
    bar?.setAttribute("data-open","true");
    bar?.querySelector("input")?.focus();
    return;
  }

  if (event.key === "Escape"){
    pane.querySelector(".tn-code-findbar-v348")?.setAttribute("data-open","false");
    pane.querySelector(".tn-code-analysis-v348")?.setAttribute("data-open","false");
    return;
  }

  if (event.key === "Enter"){
    const start = textarea.selectionStart;
    const lineStart = textarea.value.lastIndexOf("\n", start - 1) + 1;
    const before = textarea.value.slice(lineStart, start);
    event.preventDefault();
    insertText(textarea, "\n" + indentFor(before));
    return;
  }

  const pairs = {"{":"}","[":"]","(":")",'"':'"',"'":"'"};
  const close = pairs[event.key];
  if (close && textarea.selectionStart === textarea.selectionEnd){
    const next = textarea.value[textarea.selectionStart];
    if (next === close){
      event.preventDefault();
      textarea.selectionStart += 1;
      textarea.selectionEnd += 1;
      return;
    }
    event.preventDefault();
    insertText(textarea, event.key + close);
    textarea.selectionStart -= 1;
    textarea.selectionEnd = textarea.selectionStart;
  }
}

function findNext(textarea, query){
  const needle = String(query || "");
  if (!needle) return;
  const value = textarea.value;
  const lower = value.toLowerCase();
  const from = textarea.selectionEnd;
  const first = lower.indexOf(needle.toLowerCase(), from);
  const index = first >= 0 ? first : lower.indexOf(needle.toLowerCase(), 0);
  if (index < 0) return;
  textarea.focus();
  textarea.setSelectionRange(index, index + needle.length);
}

function mountFindbar(pane, textarea){
  const bar = document.createElement("div");
  bar.className = "tn-code-findbar-v348";
  bar.innerHTML = "<input type='search' aria-label='Cari dalam kode' placeholder='Cari HTML, CSS, JavaScript…'><button type='button' data-find='next'>Berikutnya</button><button type='button' data-find='close'>×</button>";
  pane.appendChild(bar);

  const input = bar.querySelector("input");
  bar.addEventListener("click", (event) => {
    const action = event.target.closest("button")?.dataset.find;
    if (action === "next") findNext(textarea, input.value);
    if (action === "close"){
      bar.setAttribute("data-open","false");
      textarea.focus();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter"){
      event.preventDefault();
      findNext(textarea, input.value);
    }
    if (event.key === "Escape"){
      bar.setAttribute("data-open","false");
      textarea.focus();
    }
  });
}

function mountTools(pane, textarea){
  const status = pane.querySelector(".tn-code-status");
  if (!status) return;

  const tools = document.createElement("div");
  tools.className = "tn-code-status-v348";
  tools.innerHTML = "<button type='button' data-tool='wrap' title='Bungkus baris panjang'>Bungkus</button><button type='button' data-tool='find' title='Cari dalam kode'>Cari</button><button type='button' data-tool='analysis' title='Baca struktur kode'>Analisis</button>";
  status.appendChild(tools);

  pane.dataset.v348Wrap = "on";

  const applyWrap = (on) => {
    pane.dataset.v348Wrap = on ? "on" : "off";
    textarea.wrap = on ? "soft" : "off";
    tools.querySelector("[data-tool='wrap']")?.setAttribute("data-active", String(on));
  };

  applyWrap(true);

  tools.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.tool;

    if (action === "wrap") applyWrap(pane.dataset.v348Wrap !== "on");

    if (action === "find"){
      const bar = pane.querySelector(".tn-code-findbar-v348");
      bar?.setAttribute("data-open","true");
      bar?.querySelector("input")?.focus();
    }

    if (action === "analysis"){
      const panel = pane.querySelector(".tn-code-analysis-v348");
      panel?.setAttribute("data-open", panel?.getAttribute("data-open") !== "true" ? "true" : "false");
      setStatus(pane, textarea);
    }
  });
}

function normalizeWorkspace(workspace){
  if (!(workspace instanceof HTMLElement)) return;
  const pane = workspace.querySelector(":scope > .tn-code-pane");
  const textarea = pane?.querySelector(":scope > textarea");
  if (!pane || !textarea || initialized.has(pane)) return;

  initialized.add(pane);
  textarea.spellcheck = false;
  textarea.autocomplete = "off";
  textarea.setAttribute("wrap","soft");
  pane.dataset.v348Ready = "true";

  mountTools(pane, textarea);
  mountFindbar(pane, textarea);

  const analysis = document.createElement("div");
  analysis.className = "tn-code-analysis-v348";
  pane.appendChild(analysis);

  textarea.addEventListener("keydown", (event) => smartKeydown(event, textarea, pane));
  textarea.addEventListener("input", () => setStatus(pane, textarea));
  textarea.addEventListener("click", () => setStatus(pane, textarea));
  textarea.addEventListener("keyup", () => setStatus(pane, textarea));
  pane.querySelectorAll(":scope > nav > button").forEach((button) => button.addEventListener("click", () => setTimeout(() => setStatus(pane, textarea), 0)));
  setStatus(pane, textarea);
}

function sync(){
  frame = 0;
  document.documentElement.dataset.studioThemeCodeEditorV348 = STUDIO_THEME_CODE_EDITOR_RELEASE_V348;
  document.querySelectorAll(".tn-code-workspace").forEach(normalizeWorkspace);
}

function schedule(delay = 0){
  if (delay){
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = window.requestAnimationFrame(sync);
}

if (typeof window !== "undefined" && typeof document !== "undefined"){
  document.addEventListener("click", () => { schedule(); schedule(80); schedule(220); }, { passive:true });
  window.addEventListener("resize", () => schedule(30), { passive:true });
  window.addEventListener("orientationchange", () => schedule(60), { passive:true });
  window.addEventListener("pageshow", () => schedule(), { passive:true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once:true });
  else schedule();
  schedule(260);
  schedule(900);
}
