import { useEffect } from "react";

const PROFILE_URL = "https://ngeblogging.com/profil/tri-apriyogi-bahari";

export default function TriApriyogiBahariProfile() {
  useEffect(() => {
    const title = "Tri Apriyogi Bahari — Pengembang Ngeblogging";
    const description =
      "Profil resmi Tri Apriyogi Bahari, pengembang Ngeblogging, platform digital berbasis AI.";

    document.title = title;

    const setMeta = (selector, attributes) => {
      let node = document.head.querySelector(selector);
      if (!node) {
        node = document.createElement("meta");
        document.head.appendChild(node);
      }
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    };

    setMeta('meta[name="description"]', { name: "description", content: description });
    setMeta('meta[name="robots"]', {
      name: "robots",
      content: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    });
    setMeta('meta[property="og:title"]', { property: "og:title", content: title });
    setMeta('meta[property="og:description"]', { property: "og:description", content: description });
    setMeta('meta[property="og:type"]', { property: "og:type", content: "profile" });
    setMeta('meta[property="og:url"]', { property: "og:url", content: PROFILE_URL });

    let canonical = document.head.querySelector('link[data-profile-canonical="tri-apriyogi-bahari"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("data-profile-canonical", "tri-apriyogi-bahari");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", PROFILE_URL);

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Tri Apriyogi Bahari",
      url: PROFILE_URL,
      jobTitle: "Pengembang Ngeblogging",
      worksFor: {
        "@type": "SoftwareApplication",
        name: "Ngeblogging",
        url: "https://ngeblogging.com",
      },
      sameAs: ["https://github.com/triapriyogibahari7-pixel/ngeblogging"],
      knowsAbout: [
        "Teknologi informasi",
        "Pengembangan web",
        "Produk digital",
        "Ngeblogging",
        "AI",
      ],
    };

    let script = document.head.querySelector('script[data-profile-schema="tri-apriyogi-bahari"]');
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-profile-schema", "tri-apriyogi-bahari");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    return () => {
      document.head.querySelector('link[data-profile-canonical="tri-apriyogi-bahari"]')?.remove();
      document.head.querySelector('script[data-profile-schema="tri-apriyogi-bahari"]')?.remove();
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f8fa",
        color: "#18212f",
        fontFamily: "DM Sans, system-ui, sans-serif",
        padding: "32px 18px 64px",
      }}
    >
      <article
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: "clamp(28px, 5vw, 56px)",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <a
          href="https://ngeblogging.com"
          style={{ color: "#2563eb", textDecoration: "none", fontWeight: 700 }}
        >
          ngeblogging.com
        </a>

        <p style={{ margin: "36px 0 10px", color: "#64748b", fontWeight: 700 }}>
          PROFIL RESMI
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(36px, 7vw, 64px)",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
          }}
        >
          Tri Apriyogi Bahari
        </h1>

        <p style={{ fontSize: "clamp(19px, 3vw, 25px)", lineHeight: 1.55, color: "#475569" }}>
          Pengembang dan pemilik proyek Ngeblogging, platform digital berbasis AI untuk
          membuat, mengelola, dan menerbitkan kehadiran digital.
        </p>

        <section style={{ marginTop: 42 }}>
          <h2>Tentang</h2>
          <p style={{ lineHeight: 1.8 }}>
            Tri Apriyogi Bahari mengembangkan Ngeblogging sebagai proyek teknologi yang
            menggabungkan publikasi konten, pengelolaan situs, Theme Studio, subdomain,
            autentikasi, Cloudflare Workers, Supabase, dan Nara AI dalam satu ekosistem.
          </p>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Pendidikan</h2>
          <p style={{ lineHeight: 1.8 }}>
            D3 Teknik Mesin — Politeknik Negeri Medan.
          </p>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Pengalaman profesional</h2>
          <p style={{ lineHeight: 1.8 }}>
            Memiliki pengalaman profesional di PT Kereta Api Indonesia (Persero) sejak
            2017. Sebelumnya bekerja sebagai Staff CNC &amp; Drafter di PT Hokinda
            Citralestari, dengan pengalaman yang berkaitan dengan gambar/desain teknis,
            AutoCAD, mesin CNC, dan pekerjaan berdasarkan gambar kerja.
          </p>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Kompetensi</h2>
          <ul style={{ lineHeight: 1.9, paddingLeft: 22 }}>
            <li>Pengembangan dan pengelolaan produk digital</li>
            <li>Teknologi informasi dan komputer</li>
            <li>Desain teknis dan AutoCAD</li>
            <li>Operasional dan keselamatan kerja</li>
            <li>Pengembangan platform web berbasis AI</li>
          </ul>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Proyek utama</h2>
          <h3>Ngeblogging</h3>
          <p style={{ lineHeight: 1.8 }}>
            Ngeblogging dikembangkan untuk membantu pengguna membangun blog, situs
            bisnis, portal, komunitas, portofolio, dan berbagai bentuk kehadiran digital
            dengan dukungan Nara AI.
          </p>
          <a
            href="https://ngeblogging.com"
            style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}
          >
            Kunjungi Ngeblogging →
          </a>
        </section>

        <footer
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid #e5e7eb",
            color: "#64748b",
            lineHeight: 1.7,
          }}
        >
          Profil resmi Tri Apriyogi Bahari di Ngeblogging.
        </footer>
      </article>
    </main>
  );
}
