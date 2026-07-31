import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const RELEASE = "studio-interaction-precision-v183-20260731";
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, source) => writeFile(fileUrl(path), source);

function replaceOnce(source, anchors, replacement, label) {
  if (source.includes(replacement)) return source;
  const anchor = anchors.find((candidate) => source.includes(candidate));
  if (!anchor) throw new Error(`V183_PATCH_ANCHOR_MISSING:${label}`);
  return source.replace(anchor, replacement);
}

async function patchNara() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);

  source = replaceOnce(source, [
    '<div className="nara-assistant-layer" data-nara-layer-size={size} role="dialog" aria-modal={size === "full"} data-nara-native-interaction="v177" data-nara-interaction-native={size === "full" ? "modal" : "nonmodal"} aria-label="Nara AI Assistant">',
    '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
  ], '<div className="nara-assistant-layer" data-nara-layer-size={size} data-nara-release-v183="studio-interaction-precision-v183-20260731" role="dialog" aria-modal={size === "full"} data-nara-native-interaction="v177" data-nara-interaction-native={size === "full" ? "modal" : "nonmodal"} aria-label="Nara AI Assistant">', "nara-layer");

  source = replaceOnce(source, [
    '<button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} onClick={closeNara} aria-label="Tutup Nara" />',
    '<button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />',
  ], '<button className="nara-assistant-backdrop" hidden={size !== "full"} inert={size !== "full" ? "" : undefined} tabIndex={size === "full" ? 0 : -1} aria-hidden={size !== "full"} onClick={closeNara} aria-label="Tutup Nara" />', "nara-backdrop");

  source = replaceOnce(source, [
    '<button className="nara-close-v177" data-nara-close-v177="native" onClick={closeNara} aria-label="Tutup Nara AI" title="Tutup Nara AI"><X /></button>',
    '<button onClick={closeNara} title="Tutup"><X /></button>',
  ], '<button className="nara-close-v177 nara-close-v183" data-nara-close-v177="native" data-nara-close-v183="precision" onClick={closeNara} aria-label="Tutup Nara" title="Tutup Nara"><X /></button>', "nara-close");

  if (!source.includes('const MAX_ATTACHMENTS = 4;')) throw new Error("V183_NARA_FEATURES_MISSING");
  for (const marker of [
    'data-nara-release-v183="studio-interaction-precision-v183-20260731"',
    'aria-modal={size === "full"}',
    'inert={size !== "full" ? "" : undefined}',
    'className="nara-close-v177 nara-close-v183"',
    'data-nara-close-v183="precision"',
  ]) {
    if (!source.includes(marker)) throw new Error(`V183_NARA_PATCH_INCOMPLETE:${marker}`);
  }
  if (source.includes('aria-modal="true"')) throw new Error("V183_NARA_ALWAYS_MODAL_REMAINS");
  await write(path, source);
}

async function patchStudioDrawer() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  source = replaceOnce(source, [
    '{mobileSidebar && <button className="sn-side-backdrop" onClick={() => setMobileSidebar(false)} aria-label="Tutup menu Studio"/>}',
  ], '{mobileSidebar && <button type="button" className="sn-side-backdrop" onClick={() => setMobileSidebar(false)} aria-label="Tutup menu Studio" aria-hidden="false"/>}', "drawer-backdrop");

  source = source.replace(
    'aria-label="Buka pengaturan profil"',
    'aria-label="Buka menu profil" aria-haspopup="menu"',
  );

  for (const marker of [
    'type="button" className="sn-side-backdrop"',
    'aria-label="Buka menu profil" aria-haspopup="menu"',
    ">Ringkasan<", ">Posts<", ">Pages<", ">Tema<", ">Media<", ">Analitik<",
    ">Anggota<", ">Komentar<", ">Domain<", ">API Keys<", ">Pengaturan<", ">Keluar<",
  ]) {
    if (!source.includes(marker)) throw new Error(`V183_STUDIO_PATCH_INCOMPLETE:${marker}`);
  }
  await write(path, source);
}

async function patchBackupMessages() {
  const path = "src/BackupCenter.jsx";
  let source = await read(path);

  if (!source.includes("function friendlyBackupError")) {
    source = source.replace(
      "function safeSlug(value) {",
      `function friendlyBackupError(error, fallback) {\n  const message = String(error?.message || error || "").trim();\n  if (/failed to fetch|network|timeout|time out|load failed|jaringan/i.test(message)) {\n    return "Koneksi cadangan terputus sementara. Sesi login dan isi tulisan tetap tersimpan; coba lagi setelah jaringan stabil.";\n  }\n  return message || fallback;\n}\n\nfunction safeSlug(value) {`,
    );
  }

  source = source.replace(
    'getOrCreatePrimarySite(user).then(setSite).catch((error) => setMessage(error.message || "Situs aktif belum dapat dimuat."));',
    'getOrCreatePrimarySite(user).then(setSite).catch((error) => setMessage(friendlyBackupError(error, "Situs aktif belum dapat dimuat.")));',
  );
  source = source.replace(
    'catch(error){ setMessage(error.message || "Cadangan belum dapat dibuat."); }',
    'catch(error){ setMessage(friendlyBackupError(error, "Cadangan belum dapat dibuat.")); }',
  );
  source = source.replace(
    'catch(error){ setMessage(error.message || "Pemulihan cadangan gagal."); }',
    'catch(error){ setMessage(friendlyBackupError(error, "Pemulihan cadangan gagal.")); }',
  );

  for (const marker of [
    "function friendlyBackupError",
    "Koneksi cadangan terputus sementara",
    'friendlyBackupError(error, "Situs aktif belum dapat dimuat.")',
    'friendlyBackupError(error, "Cadangan belum dapat dibuat.")',
    'friendlyBackupError(error, "Pemulihan cadangan gagal.")',
  ]) {
    if (!source.includes(marker)) throw new Error(`V183_BACKUP_PATCH_INCOMPLETE:${marker}`);
  }
  await write(path, source);
}

await patchNara();
await patchStudioDrawer();
await patchBackupMessages();
console.log(`Applied ${RELEASE}`);

export { RELEASE };
