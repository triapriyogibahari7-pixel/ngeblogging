import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtime = await readFile(new URL("../src/studio-sidebar-hard-lock-v301.js", import.meta.url), "utf8");
const css = await readFile(new URL("../src/studio-sidebar-hard-lock-v301.css", import.meta.url), "utf8");
const v300 = await readFile(new URL("../src/studio-sidebar-direct-v300.js", import.meta.url), "utf8");
const release = await readFile(new URL("../public/release-v301.json", import.meta.url), "utf8");

const requiredMenus = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v301 hard-locks the physical mobile shell with no desktop rail", () => {
  assert.match(runtime, /studio-sidebar-hard-lock-v301-20260805/);
  assert.match(runtime, /physicalShortSide\(\) <= 760/);
  assert.match(runtime, /margin-left", "0"/);
  assert.match(runtime, /width", "100%"/);
  assert.match(runtime, /min\(78vw, 336px\)/);
  assert.match(runtime, /inline-geometry-owner-v301/);
  assert.match(css, /data-studio-responsive-mode="phone"/);
  assert.match(css, /data-studio-responsive-mode="mobile"/);
  assert.match(css, /data-studio-responsive-mode="compact"/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open/);
});

test("v301 preserves one direct n owner and only adds geometry authority", () => {
  assert.match(v300, /mark\.addEventListener\("click", directToggle/);
  assert.match(v300, /import\("\.\/studio-sidebar-hard-lock-v301\.js"\)/);
  assert.doesNotMatch(runtime, /addEventListener\("click",\s*directToggle/);
  assert.doesNotMatch(runtime, /new MutationObserver/);
  assert.doesNotMatch(runtime, /setInterval\s*\(/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /location\.(?:reload|replace)\s*\(/);
});

test("v301 keeps desktop 220/70 geometry, profile and Nara fixed", () => {
  assert.match(runtime, /collapsed \? "70px" : "220px"/);
  assert.match(runtime, /\.sn-top \.sn-avatar/);
  assert.match(runtime, /\.nara-floating-button/);
  assert.match(runtime, /position", "fixed"/);
  assert.match(css, /--v301-open:220px/);
  assert.match(css, /--v301-rail:70px/);
});

test("release preserves the complete sidebar contract and does not claim unrun scale tests", () => {
  const parsed = JSON.parse(release);
  assert.equal(parsed.release, "studio-sidebar-hard-lock-v301-20260805");
  assert.deepEqual(parsed.preserved.sidebarMenus, requiredMenus);
  assert.equal(parsed.preserved.themeCatalogCount, 100);
  assert.equal(parsed.preserved.themeLayoutAreas, 26);
  assert.equal(parsed.preserved.postPageWordLimit, 5000);
  assert.equal(parsed.validation.capacity900MillionClaimed, false);
  assert.equal(parsed.validation.productionDeploymentClaimed, false);
});
