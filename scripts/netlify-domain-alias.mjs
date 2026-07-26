#!/usr/bin/env node

const API = "https://api.netlify.com/api/v1";
const APEX_IP = "75.2.60.5";
const token = String(process.env.NETLIFY_AUTH_TOKEN || "").trim();
const siteId = String(process.env.NETLIFY_SITE_ID || process.env.NETLIFY_SITE_HOSTNAME || "ngeblogging.netlify.app").trim();
const bridgeHost = String(process.env.NETLIFY_SITE_HOSTNAME || "ngeblogging.netlify.app").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
const [command = "list", rawHostname = ""] = process.argv.slice(2);

function fail(message) {
  console.error(`\nGagal: ${message}`);
  process.exit(1);
}

function normalizeHostname(input) {
  let value = String(input || "").trim().toLowerCase();
  if (!value) fail("Masukkan hostname, misalnya domain.com atau blog.domain.com.");
  if (!value.includes("://")) value = `https://${value}`;
  let parsed;
  try { parsed = new URL(value); } catch { fail("Format hostname tidak valid."); }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.port) fail("Masukkan hostname saja tanpa path, parameter, atau port.");
  const hostname = parsed.hostname.replace(/\.$/, "");
  if (!hostname.includes(".") || hostname.includes("..")) fail("Hostname tidak valid.");
  return hostname;
}

async function request(path, options = {}) {
  if (!token) fail("NETLIFY_AUTH_TOKEN belum tersedia. Buat Personal Access Token gratis di Netlify lalu masukkan sebagai secret Codespaces/GitHub Actions.");
  const result = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) fail(payload.message || payload.error || `Netlify API gagal (${result.status}).`);
  return payload;
}

async function getSite() {
  return request(`/sites/${encodeURIComponent(siteId)}`);
}

async function updateAliases(aliases) {
  return request(`/sites/${encodeURIComponent(siteId)}`, {
    method: "PATCH",
    body: JSON.stringify({ domain_aliases: aliases, force_ssl: true }),
  });
}

async function provisionSsl() {
  try {
    await request(`/sites/${encodeURIComponent(siteId)}/ssl`, { method: "POST" });
    console.log("Permintaan SSL dikirim. Netlify akan menerbitkan HTTPS setelah DNS benar.");
  } catch {
    console.log("SSL belum dapat diterbitkan karena DNS mungkin belum propagasi. Jalankan command ssl nanti.");
  }
}

async function main() {
  const site = await getSite();
  const aliases = [...new Set((Array.isArray(site.domain_aliases) ? site.domain_aliases : []).map((value) => String(value).toLowerCase()))];

  if (command === "list") {
    console.log(`Project: ${site.name || siteId}`);
    console.log(`Bridge: ${bridgeHost}`);
    console.log(`Alias (${aliases.length}/50 rekomendasi):`);
    aliases.forEach((alias) => console.log(`- ${alias}`));
    return;
  }

  if (command === "ssl") {
    await provisionSsl();
    return;
  }

  const hostname = normalizeHostname(rawHostname);
  if (command === "add") {
    if (!aliases.includes(hostname) && aliases.length >= 50) fail("Project bridge ini sudah memiliki 50 alias. Buat project Netlify bridge kedua sebelum menambah domain baru.");
    const next = [...new Set([...aliases, hostname])];
    await updateAliases(next);
    console.log(`\nAlias ditambahkan: ${hostname}`);
    console.log("DNS untuk domain utama (apex):");
    console.log(`  A      @      ${APEX_IP}`);
    console.log("DNS untuk WWW/subdomain:");
    console.log(`  CNAME  ${hostname}  ${bridgeHost}`);
    console.log("Tambahkan juga TXT verifikasi yang ditampilkan oleh menu Domain Ngeblogging.");
    await provisionSsl();
    return;
  }

  if (command === "remove") {
    await updateAliases(aliases.filter((alias) => alias !== hostname));
    console.log(`Alias dihapus: ${hostname}`);
    return;
  }

  fail("Command tidak dikenal. Gunakan: list | add <hostname> | remove <hostname> | ssl");
}

main().catch((error) => fail(error.message || String(error)));
