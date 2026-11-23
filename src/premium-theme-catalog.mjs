// Isolated catalog: importing this module does not activate themes or grant licenses.
export const PREMIUM_SECTION_TITLE = 'tema premium';
export const PREMIUM_LICENSES = Object.freeze({
  personal: Object.freeze({ amountIdr: 75000, siteLimit: 1, lifetime: true, scope: 'one-theme' }),
  multisite: Object.freeze({ amountIdr: 650000, siteLimit: 50, lifetime: true, scope: 'one-theme-one-account' })
});

const FAMILIES = [
  ['aksara', 'Aksara', 'Esai', 'Esai dan gagasan dengan ruang baca lapang', ['Catatan pembuka', 'Gagasan utama', 'Percakapan', 'Bacaan pilihan', 'Tentang penulis', 'Arsip tulisan']],
  ['sorotan', 'Sorotan', 'Majalah', 'Kisah utama dan liputan pilihan', ['Laporan utama', 'Wawancara', 'Budaya', 'Kota', 'Perspektif', 'Edisi terdahulu']],
  ['rupa', 'Rupa', 'Portofolio', 'Karya, proses, dan identitas kreatif', ['Identitas visual', 'Desain produk', 'Eksperimen', 'Proses kreatif', 'Studi kasus', 'Kolaborasi']],
  ['tumbuh', 'Tumbuh', 'Bisnis', 'Layanan dan pendekatan bisnis yang jelas', ['Strategi', 'Layanan', 'Pendekatan', 'Proyek pilihan', 'Tim', 'Hubungi kami']],
  ['jelajah', 'Jelajah', 'Perjalanan', 'Catatan perjalanan dan panduan destinasi', ['Rute pilihan', 'Catatan kota', 'Panduan lokal', 'Jurnal perjalanan', 'Persiapan', 'Cerita pembaca']],
  ['racik', 'Racik', 'Kuliner', 'Cerita bahan, resep, dan pengalaman rasa', ['Resep pilihan', 'Bahan musiman', 'Dari dapur', 'Teknik memasak', 'Menu akhir pekan', 'Catatan rasa']],
  ['pijar', 'Pijar', 'Edukasi', 'Materi belajar dalam alur yang mudah diikuti', ['Mulai belajar', 'Konsep dasar', 'Latihan mandiri', 'Proyek praktik', 'Referensi', 'Pertanyaan umum']],
  ['rona', 'Rona', 'Fotografi', 'Seri foto dan cerita visual yang terkurasi', ['Cahaya pagi', 'Potret manusia', 'Ruang kota', 'Bentang alam', 'Di balik lensa', 'Cetak pilihan']],
  ['sinyal', 'Sinyal', 'Teknologi', 'Produk, catatan pengembangan, dan panduan', ['Ikhtisar produk', 'Catatan rilis', 'Panduan awal', 'Integrasi', 'Eksperimen', 'Dokumentasi']],
  ['selaras', 'Selaras', 'Gaya hidup', 'Rutinitas, ruang, dan cerita keseharian', ['Ritual pagi', 'Ruang tinggal', 'Catatan akhir pekan', 'Pilihan sederhana', 'Percakapan', 'Jurnal pribadi']]
];

// Ten structural compositions; not just ten color palettes.
const COMPOSITIONS = [
  ['monograf', 'Monograf', '#20372e', '#e7d7b3', '#faf8f2', 'Georgia,serif'],
  ['panorama', 'Panorama', '#16324b', '#e5b669', '#f5f8fb', 'Arial,sans-serif'],
  ['kolase', 'Kolase', '#4c2745', '#e9a690', '#fbf4f7', 'Arial,sans-serif'],
  ['folio', 'Folio', '#443126', '#d9bd85', '#fcf7ed', 'Georgia,serif'],
  ['indeks', 'Indeks', '#242c3b', '#b5c9ee', '#f6f7fa', 'Arial,sans-serif'],
  ['panggung', 'Panggung', '#302248', '#dac1ef', '#faf6ff', 'Georgia,serif'],
  ['alur', 'Alur', '#234441', '#a6d8ca', '#f2faf7', 'Arial,sans-serif'],
  ['diptych', 'Diptych', '#4c2930', '#efc0b4', '#fff8f5', 'Georgia,serif'],
  ['buletin', 'Buletin', '#303b26', '#d2dca1', '#f8faef', 'Arial,sans-serif'],
  ['kapsul', 'Kapsul', '#254054', '#a9d7df', '#f3f9fc', 'Arial,sans-serif']
];

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function card(title, index, familyIndex) {
  const shape = ['circle', 'arch', 'lines', 'window'][(index + familyIndex) % 4];
  return `<article class="pt-card"><div class="pt-art pt-art-${shape}" aria-hidden="true"><i></i><b>${String(index + 1).padStart(2, '0')}</b></div><div class="pt-card-copy"><small>KOLEKSI ${String(index + 1).padStart(2, '0')}</small><h3>${escapeHtml(title)}</h3><p>Ruang untuk cerita, karya, dan sudut pandang Anda.</p><a href="#pt-contact">Selengkapnya <span aria-hidden="true">&#8599;</span></a></div></article>`;
}

