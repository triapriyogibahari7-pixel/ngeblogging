import { gunzipSync } from "node:zlib";
import { readFile, writeFile } from "node:fs/promises";

const RELEASE = "studio-theme-members-domain-v312-20260806";
const VERSION = "ngeblogging-app-v312-theme-members-domain-20260806";
const CACHE = "studio-theme-members-domain-cache-v312";
const root = new URL("../", import.meta.url);
const swFile = new URL("../public/sw.js", import.meta.url);
const parts = Array.from({ length: 15 }, (_, index) => new URL(`../patches/v312/payload.b64.${String(index + 1).padStart(2, "0")}`, import.meta.url));
const markers = {
  "src/ThemeStudio.jsx": "theme-map-code-editor-v312-20260806",
  "src/widget-system.js": "HTML / CSS / JavaScript",
  "src/theme-system.js": "composeThemeLayoutV170",
  "src/studio-members-v304.js": "transfer_site_owner_v312",
  "src/studio-members-v304.css": "member-more-menu-v312",
  "src/DomainPanelV124.jsx": "routing Worker sedang disinkronkan otomatis",
};

function parsePatch(text) {
  const lines = text.split("\n");
  const files = [];
  let file = null;
  let hunk = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("--- a/")) {
      const next = lines[++i] || "";
      if (!next.startsWith("+++ b/")) throw new Error("V312_PATCH_NEW_PATH_MISSING");
      file = { path: next.slice(6).trim(), hunks: [] };
      files.push(file);
      hunk = null;
      continue;
    }
    const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (match) {
      if (!file) throw new Error("V312_PATCH_FILE_MISSING");
      hunk = { oldStart: Number(match[1]), lines: [] };
      file.hunks.push(hunk);
      continue;
    }
    if (hunk && (line.startsWith(" ") || line.startsWith("+") || line.startsWith("-") || line.startsWith("\\ No newline"))) hunk.lines.push(line);
  }
  return files;
}

function applyHunks(source, file) {
  const trailing = source.endsWith("\n");
  const input = source.split("\n");
  if (trailing) input.pop();
  const output = [];
  let cursor = 0;
  for (const hunk of file.hunks) {
    const start = Math.max(0, hunk.oldStart - 1);
    if (start < cursor) throw new Error(`V312_PATCH_OVERLAP:${file.path}`);
    output.push(...input.slice(cursor, start));
    let read = start;
    for (const line of hunk.lines) {
      if (line.startsWith("\\ No newline")) continue;
      const body = line.slice(1);
      if (line[0] === " ") {
        if (input[read] !== body) throw new Error(`V312_PATCH_CONTEXT_MISMATCH:${file.path}:${read + 1}`);
        output.push(body); read += 1;
      } else if (line[0] === "-") {
        if (input[read] !== body) throw new Error(`V312_PATCH_DELETE_MISMATCH:${file.path}:${read + 1}`);
        read += 1;
      } else if (line[0] === "+") output.push(body);
    }
    cursor = read;
  }
  output.push(...input.slice(cursor));
  return output.join("\n") + (trailing ? "\n" : "");
}

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V312_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const encoded = (await Promise.all(parts.map((part) => readFile(part, "utf8")))).join("").replace(/\s+/g, "");
const payload = JSON.parse(gunzipSync(Buffer.from(encoded, "base64")).toString("utf8"));
for (const [path, content] of Object.entries(payload.files || {})) await writeFile(new URL(path, root), content);
for (const file of parsePatch(payload.patch || "")) {
  const url = new URL(file.path, root);
  const current = await readFile(url, "utf8");
  if (markers[file.path] && current.includes(markers[file.path])) continue;
  const next = applyHunks(current, file);
  if (markers[file.path] && !next.includes(markers[file.path])) throw new Error(`V312_PATCH_MARKER_MISSING:${file.path}`);
  await writeFile(url, next);
}

// v312 replaces the old standalone delete button with the compact three-dot
// member menu, but keep the v306 data marker on the real delete action so the
// long-standing member regression gate can prove that delete functionality was
// preserved rather than removed.
const memberCompatFile = new URL("../src/studio-members-v304.js", import.meta.url);
let memberCompat = await readFile(memberCompatFile, "utf8");
if (!memberCompat.includes("memberRemoveV306")) {
  memberCompat = memberCompat.replace(
    'remove.dataset.memberRemoveV312 = "true";',
    'remove.dataset.memberRemoveV312 = "true";\n      remove.dataset.memberRemoveV306 = "true";',
  );
  if (!memberCompat.includes("memberRemoveV306")) throw new Error("V312_MEMBER_REMOVE_V306_COMPAT_MISSING");
  await writeFile(memberCompatFile, memberCompat);
}

const release = await readFile(new URL("../public/release-v312.json", import.meta.url), "utf8");
for (const marker of [RELEASE,'"themes": 100','"layoutAreas": 26','"codeLineNumbers": 10000','"memberRoleChoices": 5','"customDomainAutoReconcile": true','"sidebarUntouched": true']) {
  if (!release.includes(marker)) throw new Error(`V312_RELEASE_INVALID:${marker}`);
}

let sw = await readFile(swFile, "utf8");
sw = sw.replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`).replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`).replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V311", "NGE_BLOGGING_UPDATE_AVAILABLE_V312").replaceAll("service-worker-activated-first-site-stability-v311", "service-worker-activated-theme-members-domain-v312");
sw = upsert(sw, "STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V312", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V312", "CACHE_RELEASE");
sw = sw.replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V312}-${ACTIVE_CACHE_RELEASE_V312}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;').replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V312}-${ACTIVE_CACHE_RELEASE_V312}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');
if (!sw.includes(RELEASE) || !sw.includes(VERSION) || !sw.includes(CACHE)) throw new Error("V312_SW_MARKERS_MISSING");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw)) throw new Error("V312_DESTRUCTIVE_SW_BEHAVIOR");
await writeFile(swFile, sw);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("../tests/studio-theme-members-domain-v312.test.mjs");
