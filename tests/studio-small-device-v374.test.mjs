import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css=await readFile(new URL("../src/studio-small-device-v374.css",import.meta.url),"utf8");
const files=["../src/ContentEditor.jsx","../src/StudioSecure.jsx","../src/StudioNext.jsx"];
const sources=await Promise.all(files.map((path)=>readFile(new URL(path,import.meta.url),"utf8")));

test("v374 is loaded by editor and Studio entry points",()=>{
  for(const source of sources) assert.match(source,/studio-small-device-v374\.css/);
});
test("v374 is small-device scoped",()=>{
  assert.match(css,/html\.editor-v266-small/);
  assert.match(css,/data-studio-device-mode="small"/);
  assert.doesNotMatch(css,/data-studio-device-mode="large"/);
  assert.doesNotMatch(css,/editor-v266-large/);
});
test("v374 removes the editor menu/header collision",()=>{
  assert.match(css,/ce-editor-sidebar-toggle-v266[\s\S]*top:auto!important[\s\S]*left:auto!important[\s\S]*right:/);
  assert.match(css,/ce-titlebar[\s\S]*grid-template-areas:"back file" "actions actions"/);
  assert.match(css,/ce-file input[\s\S]*width:100%!important[\s\S]*font-size:16px!important/);
});
test("v374 keeps the writing canvas in normal flow",()=>{
  for(const selector of ["ce-workspace","ce-paper-shell","ce-paper","ce-sidebar"]){
    assert.match(css,new RegExp("\\."+selector+"[\\s\\S]*position:relative!important"));
  }
  assert.match(css,/ce-paper[\s\S]*visibility:visible!important[\s\S]*opacity:1!important/);
});
test("v374 covers requested small Studio surfaces",()=>{
  for(const marker of [".sn-metrics",".sn-content-card",".tn-theme-grid",".sn-media-grid",".sn-analytics-data-host",".sn-members",".sv124-comment-workspace",".sv124-domain-page",".sn-api-page",".sn-settings-grid"]){
    assert.match(css,new RegExp(marker.replaceAll(".","\\.")));
  }
});
