import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");

test("v434 mobile icon authority is loaded by StudioNext",()=>{
  const studio=read("src/StudioNext.jsx");
  assert.match(studio,/import "\.\/studio-mobile-v431\.css";/);
});

test("v434 keeps one fixed original N launcher and matches editor Nara geometry",()=>{
  const css=read("src/studio-mobile-v431.css");
  assert.match(css,/\.sn-mobile-n-launcher/);
  assert.match(css,/width:46px!important/);
  assert.match(css,/height:46px!important/);
  assert.match(css,/font:900 27px\/1 Arial,Helvetica,sans-serif!important/);
  assert.match(css,/\.nara-floating-proxy-v20/);
  assert.match(css,/width:52px!important/);
  assert.match(css,/height:52px!important/);
  assert.match(css,/\.nara-floating-proxy-v20>svg/);
  assert.match(css,/width:21px!important/);
});
