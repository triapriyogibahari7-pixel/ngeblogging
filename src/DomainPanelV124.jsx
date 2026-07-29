import React, { useEffect, useMemo, useState } from "react";
import {
  Check, Clipboard, ExternalLink, Globe2, Link2, LoaderCircle, Plus,
  RefreshCw, Send, ShieldCheck, Unlink, Zap,
} from "lucide-react";
import { getVerifiedSession, isSessionReauthError } from "./lib/auth-session-v76.js";
import { setSitePublication } from "./lib/studio-data.js";

const REQUEST_TIMEOUT = 12000;

function withDeadline(promise, milliseconds = REQUEST_TIMEOUT) {
  let timer = 0;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(Object.assign(new Error("Layanan Domain melewati batas waktu."), { code: "DOMAIN_TIMEOUT" })), milliseconds);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

async function accessToken() {
  const verified = await withDeadline(getVerifiedSession({ force: false }), 8000);
  const token = verified?.session?.access_token;
  if (!token) throw Object.assign(new Error("Sesi akun perlu disambungkan kembali."), { code: "SESSION_REAUTH_REQUIRED" });
  return token;
}

async function domainApi(path, token, body = null) {
  const response = await withDeadline(fetch(path, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || "Permintaan Domain belum berhasil."), { status: response.status, code: payload.code });
  return payload;
}

function activeDomain(domain) {
  return domain?.status === "active" && domain?.provider_status === "active" && domain?.ssl_status === "active";
}

function status(domain) {
  if (activeDomain(domain)) return ["Aktif", "active"];
  if (domain?.status === "failed" || domain?.error_message) return ["Perlu perhatian", "danger"];
  if (domain?.status === "pending_deletion") return ["Sedang dilepas", "muted"];
  return ["Verifikasi nameserver", "pending"];
}

