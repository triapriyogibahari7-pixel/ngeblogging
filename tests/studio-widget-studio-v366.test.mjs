import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root=new URL("../",import.meta.url);
const read=p=>readFile(new URL(p,root),"utf8");
const css=await read("src/studio-widget-studio-v369.css");
const studio=await read("src/ThemeStudio.jsx");

assert.match(css,/tn-widget-modal-layer/);
assert.match(css,/left:248px!important/);
assert.match(css,/left:68px!important/);
assert.match(css,/html:has\(#ngeblogging-studio-sidebar\.collapsed\) \.tn-widget-modal-layer/);
assert.match(css,/width:calc\(100vw - 248px\)/);
assert.match(css,/width:min\(1240px,100%\)/);
assert.match(css,/height:min\(760px,calc\(100dvh - 24px\)\)/);
assert.match(css,/grid-template-columns:minmax\(0,1fr\) 44px/);
assert.match(css,/overflow-wrap:anywhere/);
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\))/);
assert.match(css,/max-width:760px/);
assert.match(css,/animation:none!important/);
assert.match(css,/transition:none!important/);
assert.doesNotMatch(css,/setInterval/);
assert.match(studio,/studio-widget-studio-v368\.css/);
assert.match(studio,/layerClassName="tn-widget-modal-layer"/);
assert.doesNotMatch(studio,/studio-widget-studio-v366\.js/);

assert.match(studio,/createPortal/);
assert.match(studio,/portal layerClassName="tn-widget-modal-layer"/);
