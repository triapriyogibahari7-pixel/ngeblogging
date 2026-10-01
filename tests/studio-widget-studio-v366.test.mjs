import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root=new URL("../",import.meta.url);
const read=p=>readFile(new URL(p,root),"utf8");
const runtime=await read("src/studio-widget-studio-v366.js");
const css=await read("src/studio-widget-studio-v366.css");
const studio=await read("src/ThemeStudio.jsx");

assert.match(runtime,/STUDIO_WIDGET_STUDIO_RELEASE_V367/);
assert.match(runtime,/getBoundingClientRect/);
assert.match(runtime,/ResizeObserver/);
assert.match(runtime,/MutationObserver/);
assert.doesNotMatch(runtime,/setInterval\(schedule,250\)/);
assert.match(runtime,/height","min\(760px,calc\(100dvh - 24px\)\)/);
assert.match(runtime,/sidebarRight/);
assert.match(css,/data-v366-widget="stable-responsive"/);
assert.match(css,/width:min\(1240px,100%\)/);
assert.match(css,/height:min\(760px,calc\(100dvh - 24px\))/);
assert.match(css,/grid-template-columns:minmax\(0,1fr\) 44px/);
assert.match(css,/overflow-wrap:anywhere/);
assert.match(css,/max-width:430px/);
assert.match(studio,/studio-widget-studio-v366\.js/);
assert.doesNotMatch(studio,/studio-widget-studio-v365\.js/);