function markup(theme, titles, familyIndex) {
  const cards = titles.map((title, index) => card(title, index, familyIndex));
  const intro = `<section class="pt-intro" id="pt-about"><small>${escapeHtml(theme.category)}</small><h1>${escapeHtml(theme.headline)}</h1><p>${escapeHtml(theme.description)}</p><a class="pt-button" href="#pt-work">Jelajahi koleksi</a></section>`;
  const feature = `<section class="pt-feature" aria-label="Pilihan utama">${cards[0]}</section>`;
  const about = `<aside class="pt-note"><small>CATATAN</small><h2>Sudut pandang yang layak dibagikan.</h2><p>Tambahkan kisah, identitas, dan karya Anda melalui pengaturan situs.</p><a href="#pt-contact">Mari terhubung</a></aside>`;
  const grid = `<section class="pt-grid" id="pt-work" aria-label="Koleksi pilihan">${cards.slice(1).join('')}</section>`;
  const title = `<div class="pt-section-title"><span>KOLEKSI PILIHAN</span><span>01 — 06</span></div>`;
  const layouts = {
    monograf: `${intro}<div class="pt-reading">${feature}${about}</div>${title}${grid}`,
    panorama: `<div class="pt-panorama">${intro}${feature}</div>${title}${grid}${about}`,
    kolase: `${intro}<div class="pt-collage" id="pt-work">${cards.join('')}</div>${about}`,
    folio: `<div class="pt-folio">${intro}<div>${feature}${title}${grid}</div></div>${about}`,
    indeks: `${intro}<section class="pt-index" id="pt-work" aria-label="Indeks koleksi">${cards.join('')}</section>${about}`,
    panggung: `${intro}${feature}<div class="pt-stage-lower">${about}<div>${title}${grid}</div></div>`,
    alur: `${intro}<section class="pt-timeline" id="pt-work" aria-label="Alur koleksi">${cards.join('')}</section>${about}`,
    diptych: `<div class="pt-diptych"><div>${intro}${about}</div><section id="pt-work" aria-label="Koleksi pilihan">${cards.join('')}</section></div>`,
    buletin: `<div class="pt-bulletin-top">${intro}${about}</div>${title}<div class="pt-bulletin-body">${feature}${grid}</div>`,
    kapsul: `${intro}<nav class="pt-tags" aria-label="Bagian halaman"><a href="#pt-work">Koleksi</a><a href="#pt-about">Tentang</a><a href="#pt-contact">Kontak</a></nav>${grid}${feature}${about}`
  };
  return `<div class="pt-site pt-${theme.composition}" data-premium-theme="${theme.id}"><a class="pt-skip" href="#pt-main">Lewati ke konten</a><header class="pt-header"><a class="pt-brand" href="#pt-main">${escapeHtml(theme.name)}</a><nav aria-label="Navigasi utama"><a href="#pt-work">Koleksi</a><a href="#pt-about">Tentang</a><a href="#pt-contact">Kontak</a></nav></header><main id="pt-main">${layouts[theme.composition]}</main><footer class="pt-footer" id="pt-contact"><h2>Mari mulai percakapan.</h2><p>Tambahkan kontak resmi Anda di pengaturan situs.</p><a href="#pt-main">Kembali ke atas</a><small>Pratinjau desain — konten contoh.</small></footer></div>`;
}

