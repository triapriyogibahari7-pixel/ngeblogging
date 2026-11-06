const TYPES = Object.freeze({A: 1, AAAA: 28, NS: 2});
const RESOLVERS = Object.freeze(['https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve']);
function hostname(value) {
 const name = String(value || '').trim().toLowerCase().replace(/\.$/, '');
 if (name.length > 253 || !name.includes('.') || name.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw Error('INVALID_DNS_HOSTNAME');
 return name;
}
async function withDeadline(ms, operation) {
 const controller = new AbortController();
 let timer;
 const deadline = new Promise((_, reject) => {
  timer = setTimeout(() => {
   controller.abort();
   reject(Object.assign(new Error('DNS_REQUEST_TIMEOUT'), {name: 'TimeoutError'}));
  }, ms);
 });
 try { return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), deadline]); }
 finally { clearTimeout(timer); controller.abort(); }
}
async function queryOnce(resolver, name, type, fetchImpl) {
 const url = new URL(resolver); url.searchParams.set('name', name); url.searchParams.set('type', type);
 try {
  return await withDeadline(4000, async signal => {
   const response = await fetchImpl(url.toString(), {redirect: 'manual', headers: {accept: 'application/dns-json'}, signal});
   if (!response.ok) { try { await response.body?.cancel?.(); } catch {} return {state: 'unavailable', answers: []}; }
   const data = await response.json();
   if (data?.TC === true || !Number.isInteger(data?.Status)) return {state: 'unavailable', answers: []};
   if (data.Status === 3) return {state: 'nxdomain', answers: []};
   if (data.Status !== 0) return {state: 'unavailable', answers: []};
   const answers = (Array.isArray(data.Answer) ? data.Answer : []).filter(row => row?.type === TYPES[type] && typeof row.data === 'string').map(row => row.data);
   return {state: answers.length ? 'resolved' : 'no_answer', answers};
  });
 } catch { return {state: 'unavailable', answers: []}; }
}
async function query(resolver, name, type, fetchImpl) {
 const first = await queryOnce(resolver, name, type, fetchImpl);
 if (first.state !== 'unavailable') return first;
 await new Promise(resolve => setTimeout(resolve, 150));
 return queryOnce(resolver, name, type, fetchImpl);
}
export async function checkCustomDomainDns({hostname: input, zoneName, expectedNameservers = [], fetchImpl = (...args) => globalThis.fetch(...args)} = {}) {
 const name = hostname(input), zone = hostname(zoneName);
 if (name !== zone && !name.endsWith('.' + zone)) throw Error('HOSTNAME_ZONE_MISMATCH');
 const expected = [...new Set(expectedNameservers.map(hostname))].sort();
 if(typeof window!=='undefined'){
  const params=new URLSearchParams({hostname:name,zoneName:zone});for(const ns of expected)params.append('ns',ns);
  return withDeadline(12000, async signal => {
   const response=await fetchImpl('/api/domains/dns-public?'+params.toString(),{method:'GET',redirect:'error',cache:'no-store',credentials:'omit',headers:{accept:'application/json'},signal});
   if(!response.ok||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error('DNS_BACKEND_UNAVAILABLE');
   const data=await response.json();
   if(data.release!=='public-dns-relay-v1-20261106'||data.hostname!==name||data.zoneName!==zone||!Number.isFinite(Date.parse(data.checkedAt))||!Array.isArray(data.checks)||data.checks.length!==2)throw Error('DNS_BACKEND_RESULT_UNVERIFIED');
   const allowed=new Set(['cloudflare-dns.com','dns.google']);
   for(const row of data.checks){
    if(!allowed.delete(row?.resolver)||typeof row.addressReady!=='boolean'||typeof row.nameserversMatch!=='boolean')throw Error('DNS_BACKEND_RESULT_UNVERIFIED');
    for(const type of ['a','aaaa','ns'])if(!['resolved','no_answer','nxdomain','unavailable'].includes(row[type]?.state)||!Array.isArray(row[type]?.answers)||row[type].answers.some(value=>typeof value!=='string'))throw Error('DNS_BACKEND_RESULT_UNVERIFIED');
   }
   return data;
  });
 }
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
