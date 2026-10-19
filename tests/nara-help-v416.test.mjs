import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformNaraHelpModule} from '../scripts/nara-help-v416.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('help has a React view, sidebar entry and direct assistant callback',()=>{const {code}=transformNaraHelpModule(read('src/StudioNext.jsx'),'/src/StudioNext.jsx');assert.ok(code.includes('<NaraHelpPage'));assert.ok(code.includes('<span>Bantuan Nara AI</span>'));assert.ok(code.includes('["profile", "settings", "nara-help"].includes(next)'));assert.ok(code.includes('onOpenAssistant={()=>setNaraOpen(true)}'));});
test('help menu does not click an old hidden button',()=>{const {code}=transformNaraHelpModule(read('src/studio-shell-authority-v298.js'),'/src/studio-shell-authority-v298.js');assert.ok(code.includes('view: "nara-help"'));assert.ok(!code.includes('if (action === "help") return document.querySelector'));});
test('upgrade renders original BillingView and keeps an explicit return action',()=>{const page=read('src/pages/NaraHelpPage.jsx');assert.ok(page.includes("import BillingView from '../BillingView'"));assert.ok(page.includes('<BillingView/>'));assert.ok(page.includes('setBillingOpen(true)'));assert.ok(page.includes('setBillingOpen(false)'));assert.ok(page.includes('onClick={onOpenAssistant}'));assert.ok(!page.includes('/api/billing/midtrans/create'));});
test('header uses a small processor illustration',()=>{assert.ok(read('src/pages/NaraHelpPage.jsx').includes('width="112" height="112"'));assert.ok(read('public/brand/nara-neural-chip-v416.svg').includes('viewBox="0 0 200 200"'));});
