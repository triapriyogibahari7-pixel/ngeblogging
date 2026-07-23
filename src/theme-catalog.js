const FAMILIES = [
  { id:"editorial",name:"Editorial",category:"Editorial",layout:"editorial",blueprints:["blog","news","diary"],features:["Reading progress","Pull quote","Author rail"],headline:"Cerita panjang dengan ritme editorial.",support:"Esai, opini, wawancara, dan laporan mendalam." },
  { id:"journal",name:"Journal",category:"Kreator",layout:"journal",blueprints:["blog","profile","diary"],features:["Story series","Newsletter","Reading mode"],headline:"Catatan personal yang tenang dan berkarakter.",support:"Arsip harian, seri tulisan, dan surat pembaca." },
  { id:"newsroom",name:"Newsroom",category:"Berita",layout:"newsroom",blueprints:["news","blog"],features:["Breaking ticker","Multi desk","Live update"],headline:"Ruang redaksi cepat untuk berita yang terpercaya.",support:"Breaking news, rubrik, desk, dan pembaruan langsung." },
  { id:"business",name:"Business",category:"Bisnis",layout:"business",blueprints:["website","landing","portfolio"],features:["Service grid","Case studies","Lead capture"],headline:"Website perusahaan dengan jalur konversi yang jelas.",support:"Layanan, bukti kerja, tim, dan kontak bisnis." },
  { id:"launch",name:"Launch",category:"Landing",layout:"landing",blueprints:["landing","website","profile"],features:["Sticky CTA","Social proof","Conversion blocks"],headline:"Satu pesan, satu audiens, satu tindakan.",support:"Kampanye, produk baru, daftar tunggu, dan penawaran." },
  { id:"collective",name:"Collective",category:"Komunitas",layout:"community",blueprints:["community","forum","knowledge"],features:["Member feed","Events","Group spaces"],headline:"Ruang bersama untuk anggota dan kegiatan.",support:"Komunitas, acara, pengumuman, dan ruang kolaborasi." },
  { id:"forum",name:"Forum",category:"Komunitas",layout:"forum",blueprints:["forum","community","knowledge"],features:["Solved topics","Reputation","Moderation"],headline:"Pertanyaan penting, jawaban yang mudah ditemukan.",support:"Topik, balasan, solusi, reputasi, dan moderasi." },
  { id:"canvas",name:"Canvas",category:"Portofolio",layout:"portfolio",blueprints:["portfolio","profile","website"],features:["Project gallery","Case study","Contact flow"],headline:"Karya menjadi pusat perhatian.",support:"Portofolio, studi kasus, layanan, dan proses kreatif." },
  { id:"identity",name:"Identity",category:"Profil",layout:"profile",blueprints:["profile","portfolio","landing"],features:["Link hub","Bio blocks","Instant contact"],headline:"Identitas digital yang ringkas dan kuat.",support:"Bio, tautan, karya pilihan, dan kontak langsung." },
  { id:"diary",name:"Diary",category:"Personal",layout:"diary",blueprints:["diary","blog","profile"],features:["Mood archive","Calendar","Private notes"],headline:"Catatan hidup yang terasa seperti buku pribadi.",support:"Momen, refleksi, perjalanan, dan arsip waktu." },
  { id:"atlas",name:"Atlas",category:"Dokumentasi",layout:"knowledge",blueprints:["knowledge","website","community"],features:["Command search","Version docs","Auto TOC"],headline:"Dokumentasi yang cepat dipelajari dan mudah dicari.",support:"Panduan, referensi, versi, dan pusat bantuan." },
  { id:"magazine",name:"Magazine",category:"Majalah",layout:"magazine",blueprints:["blog","news","website"],features:["Cover story","Issue archive","Editorial grid"],headline:"Majalah digital dengan komposisi berani.",support:"Edisi, rubrik, cover story, dan kurasi visual." },
  { id:"market",name:"Market",category:"Toko",layout:"store",blueprints:["website","landing","portfolio"],features:["Product stories","Offer bar","Trust badges"],headline:"Produk tampil meyakinkan tanpa terasa seperti katalog biasa.",support:"Produk, penawaran, testimoni, dan kepercayaan pembeli." },
  { id:"voyage",name:"Voyage",category:"Perjalanan",layout:"travel",blueprints:["blog","portfolio","diary"],features:["Destination map","Trip notes","Photo journal"],headline:"Perjalanan diceritakan melalui rute dan suasana.",support:"Destinasi, panduan, jurnal foto, dan catatan perjalanan." },
  { id:"table",name:"Table",category:"Kuliner",layout:"food",blueprints:["blog","website","portfolio"],features:["Recipe cards","Menu blocks","Reservation CTA"],headline:"Resep dan pengalaman kuliner yang menggugah.",support:"Resep, menu, restoran, bahan, dan reservasi." },
  { id:"academy",name:"Academy",category:"Edukasi",layout:"education",blueprints:["knowledge","website","community"],features:["Course tracks","Progress cards","Resource library"],headline:"Belajar melalui jalur yang jelas dan terstruktur.",support:"Kursus, modul, materi, mentor, dan sumber belajar." },
  { id:"wellness",name:"Wellness",category:"Kesehatan",layout:"health",blueprints:["website","blog","community"],features:["Expert cards","Program timeline","Appointment CTA"],headline:"Informasi kesehatan dengan ketenangan dan kejelasan.",support:"Program, tenaga ahli, artikel, dan jadwal konsultasi." },
  { id:"circuit",name:"Circuit",category:"Teknologi",layout:"tech",blueprints:["website","blog","landing"],features:["Changelog","Feature matrix","Developer CTA"],headline:"Produk teknologi dengan energi dan presisi.",support:"Fitur, changelog, dokumentasi, integrasi, dan developer." },
  { id:"lens",name:"Lens",category:"Fotografi",layout:"photography",blueprints:["portfolio","profile","blog"],features:["Masonry gallery","Lightbox","EXIF notes"],headline:"Foto berbicara sebelum teks.",support:"Galeri, proyek, cerita visual, dan layanan fotografi." },
  { id:"studio",name:"Studio",category:"Podcast",layout:"podcast",blueprints:["blog","community","profile"],features:["Episode player","Guest cards","Subscribe links"],headline:"Suara, episode, dan percakapan dalam satu panggung.",support:"Episode, tamu, catatan acara, dan kanal berlangganan." },
];

