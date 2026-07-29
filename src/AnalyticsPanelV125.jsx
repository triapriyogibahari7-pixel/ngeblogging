import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, Bot, FileText, Globe2, LoaderCircle, Monitor,
  RefreshCw, ShieldCheck, Smartphone, Tablet, Users,
} from "lucide-react";
import { supabase } from "./lib/supabase.js";

const RANGE_OPTIONS = [
  [7, "7 hari"],
  [30, "30 hari"],
  [90, "90 hari"],
  [365, "1 tahun"],
];

function number(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function dateTime(value) {
  if (!value) return "belum tersedia";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "belum tersedia";
  }
}

function zeroSeries(days) {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return { day: date.toISOString().slice(0, 10), views: 0, humans: 0, bots: 0 };
  });
}

function normalize(raw, days) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    rangeDays: Number(source.rangeDays || days),
    generatedAt: source.generatedAt || new Date().toISOString(),
    totals: {
      views: 0,
      humanViews: 0,
      botViews: 0,
      unknownViews: 0,
      uniqueHumans: 0,
      viewsToday: 0,
      previousViews: 0,
      changePercent: null,
      ...(source.totals || {}),
    },
    series: Array.isArray(source.series) && source.series.length ? source.series : zeroSeries(days),
    traffic: Array.isArray(source.traffic) ? source.traffic : [],
    devices: Array.isArray(source.devices) ? source.devices : [],
    referrers: Array.isArray(source.referrers) ? source.referrers : [],
    countries: Array.isArray(source.countries) ? source.countries : [],
    topContent: Array.isArray(source.topContent) ? source.topContent : [],
  };
}

