import referenceCss from "./studio-mobile-repair-v411.css?raw";

// Reuse declarations from the existing Studio Nara panel, not a second design.
export function editorNaraReferenceCss(source) {
  const prefix = ':is(html.editor-v266-small,html[data-studio-device-mode="small"]) body:not(:has(.ce-app)) .nara-assistant-shell';
  const target = 'html:root:is(.editor-v266-small,[data-studio-device-mode="small"]) body:has(.ce-app:not(.ce-dialog-host)) .nara-assistant-layer .nara-assistant-shell';
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  for (const match of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    if (!selector.startsWith(prefix)) continue;
    const suffix = selector.slice(prefix.length);
    if (!/^ [.#>]/.test(suffix) || suffix.includes(",") || suffix.includes("@")) continue;
    rules.push(`${target}${suffix}{${match[2]}}`);
  }
  return rules.join("\n");
}

const css = editorNaraReferenceCss(referenceCss);
if (typeof document !== "undefined" && css && !document.getElementById("editor-nara-reference-parity")) {
  const style = document.createElement("style");
  style.id = "editor-nara-reference-parity";
  style.textContent = css;
  document.head.appendChild(style);
}
