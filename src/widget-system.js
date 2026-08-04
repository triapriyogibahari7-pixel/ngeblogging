export const BUILT_IN_WIDGETS = [
  { id: "search", name: "Pencarian", category: "Navigasi", description: "Pencarian konten cepat dengan label yang dapat diakses.", icon: "⌕" },
  { id: "recent-posts", name: "Post terbaru", category: "Konten", description: "Daftar post terbaru berdasarkan tanggal publikasi.", icon: "◷" },
  { id: "popular-posts", name: "Post populer", category: "Konten", description: "Konten yang paling banyak dibaca atau dipilih editor.", icon: "↗" },
  { id: "featured-post", name: "Post unggulan", category: "Konten", description: "Sorot satu post utama dengan CTA yang jelas.", icon: "★" },
  { id: "categories", name: "Kategori", category: "Taksonomi", description: "Navigasi kategori untuk mempercepat penemuan konten.", icon: "▦" },
  { id: "tags", name: "Tag", category: "Taksonomi", description: "Cloud tag responsif dan ramah mesin pencari.", icon: "#" },
  { id: "archive", name: "Arsip", category: "Navigasi", description: "Arsip berdasarkan bulan dan tahun.", icon: "▤" },
  { id: "breadcrumbs", name: "Breadcrumbs", category: "SEO", description: "Jalur navigasi terstruktur dengan dukungan schema.", icon: "›" },
  { id: "table-of-contents", name: "Daftar isi", category: "SEO", description: "Daftar isi otomatis dari heading post atau page.", icon: "☷" },
  { id: "reading-progress", name: "Progres membaca", category: "Pengalaman", description: "Indikator kemajuan membaca yang ringan.", icon: "▬" },
  { id: "author", name: "Profil penulis", category: "Kepercayaan", description: "Bio, avatar, tautan, dan kredensial penulis.", icon: "◎" },
  { id: "related-posts", name: "Post terkait", category: "Konten", description: "Rekomendasi berdasarkan kategori dan tag.", icon: "∞" },
  { id: "comments", name: "Komentar", category: "Komunitas", description: "Ruang diskusi dengan moderasi dan status persetujuan.", icon: "◌" },
  { id: "newsletter", name: "Newsletter", category: "Pertumbuhan", description: "Formulir langganan dengan persetujuan eksplisit.", icon: "✉" },
  { id: "social-links", name: "Tautan sosial", category: "Pertumbuhan", description: "Tautan sosial dengan rel aman dan label aksesibilitas.", icon: "↗" },
  { id: "share", name: "Bagikan", category: "Pertumbuhan", description: "Bagikan post menggunakan Web Share API atau tautan salin.", icon: "⇧" },
  { id: "contact-form", name: "Form kontak", category: "Bisnis", description: "Form kontak anti-spam dengan konfirmasi pengiriman.", icon: "@" },
  { id: "call-to-action", name: "Call to action", category: "Bisnis", description: "CTA fleksibel untuk produk, layanan, atau komunitas.", icon: "→" },
  { id: "testimonials", name: "Testimoni", category: "Kepercayaan", description: "Bukti sosial berbentuk kartu atau slider.", icon: "❞" },
  { id: "faq", name: "FAQ", category: "SEO", description: "Pertanyaan umum dengan markup FAQ yang terstruktur.", icon: "?" },
  { id: "gallery", name: "Galeri", category: "Media", description: "Galeri gambar responsif dengan lazy loading.", icon: "▧" },
  { id: "video", name: "Video", category: "Media", description: "Pemutar video responsif dengan poster dan caption.", icon: "▶" },
  { id: "audio", name: "Audio & podcast", category: "Media", description: "Pemutar audio, episode, dan tautan berlangganan.", icon: "◉" },
  { id: "map-location", name: "Peta & lokasi", category: "Bisnis", description: "Alamat, koordinat, dan tautan peta tanpa pelacakan paksa.", icon: "⌖" },
  { id: "event-calendar", name: "Kalender acara", category: "Komunitas", description: "Daftar acara, tanggal, waktu, lokasi, dan CTA.", icon: "□" },
  { id: "custom-html", name: "HTML / JavaScript", category: "Kode", description: "Widget kode kustom dalam iframe sandbox terisolasi.", icon: "</>" },
];

