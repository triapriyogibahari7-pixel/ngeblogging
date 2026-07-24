import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const studio = readFileSync(new URL("../src/Studio.jsx",import.meta.url),"utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx",import.meta.url),"utf8");
const center = readFileSync(new URL("../src/BackupCenter.jsx",import.meta.url),"utf8");

test("Studio routes through the secure wrapper",()=>{
  assert.match(studio,/StudioSecure\.jsx/);
  assert.match(secure,/\.sn-save-settings/);
  assert.match(secure,/ngeblogging-settings-extras/);
  assert.match(secure,/saveButton\.insertAdjacentElement\("afterend", extras\)/);
  assert.match(secure,/createPortal\(<BackupCenter/);
});

test("settings backup supports full download readable archive and restore",()=>{
  assert.match(center,/Unduh cadangan lengkap/);
  assert.match(center,/Unduh arsip HTML/);
  assert.match(center,/Pulihkan dari file/);
  assert.match(center,/preserveStatuses/);
  assert.match(center,/Checksum SHA-256/);
});