const COMPOSITIONS = [
  { id:"prime",label:"Prime",badge:"Signature",hue:218,saturation:64,light:38,accentHue:38,surface:97,radius:12,font:"DM Sans",shell:"split" },
  { id:"dawn",label:"Dawn",badge:"Bright",hue:18,saturation:72,light:42,accentHue:164,surface:98,radius:24,font:"Playfair Display",shell:"stack" },
  { id:"night",label:"Night",badge:"Dark",hue:252,saturation:48,light:24,accentHue:86,surface:11,radius:16,font:"DM Sans",dark:true,shell:"rail" },
  { id:"coast",label:"Coast",badge:"Fresh",hue:188,saturation:66,light:32,accentHue:24,surface:97,radius:30,font:"DM Sans",shell:"cards" },
  { id:"atelier",label:"Atelier",badge:"Artisan",hue:338,saturation:45,light:36,accentHue:46,surface:96,radius:4,font:"Playfair Display",shell:"poster" },
];

const clampHue=(value)=>((value%360)+360)%360;
const hsl=(h,s,l)=>`hsl(${clampHue(h)} ${s}% ${l}%)`;

function postCards(theme,count=6){
  return `<div class="ng-cards" id="posts">${Array.from({length:count},(_,index)=>`<article data-card="${index+1}"><small>${index===0?"FEATURED":"STORY"}</small><h3>${theme.headline}</h3><p>${theme.support}</p><a href="#">Baca cerita</a></article>`).join("")}</div>`;
}

