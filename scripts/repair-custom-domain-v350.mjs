import { resolveNs } from "node:dns/promises";

export const RELEASE = "custom-domain-repair-v350-20260929";

const ACCOUNT_ID = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const TOKEN = String(process.env.CLOUDFLARE_DOMAIN_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "").trim();
const DOMAIN = String(process.env.TARGET_DOMAIN || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\.$/, "");
const SERVICE = String(process.env.WORKER_SERVICE || "ngeblogging").trim();
const API = "https://api.cloudflare.com/client/v4";

const fail = (message) => { throw new Error("[" + RELEASE + "] " + message); };
const norm = (value) => String(value || "").trim().toLowerCase().replace(/\.$/, "");

if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(DOMAIN)) fail("TARGET_DOMAIN tidak valid.");
if (!/^[0-9a-f]{32}$/i.test(ACCOUNT_ID)) fail("CLOUDFLARE_ACCOUNT_ID tidak valid.");
if (!TOKEN) fail("CLOUDFLARE_DOMAIN_API_TOKEN/CLOUDFLARE_API_TOKEN kosong.");
if (!SERVICE) fail("WORKER_SERVICE kosong.");

async function cf(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      authorization: "Bearer " + TOKEN,
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    const detail = Array.isArray(payload?.errors)
      ? payload.errors.map((item) => item?.message || String(item)).filter(Boolean).join("; ")
      : "";
    fail("Cloudflare " + (options.method || "GET") + " " + path + " gagal (" + response.status + "): " + (detail || "respons tidak valid") + ".");
  }
  return payload.result;
}

async function dnsJson(name, type) {
  const encoded = encodeURIComponent(name);
  const endpoints = [
    "https://cloudflare-dns.com/dns-query?name=" + encoded + "&type=" + type,
    "https://dns.google/resolve?name=" + encoded + "&type=" + type,
  ];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("Resolver publik tidak merespons: " + (lastError?.message || "unknown"));
}

async function dnsState(host) {
  const results = await Promise.all(["A", "AAAA", "CNAME"].map(async (type) => {
    const payload = await dnsJson(host, type);
    return { type, status: Number(payload?.Status), answers: Array.isArray(payload?.Answer) ? payload.Answer : [] };
  }));
  return {
    host,
    nxdomain: results.some((item) => item.status === 3),
    noerror: results.some((item) => item.status === 0 && item.answers.length > 0),
    records: results,
  };
}

async function httpsSmoke(host) {
  try {
    const response = await fetch("https://" + host + "/?ngeblogging_domain_repair=1", {
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        "cache-control": "no-cache",
      },
      signal: AbortSignal.timeout(15000),
    });
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const body = await response.text();
    return {
      host,
      status: response.status,
      finalUrl: response.url,
      contentType,
      html: /<!doctype\s+html|<html[\s>]/i.test(body.slice(0, 16000)),
      appShell: /id=["']root["']|ngeblogging/i.test(body.slice(0, 16000)),
    };
  } catch (error) {
    return { host, status: 0, finalUrl: "", contentType: "", html: false, appShell: false, error: error?.message || String(error) };
  }
}

const publicNs = [...await resolveNs(DOMAIN)].map(norm).filter(Boolean).sort();
if (!publicNs.length) fail("Nameserver publik " + DOMAIN + " tidak dapat di-resolve.");

const zones = await cf("/zones?name=" + encodeURIComponent(DOMAIN) + "&per_page=50");
const zone = (zones || []).find((item) => norm(item?.name) === DOMAIN && norm(item?.account?.id) === norm(ACCOUNT_ID));
if (!zone) {
  fail("Zone " + DOMAIN + " belum ada pada akun Cloudflare ini. Perbaiki/delegasikan nameserver domain ke Cloudflare terlebih dahulu; runner tidak akan membuat zone baru secara buta agar DNS yang sudah ada tidak tertimpa.");
}
if (zone.status !== "active") {
  const assigned = Array.isArray(zone.name_servers) ? zone.name_servers.join(", ") : "tidak tersedia";
  fail("Zone " + DOMAIN + " berstatus " + (zone.status || "unknown") + ". Nameserver Cloudflare yang ditetapkan: " + assigned + ". Zone harus ACTIVE sebelum Worker Custom Domain dapat melayani publik.");
}

const zoneId = String(zone.id || "");
if (!/^[0-9a-f]{32}$/i.test(zoneId)) fail("Zone ID Cloudflare tidak valid.");

const hosts = [DOMAIN, "www." + DOMAIN];
for (const hostname of hosts) {
  const attached = await cf("/accounts/" + encodeURIComponent(ACCOUNT_ID) + "/workers/domains", {
    method: "PUT",
    body: JSON.stringify({ hostname, service: SERVICE, zone_id: zoneId, zone_name: DOMAIN }),
  });
  if (norm(attached?.hostname) !== hostname || norm(attached?.service) !== norm(SERVICE) || norm(attached?.zone_id) !== norm(zoneId)) {
    fail("Binding Worker tidak sesuai untuk " + hostname + ".");
  }
  console.log(JSON.stringify({ attached: hostname, zoneId, service: attached?.service, certId: attached?.cert_id || null }));
}

const workerDomains = await cf("/accounts/" + encodeURIComponent(ACCOUNT_ID) + "/workers/domains?service=" + encodeURIComponent(SERVICE) + "&zone_id=" + encodeURIComponent(zoneId));
for (const hostname of hosts) {
  const row = (workerDomains || []).find((item) => norm(item?.hostname) === hostname);
  if (!row || norm(row.service) !== norm(SERVICE) || norm(row.zone_id) !== norm(zoneId)) fail("Worker Domain " + hostname + " belum terikat dengan benar.");
}

let dns = [];
let live = [];
for (let attempt = 1; attempt <= 30; attempt += 1) {
  dns = await Promise.all(hosts.map(dnsState));
  live = await Promise.all(hosts.map(httpsSmoke));
  console.log(JSON.stringify({ attempt, dns, live }, null, 2));
  const dnsReady = dns.every((item) => item.noerror && !item.nxdomain);
  const httpsReady = live.every((item) => item.status >= 200 && item.status < 400 && item.html && item.appShell && item.contentType.includes("text/html"));
  if (dnsReady && httpsReady) break;
  await new Promise((resolve) => setTimeout(resolve, 10000));
}

if (!dns.every((item) => item.noerror && !item.nxdomain)) {
  const bad = dns.filter((item) => !item.noerror || item.nxdomain).map((item) => item.host + (item.nxdomain ? "=NXDOMAIN" : "=NO-DATA")).join(", ");
  fail("DNS publik belum sehat: " + bad + ". Custom Domain sudah dipasang pada Cloudflare, tetapi resolver publik belum melihat record.");
}
if (!live.every((item) => item.status >= 200 && item.status < 400 && item.html && item.appShell && item.contentType.includes("text/html"))) {
  const bad = live.filter((item) => !(item.status >= 200 && item.status < 400 && item.html && item.appShell && item.contentType.includes("text/html"))).map((item) => item.host + " (" + (item.status || item.error || "no-response") + ")").join(", ");
  fail("HTTPS publik belum menyajikan situs Ngeblogging: " + bad);
}

console.log(JSON.stringify({
  ok: true,
  release: RELEASE,
  domain: DOMAIN,
  www: "www." + DOMAIN,
  zoneId,
  zoneStatus: zone.status,
  publicNameservers: publicNs,
  workerService: SERVICE,
  dns,
  live,
}, null, 2));
