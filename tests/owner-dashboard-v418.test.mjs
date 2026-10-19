import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformOwnerModule} from '../scripts/owner-dashboard-v418.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('owner dashboard is a separate view and dropdown action',()=>{const code=transformOwnerModule(read('src/StudioNext.jsx'),'/src/StudioNext.jsx').code;assert.ok(code.includes('<OwnerDashboardPage'));assert.ok(code.includes('ngeblogging:site-settings-applied-v418'));const menu=transformOwnerModule(read('src/studio-shell-authority-v298.js'),'/src/studio-shell-authority-v298.js').code;assert.ok(menu.includes('Dashboard Pemilik'));assert.ok(menu.includes('view:"owner-dashboard"'));});
test('general settings read and write the applied backend',()=>{const s=read('src/services/accountSettings.js');assert.ok(s.includes('nb_read_site_settings_applied'));assert.ok(s.includes('nb_save_site_settings_applied'));const code=transformOwnerModule(read('src/pages/SiteSettingsPage.jsx'),'/src/pages/SiteSettingsPage.jsx').code;assert.ok(code.includes('Coba muat ulang'));assert.ok(code.includes('Buka keamanan Profil'));assert.ok(code.includes('key==="description"?500:10000'));});
test('verification badge depends on server state and expiry, not subscription tier',()=>{const c=read('src/components/account/VerificationIdentityCard.jsx');assert.ok(c.includes("v?.state==='verified'"));assert.ok(c.includes('Date.parse(v.expires_at)>Date.now()'));assert.ok(c.includes('{active&&<img'));assert.ok(!c.includes("profile.plan==='pro'"));});
