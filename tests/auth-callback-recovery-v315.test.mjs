import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v315 recovers a valid persisted session from a stale OAuth callback URL error', async () => {
  const callback = await read('src/lib/auth-callback-v162.js');
  assert.match(callback, /auth-callback-session-recovery-v315-20260806/);
  assert.match(callback, /recoverExistingSessionFromCallbackError/);
  assert.match(callback, /isConsumedCodeError\(error\)/);
  assert.match(callback, /currentSession\(\)\.catch\(\(\) => null\)/);
  assert.match(callback, /recovered-stale-provider-callback/);
  assert.match(callback, /staleCallback: true/);
  assert.match(callback, /existingSession: true/);
  const errorBranch = callback.indexOf('const oauthError = callbackErrorFromUrl(url);');
  const recoveryCall = callback.indexOf('recoverExistingSessionFromCallbackError(oauthError', errorBranch);
  const plainErrorReturn = callback.indexOf('return callbackResult("error", { error: oauthError, mode });', errorBranch);
  assert.ok(errorBranch >= 0 && recoveryCall > errorBranch && plainErrorReturn > recoveryCall, 'stale callback recovery must run before the plain OAuth error return');
});

test('v315 keeps real invalid callbacks as errors when no persisted session exists', async () => {
  const callback = await read('src/lib/auth-callback-v162.js');
  assert.match(callback, /if \(!isConsumedCodeError\(error\) \|\| !supabaseConfigured \|\| !supabase\) return null/);
  assert.match(callback, /if \(!session\?\.access_token \|\| !session\?\.refresh_token\) return null/);
  assert.match(callback, /return callbackResult\("error", \{ error: oauthError, mode \}\)/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
});

test('v315 login actions are single-flight against rapid provider double taps', async () => {
  const authModal = await read('src/AuthModal.jsx');
  assert.match(authModal, /useEffect, useRef, useState/);
  assert.match(authModal, /AUTH_ACTION_SINGLEFLIGHT_RELEASE/);
  assert.match(authModal, /const runLockRef = useRef\(false\)/);
  assert.match(authModal, /if \(runLockRef\.current\) return/);
  assert.match(authModal, /runLockRef\.current = true/);
  assert.match(authModal, /runLockRef\.current = false/);
  assert.match(authModal, /data-auth-action-singleflight-v315/);
  assert.match(authModal, /google/);
  assert.match(authModal, /linkedin_oidc/);
});

test('v315 never adds destructive auth cleanup for network or stale-callback recovery', async () => {
  const [callback, modal, supabase] = await Promise.all([
    read('src/lib/auth-callback-v162.js'),
    read('src/AuthModal.jsx'),
    read('src/lib/supabase.js'),
  ]);
  for (const source of [callback, modal]) {
    assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
  }
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
  assert.match(modal, /Sesi yang sudah ada tidak akan dihapus/);
});

test('v315 release preserves earlier production authorities', async () => {
  const release = await read('public/release-v315.json');
  for (const marker of [
    '"staleOAuthStateRecovery": true',
    '"providerDoubleTapGuard": true',
    '"domainV314Preserved": true',
    '"naraV313Preserved": true',
    '"themeMembersV312Preserved": true',
    '"firstSiteV311Preserved": true',
    '"postsPagesV310Preserved": true',
    '"sidebarUntouched": true',
    '"massiveCapacityClaimed": false',
  ]) assert.match(release, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
