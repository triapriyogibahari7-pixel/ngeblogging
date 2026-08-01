import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-authority-v187-20260801";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V187_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  source = replaceOnce(
    source,
    'import "./studio-mobile-authority-v185.js";',
    'import "./studio-mobile-authority-v185.js";\nimport "./studio-production-authority-v187.js";',
    "STUDIO_ENTRY",
  );
  await write(path, source);
}

async function patchStudioState() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  if (!source.includes('const SIDEBAR_STATE_V187 = "ngeblogging-sidebar-expanded-v187";')) {
    const anchor = source.includes('const ACTIVE_SITE_SNAPSHOT_V186 = "ngeblogging-active-site-snapshot-v186";')
      ? 'const ACTIVE_SITE_SNAPSHOT_V186 = "ngeblogging-active-site-snapshot-v186";'
      : 'const LOCAL_STORE = "ngeblogging-studio-v3";';
    source = replaceOnce(
      source,
      anchor,
      `${anchor}\nconst SIDEBAR_STATE_V187 = "ngeblogging-sidebar-expanded-v187";`,
      "SIDEBAR_CONSTANT",
    );
  }

  if (!source.includes("function readSidebarStateV187")) {
    const anchor = "function relativeTime(value) {";
    const helper = `function readSidebarStateV187() {
  try { return localStorage.getItem(SIDEBAR_STATE_V187) !== "false"; }
  catch { return true; }
}

function writeSidebarStateV187(value) {
  try { localStorage.setItem(SIDEBAR_STATE_V187, String(Boolean(value))); }
  catch { /* storage opsional */ }
}

function documentWordCountV187(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .trim()
    .split(/\\s+/)
    .filter(Boolean).length;
}

${anchor}`;
    source = replaceOnce(source, anchor, helper, "SIDEBAR_HELPERS");
  }

  source = source.replace(
    "  const [sidebar, setSidebar] = useState(true);",
    "  const [sidebar, setSidebar] = useState(readSidebarStateV187);",
  );

  if (!source.includes("studioSidebarStateV187")) {
    const anchor = "  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(\"\"), 3200); return () => clearTimeout(timer); }, [toast]);";
    source = replaceOnce(
      source,
      anchor,
      `${anchor}\n  useEffect(() => {\n    writeSidebarStateV187(sidebar);\n    document.documentElement.dataset.studioSidebarStateV187 = sidebar ? "expanded" : "collapsed";\n  }, [sidebar]);`,
      "SIDEBAR_EFFECT",
    );
  }

  if (!source.includes("documentWordCountV187(active.content)")) {
    const publishStart = source.indexOf("  const publish = () => {");
    const publishEnd = source.indexOf("\n  };", publishStart);
    if (publishStart < 0 || publishEnd < 0) throw new Error("V187_WORD_LIMIT_PUBLISH_RANGE_MISSING");
    const replacement = `  const publish = () => {
    if (!active) return;
    const status = active.status === "published" ? "draft" : "published";
    const wordCount = documentWordCountV187(active.content);
    if (status === "published" && wordCount > 5000) {
      setToast(\`Kurangi \${(wordCount - 5000).toLocaleString("id-ID")} kata sebelum menerbitkan. Draf tetap tersimpan utuh.\`);
      return;
    }
    patch({ status, publishedAt: status === "published" ? new Date().toISOString() : "" });
    setToast(status === "published" ? \`\${active.type === "page" ? "Page" : "Post"} diterbitkan\` : \`\${active.type === "page" ? "Page" : "Post"} menjadi draf\`);
  };`;
    source = `${source.slice(0, publishStart)}${replacement}${source.slice(publishEnd + 5)}`;
  }

  if (!source.includes("active-site-selected-v187")) {
    const selectStart = source.indexOf("  const selectSite = (next) => {");
    const selectLineEnd = source.indexOf("\n", selectStart);
    const selectBlockEnd = source.indexOf("\n  };", selectStart);
    const selectEnd = selectLineEnd > selectStart && source.slice(selectStart, selectLineEnd).includes("};")
      ? selectLineEnd
      : selectBlockEnd + 5;
    if (selectStart < 0 || selectEnd <= selectStart) throw new Error("V187_SELECT_SITE_RANGE_MISSING");
    const replacement = `  const selectSite = (next) => {
    setActiveSiteId(next.id);
    setSite(next);
    setSiteManager(false);
    setDocs([]);
    setView("home");
    window.__ngebloggingActiveSite = next;
    document.documentElement.dataset.activeSiteId = next.id;
    document.documentElement.dataset.activeSiteSelectionV187 = "active-site-selected-v187";
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem("ngeblogging-active-site-snapshot-v186", serialized);
      localStorage.setItem("ngeblogging-active-site-snapshot-v185", serialized);
      localStorage.setItem("ngeblogging-active-site-snapshot-v183", serialized);
    } catch { /* snapshot opsional */ }
    window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: next }));
    setToast(\`Workspace \${next.name} aktif\`);
  };`;
    source = `${source.slice(0, selectStart)}${replacement}${source.slice(selectEnd)}`;
  }

  await write(path, source);
}

