import "./studio-theme-code-editor-v349.css";

export const STUDIO_THEME_CODE_EDITOR_RELEASE_V349 = "studio-theme-code-editor-v349-20260930";

const mounted = new WeakSet();
let raf = 0;

function getLanguage(pane){
  const active = pane && pane.querySelector(":scope > nav > button.active");
  const label = String(active ? active.textContent : "").toLowerCase();
  if(label.includes("javascript")) return "javascript";
  if(label.includes("css")) return "css";
  return "html";
}

function analyze(text, language){
  const value = String(text || "");
  const lines = value.split("\n");
  let units = 0;
  if(language === "html") units = (value.match(/<\/?[a-zA-Z][^>]*>/g) || []).length;
  if(language === "css") units = (value.match(/[^{}]+(?=\{)/g) || []).length;
  if(language === "javascript") units = (value.match(/\b(function|class|const|let|var)\b/g) || []).length;

  const warnings = [];
  const pairs = [["{","}"],["[","]"],["(",")"]];
  for(const pair of pairs){
    if(value.split(pair[0]).length !== value.split(pair[1]).length) warnings.push("Kurung " + pair[0] + pair[1] + " tidak seimbang");
  }

  if(language === "html"){
    const opens = [...value.matchAll(/<([a-zA-Z][\w:-]*)(?:\s[^>]*)?>/g)].map(m => m[1].toLowerCase());
    const closes = [...value.matchAll(/<\/([a-zA-Z][\w:-]*)\s*>/g)].map(m => m[1].toLowerCase());
    const voids = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
    const stack = [];
    for(const tag of opens) if(!voids.has(tag)) stack.push(tag);
    for(const tag of closes){
      const index = stack.lastIndexOf(tag);
      if(index >= 0) stack.splice(index, 1);
    }
    if(stack.length) warnings.push("Tag HTML belum tertutup: " + stack.slice(-6).join(", "));
  }

  return { lines: lines.length, nonEmpty: lines.filter(x => x.trim()).length, units, warnings, language };
}

function setNativeValue(textarea, value){
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if(setter) setter.call(textarea, value);
  else textarea.value = value;
}

function insertAt(textarea, replacement, start, end){
  const value = textarea.value;
  setNativeValue(textarea, value.slice(0,start) + replacement + value.slice(end));
  const caret = start + replacement.length;
  textarea.selectionStart = caret;
  textarea.selectionEnd = caret;
  textarea.dispatchEvent(new Event("input", { bubbles:true }));
}

function update(pane, textarea, insight){
  const result = analyze(textarea.value, getLanguage(pane));
  const metrics = pane.querySelector(".tn-code-v349-metrics");
  if(metrics){
    const unit = result.language === "html" ? "tag" : result.language === "css" ? "rule" : "blok";
    metrics.textContent = result.lines.toLocaleString("id-ID") + " baris · " + result.nonEmpty.toLocaleString("id-ID") + " terisi · " + result.units.toLocaleString("id-ID") + " " + unit + (result.warnings.length ? " · perlu diperiksa" : "");
  }
  insight.innerHTML = "<b>" + result.language.toUpperCase() + " · PEMBACAAN KODE</b><br>Baris: <code>" + result.lines.toLocaleString("id-ID") + "</code> · Terisi: <code>" + result.nonEmpty.toLocaleString("id-ID") + "</code> · Struktur: <code>" + result.units.toLocaleString("id-ID") + "</code>" + (result.warnings.length ? "<br><br>⚠ " + result.warnings.join("<br>") : "<br><br>✓ Struktur dasar terbaca dan kurung seimbang.");
}

function findNext(textarea, query){
  const q = String(query || "").trim().toLowerCase();
  if(!q) return;
  const value = textarea.value.toLowerCase();
  const start = textarea.selectionEnd;
  const first = value.indexOf(q, start);
  const found = first >= 0 ? first : value.indexOf(q);
  if(found < 0) return;
  textarea.focus();
  textarea.setSelectionRange(found, found + q.length);
}

function mount(pane){
  if(mounted.has(pane)) return;
  const textarea = pane.querySelector(":scope > textarea[data-v342-code-source='ready']");
  if(!textarea) return;
  mounted.add(pane);

  const toolbar = document.createElement("div");
  toolbar.className = "tn-code-v349-toolbar";
  toolbar.innerHTML = "<button type='button' data-action='wrap' data-active='true'>Bungkus baris</button><button type='button' data-action='find'>Cari</button><button type='button' data-action='insight'>Baca kode</button><span class='tn-code-v349-metrics'></span>";
  pane.appendChild(toolbar);

  const insight = document.createElement("div");
  insight.className = "tn-code-v349-insight";
  pane.appendChild(insight);

  const search = document.createElement("div");
  search.className = "tn-code-v349-search";
  search.innerHTML = "<input type='search' placeholder='Cari tag, class, selector, function…' aria-label='Cari kode'><button type='button' data-find='next'>Cari</button><button type='button' data-find='close'>×</button>";
  pane.appendChild(search);

  function applyWrap(on){
    pane.dataset.v349Wrap = on ? "on" : "off";
    textarea.style.whiteSpace = on ? "pre-wrap" : "pre";
    textarea.style.overflowWrap = on ? "anywhere" : "normal";
    textarea.style.wordBreak = on ? "break-word" : "normal";
    toolbar.querySelector("[data-action='wrap']").dataset.active = String(on);
  }

  applyWrap(true);

  toolbar.addEventListener("click", event => {
    const button = event.target.closest("button");
    if(!button) return;
    if(button.dataset.action === "wrap") applyWrap(pane.dataset.v349Wrap !== "on");
    if(button.dataset.action === "find"){
      search.dataset.open = "true";
      search.querySelector("input").focus();
    }
    if(button.dataset.action === "insight"){
      insight.dataset.open = insight.dataset.open !== "true" ? "true" : "false";
      update(pane, textarea, insight);
    }
  });

  search.addEventListener("click", event => {
    const action = event.target.closest("button")?.dataset.find;
    const input = search.querySelector("input");
    if(action === "next") findNext(textarea, input.value);
    if(action === "close"){
      search.dataset.open = "false";
      textarea.focus();
    }
  });

  search.querySelector("input").addEventListener("keydown", event => {
    if(event.key === "Enter"){
      event.preventDefault();
      findNext(textarea, event.currentTarget.value);
    }
    if(event.key === "Escape"){
      search.dataset.open = "false";
      textarea.focus();
    }
  });

  textarea.addEventListener("keydown", event => {
    if(event.key === "Tab"){
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.slice(start,end);
      if(selected.includes("\n")){
        const replacement = selected.split("\n").map(line => event.shiftKey ? line.replace(/^  /,"") : "  " + line).join("\n");
        insertAt(textarea,replacement,start,end);
      }else{
        insertAt(textarea,"  ",start,end);
      }
      return;
    }

    if((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f"){
      event.preventDefault();
      search.dataset.open = "true";
      search.querySelector("input").focus();
      return;
    }

    if(event.key === "Enter"){
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const lineStart = textarea.value.lastIndexOf("\n", start - 1) + 1;
      const current = textarea.value.slice(lineStart,start);
      const base = (current.match(/^\s*/) || [""])[0];
      const extra = /[{[(]\s*$/.test(current) || /<[a-zA-Z][\w:-]*(?:\s[^>]*)?>\s*$/.test(current) ? "  " : "";
      event.preventDefault();
      insertAt(textarea,"\n" + base + extra,start,end);
      return;
    }

    const pairs = {"{":"}","[":"]","(":")"};
    const close = pairs[event.key];
    if(close && textarea.selectionStart === textarea.selectionEnd){
      const pos = textarea.selectionStart;
      if(textarea.value[pos] === close){
        event.preventDefault();
        textarea.selectionStart = pos + 1;
        textarea.selectionEnd = pos + 1;
        return;
      }
      event.preventDefault();
      insertAt(textarea,event.key + close,pos,pos);
      textarea.selectionStart = pos + 1;
      textarea.selectionEnd = pos + 1;
    }
  });

  textarea.addEventListener("input", () => update(pane,textarea,insight));
  textarea.addEventListener("click", () => update(pane,textarea,insight));
  textarea.addEventListener("keyup", () => update(pane,textarea,insight));
  update(pane,textarea,insight);
}

function sync(){
  raf = 0;
  document.querySelectorAll(".tn-code-pane").forEach(mount);
}

function schedule(){
  if(raf) return;
  raf = requestAnimationFrame(sync);
}

if(typeof window !== "undefined" && typeof document !== "undefined"){
  document.addEventListener("click", () => {
    schedule();
    setTimeout(schedule,80);
    setTimeout(schedule,240);
  }, { passive:true });
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("pageshow",schedule,{passive:true});
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",schedule,{once:true});
  else schedule();
  setTimeout(schedule,300);
}