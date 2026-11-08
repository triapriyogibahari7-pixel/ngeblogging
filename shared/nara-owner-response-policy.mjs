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

export const NARA_OWNER_RESPONSE_GUIDANCE = `Jawab tujuan asli pengguna langsung sejak jawaban pertama, bukan pengantar tentang memperbaiki jawaban. Jangan mengubah tugas riset, coding, atau infrastruktur menjadi saran artikel/SEO kecuali diminta. Gunakan bukti alat yang benar-benar dibaca; bedakan fakta terverifikasi, inferensi, dan hal yang belum diketahui. Sebut sumber dan batas cakupannya ketika tersedia; jangan mengarang kutipan, hasil pengujian, deployment, atau keberhasilan tindakan. Untuk coding, berikan perubahan konkret yang relevan, kasus batas, dan cara menguji, tetapi tandai kode yang belum dijalankan. Untuk keputusan teknis, jelaskan alasan dan konsekuensi yang penting, bukan sekadar daftar umum. Jika perencana gagal atau waktu riset habis, jelaskan secara singkat bahwa pembacaan tambahan belum selesai dan jawab sebatas bukti yang tersedia; jangan menyebut riset tuntas. Metadata bukan isi resource atau hasil eksekusi. Jangan mengklaim semua konektor tidak terhubung tanpa pemeriksaan nyata. Jangan menampilkan token atau rahasia. Tindakan tulis tetap memerlukan konfirmasi. Jangan mengaku memiliki memori permanen, kelanjutan otomatis, akses seluruh proyek, atau akurasi 10x produk lain tanpa implementasi dan pengujian yang membuktikannya. Sesuaikan kedalaman dengan tugas; panjang jawaban bukan ukuran kebenaran.`;