function LineChart({ series }) {
  const width = 760;
  const height = 250;
  const left = 42;
  const right = 16;
  const top = 18;
  const bottom = 32;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(1, ...series.map((item) => Number(item.views || 0)));
  const points = series.map((item, index) => {
    const x = left + (series.length <= 1 ? chartWidth / 2 : index / (series.length - 1) * chartWidth);
    const y = top + chartHeight - Number(item.views || 0) / maximum * chartHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = points ? `${left},${top + chartHeight} ${points} ${left + chartWidth},${top + chartHeight}` : "";
  const grid = [0, .25, .5, .75, 1].map((ratio) => {
    const y = top + chartHeight * ratio;
    return { y, value: Math.round(maximum * (1 - ratio)) };
  });

  return <div className="sv125-line-wrap">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Grafik kunjungan ${series.length} hari`}>
      {grid.map((item) => <g key={item.y}><line x1={left} y1={item.y} x2={left + chartWidth} y2={item.y}/><text x={left - 8} y={item.y + 4} textAnchor="end">{number(item.value)}</text></g>)}
      {area ? <polygon points={area}/> : null}
      {points ? <polyline points={points}/> : null}
    </svg>
  </div>;
}

function Bars({ items, labels = {} }) {
  const maximum = Math.max(1, ...items.map((item) => Number(item.value || 0)));
  if (!items.length) return <div className="sv125-mini-empty">Belum ada data pada rentang ini.</div>;
  return <div className="sv125-bars">{items.map((item) => <div key={item.label}>
    <span>{labels[item.label] || item.label || "Tidak diketahui"}</span>
    <div><i style={{ width: `${Math.max(2, Number(item.value || 0) / maximum * 100)}%` }}/></div>
    <b>{number(item.value)}</b>
  </div>)}</div>;
}

function Metric({ icon: Icon, label, value, note }) {
  return <article className="sv125-analytics-metric"><Icon/><div><span>{label}</span><b>{value}</b><small>{note}</small></div></article>;
}

export default function AnalyticsPanelV125({ site }) {
  const [range, setRange] = useState(30);
  const [data, setData] = useState(() => normalize(null, 30));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!site?.id) {
      setError("Pilih situs aktif melalui Workspace untuk melihat Analitik.");
      setData(normalize(null, range));
      setLoading(false);
      return;
    }
    if (!supabase) {
      setError("Koneksi Analitik belum tersedia pada perangkat ini.");
      setData(normalize(null, range));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await supabase.rpc("get_site_analytics_dashboard", {
        target_site: site.id,
        range_days: range,
      });
      if (result.error) throw result.error;
      setData(normalize(result.data, range));
    } catch (nextError) {
      console.error("Analytics dashboard failed", nextError);
      setError(nextError.message || "Analitik belum dapat dimuat.");
      setData(normalize(null, range));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [site?.id, range]);

  const totals = data.totals;
  const change = totals.changePercent == null
    ? "Belum ada periode pembanding"
    : `${totals.changePercent >= 0 ? "+" : ""}${totals.changePercent}% dari periode sebelumnya`;
  const traffic = useMemo(() => data.traffic.length ? data.traffic : [
    { label: "human", value: totals.humanViews || 0 },
    { label: "bot", value: totals.botViews || 0 },
    { label: "unknown", value: totals.unknownViews || 0 },
  ], [data.traffic, totals.humanViews, totals.botViews, totals.unknownViews]);
  const totalTraffic = Math.max(1, traffic.reduce((sum, item) => sum + Number(item.value || 0), 0));

  return <div className="sv124-page sv125-analytics-page">
    <header className="sv124-page-title">
      <div><small>DATA PRODUKSI NYATA</small><h1>Analitik</h1><p>Kunjungan manusia, bot, perangkat, sumber trafik, negara, dan performa Posts serta Pages untuk situs aktif.</p></div>
      <div className="sv125-analytics-actions"><select value={range} onChange={(event) => setRange(Number(event.target.value))} aria-label="Rentang Analitik">{RANGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="sv124-secondary" onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""}/>{loading ? "Memuat…" : "Muat ulang"}</button></div>
    </header>

    <section className="sv124-site-strip"><span><Activity/></span><div><small>SITUS AKTIF</small><b>{site?.name || "Situs belum dipilih"}</b><p>{site?.slug ? `${site.slug}.ngeblogging.com` : "Pilih melalui Workspace"}</p></div><i>{data.rangeDays} hari</i></section>

    {error ? <div className="sv124-error" role="alert"><span>{error}</span><button onClick={load}>Coba lagi</button></div> : null}

    <div className="sv125-analytics-metrics">
      <Metric icon={Activity} label="Total kunjungan" value={number(totals.views)} note={change}/>
      <Metric icon={Users} label="Manusia unik" value={number(totals.uniqueHumans)} note={`${number(totals.humanViews)} page view manusia`}/>
      <Metric icon={Bot} label="Trafik bot" value={number(totals.botViews)} note="Mesin pencari dan otomatisasi"/>
      <Metric icon={FileText} label="Kunjungan hari ini" value={number(totals.viewsToday)} note="Event yang diterima collector"/>
    </div>

    <div className="sv125-analytics-grid">
      <section className="sv124-card sv125-chart-card"><header><div><small>TREN TRAFIK</small><h2>Kunjungan per hari</h2></div><span>Diperbarui {dateTime(data.generatedAt)}</span></header>{loading ? <div className="sv124-panel-loading"><LoaderCircle className="spin"/><b>Memuat event produksi…</b></div> : <LineChart series={data.series}/>}</section>
      <section className="sv124-card sv125-traffic-card"><header><div><small>JENIS TRAFIK</small><h2>Manusia dan bot</h2></div></header><div className="sv125-traffic-total"><b>{number(totals.views)}</b><span>Total event</span></div><div className="sv125-traffic-list">{traffic.map((item) => <div key={item.label}><i className={item.label}/><span>{{ human: "Manusia", bot: "Bot", unknown: "Tidak diketahui" }[item.label] || item.label}</span><b>{number(item.value)}</b><small>{Math.round(Number(item.value || 0) / totalTraffic * 100)}%</small></div>)}</div></section>
    </div>

    <div className="sv125-breakdown-grid">
      <section className="sv124-card"><header><Smartphone/><div><small>PERANGKAT</small><h2>Distribusi perangkat</h2></div></header><Bars items={data.devices} labels={{ mobile: "Mobile", desktop: "Desktop/laptop", tablet: "Tablet", tv: "TV", unknown: "Tidak diketahui" }}/></section>
      <section className="sv124-card"><header><Monitor/><div><small>SUMBER TRAFIK</small><h2>Referrer teratas</h2></div></header><Bars items={data.referrers}/></section>
      <section className="sv124-card"><header><Globe2/><div><small>NEGARA</small><h2>Lokasi agregat</h2></div></header><Bars items={data.countries}/></section>
    </div>

    <section className="sv124-card sv125-content-performance"><header><div><small>POSTS & PAGES</small><h2>Performa konten</h2><p>Hanya data agregat yang sudah direkam collector privasi-first.</p></div><ShieldCheck/></header><div className="sv125-analytics-table"><div className="head"><span>Konten</span><span>Kunjungan</span><span>Manusia</span><span>Bot</span><span>Unik</span></div>{data.topContent.length ? data.topContent.map((item) => <div key={`${item.path}:${item.title}`}><div><b>{item.title || item.path}</b><small>{item.path}</small></div><strong>{number(item.views)}</strong><span>{number(item.humans)}</span><span>{number(item.bots)}</span><span>{number(item.uniqueHumans)}</span></div>) : <div className="empty"><div><b>Belum ada kunjungan konten</b><small>Collector akan mengisi tabel setelah Posts atau Pages publik dibuka.</small></div><strong>0</strong><span>0</span><span>0</span><span>0</span></div>}</div></section>
  </div>;
}
