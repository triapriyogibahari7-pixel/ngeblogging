import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const nara = readFileSync(new URL("../src/NaraAssistant.jsx", import.meta.url), "utf8");

test("Nara v271 keeps small and medium non-modal while full is a real modal", () => {
  assert.match(nara, /NARA_GLOBAL_AUTHORITY_V271/);
  assert.match(nara, /data-nara-interaction=\{size === "full" \? "modal" : "nonmodal"\}/);
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.match(nara, /hidden=\{size !== "full"\}/);
  assert.match(nara, /data-nara-interaction="nonmodal"[\s\S]*pointer-events: none !important/);
  assert.match(nara, /data-nara-interaction="modal"[\s\S]*pointer-events: auto !important/);
  assert.match(nara, /data-nara-interaction="modal"[\s\S]*nara-assistant-backdrop[\s\S]*display: block !important/);
});

test("Nara v271 restores scroll correctly and resists legacy aria mutations", () => {
  assert.match(nara, /const synchronizeInteraction = \(\) =>/);
  assert.match(nara, /attributeFilter: \["aria-modal", "data-nara-interaction"\]/);
  assert.match(nara, /document\.body\.classList\.toggle\("nara-fullscreen-open-v148", fullScreen\)/);
  assert.match(nara, /body\.nara-fullscreen-open-v148[\s\S]*overflow: hidden !important/);
  assert.doesNotMatch(nara, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(nara, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(nara, /signOut\s*\(/);
  assert.doesNotMatch(nara, /location\.reload\s*\(/);
});

test("Nara v271 keeps close and size controls visible on narrow screens", () => {
  assert.match(nara, /aria-label="Tutup Nara" title="Tutup"/);
  assert.match(nara, /grid-template-columns: 36px minmax\(0, 1fr\) 36px 36px 36px !important/);
  assert.match(nara, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(nara, /data-nara-size="small"[\s\S]*width: min\(420px, calc\(100vw - 24px\)\) !important/);
  assert.match(nara, /data-nara-size="medium"[\s\S]*inset: max\(12px, env\(safe-area-inset-top\)\)/);
  assert.match(nara, /data-nara-size="full"[\s\S]*height: 100dvh !important/);
});