function nameservers(domain) {
  const values = domain?.ownership_verification?.required_name_servers;
  return Array.isArray(values) ? values.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function addresses(domain) {
  const values = domain?.ownership_verification?.additional_hostnames;
  return Array.isArray(values) ? values.filter((item) => item?.hostname) : [];
}

function Metric({ icon: Icon, label, value }) {
  return <article className="sv124-metric"><Icon/><span>{label}</span><b>{value}</b></article>;
}

export default function DomainPanelV124({ site, sites = [], onSiteUpdate, setToast }) {
  const [token, setToken] = useState("");
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [hostname, setHostname] = useState("");
  const [audit, setAudit] = useState({ results: [], passed: 0, total: 0, allReachable: false });

  const sortedDomains = useMemo(() => [...domains].sort((a, b) => Number(activeDomain(b)) - Number(activeDomain(a)) || String(a.hostname).localeCompare(String(b.hostname))), [domains]);
  const connected = sortedDomains.filter((item) => item.status !== "pending_deletion");
  const routed = sortedDomains.reduce((total, domain) => total + (activeDomain(domain) ? 1 : 0) + addresses(domain).filter((item) => item.enabled !== false).length, 0);
  const published = site?.status === "active" && site?.is_public;

  const load = async ({ quiet = false } = {}) => {
    if (!site?.id) {
      setDomains([]);
      setLoading(false);
      setError("Pilih situs aktif melalui tombol Workspace untuk mengelola Domain.");
      return;
    }
    if (!quiet) setLoading(true);
    setError("");
    try {
      const activeToken = token || await accessToken();
      setToken(activeToken);
      const payload = await domainApi(`/api/domains/list?siteId=${encodeURIComponent(site.id)}`, activeToken);
      setDomains(Array.isArray(payload?.domains) ? payload.domains.filter((item) => !item.site_id || item.site_id === site.id) : []);
    } catch (nextError) {
      console.error("Domain load failed", nextError);
      setError(nextError.message || "Data Domain belum dapat dimuat.");
      if (isSessionReauthError(nextError) || [401, 403].includes(nextError.status)) {
        window.dispatchEvent(new CustomEvent("ngeblogging:session-invalid", { detail: { message: nextError.message } }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setToken("");
    setDomains([]);
    setHostname("");
    setAudit({ results: [], passed: 0, total: 0, allReachable: false });
    load();
  }, [site?.id]);

  const mutate = async (key, operation, message) => {
    if (!site?.id || busy) return;
    setBusy(key);
    setError("");
    try {
      const activeToken = token || await accessToken();
      setToken(activeToken);
      await operation(activeToken);
      if (message) setToast?.(message);
      await load({ quiet: true });
    } catch (nextError) {
      setError(nextError.message || "Perubahan Domain belum berhasil.");
    } finally {
      setBusy("");
    }
  };

  const register = async (event) => {
    event.preventDefault();
    const clean = hostname.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");
    if (!clean) return setError("Masukkan nama domain tanpa https://, www, atau path.");
    await mutate("register", (activeToken) => domainApi("/api/domains/register", activeToken, { siteId: site.id, hostname: clean }), "Domain ditambahkan. Salin nameserver ke registrar.");
    setHostname("");
  };

  const refresh = (domain) => mutate(`refresh:${domain.id}`, (activeToken) => domainApi("/api/domains/refresh", activeToken, { domainId: domain.id }), "Pemeriksaan DNS dan HTTPS selesai.");

  const remove = (domain) => {
    if (!window.confirm(`Lepaskan ${domain.hostname} dari situs ini? Subdomain gratis tetap aktif.`)) return;
    mutate(`remove:${domain.id}`, (activeToken) => domainApi("/api/domains/remove", activeToken, { domainId: domain.id }), "Pelepasan domain dimulai.");
  };

  const copy = async (value, message = "Nilai DNS disalin") => {
    try {
      await navigator.clipboard.writeText(value);
      setToast?.(message);
    } catch {
      setError("Clipboard tidak tersedia. Tekan lama nilai untuk menyalin.");
    }
  };

  const togglePublication = async () => {
    if (!site?.id || busy) return;
    setBusy("publication");
    setError("");
    try {
      const updated = await setSitePublication(site.id, !published);
      onSiteUpdate?.({ ...site, ...updated });
      setToast?.(published ? "Situs kembali menjadi draf" : "Subdomain gratis diterbitkan");
    } catch (nextError) {
      setError(nextError.message || "Status publikasi belum dapat diubah.");
    } finally {
      setBusy("");
    }
  };

  const runAudit = async () => {
    if (!site?.id || busy) return;
    setBusy("audit");
    setError("");
    try {
      const activeToken = token || await accessToken();
      setToken(activeToken);
      const payload = await domainApi("/api/domains/audit", activeToken, { siteId: site.id });
      setAudit({
        results: Array.isArray(payload.results) ? payload.results : [],
        passed: Number(payload.passed || 0),
        total: Number(payload.total || 0),
        allReachable: payload.allReachable === true,
      });
    } catch (nextError) {
      setError(nextError.message || "Audit alamat belum dapat dijalankan.");
    } finally {
      setBusy("");
    }
  };

  return <div className="sv124-page sv124-domain-page">
    <header className="sv124-page-title">
      <div><small>NGEBLOGGING STUDIO</small><h1>Domain & publikasi</h1><p>Halaman Domain berdiri sendiri untuk situs aktif: subdomain gratis, domain pribadi, DNS, HTTPS, dan audit publik.</p></div>
      <button className="sv124-secondary" onClick={() => load()} disabled={loading || Boolean(busy)}><RefreshCw className={loading ? "spin" : ""}/>Muat ulang</button>
    </header>

    <section className="sv124-site-strip">
      <span><Globe2/></span><div><small>SITUS AKTIF</small><b>{site?.name || "Situs belum dipilih"}</b><p>{site?.slug ? `${site.slug}.ngeblogging.com` : "Pilih melalui Workspace"}</p></div><i>{sites.length}/12 situs dalam akun</i>
    </section>

    <div className="sv124-metrics-grid">
      <Metric icon={Globe2} label="Kapasitas akun" value={`${sites.length}/12`}/>
      <Metric icon={Link2} label="Domain situs aktif" value={connected.length}/>
      <Metric icon={Check} label="Alamat dirutekan" value={routed}/>
      <Metric icon={ShieldCheck} label="Perlu perhatian" value={sortedDomains.filter((domain) => domain.status === "failed" || domain.error_message).length}/>
    </div>

    <section className="sv124-card sv124-free-domain">
      <span><Globe2/></span><div><small>SUBDOMAIN GRATIS · TETAP ADA</small><h2>{site?.slug ? `${site.slug}.ngeblogging.com` : "Menunggu situs aktif"}</h2><p>{published ? "Alamat gratis aktif. Domain pribadi tidak akan menghapusnya." : "Alamat gratis dicadangkan dan dapat diterbitkan kapan saja."}</p></div><aside><i className={published ? "active" : "draft"}>{published ? "Aktif" : "Draf"}</i>{site?.slug ? <a href={`https://${site.slug}.ngeblogging.com?ngeblogging-free-preview=1`} target="_blank" rel="noreferrer"><ExternalLink/>Buka</a> : null}<button className="sv124-primary" onClick={togglePublication} disabled={!site?.id || Boolean(busy)}><Send/>{busy === "publication" ? "Memproses…" : published ? "Jadikan draf" : "Terbitkan"}</button></aside>
    </section>

    {error ? <div className="sv124-error sv124-domain-error" role="alert"><span>{error}</span><button onClick={() => load()}>Coba lagi</button></div> : null}

    <section className="sv124-card sv124-domain-register">
      <header><span><Plus/></span><div><small>DOMAIN PRIBADI</small><h2>{connected.length ? "Domain pribadi terhubung" : "Hubungkan domain pribadi"}</h2><p>Masukkan domain milik situs aktif. Sistem menyiapkan zone, nameserver, HTTPS, dan routing.</p></div></header>
      {!connected.length ? <form onSubmit={register}><label><b>Nama domain</b><input value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="domainanda.com" inputMode="url" autoComplete="off"/><small>Tanpa https://, www, atau path.</small></label><button className="sv124-primary" disabled={!site?.id || !hostname.trim() || Boolean(busy)}><Plus/>{busy === "register" ? "Menghubungkan…" : "Hubungkan domain"}</button></form> : null}
      <div className="sv124-provider-note"><ShieldCheck/>Full Zone Cloudflare dengan dua nameserver. Subdomain gratis tetap tersedia.</div>
    </section>

    <section className="sv124-card sv124-domain-list">
      <header><div><small>STATUS DOMAIN</small><h2>{loading ? "Memuat konfigurasi…" : sortedDomains.length ? "Konfigurasi domain" : "Belum ada domain pribadi"}</h2><p>Data pada bagian ini hanya milik situs yang sedang aktif.</p></div></header>
      {loading ? <div className="sv124-panel-loading sv124-domain-loading"><LoaderCircle className="spin"/><b>Memeriksa Domain…</b><p>Bagian lain tetap dapat digunakan selama pemeriksaan berlangsung.</p></div> : !sortedDomains.length ? <div className="sv124-unified-empty compact"><Link2/><h3>Belum ada domain pribadi</h3><p>Subdomain gratis tetap berfungsi. Gunakan formulir di atas untuk menambahkan domain.</p></div> : sortedDomains.map((domain) => {
        const [label, tone] = status(domain);
        const ns = nameservers(domain);
        return <article className="sv124-domain-item" key={domain.id}>
          <header><span><Globe2/></span><div><small>DOMAIN UTAMA</small><h3>{domain.hostname}</h3><p>{activeDomain(domain) ? "Zone, HTTPS, dan routing aktif." : "Pasang nameserver lalu periksa koneksi."}</p></div><i className={tone}>{label}</i></header>
          {domain.error_message ? <p className="sv124-inline-error">{domain.error_message}</p> : null}
          {ns.length ? <section className="sv124-nameservers"><header><div><small>NAMESERVER RESMI</small><b>Salin ke registrar domain</b></div><button onClick={() => copy(ns.join("\n"), "Semua nameserver disalin")}><Clipboard/>Salin semua</button></header>{ns.map((value, index) => <div key={value}><span>Nameserver {index + 1}</span><code>{value}</code><button onClick={() => copy(value)} aria-label={`Salin nameserver ${index + 1}`}><Clipboard/></button></div>)}</section> : null}
          <footer>{activeDomain(domain) ? <a href={`https://${domain.hostname}`} target="_blank" rel="noreferrer"><ExternalLink/>Buka</a> : null}<button onClick={() => refresh(domain)} disabled={Boolean(busy)}><RefreshCw className={busy === `refresh:${domain.id}` ? "spin" : ""}/>Periksa koneksi</button><button className="danger" onClick={() => remove(domain)} disabled={Boolean(busy)}><Unlink/>Lepaskan</button></footer>
        </article>;
      })}
    </section>

    <section className="sv124-card sv124-domain-audit">
      <header><div><small>AUDIT PUBLIK</small><h2>Periksa alamat situs aktif</h2><p>Menguji HTTPS, status HTTP, HTML publik, redirect, dan waktu respons.</p></div><button className="sv124-secondary" onClick={runAudit} disabled={!site?.id || Boolean(busy)}><Zap/>{busy === "audit" ? "Memeriksa…" : "Audit alamat"}</button></header>
      {audit.total ? <div className={`sv124-audit-summary ${audit.allReachable ? "ok" : "warn"}`}><b>{audit.passed}/{audit.total} alamat lolos</b><span>{audit.allReachable ? "Semua alamat dapat dibuka." : "Periksa alamat yang belum lolos."}</span></div> : null}
      {audit.results.length ? <div className="sv124-audit-results">{audit.results.map((item, index) => <article key={`${item.address}:${index}`}><span className={item.reachable ? "ok" : "warn"}>{item.reachable ? <Check/> : <ShieldCheck/>}</span><div><b>{item.label || item.address}</b><small>{item.address} · {item.httpStatus ? `HTTP ${item.httpStatus}` : "tanpa respons"} · {Number(item.latencyMs || 0)} ms</small><p>{item.check || ""}</p></div><i>{item.reachable ? "Lolos" : "Perlu diperiksa"}</i></article>)}</div> : null}
    </section>
  </div>;
}
