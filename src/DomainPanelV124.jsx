import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check, Clipboard, ExternalLink, Globe2, Link2, LoaderCircle, Plus,
  RefreshCw, Send, ShieldCheck, Trash2, Unlink, Zap,
} from "lucide-react";
import { getVerifiedSession, isSessionReauthError } from "./lib/auth-session-v76.js";
import { setSitePublication } from "./lib/studio-data.js";
import { supabase } from "./lib/supabase.js";
import { assignedNameservers, applyDomainInstructions, domainRowsForSite } from "./lib/domain-panel-result.mjs";

const REQUEST_TIMEOUT = 45000;

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
  const verified = await withDeadline(getVerifiedSession({ force: true }), 10000);
  const token = verified?.session?.access_token;
  if (!token) throw Object.assign(new Error("Sesi akun perlu diverifikasi kembali."), { code: "SESSION_REAUTH_REQUIRED" });
  return token;
}

async function domainApi(path, token, body = null) {
  const controller = new AbortController();
  try {
    return await withDeadline((async () => {
      const response = await fetch(path, {
        method: body ? "POST" : "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "cache-control": "no-cache",
          authorization: `Bearer ${token}`,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(payload.error || "Permintaan Domain belum berhasil."), { status: response.status, code: payload.code, requestId: payload.requestId || response.headers.get("x-request-id"), payload });
      return payload;
    })());
  } finally {
    controller.abort();
  }
}

function normalizeDomainName(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
}

function isManagedFreeDomain(value = "") {
  const hostname = normalizeDomainName(value);
  return hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com");
}

function nameservers(domain) {
  return assignedNameservers(domain?.ownership_verification?.required_name_servers);
}

function addresses(domain) {
  const values = domain?.ownership_verification?.additional_hostnames;
  return Array.isArray(values) ? values.filter((item) => item?.hostname).map((item) => ({
    host: String(item.host || ""),
    hostname: String(item.hostname || ""),
    enabled: item.enabled !== false,
  })) : [];
}

function activeDomain(domain) {
  return domain?.status === "active" && domain?.provider_status === "active" && domain?.ssl_status === "active";
}

function domainStatus(domain) {
  if (activeDomain(domain)) return ["Aktif", "active"];
  if (domain?.status === "failed" || domain?.error_message) return ["Perlu perhatian", "danger"];
  if (domain?.status === "pending_deletion") return ["Sedang dilepas", "muted"];
  return ["Verifikasi nameserver", "pending"];
}

function Metric({ icon: Icon, label, value }) {
  return <article className="sv124-metric"><Icon/><span>{label}</span><b>{value}</b></article>;
}

export default function DomainPanelV124({ site, sites = [], onSiteUpdate, setToast }) {
  const [token, setToken] = useState("");
  const [config, setConfig] = useState(null);
  const siteRef = useRef(site?.id);
  const loadGeneration = useRef(0);
  const mutationLock = useRef(false);
  const siteGeneration = useRef(0);
  if (siteRef.current !== site?.id) {
    siteGeneration.current += 1;
    siteRef.current = site?.id;
  }
  const initialCustomDomain = normalizeDomainName(site?.custom_domain);
  const initialExternalCustomDomain = isManagedFreeDomain(initialCustomDomain) ? "" : initialCustomDomain;
  const [domains, setDomains] = useState(() => initialExternalCustomDomain ? [{
    id: `site-custom-domain:${site?.id || "initial"}`, site_id: site?.id || null,
    hostname: initialExternalCustomDomain, status: "pending", provider: "cloudflare-full-zone",
    provider_status: "pending", ssl_status: "pending", is_primary: true,
    ownership_verification: {}, ssl_validation: [], error_message: null,
    created_at: site?.updated_at || null, updated_at: site?.updated_at || null,
  }] : []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [hostname, setHostname] = useState("");
  const [audit, setAudit] = useState({ results: [], passed: 0, total: 0, allReachable: false, checkedAt: "" });

  const sortedDomains = useMemo(() => [...domains].sort((a, b) => Number(activeDomain(b)) - Number(activeDomain(a)) || String(a.hostname).localeCompare(String(b.hostname))), [domains]);
  const connected = sortedDomains.filter((item) => item.status !== "pending_deletion" && !isManagedFreeDomain(item.hostname));
  const routed = sortedDomains.reduce((total, domain) => total + (activeDomain(domain) ? 1 : 0) + addresses(domain).filter((item) => item.enabled).length, 0);

  const load = async ({ quiet = false, acceptedDomain = null } = {}) => {
    if (!site?.id) return;
    const targetSiteId = site.id;
    const generation = ++loadGeneration.current;
    const targetSiteGeneration = siteGeneration.current;
    const current = () => siteRef.current === targetSiteId
      && siteGeneration.current === targetSiteGeneration
      && loadGeneration.current === generation;
    if (!quiet) setLoading(true);
    setError("");
    try {
      const nextToken = token || await accessToken();
      if (!current()) return;
      setToken(nextToken);
      const payload = await domainApi(`/api/domains/list?siteId=${encodeURIComponent(site.id)}`, nextToken);
      if (!current()) return;
      setConfig(payload);
      const apiList = Array.isArray(payload?.domains) ? payload.domains : [];
      let currentSite = null;
      let dbDomains = [];
      if (supabase) {
        try {
          const [siteResult, domainResult] = await Promise.all([
            withDeadline(
              supabase.from("sites")
                .select("custom_domain,status,is_public,updated_at")
                .eq("id", site.id)
                .maybeSingle(),
              10000,
            ),
            withDeadline(
              supabase.from("site_domains")
                .select("id,site_id,hostname,status,provider,provider_status,ssl_status,is_primary,ownership_verification,ssl_validation,error_message,created_at,updated_at")
                .eq("site_id", site.id)
                .order("is_primary", { ascending: false })
                .order("updated_at", { ascending: false, nullsFirst: false })
                .limit(20),
              10000,
            ),
          ]);
          if (!current()) return;
          if (!siteResult.error) currentSite = siteResult.data || null;
          if (!domainResult.error) dbDomains = Array.isArray(domainResult.data) ? domainResult.data : [];
          if (currentSite) onSiteUpdate?.({ ...site, ...currentSite });
        } catch (siteLookupError) {
          console.warn("Canonical domain data hydration failed", siteLookupError);
        }
      }
      if (!current()) return;
      const configuredCustomDomain = normalizeDomainName(currentSite?.custom_domain !== undefined ? currentSite.custom_domain : site?.custom_domain);
      const externalConfiguredCustomDomain = isManagedFreeDomain(configuredCustomDomain) ? "" : configuredCustomDomain;
      const list = domainRowsForSite(site.id, acceptedDomain, [...dbDomains, ...apiList]);
      const hasConfiguredCustomDomain = externalConfiguredCustomDomain && list.some(
        (item) => normalizeDomainName(item?.hostname) === externalConfiguredCustomDomain,
      );
      const displayList = externalConfiguredCustomDomain && !hasConfiguredCustomDomain
        ? [{
            id: `site-custom-domain:${site.id}`,
            site_id: site.id,
            hostname: externalConfiguredCustomDomain,
            status: "pending",
            provider: "cloudflare-full-zone",
            provider_status: "pending",
            ssl_status: "pending",
            is_primary: true,
            ownership_verification: {},
            ssl_validation: [],
            error_message: null,
            created_at: currentSite?.updated_at || site.updated_at || null,
            updated_at: currentSite?.updated_at || site.updated_at || null,
          }, ...list]
        : list;
      setDomains(displayList);
    } catch (nextError) {
      if (!current()) return;
      console.error("Domain load failed", nextError);
      if (acceptedDomain?.site_id === site.id) {
        setDomains(domainRowsForSite(site.id, acceptedDomain));
        setError(`Hasil domain sudah diterima, tetapi daftar terbaru belum dapat dimuat: ${nextError.message || "layanan belum merespons"}`);
        return;
      }
      let configuredCustomDomain = normalizeDomainName(site?.custom_domain);
      if (isManagedFreeDomain(configuredCustomDomain)) configuredCustomDomain = "";
      if (!configuredCustomDomain && supabase && site?.id) {
        try {
          const { data: currentSite } = await withDeadline(
            supabase.from("sites").select("custom_domain,status,is_public,updated_at").eq("id", site.id).maybeSingle(),
            10000,
          );
          if (!current()) return;
          configuredCustomDomain = normalizeDomainName(currentSite?.custom_domain);
          if (isManagedFreeDomain(configuredCustomDomain)) configuredCustomDomain = "";
          if (currentSite) onSiteUpdate?.({ ...site, ...currentSite });
        } catch (siteLookupError) {
          console.warn("Custom domain error fallback lookup failed", siteLookupError);
        }
      }
      if (!current()) return;
      if (configuredCustomDomain) {
        setDomains([{
          id: `site-custom-domain:${site.id}`,
          site_id: site.id,
          hostname: configuredCustomDomain,
          status: "pending",
          provider: "cloudflare-full-zone",
          provider_status: "pending",
          ssl_status: "pending",
          is_primary: true,
          ownership_verification: {},
          ssl_validation: [],
          error_message: null,
          created_at: site.updated_at || null,
          updated_at: site.updated_at || null,
        }]);
      }
      setError(nextError.message || "Data Domain belum dapat dimuat.");
      if (isSessionReauthError(nextError) || nextError.status === 401) {
        window.dispatchEvent(new CustomEvent("ngeblogging:session-invalid", { detail: { message: nextError.message } }));
      }
    } finally {
      if (current()) setLoading(false);
    }
  };

  useEffect(() => {
    siteGeneration.current += 1;
    mutationLock.current = false;
    setToken("");
    setConfig(null);
    setBusy("");
    setDomains(site?.custom_domain && !isManagedFreeDomain(site.custom_domain) ? [{
      id: `site-custom-domain:${site.id}`, site_id: site.id,
      hostname: normalizeDomainName(site.custom_domain),
      status: "pending", provider: "cloudflare-full-zone", provider_status: "pending", ssl_status: "pending",
      is_primary: true, ownership_verification: {}, ssl_validation: [], error_message: null,
      created_at: site.updated_at || null, updated_at: site.updated_at || null,
    }] : []);
    setAudit({ results: [], passed: 0, total: 0, allReachable: false, checkedAt: "" });
    setHostname("");
    load();
    return () => {
      siteGeneration.current += 1;
      loadGeneration.current += 1;
    };
  }, [site?.id]);

  const beginOperation = (key) => {
    if (!site?.id || busy || mutationLock.current) return null;
    const operation = { siteId: site.id, generation: siteGeneration.current };
    mutationLock.current = operation;
    loadGeneration.current += 1;
    setBusy(key);
    setError("");
    const current = () => siteRef.current === operation.siteId
      && siteGeneration.current === operation.generation;
    return {
      current,
      finish: () => {
        if (mutationLock.current === operation) mutationLock.current = false;
        if (current()) setBusy("");
      },
    };
  };

  const mutate = async (key, operation, success) => {
    const task = beginOperation(key);
    if (!task) return null;
    const targetSiteId = site.id;
    try {
      const activeToken = await accessToken();
      if (!task.current()) return null;
      setToken(activeToken);
      const operationResult = applyDomainInstructions(await operation(activeToken), targetSiteId);
      if (!task.current()) return null;
      const acceptedDomain = operationResult?.domain || null;
      if (acceptedDomain && acceptedDomain.site_id !== targetSiteId) {
        throw Object.assign(new Error("Respons domain tidak cocok dengan situs aktif."), { code: "DOMAIN_SITE_MISMATCH" });
      }
      if (acceptedDomain?.id) {
        setDomains((current) => domainRowsForSite(targetSiteId, acceptedDomain, current));
        setLoading(false);
      }
      const message = typeof success === "function" ? success(operationResult) : success;
      if (message) setToast?.(message);
      if (key === "register" && acceptedDomain?.id) {
        void load({ quiet: true, acceptedDomain });
      } else {
        await load({ quiet: true, acceptedDomain });
      }
      return operationResult;
    } catch (nextError) {
      if (task.current()) {
        const detail = [nextError.code, nextError.requestId ? `ID ${nextError.requestId}` : ""].filter(Boolean).join(" · ");
        setError(`${nextError.message || "Perubahan Domain belum berhasil."}${detail ? ` (${detail})` : ""}`);
      }
      return null;
    } finally {
      task.finish();
    }
  };

  const register = async (event) => {
    event.preventDefault();
    const clean = hostname.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");
    if (!clean) return setError("Masukkan nama domain tanpa https://, www, atau path.");
    const targetSiteGeneration = siteGeneration.current;
    const result = await mutate("register", (activeToken) => domainApi("/api/domains/register", activeToken, { siteId: site.id, hostname: clean }),
      (payload) => nameservers(payload?.domain).length >= 2
        ? "Domain terdaftar. Salin nameserver yang ditampilkan ke registrar."
        : "Domain terdaftar. Nameserver belum tersedia; gunakan Periksa koneksi.");
    if (result && siteRef.current === site.id && siteGeneration.current === targetSiteGeneration) setHostname("");
  };

  const refresh = (domain) => mutate(`refresh:${domain.id}`, (activeToken) => domainApi("/api/domains/refresh", activeToken, { domainId: domain.id }), "Pemeriksaan DNS dan HTTPS selesai.");

  const remove = (domain) => {
    if (!window.confirm(`Lepaskan ${domain.hostname} dari situs ini? Subdomain gratis tetap aktif.`)) return;
    mutate(`remove:${domain.id}`, (activeToken) => domainApi("/api/domains/remove", activeToken, { domainId: domain.id }), "Pelepasan domain dimulai.");
  };

  const toggleAddress = (domain, item) => mutate(`address:${domain.id}:${item.host}`, (activeToken) => domainApi("/api/domains/address", activeToken, { domainId: domain.id, host: item.host, enabled: !item.enabled }), item.enabled ? "Alamat dinonaktifkan." : "Alamat diaktifkan.");

  const copy = async (value, message = "Nilai DNS disalin") => {
    try {
      await navigator.clipboard.writeText(value);
      setToast?.(message);
    } catch {
      setError("Clipboard tidak tersedia pada perangkat ini. Tekan lama nilai untuk menyalin.");
    }
  };

  const togglePublication = async () => {
    const task = beginOperation("publication");
    if (!task) return;
    const published = site.status === "active" && site.is_public;
    try {
      const updated = await withDeadline(setSitePublication(site.id, !published));
      if (!task.current()) return;
      onSiteUpdate?.({ ...site, ...updated });
      setToast?.(published ? "Situs kembali menjadi draf" : "Subdomain gratis diterbitkan");
    } catch (nextError) {
      if (task.current()) setError(nextError.message || "Status publikasi belum dapat diubah.");
    } finally {
      task.finish();
    }
  };

  const runAudit = async () => {
    const task = beginOperation("audit");
    if (!task) return;
    setAudit({ results: [], passed: 0, total: 0, allReachable: false, checkedAt: "" });
    try {
      const activeToken = token || await accessToken();
      if (!task.current()) return;
      setToken(activeToken);
      const primary = sortedDomains[0];
      if (primary?.id) {
        try { await domainApi("/api/domains/refresh", activeToken, { domainId: primary.id }); } catch { /* audit menjelaskan hasil */ }
        if (!task.current()) return;
      }
      const payload = await domainApi("/api/domains/audit", activeToken, { siteId: site.id });
      if (!task.current()) return;
      setAudit({
        results: Array.isArray(payload.results) ? payload.results : [],
        passed: Number(payload.passed || 0),
        total: Number(payload.total || 0),
        allReachable: payload.allReachable === true,
        checkedAt: payload.checkedAt || "",
      });
      await load({ quiet: true });
    } catch (nextError) {
      if (task.current()) setError(nextError.message || "Audit alamat belum dapat dijalankan.");
    } finally {
      task.finish();
    }
  };

  const published = site?.status === "active" && site?.is_public;

  return <div className="sv124-page sv124-domain-page">
    <header className="sv124-page-title">
      <div><small>NGEBLOGGING STUDIO</small><h1>Domain & publikasi</h1><p>Kelola domain situs aktif, subdomain gratis, DNS, HTTPS, www, alamat tambahan, dan audit publik tanpa bercampur dengan halaman lain.</p></div>
      <button className="sv124-secondary" onClick={() => load()} disabled={loading || Boolean(busy)}><RefreshCw className={loading ? "spin" : ""}/>Muat ulang</button>
    </header>

    <section className="sv124-site-strip">
      <span><Globe2/></span><div><small>SITUS AKTIF</small><b>{site?.name || "Situs belum dipilih"}</b><p>{site?.slug ? `${site.slug}.ngeblogging.com` : ""}</p></div><i>{sites.length}/12 situs dalam akun</i>
    </section>

    {error ? <div className="sv124-error sv124-domain-error" role="alert"><span>{error}</span><button onClick={() => load()}>Coba lagi</button></div> : null}

    {loading ? <div className="sv124-panel-loading sv124-domain-loading"><LoaderCircle className="spin"/><b>Menyiapkan halaman Domain…</b><p>Hanya data situs aktif yang sedang dimuat. Proses berhenti dengan pesan jelas bila jaringan bermasalah.</p></div> : <>
      <div className="sv124-metrics-grid">
        <Metric icon={Globe2} label="Kapasitas akun" value={`${sites.length}/12`}/>
        <Metric icon={Link2} label="Domain situs aktif" value={connected.length}/>
        <Metric icon={Check} label="Alamat dapat dirutekan" value={routed}/>
        <Metric icon={ShieldCheck} label="Perlu perhatian" value={sortedDomains.filter((domain) => domain.status === "failed" || domain.error_message).length}/>
      </div>

      <section className="sv124-card sv124-free-domain">
        <span><Globe2/></span><div><small>SUBDOMAIN GRATIS · TETAP ADA</small><h2>{site?.slug ? `${site.slug}.ngeblogging.com` : "Menunggu situs"}</h2><p>{published ? "Alamat gratis aktif permanen. Domain pribadi tidak menghapus URL ini." : "Alamat gratis sudah dicadangkan. Terbitkan ketika situs siap."}</p></div><aside><i className={published ? "active" : "draft"}>{published ? "Aktif" : "Draf"}</i>{site?.slug ? <a href={`https://${site.slug}.ngeblogging.com?ngeblogging-free-preview=1`} target="_blank" rel="noreferrer"><ExternalLink/>Lihat situs</a> : null}<button className="sv124-primary" onClick={togglePublication} disabled={Boolean(busy)}><Send/>{busy === "publication" ? "Memproses…" : published ? "Jadikan draf" : "Terbitkan"}</button></aside>
      </section>

      <section className="sv124-card sv124-domain-register">
        <header><span><Plus/></span><div><small>DOMAIN UTAMA SITUS</small><h2>{connected.length ? "Domain pribadi sudah terdaftar" : "Hubungkan domain pribadi"}</h2><p>{connected.length ? "Status dan nameserver domain situs ini ada pada kartu di bawah. Ganti situs melalui Workspace untuk mengelola situs lain." : "Masukkan domain milik situs aktif. Sistem meminta nameserver dari provider; DNS dan HTTPS diperiksa secara terpisah."}</p></div></header>
        <form onSubmit={register}><label><b>Nama domain</b><input value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="domainanda.com" inputMode="url" autoComplete="off"/><small>Tanpa https://, tanpa www, dan tanpa path.</small></label><button className="sv124-primary" disabled={!hostname.trim() || Boolean(busy)}><Plus/>{busy === "register" ? "Menghubungkan…" : "Hubungkan domain"}</button></form>
        <div className="sv124-provider-note"><ShieldCheck/>Ngeblogging menampilkan nameserver asli untuk domain Anda dari Cloudflare. Gunakan hanya nilai pada kartu domain; nameserver bermerek Ngeblogging belum diaktifkan. Subdomain gratis tetap tersedia.</div>
      </section>

      <section className="sv124-card sv124-domain-list">
        <header><div><small>STATUS DOMAIN SITUS AKTIF</small><h2>{sortedDomains.length ? "Konfigurasi domain" : "Belum ada domain pribadi"}</h2><p>DNS, HTTPS, www, dan alamat tambahan diperiksa hanya untuk situs yang sedang aktif.</p></div></header>
        {!sortedDomains.length ? <div className="sv124-unified-empty compact"><Link2/><h3>Hubungkan domain pertama</h3><p>Gunakan formulir di atas. Halaman ini tidak akan mengambil domain milik situs lain.</p></div> : sortedDomains.map((domain) => {
          const [label, tone] = domainStatus(domain);
          const ns = nameservers(domain);
          const domainAddresses = addresses(domain);
          return <article className="sv124-domain-item" key={domain.id}>
            <header><span><Globe2/></span><div><small>DOMAIN UTAMA SITUS</small><h3>{domain.hostname}</h3><p>{activeDomain(domain) ? "Zone, HTTPS, dan routing aktif." : ns.length >= 2 ? "Ganti nameserver di registrar, lalu jalankan pemeriksaan ulang." : "Nameserver belum tersedia lengkap. Jangan mengubah DNS sebelum nilai domain ini tampil."}</p></div><i className={tone}>{label}</i></header>
            {domain.error_message ? <p className="sv124-inline-error">{domain.error_message}</p> : null}
            {ns.length >= 2 ? <section className="sv124-nameservers"><header><div><small>NAMESERVER RESMI DOMAIN INI</small><b>Salin ke registrar domain</b></div><button onClick={() => copy(ns.join("\n"), "Semua nameserver disalin")}><Clipboard/>Salin semua</button></header>{ns.map((value, index) => <div key={value}><span>Nameserver {index + 1}</span><code>{value}</code><button onClick={() => copy(value)} aria-label={`Salin nameserver ${index + 1}`}><Clipboard/></button></div>)}</section> : domain.status !== "pending_deletion" && !activeDomain(domain) ? <p className="sv124-inline-error" role="status">Nameserver belum tersedia. Tekan Periksa koneksi untuk meminta status terbaru. Jangan gunakan nameserver domain Ngeblogging atau nama bermerek yang belum aktif.</p> : null}
            {domainAddresses.length ? <section className="sv124-addresses"><h4>Alamat tambahan</h4>{domainAddresses.map((item) => <div key={`${domain.id}:${item.host}`}><span><b>{item.hostname}</b><small>{item.enabled ? "Routing aktif" : "Routing nonaktif"}</small></span><button className={item.enabled ? "on" : "off"} onClick={() => toggleAddress(domain, item)} disabled={Boolean(busy)}><i/>{item.enabled ? "Aktif" : "Nonaktif"}</button></div>)}</section> : null}
            <footer>{activeDomain(domain) ? <a href={`https://${domain.hostname}`} target="_blank" rel="noreferrer"><ExternalLink/>Lihat situs</a> : null}<button onClick={() => refresh(domain)} disabled={Boolean(busy)}><RefreshCw className={busy === `refresh:${domain.id}` ? "spin" : ""}/>Periksa koneksi</button><button className="danger" onClick={() => remove(domain)} disabled={Boolean(busy)}><Unlink/>Lepaskan</button></footer>
          </article>;
        })}
      </section>

      <section className="sv124-card sv124-domain-audit">
        <header><div><small>AUDIT PUBLIK SERVER-SIDE</small><h2>Periksa alamat situs aktif</h2><p>Menguji HTTPS, status HTTP, HTML publik, redirect, dan waktu respons.</p></div><button className="sv124-secondary" onClick={runAudit} disabled={Boolean(busy)}><Zap/>{busy === "audit" ? "Memeriksa…" : "Audit alamat"}</button></header>
        {audit.total ? <div className={`sv124-audit-summary ${audit.allReachable ? "ok" : "warn"}`}><b>{audit.passed}/{audit.total} alamat lolos audit HTTPS</b><span>{audit.allReachable ? "Semua alamat situs aktif dapat dibuka." : "Periksa rincian alamat yang belum lolos."}</span></div> : null}
        {audit.results.length ? <div className="sv124-audit-results">{audit.results.map((item, index) => <article key={`${item.address}:${index}`}><span className={item.reachable ? "ok" : "warn"}>{item.reachable ? <Check/> : <ShieldCheck/>}</span><div><b>{item.label || item.address}</b><small>{item.address} · {item.httpStatus ? `HTTP ${item.httpStatus}` : "tanpa respons"} · {Number(item.latencyMs || 0)} ms</small><p>{item.check || ""}</p></div><i>{item.reachable ? "Lolos" : "Perlu diperiksa"}</i></article>)}</div> : null}
      </section>
    </>}
  </div>;
}
