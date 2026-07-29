import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const studio = readFileSync(new URL("../src/Studio.jsx",import.meta.url),"utf8");
const fastGate = readFileSync(new URL("../src/StudioFastGate.jsx",import.meta.url),"utf8");
const gate = readFileSync(new URL("../src/StudioOnboardingGate.jsx",import.meta.url),"utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx",import.meta.url),"utf8");
const center = readFileSync(new URL("../src/BackupCenter.jsx",import.meta.url),"utf8");

test("Studio fast entry preserves onboarding and secure backup routing",()=>{
  assert.match(studio,/StudioFastGate\.jsx/);
  assert.match(fastGate,/StudioOnboardingGate\.jsx/);
  assert.match(fastGate,/StudioSecure\.jsx/);
  assert.match(fastGate,/<StudioSecure \{\.\.\.props\}\/>/);
  assert.match(fastGate,/<StudioOnboardingGate \{\.\.\.props\}\/>/);
  assert.match(gate,/StudioSecure\.jsx/);
  assert.match(gate,/<StudioSecure \{\.\.\.props\}\/>/);
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
