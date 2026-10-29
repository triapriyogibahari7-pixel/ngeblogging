import referenceCss from "./studio-mobile-repair-v411.css?raw";
import "./editor-nara-billing-parity.css";

// Reuse the reference interior declarations; never copy outer frame rules.
export function editorNaraReferenceCss(source) {
  const prefix = ':is(html.editor-v266-small,html[data-studio-device-mode="small"]) body:not(:has(.ce-app)) .nara-assistant-shell';
  const target = 'html:root body:has(.ce-app[data-mobile-editor-v409][data-mobile-editor-v402]:not(.ce-dialog-host)) .nara-assistant-layer .nara-assistant-shell:is([data-nara-size="small"],[data-nara-size="medium"],[data-nara-size="full"])';
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  for (const match of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    if (!selector.startsWith(prefix)) continue;
    const suffix = selector.slice(prefix.length);
    if (!/^ [.#>]/.test(suffix) || suffix.includes(",") || suffix.includes("@")) continue;
    rules.push(`${target}${suffix}{${match[2]}}`);
  }
  return rules.length ? `@media screen and (max-width:760px){${rules.join("\n")}}` : "";
}

const css = editorNaraReferenceCss(referenceCss);
if (typeof document !== "undefined" && css && !document.getElementById("editor-nara-reference-parity")) {
  const style = document.createElement("style");
  style.id = "editor-nara-reference-parity";
  style.textContent = css;
  document.head.appendChild(style);
}
