const TYPES = Object.freeze({A: 1, AAAA: 28, NS: 2});
const RESOLVERS = Object.freeze(['https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve']);
function hostname(value) {
 const name = String(value || '').trim().toLowerCase().replace(/\.$/, '');
 if (name.length > 253 || !name.includes('.') || name.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw Error('INVALID_DNS_HOSTNAME');
 return name;
}
async function query(resolver, name, type, fetchImpl) {
 const url = new URL(resolver); url.searchParams.set('name', name); url.searchParams.set('type', type);
 try {
  const response = await fetchImpl(url.toString(), {redirect: 'error', headers: {accept: 'application/dns-json'}, signal: AbortSignal.timeout(4000)});
  if (!response.ok) return {state: 'unavailable', answers: []};
  const data = await response.json();
  if (data?.TC === true || !Number.isInteger(data?.Status)) return {state: 'unavailable', answers: []};
  if (data.Status === 3) return {state: 'nxdomain', answers: []};
  if (data.Status !== 0) return {state: 'unavailable', answers: []};
  const answers = (Array.isArray(data.Answer) ? data.Answer : []).filter(row => row?.type === TYPES[type] && typeof row.data === 'string').map(row => row.data);
  return {state: answers.length ? 'resolved' : 'no_answer', answers};
 } catch { return {state: 'unavailable', answers: []}; }
}
export async function checkCustomDomainDns({hostname: input, zoneName, expectedNameservers = [], fetchImpl = globalThis.fetch} = {}) {
 const name = hostname(input), zone = hostname(zoneName);
 if (name !== zone && !name.endsWith('.' + zone)) throw Error('HOSTNAME_ZONE_MISMATCH');
 const expected = [...new Set(expectedNameservers.map(hostname))].sort();
 const checks = await Promise.all(RESOLVERS.map(async resolver => {
  const [a, aaaa, ns] = await Promise.all(['A', 'AAAA', 'NS'].map(type => query(resolver, type === 'NS' ? zone : name, type, fetchImpl)));
  const observed = [...new Set(ns.answers.map(value => value.toLowerCase().replace(/\.$/, '')))].sort();
  const addressReady = a.state === 'resolved' || aaaa.state === 'resolved';
  const nameserversMatch = expected.length >= 2 && expected.length === observed.length && expected.every((value, index) => value === observed[index]);
  return {resolver: new URL(resolver).hostname, a, aaaa, ns, addressReady, nameserversMatch};
 }));
 const ready = checks.every(check => check.addressReady && check.nameserversMatch);
 const state = ready ? 'dns_ready' : checks.some(check => check.a.state === 'nxdomain' || check.aaaa.state === 'nxdomain') ? 'nxdomain' : checks.some(check => check.a.state === 'unavailable' || check.aaaa.state === 'unavailable' || check.ns.state === 'unavailable') ? 'inconclusive' : checks.some(check => !check.nameserversMatch) ? 'nameserver_mismatch' : 'address_missing';
 return {hostname: name, zoneName: zone, checkedAt: new Date().toISOString(), ready, state, checks, httpsVerified: false, siteContentVerified: false};
}
