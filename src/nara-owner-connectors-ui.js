import { supabase, supabaseConfigured } from './lib/supabase.js';
import { isNaraOwner } from '../shared/nara-owner-access.mjs';
import './nara-owner-connectors.css';
const OWNER_ID = '91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3';
let allowed = false;
let revision = 0;
let scheduled = false;
const controllers = new Set();
function clearPanels() {
  for (const controller of controllers) controller.abort();
  controllers.clear();
  document.querySelectorAll('.nara-owner-connectors').forEach(node => node.remove());
  document.querySelectorAll('[data-nara-owner-upgrade-hidden]').forEach(node => { node.hidden = false; node.removeAttribute('data-nara-owner-upgrade-hidden'); });
}
async function testConnection(provider, button, output) {
  const current = revision;
  const controller = new AbortController();
  controllers.add(controller);
  const timer = setTimeout(() => controller.abort(), 20000);
  button.disabled = true;
  output.textContent = 'Memeriksa koneksi...';
  try {
    const { data } = await supabase.auth.getSession();
    if (!allowed || current !== revision) return;
    const token = data.session?.access_token;
    if (!token) throw new Error('Sesi login tidak tersedia.');
    const response = await fetch(`/api/nara/owner-connectors/${provider}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, cache: 'no-store', signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Endpoint connector belum tersedia pada deployment ini.');
    const result = await response.json();
    if (!allowed || current !== revision || !output.isConnected) return;
    if (result.status === 'setup_required') { output.textContent = 'Perlu konfigurasi secret server khusus Nara.'; return; }
    if (!response.ok || result.status !== 'connected') throw new Error(response.status === 403 ? 'Akses ditolak oleh server.' : 'Koneksi belum berhasil diverifikasi.');
    const resources = provider === 'github' ? result.repositories : result.workers;
    if (!Array.isArray(resources)) throw new Error('Hasil connector tidak valid.');
    output.textContent = `Terhubung (baca-saja). ${resources.length} ${provider === 'github' ? 'repository dalam halaman hasil' : 'Worker dalam hasil'}.` + (resources.length ? '\n' + resources.map(item => item.name).join('\n') : '');
  } catch (error) {
    if (allowed && current === revision && output.isConnected) output.textContent = error.name === 'AbortError' ? 'Pemeriksaan dihentikan atau melewati batas waktu.' : error.message;
  } finally { clearTimeout(timer); controllers.delete(controller); button.disabled = false; }
}
function mountPanels() {
  if (!allowed) return;
  document.querySelectorAll('.nara-assistant-shell').forEach(shell => {
    const bar = shell.querySelector('.nara-context-bar');
    if (!bar) return;
    const upgrade = bar.querySelector('button');
    if (upgrade && !upgrade.hasAttribute('data-nara-owner-upgrade-hidden')) { upgrade.hidden = true; upgrade.setAttribute('data-nara-owner-upgrade-hidden', 'true'); }
    if (shell.querySelector('.nara-owner-connectors')) return;
    const panel = document.createElement('details');
    panel.className = 'nara-owner-connectors';
    const summary = document.createElement('summary');
    summary.textContent = 'Connector admin: GitHub & Cloudflare';
    panel.append(summary);
    const note = document.createElement('p');
    note.textContent = 'Khusus pemilik. Akses baca-saja; koneksi harus diuji, bukan otomatis aktif.';
    panel.append(note);
    for (const provider of ['github', 'cloudflare']) {
      const row = document.createElement('section');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Uji koneksi ${provider === 'github' ? 'GitHub' : 'Cloudflare'}`;
      const output = document.createElement('pre');
      output.setAttribute('role', 'status');
      output.setAttribute('aria-live', 'polite');
      output.textContent = 'Belum diperiksa.';
      button.addEventListener('click', () => testConnection(provider, button, output));
      row.append(button, output);
      panel.append(row);
    }
    bar.after(panel);
  });
}
function scheduleMount() {
  if (scheduled || !allowed) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; mountPanels(); });
}
async function refreshIdentity() {
  const current = ++revision;
  allowed = false;
  clearPanels();
  try {
    const { data, error } = await supabase.auth.getUser();
    if (current !== revision || error) return;
    allowed = data.user?.id === OWNER_ID && isNaraOwner(data.user);
    if (allowed) scheduleMount();
  } catch {}
}
if (supabaseConfigured && supabase) {
  new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
  supabase.auth.onAuthStateChange(() => { allowed = false; revision += 1; clearPanels(); setTimeout(refreshIdentity, 0); });
  refreshIdentity();
}
