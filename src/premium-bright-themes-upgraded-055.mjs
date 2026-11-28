// Pembaruan Ultra untuk tema 055 (Editorial Tosca 5), di atas hasil upgrade 051-054. ID tetap; tema lain tidak berubah.
// CSS, SVG sebaris, dan JavaScript sebaris (tanpa pustaka, tanpa jaringan). Tanpa aset eksternal.
// Tanpa JavaScript (mis. thumbnail sandbox) seluruh konten tetap terlihat; animasi mati saat reduced-motion.
import { PREMIUM_BRIGHT_GENERATED as PREVIOUS } from './premium-bright-themes-upgraded-054.mjs';

const skip = '<a class="skip" href="#content">Lewati ke konten</a>';
const base = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0}a{color:inherit;text-underline-offset:4px}a:focus-visible,summary:focus-visible,input:focus-visible+label,.tu-big:focus-visible,.tu-card:focus-visible{outline:3px solid currentColor;outline-offset:4px}h1,h2,h3,p,figure,ol,ul,dl,dd{margin-top:0}main,section,article,aside,div,li{min-width:0}.skip{position:absolute;top:-100px;left:12px;z-index:10;padding:12px;background:#ffffff;color:#000000}.skip:focus{top:12px}summary{cursor:pointer}nav{display:flex;gap:20px;flex-wrap:wrap}nav a{text-decoration:none}h1,h2,h3,p,a,dt,dd,li,label,summary{overflow-wrap:anywhere}input[type=radio]{position:absolute;opacity:0;pointer-events:none}svg{max-width:100%}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}}`;

const wave = '<svg viewBox="0 0 2400 80" preserveAspectRatio="none"><path d="M0 40C150 0 450 80 600 40C750 0 1050 80 1200 40C1350 0 1650 80 1800 40C1950 0 2250 80 2400 40V80H0Z"/></svg>';

const design = { id: 'signature-055-editorial-5', name: 'Editorial Tosca Ultra', category: 'Editorial', composition: 'ultra-tosca-waves-ripple-countup', html: `${skip}<div class="tu-progress" aria-hidden="true"><i></i></div><header class="tu-head"><a href="#content"><svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#0f766e"/><path d="M6 22c4-6 8-6 12 0s8 6 12 0 4-3 4-3" fill="none" stroke="#99f6e4" stroke-width="3" stroke-linecap="round"/><path d="M6 29c4-6 8-6 12 0s8 6 12 0 4-3 4-3" fill="none" stroke="#5eead4" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="12" r="3" fill="#ffe27a"/></svg>Tosca<b>ULTRA</b></a><nav aria-label="Navigasi situs"><a href="#sorotan">Sorotan</a><a href="#angka">Angka</a><a href="#rubrik">Rubrik</a><a href="#tanya">Tanya redaksi</a></nav></header><main id="content"><section class="tu-hero"><div class="tu-glow" aria-hidden="true"></div><div class="tu-bubs" aria-hidden="true"><span style="--s:30px;left:6%;top:24%;--dl:0s"></span><span style="--s:18px;left:14%;top:62%;--dl:-2s"></span><span style="--s:42px;right:9%;top:14%;--dl:-4s"></span><span style="--s:24px;right:22%;top:52%;--dl:-1s"></span><span style="--s:14px;left:46%;top:18%;--dl:-3s"></span><span style="--s:34px;right:4%;top:60%;--dl:-5s"></span></div><div class="tu-copy"><small>RUANG TULISAN / EDISI CONTOH</small><h1>Tulisan yang <span class="tu-rot" data-words="jernih|tenang|mengalir"><em>jernih</em></span> dan enak dibaca.</h1><p>Beranda editorial yang hidup: gelombang bergerak pelan, riak muncul saat Anda menyentuh, dan setiap bagian muncul saat Anda menggulir. Semua teks di sini adalah contoh.</p><div class="tu-actions"><a class="tu-btn" href="#sorotan">Baca tulisan</a><a class="tu-ghost" href="#rubrik">Lihat rubrik</a></div></div><div class="tu-waves" aria-hidden="true"><div class="w1">${wave}</div><div class="w2">${wave}</div><div class="w3">${wave}</div></div></section><div class="tu-band" aria-hidden="true"><div><span>ESAI</span><span>LIPUTAN</span><span>OPINI</span><span>CATATAN</span><span>WAWANCARA</span><span>ESAI</span><span>LIPUTAN</span><span>OPINI</span><span>CATATAN</span><span>WAWANCARA</span></div></div><section class="tu-feature" id="sorotan"><article class="tu-big tu-rv" data-tilt><small>TULISAN UNGGULAN</small><h2>Judul panjang yang membuat pembaca berhenti menggulir.</h2><p>Paragraf pembuka contoh. Ganti dengan tulisan Anda agar halaman ini menjadi milik Anda.</p><a href="#rubrik">Lihat rubrik</a></article><article class="tu-card c1 tu-rv" data-tilt><small>KOLOM</small><h3>Judul kolom contoh</h3><p>Ringkasan singkat contoh.</p></article><article class="tu-card c2 tu-rv" data-tilt><small>ESAI</small><h3>Judul esai contoh</h3><p>Ringkasan singkat contoh.</p></article><article class="tu-card c3 tu-rv" data-tilt><small>CATATAN</small><h3>Judul catatan contoh</h3><p>Ringkasan singkat contoh.</p></article></section><section class="tu-stats" id="angka"><h2 class="tu-rv">Angka contoh</h2><ul class="tu-rv"><li><b data-count="120" data-suffix="+">120+</b><span>Tulisan terbit</span></li><li><b data-count="48" data-suffix="">48</b><span>Penulis tamu</span></li><li><b data-count="12" data-suffix="rb">12rb</b><span>Pembaca per bulan</span></li></ul><p class="tu-rv">Angka di atas hanya contoh. Ganti dengan data Anda sendiri.</p></section><section class="tu-tabs" id="rubrik"><input type="radio" name="tu" id="tu1" checked><input type="radio" name="tu" id="tu2"><input type="radio" name="tu" id="tu3"><h2>Pilih rubrik</h2><div class="tu-labels"><label for="tu1">Esai</label><label for="tu2">Liputan</label><label for="tu3">Opini</label></div><div class="tu-panels"><div class="p1"><h3>Esai</h3><p>Tempat untuk tulisan panjang yang pelan dan mendalam. Teks ini contoh.</p></div><div class="p2"><h3>Liputan</h3><p>Tempat untuk laporan lapangan dan wawancara. Teks ini contoh.</p></div><div class="p3"><h3>Opini</h3><p>Tempat untuk pendapat penulis, lengkap dengan namanya. Teks ini contoh.</p></div></div></section><section class="tu-faq" id="tanya"><h2 class="tu-rv">Tanya redaksi</h2><details open class="tu-rv"><summary>Bagaimana cara mengirim tulisan?</summary><p>Jelaskan alamat dan format naskah yang Anda terima.</p></details><details class="tu-rv"><summary>Berapa lama proses penyuntingan?</summary><p>Tuliskan perkiraan waktu yang jujur untuk penulis.</p></details><details class="tu-rv"><summary>Apakah tulisan boleh dikutip?</summary><p>Tuliskan kebijakan kutipan dan hak cipta Anda.</p></details></section><section class="tu-end tu-rv"><h2>Terima kasih sudah membaca.</h2><p>Ganti dengan pengantar, kebijakan, dan cara menghubungi redaksi.</p></section></main>`, css: `@keyframes tflow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@keyframes twave{to{transform:translateX(-50%)}}@keyframes tbub{0%,100%{transform:translateY(0) scale(1);opacity:.75}50%{transform:translateY(-22px) scale(1.08);opacity:1}}@keyframes tmarq{to{transform:translateX(-50%)}}@keyframes tshine{0%{transform:translateX(-120%) skewX(-18deg)}60%,100%{transform:translateX(220%) skewX(-18deg)}}@keyframes tpulse{0%,100%{box-shadow:0 0 0 0 #14b8a666}50%{box-shadow:0 0 0 12px #14b8a600}}@keyframes tline{from{transform:scaleY(0)}to{transform:scaleY(1)}}@keyframes trip{to{transform:scale(12);opacity:0}}@keyframes tpanel{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}body{background:#effffb;color:#022c2b;font-family:Georgia,serif}.tu-progress{position:fixed;left:0;right:0;top:0;height:4px;z-index:9;pointer-events:none}.tu-progress i{display:block;height:100%;background:linear-gradient(90deg,#14b8a6,#ffe27a);transform-origin:0 50%;transform:scaleX(0)}.tu-head{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;padding:16px 6%;background:#effffbe6;border-bottom:3px solid #022c2b}@supports(backdrop-filter:blur(8px)){.tu-head{background:#effffbb8;backdrop-filter:blur(10px)}}.tu-head>a{display:flex;align-items:center;gap:10px;font-size:30px;font-weight:700;letter-spacing:-.03em;text-decoration:none}.tu-head>a b{font:800 10px Arial,sans-serif;letter-spacing:.3em;background:#0f766e;color:#ffffff;padding:5px 8px;border-radius:6px}.tu-head nav{font:700 13px Arial,sans-serif;gap:6px}.tu-head nav a{padding:8px 14px;border-radius:99px;transition:background .25s,color .25s}.tu-head nav a:hover,.tu-head nav a.on{background:#022c2b;color:#effffb}main{padding:0 6%}.tu-hero{position:relative;overflow:hidden;margin-top:18px;padding:84px 7% 150px;border-radius:40px;border:4px solid #022c2b;background:linear-gradient(120deg,#ccfbf1,#a7f3d0,#e6fffa,#99f6e4);background-size:300% 300%;animation:tflow 16s ease infinite;--mx:72%;--my:28%}.tu-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(420px circle at var(--mx) var(--my),#ffffffd9,#e6fffa00 65%)}.tu-bubs{position:absolute;inset:0;pointer-events:none}.tu-bubs span{position:absolute;width:var(--s);height:var(--s);border-radius:50%;border:2px solid #ffffffcc;background:radial-gradient(circle at 30% 30%,#ffffffcc,#5eead455);animation:tbub 7s ease-in-out infinite;animation-delay:var(--dl,0s)}.tu-copy{position:relative}.tu-copy small{font:800 11px Arial,sans-serif;letter-spacing:.14em;background:#022c2b;color:#99f6e4;padding:6px 12px;border-radius:99px}.tu-hero h1{font-size:clamp(42px,7.2vw,98px);line-height:.98;letter-spacing:-.05em;margin:26px 0;max-width:860px}.tu-rot em{display:inline-block;font-style:italic;color:#0f766e;text-shadow:0 0 26px #5eead4,0 0 4px #effffb;transition:opacity .3s,transform .3s}.tu-rot em.out{opacity:0;transform:translateY(.25em)}.tu-hero p{max-width:540px;font-size:18px;line-height:1.75}.tu-actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px}.tu-btn{position:relative;overflow:hidden;display:inline-block;padding:16px 32px;border-radius:99px;background:#022c2b;color:#effffb;font:800 14px Arial,sans-serif;text-decoration:none;box-shadow:5px 5px 0 #14b8a6;transform:translate(var(--mx,0px),var(--my,0px));transition:transform .2s,box-shadow .2s}.tu-btn:before{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,#ffffff00,#ffffff55,#ffffff00);animation:tshine 4.5s ease-in-out infinite}.tu-btn:hover{box-shadow:8px 8px 0 #14b8a6}.tu-ghost{display:inline-block;padding:14px 30px;border-radius:99px;border:3px solid #022c2b;font:800 14px Arial,sans-serif;text-decoration:none;transition:background .25s,color .25s}.tu-ghost:hover{background:#022c2b;color:#effffb}.tu-waves{position:absolute;left:0;right:0;bottom:0;height:110px;pointer-events:none}.tu-waves div{position:absolute;left:0;bottom:0;width:200%;height:100%}.tu-waves svg{display:block;width:100%;height:100%}.tu-waves .w1{animation:twave 18s linear infinite}.tu-waves .w1 path{fill:#14b8a6;opacity:.35}.tu-waves .w2{height:84%;animation:twave 12s linear infinite reverse}.tu-waves .w2 path{fill:#0d9488;opacity:.45}.tu-waves .w3{height:62%;animation:twave 8s linear infinite}.tu-waves .w3 path{fill:#effffb}.tu-ripple{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:2px solid #0d9488;pointer-events:none;animation:trip .9s ease-out forwards}.tu-band{overflow:hidden;margin:34px -6% 0;padding:14px 0;background:#022c2b;color:#99f6e4;white-space:nowrap;font:900 20px Arial,sans-serif;letter-spacing:.14em}.tu-band>div{display:inline-flex;gap:36px;animation:tmarq 26s linear infinite}.tu-band:hover>div{animation-play-state:paused}.tu-feature{display:grid;grid-template-columns:1.6fr 1fr 1fr;grid-template-rows:auto auto;gap:18px;padding:60px 0;perspective:1000px}.tu-big,.tu-card{position:relative;overflow:hidden;transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .25s ease-out,box-shadow .25s;--gx:50%;--gy:50%}.tu-big:after,.tu-card:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(240px circle at var(--gx) var(--gy),#ffffff55,#ffffff00 70%);opacity:0;transition:opacity .25s}.tu-big:hover:after,.tu-card:hover:after{opacity:1}.tu-big{grid-row:span 2;padding:40px;border-radius:32px;background:#0f766e;color:#effffb;border:4px solid #022c2b}.tu-big small,.tu-card small{font:800 10px Arial,sans-serif;letter-spacing:.14em}.tu-big h2{font-size:clamp(28px,3.8vw,48px);line-height:1.08;margin:18px 0}.tu-big p{line-height:1.8;max-width:480px}.tu-big a{display:inline-block;margin-top:6px;padding:11px 22px;border-radius:99px;background:#effffb;color:#022c2b;font:800 13px Arial,sans-serif;text-decoration:none}.tu-card{padding:26px;border-radius:26px;border:4px solid #022c2b;background:#99f6e4}.tu-card.c2{background:#ffe27a}.tu-card.c3{grid-column:span 2;background:#ffd0c2}.tu-card h3{font-size:23px;margin:10px 0}.tu-card p{margin:0;font-size:14px}.tu-stats{padding:10px 0 50px}.tu-stats h2,.tu-tabs h2,.tu-faq h2,.tu-end h2{font-size:clamp(26px,3.4vw,38px);letter-spacing:-.02em}.tu-stats ul{list-style:none;margin:20px 0 14px;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.tu-stats li{padding:26px;border-radius:26px;background:#ffffff;border:3px solid #022c2b;text-align:center}.tu-stats b{display:block;font-size:clamp(34px,5vw,58px);line-height:1;letter-spacing:-.03em;color:#0f766e}.tu-stats li span{display:block;margin-top:10px;font:700 13px Arial,sans-serif}.tu-stats>p{margin:0;font:13px/1.7 Arial,sans-serif}.tu-tabs{position:relative;padding:10px 0 44px}.tu-labels{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.tu-labels label{padding:12px 26px;border-radius:99px;border:3px solid #022c2b;font:800 13px Arial,sans-serif;cursor:pointer;background:#ffffff;transition:background .2s,transform .2s}.tu-labels label:hover{background:#99f6e4;transform:translateY(-2px)}#tu1:checked~.tu-labels label[for=tu1],#tu2:checked~.tu-labels label[for=tu2],#tu3:checked~.tu-labels label[for=tu3]{background:#022c2b;color:#effffb}#tu1:focus-visible~.tu-labels label[for=tu1],#tu2:focus-visible~.tu-labels label[for=tu2],#tu3:focus-visible~.tu-labels label[for=tu3]{outline:3px solid #0f766e;outline-offset:4px}.tu-panels>div{display:none;padding:28px;border-radius:24px;border:3px solid #022c2b;background:#ffffff}.tu-panels h3{font-size:24px}.tu-panels p{margin:0;line-height:1.8}#tu1:checked~.tu-panels .p1,#tu2:checked~.tu-panels .p2,#tu3:checked~.tu-panels .p3{display:block;animation:tpanel .45s ease both}.tu-faq{max-width:760px;padding:10px 0 44px}.tu-faq details{padding:18px 22px;margin-bottom:12px;border-radius:18px;background:#ffffff;border:3px solid #022c2b;font:700 16px Arial,sans-serif;transition:background .25s}.tu-faq details[open]{background:#ccfbf1}.tu-faq summary{list-style:none}.tu-faq summary::-webkit-details-marker{display:none}.tu-faq summary:after{content:"+";float:right;font-size:22px;line-height:1;transition:transform .25s}.tu-faq details[open] summary:after{transform:rotate(45deg)}.tu-faq p{margin:12px 0 0;font:400 15px/1.75 Georgia,serif}.tu-end{margin-bottom:56px;padding:46px;border-radius:34px;background:linear-gradient(135deg,#0f766e,#115e59,#0f766e);background-size:200% 200%;animation:tflow 12s ease infinite;color:#effffb;border:4px solid #022c2b}.tu-end p{margin:0;line-height:1.8}.tu-js .tu-rv{opacity:0;transform:translateY(26px);transition:opacity .7s ease var(--d,0ms),transform .7s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}.tu-js .tu-rv.in{opacity:1;transform:none}.tu-js .tu-big.tu-rv.in,.tu-js .tu-card.tu-rv.in{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .25s ease-out,box-shadow .25s,opacity .7s}@media(max-width:820px){.tu-hero{padding:56px 6% 120px;border-radius:28px}.tu-bubs span{opacity:.6}.tu-feature{grid-template-columns:1fr}.tu-big{grid-row:auto;padding:28px}.tu-card.c3{grid-column:auto}.tu-stats ul{grid-template-columns:1fr}.tu-end{padding:30px}.tu-head nav a{padding:6px 10px}}`, javascript: `(function(){
  var doc=document,root=doc.documentElement,win=window;
  var reduce=!!(win.matchMedia&&win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.classList.add('tu-js');
  var each=function(list,fn){Array.prototype.slice.call(list||[]).forEach(fn);};
  var bar=doc.querySelector('.tu-progress i');
  var hero=doc.querySelector('.tu-hero');
  var links=Array.prototype.slice.call(doc.querySelectorAll('.tu-head nav a'));
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

  var items=doc.querySelectorAll('.tu-rv');
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
    var t0=null,dur=1400;
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
    },{passive:true});
    hero.addEventListener('pointerdown',function(e){
      var r=hero.getBoundingClientRect();
      var ring=doc.createElement('span');
      ring.className='tu-ripple';
      ring.style.left=(e.clientX-r.left).toFixed(0)+'px';
      ring.style.top=(e.clientY-r.top).toFixed(0)+'px';
      hero.appendChild(ring);
      win.setTimeout(function(){if(ring.parentNode)ring.parentNode.removeChild(ring);},1000);
    });
  }

  if(!reduce){
    each(doc.querySelectorAll('[data-tilt]'),function(card){
      card.addEventListener('pointermove',function(e){
        if(e.pointerType==='touch')return;
        var r=card.getBoundingClientRect();
        var px=(e.clientX-r.left)/r.width-0.5,py=(e.clientY-r.top)/r.height-0.5;
        card.style.setProperty('--rx',(py*-7).toFixed(2)+'deg');
        card.style.setProperty('--ry',(px*7).toFixed(2)+'deg');
        card.style.setProperty('--gx',((px+0.5)*100).toFixed(0)+'%');
        card.style.setProperty('--gy',((py+0.5)*100).toFixed(0)+'%');
      });
      card.addEventListener('pointerleave',function(){
        card.style.setProperty('--rx','0deg');
        card.style.setProperty('--ry','0deg');
      });
    });
    each(doc.querySelectorAll('.tu-btn'),function(btn){
      btn.addEventListener('pointermove',function(e){
        if(e.pointerType==='touch')return;
        var r=btn.getBoundingClientRect();
        btn.style.setProperty('--mx',((e.clientX-r.left-r.width/2)*0.16).toFixed(1)+'px');
        btn.style.setProperty('--my',((e.clientY-r.top-r.height/2)*0.26).toFixed(1)+'px');
      });
      btn.addEventListener('pointerleave',function(){
        btn.style.setProperty('--mx','0px');
        btn.style.setProperty('--my','0px');
      });
    });
  }

  var rot=doc.querySelector('.tu-rot');
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
export const PREMIUM_UPGRADED_055 = Object.freeze([Object.freeze({ id: design.id, name: design.name, category: design.category, composition: design.composition, code: Object.freeze({ html: design.html, css: base + design.css, javascript: design.javascript }) })]);
if (!PREVIOUS.some(theme => theme.id === design.id)) throw new Error('Upgrade target missing: ' + design.id);
export const PREMIUM_BRIGHT_GENERATED = Object.freeze(PREVIOUS.map(theme => theme.id === design.id ? PREMIUM_UPGRADED_055[0] : theme));
if (PREMIUM_BRIGHT_GENERATED.length !== PREVIOUS.length) throw new Error('Invalid upgraded bright theme 055');