function familySection(theme){
  const cards=postCards(theme,theme.layout==="newsroom"?8:theme.layout==="photography"?9:6);
  const sections={
    editorial:`<section class="ng-section ng-editorial"><header><small>EDISI TERBARU</small><h2>${theme.headline}</h2></header><div class="ng-editorial-grid"><aside><b>Daftar isi</b><ol><li>Opini</li><li>Wawancara</li><li>Laporan</li></ol></aside>${cards}</div></section>`,
    journal:`<section class="ng-section ng-journal"><time datetime="2026-07-24">24 JULI 2026</time><blockquote>${theme.headline}</blockquote>${cards}</section>`,
    newsroom:`<section class="ng-section ng-newsroom"><div class="ng-desk"><b>TERKINI</b><span>Nasional</span><span>Teknologi</span><span>Bisnis</span></div>${cards}</section>`,
    business:`<section class="ng-section ng-business"><header><small>SOLUSI</small><h2>${theme.headline}</h2></header><div class="ng-service-row"><article><b>Strategi</b><p>Rencana yang terukur.</p></article><article><b>Eksekusi</b><p>Operasi yang presisi.</p></article><article><b>Pertumbuhan</b><p>Hasil yang berkelanjutan.</p></article></div>${cards}</section>`,
    landing:`<section class="ng-section ng-landing"><div class="ng-proof"><b>Dipercaya kreator dan tim modern</b><span>Tanpa watermark</span><span>SEO tenant</span><span>Edge delivery</span></div>${cards}<a class="ng-big-cta" href="#contact">Mulai sekarang</a></section>`,
    community:`<section class="ng-section ng-community"><header><h2>${theme.headline}</h2><button type="button">Gabung komunitas</button></header><div class="ng-community-stats"><b>120 ruang</b><b>48 acara</b><b>2.400 anggota</b></div>${cards}</section>`,
    forum:`<section class="ng-section ng-forum"><header><h2>${theme.headline}</h2><label><span>Cari topik</span><input placeholder="Ketik pertanyaan"/></label></header>${cards}</section>`,
    portfolio:`<section class="ng-section ng-portfolio"><header><small>SELECTED WORK</small><h2>${theme.headline}</h2></header>${cards}</section>`,
    profile:`<section class="ng-section ng-profile"><div class="ng-profile-card"><span>NB</span><h2>${theme.headline}</h2><p>${theme.support}</p><nav><a href="#posts">Karya</a><a href="#contact">Kontak</a></nav></div>${cards}</section>`,
    diary:`<section class="ng-section ng-diary"><header><small>CATATAN HARI INI</small><h2>${theme.headline}</h2></header><div class="ng-timeline"><i/><i/><i/><i/></div>${cards}</section>`,
    knowledge:`<section class="ng-section ng-knowledge"><aside><b>Dokumentasi</b><a href="#posts">Memulai</a><a href="#posts">Panduan</a><a href="#posts">Referensi</a></aside><div><header><small>KNOWLEDGE BASE</small><h2>${theme.headline}</h2></header>${cards}</div></section>`,
    magazine:`<section class="ng-section ng-magazine"><div class="ng-issue"><small>ISSUE 07</small><b>${theme.name}</b><span>Culture · Ideas · Future</span></div>${cards}</section>`,
    store:`<section class="ng-section ng-store"><header><small>NEW COLLECTION</small><h2>${theme.headline}</h2></header><div class="ng-offer">Gratis pengiriman untuk pesanan pertama</div>${cards}</section>`,
    travel:`<section class="ng-section ng-travel"><header><small>ROUTE 01</small><h2>${theme.headline}</h2></header><div class="ng-route"><span>Jakarta</span><i/><span>Yogyakarta</span><i/><span>Bali</span></div>${cards}</section>`,
    food:`<section class="ng-section ng-food"><header><small>TODAY'S TABLE</small><h2>${theme.headline}</h2></header><div class="ng-menu"><span>Starter</span><span>Main</span><span>Dessert</span></div>${cards}</section>`,
    education:`<section class="ng-section ng-education"><header><small>LEARNING PATH</small><h2>${theme.headline}</h2></header><ol class="ng-steps"><li>Dasar</li><li>Praktik</li><li>Proyek</li><li>Sertifikat</li></ol>${cards}</section>`,
    health:`<section class="ng-section ng-health"><header><small>PROGRAM TERPILIH</small><h2>${theme.headline}</h2></header><div class="ng-experts"><span>Dokter</span><span>Ahli gizi</span><span>Pelatih</span></div>${cards}</section>`,
    tech:`<section class="ng-section ng-tech"><header><code>release.latest()</code><h2>${theme.headline}</h2></header><div class="ng-terminal"><span>$ ngeblogging deploy</span><b>✓ production ready</b></div>${cards}</section>`,
    photography:`<section class="ng-section ng-photography"><header><small>VISUAL STORIES</small><h2>${theme.headline}</h2></header>${cards}</section>`,
    podcast:`<section class="ng-section ng-podcast"><header><small>NOW PLAYING</small><h2>${theme.headline}</h2></header><div class="ng-player"><button type="button">▶</button><span>Episode terbaru</span><time>42:18</time></div>${cards}</section>`,
  };
  return sections[theme.layout]||`<section class="ng-section"><h2>${theme.headline}</h2>${cards}</section>`;
}

