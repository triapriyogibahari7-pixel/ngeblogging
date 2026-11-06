import { readFile, writeFile } from 'node:fs/promises';

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_DOMAIN_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const worker = 'ngeblogging';
const zone = 'triapriyogi.com';
const hosts = new Set([zone, `www.${zone}`]);
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const planPath = args.find(a => a.startsWith('--plan='))?.slice(7) || 'triapriyogi-detach-plan.json';
if (account !== '095e57b46e7ba7f6b188480d9e4e5fe7' || !token) {
  throw Error('Account Cloudflare tidak cocok atau token environment belum tersedia.');
}
if (apply && !args.includes('--confirm=triapriyogi.com')) {
  throw Error('Apply memerlukan --confirm=triapriyogi.com dan plan hasil dry-run.');
}

async function api(path, method = 'GET') {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    const codes = (payload?.errors || []).map(e => e.code).join(',');
    throw Error(`Cloudflare ${method} gagal: HTTP ${response.status}; codes=${codes}. Tidak ada retry otomatis.`);
  }
  return payload;
}

function identity(row) {
  const hostname = String(row?.hostname || '').toLowerCase().replace(/\.$/, '');
  if (!hosts.has(hostname) || row.service !== worker || row.zone_name !== zone
      || !/^[a-z0-9_-]{1,128}$/i.test(row.id || '') || !/^[a-f0-9]{32}$/i.test(row.zone_id || '')) {
    throw Error('Identitas domain/Worker/zone tidak cocok; tidak menghapus lebih lanjut.');
  }
  return { id: row.id, hostname, service: row.service, zone_id: row.zone_id, zone_name: row.zone_name };
}

const base = `/accounts/${account}/workers/domains`;
const found = new Map();
for (const hostname of hosts) {
  const payload = await api(`${base}?hostname=${encodeURIComponent(hostname)}`);
  if (!Array.isArray(payload.result) || Number(payload.result_info?.total_pages || 1) > 1) {
    throw Error('Daftar domain tidak lengkap atau format tidak valid; tidak menghapus.');
  }
  for (const row of payload.result) {
    if (hosts.has(String(row?.hostname || '').toLowerCase().replace(/\.$/, ''))) {
      const item = identity(row);
      found.set(item.id, item);
    }
  }
}
const records = [...found.values()].sort((a,b) => a.id.localeCompare(b.id));
const plan = { account_id: account, expected_worker: worker, zone_name: zone, records };
if (!apply) {
  await writeFile(planPath, JSON.stringify(plan, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ mode: 'dry-run', deleted: 0, plan: planPath, records }, null, 2));
} else {
  const approved = JSON.parse(await readFile(planPath, 'utf8'));
  if (JSON.stringify(approved) !== JSON.stringify(plan)) {
    throw Error('Keadaan Cloudflare berbeda dari plan; tinjau plan baru. Tidak menghapus.');
  }
  for (const expected of records) {
    const current = identity((await api(`${base}/${encodeURIComponent(expected.id)}`)).result);
    if (JSON.stringify(current) !== JSON.stringify(expected)) throw Error('Identitas berubah sebelum penghapusan.');
  }
  for (const record of records) {
    await api(`${base}/${encodeURIComponent(record.id)}`, 'DELETE');
    console.log(JSON.stringify({ detached: record.hostname, worker, id: record.id }));
  }
  for (const hostname of hosts) {
    const result = (await api(`${base}?hostname=${encodeURIComponent(hostname)}`)).result;
    if (!Array.isArray(result)) throw Error('Hasil verifikasi tidak valid.');
    if (result.some(row => String(row.hostname || '').toLowerCase().replace(/\.$/, '') === hostname)) {
      throw Error('Attachment masih ditemukan; pelepasan belum selesai.');
    }
  }
  console.log(JSON.stringify({ mode: 'apply', detached: records.length, verified: true }));
}
