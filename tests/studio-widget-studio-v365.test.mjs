import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const runtime = await read("src/studio-widget-studio-v365.js");
const css = await read("src/studio-widget-studio-v365.css");
const studio = await read("src/ThemeStudio.jsx");

assert.match(runtime, /STUDIO_WIDGET_STUDIO_RELEASE_V365/);
assert.match(runtime, /sn-side\.collapsed/);
assert.match(runtime, /calc\(100vw - \$\{sidebarWidth\}\)/);
assert.match(runtime, /setInterval\(schedule, 250\)/);
assert.match(runtime, /overflow-wrap/);

assert.match(css, /data-widget-studio-v365="sidebar-bounded-no-overlap"/);
assert.match(css, /grid-template-columns: repeat\(3, minmax\(0,1fr\))/);
assert.match(css, /grid-template-columns: minmax\(0,1fr\)/);
assert.match(css, /overflow-wrap: anywhere/);

assert.match(studio, /studio-widget-studio-v365\.js/);