function header(theme,kind){
  if(kind==="rail")return `<header class="ng-header ng-header-rail"><a class="ng-brand" href="#">${theme.name}<i>.</i></a><button aria-label="Buka menu">Menu</button><nav><a href="#top">Home</a><a href="#posts">Stories</a><a href="#about">About</a><a href="#contact">Contact</a></nav></header>`;
  if(kind==="poster")return `<header class="ng-header ng-header-poster"><a class="ng-brand" href="#">${theme.name}<i>.</i></a><nav><a href="#posts">Work</a><a href="#about">Studio</a><a href="#contact">Contact</a></nav><button aria-label="Buka menu">Menu</button><span>${theme.category}</span></header>`;
  return `<header class="ng-header"><a class="ng-brand" href="#">${theme.name}<i>.</i></a><nav><a href="#posts">Stories</a><a href="#about">About</a><a href="#contact">Contact</a></nav><button aria-label="Buka menu">Menu</button></header>`;
}

function hero(theme,composition){
  const intro=`<div class="ng-hero-copy"><span>${theme.category.toUpperCase()} · NGEBLOGGING ORIGINAL</span><h1>${theme.name}: ${theme.headline}</h1><p>${theme.description}</p><a href="#posts">Jelajahi situs</a></div>`;
  const facts=`<aside><b>${composition.badge}</b><span>${theme.features[0]}</span><span>${theme.features[1]}</span><span>${theme.features[2]}</span></aside>`;
  if(composition.shell==="stack")return `<section class="ng-hero ng-hero-stack" id="top">${intro}<div class="ng-hero-marquee"><span>${theme.name}</span><span>${theme.category}</span><span>${composition.label}</span></div>${facts}</section>`;
  if(composition.shell==="rail")return `<section class="ng-hero ng-hero-rail" id="top"><div class="ng-hero-index"><b>01</b><span>${theme.category}</span></div>${intro}${facts}</section>`;
  if(composition.shell==="cards")return `<section class="ng-hero ng-hero-cards" id="top">${intro}<div class="ng-hero-panels"><article><b>100%</b><span>Responsive</span></article><article><b>Edge</b><span>SEO tenant</span></article></div>${facts}</section>`;
  if(composition.shell==="poster")return `<section class="ng-hero ng-hero-poster" id="top"><div class="ng-poster-number">${String(theme.familyIndex+1).padStart(2,"0")}</div>${intro}${facts}</section>`;
  return `<section class="ng-hero ng-hero-split" id="top">${intro}${facts}</section>`;
}

function layoutMarkup(theme,composition){
  const main=familySection(theme);
  if(composition.shell==="stack")return `${header(theme,"stack")}<main>${hero(theme,composition)}<section class="ng-intro" id="about"><b>${theme.support}</b><p>${theme.description}</p></section>${main}</main><footer id="contact"><b>${theme.name}</b><span>Built with Ngeblogging</span></footer>`;
  if(composition.shell==="rail")return `<div class="ng-site-rail">${header(theme,"rail")}<div class="ng-site-body"><main>${hero(theme,composition)}${main}<section class="ng-intro" id="about"><b>${theme.features.join(" · ")}</b></section></main><footer id="contact"><b>${theme.name}</b><span>${theme.category}</span></footer></div></div>`;
  if(composition.shell==="cards")return `${header(theme,"cards")}<main>${hero(theme,composition)}${main}<section class="ng-intro ng-intro-grid" id="about"><article><b>Desain</b><p>Komposisi khusus ${theme.category.toLowerCase()}.</p></article><article><b>Konten</b><p>${theme.support}</p></article><article><b>Performa</b><p>Responsif, aksesibel, dan SEO-ready.</p></article></section></main><footer id="contact"><b>${theme.name}</b><a href="#top">Kembali ke atas</a></footer>`;
  if(composition.shell==="poster")return `${header(theme,"poster")}<main>${hero(theme,composition)}<div class="ng-poster-band">${theme.headline}</div>${main}<section class="ng-intro" id="about"><small>MANIFESTO</small><b>${theme.support}</b></section></main><footer id="contact"><b>${theme.name}</b><span>© Ngeblogging</span></footer>`;
  return `${header(theme,"split")}<main>${hero(theme,composition)}${main}<section class="ng-intro" id="about"><small>TENTANG</small><b>${theme.support}</b><p>${theme.description}</p></section></main><footer id="contact"><b>${theme.name}</b><span>Powered by Ngeblogging</span></footer>`;
}

