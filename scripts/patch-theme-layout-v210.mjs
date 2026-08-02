import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);
const RELEASE = "theme-layout-v210-20260802";

function requireMarker(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`V210_THEME_REQUIRED:${label}:${marker}`);
}

function patchWidgetSystem() {
  const file = "src/widget-system.js";
  let source = read(file);
  requireMarker(source, 'WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730"', "v170-authority");
  requireMarker(source, 'id: "sidebar-left-4"', "left-four");
  requireMarker(source, 'id: "sidebar-right-4"', "right-four");
  requireMarker(source, 'id: "custom-html"', "custom-widget");
  requireMarker(source, 'sandbox="allow-scripts allow-forms"', "sandbox-widget");
  if (!source.includes(`WIDGET_LAYOUT_V210 = "${RELEASE}"`)) {
    source = source.replace(
      'export const WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730";',
      'export const WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730";\nexport const WIDGET_LAYOUT_V210 = "theme-layout-v210-20260802";',
    );
    write(file, source);
  }
}

function patchThemeStudio() {
  const file = "src/ThemeStudio.jsx";
  let source = read(file);
  requireMarker(source, 'preferredArea={widgetArea}', "area-aware-widget-studio-v209");
  requireMarker(source, "tn-widget-custom-code-v209", "custom-code-editor-v209");
  requireMarker(source, 'onOpenWidgets(area.id)', "layout-area-click");
  requireMarker(source, "Editor HTML, CSS, dan JavaScript", "advanced-code-editor");
  requireMarker(source, "Tema Custom", "custom-theme-entry");
  if (!source.includes(`data-theme-layout-v210="${RELEASE}"`)) {
    const rootMarker = '<div className="tn-studio" data-theme-interface="v149"';
    if (!source.includes(rootMarker)) throw new Error("V210_THEME_ROOT_MISSING");
    source = source.replace(rootMarker, `<div className="tn-studio" data-theme-interface="v149" data-theme-layout-v210="${RELEASE}"`);
  }
  source = source.replaceAll(
    "Header, area atas, empat widget kiri, konten utama, empat widget kanan, area bawah, dan footer.",
    "Header, area atas, empat widget kiri, konten utama, empat widget kanan, area bawah, dan footer. Setiap kotak membuka pilihan widget untuk area tersebut.",
  );
  write(file, source);
}

patchWidgetSystem();
patchThemeStudio();
console.log(`Applied ${RELEASE} after v209 Theme authority`);
