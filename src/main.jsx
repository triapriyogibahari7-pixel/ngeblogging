import React, { Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Bell,
  BookOpen,
  ChevronDown,
  FileText,
  Globe2,
  LayoutDashboard,
  Menu,
  MessageCircle,
  PenLine,
  Search,
  Sparkles,
  Users,
  X,
  Zap,
  Undo2,
  Redo2,
  Save,
  Table2,
  Image,
  Bold,
  Italic,
  Underline,
  Eye,
  Send,
} from "lucide-react";
import "./styles.css";
import AuthModal from "./AuthModal";
import NaraAssistant from "./NaraAssistant";
import { signOut, supabase, supabaseConfigured } from "./lib/supabase";
import { consumeAuthCallbackV162 } from "./lib/auth-callback-v162.js";

const Studio = lazy(() => import("./Studio"));
const PublicSite = lazy(() => import("./PublicSite"));

function clearAuthQuery() {
  const url = new URL(window.location.href);
  ["auth", "code", "error", "error_code", "error_description"].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}
const cards = [
  [
    "Blog Pribadi",
    "Ruang autentik untuk cerita, pemikiran, dan perjalanan Anda.",
    "01",
  ],
  [
    "Website Bisnis",
    "Bangun kredibilitas dan hadir lebih dekat dengan pelanggan.",
    "02",
  ],
  [
    "Portal Berita",
    "Terbitkan kabar dengan alur redaksi yang cepat dan rapi.",
    "03",
  ],
  [
    "Portofolio",
    "Tampilkan karya terbaik dan biarkan kualitas Anda berbicara.",
    "04",
  ],
];
const features = [
  [
    "Editor yang fokus",
    "Menulis tanpa gangguan dengan autosave, Markdown, SEO, dan pratinjau responsif.",
    PenLine,
  ],
  [
    "Nara AI",
    "Dari ide hingga draf siap terbit—tetap dengan kendali penuh di tangan Anda.",
    Sparkles,
  ],
  [
    "Satu ruang kerja",
    "Artikel, halaman, media, tim, komentar, dan analitik dalam satu tempat.",
    LayoutDashboard,
  ],
  [
    "Tumbuh bersama",
    "Subdomain gratis, custom domain, newsletter, dan komunitas saat Anda siap.",
    Globe2,
  ],
];
function EditorPreview() {
  return (
    <div className="word-editor">
      <div className="word-title">
        <div>
          <FileText />
          <span>
            <b>Peluang Digital UMKM Kalimantan</b>
            <small>Disimpan otomatis · beberapa detik lalu</small>
          </span>
        </div>
        <div>
          <button>
            <Eye /> Pratinjau
          </button>
          <button className="publish">
            <Send /> Terbitkan
          </button>
        </div>
      </div>
      <div className="ribbon-tabs">
        <b>Beranda</b>
        <span>Sisipkan</span>
        <span>Tata letak</span>
        <span>Referensi</span>
        <span>Tinjau</span>
        <span>SEO</span>
      </div>
      <div className="ribbon">
        <span>
          <Undo2 />
          <Redo2 />
          <Save />
        </span>
        <label>
          Gaya <b>Judul 1⌄</b>
        </label>
        <label>
          Font <b>DM Sans⌄</b>
        </label>
        <span>
          <Bold />
          <Italic />
          <Underline />
        </span>
        <span>
          <Table2 />
          <Image />
        </span>
        <button>
          <Sparkles /> Tulis dengan Nara
        </button>
      </div>
      <div className="editor-body">
        <div className="page" contentEditable suppressContentEditableWarning>
          <h1>Peluang Digital untuk UMKM Kalimantan</h1>
          <p className="byline">Oleh John Harris · 8 menit membaca</p>
          <p>
            <b>Transformasi digital</b> membuka jalan baru bagi pelaku usaha
            lokal untuk menjangkau pelanggan lebih luas, bekerja lebih efisien,
            dan membangun merek yang bertahan lama.
          </p>
          <h2>Lima langkah untuk memulai</h2>
          <table>
            <tbody>
              <tr>
                <th>Prioritas</th>
                <th>Tindakan</th>
                <th>Target</th>
              </tr>
              <tr>
                <td>Identitas digital</td>
                <td>Bangun situs dan profil usaha</td>
                <td>Minggu 1</td>
              </tr>
              <tr>
                <td>Konten</td>
                <td>Terbitkan cerita produk lokal</td>
                <td>2× seminggu</td>
              </tr>
            </tbody>
          </table>
          <p>
            Klik halaman ini untuk menyunting langsung. Versi operasional
            mendukung blok, komentar, revisi, kolaborasi, formula tabel, impor
            DOCX, dan ekspor PDF.
          </p>
        </div>
        <aside className="doc-panel">
          <b>Pengaturan dokumen</b>
          <label>
            Status <span>Draf</span>
          </label>
          <label>
            Keterbacaan <span className="good">Baik</span>
          </label>
          <label>
            Skor SEO <span className="good">84/100</span>
          </label>
          <label>
            Slug <span>/peluang-digital-umkm</span>
          </label>
          <hr />
          <b>Saran Nara</b>
          <p>
            Tambahkan satu data pendukung dan tautan sumber pada bagian pembuka.
          </p>
        </aside>
      </div>
    </div>
  );
}
function App() {
  const [menu, setMenu] = useState(false),
    [demo, setDemo] = useState(false),
    [authMode, setAuthMode] = useState("signin"),
    [answer, setAnswer] = useState(""),
    [studio, setStudio] = useState(false),
    [session, setSession] = useState(null),
    [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return undefined;
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const isRecovery = params.get("auth") === "recovery";
    let subscription = null;

    const openVerifiedStudio = (nextSession) => {
      if (!active || !nextSession?.access_token || !nextSession?.refresh_token) return;
      setSession(nextSession);
      setAuthMessage("");
      setDemo(false);
      setStudio(true);
      document.documentElement.dataset.authStudioOpenV162 = "verified-session";
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY" || isRecovery) {
        setStudio(false);
        setAuthMode("recovery");
        setDemo(true);
      } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && nextSession?.access_token && nextSession?.refresh_token) {
        clearAuthQuery();
        openVerifiedStudio(nextSession);
      } else if (event === "SIGNED_OUT") {
        setStudio(false);
      }
    });
    subscription = listener.subscription;

    consumeAuthCallbackV162().then(async (callback) => {
      if (!active) return;
      if (callback.status === "error") {
        setAuthMode("signin");
        setAuthMessage(callback.error?.message || "Callback login belum berhasil.");
        setDemo(true);
        return;
      }
      if (callback.session?.access_token && callback.session?.refresh_token) {
        openVerifiedStudio(callback.session);
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) {
        console.error("Pembacaan sesi awal gagal:", error);
        setAuthMessage("Sesi lokal tetap dipertahankan. Verifikasi akan dicoba kembali saat koneksi stabil.");
        return;
      }
      if (!data.session) return;
      if (isRecovery) {
        setSession(data.session);
        setAuthMode("recovery");
        setDemo(true);
      } else {
        clearAuthQuery();
        openVerifiedStudio(data.session);
      }
    }).catch((error) => {
      if (!active) return;
      console.error("Bootstrap auth v162 gagal:", error);
      setAuthMode("signin");
      setAuthMessage(error?.message || "Login belum dapat diselesaikan.");
      setDemo(true);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const openAuth = () => {
    setAuthMode("signin");
    setAuthMessage("");
    setDemo(true);
  };
  const finishAuth = (nextSession = null) => {
    if (nextSession?.access_token && nextSession?.refresh_token) setSession(nextSession);
    clearAuthQuery();
    setAuthMode("signin");
    setAuthMessage("");
    setDemo(false);
    setStudio(true);
  };
  const leaveStudio = async () => {
    if (session) {
      try { await signOut(); } catch (error) { console.error("Gagal keluar:", error); }
    }
    setSession(null);
    setStudio(false);
  };

  if (studio) return <Suspense fallback={<div className="app-loading"><span/><b>Menyiapkan Studio…</b></div>}><Studio onExit={leaveStudio} user={session?.user} /></Suspense>;
  const ask = () => {
    setAnswer(
      "Saya sudah menyiapkan kerangka artikel: masalah utama UMKM Kalimantan, peluang digital, 5 langkah praktis, studi kasus, dan ajakan bertindak. Draf akan disimpan—tidak diterbitkan tanpa persetujuan Anda.",
    );
  };
  return (
    <>
      <header>
        <a className="brand" href="#">
          ngeblogging<span>.</span>
        </a>
        <nav className={menu ? "open" : ""}>
          <a href="#fitur">Fitur</a>
          <a href="#kegunaan">Kegunaan</a>
          <a href="#nara">Nara AI</a>
          <a href="#masa-depan">Masa depan</a>
          <button className="nav-cta" onClick={openAuth}>
            Mulai gratis <ArrowRight size={17} />
          </button>
        </nav>
        <button
          className="hamb"
          aria-label="Menu"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <Sparkles size={15} /> Platform publikasi generasi berikutnya
          </div>
          <h1>
            Ide Anda layak
            <br />
            punya <em>tempat.</em>
          </h1>
          <p className="lead">
            Bangun blog, situs bisnis, portal, dan komunitas dalam satu ruang
            kerja yang tenang—diperkuat oleh Nara AI.
          </p>
          <div className="actions">
            <button className="primary" onClick={openAuth}>
              Bangun situs Anda <ArrowRight />
            </button>
            <a href="#fitur">Jelajahi platform</a>
          </div>
          <div className="trust">
            <span>Gratis untuk memulai</span>
            <i />
            <span>Tanpa kartu kredit</span>
            <i />
            <span>Konten tetap milik Anda</span>
          </div>
          <Dashboard />
        </section>
        <section id="kegunaan" className="use">
          <p className="kicker">SATU PLATFORM, BANYAK KEMUNGKINAN</p>
          <div className="section-head">
            <h2>
              Bentuk ruang digital
              <br />
              sesuai tujuan Anda.
            </h2>
            <p>
              Mulai dari ide kecil hari ini. Ngeblogging memberi fondasi yang
              dapat tumbuh bersama ambisi Anda.
            </p>
          </div>
          <div className="card-grid">
            {cards.map(([t, d, n]) => (
              <article key={t}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
                <ArrowRight />
              </article>
            ))}
          </div>
        </section>
        <section id="fitur" className="features">
          <p className="kicker">DIBUAT UNTUK BERKARYA</p>
          <h2>
            Semua yang dibutuhkan.
            <br />
            <em>Tanpa terasa rumit.</em>
          </h2>
          <div className="feature-grid">
            {features.map(([t, d, I]) => (
              <article key={t}>
                <div className="icon">
                  <I />
                </div>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="nara" className="nara">
          <div>
            <p className="kicker">NARA AI</p>
            <h2>
              Asisten yang memahami
              <br />
              <em>isi dan tujuan situs Anda.</em>
            </h2>
            <p>
              Nara membantu riset, menyusun draf, memperbaiki tulisan, menata
              SEO, dan mengoperasikan dashboard dengan konfirmasi untuk tindakan
              penting.
            </p>
            <div className="pills">
              <span>Qwen3.5-4B</span>
              <span>Memori bertingkat</span>
              <span>RAG</span>
              <span>Tool use</span>
            </div>
          </div>
          <div className="chat">
            <div className="chat-top">
              <span>
                <Sparkles /> Nara AI
              </span>
              <small>Siap membantu</small>
            </div>
            <div className="bubble">
              Buat kerangka artikel tentang peluang digital UMKM di Kalimantan.
              Simpan sebagai draf.
            </div>
            {answer && <div className="reply">{answer}</div>}
            <button onClick={ask}>
              {answer ? "Draf siap ditinjau" : "Coba kemampuan Nara"}{" "}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
        <section className="editor-showcase">
          <p className="kicker">STUDIO KONTEN</p>
          <div className="section-head">
            <h2>
              Editor serius untuk
              <br />
              pekerjaan serius.
            </h2>
            <p>
              Pengalaman familiar seperti Word dan Excel, dirancang khusus untuk
              artikel, pages, SEO, dan publikasi web.
            </p>
          </div>
          <EditorPreview />
        </section>
        <section id="masa-depan" className="future">
          <Zap />
          <h2>Mulai kecil. Tumbuh tanpa batas.</h2>
          <p>
            Fondasi untuk publikasi, tim, komunitas, newsletter, analitik,
            domain sendiri, dan ekosistem kreator Indonesia.
          </p>
          <button className="primary" onClick={openAuth}>
            Mulai membangun <ArrowRight />
          </button>
        </section>
      </main>
      <footer>
        <a className="brand" href="#">
          ngeblogging<span>.</span>
        </a>
        <p>Bangun, kelola, dan kembangkan kehadiran digital Anda.</p>
        <small>© 2026 Ngeblogging. Dibangun di Indonesia.</small>
      </footer>
      {demo && (
        <AuthModal
          initialMode={authMode}
          initialMessage={authMessage}
          onClose={() => { setDemo(false); setAuthMessage(""); }}
          onAuthenticated={finishAuth}
          onDemo={() => { setDemo(false); setStudio(true); }}
        />
      )}
      <NaraAssistant user={session?.user} onRequestLogin={openAuth} />
    </>
  );
}
function Dashboard() {
  return (
    <div className="dash">
      <aside>
        <div className="mini-brand">n.</div>
        {[LayoutDashboard, FileText, BookOpen, MessageCircle, Users].map(
          (I, i) => (
            <I key={i} className={i === 0 ? "active" : ""} />
          ),
        )}
      </aside>
      <div className="workspace">
        <div className="top">
          <div>
            <small>RUANG KERJA</small>
            <b>
              Studio Borneo <ChevronDown size={14} />
            </b>
          </div>
          <div>
            <Search />
            <Bell />
            <div className="avatar">JH</div>
          </div>
        </div>
        <div className="welcome">
          <div>
            <small>SELAMAT DATANG KEMBALI</small>
            <h3>Selamat sore, John.</h3>
            <p>Apa yang ingin Anda bagikan hari ini?</p>
          </div>
          <button>
            <PenLine /> Tulis artikel
          </button>
        </div>
        <div className="stats">
          <div>
            <span>Pengunjung</span>
            <b>12.840</b>
            <small>+18,4% bulan ini</small>
          </div>
          <div>
            <span>Artikel terbit</span>
            <b>48</b>
            <small>3 draf menunggu</small>
          </div>
          <div>
            <span>Anggota</span>
            <b>1.284</b>
            <small>+76 bulan ini</small>
          </div>
        </div>
        <div className="dash-bottom">
          <div>
            <span>Performa 7 hari</span>
            <div className="bars">
              {[42, 55, 48, 72, 66, 88, 77, 96, 74, 91, 82, 100].map((n, i) => (
                <i key={i} style={{ height: n + "%" }} />
              ))}
            </div>
          </div>
          <div className="ai-card">
            <Sparkles />
            <b>Nara punya 3 saran</b>
            <p>Dua artikel lama berpotensi naik kembali.</p>
            <button>Lihat saran</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function detectPublishedSiteTarget() {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  if (hostname === "ngeblogging.com" || hostname === "www.ngeblogging.com") return null;
  if (hostname.endsWith(".workers.dev") || hostname.endsWith(".pages.dev") || hostname.endsWith(".netlify.app")) return null;
  if (hostname.endsWith(".ngeblogging.com")) {
    const slug = hostname.slice(0, -".ngeblogging.com".length);
    return slug && !slug.includes(".") ? { slug, hostname: "" } : null;
  }
  return { slug: "", hostname };
}

const publishedSiteTarget = detectPublishedSiteTarget();
createRoot(document.getElementById("root")).render(
  publishedSiteTarget && supabaseConfigured
    ? <Suspense fallback={<div className="app-loading"><span/><b>Menyiapkan situs…</b></div>}><PublicSite target={publishedSiteTarget}/></Suspense>
    : <App/>
);
