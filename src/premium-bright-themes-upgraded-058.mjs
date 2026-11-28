// Pembaruan Ultra untuk tema 058 (Kreator Langit 3), di atas hasil upgrade 051-057. ID tetap; tema lain tidak berubah.
// CSS, SVG sebaris, dan JavaScript sebaris (tanpa pustaka, tanpa jaringan). Tanpa aset eksternal.
// Tanpa JavaScript seluruh konten tetap terlihat; animasi mati saat reduced-motion.
import { PREMIUM_BRIGHT_GENERATED as PREVIOUS } from './premium-bright-themes-upgraded-057.mjs';

const skip = '<a class="skip" href="#content">Lewati ke konten</a>';
const base = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0}a{color:inherit;text-underline-offset:4px}a:focus-visible,summary:focus-visible,button:focus-visible,.su-it:focus-visible{outline:3px solid currentColor;outline-offset:4px}h1,h2,h3,p,figure,ol,ul,dl,dd{margin-top:0}main,section,article,aside,div,li{min-width:0}.skip{position:absolute;top:-100px;left:12px;z-index:10;padding:12px;background:#ffffff;color:#000000}.skip:focus{top:12px}summary{cursor:pointer}nav{display:flex;gap:20px;flex-wrap:wrap}nav a{text-decoration:none}h1,h2,h3,p,a,dt,dd,li,label,summary{overflow-wrap:anywhere}svg{max-width:100%}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}}`;

const cp = 'M40 70a26 26 0 0 1 4-52 34 34 0 0 1 64-8 28 28 0 0 1 48 22 22 22 0 0 1 2 38z';
const cloud = `<svg viewBox="0 0 200 80" aria-hidden="true"><path d="${cp}"/></svg>`;
const plane = '<svg viewBox="0 0 120 60" aria-hidden="true"><path d="M4 30L116 4 80 56 62 36z" fill="#ffffff" stroke="#0b2545" stroke-width="3" stroke-linejoin="round"/><path d="M62 36L116 4" stroke="#0b2545" stroke-width="3" fill="none"/></svg>';
const scene = (bg, sun, hill, shade, mist) => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="300" fill="${bg}"/><circle cx="296" cy="74" r="38" fill="${sun}"/><ellipse cx="96" cy="78" rx="56" ry="19" fill="${mist}"/><ellipse cx="136" cy="64" rx="36" ry="22" fill="${mist}"/><path d="M0 300V206L92 132 164 212 252 118 338 204 400 164V300z" fill="${hill}"/><path d="M0 300V246L120 196 220 250 320 208 400 240V300z" fill="${shade}"/></svg>`;
const work = (cls, label, title, svg) => `<article class="su-it ${cls}" tabindex="0">${svg}<div class="cap"><small>${label}</small><h3>${title}</h3><p>Ringkasan contoh. Ganti dengan cerita di balik karya Anda.</p></div></article>`;
const step = (n, title, text) => `<li class="su-rv"><b>${n}</b><div><h3>${title}</h3><p>${text}</p></div></li>`;
const skill = (name, v) => `<li class="su-rv"><span class="nm">${name}</span><em>${v}%</em><span class="bar" role="img" aria-label="Tingkat kemahiran ${v} persen (contoh)"><i style="--v:${v}%"></i></span></li>`;
const collab = (title, text, cta) => `<article class="su-co su-rv"><div>${cloud}<h3>${title}</h3><p>${text}</p><a href="#kontak">${cta}</a></div></article>`;

const design = { id: 'signature-058-kreator-3', name: 'Kreator Langit Ultra', category: 'Kreator', composition: 'ultra-langit-dusk-bento-timeline', html: `${skip}<div class="su-progress" aria-hidden="true"><i></i></div><header class="su-head"><a href="#content">${cloud.replace('<svg ', '<svg width="46" height="18" ')}Langit<b>ULTRA</b></a><nav aria-label="Navigasi situs"><a href="#karya">Karya</a><a href="#tentang">Tentang</a><a href="#keahlian">Keahlian</a><a href="#kolaborasi">Kolaborasi</a><a href="#tanya">Tanya</a></nav><a class="su-cta" href="#kontak">Ajak berkarya</a></header><main id="content"><section class="su-hero"><div class="su-sky" aria-hidden="true"><i class="su-stars"></i><i class="su-sun"></i><span class="su-cloud c1">${cloud}</span><span class="su-cloud c2">${cloud}</span><span class="su-cloud c3">${cloud}</span><span class="su-cloud c4">${cloud}</span><span class="su-plane">${plane}</span><svg class="su-wave" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0 120V70C120 30 220 30 340 66S560 110 700 70 940 20 1060 54 1160 80 1200 70V120z"/></svg></div><div class="su-copy"><small>PORTOFOLIO KREATOR / PROFIL CONTOH</small><h1><span class="su-ln"><span>Melukis langit,</span></span><span class="su-ln"><span>dengan ide yang <span class="su-rot" data-words="jernih|luas|berani"><em>jernih</em></span>.</span></span></h1><p>Beranda portofolio kreator: langit yang bergeser mengikuti kursor, pesawat kertas yang terbang, tombol mode senja, galeri karya bergaya bento, dan keahlian yang terisi saat digulir. Semua teks di sini adalah contoh.</p><div class="su-actions"><a class="su-btn" href="#karya">Lihat karya</a><a class="su-ghost" href="#kolaborasi">Ajak kolaborasi</a><button type="button" class="su-mode" aria-pressed="false">Mode senja</button></div></div></section><div class="su-band" aria-hidden="true"><div><span>LANGIT LUAS</span><span>IDE JERNIH</span><span>KARYA JUJUR</span><span>RASA BERANI</span><span>LANGIT LUAS</span><span>IDE JERNIH</span><span>KARYA JUJUR</span><span>RASA BERANI</span></div></div><section class="su-works" id="karya"><h2 class="su-rv">Karya pilihan</h2><p class="su-lead su-rv">Arahkan kursor atau fokuskan satu karya untuk membaca ringkasannya. Semua karya di bawah ini contoh.</p><div class="su-bento su-rv">${work('a', 'ILUSTRASI', 'Seri Langit Pagi', scene('#bae6fd', '#fde047', '#0369a1', '#075985', '#ffffff'))}${work('b', 'FOTO', 'Jam Biru', scene('#1e3a8a', '#e0f2fe', '#0f172a', '#1e293b', '#93c5fd'))}${work('c', 'ANIMASI', 'Awan Berjalan', scene('#e0f2fe', '#fb7185', '#0ea5e9', '#0369a1', '#ffffff'))}${work('d', 'TULISAN VISUAL', 'Catatan dari Atap', scene('#fed7aa', '#fffbeb', '#c2410c', '#7c2d12', '#ffedd5'))}${work('e', 'POSTER', 'Layang-layang Senja', scene('#c7d2fe', '#fde68a', '#4338ca', '#312e81', '#e0e7ff'))}</div></section><section class="su-about" id="tentang"><div class="su-me su-rv"><svg viewBox="0 0 200 200" aria-hidden="true"><rect width="200" height="200" rx="28" fill="#bae6fd"/><path d="${cp}" transform="translate(8 10) scale(.9)" fill="#ffffff"/><circle cx="100" cy="92" r="32" fill="#0b2545"/><path d="M36 200C40 142 70 128 100 128S160 142 164 200z" fill="#0b2545"/></svg><h2>Tentang kreator</h2><p>Nama Kreator (contoh). Tuliskan perkenalan singkat tentang diri, gaya berkarya, dan hal yang membuat karya Anda berbeda.</p><ul><li><b data-count="120" data-suffix="+">120+</b><span>Karya</span></li><li><b data-count="40" data-suffix="">40</b><span>Kolaborasi</span></li><li><b data-count="8" data-suffix=" thn">8 thn</b><span>Berkarya</span></li></ul><small>Angka di atas hanya contoh.</small></div><ol class="su-tl su-rv">${step('01', 'Mulai dari rasa ingin tahu', 'Ceritakan awal Anda berkarya. Teks ini contoh.')}${step('02', 'Menemukan gaya sendiri', 'Ceritakan bagaimana gaya Anda terbentuk. Teks ini contoh.')}${step('03', 'Berkolaborasi', 'Ceritakan proyek bersama orang lain yang paling berkesan. Teks ini contoh.')}${step('04', 'Berbagi ilmu', 'Ceritakan kelas, tulisan, atau pendampingan yang Anda lakukan. Teks ini contoh.')}</ol></section><section class="su-skills" id="keahlian"><h2 class="su-rv">Keahlian</h2><p class="su-lead su-rv">Bar terisi saat bagian ini terlihat. Nilainya contoh.</p><ul>${skill('Ilustrasi', 94)}${skill('Fotografi', 86)}${skill('Gerak dan animasi', 78)}${skill('Penulisan naskah', 70)}</ul></section><section class="su-collab" id="kolaborasi"><h2 class="su-rv">Cara berkolaborasi</h2><div class="su-cgrid">${collab('Pesan karya', 'Untuk kebutuhan karya khusus. Jelaskan alur dan batasan pemesanan. Teks ini contoh.', 'Tanya pesanan')}${collab('Undang bicara', 'Untuk acara, kelas, atau diskusi. Jelaskan topik yang bisa Anda bawakan. Teks ini contoh.', 'Undang saya')}${collab('Kerja bareng', 'Untuk proyek bersama yang berjalan lebih lama. Jelaskan cara Anda bekerja. Teks ini contoh.', 'Ajak berkarya')}</div></section><section class="su-faq" id="tanya"><h2 class="su-rv">Pertanyaan umum</h2><details open class="su-rv"><summary>Bagaimana cara memesan karya?</summary><p>Jelaskan langkah pertama untuk calon klien.</p></details><details class="su-rv"><summary>Berapa lama satu karya selesai?</summary><p>Tuliskan perkiraan waktu yang jujur.</p></details><details class="su-rv"><summary>Bagaimana soal hak cipta dan lisensi?</summary><p>Tuliskan kebijakan lisensi karya Anda.</p></details></section><section class="su-end su-rv" id="kontak"><h2>Punya ide? Mari terbangkan bersama.</h2><p>Ganti dengan alamat surel, tautan, dan cara menghubungi Anda.</p><a class="su-btn" href="#content">Kembali ke atas</a></section></main>`, css: `@keyframes surise{from{transform:translateY(105%)}to{transform:none}}@keyframes sufly{0%{transform:translate3d(-200px,50px,0)}100%{transform:translate3d(calc(100vw + 60px),-70px,0)}}@keyframes sutilt{from{transform:rotate(-5deg) translateY(-3px)}to{transform:rotate(4deg) translateY(4px)}}@keyframes sudrift{from{transform:translateX(-24px)}to{transform:translateX(32px)}}@keyframes suspin{to{transform:rotate(360deg)}}@keyframes sumarq{to{transform:translateX(-50%)}}@keyframes suflow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@keyframes suline{from{transform:scaleY(0)}to{transform:scaleY(1)}}@keyframes sushine{0%{transform:translateX(-120%) skewX(-18deg)}60%,100%{transform:translateX(220%) skewX(-18deg)}}@keyframes sutwinkle{0%,100%{background-position:0 0,40px 55px}50%{background-position:6px 4px,36px 58px}}body{background:#f0f9ff;color:#0b2545;font-family:Verdana,Arial,sans-serif}.su-progress{position:fixed;left:0;right:0;top:0;height:4px;z-index:9;pointer-events:none}.su-progress i{display:block;height:100%;background:linear-gradient(90deg,#0ea5e9,#fbbf24);transform-origin:0 50%;transform:scaleX(0)}.su-head{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:14px 6%;background:#f0f9ffe6;border-bottom:3px solid #0b2545}@supports(backdrop-filter:blur(8px)){.su-head{background:#f0f9ffb8;backdrop-filter:blur(10px)}}.su-head>a:first-child{display:flex;align-items:center;gap:10px;font-size:26px;font-weight:800;letter-spacing:-.03em;text-decoration:none}.su-head>a:first-child svg{fill:#0ea5e9}.su-head>a:first-child b{font-size:10px;letter-spacing:.3em;background:#0369a1;color:#ffffff;padding:5px 8px;border-radius:6px}.su-head nav{font-weight:700;font-size:13px;gap:2px}.su-head nav a{padding:8px 12px;border-radius:99px;transition:background .25s,color .25s}.su-head nav a:hover,.su-head nav a.on{background:#0b2545;color:#f0f9ff}.su-cta{padding:11px 22px;border-radius:99px;background:#0369a1;color:#ffffff;font-weight:800;font-size:13px;text-decoration:none;transition:transform .2s,background .2s}.su-cta:hover{transform:translateY(-2px);background:#0b2545}main{padding:0 6%}.su-hero{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;min-height:620px;margin-top:18px;padding:90px 7% 140px;border-radius:44px;border:4px solid #0b2545;background:linear-gradient(180deg,#7dd3fc,#bae6fd 55%,#f0f9ff);color:#0b2545;transition:color 1s;--px:0;--py:0;--sy:0}.su-hero:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#172554,#7c2d12 72%,#c2410c);opacity:0;transition:opacity 1.2s}.su-hero.dusk{color:#fff7ed}.su-hero.dusk:before{opacity:1}.su-sky{position:absolute;inset:0;overflow:hidden;pointer-events:none}.su-stars{position:absolute;inset:0;opacity:0;transition:opacity 1.2s;background:radial-gradient(#ffffff 1.2px,transparent 1.8px) 0 0/90px 90px,radial-gradient(#fde68a 1px,transparent 1.6px) 40px 55px/130px 130px;animation:sutwinkle 5s ease-in-out infinite}.su-hero.dusk .su-stars{opacity:.9}.su-sun{position:absolute;right:11%;top:12%;width:150px;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff7c2,#fde047 58%,#fbbf2400 74%);box-shadow:0 0 90px 30px #fde04788;filter:none;transition:transform 1.4s cubic-bezier(.6,0,.2,1),filter 1.2s,box-shadow 1.2s}.su-sun:before{content:"";position:absolute;inset:-70%;border-radius:50%;background:repeating-conic-gradient(#fde04744 0 6deg,transparent 6deg 18deg);-webkit-mask-image:radial-gradient(circle,#000 24%,transparent 62%);mask-image:radial-gradient(circle,#000 24%,transparent 62%);animation:suspin 70s linear infinite}.su-hero.dusk .su-sun{transform:translateY(170px);filter:hue-rotate(-28deg) saturate(1.4);box-shadow:0 0 90px 30px #fb923c88}.su-cloud{position:absolute;left:var(--l);top:var(--t);width:var(--w);transform:translate3d(calc(var(--px) * var(--k) * 1px),calc(var(--py) * var(--k) * .6px + var(--sy) * var(--k) * .002px),0);transition:transform .5s ease-out}.su-cloud svg{display:block;width:100%;height:auto;fill:#ffffff;opacity:.95;transition:fill 1.2s;animation:sudrift var(--dur,16s) ease-in-out infinite alternate}.su-hero.dusk .su-cloud svg{fill:#fdba74}.su-cloud.c1{--l:5%;--t:8%;--w:230px;--k:36;--dur:18s}.su-cloud.c2{--l:56%;--t:42%;--w:300px;--k:-26;--dur:22s}.su-cloud.c3{--l:18%;--t:64%;--w:170px;--k:48;--dur:14s}.su-cloud.c4{--l:40%;--t:14%;--w:200px;--k:-52;--dur:20s}.su-plane{position:absolute;left:0;top:20%;width:110px;animation:sufly 24s linear infinite}.su-plane:before{content:"";position:absolute;right:100%;top:50%;width:170px;height:3px;background:repeating-linear-gradient(90deg,#ffffffcc,#ffffffcc 10px,transparent 10px,transparent 20px);opacity:.8}.su-plane svg{display:block;width:100%;height:auto;animation:sutilt 3s ease-in-out infinite alternate}.su-wave{position:absolute;left:0;right:0;bottom:-2px;width:100%;height:96px;fill:#f0f9ff}.su-copy{position:relative;z-index:1}.su-copy small{font-size:11px;font-weight:800;letter-spacing:.14em;background:#0b2545;color:#bae6fd;padding:6px 12px;border-radius:99px;transition:background 1s,color 1s}.su-hero.dusk .su-copy small{background:#fff7ed;color:#7c2d12}.su-hero h1{font-size:clamp(40px,6.6vw,92px);line-height:1;letter-spacing:-.05em;margin:26px 0;max-width:860px}.su-ln{display:block;overflow:hidden;padding-bottom:.1em}.su-ln>span{display:inline-block;animation:surise .9s cubic-bezier(.2,.8,.2,1) both}.su-ln:nth-child(2)>span{animation-delay:.15s}.su-rot em{display:inline-block;font-style:italic;color:#0369a1;transition:opacity .3s,transform .3s,color 1s}.su-hero.dusk .su-rot em{color:#fde68a}.su-rot em.out{opacity:0;transform:translateY(.25em)}.su-copy p{max-width:560px;font-size:17px;line-height:1.75}.su-actions{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:8px}.su-btn{position:relative;overflow:hidden;display:inline-block;padding:16px 32px;border-radius:99px;background:#0b2545;color:#f0f9ff;font-weight:800;font-size:14px;text-decoration:none;box-shadow:5px 5px 0 #38bdf8;transform:translate(var(--bx,0px),var(--by,0px));transition:transform .2s,box-shadow .2s,background 1s,color 1s}.su-btn:before{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,#ffffff00,#ffffff55,#ffffff00);animation:sushine 4.5s ease-in-out infinite}.su-btn:hover{box-shadow:8px 8px 0 #38bdf8}.su-hero.dusk .su-btn{background:#fff7ed;color:#7c2d12;box-shadow:5px 5px 0 #fb923c}.su-ghost{display:inline-block;padding:14px 30px;border-radius:99px;border:3px solid currentColor;font-weight:800;font-size:14px;text-decoration:none;transition:background .25s,color .25s}.su-ghost:hover{background:#0b2545;color:#f0f9ff}.su-mode{display:none;align-items:center;gap:10px;padding:14px 22px;border-radius:99px;border:3px solid currentColor;background:transparent;color:inherit;font:800 14px Verdana,Arial,sans-serif;cursor:pointer;transition:background .25s,color .25s}.su-js .su-mode{display:inline-flex}.su-mode:before{content:"";width:14px;height:14px;border-radius:50%;background:#fbbf24;box-shadow:0 0 0 4px #fbbf2455;transition:background .4s,box-shadow .4s}.su-hero.dusk .su-mode:before{background:#fb923c;box-shadow:0 0 0 4px #fb923c55}.su-mode:hover{background:#0b2545;color:#f0f9ff}.su-band{overflow:hidden;margin:34px -6% 0;padding:16px 0;background:#0369a1;white-space:nowrap}.su-band>div{display:inline-flex;gap:44px;animation:sumarq 28s linear infinite}.su-band span{font-weight:900;font-size:30px;letter-spacing:.1em;color:#0369a1;-webkit-text-stroke:1.5px #bae6fd}.su-band:hover>div{animation-play-state:paused}.su-works,.su-about,.su-skills,.su-collab,.su-faq{padding:60px 0 10px}.su-works h2,.su-about h2,.su-skills h2,.su-collab h2,.su-faq h2,.su-end h2{font-size:clamp(26px,3.4vw,40px);letter-spacing:-.02em;margin-bottom:12px}.su-lead{max-width:560px;line-height:1.7;font-size:15px}.su-bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:210px;gap:16px;margin-top:22px}.su-it{position:relative;overflow:hidden;min-height:210px;border-radius:28px;border:3px solid #0b2545;background:#bae6fd;cursor:pointer;transition:transform .35s,box-shadow .35s}.su-it:hover,.su-it:focus-visible{transform:translateY(-6px);box-shadow:8px 8px 0 #38bdf8}.su-it>svg{position:absolute;inset:0;width:100%;height:100%;transition:transform .8s ease}.su-it:hover>svg{transform:scale(1.08)}.su-it.a{grid-column:1/3;grid-row:1/3}.su-it.d{grid-column:3/5}.su-it.e{grid-column:1/-1}.su-it .cap{position:absolute;left:0;right:0;bottom:0;padding:48px 22px 20px;color:#f0f9ff;background:linear-gradient(transparent,#0b2545e6 62%)}.su-it .cap small{font-size:10px;font-weight:800;letter-spacing:.14em;color:#7dd3fc}.su-it .cap h3{font-size:20px;margin:6px 0 0}.su-it .cap p{margin:0;font-size:13px;line-height:1.6;max-height:0;opacity:0;overflow:hidden;transition:max-height .45s,opacity .45s,margin .45s}.su-it:hover .cap p,.su-it:focus .cap p{max-height:80px;opacity:1;margin-top:8px}@media(hover:none){.su-it .cap p{max-height:80px;opacity:1;margin-top:8px}}.su-about{display:grid;grid-template-columns:.85fr 1.15fr;gap:40px;align-items:start}.su-me{position:sticky;top:96px;padding:28px;border-radius:30px;background:#ffffff;border:3px solid #0b2545}.su-me svg{display:block;width:100%;max-width:220px;height:auto;margin-bottom:18px;border-radius:28px}.su-me p{line-height:1.7;font-size:14px}.su-me ul{list-style:none;margin:18px 0 10px;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.su-me li{padding:14px 6px;border-radius:18px;background:#0b2545;color:#f0f9ff;text-align:center}.su-me b{display:block;font-size:22px;color:#7dd3fc}.su-me li span{font-size:11px;font-weight:700}.su-me small{font-size:12px}.su-tl{position:relative;list-style:none;margin:0;padding:0 0 0 8px;display:grid;gap:18px}.su-tl:before{content:"";position:absolute;left:37px;top:20px;bottom:20px;width:4px;border-radius:4px;background:linear-gradient(180deg,#0ea5e9,#fbbf24);transform-origin:50% 0}.su-js .su-tl:before{transform:scaleY(0)}.su-js .su-tl.in:before{animation:suline 1.6s ease-out .2s both}.su-tl li{position:relative;display:grid;grid-template-columns:62px 1fr;gap:18px;align-items:start;padding:20px 22px 20px 0}.su-tl li b{position:relative;display:grid;place-items:center;width:58px;height:58px;border-radius:50%;background:#0369a1;color:#ffffff;border:3px solid #0b2545;font-size:15px}.su-tl h3{font-size:22px;margin:8px 0 6px}.su-tl p{margin:0;line-height:1.7;font-size:14px}.su-skills{margin-top:56px;padding:46px 6% 50px;border-radius:40px;background:#0b2545;color:#f0f9ff}.su-skills .su-lead{color:#bae6fd}.su-skills ul{list-style:none;margin:26px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px 44px}.su-skills li{display:grid;grid-template-columns:1fr auto;gap:10px 12px;font-weight:700}.su-skills em{font-style:normal;color:#fde047}.su-skills .bar{grid-column:1/-1;height:12px;border-radius:99px;background:#ffffff26;overflow:hidden}.su-skills .bar i{display:block;height:100%;width:var(--v);border-radius:99px;background:linear-gradient(90deg,#38bdf8,#fde047);transition:width 1.4s cubic-bezier(.2,.8,.2,1)}.su-js .su-skills li:not(.in) .bar i{width:0}.su-cgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:22px;perspective:900px}.su-co>div{height:100%;padding:30px;border-radius:28px;background:#ffffff;border:3px solid #0b2545;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .25s ease-out,box-shadow .3s}.su-co>div:hover{box-shadow:8px 8px 0 #38bdf8}.su-co svg{display:block;width:70px;height:auto;margin-bottom:14px;fill:#38bdf8;stroke:#0b2545;stroke-width:3px}.su-co h3{font-size:24px;margin:0 0 10px}.su-co p{line-height:1.7;font-size:14px}.su-co a{display:inline-block;padding:11px 22px;border-radius:99px;background:#0b2545;color:#f0f9ff;font-weight:800;font-size:13px;text-decoration:none;transition:background .2s}.su-co a:hover{background:#0369a1}.su-faq{max-width:760px}.su-faq details{padding:18px 22px;margin-bottom:12px;border-radius:18px;background:#ffffff;border:3px solid #0b2545;font-weight:700;font-size:16px;transition:background .25s}.su-faq details[open]{background:#e0f2fe}.su-faq summary{list-style:none}.su-faq summary::-webkit-details-marker{display:none}.su-faq summary:after{content:"+";float:right;font-size:22px;line-height:1;transition:transform .25s}.su-faq details[open] summary:after{transform:rotate(45deg)}.su-faq p{margin:12px 0 0;font-weight:400;font-size:15px;line-height:1.75}.su-end{margin:56px 0;padding:56px 7%;border-radius:40px;background:linear-gradient(135deg,#0c4a6e,#0369a1,#075985,#0369a1);background-size:300% 300%;animation:suflow 14s ease infinite;color:#f0f9ff;border:4px solid #0b2545}.su-end p{max-width:520px;line-height:1.8}.su-end .su-btn{background:#f0f9ff;color:#0b2545;box-shadow:5px 5px 0 #fbbf24}.su-dot{position:fixed;left:0;top:0;z-index:20;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#0ea5e9;mix-blend-mode:multiply;pointer-events:none;opacity:0;transition:opacity .2s,width .2s,height .2s,margin .2s}.su-dot.on{opacity:.85}.su-dot.big{width:44px;height:44px;margin:-22px 0 0 -22px}.su-js .su-rv{opacity:0;transform:translateY(26px);transition:opacity .7s ease var(--d,0ms),transform .7s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}.su-js .su-rv.in{opacity:1;transform:none}@media(max-width:900px){.su-hero{min-height:560px;padding:60px 6% 120px;border-radius:30px}.su-sun{width:96px}.su-bento{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:200px}.su-it.a{grid-column:1/-1;grid-row:auto}.su-it.d,.su-it.e{grid-column:1/-1}.su-about{grid-template-columns:1fr}.su-me{position:static}.su-skills ul{grid-template-columns:1fr}.su-cgrid{grid-template-columns:1fr}.su-end{padding:36px 6%}.su-head nav{display:none}}@media(max-width:560px){.su-bento{grid-template-columns:1fr}.su-cta{padding:9px 16px}.su-plane{width:80px}.su-me ul{grid-template-columns:1fr}}`, javascript: `(function(){
  var doc=document,root=doc.documentElement,win=window;
  var reduce=!!(win.matchMedia&&win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.classList.add('su-js');
  var each=function(list,fn){Array.prototype.slice.call(list||[]).forEach(fn);};
  var bar=doc.querySelector('.su-progress i');
  var hero=doc.querySelector('.su-hero');
  var links=Array.prototype.slice.call(doc.querySelectorAll('.su-head nav a'));
  var sections=links.map(function(a){var id=a.getAttribute('href');return id&&id.charAt(0)==='#'?doc.querySelector(id):null;});
  var ticking=false;
  function frame(){
    ticking=false;
    var y=win.pageYOffset||root.scrollTop||0;
    var max=Math.max(1,root.scrollHeight-win.innerHeight);
    if(bar)bar.style.transform='scaleX('+Math.min(1,Math.max(0,y/max)).toFixed(4)+')';
    if(hero&&!reduce&&y<hero.offsetHeight+240)hero.style.setProperty('--sy',String(Math.round(y)));
    var line=y+win.innerHeight*0.35,current=-1;
    sections.forEach(function(s,i){if(s&&s.getBoundingClientRect().top+y<=line)current=i;});
    links.forEach(function(a,i){a.classList.toggle('on',i===current);});
  }
  function schedule(){if(ticking)return;ticking=true;win.requestAnimationFrame(frame);}
  win.addEventListener('scroll',schedule,{passive:true});
  win.addEventListener('resize',schedule);
  schedule();

  var items=doc.querySelectorAll('.su-rv');
  var showAll=function(){each(items,function(el){el.classList.add('in');});};
  if(reduce||!('IntersectionObserver' in win)){showAll();}
  else{
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
    },{threshold:0.12,rootMargin:'0px 0px -5% 0px'});
    each(items,function(el,i){el.style.setProperty('--d',((i%4)*90)+'ms');io.observe(el);});
    win.setTimeout(showAll,6000);
  }

  var counters=doc.querySelectorAll('[data-count]');
  function runCount(el){
    var end=parseFloat(el.getAttribute('data-count'))||0;
    var suffix=el.getAttribute('data-suffix')||'';
    var t0=null,dur=1500;
    function step(t){
      if(t0===null)t0=t;
      var p=Math.min(1,(t-t0)/dur);
      var eased=1-Math.pow(1-p,3);
      el.textContent=Math.round(end*eased)+suffix;
      if(p<1)win.requestAnimationFrame(step);
    }
    win.requestAnimationFrame(step);
  }
  if(!reduce&&'IntersectionObserver' in win){
    var cio=new IntersectionObserver(function(entries){
      entries.forEach(function(e){if(e.isIntersecting){runCount(e.target);cio.unobserve(e.target);}});
    },{threshold:0.6});
    each(counters,function(el){cio.observe(el);});
  }

  var mode=doc.querySelector('.su-mode');
  if(mode&&hero){
    mode.addEventListener('click',function(){
      var dusk=hero.classList.toggle('dusk');
      mode.setAttribute('aria-pressed',dusk?'true':'false');
      mode.textContent=dusk?'Mode siang':'Mode senja';
    });
  }

  if(!reduce&&hero){
    hero.addEventListener('pointermove',function(e){
      var r=hero.getBoundingClientRect();
      hero.style.setProperty('--px',((e.clientX-r.left)/r.width-0.5).toFixed(3));
      hero.style.setProperty('--py',((e.clientY-r.top)/r.height-0.5).toFixed(3));
    },{passive:true});
    hero.addEventListener('pointerleave',function(){
      hero.style.setProperty('--px','0');
      hero.style.setProperty('--py','0');
    });
    each(doc.querySelectorAll('.su-btn'),function(btn){
      btn.addEventListener('pointermove',function(e){
        if(e.pointerType==='touch')return;
        var r=btn.getBoundingClientRect();
        btn.style.setProperty('--bx',((e.clientX-r.left-r.width/2)*0.16).toFixed(1)+'px');
        btn.style.setProperty('--by',((e.clientY-r.top-r.height/2)*0.26).toFixed(1)+'px');
      });
      btn.addEventListener('pointerleave',function(){
        btn.style.setProperty('--bx','0px');
        btn.style.setProperty('--by','0px');
      });
    });
    each(doc.querySelectorAll('.su-co>div'),function(card){
      card.addEventListener('pointermove',function(e){
        if(e.pointerType==='touch')return;
        var r=card.getBoundingClientRect();
        var x=(e.clientX-r.left)/r.width-0.5,y=(e.clientY-r.top)/r.height-0.5;
        card.style.setProperty('--ry',(x*10).toFixed(2)+'deg');
        card.style.setProperty('--rx',(-y*10).toFixed(2)+'deg');
      });
      card.addEventListener('pointerleave',function(){
        card.style.setProperty('--ry','0deg');
        card.style.setProperty('--rx','0deg');
      });
    });
  }

  if(!reduce&&win.matchMedia&&win.matchMedia('(pointer: fine)').matches){
    var dot=doc.createElement('span');
    dot.className='su-dot';
    dot.setAttribute('aria-hidden','true');
    doc.body.appendChild(dot);
    doc.addEventListener('pointermove',function(e){
      dot.style.transform='translate3d('+e.clientX+'px,'+e.clientY+'px,0)';
      dot.classList.add('on');
      var t=e.target&&e.target.closest?e.target.closest('a,button,summary,.su-it'):null;
      dot.classList.toggle('big',!!t);
    },{passive:true});
    doc.addEventListener('pointerleave',function(){dot.classList.remove('on');});
  }

  var rot=doc.querySelector('.su-rot');
  if(rot&&!reduce){
    var words=(rot.getAttribute('data-words')||'').split('|').filter(Boolean);
    var word=rot.querySelector('em');
    if(words.length>1&&word){
      var n=0;
      win.setInterval(function(){
        if(doc.hidden)return;
        word.classList.add('out');
        win.setTimeout(function(){n=(n+1)%words.length;word.textContent=words[n];word.classList.remove('out');},320);
      },2800);
    }
  }
})();
` };
export const PREMIUM_UPGRADED_058 = Object.freeze([Object.freeze({ id: design.id, name: design.name, category: design.category, composition: design.composition, code: Object.freeze({ html: design.html, css: base + design.css, javascript: design.javascript }) })]);
if (!PREVIOUS.some(theme => theme.id === design.id)) throw new Error('Upgrade target missing: ' + design.id);
export const PREMIUM_BRIGHT_GENERATED = Object.freeze(PREVIOUS.map(theme => theme.id === design.id ? PREMIUM_UPGRADED_058[0] : theme));
if (PREMIUM_BRIGHT_GENERATED.length !== PREVIOUS.length) throw new Error('Invalid upgraded bright theme 058');
