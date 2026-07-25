import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "studio-production-audit-v37-20260725";
let frame = 0;
let healthPromise = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character]));
}

function number(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

async function health() {
  if (!healthPromise) {
    healthPromise = fetch("/api/health", { cache:"no-store", headers:{ accept:"application/json" } })
      .then((response) => response.ok ? response.json() : {})
      .catch(() => ({}));
  }
  return healthPromise;
}

async function token() {
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function api(path, body = null) {
  const accessToken = await token();
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "content-type":"application/json" } : {}),
      ...(accessToken ? { authorization:`Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body:JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Permintaan belum berhasil.");
  return data;
}

function pageViewByTitle(title) {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")]
    .find((view) => view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === title) || null;
}

function simulationData(days = 30) {
  const today = new Date();
  const series = Array.from({ length:days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const humans = Math.round(120 + Math.sin(index / 2.7) * 48 + index * 4.5);
    const bots = Math.round(22 + Math.cos(index / 2.2) * 9 + index * .8);
    return { day:date.toISOString().slice(0,10), humans, bots, views:humans + bots };
  });
  const humanViews = series.reduce((sum, item) => sum + item.humans, 0);
  const botViews = series.reduce((sum, item) => sum + item.bots, 0);
  return {
    rangeDays: days,
    generatedAt: new Date().toISOString(),
    simulated: true,
    totals: { views:humanViews + botViews, humanViews, botViews, unknownViews:0, uniqueHumans:Math.round(humanViews * .62), viewsToday:series.at(-1)?.views || 0, previousViews:Math.round((humanViews + botViews) * .83), changePercent:20.5 },
    series,
    traffic:[{label:"human",value:humanViews},{label:"bot",value:botViews}],
    devices:[{label:"mobile",value:Math.round(humanViews*.68)},{label:"desktop",value:Math.round(humanViews*.24)},{label:"tablet",value:Math.round(humanViews*.08)}],
    referrers:[{label:"Google",value:2310},{label:"Langsung",value:1260},{label:"Facebook",value:540},{label:"Bing",value:220}],
    countries:[{label:"ID",value:3560},{label:"MY",value:310},{label:"SG",value:190}],
    topContent:[
      {path:"/panduan-memulai",title:"Panduan Memulai",views:1120,humans:980,bots:140,uniqueHumans:730},
      {path:"/berita-hari-ini",title:"Berita Hari Ini",views:890,humans:790,bots:100,uniqueHumans:610},
      {path:"/tentang",title:"Tentang",views:540,humans:470,bots:70,uniqueHumans:390},
    ],
  };
}

function lineSvg(series) {
  const width = 760, height = 250, left = 38, top = 18, right = 16, bottom = 32;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const maximum = Math.max(1, ...series.map((item) => Number(item.views || 0)));
  const points = series.map((item, index) => {
    const x = left + (series.length <= 1 ? chartWidth / 2 : index / (series.length - 1) * chartWidth);
    const y = top + chartHeight - (Number(item.views || 0) / maximum * chartHeight);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = points ? `${left},${top + chartHeight} ${points} ${left + chartWidth},${top + chartHeight}` : "";
  const grid = [0,.25,.5,.75,1].map((ratio) => {
    const y = top + chartHeight * ratio;
    const value = Math.round(maximum * (1-ratio));
    return `<line x1="${left}" y1="${y}" x2="${left+chartWidth}" y2="${y}"/><text x="${left-8}" y="${y+4}" text-anchor="end">${number(value)}</text>`;
  }).join("");
  return `<svg class="sp37-line-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik kunjungan ${series.length} hari"><g class="grid">${grid}</g>${area ? `<polygon class="area" points="${area}"/>` : ""}${points ? `<polyline class="line" points="${points}"/>` : ""}</svg>`;
}

function donutStyle(items) {
  const total = Math.max(1, items.reduce((sum, item) => sum + Number(item.value || 0), 0));
  const colors = ["#2d6edf", "#e59b35", "#8b96a8", "#5c4ec9"];
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = cursor;
    cursor += Number(item.value || 0) / total * 360;
    return `${colors[index % colors.length]} ${start.toFixed(1)}deg ${cursor.toFixed(1)}deg`;
  });
  return `conic-gradient(${stops.join(",") || "#dfe6ef 0deg 360deg"})`;
}

function labels(items, mapping = {}) {
  const total = Math.max(1, items.reduce((sum, item) => sum + Number(item.value || 0), 0));
  return items.map((item, index) => `<li><i data-index="${index}"></i><span>${escapeHtml(mapping[item.label] || item.label)}</span><b>${number(item.value)}</b><small>${Math.round(Number(item.value || 0)/total*100)}%</small></li>`).join("") || `<li class="empty">Belum ada data</li>`;
}

function bars(items, mapping = {}) {
  const maximum = Math.max(1, ...items.map((item) => Number(item.value || 0)));
  return items.map((item) => `<div class="sp37-bar-row"><span>${escapeHtml(mapping[item.label] || item.label)}</span><div><i style="width:${Math.max(2, Number(item.value || 0)/maximum*100).toFixed(1)}%"></i></div><b>${number(item.value)}</b></div>`).join("") || `<p class="sp37-empty-copy">Belum ada data pada rentang ini.</p>`;
}

function analyticsMarkup(data, simulated = false) {
  const totals = data.totals || {};
  const traffic = data.traffic || [];
  const devices = data.devices || [];
  const change = totals.changePercent == null ? "Belum ada periode pembanding" : `${totals.changePercent >= 0 ? "+" : ""}${totals.changePercent}% dari periode sebelumnya`;
  return `<section class="sp37-analytics" data-simulated="${simulated}">
    <div class="sp37-analytics-toolbar"><div><b>${simulated ? "SIMULASI TAMPILAN — BUKAN DATA PRODUKSI" : "DATA PRODUKSI"}</b><span>${data.rangeDays || 30} hari terakhir · diperbarui ${new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(data.generatedAt || Date.now()))}</span></div><div><select class="sp37-range" aria-label="Rentang analitik"><option value="7">7 hari</option><option value="30" selected>30 hari</option><option value="90">90 hari</option><option value="365">1 tahun</option></select><button type="button" class="sp37-simulation">${simulated ? "Kembali ke data nyata" : "Lihat simulasi"}</button><button type="button" class="sp37-refresh">Muat ulang</button></div></div>
    <div class="sp37-metrics"><article><small>Total kunjungan</small><b>${number(totals.views)}</b><span>${escapeHtml(change)}</span></article><article><small>Pengunjung manusia unik</small><b>${number(totals.uniqueHumans)}</b><span>${number(totals.humanViews)} page view manusia</span></article><article><small>Trafik bot</small><b>${number(totals.botViews)}</b><span>Bot mesin pencari dan otomatisasi</span></article><article><small>Kunjungan hari ini</small><b>${number(totals.viewsToday)}</b><span>Berdasarkan zona waktu server</span></article></div>
    <div class="sp37-chart-grid"><article class="sp37-chart-wide"><header><div><small>TREN TRAFIK</small><h2>Kunjungan per hari</h2></div><span>Manusia + bot</span></header>${lineSvg(data.series || [])}</article><article><header><div><small>JENIS TRAFIK</small><h2>Manusia dan bot</h2></div></header><div class="sp37-donut-wrap"><div class="sp37-donut" style="background:${donutStyle(traffic)}"><b>${number(totals.views)}</b><small>Total</small></div><ul class="sp37-legend">${labels(traffic,{human:"Manusia",bot:"Bot",unknown:"Tidak diketahui"})}</ul></div></article></div>
    <div class="sp37-chart-grid sp37-chart-grid-equal"><article><header><div><small>PERANGKAT</small><h2>Distribusi perangkat</h2></div></header><div class="sp37-bars">${bars(devices,{mobile:"Mobile",desktop:"Desktop/laptop",tablet:"Tablet",tv:"TV",unknown:"Tidak diketahui"})}</div></article><article><header><div><small>SUMBER KUNJUNGAN</small><h2>Referrer teratas</h2></div></header><div class="sp37-bars">${bars(data.referrers || [])}</div></article><article><header><div><small>NEGARA</small><h2>Lokasi agregat</h2></div></header><div class="sp37-bars">${bars(data.countries || [])}</div></article></div>
    <article class="sp37-content-table"><header><div><small>POSTS & PAGES</small><h2>Performa konten</h2></div></header><div class="sp37-table-head"><span>Konten</span><span>Kunjungan</span><span>Manusia</span><span>Bot</span><span>Unik</span></div>${(data.topContent || []).map((item) => `<div class="sp37-table-row"><div><b>${escapeHtml(item.title || item.path)}</b><small>${escapeHtml(item.path)}</small></div><strong>${number(item.views)}</strong><span>${number(item.humans)}</span><span>${number(item.bots)}</span><span>${number(item.uniqueHumans)}</span></div>`).join("") || `<p class="sp37-empty-copy">Belum ada kunjungan. Collector akan mulai mencatat setelah situs publik dibuka.</p>`}</article>
  </section>`;
}

async function loadAnalytics(view, days = 30, simulated = false) {
  const host = view.querySelector(".sn-info-grid");
  if (!host) return;
  host.className = "sp37-analytics-host";
  host.innerHTML = `<div class="sp37-loading">Memuat analitik situs aktif…</div>`;
  try {
    const data = simulated ? simulationData(days) : (await supabase.rpc("get_site_analytics_dashboard", { target_site:activeSiteId(), range_days:days })).data;
    if (!data) throw new Error("Data analitik belum tersedia.");
    host.innerHTML = analyticsMarkup(data, simulated);
    const range = host.querySelector(".sp37-range");
    if (range) range.value = String(days);
    host.querySelector(".sp37-refresh")?.addEventListener("click", () => loadAnalytics(view, Number(range?.value || days), simulated));
    host.querySelector(".sp37-simulation")?.addEventListener("click", () => loadAnalytics(view, Number(range?.value || days), !simulated));
    range?.addEventListener("change", () => loadAnalytics(view, Number(range.value), simulated));
  } catch (error) {
    host.innerHTML = `<div class="sp37-error"><b>Analitik belum dapat dimuat</b><p>${escapeHtml(error.message || "Terjadi gangguan sementara.")}</p><button type="button">Coba lagi</button></div>`;
    host.querySelector("button")?.addEventListener("click", () => loadAnalytics(view, days, simulated));
  }
}

async function enhanceAnalytics(view) {
  if (view.dataset.sp37Analytics === "true") return;
  view.dataset.sp37Analytics = "true";
  view.classList.add("sp37-analytics-view");
  const description = view.querySelector(".sn-page-title p");
  if (description) description.textContent = "Kunjungan manusia, bot, perangkat, sumber trafik, negara, serta performa Posts dan Pages berdasarkan event produksi nyata.";
  await loadAnalytics(view, 30, false);
}

const ROLE_LABEL = { owner:"Pemilik", admin:"Admin", editor:"Editor", author:"Penulis", contributor:"Kontributor", viewer:"Pengamat" };

async function membersData(siteId) {
  const [{ data:members, error:memberError }, { data:invitations, error:inviteError }, { data:quota }] = await Promise.all([
    supabase.from("site_members").select("user_id,role,joined_at").eq("site_id",siteId).order("joined_at"),
    supabase.from("site_invitations").select("id,email,role,expires_at,created_at").eq("site_id",siteId).is("accepted_at",null).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}),
    supabase.rpc("get_site_member_quota",{target_site:siteId}),
  ]);
  if (memberError) throw memberError;
  if (inviteError && inviteError.code !== "42501") throw inviteError;
  const ids = (members || []).map((member) => member.user_id);
  const { data:profiles } = ids.length ? await supabase.from("profiles").select("id,display_name,avatar_url").in("id",ids) : { data:[] };
  const profileMap = new Map((profiles || []).map((profile) => [profile.id,profile]));
  return { members:(members || []).map((member) => ({...member,profile:profileMap.get(member.user_id)})), invitations:invitations || [], quota:Array.isArray(quota)?quota[0]:quota };
}

function memberMarkup(data, inviteReady) {
  const quota = data.quota || { active_count:data.members.length,pending_count:data.invitations.length,allowed_limit:100,remaining:Math.max(100-data.members.length-data.invitations.length,0),can_invite:false };
  return `<section class="sp37-members-panel">
    <div class="sp37-member-summary"><article><small>Anggota aktif</small><b>${number(quota.active_count)}</b></article><article><small>Undangan menunggu</small><b>${number(quota.pending_count)}</b></article><article><small>Batas tim per situs</small><b>${number(quota.allowed_limit)}</b></article><article><small>Slot tersisa</small><b>${number(quota.remaining)}</b></article></div>
    ${inviteReady && quota.can_invite ? `<form class="sp37-invite-form"><div><small>UNDANG ANGGOTA</small><h2>Kirim undangan melalui email</h2><p>Tautan berlaku tujuh hari dan hanya dapat diterima oleh alamat email tujuan.</p></div><label>Email<input name="email" type="email" required autocomplete="email" placeholder="nama@contoh.com"></label><label>Peran<select name="role"><option value="viewer">Pengamat</option><option value="contributor">Kontributor</option><option value="author">Penulis</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label><button type="submit">Kirim undangan</button></form>` : ""}
    <div class="sp37-member-grid"><section><header><div><small>TIM AKTIF</small><h2>${number(data.members.length)} anggota</h2></div></header><div class="sp37-member-list">${data.members.map((member) => { const name=member.profile?.display_name || "Pengguna"; return `<article><span>${escapeHtml(name.slice(0,2).toUpperCase())}</span><div><b>${escapeHtml(name)}</b><small>Bergabung ${new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(new Date(member.joined_at))}</small></div><i>${escapeHtml(ROLE_LABEL[member.role] || member.role)}</i></article>`; }).join("") || `<p class="sp37-empty-copy">Belum ada anggota yang dapat ditampilkan.</p>`}</div></section><section><header><div><small>UNDANGAN AKTIF</small><h2>${number(data.invitations.length)} menunggu</h2></div></header><div class="sp37-invite-list">${data.invitations.map((invite) => `<article data-invitation-id="${escapeHtml(invite.id)}"><div><b>${escapeHtml(invite.email)}</b><small>${escapeHtml(ROLE_LABEL[invite.role] || invite.role)} · berakhir ${new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(new Date(invite.expires_at))}</small></div>${inviteReady ? `<button type="button">Batalkan</button>` : ""}</article>`).join("") || `<p class="sp37-empty-copy">Tidak ada undangan yang menunggu.</p>`}</div></section></div>
    ${!inviteReady ? `<p class="sp37-member-readiness">Form undangan email disembunyikan sampai server email produksi dan delivery probe benar-benar aktif. Daftar anggota yang sudah ada tetap berfungsi.</p>` : ""}
  </section>`;
}

async function loadMembers(view) {
  const host = view.querySelector(".sn-members");
  if (!host) return;
  host.className = "sp37-members-host";
  host.innerHTML = `<div class="sp37-loading">Memuat anggota situs aktif…</div>`;
  try {
    const [data, state] = await Promise.all([membersData(activeSiteId()),health()]);
    host.innerHTML = memberMarkup(data, state.memberInvites === true);
    const form = host.querySelector(".sp37-invite-form");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      button.disabled = true; button.textContent = "Mengirim…";
      try {
        const values = new FormData(form);
        await api("/api/member-invitations/create", { siteId:activeSiteId(), email:values.get("email"), role:values.get("role") });
        form.reset();
        await loadMembers(view);
      } catch (error) {
        button.disabled = false; button.textContent = "Kirim undangan";
        window.alert(error.message);
      }
    });
    host.querySelectorAll(".sp37-invite-list article button").forEach((button) => button.addEventListener("click", async () => {
      if (!window.confirm("Batalkan undangan email ini?")) return;
      button.disabled = true;
      try { await api("/api/member-invitations/cancel", { invitationId:button.closest("article").dataset.invitationId }); await loadMembers(view); }
      catch (error) { button.disabled = false; window.alert(error.message); }
    }));
  } catch (error) {
    host.innerHTML = `<div class="sp37-error"><b>Anggota belum dapat dimuat</b><p>${escapeHtml(error.message)}</p><button type="button">Coba lagi</button></div>`;
    host.querySelector("button")?.addEventListener("click", () => loadMembers(view));
  }
}

async function enhanceMembers(view) {
  if (view.dataset.sp37Members === "true") return;
  view.dataset.sp37Members = "true";
  view.classList.add("sp37-members-view");
  await loadMembers(view);
}

async function siteSummary() {
  const siteId = activeSiteId();
  if (!siteId || !supabaseConfigured || !supabase) return null;
  const { data } = await supabase.from("sites").select("id,name,slug,status,is_public,blueprint,description,custom_domain").eq("id",siteId).maybeSingle();
  return data;
}

async function enhanceHome() {
  const welcome = document.querySelector(".sn-main > .sn-view-pad > .sn-welcome");
  if (!welcome || welcome.parentElement.querySelector(":scope > .sp37-active-site")) return;
  const site = await siteSummary();
  if (!site || !welcome.isConnected) return;
  const card = document.createElement("section");
  card.className = "sp37-active-site";
  card.innerHTML = `<div><small>SITUS YANG SEDANG DIKELOLA</small><h2>${escapeHtml(site.name)}</h2><p>${escapeHtml(site.custom_domain || `${site.slug}.ngeblogging.com`)}</p></div><dl><div><dt>Jenis</dt><dd>${escapeHtml(site.blueprint || "website")}</dd></div><div><dt>Status</dt><dd>${site.status === "active" && site.is_public ? "Publik" : "Draf"}</dd></div><div><dt>Workspace</dt><dd>Terpisah berdasarkan site_id</dd></div></dl><button type="button">Ganti situs aktif</button>`;
  welcome.insertAdjacentElement("afterend",card);
  card.querySelector("button")?.addEventListener("click", () => document.querySelector(".sn-workspace")?.click());
}

function coreDnsRows(domain, cnameTarget) {
  const rows = [];
  if (cnameTarget) rows.push({label:"1 · Arahkan trafik",type:"CNAME",name:domain.hostname,value:cnameTarget,note:"Untuk domain utama, gunakan @ bila panel DNS meminta nama host singkat."});
  const ownership = domain.ownership_verification || {};
  if (ownership.name && ownership.value) rows.push({label:"2 · Verifikasi kepemilikan",type:ownership.type || "TXT",name:ownership.name,value:ownership.value,note:"Nilai ini membuktikan bahwa domain memang milik pengguna."});
  for (const record of Array.isArray(domain.ssl_validation) ? domain.ssl_validation : []) {
    const name = record.txt_name || record.cname || record.name;
    const value = record.txt_value || record.cname_target || record.value;
    if (name && value) rows.push({label:"Tambahan · Validasi HTTPS",type:record.type || (record.cname ? "CNAME" : "TXT"),name,value,note:"Catatan tambahan hanya muncul bila Cloudflare memerlukannya untuk sertifikat."});
  }
  return rows;
}

function domainListMarkup(domains, cnameTarget) {
  return domains.map((domain) => `<article class="sp37-domain-item" data-domain-id="${escapeHtml(domain.id)}"><header><div><small>CUSTOM DOMAIN</small><h3>${escapeHtml(domain.hostname)}</h3></div><i class="${domain.status === "active" && domain.ssl_status === "active" ? "active" : ""}">${domain.status === "active" && domain.ssl_status === "active" ? "Aktif" : "Verifikasi"}</i></header><div class="sp37-dns-list">${coreDnsRows(domain,cnameTarget).map((row) => `<div><span><b>${escapeHtml(row.label)}</b><small>${escapeHtml(row.note)}</small></span><code>${escapeHtml(row.type)}</code><code>${escapeHtml(row.name)}</code><code>${escapeHtml(row.value)}</code><button type="button" data-copy="${escapeHtml(row.value)}">Salin</button></div>`).join("") || `<p>Cloudflare sedang menyiapkan catatan DNS.</p>`}</div><footer><a href="https://${escapeHtml(domain.hostname)}" target="_blank" rel="noreferrer">Buka domain</a><button type="button" data-action="refresh">Periksa status</button><button type="button" data-action="remove">Hapus</button></footer></article>`).join("") || `<div class="sp37-empty-domain"><b>Belum ada custom domain</b><p>Masukkan domain milik Anda. Ekstensi .com, .id, .my.id, .web.id, dan TLD valid lainnya diproses dengan alur yang sama.</p></div>`;
}

async function loadDomains(view) {
  let host = view.querySelector(":scope > .sp37-domain-host");
  if (!host) {
    host = document.createElement("section");
    host.className = "sp37-domain-host";
    view.querySelector(":scope > .sn-launch")?.insertAdjacentElement("afterend",host);
  }
  host.innerHTML = `<div class="sp37-loading">Memeriksa kesiapan custom domain…</div>`;
  const state = await health();
  if (state.customDomains !== true) {
    host.innerHTML = `<section class="sp37-domain-readiness"><div><small>CUSTOM DOMAIN</small><h2>Panel domain sudah tersedia, koneksi produksi belum lengkap</h2><p>Form penambahan domain tidak ditampilkan sampai token Cloudflare, Zone ID, target CNAME, dan service role server benar-benar terpasang. Subdomain gratis tetap aktif.</p></div><ul><li>CLOUDFLARE_API_TOKEN</li><li>CLOUDFLARE_ZONE_ID</li><li>CLOUDFLARE_CUSTOM_HOSTNAME_TARGET</li><li>SUPABASE_SERVICE_ROLE_KEY</li></ul></section>`;
    return;
  }
  try {
    const data = await api(`/api/domains/list?siteId=${encodeURIComponent(activeSiteId())}`);
    host.innerHTML = `<section class="sp37-domain-panel"><header><div><small>DOMAIN MILIK PENGGUNA</small><h2>Hubungkan custom domain</h2><p>Masukkan domain tanpa https:// dan tanpa path. Sistem akan memberikan dua catatan DNS utama serta validasi HTTPS tambahan bila diperlukan.</p></div><i>Cloudflare aktif</i></header><form><label>Nama domain<input name="hostname" required inputmode="url" autocomplete="off" placeholder="domain.com atau berita.my.id"></label><button type="submit">Tambahkan domain</button></form><div class="sp37-cname"><span>Target CNAME resmi Ngeblogging</span><code>${escapeHtml(data.cnameTarget || "")}</code><button type="button" data-copy="${escapeHtml(data.cnameTarget || "")}">Salin</button></div><div class="sp37-domain-list">${domainListMarkup(data.domains || [],data.cnameTarget)}</div></section>`;
    host.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => { await navigator.clipboard.writeText(button.dataset.copy || ""); const old=button.textContent; button.textContent="Tersalin"; setTimeout(()=>button.textContent=old,1000); }));
    host.querySelector("form")?.addEventListener("submit", async (event) => {
      event.preventDefault(); const button=event.currentTarget.querySelector("button"); button.disabled=true; button.textContent="Menambahkan…";
      try { await api("/api/domains/register",{siteId:activeSiteId(),hostname:new FormData(event.currentTarget).get("hostname")}); await loadDomains(view); }
      catch(error){button.disabled=false;button.textContent="Tambahkan domain";window.alert(error.message);}
    });
    host.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", async () => {
      const domainId=button.closest("[data-domain-id]")?.dataset.domainId; if(!domainId)return;
      if(button.dataset.action==="remove"&&!window.confirm("Hapus custom domain ini?"))return;
      button.disabled=true;
      try { await api(`/api/domains/${button.dataset.action === "remove" ? "remove" : "refresh"}`,{domainId}); await loadDomains(view); }
      catch(error){button.disabled=false;window.alert(error.message);}
    }));
  } catch (error) {
    host.innerHTML = `<div class="sp37-error"><b>Custom domain belum dapat dimuat</b><p>${escapeHtml(error.message)}</p><button type="button">Coba lagi</button></div>`;
    host.querySelector("button")?.addEventListener("click",()=>loadDomains(view));
  }
}