function familyCss(layout){
  const rules={
    editorial:`.ng-editorial-grid{display:grid;grid-template-columns:220px 1fr;gap:36px}.ng-editorial-grid>aside{position:sticky;top:100px;height:max-content}.ng-editorial .ng-cards article:first-child{grid-column:span 2}`,
    journal:`.ng-journal{max-width:980px;margin:auto}.ng-journal>time{writing-mode:vertical-rl;float:left;margin-right:24px}.ng-journal blockquote{font:700 clamp(2rem,6vw,5rem) Georgia,serif;margin:0 0 50px}`,
    newsroom:`.ng-newsroom .ng-desk{display:flex;gap:18px;overflow:auto;border-block:1px solid var(--line);padding:14px 0}.ng-newsroom .ng-cards{grid-template-columns:2fr 1fr 1fr}.ng-newsroom .ng-cards article:first-child{grid-row:span 2}`,
    business:`.ng-business .ng-service-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:30px}.ng-service-row article{padding:24px;background:var(--primary);color:white;border-radius:var(--radius)}`,
    landing:`.ng-landing{text-align:center}.ng-proof{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-bottom:30px}.ng-big-cta{display:inline-flex;margin-top:30px;padding:18px 28px;border-radius:999px;background:var(--accent);color:var(--ink);font-weight:900;text-decoration:none}`,
    community:`.ng-community>header{display:flex;justify-content:space-between;gap:20px;align-items:end}.ng-community-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:28px 0}.ng-community-stats b{padding:22px;border-radius:var(--radius);background:color-mix(in srgb,var(--primary),white 88%)}`,
    forum:`.ng-forum>header{display:grid;grid-template-columns:1fr minmax(240px,.5fr);gap:30px}.ng-forum label{display:grid;gap:8px}.ng-forum input{padding:14px;border:1px solid var(--line);border-radius:12px;background:transparent;color:inherit}.ng-forum .ng-cards{display:block}.ng-forum .ng-cards article{display:grid;grid-template-columns:100px 1fr auto;gap:20px;margin-bottom:10px}`,
    portfolio:`.ng-portfolio .ng-cards{grid-template-columns:2fr 1fr}.ng-portfolio .ng-cards article:first-child{grid-row:span 2;min-height:430px}.ng-portfolio article{display:flex;flex-direction:column;justify-content:end}`,
    profile:`.ng-profile-card{max-width:720px;margin:0 auto 40px;text-align:center}.ng-profile-card>span{width:100px;height:100px;display:grid;place-items:center;margin:auto;border-radius:50%;background:var(--primary);color:white;font-size:2rem;font-weight:900}.ng-profile-card nav{display:flex;justify-content:center;gap:12px}.ng-profile .ng-cards{max-width:820px;margin:auto}`,
    diary:`.ng-diary{max-width:900px;margin:auto;background:color-mix(in srgb,var(--surface),white 18%);box-shadow:0 40px 100px #0001}.ng-timeline{display:flex;gap:12px;margin:30px 0}.ng-timeline i{width:12px;height:12px;border-radius:50%;background:var(--accent)}`,
    knowledge:`.ng-knowledge{display:grid;grid-template-columns:240px 1fr;gap:36px}.ng-knowledge>aside{display:flex;flex-direction:column;gap:12px;position:sticky;top:100px;height:max-content;border-right:1px solid var(--line)}.ng-knowledge>aside a{color:inherit;text-decoration:none}`,
    magazine:`.ng-issue{display:grid;place-items:center;min-height:320px;margin-bottom:30px;background:var(--ink);color:var(--surface);transform:rotate(-1deg)}.ng-issue b{font:900 clamp(3rem,10vw,8rem) Georgia,serif}.ng-magazine .ng-cards article:nth-child(even){transform:translateY(28px)}`,
    store:`.ng-offer{margin:20px 0;padding:14px;text-align:center;background:var(--accent);font-weight:900}.ng-store .ng-cards article{min-height:300px;background:linear-gradient(180deg,transparent 50%,color-mix(in srgb,var(--accent),transparent 72%))}`,
    travel:`.ng-route{display:flex;align-items:center;gap:12px;margin:28px 0}.ng-route i{height:1px;flex:1;background:var(--line)}.ng-travel{background-image:radial-gradient(var(--accent) 1px,transparent 1px);background-size:28px 28px}`,
    food:`.ng-menu{display:flex;gap:12px;margin:24px 0}.ng-menu span{padding:10px 16px;border:1px solid var(--line);border-radius:999px}.ng-food .ng-cards article{border-top:5px double var(--primary)}`,
    education:`.ng-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;counter-reset:step;padding:0;margin:28px 0}.ng-steps li{list-style:none;padding:20px;border:1px solid var(--line);counter-increment:step}.ng-steps li:before{content:'0' counter(step);display:block;color:var(--accent);font-size:1.8rem;font-weight:900}`,
    health:`.ng-health{border-radius:calc(var(--radius)*2);background:color-mix(in srgb,var(--primary),white 92%)}.ng-experts{display:flex;gap:10px;margin:24px 0}.ng-experts span{padding:10px 14px;border-radius:999px;background:white}`,
    tech:`.ng-tech{background:linear-gradient(180deg,color-mix(in srgb,var(--primary),black 65%),var(--ink));color:white}.ng-terminal{display:grid;gap:8px;margin:25px 0;padding:24px;background:#0008;border:1px solid #fff2;font-family:monospace}.ng-tech .ng-cards article{background:#fff1;border-color:#fff2}`,
    photography:`.ng-photography .ng-cards{grid-template-columns:1.5fr 1fr 1fr}.ng-photography article{min-height:330px;color:white;background:linear-gradient(145deg,var(--primary),var(--accent))}.ng-photography article:nth-child(3n){transform:translateY(34px)}`,
    podcast:`.ng-player{display:grid;grid-template-columns:60px 1fr auto;align-items:center;gap:16px;margin:24px 0;padding:18px;border-radius:999px;background:var(--ink);color:var(--surface)}.ng-player button{width:50px;height:50px;border:0;border-radius:50%;background:var(--accent)}.ng-podcast .ng-cards article{padding-left:70px;position:relative}`,
  };
  return rules[layout]||"";
}

