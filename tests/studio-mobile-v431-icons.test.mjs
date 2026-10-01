import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");

test("v437 mobile icon CSS is loaded by StudioNext",()=>{
  const studio=read("src/StudioNext.jsx");
  assert.match(studio,/import "\.\/studio-mobile-v431\.css";/);
  assert.match(studio,/className="sn-mobile-n-launcher"/);
  assert.match(studio,/className="sn-mobile-nara-launcher"/);
});

test("v437 renders exactly one mobile N launcher source",()=>{
  const studio=read("src/StudioNext.jsx");
  assert.match(studio,/deviceMode !== "small" && <button type="button" className="sn-logo-mark"/);
  assert.match(studio,/deviceMode !== "small" && <button type="button" className="sn-icon sn-sidebar-toggle"/);
  assert.match(studio,/className="sn-mobile-n-launcher"/);
  assert.doesNotMatch(studio,/sn-mobile-n-launcher[\\s\\S]*sn-logo-mark/);
});

test("v437 N launcher is centered and unclipped",()=>{
  const css=read("src/studio-mobile-v431.css");
  assert.match(css,/\.sn-mobile-n-launcher/);
  assert.match(css,/right:max\(12px,env\(safe-area-inset-right,0px\)\)!important/);
  assert.match(css,/overflow:visible!important/);
  assert.match(css,/left:50%!important/);
  assert.match(css,/transform:translate\(-50%,-50%\)!important/);
});

test("v437 fresh Nara launcher matches the mobile editor icon geometry",()=>{
  const css=read("src/studio-mobile-v431.css");
  assert.match(css,/\.sn-mobile-nara-launcher/);
  assert.match(css,/width:37px!important/);
  assert.match(css,/height:37px!important/);
  assert.match(css,/\.sn-mobile-nara-launcher>svg/);
  assert.match(css,/width:18px!important/);
  assert.match(css,/height:18px!important/);
  assert.match(css,/\.sn-shell \.nara-floating-button/);
});
