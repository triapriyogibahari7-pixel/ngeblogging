/*
 * Theme code pretty-printer (v411).
 * Built-in themes ship HTML/CSS minified on one line, so the editor showed a
 * single "line 1" wrapped across the screen and line numbers never matched.
 * This formatter only splits at boundaries that do not change rendering:
 *  - HTML: newline + indent around BLOCK-level tags only; inline tags and text
 *    stay together on their line; <script>/<style>/<pre>/<textarea> untouched.
 *  - CSS: one declaration per line, outside strings/urls/parentheses.
 * JavaScript is left exactly as authored.
 */

const BLOCK = new Set([
  "html", "head", "body", "header", "footer", "main", "nav", "section", "article", "aside",
  "div", "form", "fieldset", "figure", "figcaption", "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "blockquote", "hr", "address", "details",
  "summary", "dialog", "menu", "meta", "link", "title", "noscript", "template", "picture", "video", "audio", "source",
]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "pre", "textarea"]);
const PAD = "  ";
/* HTML "formatting elements": while one is left open (e.g. invalid `<i/>`),
 * the parser re-opens it on any new text node, so inserted whitespace would
 * change the DOM. We do not insert line breaks until they are closed. */
const FORMATTING = new Set(["a", "b", "big", "code", "em", "font", "i", "nobr", "s", "small", "strike", "strong", "tt", "u"]);

export function looksMinified(text) {
  const value = String(text || "");
  if (value.length < 240) return false;
  const lines = value.split("\n");
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return lines.length <= 4 || longest > 600;
}

export function formatHtml(source) {
  const html = String(source || "");
  const out = [];
  let depth = 0;
  let buffer = "";
  const flush = () => {
    const trimmed = buffer.replace(/^\s+|\s+$/g, "");
    if (trimmed) out.push(PAD.repeat(depth) + trimmed.replace(/\s*\n\s*/g, " "));
    buffer = "";
  };
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)(?:"[^"]*"|'[^']*'|[^'">])*>/g;
  let last = 0;
  let match;
  const formattingOpen = [];
  while ((match = tagRe.exec(html))) {
    if (match.index > last) buffer += html.slice(last, match.index);
    last = tagRe.lastIndex;
    const token = match[0];
    if (token.startsWith("<!--")) { flush(); out.push(PAD.repeat(depth) + token); continue; }
    const name = String(match[1] || "").toLowerCase();
    const closing = token.startsWith("</");
    if (!closing && RAW.has(name)) {
      const closeRe = new RegExp(`</${name}\\s*>`, "ig");
      closeRe.lastIndex = last;
      const end = closeRe.exec(html);
      const stop = end ? closeRe.lastIndex : html.length;
      const whole = html.slice(match.index, stop);
      if (name === "pre" || name === "textarea") { buffer += whole; }
      else { flush(); out.push(PAD.repeat(depth) + whole); }
      last = stop;
      tagRe.lastIndex = stop;
      continue;
    }
    if (FORMATTING.has(name)) {
      if (closing) { const at = formattingOpen.lastIndexOf(name); if (at >= 0) formattingOpen.splice(at, 1); }
      else formattingOpen.push(name);
    }
    if (!BLOCK.has(name) || formattingOpen.length) { buffer += token; continue; }
    flush();
    if (closing) {
      depth = Math.max(0, depth - 1);
      out.push(PAD.repeat(depth) + token);
    } else {
      out.push(PAD.repeat(depth) + token);
      if (!VOID.has(name) && !token.endsWith("/>")) depth += 1;
    }
  }
  if (last < html.length) buffer += html.slice(last);
  flush();
  /* keep short leaf blocks on one line: <li>Opini</li>, <h2>Judul</h2> */
  const merged = [];
  for (let i = 0; i < out.length; i += 1) {
    const open = out[i], body = out[i + 1], close = out[i + 2];
    const indent = open.match(/^\s*/)[0];
    const openTag = open.trim().match(/^<([a-zA-Z][\w:-]*)/);
    if (openTag && body !== undefined && close !== undefined
      && close.trim().toLowerCase() === `</${openTag[1].toLowerCase()}>`
      && close.startsWith(indent) && close.match(/^\s*/)[0] === indent
      && !/^<\/?(?:[a-zA-Z][\w:-]*)/.test(body.trim()) || false) {
      const one = indent + open.trim() + body.trim() + close.trim();
      if (one.length <= 140) { merged.push(one); i += 2; continue; }
    }
    merged.push(open);
  }
  return merged.join("\n");
}

export function formatCss(source) {
  const css = String(source || "");
  let out = "";
  let depth = 0;
  let quote = "";
  let paren = 0;
  let line = "";
  const push = () => { const t = line.trim(); if (t) out += PAD.repeat(depth) + t + "\n"; line = ""; };
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (quote) { line += ch; if (ch === "\\") { line += css[i + 1] || ""; i += 1; } else if (ch === quote) quote = ""; continue; }
    if (ch === "/" && css[i + 1] === "*") { const end = css.indexOf("*/", i + 2); const stop = end < 0 ? css.length : end + 2; line += css.slice(i, stop); i = stop - 1; continue; }
    if (ch === '"' || ch === "'") { quote = ch; line += ch; continue; }
    if (ch === "(") { paren += 1; line += ch; continue; }
    if (ch === ")") { paren = Math.max(0, paren - 1); line += ch; continue; }
    if (paren) { line += ch; continue; }
    if (ch === "{") { line = line.trim() + " {"; push(); depth += 1; continue; }
    if (ch === ";") { line += ";"; push(); continue; }
    if (ch === "}") { push(); depth = Math.max(0, depth - 1); out += PAD.repeat(depth) + "}\n"; continue; }
    if (ch === "\n") { line += " "; continue; }
    line += ch;
  }
  push();
  return out.replace(/\n+$/, "");
}

/* Returns a new code object with minified HTML/CSS expanded; untouched otherwise. */
export function formatThemeCodeForEditing(code) {
  if (!code || typeof code !== "object") return code;
  let changed = false;
  const next = { ...code };
  if (looksMinified(code.html)) { next.html = formatHtml(code.html); changed = changed || next.html !== code.html; }
  if (looksMinified(code.css)) { next.css = formatCss(code.css); changed = changed || next.css !== code.css; }
  return changed ? next : code;
}