export const LAYOUT_AREAS = [
  { id: "header-primary-left", label: "Header kiri", group: "header" },
  { id: "header-primary-right", label: "Header kanan", group: "header" },
  { id: "top-left-1", label: "Area atas kiri 1", group: "top" },
  { id: "top-left-2", label: "Area atas kiri 2", group: "top" },
  { id: "top-left-3", label: "Area atas kiri 3", group: "top" },
  { id: "top-right-1", label: "Area atas kanan 1", group: "top" },
  { id: "top-right-2", label: "Area atas kanan 2", group: "top" },
  { id: "top-right-3", label: "Area atas kanan 3", group: "top" },
  { id: "before-content", label: "Di atas postingan", group: "content" },
  { id: "sidebar-left-1", label: "Sidebar kiri 1", group: "content" },
  { id: "sidebar-left-2", label: "Sidebar kiri 2", group: "content" },
  { id: "sidebar-left-3", label: "Sidebar kiri 3", group: "content" },
  { id: "sidebar-left-4", label: "Sidebar kiri 4", group: "content" },
  { id: "sidebar-right-1", label: "Sidebar kanan 1", group: "content" },
  { id: "sidebar-right-2", label: "Sidebar kanan 2", group: "content" },
  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },
  { id: "sidebar-right-4", label: "Sidebar kanan 4", group: "content" },
  { id: "after-content", label: "Di bawah postingan", group: "content" },
  { id: "bottom-left-1", label: "Area bawah kiri 1", group: "bottom" },
  { id: "bottom-left-2", label: "Area bawah kiri 2", group: "bottom" },
  { id: "bottom-left-3", label: "Area bawah kiri 3", group: "bottom" },
  { id: "bottom-right-1", label: "Area bawah kanan 1", group: "bottom" },
  { id: "bottom-right-2", label: "Area bawah kanan 2", group: "bottom" },
  { id: "bottom-right-3", label: "Area bawah kanan 3", group: "bottom" },
  { id: "footer-copyright-left", label: "Footer kiri", group: "footer" },
  { id: "footer-copyright-right", label: "Footer kanan", group: "footer" },
];