async function enhanceDomain(view) {
  if (view.dataset.sp37Domain === "true") return;
  view.dataset.sp37Domain = "true";
  view.classList.add("sp37-domain-view");
  await loadDomains(view);
}

function normalizeAffectedLayouts() {
  document.documentElement.dataset.studioProductionV37 = RELEASE;
  document.querySelectorAll(".bc-center").forEach((section) => section.dataset.sp37Backup = "true");
  document.querySelectorAll(".tn-studio").forEach((studio) => studio.dataset.sp37Theme = "true");
  document.querySelectorAll(".lb36-layer").forEach((layer) => layer.dataset.sp37Layout = "true");
}

async function acceptInviteFromUrl() {
  const url = new URL(location.href);
  const invitation = url.searchParams.get("member_invite");
  if (!invitation || !supabase) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  try {
    const result = await api("/api/member-invitations/accept",{token:invitation});
    url.searchParams.delete("member_invite");
    history.replaceState({},"",url);
    window.alert(`Undangan diterima. Peran Anda: ${ROLE_LABEL[result.role] || result.role}.`);
  } catch (error) {
    window.alert(error.message);
  }
}

function scan() {
  normalizeAffectedLayouts();
  enhanceHome();
  const analytics = pageViewByTitle("Analitik"); if (analytics) enhanceAnalytics(analytics);
  const members = pageViewByTitle("Anggota & tim"); if (members) enhanceMembers(members);
  const domain = pageViewByTitle("Domain & publikasi"); if (domain) enhanceDomain(domain);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement,{childList:true,subtree:true});

if (supabase) supabase.auth.onAuthStateChange(() => acceptInviteFromUrl());
acceptInviteFromUrl();
scan();
