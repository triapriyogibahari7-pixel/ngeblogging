export const NAMESERVER_POLL_LIMIT = 8;
export function canPollNameservers(domain, busy = false) {
  if (!domain?.hostname || busy) return false;
  const status = String(domain.status || '').toLowerCase();
  if (['aktif','gagal','hapus','perhatian'].some(word => status.includes(word))) return false;
  return (Array.isArray(domain.nameservers) ? domain.nameservers.length : 0) < 2;
}
export function nextNameserverPoll(count) {
  if (!Number.isInteger(count) || count < 0 || count >= NAMESERVER_POLL_LIMIT) return null;
  return {count: count + 1, delay: Math.min(3500 + count * 2000, 15000)};
}
