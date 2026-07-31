import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const MAX_SITES = 25;
const RELEASE = "site-limit-summary-v182-20260731";

async function patchDomainPanel() {
  const path = "src/DomainPanelV124.jsx";
  let source = await read(path);

  if (!source.includes("const MAX_SITES_PER_ACCOUNT = 25;")) {
    source = source.replace(
      "const REQUEST_TIMEOUT = 15000;",
      "const REQUEST_TIMEOUT = 15000;\nconst MAX_SITES_PER_ACCOUNT = 25;",
    );
  }

  source = source.replace(
    "    if (!site?.id) return;\n    if (!quiet) setLoading(true);",
    '    if (!site?.id) { setLoading(false); setError("Situs aktif belum tersedia. Pilih Workspace atau muat ulang Studio."); return; }\n    if (!quiet) setLoading(true);',
  );

  source = source.replace(
    '<i>{sites.length}/12 situs dalam akun</i>',
    '<i>{sites.length}/{MAX_SITES_PER_ACCOUNT} situs dalam akun</i>',
  );
  source = source.replace(
    'label="Kapasitas akun" value={`${sites.length}/12`}',
    'label="Kapasitas akun" value={`${sites.length}/${MAX_SITES_PER_ACCOUNT}`}',
  );

  for (const marker of [
    "const MAX_SITES_PER_ACCOUNT = 25;",
    "Situs aktif belum tersedia. Pilih Workspace atau muat ulang Studio.",
    "{sites.length}/{MAX_SITES_PER_ACCOUNT} situs dalam akun",
    "`${sites.length}/${MAX_SITES_PER_ACCOUNT}`",
  ]) {
    if (!source.includes(marker)) throw new Error(`V182_DOMAIN_PATCH_MISSING:${marker}`);
  }
  if (source.includes("/12 situs dalam akun") || source.includes("`${sites.length}/12`")) {
    throw new Error("V182_DOMAIN_OLD_SITE_LIMIT_REMAINS");
  }

  await write(path, source);
}

async function patchSiteManagerAndSummary() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  if (!source.includes("const MAX_SITES_PER_ACCOUNT = 25;")) {
    source = source.replace(
      'const LOCAL_STORE = "ngeblogging-studio-v3";',
      'const LOCAL_STORE = "ngeblogging-studio-v3";\nconst MAX_SITES_PER_ACCOUNT = 25;',
    );
  }

  if (!source.includes("site-limit-v182")) {
    source = source.replace(
      "  const create = async () => {\n    setCreating(true);",
      `  const create = async () => {\n    if (sites.length >= MAX_SITES_PER_ACCOUNT) {\n      document.documentElement.dataset.siteLimitV182 = "site-limit-v182";\n      setToast(\`Batas maksimal \${MAX_SITES_PER_ACCOUNT} situs dalam satu akun sudah tercapai\`);\n      return;\n    }\n    setCreating(true);`,
    );
  }

  source = source.replace(
    '<div className="sn-create-site"><h3>Buat situs baru</h3><div>',
    '<div className="sn-create-site"><h3>Buat situs baru</h3><p className="sn-site-capacity">{sites.length}/{MAX_SITES_PER_ACCOUNT} situs digunakan</p><div>',
  );

  source = source.replace(
    '<button className="sn-primary" disabled={creating} onClick={create}>{creating ? <><LoaderCircle className="spin"/>Membuat…</> : <><Plus/>Buat situs</>}</button>',
    '<button className="sn-primary" disabled={creating || sites.length >= MAX_SITES_PER_ACCOUNT} onClick={create}>{creating ? <><LoaderCircle className="spin"/>Membuat…</> : sites.length >= MAX_SITES_PER_ACCOUNT ? <>Batas 25 situs tercapai</> : <><Plus/>Buat situs</>}</button>',
  );

  for (const marker of [
    "const MAX_SITES_PER_ACCOUNT = 25;",
    "site-limit-v182",
    "Batas maksimal ${MAX_SITES_PER_ACCOUNT} situs dalam satu akun sudah tercapai",
    "{sites.length}/{MAX_SITES_PER_ACCOUNT} situs digunakan",
    "Lihat situs",
    "sn-secondary-link",
    "sn-view-site",
  ]) {
    if (!source.includes(marker)) throw new Error(`V182_STUDIO_PATCH_MISSING:${marker}`);
  }

  await write(path, source);
}

await patchDomainPanel();
await patchSiteManagerAndSummary();
console.log(`Applied ${RELEASE}`);
