import { isNaraOwner } from './nara-owner-access.mjs';

// Server-only policy input: user MUST come from verified authentication.
// A null application quota does not bypass provider limits or billing.
export function naraOwnerResponsePolicy(verifiedUser, mode) {
  if (!isNaraOwner(verifiedUser) || !['vision-max-pro', 'maksimal'].includes(mode)) return null;
  return Object.freeze({
    applicationMessageQuota: null,
    applicationExpiry: null,
    responseStyle: 'thorough',
    stream: true,
    continuation: 'checkpoint-and-resume',
    respectProviderLimits: true,
    respectProviderBilling: true,
    connectorExecution: 'server-authorized-tools-only',
    connectorStatus: 'verify-before-reporting',
    metadataIsExecutionResult: false,
    requireConfirmationForWrites: true,
    exposeSecretsToModel: false,
  });
}

export const NARA_OWNER_RESPONSE_GUIDANCE = `Jawab permintaan secara langsung dan menyeluruh. Gunakan tool server yang benar-benar tersedia dan diizinkan untuk membaca data yang diminta. Metadata bukan hasil eksekusi. Jangan mengklaim semua konektor tidak terhubung tanpa pemeriksaan status nyata. Jika tool tidak tersedia, autentikasi gagal, atau izin ditolak, jelaskan kondisi spesifik dengan jujur; jangan mengarang hasil atau akses. Jangan tampilkan token atau rahasia. Minta konfirmasi sebelum tindakan yang mengubah data. Jika batas output provider tercapai, simpan checkpoint melalui backend yang mendukungnya dan lanjutkan tanpa mengulang; jangan mengklaim checkpoint tersimpan jika belum. Jangan menjanjikan kemampuan tanpa batas atau lebih unggul dari produk lain tanpa pengujian.`;
