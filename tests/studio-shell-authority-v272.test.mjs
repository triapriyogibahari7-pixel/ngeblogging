import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-shell-authority-v272.js");
const css = read("src/studio-shell-authority-v272.css");
const main = read("src/main.jsx");
const nara = read("src/NaraAssistant.jsx");

test("v272 loads after v270 and owns the six-mode family lock", () => {
  assert.ok(entry.indexOf('import "./studio-shell-authority-v272.js";') > entry.indexOf('import "./studio-scroll-chrome-v270.css";'));
  assert.match(runtime, /dataset\.v272DesktopFamily = String\(large\)/);
  assert.match(runtime, /dataset\.studioDeviceMode === "small"\) return false/);
  assert.match(runtime, /return viewportWidth\(\) >= 760/);
  assert.match(runtime, /dataset\.v272InternalBridge = "true"/);
});

test("v272 keeps one internal mobile n and the full desktop rail", () => {
  assert.match(css, /data-v272-desktop-family="false"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)>\.sn-logo/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.mobile-open\)>:not\(\.sn-logo\)/);
  assert.match(css, /\.sn-main>\.sn-top>\.sn-sidebar-toggle[\s\S]*display:none!important/);
  assert.match(css, /data-v272-desktop-family="true"[\s\S]*#ngeblogging-studio-sidebar\.collapsed[\s\S]*nav>button/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.collapsed\)\+\.sn-main[\s\S]*calc\(100% - var\(--v272-side-open\)\)/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed\+\.sn-main[\s\S]*calc\(100% - var\(--v272-side-rail\)\)/);
});

test("v272 pins Nara, keeps attachments above the composer, and prevents overlap", () => {
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-nara-size="small"[\s\S]*height:min\(560px,68dvh\)!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  assert.match(css, /grid-template-columns:40px 40px minmax\(0,1fr\) minmax\(0,1fr\) 40px!important/);
  assert.match(css, /\.sn-main,\.sn-main>\*[\s\S]*min-width:0!important/);
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
});

test("auth callback is permanent source, not dependent on a build-time mutation", () => {
  assert.match(main, /import \{ consumeAuthCallbackV162 \} from "\.\/lib\/auth-callback-v162\.js"/);
  assert.match(main, /consumeAuthCallbackV162\(\)\.then/);
  assert.match(main, /event === "SIGNED_IN" \|\| event === "TOKEN_REFRESHED"/);
  assert.match(main, /openVerifiedStudio\(callback\.session\)/);
  assert.doesNotMatch(main, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(main, /sessionStorage\.clear\s*\(/);
});