const LEGACY_AREAS = ["sidebar", "sidebar-left", "sidebar-right", "after-content", "footer", "footer-left", "footer-right", "footer-wide", "header-left", "header-right", "below-header"];
const VALID_AREAS = new Set([...LAYOUT_AREAS.map((area) => area.id), ...LEGACY_AREAS]);
const RENDER_GROUPS = {
  sidebar: new Set(["sidebar", "sidebar-left", "sidebar-right", "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]),
  "after-content": new Set(["header-left", "header-right", "below-header", "header-primary-left", "header-primary-right", "top-left-1", "top-left-2", "top-left-3", "top-right-1", "top-right-2", "top-right-3", "before-content", "after-content"]),
  footer: new Set(["footer", "footer-left", "footer-right", "footer-wide", "bottom-left-1", "bottom-left-2", "bottom-left-3", "bottom-right-1", "bottom-right-2", "bottom-right-3", "footer-copyright-left", "footer-copyright-right"]),
};

export function getWidget(widgetId) {
  return BUILT_IN_WIDGETS.find((widget) => widget.id === widgetId) || null;
}

export function getLayoutArea(areaId) {
  return LAYOUT_AREAS.find((area) => area.id === areaId) || null;
}

export function createDefaultWidgetState(ids = ["search", "recent-posts", "categories", "newsletter"]) {
  const defaults = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "footer-copyright-left"];
  return ids.filter((id, index, all) => getWidget(id) && all.indexOf(id) === index).map((id, index) => ({
    id,
    enabled: true,
    area: defaults[index] || "sidebar-right-1",
    order: index,
    title: getWidget(id)?.name || id,
    settings: {},
  }));
}

export function normalizeWidgetState(input, fallbackIds) {
  const fallback = createDefaultWidgetState(fallbackIds);
  if (!Array.isArray(input)) return fallback;
  const seen = new Set();
  const normalized = input.flatMap((entry, index) => {
    const id = String(entry?.id || "");
    const widget = getWidget(id);
    if (!widget || seen.has(id)) return [];
    seen.add(id);
    const area = VALID_AREAS.has(entry?.area) ? entry.area : "sidebar-right-1";
    return [{
      id,
      enabled: entry?.enabled !== false,
      area,
      order: Number.isFinite(Number(entry?.order)) ? Number(entry.order) : index,
      title: String(entry?.title || widget.name).slice(0, 100),
      settings: entry?.settings && typeof entry.settings === "object" && !Array.isArray(entry.settings) ? entry.settings : {},
    }];
  }).sort((a, b) => a.order - b.order);
  return normalized.length ? normalized : fallback;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function customWidgetSrcDoc(settings = {}) {
  const html = String(settings.html || "<div style=\"font-family:system-ui;padding:16px\"><strong>Widget HTML / JavaScript</strong><p>Tambahkan kode dari Studio Tema.</p></div>").slice(0, 200_000);
  const javascript = String(settings.javascript || "").slice(0, 100_000).replace(/<\/script/gi, "<\\/script");
  const source = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;min-width:0;overflow-wrap:anywhere}*{box-sizing:border-box}img,video,iframe{max-width:100%;height:auto}</style></head><body>${html}${javascript ? `<script>"use strict";${javascript}<\/script>` : ""}</body></html>`;
  return escapeAttribute(source);
}

export function widgetPreviewMarkup(widgetId, title = "", area = "sidebar-right-1", settings = {}) {
  const widget = getWidget(widgetId);
  if (!widget) return "";
  const heading = `<h3>${escapeHtml(title || widget.name)}</h3>`;
  const samples = {
    search: `${heading}<form><input aria-label="Cari" placeholder="Cari konten…"><button>Cari</button></form>`,
    "recent-posts": `${heading}<ol><li>Post terbaru pertama</li><li>Post terbaru kedua</li><li>Post terbaru ketiga</li></ol>`,
    "popular-posts": `${heading}<ol><li>01 · Cerita pilihan pembaca</li><li>02 · Panduan paling dicari</li></ol>`,
    "featured-post": `${heading}<article><b>Post unggulan</b><p>Ringkasan singkat untuk menarik pembaca.</p></article>`,
    categories: `${heading}<nav><a>Teknologi</a><a>Kreativitas</a><a>Bisnis</a></nav>`,
    tags: `${heading}<div><span>#seo</span> <span>#menulis</span> <span>#komunitas</span></div>`,
    archive: `${heading}<select><option>Juli 2026</option><option>Juni 2026</option></select>`,
    breadcrumbs: `<nav aria-label="Breadcrumb">Beranda › Post › Judul</nav>`,
    "table-of-contents": `${heading}<ol><li>Pendahuluan</li><li>Pembahasan</li><li>Kesimpulan</li></ol>`,
    "reading-progress": `<div aria-label="Progres membaca"><span style="display:block;width:62%;height:4px;background:currentColor"></span></div>`,
    author: `${heading}<p>Nama penulis · bio singkat dan tautan profil.</p>`,
    "related-posts": `${heading}<ul><li>Post terkait A</li><li>Post terkait B</li></ul>`,
    comments: `${heading}<p>Diskusi pembaca tampil setelah moderasi.</p><button>Tulis komentar</button>`,
    newsletter: `${heading}<p>Dapatkan tulisan terbaru.</p><form><input type="email" placeholder="Email"><button>Berlangganan</button></form>`,
    "social-links": `${heading}<nav><a>Instagram</a> · <a>LinkedIn</a> · <a>YouTube</a></nav>`,
    share: `${heading}<button>Bagikan post</button>`,
    "contact-form": `${heading}<form><input placeholder="Nama"><input type="email" placeholder="Email"><textarea placeholder="Pesan"></textarea><button>Kirim</button></form>`,
    "call-to-action": `${heading}<p>Ajakan yang jelas dan relevan.</p><a href="#">Mulai sekarang</a>`,
    testimonials: `${heading}<blockquote>“Pengalaman yang cepat dan mudah digunakan.”</blockquote>`,
    faq: `${heading}<details open><summary>Apa manfaatnya?</summary><p>Jawaban ringkas dan jelas.</p></details>`,
    gallery: `${heading}<div class="widget-gallery"><i></i><i></i><i></i></div>`,
    video: `${heading}<div class="widget-media">▶ Video responsif</div>`,
    audio: `${heading}<audio controls></audio>`,
    "map-location": `${heading}<address>Jakarta, Indonesia · Buka peta</address>`,
    "event-calendar": `${heading}<time>23 Juli 2026 · 19.00 WIB</time><p>Acara komunitas Ngeblogging.</p>`,
    "custom-html": `<iframe class="ng-widget-custom-frame" title="${escapeAttribute(title || widget.name)}" loading="lazy" sandbox="allow-scripts allow-forms" srcdoc="${customWidgetSrcDoc(settings)}"></iframe>`,
  };
  return `<section class="ng-widget ng-widget-${escapeHtml(widgetId)}" data-widget-id="${escapeHtml(widgetId)}" data-layout-area="${escapeHtml(area)}">${samples[widgetId] || `${heading}<p>${escapeHtml(widget.description)}</p>`}</section>`;
}

export function widgetsMarkup(state, renderGroup) {
  const accepted = RENDER_GROUPS[renderGroup] || new Set([renderGroup]);
  return normalizeWidgetState(state)
    .filter((widget) => widget.enabled && accepted.has(widget.area))
    .map((widget) => widgetPreviewMarkup(widget.id, widget.title, widget.area, widget.settings))
    .join("");
}

export const WIDGET_COUNT = BUILT_IN_WIDGETS.length;

/* sidebar-left-4-v207 + sidebar-right-4-v258: fourth left/right areas are committed production targets, not build-time decorations. */