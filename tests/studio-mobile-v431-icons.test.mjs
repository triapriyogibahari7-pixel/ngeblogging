import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");

test("v437 mobile icon CSS is loaded by StudioNext",()=>{
  const studio=read("src/StudioNext.jsx");
  assert.match(studio,/import "\.\/studio-mobile-v431\.css";/);
  assert.match(studio,/className="sn-mobile-n-launcher"/);
  assert.match(studio,/className="sn-mobile-n-launcher"/);
});

test("v437 renders exactly one mobile N launcher source",()=>{
  const studio=read("src/StudioNext.jsx");
  assert.match(studio,/deviceMode !== "small" && <button type="button" className="sn-logo-mark"/);
  assert.match(studio,/deviceMode !== "small" && <button type="button" className="sn-icon sn-sidebar-toggle"/);
  assert.match(studio,/className="sn-mobile-n-launcher"/);
  assert.equal((studio.match(/className="sn-mobile-n-launcher"/g) || []).length, 1);
  assert.equal((studio.match(/className="sn-mobile-n-launcher"/g) || []).length, 1);
});

test("v437 N launcher is centered and unclipped",()=>{
  const css=read("src/studio-mobile-v431.css");
  assert.match(css,/\.sn-mobile-n-launcher/);
  assert.match(css,/right:max\(12px,env\(safe-area-inset-right,0px\)\)!important/);
  assert.match(css,/overflow:visible!important/);
  assert.match(css,/left:50%!important/);
  assert.match(css,/transform:translate\(-50%,-50%\)!important/);
});

test("v438 uses one native Nara launcher with centered editor icon geometry",()=>{
  const studio=read("src/NaraAssistant.jsx");
  const css=read("src/studio-mobile-v431.css");
  assert.equal((studio.match(/className="nara-floating-button"/g) || []).length, 1);
  assert.match(studio,/className="nara-launcher-icon-box"/);
  assert.match(css,/\.sn-shell \.nara-floating-button/);
  assert.match(css,/width:37px!important/);
  assert.match(css,/height:37px!important/);
  assert.match(css,/\.nara-launcher-icon-box>svg/);
  assert.match(css,/width:18px!important/);
  assert.match(css,/height:18px!important/);
});
