import { supabase, supabaseConfigured } from './lib/supabase';
const OWNER_ID = '91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3';
const OWNER_EMAIL = 'triapriyogibahari7@gmail.com';
const selector = '.nara-quick-prompts button';
const changed = new Map();
let allowed = false, generation = 0, queued = false;
function restore() {
 for (const [button, previous] of changed) {
  button.hidden = previous.hidden;
  if (previous.display) button.style.setProperty('display', previous.display, previous.priority);
  else button.style.removeProperty('display');
 }
 changed.clear();
}
function apply() {
 for (const button of changed.keys()) if (!button.isConnected) changed.delete(button);
 if (!allowed) return;
 for (const button of document.querySelectorAll(selector)) {
  if (button.textContent.trim().replace(/\s+/g,' ').toLowerCase() !== 'jelaskan gambar') continue;
  if (!changed.has(button)) changed.set(button, { hidden:button.hidden, display:button.style.getPropertyValue('display'), priority:button.style.getPropertyPriority('display') });
  button.hidden = true;
  button.style.setProperty('display','none','important');
 }
}
function schedule() {
 if (queued) return; queued = true;
 queueMicrotask(() => { queued = false; apply(); });
}
async function verify() {
 const current = ++generation; allowed = false; restore();
 if (!supabaseConfigured || !supabase) return;
 try {
  const { data, error } = await supabase.auth.getUser();
  if (current !== generation) return;
  const user = data?.user;
  allowed = !error && user?.id === OWNER_ID && Boolean(user.email_confirmed_at) && String(user.email || '').trim().toLowerCase() === OWNER_EMAIL;
  apply();
 } catch { if (current === generation) { allowed = false; restore(); } }
}
new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true, characterData:true });
if (supabaseConfigured && supabase) supabase.auth.onAuthStateChange(() => { ++generation; allowed = false; restore(); setTimeout(verify,0); });
verify();