function shellCss(shell){
  const rules={
    split:`.ng-hero-split{grid-template-columns:minmax(0,1.3fr) minmax(260px,.7fr)}`,
    stack:`.ng-hero-stack{display:block;text-align:center}.ng-hero-stack .ng-hero-copy{margin:auto}.ng-hero-stack aside{max-width:820px;margin:35px auto 0;grid-template-columns:repeat(4,1fr)}.ng-hero-marquee{display:flex;justify-content:center;gap:30px;overflow:hidden;margin:30px 0;font-size:clamp(1.5rem,4vw,3rem);font-weight:900}`,
    rail:`.ng-site-rail{display:grid;grid-template-columns:96px 1fr}.ng-header-rail{position:sticky;top:0;height:100vh;padding:18px 12px;display:flex;flex-direction:column}.ng-header-rail .ng-brand{writing-mode:vertical-rl}.ng-header-rail nav{margin-top:auto;display:flex;flex-direction:column}.ng-hero-rail{grid-template-columns:110px minmax(0,1fr) minmax(240px,.5fr)}.ng-hero-index b{font-size:4rem}`,
    cards:`.ng-hero-cards{grid-template-columns:minmax(0,1fr) minmax(260px,.55fr)}.ng-hero-panels{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ng-hero-panels article{display:grid;gap:5px;padding:24px;border-radius:var(--radius);background:var(--primary);color:white}.ng-hero-cards aside{grid-column:1/-1;grid-template-columns:repeat(4,1fr)}`,
    poster:`.ng-header-poster>span{font-size:.72rem;letter-spacing:.16em}.ng-hero-poster{position:relative;grid-template-columns:minmax(0,1fr) minmax(240px,.45fr);overflow:hidden}.ng-poster-number{position:absolute;right:2vw;bottom:-.28em;font-size:clamp(12rem,34vw,34rem);line-height:.8;font-weight:900;opacity:.05}.ng-poster-band{padding:18px;overflow:hidden;background:var(--accent);font-size:clamp(1.6rem,5vw,4rem);font-weight:900;white-space:nowrap}`,
  };
  return rules[shell]||"";
}

