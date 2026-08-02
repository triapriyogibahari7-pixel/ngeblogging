import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v211-20260802";
const VERSION = "ngeblogging-app-v211-mobile-theme-nara-domain-20260802";
const CACHE = "mobile-theme-nara-domain-cache-v211";
const FORCE = "studio-v211";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V211_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v211.js";')) {
    source = replaceRequired(
      source,
      'import "./studio-production-v210.js";',
      'import "./studio-production-v210.js";\nimport "./studio-production-v211.js";',
      "studio-v210-import",
    );
    await write(path, source);
  }
}

async function patchThemePortal() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (!source.includes('from "react-dom"')) {
    source = replaceRequired(
      source,
      'import React, { useEffect, useMemo, useRef, useState } from "react";',
      'import React, { useEffect, useMemo, useRef, useState } from "react";\nimport { createPortal } from "react-dom";',
      "theme-react-import",
    );
  }
  if (!source.includes('data-theme-modal-portal="body"')) {
    const start = source.indexOf("function Modal({ title, eyebrow, onClose, size = \"medium\", children, footer }) {");
    const end = source.indexOf("\n\nfunction ThemeFrame", start);
    if (start < 0 || end < 0) throw new Error("V211_THEME_MODAL_BLOCK_MISSING");
    const replacement = `function Modal({ title, eyebrow, onClose, size = "medium", children, footer }) {
  const content = <div className="tn-modal-layer" data-theme-modal-portal="body" role="dialog" aria-modal="true" aria-label={title}>
    <button className="tn-modal-backdrop" onClick={onClose} aria-label="Tutup"/>
    <section className={\`tn-modal \${size}\`}>
      <header><div>{eyebrow && <small>{eyebrow}</small>}<h2>{title}</h2></div><button onClick={onClose} aria-label="Tutup"><X/></button></header>
      <div className="tn-modal-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>;
  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
  }
  await write(path, source);
}

async function patchNaraAttachmentSource() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  if (!source.includes('aria-controls="nara-attachment-menu-v211"')) {
    source = replaceRequired(
      source,
      '<button disabled={busy} className={attachmentMenu ? "active" : ""} onClick={() => setAttachmentMenu(!attachmentMenu)} title="Tambahkan lampiran"><Plus /></button>',
      '<button type="button" disabled={busy} className={attachmentMenu ? "active" : ""} onClick={() => setAttachmentMenu((current) => !current)} title="Tambahkan lampiran" aria-label="Tambah kamera, foto, atau file" aria-haspopup="menu" aria-expanded={attachmentMenu} aria-controls="nara-attachment-menu-v211"><Plus /></button>',
      "nara-plus-trigger",
    );
    source = replaceRequired(
      source,
      '<div className="nara-attachment-menu">\n                      <button onClick={() => cameraInput.current?.click()}><Camera /><span><b>Kamera</b><small>Ambil foto sekarang</small></span></button>\n                      <button onClick={() => imageInput.current?.click()}><ImageIcon /><span><b>Foto</b><small>Pilih dari perangkat</small></span></button>\n                      <button onClick={() => fileInput.current?.click()}><File /><span><b>File teks</b><small>TXT, Markdown, CSV, atau JSON</small></span></button>\n                    </div>',
      '<div id="nara-attachment-menu-v211" className="nara-attachment-menu" role="menu" aria-label="Pilihan lampiran">\n                      <button type="button" role="menuitem" onClick={() => { setAttachmentMenu(false); cameraInput.current?.click(); }}><Camera /><span><b>Kamera</b><small>Ambil foto sekarang</small></span></button>\n                      <button type="button" role="menuitem" onClick={() => { setAttachmentMenu(false); imageInput.current?.click(); }}><ImageIcon /><span><b>Foto</b><small>Pilih dari perangkat</small></span></button>\n                      <button type="button" role="menuitem" onClick={() => { setAttachmentMenu(false); fileInput.current?.click(); }}><File /><span><b>File</b><small>TXT, Markdown, CSV, atau JSON</small></span></button>\n                    </div>',
      "nara-attachment-menu",
    );
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V211")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_PRODUCTION_RELEASE_V211 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V210 = "ngeblogging-app-v210-theme-nara-domain-mobile-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V210 = "theme-nara-domain-mobile-cache-v210";\n`,
    );
  }
  for (const eventName of [
    "NGE_BLOGGING_UPDATE_AVAILABLE_V210",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V209",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V208",
  ]) source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V211");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v211 announces the update without forced navigation; login and editor state remain intact.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V211_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, themeStudio, nara, runtime, css, sw, publicSite, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/studio-production-v211.js"),
    read("src/studio-production-v211.css"),
    read("public/sw.js"),
    read("src/PublicSiteNext.jsx"),
    read("public/release-v211.json"),
  ]);
  const checks = [
    [entry, "studio-production-v211.js", "Studio v211 import"],
    [themeStudio, 'data-theme-modal-portal="body"', "Theme modal portal"],
    [themeStudio, 'from "react-dom"', "React portal import"],
    [nara, 'aria-controls="nara-attachment-menu-v211"', "Nara attachment trigger"],
    [nara, 'role="menu"', "Nara attachment menu semantics"],
    [runtime, "studio-production-v211-20260802", "v211 runtime"],
    [runtime, "studioMobileV211", "physical mobile data marker"],
    [runtime, "camera-photo-file", "Nara attachment runtime"],
    [css, 'data-studio-mobile-v211="true"', "physical mobile CSS authority"],
    [css, 'data-theme-modal-portal="body"', "portal modal CSS"],
    [css, "sidebar-left-4", "fourth left layout slot"],
    [css, "sidebar-right-4", "fourth right layout slot"],
    [css, 'data-v211-domain-action="horizontal"', "Domain horizontal actions"],
    [sw, VERSION, "v211 service worker"],
    [sw, CACHE, "v211 cache"],
    [sw, RELEASE, "v211 release marker"],
    [sw, "ngeblogging-app-v210-theme-nara-domain-mobile-20260802", "v210 compatibility marker"],
    [publicSite, "PUBLIC_SITE_SINGLE_RENDER_V209", "public site one initial render"],
    [release, RELEASE, "release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V211_VERIFY_FAILED:${label}:${marker}`);
  }
  for (const source of [runtime, themeStudio, nara]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V211_DESTRUCTIVE_SESSION_ACTION");
  }
}

await patchStudioEntry();
await patchThemePortal();
await patchNaraAttachmentSource();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
