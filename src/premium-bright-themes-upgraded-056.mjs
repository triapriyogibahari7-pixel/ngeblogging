// Pembaruan Ultra untuk tema 056 (Kreator Anggrek 1), di atas hasil upgrade 051-055. ID tetap; tema lain tidak berubah.
// CSS, SVG sebaris, dan JavaScript sebaris (tanpa pustaka, tanpa jaringan). Tanpa aset eksternal.
// Tanpa JavaScript (mis. thumbnail sandbox) seluruh konten tetap terlihat; animasi mati saat reduced-motion.
import { PREMIUM_BRIGHT_GENERATED as PREVIOUS } from './premium-bright-themes-upgraded-055.mjs';

const skip = '<a class="skip" href="#content">Lewati ke konten</a>';
const base = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0}a{color:inherit;text-underline-offset:4px}a:focus-visible,summary:focus-visible,input:focus-visible+label,.ku-svc:focus-visible,.ku-w:focus-visible{outline:3px solid currentColor;outline-offset:4px}h1,h2,h3,p,figure,ol,ul,dl,dd{margin-top:0}main,section,article,aside,div,li{min-width:0}.skip{position:absolute;top:-100px;left:12px;z-index:10;padding:12px;background:#ffffff;color:#000000}.skip:focus{top:12px}summary{cursor:pointer}nav{display:flex;gap:20px;flex-wrap:wrap}nav a{text-decoration:none}h1,h2,h3,p,a,dt,dd,li,label,summary{overflow-wrap:anywhere}input[type=radio]{position:absolute;opacity:0;pointer-events:none}svg{max-width:100%}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}}`;

const petals = ['0', '72', '144', '216', '288'].map(r => `<ellipse cx="150" cy="76" rx="38" ry="70" transform="rotate(${r} 150 150)"/>`).join('');
const art = (bg, a, b, c) => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="300" fill="${bg}"/><circle cx="130" cy="120" r="82" fill="${a}"/><rect x="190" y="110" width="150" height="120" rx="26" fill="${b}"/><circle cx="300" cy="70" r="26" fill="${c}"/></svg>`;
const work = (kind, label, title, text, svg) => `<article class="ku-w ${kind}" data-tilt><span class="art">${svg}</span><div><small>${label}</small><h3>${title}</h3><p>${text}</p></div></article>`;

const design = { id: 'signature-056-kreator-1', name: 'Kreator Anggrek Ultra', category: 'Kreator', composition: 'ultra-anggrek-studio-mesh-showcase', html: `${skip}<div class="ku-progress" aria-hidden="true"><i></i></div><header class="ku-head"><a href="#content"><svg viewBox="0 0 300 300" width="34" height="34" aria-hidden="true"><g fill="#a21caf">${petals}</g><circle cx="150" cy="150" r="34" fill="#fde047"/></svg>Anggrek<b>ULTRA</b></a><nav aria-label="Navigasi situs"><a href="#karya">Karya</a><a href="#layanan">Layanan</a><a href="#proses">Proses</a><a href="#angka">Angka</a><a href="#tanya">Tanya</a></nav><a class="ku-cta" href="#kontak">Ajak bekerja sama</a></header><main id="content"><section class="ku-hero"><div class="ku-mesh" aria-hidden="true"><div class="b b1"><i></i></div><div class="b b2"><i></i></div><div class="b b3"><i></i></div></div><div class="ku-spot" aria-hidden="true"></div><div class="ku-copy"><small>STUDIO KREATOR / PROFIL CONTOH</small><h1>Karya yang <span class="ku-rot" data-words="berani|hangat|memikat"><em>berani</em></span> untuk dunia yang melihat.</h1><p>Beranda studio kreatif bergaya perusahaan besar: kanvas bergerak, karya yang bisa disaring, proses kerja yang jelas, dan angka pencapaian. Semua teks di sini adalah contoh.</p><div class="ku-actions"><a class="ku-btn" href="#karya">Lihat karya</a><a class="ku-ghost" href="#proses">Cara kerja kami</a></div></div><div class="ku-flower" aria-hidden="true"><svg viewBox="0 0 300 300"><g fill="#c026d3" opacity=".85">${petals}</g><g fill="#f0abfc" opacity=".9" transform="rotate(36 150 150)">${petals}</g><circle cx="150" cy="150" r="32" fill="#fde047"/></svg></div></section><div class="ku-band" aria-hidden="true"><div><span>STUDIO</span><span>PENERBIT</span><span>GALERI</span><span>FESTIVAL</span><span>MAJALAH</span><span>KOMUNITAS</span><span>STUDIO</span><span>PENERBIT</span><span>GALERI</span><span>FESTIVAL</span><span>MAJALAH</span><span>KOMUNITAS</span></div></div><section class="ku-works" id="karya"><input type="radio" name="kf" id="kf1" checked><input type="radio" name="kf" id="kf2"><input type="radio" name="kf" id="kf3"><input type="radio" name="kf" id="kf4"><h2>Karya pilihan</h2><div class="ku-labels"><label for="kf1">Semua</label><label for="kf2">Foto</label><label for="kf3">Video</label><label for="kf4">Desain</label></div><div class="ku-grid">${work('foto', 'FOTO', 'Seri foto contoh', 'Ringkasan singkat contoh untuk seri foto.', art('#fae8ff', '#a21caf', '#f0abfc', '#fde047'))}${work('video', 'VIDEO', 'Film pendek contoh', 'Ringkasan singkat contoh untuk film pendek.', art('#2a0a3a', '#c026d3', '#6b21a8', '#fde047'))}${work('desain', 'DESAIN', 'Identitas visual contoh', 'Ringkasan singkat contoh untuk proyek desain.', art('#fde047', '#a21caf', '#fdf4ff', '#2a0a3a'))}${work('foto', 'FOTO', 'Potret contoh', 'Ringkasan singkat contoh untuk potret.', art('#f0abfc', '#6b21a8', '#fae8ff', '#fde047'))}${work('desain', 'DESAIN', 'Poster contoh', 'Ringkasan singkat contoh untuk poster.', art('#fdf4ff', '#c026d3', '#2a0a3a', '#f0abfc'))}${work('video', 'VIDEO', 'Dokumenter contoh', 'Ringkasan singkat contoh untuk dokumenter.', art('#a21caf', '#fde047', '#fae8ff', '#2a0a3a'))}</div></section><section class="ku-services" id="layanan"><h2 class="ku-rv">Layanan</h2><div class="ku-svcs"><article class="ku-svc ku-rv" data-tilt><span>01</span><h3>Produksi karya</h3><p>Jelaskan apa yang Anda kerjakan dari awal sampai selesai. Teks ini contoh.</p></article><article class="ku-svc ku-rv" data-tilt><span>02</span><h3>Arahan kreatif</h3><p>Jelaskan cara Anda membantu klien menemukan arah. Teks ini contoh.</p></article><article class="ku-svc ku-rv" data-tilt><span>03</span><h3>Kolaborasi</h3><p>Jelaskan bentuk kerja sama yang Anda terima. Teks ini contoh.</p></article></div></section><section class="ku-steps" id="proses"><h2 class="ku-rv">Proses kerja</h2><ol class="ku-rv"><li><span>1</span><h3>Mengenal</h3><p>Dengarkan kebutuhan dan tujuan klien.</p></li><li><span>2</span><h3>Merancang</h3><p>Susun konsep dan contoh awal untuk disetujui.</p></li><li><span>3</span><h3>Membuat</h3><p>Kerjakan karya dengan tahapan yang terbuka.</p></li><li><span>4</span><h3>Menyerahkan</h3><p>Serahkan hasil akhir beserta berkas pendukung. Teks ini contoh.</p></li></ol></section><section class="ku-stats" id="angka"><h2 class="ku-rv">Angka contoh</h2><ul class="ku-rv"><li><b data-count="150" data-suffix="+">150+</b><span>Proyek selesai</span></li><li><b data-count="60" data-suffix="+">60+</b><span>Klien</span></li><li><b data-count="12" data-suffix="">12</b><span>Penghargaan</span></li><li><b data-count="9" data-suffix=" thn">9 thn</b><span>Pengalaman</span></li></ul><p class="ku-rv">Angka di atas hanya contoh. Ganti dengan data Anda sendiri.</p></section><section class="ku-voices"><h2 class="ku-rv">Kata mereka</h2><div class="ku-vgrid"><blockquote class="ku-rv"><p>Kutipan contoh dari klien yang puas. Ganti dengan ulasan nyata.</p><cite>Nama Klien, Perusahaan</cite></blockquote><blockquote class="ku-rv"><p>Kutipan contoh kedua tentang proses kerja yang menyenangkan.</p><cite>Nama Klien, Lembaga</cite></blockquote></div></section><section class="ku-faq" id="tanya"><h2 class="ku-rv">Pertanyaan umum</h2><details open class="ku-rv"><summary>Bagaimana cara memulai proyek?</summary><p>Jelaskan langkah pertama yang harus dilakukan calon klien.</p></details><details class="ku-rv"><summary>Berapa lama pengerjaannya?</summary><p>Tuliskan perkiraan waktu yang jujur untuk tiap jenis karya.</p></details><details class="ku-rv"><summary>Bagaimana soal hak cipta?</summary><p>Tuliskan kebijakan hak cipta dan lisensi Anda.</p></details></section><section class="ku-end ku-rv" id="kontak"><h2>Punya ide? Mari bicarakan.</h2><p>Ganti dengan alamat surel, tautan, dan cara menghubungi Anda.</p><a class="ku-btn" href="#content">Kembali ke atas</a></section></main>`, css: `@keyframes kflow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@keyframes kblob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-24px) scale(1.12)}}@keyframes kspin{to{transform:rotate(360deg)}}@keyframes kfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}@keyframes kmarq{to{transform:translateX(-50%)}}@keyframes kshine{0%{transform:translateX(-120%) skewX(-18deg)}60%,100%{transform:translateX(220%) skewX(-18deg)}}@keyframes kpulse{0%,100%{box-shadow:0 0 0 0 #c026d366}50%{box-shadow:0 0 0 12px #c026d300}}@keyframes kline{from{transform:scaleY(0)}to{transform:scaleY(1)}}@keyframes kpop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}body{background:#fdf4ff;color:#2a0a3a;font-family:Trebuchet MS,Arial,sans-serif}.ku-progress{position:fixed;left:0;right:0;top:0;height:4px;z-index:9;pointer-events:none}.ku-progress i{display:block;height:100%;background:linear-gradient(90deg,#c026d3,#fde047);transform-origin:0 50%;transform:scaleX(0)}.ku-head{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:14px 6%;background:#fdf4ffe6;border-bottom:3px solid #2a0a3a}@supports(backdrop-filter:blur(8px)){.ku-head{background:#fdf4ffb8;backdrop-filter:blur(10px)}}.ku-head>a:first-child{display:flex;align-items:center;gap:10px;font-size:28px;font-weight:800;letter-spacing:-.03em;text-decoration:none}.ku-head>a:first-child b{font-size:10px;letter-spacing:.3em;background:#a21caf;color:#ffffff;padding:5px 8px;border-radius:6px}.ku-head nav{font-weight:700;font-size:13px;gap:4px}.ku-head nav a{padding:8px 13px;border-radius:99px;transition:background .25s,color .25s}.ku-head nav a:hover,.ku-head nav a.on{background:#2a0a3a;color:#fdf4ff}.ku-cta{padding:11px 22px;border-radius:99px;background:#a21caf;color:#ffffff;font-weight:800;font-size:13px;text-decoration:none;transition:transform .2s,background .2s}.ku-cta:hover{transform:translateY(-2px);background:#2a0a3a}main{padding:0 6%}.ku-hero{position:relative;overflow:hidden;display:grid;grid-template-columns:1.25fr .75fr;gap:30px;align-items:center;margin-top:18px;padding:84px 7%;border-radius:44px;border:4px solid #2a0a3a;background:linear-gradient(120deg,#fae8ff,#f5d0fe,#fdf4ff,#f0abfc);background-size:300% 300%;animation:kflow 18s ease infinite;--mx:60%;--my:30%;--px:0;--py:0}.ku-mesh,.ku-spot{position:absolute;inset:0;pointer-events:none}.ku-spot{background:radial-gradient(440px circle at var(--mx) var(--my),#ffffffcc,#fdf4ff00 65%)}.ku-mesh .b{position:absolute;transform:translate3d(calc(var(--px) * var(--k)),calc(var(--py) * var(--k)),0);transition:transform .35s ease-out}.ku-mesh .b i{display:block;width:100%;height:100%;border-radius:50%;filter:blur(34px);animation:kblob 12s ease-in-out infinite}.b1{--k:60px;width:340px;height:340px;left:-80px;top:-90px}.b1 i{background:#e879f9aa}.b2{--k:-50px;width:300px;height:300px;right:10%;bottom:-100px}.b2 i{background:#fde047aa;animation-duration:15s;animation-delay:-4s}.b3{--k:40px;width:240px;height:240px;right:-60px;top:6%}.b3 i{background:#c026d3aa;animation-duration:10s;animation-delay:-2s}.ku-copy{position:relative}.ku-copy small{font-size:11px;font-weight:800;letter-spacing:.14em;background:#2a0a3a;color:#f0abfc;padding:6px 12px;border-radius:99px}.ku-hero h1{font-size:clamp(40px,6.6vw,92px);line-height:1;letter-spacing:-.05em;margin:26px 0;max-width:860px}.ku-rot em{display:inline-block;font-style:italic;color:#a21caf;text-shadow:0 0 28px #f0abfc,0 0 4px #fdf4ff;transition:opacity .3s,transform .3s}.ku-rot em.out{opacity:0;transform:translateY(.25em)}.ku-hero p{max-width:540px;font-size:18px;line-height:1.75}.ku-actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px}.ku-btn{position:relative;overflow:hidden;display:inline-block;padding:16px 32px;border-radius:99px;background:#2a0a3a;color:#fdf4ff;font-weight:800;font-size:14px;text-decoration:none;box-shadow:5px 5px 0 #c026d3;transform:translate(var(--bx,0px),var(--by,0px));transition:transform .2s,box-shadow .2s}.ku-btn:before{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,#ffffff00,#ffffff55,#ffffff00);animation:kshine 4.5s ease-in-out infinite}.ku-btn:hover{box-shadow:8px 8px 0 #c026d3}.ku-ghost{display:inline-block;padding:14px 30px;border-radius:99px;border:3px solid #2a0a3a;font-weight:800;font-size:14px;text-decoration:none;transition:background .25s,color .25s}.ku-ghost:hover{background:#2a0a3a;color:#fdf4ff}.ku-flower{position:relative;aspect-ratio:1;display:grid;place-items:center;animation:kfloat 8s ease-in-out infinite}.ku-flower svg{width:92%;height:auto;animation:kspin 60s linear infinite}.ku-band{overflow:hidden;margin:34px -6% 0;padding:14px 0;background:#2a0a3a;color:#f0abfc;white-space:nowrap;font-weight:900;font-size:20px;letter-spacing:.16em}.ku-band>div{display:inline-flex;gap:40px;animation:kmarq 30s linear infinite}.ku-band:hover>div{animation-play-state:paused}.ku-works{position:relative;padding:60px 0 20px}.ku-works h2,.ku-services h2,.ku-steps h2,.ku-stats h2,.ku-voices h2,.ku-faq h2,.ku-end h2{font-size:clamp(26px,3.4vw,40px);letter-spacing:-.02em}.ku-labels{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 20px}.ku-labels label{padding:11px 24px;border-radius:99px;border:3px solid #2a0a3a;font-weight:800;font-size:13px;cursor:pointer;background:#ffffff;transition:background .2s,transform .2s}.ku-labels label:hover{background:#f0abfc;transform:translateY(-2px)}#kf1:checked~.ku-labels label[for=kf1],#kf2:checked~.ku-labels label[for=kf2],#kf3:checked~.ku-labels label[for=kf3],#kf4:checked~.ku-labels label[for=kf4]{background:#2a0a3a;color:#fdf4ff}#kf1:focus-visible~.ku-labels label[for=kf1],#kf2:focus-visible~.ku-labels label[for=kf2],#kf3:focus-visible~.ku-labels label[for=kf3],#kf4:focus-visible~.ku-labels label[for=kf4]{outline:3px solid #a21caf;outline-offset:4px}.ku-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}#kf2:checked~.ku-grid .ku-w:not(.foto),#kf3:checked~.ku-grid .ku-w:not(.video),#kf4:checked~.ku-grid .ku-w:not(.desain){display:none}.ku-w,.ku-svc{position:relative;overflow:hidden;background:#ffffff;border:3px solid #2a0a3a;border-radius:26px;transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .25s ease-out,box-shadow .25s;animation:kpop .45s ease both}.ku-w:hover{box-shadow:8px 8px 0 #c026d3}.ku-w .art{display:block;aspect-ratio:4/3;overflow:hidden;border-bottom:3px solid #2a0a3a}.ku-w .art svg{display:block;width:100%;height:100%;transition:transform .6s ease}.ku-w:hover .art svg{transform:scale(1.1) rotate(1.5deg)}.ku-w>div{padding:20px 22px 24px}.ku-w small{font-size:10px;font-weight:800;letter-spacing:.14em;color:#86198f}.ku-w h3{font-size:21px;margin:8px 0}.ku-w p{margin:0;font-size:14px;line-height:1.65}.ku-services{padding:50px 0 20px}.ku-svcs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:20px}.ku-svc{padding:30px;background:#f0abfc;animation:none}.ku-svc:nth-child(2){background:#fde047}.ku-svc:nth-child(3){background:#ffffff}.ku-svc span{font-weight:800;font-size:13px;letter-spacing:.14em}.ku-svc h3{font-size:24px;margin:16px 0 10px}.ku-svc p{margin:0;line-height:1.7}.ku-steps{padding:50px 0 20px}.ku-steps ol{position:relative;list-style:none;margin:24px 0 0;padding:0 0 0 34px;display:grid;gap:16px;max-width:720px}.ku-steps ol:before{content:"";position:absolute;left:11px;top:6px;bottom:6px;width:4px;border-radius:4px;background:linear-gradient(#c026d3,#fde047);transform-origin:50% 0}.ku-js .ku-steps ol:before{transform:scaleY(0)}.ku-js .ku-steps ol.in:before{animation:kline 1.4s ease-out .2s both}.ku-steps li{position:relative;padding:20px 24px;border-radius:22px;background:#ffffff;border:3px solid #2a0a3a}.ku-steps li span{position:absolute;left:-46px;top:20px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#c026d3;color:#ffffff;border:3px solid #2a0a3a;font-weight:800;font-size:13px;animation:kpulse 2.8s ease-out infinite}.ku-steps h3{font-size:21px;margin:0 0 6px}.ku-steps p{margin:0;line-height:1.7}.ku-stats{padding:50px 0 20px}.ku-stats ul{list-style:none;margin:20px 0 14px;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.ku-stats li{padding:24px 16px;border-radius:24px;background:#2a0a3a;color:#fdf4ff;text-align:center}.ku-stats b{display:block;font-size:clamp(30px,4.4vw,52px);line-height:1;letter-spacing:-.03em;color:#f0abfc}.ku-stats li span{display:block;margin-top:10px;font-weight:700;font-size:13px}.ku-stats>p{margin:0;font-size:13px;line-height:1.7}.ku-voices{padding:50px 0 20px}.ku-vgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:20px}.ku-voices blockquote{margin:0;padding:28px;border-radius:26px;background:#ffffff;border:3px solid #2a0a3a}.ku-voices blockquote p{margin:0 0 14px;font-size:18px;line-height:1.7;font-style:italic}.ku-voices cite{font-style:normal;font-weight:800;font-size:13px;color:#86198f}.ku-faq{max-width:760px;padding:50px 0 20px}.ku-faq details{padding:18px 22px;margin-bottom:12px;border-radius:18px;background:#ffffff;border:3px solid #2a0a3a;font-weight:700;font-size:16px;transition:background .25s}.ku-faq details[open]{background:#fae8ff}.ku-faq summary{list-style:none}.ku-faq summary::-webkit-details-marker{display:none}.ku-faq summary:after{content:"+";float:right;font-size:22px;line-height:1;transition:transform .25s}.ku-faq details[open] summary:after{transform:rotate(45deg)}.ku-faq p{margin:12px 0 0;font-weight:400;font-size:15px;line-height:1.75}.ku-end{margin:50px 0 56px;padding:56px 7%;border-radius:40px;background:linear-gradient(135deg,#86198f,#a21caf,#701a75,#a21caf);background-size:300% 300%;animation:kflow 14s ease infinite;color:#fdf4ff;border:4px solid #2a0a3a}.ku-end p{max-width:520px;line-height:1.8}.ku-end .ku-btn{background:#fdf4ff;color:#2a0a3a;box-shadow:5px 5px 0 #fde047}.ku-js .ku-rv{opacity:0;transform:translateY(26px);transition:opacity .7s ease var(--d,0ms),transform .7s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}.ku-js .ku-rv.in{opacity:1;transform:none}.ku-js .ku-svc.ku-rv.in{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .25s ease-out,box-shadow .25s,opacity .7s}@media(max-width:900px){.ku-hero{grid-template-columns:1fr;padding:56px 6% 48px;border-radius:30px}.ku-flower{max-width:240px;margin:0 auto}.ku-grid,.ku-svcs,.ku-vgrid{grid-template-columns:1fr}.ku-stats ul{grid-template-columns:repeat(2,minmax(0,1fr))}.ku-end{padding:36px 6%}.ku-head nav{display:none}}@media(max-width:560px){.ku-head>a:first-child{font-size:24px}.ku-cta{padding:9px 16px}}`, javascript: `(function(){
  var doc=document,root=doc.documentElement,win=window;
  var reduce=!!(win.matchMedia&&win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.classList.add('ku-js');
  var each=function(list,fn){Array.prototype.slice.call(list||[]).forEach(fn);};
  var bar=doc.querySelector('.ku-progress i');
  var hero=doc.querySelector('.ku-hero');
  var links=Array.prototype.slice.call(doc.querySelectorAll('.ku-head nav a'));
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

  var items=doc.querySelectorAll('.ku-rv');
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

  if(!reduce&&hero){
    hero.addEventListener('pointermove',function(e){
      var r=hero.getBoundingClientRect();
      hero.style.setProperty('--mx',(e.clientX-r.left).toFixed(0)+'px');
      hero.style.setProperty('--my',(e.clientY-r.top).toFixed(0)+'px');
      hero.style.setProperty('--px',((e.clientX-r.left)/r.width-0.5).toFixed(3));
      hero.style.setProperty('--py',((e.clientY-r.top)/r.height-0.5).toFixed(3));
    },{passive:true});
    hero.addEventListener('pointerleave',function(){
      hero.style.setProperty('--px','0');
      hero.style.setProperty('--py','0');
    });
  }

  if(!reduce){
    each(doc.querySelectorAll('[data-tilt]'),function(card){
      card.addEventListener('pointermove',function(e){
        if(e.pointerType==='touch')return;
        var r=card.getBoundingClientRect();
        var px=(e.clientX-r.left)/r.width-0.5,py=(e.clientY-r.top)/r.height-0.5;
        card.style.setProperty('--rx',(py*-6).toFixed(2)+'deg');
        card.style.setProperty('--ry',(px*6).toFixed(2)+'deg');
      });
      card.addEventListener('pointerleave',function(){
        card.style.setProperty('--rx','0deg');
        card.style.setProperty('--ry','0deg');
      });
    });
    each(doc.querySelectorAll('.ku-btn'),function(btn){
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

  var rot=doc.querySelector('.ku-rot');
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
export const PREMIUM_UPGRADED_056 = Object.freeze([Object.freeze({ id: design.id, name: design.name, category: design.category, composition: design.composition, code: Object.freeze({ html: design.html, css: base + design.css, javascript: design.javascript }) })]);
if (!PREVIOUS.some(theme => theme.id === design.id)) throw new Error('Upgrade target missing: ' + design.id);
export const PREMIUM_BRIGHT_GENERATED = Object.freeze(PREVIOUS.map(theme => theme.id === design.id ? PREMIUM_UPGRADED_056[0] : theme));
if (PREMIUM_BRIGHT_GENERATED.length !== PREVIOUS.length) throw new Error('Invalid upgraded bright theme 056');