async function patchContentEditor() {
  const path = "src/ContentEditor.jsx";
  let source = await read(path);

  source = source.replace(
    '  return <div className="ce-app">',
    '  return <div className="ce-app" data-word-state={words > 5000 ? "over" : words >= 4500 ? "warning" : "normal"}>',
  );

  const oldStatus = '<div className="ce-word-status"><span>{words.toLocaleString("id-ID")} kata</span><span>± {readingMinutes} menit membaca</span><span>{String(doc.content || "").length.toLocaleString("id-ID")} karakter HTML</span></div>';
  const newStatus = '<div className="ce-word-status"><span className={words > 5000 ? "over" : words >= 4500 ? "warning" : ""}>{words.toLocaleString("id-ID")} / 5.000 kata{words > 5000 ? ` · kurangi ${(words - 5000).toLocaleString("id-ID")}` : words >= 4500 ? " · mendekati batas" : ""}</span><span>± {readingMinutes} menit membaca</span><span>{String(doc.content || "").length.toLocaleString("id-ID")} karakter HTML</span></div>';
  if (!source.includes("/ 5.000 kata")) source = replaceOnce(source, oldStatus, newStatus, "EDITOR_WORD_STATUS");

  await write(path, source);
}

async function patchNaraLauncher() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  source = source.replace(
    '<button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">',
    '<button className="nara-floating-button" onClick={() => { changeSize("small"); setOpen(true); }} aria-label="Buka Nara AI Assistant dalam ukuran kecil">',
  );
  source = source.replace(
    '<button className="nara-floating-button" onClick={() => { changeSize("small"); setOpen(true); }} aria-label="Buka Nara AI Assistant">',
    '<button className="nara-floating-button" onClick={() => { changeSize("small"); setOpen(true); }} aria-label="Buka Nara AI Assistant dalam ukuran kecil">',
  );
  source = source.replace(
    '<button onClick={closeNara} title="Tutup"><X /></button>',
    '<button onClick={closeNara} title="Tutup" aria-label="Tutup Nara AI"><X /></button>',
  );
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v187-production-authority-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "production-authority-cache-v187";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "production-authority-v187";');
  if (!source.includes("PRODUCTION_AUTHORITY_RELEASE_V187")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, '$1const PRODUCTION_AUTHORITY_RELEASE_V187 = "studio-production-authority-v187-20260801";\n');
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V179", "NGE_BLOGGING_UPDATE_AVAILABLE_V187");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V187_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-production-authority-v187.js"],
    ["src/StudioNext.jsx", "SIDEBAR_STATE_V187"],
    ["src/StudioNext.jsx", "documentWordCountV187(active.content)"],
    ["src/StudioNext.jsx", "active-site-selected-v187"],
    ["src/ContentEditor.jsx", "/ 5.000 kata"],
    ["src/NaraAssistant.jsx", "Buka Nara AI Assistant dalam ukuran kecil"],
    ["src/NaraAssistant.jsx", 'aria-modal={size === "full"}'],
    ["public/sw.js", "ngeblogging-app-v187-production-authority-20260801"],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V187_VERIFY_FAILED:${path}:${marker}`);
  }
}

await patchStudioEntry();
await patchStudioState();
await patchContentEditor();
await patchNaraLauncher();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
