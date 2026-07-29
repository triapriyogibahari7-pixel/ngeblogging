/*
 * Ngeblogging Studio sidebar source-of-truth and recovery contract v123.
 *
 * Tambahkan menu baru pada NAVIGATION terlebih dahulu, lalu gunakan struktur
 * button > svg + span yang sama. Runtime sidebar-lock-v123 membaca kontrak ini
 * sehingga menu lama tidak perlu ditambal satu per satu lagi.
 */

export const SIDEBAR_CONTRACT_RELEASE = "sidebar-menu-contract-v123-20260729";

export const SIDEBAR_NAVIGATION_V123 = Object.freeze([
  { key: "home", label: "Ringkasan" },
  { key: "posts", label: "Posts" },
  { key: "pages", label: "Pages" },
  { key: "themes", label: "Tema" },
  { key: "media", label: "Media" },
  { key: "analytics", label: "Analitik" },
  { key: "members", label: "Anggota" },
  { key: "comments", label: "Komentar", dynamic: true },
  { key: "domain", label: "Domain" },
]);

export const SIDEBAR_ACCOUNT_V123 = Object.freeze([
  { key: "settings", label: "Pengaturan" },
  { key: "logout", label: "Keluar" },
]);

export const SIDEBAR_GEOMETRY_V123 = Object.freeze({
  breakpoint: 761,
  expanded: Object.freeze({
    width: "calc(100% - 16px)",
    height: "44px",
    columns: "24px minmax(0, 112px)",
    gap: "12px",
    padding: "0 12px",
    margin: "2px auto",
  }),
  collapsed: Object.freeze({
    width: "48px",
    height: "44px",
    padding: "0",
    margin: "2px auto",
  }),
  icon: Object.freeze({ width: "20px", height: "20px" }),
});

export function sidebarLabelOf(button) {
  return button?.querySelector(":scope > span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}
