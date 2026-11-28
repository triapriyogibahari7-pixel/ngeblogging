// Pembaruan Ultra untuk tema 057 (Kreator Apel 2), di atas hasil upgrade 051-056. ID tetap; tema lain tidak berubah.
// CSS, SVG sebaris, dan JavaScript sebaris (tanpa pustaka, tanpa jaringan). Tanpa aset eksternal.
// Tanpa JavaScript (mis. thumbnail sandbox) seluruh konten tetap terlihat; animasi mati saat reduced-motion.
import { PREMIUM_BRIGHT_GENERATED as PREVIOUS } from './premium-bright-themes-upgraded-056.mjs';

const skip = '<a class="skip" href="#content">Lewati ke konten</a>';
const base = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0}a{color:inherit;text-underline-offset:4px}a:focus-visible,summary:focus-visible,button:focus-visible,.au-pj:focus-visible{outline:3px solid currentColor;outline-offset:4px}h1,h2,h3,p,figure,ol,ul,dl,dd{margin-top:0}main,section,article,aside,div,li{min-width:0}.skip{position:absolute;top:-100px;left:12px;z-index:10;padding:12px;background:#ffffff;color:#000000}.skip:focus{top:12px}summary{cursor:pointer}nav{display:flex;gap:20px;flex-wrap:wrap}nav a{text-decoration:none}h1,h2,h3,p,a,dt,dd,li,label,summary{overflow-wrap:anywhere}svg{max-width:100%}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}}`;

const appleShapes = (body, shade) => `<path d="M150 92C112 64 56 86 60 156c4 74 50 118 90 104 40 14 86-30 90-104 4-70-52-92-90-64z" fill="${body}"/><path d="M150 92C188 64 244 86 240 156C236 230 190 274 150 260Z" fill="${shade}" opacity=".55"/><ellipse cx="102" cy="140" rx="16" ry="34" transform="rotate(14 102 140)" fill="#ffffff" opacity=".4"/><path d="M150 92C148 76 150 62 156 50" stroke="#7c4a1e" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M158 84C160 52 188 34 214 40 212 66 188 86 158 84z" fill="#3f6212"/>`;
const art = (bg, body, shade) => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="300" fill="${bg}"/><g transform="translate(55 4) scale(.97)">${appleShapes(body, shade)}</g><circle cx="340" cy="60" r="22" fill="#e11d48"/></svg>`;
const project = (label, title, text, svg) => `<article class="au-pj" tabindex="0"><span class="art">${svg}</span><div><small>${label}</small><h3>${title}</h3><p>${text}</p></div></article>`;
const row = (n, title, text) => `<li class="au-rv"><span class="n">${n}</span><div><h3>${title}</h3><p>${text}</p></div><i aria-hidden="true">&rarr;</i></li>`;

const design = { id: 'signature-057-kreator-2', name: 'Kreator Apel Ultra', category: 'Kreator', composition: 'ultra-apel-orbit-carousel-rows', html: `${skip}<div class="au-progress" aria-hidden="true"><i></i></div><header class="au-head"><a href="#content"><svg viewBox="0 0 300 300" width="34" height="34" aria-hidden="true">${appleShapes('#84cc16', '#65a30d')}</svg>Apel<b>ULTRA</b></a><nav aria-label="Navigasi situs"><a href="#proyek">Proyek</a><a href="#layanan">Layanan</a><a href="#paket">Paket</a><a href="#proses">Proses</a><a href="#angka">Angka</a><a href="#tanya">Tanya</a></nav><a class="au-cta" href="#kontak">Mulai proyek</a></header><main id="content"><section class="au-hero"><div class="au-copy"><small>STUDIO KREATOR / PROFIL CONTOH</small><h1><span class="au-ln"><span>Karya segar,</span></span><span class="au-ln"><span>rasa yang <span class="au-rot" data-words="renyah|manis|jujur"><em>renyah</em></span>.</span></span></h1><p>Beranda studio kreatif ala perusahaan besar: apel yang mengikuti kursor, karusel proyek yang bisa digeser, daftar layanan yang hidup, dan pilihan paket kerja sama. Semua teks di sini adalah contoh.</p><div class="au-actions"><a class="au-btn" href="#proyek">Lihat proyek</a><a class="au-ghost" href="#paket">Pilih paket</a></div></div><div class="au-stage" aria-hidden="true"><div class="au-orbit"><i></i><i></i><i></i></div><div class="au-apple"><svg viewBox="0 0 300 300">${appleShapes('#84cc16', '#65a30d')}</svg></div></div></section><div class="au-band" aria-hidden="true"><div><span>KREATIF</span><span>JUJUR</span><span>SEGAR</span><span>RAPI</span><span>BERANI</span><span>KREATIF</span><span>JUJUR</span><span>SEGAR</span><span>RAPI</span><span>BERANI</span></div></div><section class="au-proj" id="proyek"><div class="au-bar"><h2 class="au-rv">Proyek pilihan</h2><div class="au-nav"><button type="button" class="au-prev" aria-label="Proyek sebelumnya">&larr;</button><button type="button" class="au-next" aria-label="Proyek berikutnya">&rarr;</button></div></div><div class="au-track">${project('IDENTITAS', 'Merek buah segar', 'Ringkasan singkat contoh untuk proyek identitas.', art('#ecfccb', '#84cc16', '#65a30d'))}${project('KEMASAN', 'Kemasan musim panen', 'Ringkasan singkat contoh untuk proyek kemasan.', art('#fef3c7', '#e11d48', '#9f1239'))}${project('FOTO', 'Seri foto kebun', 'Ringkasan singkat contoh untuk seri foto.', art('#14290a', '#a3e635', '#65a30d'))}${project('VIDEO', 'Film pendek panen', 'Ringkasan singkat contoh untuk film pendek.', art('#d9f99d', '#4d7c0f', '#365314'))}${project('WEB', 'Situs toko kebun', 'Ringkasan singkat contoh untuk proyek situs.', art('#ffe4e6', '#84cc16', '#3f6212'))}</div></section><section class="au-rows" id="layanan"><h2 class="au-rv">Layanan</h2><ul>${row('01', 'Identitas dan merek', 'Jelaskan cara Anda membangun identitas dari nol. Teks ini contoh.')}${row('02', 'Produksi visual', 'Jelaskan foto, video, dan ilustrasi yang Anda kerjakan. Teks ini contoh.')}${row('03', 'Situs dan produk digital', 'Jelaskan cara Anda merancang dan membangun situs. Teks ini contoh.')}${row('04', 'Arahan kreatif', 'Jelaskan bagaimana Anda mendampingi tim klien. Teks ini contoh.')}</ul></section><section class="au-pkgs" id="paket"><h2 class="au-rv">Paket kerja sama</h2><div class="au-pgrid"><article class="au-pk au-rv"><h3>Ringan</h3><p>Untuk kebutuhan singkat dan jelas. Isi sendiri rincian dan harganya.</p><ul><li>Satu karya utama</li><li>Satu putaran revisi</li><li>Berkas siap pakai</li></ul><a href="#kontak">Tanya paket ini</a></article><article class="au-pk hot au-rv"><b>PALING DIPILIH (CONTOH)</b><h3>Penuh</h3><p>Untuk proyek yang butuh pendampingan menyeluruh. Isi sendiri rincian dan harganya.</p><ul><li>Konsep sampai serah terima</li><li>Revisi bertahap</li><li>Panduan pemakaian</li></ul><a href="#kontak">Tanya paket ini</a></article><article class="au-pk au-rv"><h3>Kemitraan</h3><p>Untuk kerja sama jangka panjang. Isi sendiri rincian dan harganya.</p><ul><li>Kerja berkelanjutan</li><li>Prioritas jadwal</li><li>Laporan berkala</li></ul><a href="#kontak">Tanya paket ini</a></article></div></section><section class="au-flow" id="proses"><h2 class="au-rv">Proses kerja</h2><ol class="au-rv"><li><span>1</span><h3>Mengenal</h3><p>Dengarkan kebutuhan dan tujuan.</p></li><li><span>2</span><h3>Merancang</h3><p>Susun konsep dan contoh awal.</p></li><li><span>3</span><h3>Membuat</h3><p>Kerjakan dengan tahapan terbuka.</p></li><li><span>4</span><h3>Menyerahkan</h3><p>Serahkan hasil dan berkas. Teks ini contoh.</p></li></ol></section><section class="au-stats" id="angka"><h2 class="au-rv">Angka contoh</h2><ul class="au-rv"><li><b data-count="200" data-suffix="+">200+</b><span>Karya selesai</span></li><li><b data-count="35" data-suffix="">35</b><span>Kolaborator</span></li><li><b data-count="8" data-suffix=" thn">8 thn</b><span>Pengalaman</span></li></ul><p class="au-rv">Angka di atas hanya contoh. Ganti dengan data Anda sendiri.</p></section><section class="au-faq" id="tanya"><h2 class="au-rv">Pertanyaan umum</h2><details open class="au-rv"><summary>Bagaimana cara memulai proyek?</summary><p>Jelaskan langkah pertama untuk calon klien.</p></details><details class="au-rv"><summary>Berapa lama pengerjaannya?</summary><p>Tuliskan perkiraan waktu yang jujur.</p></details><details class="au-rv"><summary>Bagaimana soal hak cipta?</summary><p>Tuliskan kebijakan hak cipta dan lisensi Anda.</p></details></section><section class="au-end au-rv" id="kontak"><h2>Punya ide? Kita petik bersama.</h2><p>Ganti dengan alamat surel, tautan, dan cara menghubungi Anda.</p><a class="au-btn" href="#content">Kembali ke atas</a></section></main>`, css: `@keyframes aurise{from{transform:translateY(105%)}to{transform:none}}@keyframes audrift{to{background-position:280px 140px,0 0}}@keyframes auflow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@keyframes auspin{to{transform:rotate(360deg)}}@keyframes aubob{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}@keyframes aumarq{to{transform:translateX(-50%)}}@keyframes aushine{0%{transform:translateX(-120%) skewX(-18deg)}60%,100%{transform:translateX(220%) skewX(-18deg)}}@keyframes aupulse{0%,100%{box-shadow:0 0 0 0 #65a30d66}50%{box-shadow:0 0 0 12px #65a30d00}}@keyframes auline{from{transform:scaleX(0)}to{transform:scaleX(1)}}body{background:#f7fee7;color:#14290a;font-family:Verdana,Arial,sans-serif}.au-progress{position:fixed;left:0;right:0;top:0;height:4px;z-index:9;pointer-events:none}.au-progress i{display:block;height:100%;background:linear-gradient(90deg,#65a30d,#e11d48);transform-origin:0 50%;transform:scaleX(0)}.au-head{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:14px 6%;background:#f7fee7e6;border-bottom:3px solid #14290a}@supports(backdrop-filter:blur(8px)){.au-head{background:#f7fee7b8;backdrop-filter:blur(10px)}}.au-head>a:first-child{display:flex;align-items:center;gap:10px;font-size:26px;font-weight:800;letter-spacing:-.03em;text-decoration:none}.au-head>a:first-child b{font-size:10px;letter-spacing:.3em;background:#3f6212;color:#ffffff;padding:5px 8px;border-radius:6px}.au-head nav{font-weight:700;font-size:13px;gap:2px}.au-head nav a{padding:8px 12px;border-radius:99px;transition:background .25s,color .25s}.au-head nav a:hover,.au-head nav a.on{background:#14290a;color:#f7fee7}.au-cta{padding:11px 22px;border-radius:99px;background:#be123c;color:#ffffff;font-weight:800;font-size:13px;text-decoration:none;transition:transform .2s,background .2s}.au-cta:hover{transform:translateY(-2px);background:#14290a}main{padding:0 6%}.au-hero{position:relative;overflow:hidden;display:grid;grid-template-columns:1.15fr .85fr;gap:30px;align-items:center;margin-top:18px;padding:80px 7%;border-radius:44px;border:4px solid #14290a;background:radial-gradient(#a3e63577 2px,transparent 2px) 0 0/28px 28px,linear-gradient(120deg,#f7fee7,#ecfccb,#fefce8);animation:audrift 24s linear infinite;--px:0;--py:0}.au-copy{position:relative}.au-copy small{font-size:11px;font-weight:800;letter-spacing:.14em;background:#14290a;color:#bef264;padding:6px 12px;border-radius:99px}.au-hero h1{font-size:clamp(40px,6.6vw,92px);line-height:1;letter-spacing:-.05em;margin:26px 0;max-width:860px}.au-ln{display:block;overflow:hidden;padding-bottom:.1em}.au-ln>span{display:inline-block;animation:aurise .9s cubic-bezier(.2,.8,.2,1) both}.au-ln:nth-child(2)>span{animation-delay:.15s}.au-rot em{display:inline-block;font-style:italic;color:#4d7c0f;text-shadow:0 0 26px #bef264;transition:opacity .3s,transform .3s}.au-rot em.out{opacity:0;transform:translateY(.25em)}.au-hero p{max-width:540px;font-size:17px;line-height:1.75}.au-actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px}.au-btn{position:relative;overflow:hidden;display:inline-block;padding:16px 32px;border-radius:99px;background:#14290a;color:#f7fee7;font-weight:800;font-size:14px;text-decoration:none;box-shadow:5px 5px 0 #84cc16;transform:translate(var(--bx,0px),var(--by,0px));transition:transform .2s,box-shadow .2s}.au-btn:before{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,#ffffff00,#ffffff55,#ffffff00);animation:aushine 4.5s ease-in-out infinite}.au-btn:hover{box-shadow:8px 8px 0 #84cc16}.au-ghost{display:inline-block;padding:14px 30px;border-radius:99px;border:3px solid #14290a;font-weight:800;font-size:14px;text-decoration:none;transition:background .25s,color .25s}.au-ghost:hover{background:#14290a;color:#f7fee7}.au-stage{position:relative;aspect-ratio:1;display:grid;place-items:center;perspective:900px}.au-apple{width:78%;animation:aubob 7s ease-in-out infinite;transform-style:preserve-3d}.au-apple svg{display:block;width:100%;height:auto;transform:rotateY(calc(var(--px) * 18deg)) rotateX(calc(var(--py) * -18deg));transition:transform .3s ease-out;filter:drop-shadow(0 24px 24px #3f621244)}.au-orbit{position:absolute;inset:4%;border:2px dashed #65a30d88;border-radius:50%;animation:auspin 30s linear infinite}.au-orbit i{position:absolute;width:18px;height:18px;border-radius:50%;background:#e11d48}.au-orbit i:nth-child(1){left:50%;top:-9px}.au-orbit i:nth-child(2){right:-9px;top:50%;background:#84cc16}.au-orbit i:nth-child(3){left:14%;bottom:8%;width:12px;height:12px;background:#14290a}.au-band{overflow:hidden;margin:34px -6% 0;padding:16px 0;background:#14290a;white-space:nowrap}.au-band>div{display:inline-flex;gap:44px;animation:aumarq 28s linear infinite}.au-band span{font-weight:900;font-size:30px;letter-spacing:.1em;color:#14290a;-webkit-text-stroke:1.5px #bef264}.au-band:hover>div{animation-play-state:paused}.au-proj{padding:60px 0 20px}.au-bar{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap;margin-bottom:16px}.au-proj h2,.au-rows h2,.au-pkgs h2,.au-flow h2,.au-stats h2,.au-faq h2,.au-end h2{font-size:clamp(26px,3.4vw,40px);letter-spacing:-.02em;margin-bottom:0}.au-nav{display:none;gap:10px}.au-js .au-nav{display:flex}.au-nav button{width:48px;height:48px;border-radius:50%;border:3px solid #14290a;background:#ffffff;font-size:20px;font-weight:800;color:#14290a;cursor:pointer;transition:background .2s,transform .2s}.au-nav button:hover{background:#bef264;transform:translateY(-2px)}.au-nav button:disabled{opacity:.4;cursor:default;transform:none}.au-track{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 4px 22px;scrollbar-width:thin}.au-pj{flex:0 0 min(340px,82%);scroll-snap-align:start;background:#ffffff;border:3px solid #14290a;border-radius:26px;overflow:hidden;transition:transform .3s,box-shadow .3s}.au-pj:hover{transform:translateY(-8px);box-shadow:8px 8px 0 #84cc16}.au-pj .art{display:block;aspect-ratio:4/3;overflow:hidden;border-bottom:3px solid #14290a}.au-pj .art svg{display:block;width:100%;height:100%;transition:transform .6s ease}.au-pj:hover .art svg{transform:scale(1.1) rotate(-1.5deg)}.au-pj>div{padding:20px 22px 24px}.au-pj small{font-size:10px;font-weight:800;letter-spacing:.14em;color:#3f6212}.au-pj h3{font-size:21px;margin:8px 0}.au-pj p{margin:0;font-size:14px;line-height:1.65}.au-rows{padding:50px 0 20px}.au-rows ul{list-style:none;margin:20px 0 0;padding:0;border-top:3px solid #14290a}.au-rows li{position:relative;display:grid;grid-template-columns:70px 1fr 40px;gap:16px;align-items:center;padding:26px 14px;border-bottom:3px solid #14290a;transition:background .3s,padding-left .3s}.au-rows li:hover{background:#ecfccb;padding-left:30px}.au-rows .n{font-weight:900;font-size:22px;color:#be123c}.au-rows h3{font-size:clamp(20px,2.6vw,30px);margin:0 0 6px}.au-rows p{margin:0;line-height:1.7;font-size:14px}.au-rows i{font-style:normal;font-size:26px;font-weight:800;transition:transform .3s}.au-rows li:hover i{transform:translateX(6px) rotate(-30deg)}.au-pkgs{padding:50px 0 20px}.au-pgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:20px;align-items:stretch}.au-pk{position:relative;padding:30px;border-radius:28px;background:#ffffff;border:3px solid #14290a;transition:transform .3s,box-shadow .3s}.au-pk:hover{transform:translateY(-6px);box-shadow:8px 8px 0 #84cc16}.au-pk.hot{background:#3f6212;color:#f7fee7}.au-pk b{display:inline-block;margin-bottom:12px;padding:5px 10px;border-radius:99px;background:#fde047;color:#14290a;font-size:10px;letter-spacing:.12em}.au-pk h3{font-size:26px;margin:0 0 10px}.au-pk p{line-height:1.7;font-size:14px}.au-pk ul{list-style:none;margin:16px 0 22px;padding:0;display:grid;gap:8px;font-size:14px}.au-pk li:before{content:">";margin-right:10px;font-weight:800;color:#be123c}.au-pk.hot li:before{color:#bef264}.au-pk a{display:inline-block;padding:11px 22px;border-radius:99px;background:#14290a;color:#f7fee7;font-weight:800;font-size:13px;text-decoration:none}.au-pk.hot a{background:#f7fee7;color:#14290a}.au-flow{padding:50px 0 20px}.au-flow ol{position:relative;list-style:none;margin:24px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.au-flow ol:before{content:"";position:absolute;left:0;right:0;top:19px;height:4px;border-radius:4px;background:linear-gradient(90deg,#65a30d,#e11d48);transform-origin:0 50%}.au-js .au-flow ol:before{transform:scaleX(0)}.au-js .au-flow ol.in:before{animation:auline 1.4s ease-out .2s both}.au-flow li{position:relative;padding:58px 20px 22px;border-radius:22px;background:#ffffff;border:3px solid #14290a}.au-flow li span{position:absolute;left:20px;top:8px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#84cc16;color:#14290a;border:3px solid #14290a;font-weight:800;font-size:13px;animation:aupulse 2.8s ease-out infinite}.au-flow h3{font-size:20px;margin:0 0 6px}.au-flow p{margin:0;line-height:1.7;font-size:14px}.au-stats{padding:50px 0 20px}.au-stats ul{list-style:none;margin:20px 0 14px;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.au-stats li{padding:28px 16px;border-radius:26px;background:#14290a;color:#f7fee7;text-align:center}.au-stats b{display:block;font-size:clamp(34px,5vw,58px);line-height:1;letter-spacing:-.03em;color:#bef264}.au-stats li span{display:block;margin-top:10px;font-weight:700;font-size:13px}.au-stats>p{margin:0;font-size:13px;line-height:1.7}.au-faq{max-width:760px;padding:50px 0 20px}.au-faq details{padding:18px 22px;margin-bottom:12px;border-radius:18px;background:#ffffff;border:3px solid #14290a;font-weight:700;font-size:16px;transition:background .25s}.au-faq details[open]{background:#ecfccb}.au-faq summary{list-style:none}.au-faq summary::-webkit-details-marker{display:none}.au-faq summary:after{content:"+";float:right;font-size:22px;line-height:1;transition:transform .25s}.au-faq details[open] summary:after{transform:rotate(45deg)}.au-faq p{margin:12px 0 0;font-weight:400;font-size:15px;line-height:1.75}.au-end{margin:50px 0 56px;padding:56px 7%;border-radius:40px;background:linear-gradient(135deg,#3f6212,#4d7c0f,#365314,#4d7c0f);background-size:300% 300%;animation:auflow 14s ease infinite;color:#f7fee7;border:4px solid #14290a}.au-end p{max-width:520px;line-height:1.8}.au-end .au-btn{background:#f7fee7;color:#14290a;box-shadow:5px 5px 0 #e11d48}.au-dot{position:fixed;left:0;top:0;z-index:20;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#e11d48;mix-blend-mode:multiply;pointer-events:none;opacity:0;transition:opacity .2s,width .2s,height .2s,margin .2s}.au-dot.on{opacity:.85}.au-dot.big{width:44px;height:44px;margin:-22px 0 0 -22px}.au-js .au-rv{opacity:0;transform:translateY(26px);transition:opacity .7s ease var(--d,0ms),transform .7s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}.au-js .au-rv.in{opacity:1;transform:none}@media(max-width:900px){.au-hero{grid-template-columns:1fr;padding:52px 6% 44px;border-radius:30px}.au-stage{max-width:260px;margin:0 auto}.au-pgrid{grid-template-columns:1fr}.au-flow ol{grid-template-columns:repeat(2,minmax(0,1fr))}.au-flow ol:before{display:none}.au-stats ul{grid-template-columns:1fr}.au-rows li{grid-template-columns:44px 1fr 28px;padding:20px 8px}.au-end{padding:36px 6%}.au-head nav{display:none}}@media(max-width:560px){.au-flow ol{grid-template-columns:1fr}.au-cta{padding:9px 16px}}`, javascript: `(function(){
  var doc=document,root=doc.documentElement,win=window;
  var reduce=!!(win.matchMedia&&win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.classList.add('au-js');
  var each=function(list,fn){Array.prototype.slice.call(list||[]).forEach(fn);};
  var bar=doc.querySelector('.au-progress i');
  var hero=doc.querySelector('.au-hero');
  var links=Array.prototype.slice.call(doc.querySelectorAll('.au-head nav a'));
  var sections=links.map(function(a){var id=a.getAttribute('href');return id&&id.charAt(0)==='#'?doc.querySelector(id):null;});
  var ticking=false;
  function frame(){
    ticking=false;
    var y=win.pageYOffset||root.scrollTop||0;
    var max=Math.max(1,root.scrollHeight-win.innerHeight);
    if(bar)bar.style.transform='scaleX('+Math.min(1,Math.max(0,y/max)).toFixed(4)+')';
    var line=y+win.innerHeight*0.35,current=-1;
    sections.forEach(function(s,i){if(s&&s.getBoundingClientRect().top+y<=line)current=i;});
    links.forEach(function(a,i){a.classList.toggle('on',i===current);});
  }
  function schedule(){if(ticking)return;ticking=true;win.requestAnimationFrame(frame);}
  win.addEventListener('scroll',schedule,{passive:true});
  win.addEventListener('resize',schedule);
  schedule();

  var items=doc.querySelectorAll('.au-rv');
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

  var track=doc.querySelector('.au-track');
  var prev=doc.querySelector('.au-prev');
  var next=doc.querySelector('.au-next');
  function stepSize(){var card=track&&track.querySelector('.au-pj');return card?card.getBoundingClientRect().width+18:320;}
  function sync(){
    if(!track||!prev||!next)return;
    prev.disabled=track.scrollLeft<4;
    next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-4;
  }
  if(track&&prev&&next){
    prev.addEventListener('click',function(){track.scrollBy({left:-stepSize(),behavior:reduce?'auto':'smooth'});});
    next.addEventListener('click',function(){track.scrollBy({left:stepSize(),behavior:reduce?'auto':'smooth'});});
    track.addEventListener('scroll',sync,{passive:true});
    win.addEventListener('resize',sync);
    sync();
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
    each(doc.querySelectorAll('.au-btn'),function(btn){
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
  }

  if(!reduce&&win.matchMedia&&win.matchMedia('(pointer: fine)').matches){
    var dot=doc.createElement('span');
    dot.className='au-dot';
    dot.setAttribute('aria-hidden','true');
    doc.body.appendChild(dot);
    doc.addEventListener('pointermove',function(e){
      dot.style.transform='translate3d('+e.clientX+'px,'+e.clientY+'px,0)';
      dot.classList.add('on');
      var t=e.target&&e.target.closest?e.target.closest('a,button,summary'):null;
      dot.classList.toggle('big',!!t);
    },{passive:true});
    doc.addEventListener('pointerleave',function(){dot.classList.remove('on');});
  }

  var rot=doc.querySelector('.au-rot');
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
export const PREMIUM_UPGRADED_057 = Object.freeze([Object.freeze({ id: design.id, name: design.name, category: design.category, composition: design.composition, code: Object.freeze({ html: design.html, css: base + design.css, javascript: design.javascript }) })]);
if (!PREVIOUS.some(theme => theme.id === design.id)) throw new Error('Upgrade target missing: ' + design.id);
export const PREMIUM_BRIGHT_GENERATED = Object.freeze(PREVIOUS.map(theme => theme.id === design.id ? PREMIUM_UPGRADED_057[0] : theme));
if (PREMIUM_BRIGHT_GENERATED.length !== PREVIOUS.length) throw new Error('Invalid upgraded bright theme 057');