function stylesheet(theme) {
  return `:root{color-scheme:light;--pt-ink:${theme.colors.primary};--pt-accent:${theme.colors.accent};--pt-paper:${theme.colors.surface};--pt-line:color-mix(in srgb,var(--pt-ink),transparent 78%)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--pt-paper);color:var(--pt-ink);font-family:${theme.font};line-height:1.6}a{color:inherit;text-underline-offset:5px}a:focus-visible{outline:3px solid var(--pt-ink);outline-offset:5px}.pt-site{max-width:1800px;margin:auto}.pt-skip{position:absolute;top:-100px;left:16px;z-index:10;background:var(--pt-paper);padding:12px}.pt-skip:focus{top:12px}.pt-header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:24px 5%;border-bottom:1px solid var(--pt-line)}.pt-brand{font-size:1.3rem;font-weight:800;text-decoration:none}.pt-header nav{display:flex;gap:24px;flex-wrap:wrap;font:14px Arial,sans-serif}main{padding:0 5%}.pt-intro{padding:90px 0 65px;max-width:1000px}.pt-intro small,.pt-note small,.pt-card small,.pt-section-title{font:11px Arial,sans-serif;letter-spacing:.15em}.pt-intro h1{font-size:clamp(2.5rem,6.5vw,6.7rem);line-height:1.04;letter-spacing:-.045em;margin:24px 0}.pt-intro p{max-width:620px;font-size:1.1rem}.pt-button{display:inline-block;padding:13px 23px;background:var(--pt-ink);color:var(--pt-paper);border-radius:999px;text-decoration:none;margin-top:15px}.pt-card{min-width:0}.pt-art{height:240px;position:relative;overflow:hidden;background:var(--pt-accent);display:grid;place-items:center}.pt-art i{display:block;width:48%;height:65%;background:var(--pt-ink);opacity:.8;transform:rotate(-12deg)}.pt-art b{position:absolute;right:18px;bottom:4px;font:70px Georgia,serif;color:var(--pt-ink)}.pt-art-circle i{border-radius:50%;transform:translateX(-30%)}.pt-art-arch i{border-radius:100px 100px 0 0;transform:translateY(28%)}.pt-art-lines i{background:repeating-linear-gradient(90deg,var(--pt-ink) 0 6px,transparent 6px 18px);width:80%;transform:rotate(25deg)}.pt-art-window i{background:transparent;border:18px solid var(--pt-ink);transform:rotate(10deg)}.pt-card-copy{padding:22px 0 32px}.pt-card h3{font-size:clamp(1.4rem,2.5vw,2.2rem);line-height:1.15;margin:12px 0}.pt-card p{max-width:48ch}.pt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:35px}.pt-note{padding:38px;background:var(--pt-accent);margin:45px 0}.pt-note h2{font-size:2rem;line-height:1.2}.pt-section-title{display:flex;justify-content:space-between;border-top:1px solid var(--pt-line);padding:22px 0}.pt-footer{margin-top:70px;padding:55px 5%;border-top:1px solid var(--pt-line)}.pt-footer small{display:block;margin-top:30px}.pt-reading{display:grid;grid-template-columns:2fr 1fr;gap:55px;align-items:center}.pt-reading .pt-art{height:420px}.pt-panorama{display:grid;grid-template-columns:1fr 1fr;gap:7%;align-items:center;padding:50px 0}.pt-panorama .pt-art{height:570px;border-radius:220px 220px 0 0}.pt-panorama .pt-intro{padding:35px 0}.pt-collage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:35px;align-items:start}.pt-collage .pt-card:nth-child(3n+2){margin-top:95px}.pt-collage .pt-card:nth-child(odd) .pt-art{height:350px}.pt-folio{display:grid;grid-template-columns:1fr 1.5fr;gap:8%}.pt-folio>.pt-intro{position:sticky;top:20px;height:max-content}.pt-folio>div{padding-top:70px}.pt-folio .pt-grid{grid-template-columns:1fr 1fr}.pt-index .pt-card{display:grid;grid-template-columns:180px 1fr;gap:35px;padding:24px 0;border-top:1px solid var(--pt-line)}.pt-index .pt-art{height:180px}.pt-index .pt-card-copy{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0;align-items:center}.pt-index h3{grid-column:1/-1}.pt-panggung>.pt-header{background:var(--pt-ink);color:var(--pt-paper)}.pt-panggung .pt-intro{margin:auto;text-align:center}.pt-panggung .pt-intro p{margin-inline:auto}.pt-panggung main>.pt-feature .pt-art{height:520px}.pt-stage-lower{display:grid;grid-template-columns:1fr 2fr;gap:50px}.pt-stage-lower .pt-note{height:max-content}.pt-stage-lower .pt-grid{grid-template-columns:1fr 1fr}.pt-timeline{max-width:1100px;margin:auto;border-left:1px solid var(--pt-line);padding-left:35px}.pt-timeline .pt-card{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;padding-bottom:55px}.pt-timeline .pt-card:nth-child(even) .pt-art{order:2}.pt-diptych{display:grid;grid-template-columns:1fr 1fr;gap:10%}.pt-diptych>div{position:sticky;top:0;align-self:start}.pt-diptych>section{padding-top:75px}.pt-diptych>section .pt-art{height:400px}.pt-bulletin-top{display:grid;grid-template-columns:2fr 1fr;gap:55px;align-items:center}.pt-bulletin-body{display:grid;grid-template-columns:1.2fr 1fr;gap:45px}.pt-bulletin-body>.pt-feature .pt-art{height:480px}.pt-bulletin-body .pt-grid{grid-template-columns:1fr}.pt-bulletin-body .pt-grid .pt-card{display:grid;grid-template-columns:120px 1fr;gap:22px;border-bottom:1px solid var(--pt-line)}.pt-bulletin-body .pt-grid .pt-art{height:120px}.pt-bulletin-body .pt-grid .pt-card p{display:none}.pt-kapsul .pt-intro{max-width:850px;margin:auto;text-align:center}.pt-kapsul .pt-intro p{margin-inline:auto}.pt-tags{display:flex;justify-content:center;gap:15px;padding-bottom:45px}.pt-tags a{border:1px solid var(--pt-line);padding:10px 23px;border-radius:999px;text-decoration:none}.pt-kapsul .pt-grid{grid-template-columns:1fr 1fr}.pt-kapsul .pt-grid .pt-card{padding:20px;border:1px solid var(--pt-line);border-radius:28px}.pt-kapsul .pt-art{border-radius:18px}.pt-kapsul main>.pt-feature{margin-top:45px}.pt-kapsul main>.pt-feature .pt-card{display:grid;grid-template-columns:1fr 1fr;gap:35px;align-items:center}@media(max-width:1000px){.pt-grid,.pt-collage{grid-template-columns:1fr 1fr}.pt-reading,.pt-panorama,.pt-folio,.pt-stage-lower,.pt-diptych,.pt-bulletin-top,.pt-bulletin-body{grid-template-columns:1fr}.pt-folio>.pt-intro,.pt-diptych>div{position:static}.pt-panorama .pt-art{height:360px}.pt-folio>div,.pt-diptych>section{padding-top:10px}.pt-collage .pt-card:nth-child(3n+2){margin-top:0}}@media(max-width:600px){.pt-header{align-items:flex-start;flex-direction:column}.pt-header nav{gap:18px}.pt-intro{padding:50px 0 35px}.pt-grid,.pt-collage,.pt-folio .pt-grid,.pt-stage-lower .pt-grid,.pt-kapsul .pt-grid{grid-template-columns:1fr}.pt-index .pt-card,.pt-timeline .pt-card,.pt-kapsul main>.pt-feature .pt-card{grid-template-columns:1fr;gap:15px}.pt-index .pt-card-copy{display:block}.pt-timeline{padding-left:18px}.pt-timeline .pt-card:nth-child(even) .pt-art{order:0}.pt-note{padding:25px}.pt-reading .pt-art,.pt-panggung main>.pt-feature .pt-art,.pt-diptych>section .pt-art,.pt-bulletin-body>.pt-feature .pt-art{height:300px}.pt-art{height:240px}.pt-tags{gap:8px;flex-wrap:wrap}.pt-bulletin-body .pt-grid .pt-card{grid-template-columns:90px 1fr;gap:15px}.pt-bulletin-body .pt-grid .pt-art{height:100px}.pt-card h3{overflow-wrap:anywhere}.pt-footer{margin-top:40px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
}

export const PREMIUM_THEMES = Object.freeze(FAMILIES.flatMap(([family, name, category, headline, titles], familyIndex) => COMPOSITIONS.map(([composition, label, primary, accent, surface, font]) => {
  const theme = {
    id: `premium-${family}-${composition}`, name: `${name} ${label}`, family, category, composition, layout: composition,
    premium: true, headline, description: `${headline}. Komposisi ${label.toLowerCase()} dengan konten contoh yang dapat disesuaikan.`,
    colors: Object.freeze({ primary, accent, surface, ink: primary }), font, radius: composition === 'kapsul' ? 28 : 0,
    pricing: PREMIUM_LICENSES, previewOnly: true,
    // This describes the design; it is never evidence of a paid entitlement.
    licenseRequired: true
  };
  theme.code = Object.freeze({ html: markup(theme, titles, familyIndex), css: stylesheet(theme), javascript: '' });
  return Object.freeze(theme);
})));

export const PREMIUM_THEME_COUNT = PREMIUM_THEMES.length;
if (PREMIUM_THEME_COUNT !== 100 || new Set(PREMIUM_THEMES.map(theme => theme.id)).size !== 100) {
  throw new Error('Premium catalog must contain exactly 100 unique theme IDs');
}
export function getPremiumTheme(id) { return PREMIUM_THEMES.find(theme => theme.id === id) || null; }
export function premiumPreviewDocument(id) {
  const theme = getPremiumTheme(id);
  if (!theme) throw new Error('Unknown premium theme');
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(theme.name)} — Pratinjau</title><style>${theme.code.css}</style></head><body>${theme.code.html}</body></html>`;
}