function buildThemeCode(theme,composition){
  const html=`<div class="ng-theme ng-${theme.layout} ng-shell-${composition.shell}" data-theme="${theme.id}">${layoutMarkup(theme,composition)}</div>`;
  const css=`:root{--primary:${theme.colors.primary};--accent:${theme.colors.accent};--surface:${theme.colors.surface};--ink:${theme.colors.ink};--line:color-mix(in srgb,var(--ink),transparent 82%);--radius:${theme.radius}px}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--surface);color:var(--ink);font-family:${theme.font==="Playfair Display"?"Georgia,serif":"Arial,sans-serif"};line-height:1.6}.ng-theme{min-height:100vh;overflow:hidden}.ng-header{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:22px;padding:0 clamp(18px,5vw,72px);border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--surface),transparent 7%);position:sticky;top:0;z-index:20;backdrop-filter:blur(18px)}.ng-brand{font-size:1.25rem;font-weight:900;color:inherit;text-decoration:none}.ng-brand i{color:var(--accent)}.ng-header nav{display:flex;gap:22px}.ng-header nav a{color:inherit;text-decoration:none;font-size:.86rem}.ng-header button{display:none;border:0;border-radius:999px;padding:11px 15px;background:var(--primary);color:white}.ng-hero{min-height:650px;display:grid;align-items:center;gap:6vw;padding:clamp(70px,10vw,140px) clamp(18px,7vw,110px)}.ng-hero-copy{position:relative;z-index:1;max-width:900px}.ng-hero-copy>span,.ng-section small,.ng-intro small{font-size:.72rem;font-weight:900;letter-spacing:.16em}.ng-hero h1{font-size:clamp(3rem,8vw,7rem);line-height:.94;letter-spacing:-.06em;margin:.22em 0}.ng-hero p{max-width:680px;font-size:clamp(1rem,2vw,1.25rem);opacity:.76}.ng-hero-copy>a{display:inline-flex;margin-top:20px;padding:14px 20px;border-radius:999px;background:var(--accent);color:var(--ink);font-weight:900;text-decoration:none}.ng-hero aside{display:grid;gap:10px;padding:26px;border:1px solid var(--line);border-radius:var(--radius)}.ng-section{padding:clamp(58px,8vw,110px) clamp(18px,7vw,110px)}.ng-section>header h2,.ng-section>h2{font-size:clamp(2rem,5vw,4.6rem);line-height:1.02;letter-spacing:-.04em}.ng-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.ng-cards article{min-width:0;padding:clamp(22px,3vw,38px);border:1px solid var(--line);border-radius:var(--radius);background:color-mix(in srgb,var(--surface),white 10%);box-shadow:0 22px 60px #0000000b}.ng-cards h3{font-size:clamp(1.25rem,2vw,2rem);line-height:1.14}.ng-cards p{opacity:.72}.ng-cards a{color:inherit;font-weight:800}.ng-intro{display:grid;grid-template-columns:.45fr 1fr 1fr;gap:30px;padding:clamp(50px,7vw,90px) clamp(18px,7vw,110px);border-top:1px solid var(--line)}.ng-intro-grid{grid-template-columns:repeat(3,1fr)}.ng-intro-grid article{padding:24px;border:1px solid var(--line);border-radius:var(--radius)}footer{display:flex;justify-content:space-between;gap:20px;padding:34px clamp(18px,7vw,110px);border-top:1px solid var(--line)}${familyCss(theme.layout)}${shellCss(composition.shell)}@media(max-width:1024px){.ng-hero,.ng-hero-split,.ng-hero-rail,.ng-hero-cards,.ng-hero-poster{min-height:auto;grid-template-columns:1fr}.ng-cards,.ng-newsroom .ng-cards,.ng-photography .ng-cards,.ng-portfolio .ng-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.ng-editorial-grid,.ng-knowledge,.ng-forum>header{grid-template-columns:1fr}.ng-site-rail{grid-template-columns:1fr}.ng-header-rail{height:auto;flex-direction:row;padding:0 clamp(18px,5vw,72px)}.ng-header-rail .ng-brand{writing-mode:initial}.ng-header-rail nav{margin:0 0 0 auto;flex-direction:row}.ng-intro{grid-template-columns:1fr 1fr}.ng-business .ng-service-row,.ng-community-stats,.ng-steps{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.ng-header{min-height:64px;padding:0 16px}.ng-header nav{display:none}.ng-header nav.open{position:fixed;top:70px;left:12px;right:12px;display:flex;flex-direction:column;gap:0;padding:10px;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:0 22px 70px #0003}.ng-header nav.open a{padding:13px}.ng-header button{display:block}.ng-header-poster>span{display:none}.ng-hero{padding:64px 16px}.ng-hero h1{font-size:clamp(2.6rem,14vw,4.8rem);overflow-wrap:anywhere}.ng-hero aside,.ng-hero-stack aside,.ng-hero-cards aside{grid-template-columns:1fr}.ng-hero-panels{grid-template-columns:1fr 1fr}.ng-section{padding:50px 16px}.ng-cards,.ng-newsroom .ng-cards,.ng-photography .ng-cards,.ng-portfolio .ng-cards{grid-template-columns:1fr}.ng-editorial .ng-cards article:first-child{grid-column:auto}.ng-forum .ng-cards article{grid-template-columns:1fr}.ng-community>header{display:grid}.ng-business .ng-service-row,.ng-community-stats,.ng-steps{grid-template-columns:1fr}.ng-knowledge>aside,.ng-editorial-grid>aside{position:static;border:0}.ng-intro,.ng-intro-grid{grid-template-columns:1fr;padding:42px 16px}.ng-poster-number{font-size:12rem}.ng-photography article:nth-child(3n),.ng-magazine .ng-cards article:nth-child(even){transform:none}footer{padding:28px 16px;flex-direction:column}}`;
  const javascript=`(()=>{const root=document.querySelector('[data-theme="${theme.id}"]');const button=root?.querySelector('.ng-header button');const nav=root?.querySelector('.ng-header nav');button?.addEventListener('click',()=>{const open=nav?.classList.toggle('open');button.setAttribute('aria-expanded',String(Boolean(open)));button.textContent=open?'Tutup':'Menu'});root?.querySelectorAll('.ng-cards article').forEach((card)=>{card.addEventListener('focusin',()=>card.classList.add('focused'));card.addEventListener('focusout',()=>card.classList.remove('focused'))})})();`;
  return {enabled:false,html,css,javascript};
}

