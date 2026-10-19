import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { patchStudio } from '../scripts/separate-profile-settings-v413.mjs';

test('global profile and selected-site settings have distinct React navigation', () => {
  const path = new URL('../src/StudioNext.jsx', import.meta.url);
  const source = readFileSync(path, 'utf8');
  const code = patchStudio(source);
  assert.ok(code.includes('className="sn-avatar" onClick={() => chooseView("profile")}'));
  assert.ok(code.includes('{view === "profile" && <ProfilePage'));
  assert.ok(code.includes('{view === "settings" && <SiteSettingsPage'));
  assert.ok(!code.includes('{view === "settings" && <SettingsView'));
  assert.ok(code.includes('onDirtyChange={setSettingsDirty}'));
  assert.equal(readFileSync(path, 'utf8'), source, 'build transform must not write source');
  assert.equal(patchStudio(code), code, 'transform must be idempotent');
});

test('unknown unpatched source is rejected rather than silently rewritten', () => {
  assert.throws(() => patchStudio('unexpected source'), /StudioNext berubah/);
});
