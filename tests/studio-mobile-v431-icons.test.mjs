import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");

test("v431 keeps the original mobile N as the only clickable sidebar launcher",()=>{
  const css=read("src/studio-mobile-v431.css");
  const js=read("src/studio-mobile-v431.js");
  assert.match(css,/\.sn-logo-mark/);
  assert.match(css,/pointer-events:auto!important/);
  assert.match(css,/\.sn-logo>b/);
  assert.match(css,/\.sn-side-close/);
  assert.match(js,/removeAttribute\("inert"\)/);
  assert.match(js,/mobileInteractionAuthority/);
});

test("v431 styles the visible Nara proxy, not the hidden original launcher",()=>{
  const css=read("src/studio-mobile-v431.css");
  assert.match(css,/\.nara-floating-proxy-v18/);
  assert.match(css,/width:54px!important/);
  assert.match(css,/height:54px!important/);
  assert.match(css,/\.nara-floating-proxy-v18>svg/);
  assert.match(css,/width:21px!important/);
  assert.doesNotMatch(css,/nara-launcher-icon-box/);
});