export const BUILT_IN_THEMES=FAMILIES.flatMap((family,familyIndex)=>COMPOSITIONS.map((composition,compositionIndex)=>{
  const hue=clampHue(composition.hue+familyIndex*17+compositionIndex*7);
  const accentHue=clampHue(composition.accentHue+familyIndex*23);
  const dark=Boolean(composition.dark);
  const theme={
    ...family,
    familyIndex,
    id:`${family.id}-${composition.id}`,
    name:`${family.name} ${composition.label}`,
    badge:composition.badge,
    description:`${family.name} ${composition.label} memakai struktur HTML ${composition.shell} khusus untuk ${family.category.toLowerCase()}, bukan sekadar perubahan warna.`,
    colors:{primary:hsl(hue,composition.saturation,composition.light),accent:hsl(accentHue,78,dark?58:48),surface:hsl(hue+8,dark?22:34,composition.surface),ink:dark?hsl(hue+4,18,92):hsl(hue+4,34,14)},
    font:composition.font,
    radius:composition.radius,
    composition:composition.id,
    defaultWidgetIds:["search","recent-posts",familyIndex%2?"tags":"popular-posts",familyIndex%3?"categories":"tags"],
  };
  theme.code=buildThemeCode(theme,composition);
  return theme;
}));

export function themeCodeFor(theme){return theme?.code||BUILT_IN_THEMES[0].code;}
export const THEME_COUNT=BUILT_IN_THEMES.length;
