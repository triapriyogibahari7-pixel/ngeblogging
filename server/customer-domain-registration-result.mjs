const MESSAGES = Object.freeze({
 AUTH_REQUIRED:'Sesi tidak valid. Masuk kembali sebelum melanjutkan.',
 SITE_MANAGER_REQUIRED:'Akun ini tidak memiliki izin mengelola situs tujuan.',
 SAAS_HTTP_CONFIGURATION_REQUIRED:'Konfigurasi koneksi domain pada server belum lengkap.',
 INVALID_SITE:'Situs tujuan tidak valid.',
 INVALID_CUSTOMER_DOMAIN:'Nama domain tidak valid.',
 DOMAIN_ALREADY_USED:'Domain sudah terhubung ke situs lain. Jangan mendaftarkannya ulang.',
 DOMAIN_PROVIDER_MIGRATION_REQUIRED:'Domain memakai jalur lama dan memerlukan pemeriksaan migrasi.',
 DOMAIN_RECOVERY_REQUIRED:'Domain memerlukan pemulihan. Jangan membuat hostname baru.',
 DOMAIN_SNAPSHOT_UNVERIFIED:'Data domain belum dapat dipastikan. Periksa status sebelum mencoba lagi.',
 PROVIDER_SNAPSHOT_UNVERIFIED:'Status hostname di provider belum dapat dipastikan.',
 PROVIDER_HOSTNAME_ALREADY_EXISTS:'Hostname sudah ada di provider. Perlu rekonsiliasi kepemilikan, bukan pendaftaran ulang.',
 SAAS_HTTP_CREATION_UNVERIFIED:'Permintaan pembuatan telah dikirim, tetapi hasilnya belum terverifikasi. Periksa status sebelum mencoba lagi.',
 DOMAIN_STORAGE_UNVERIFIED:'Hostname telah dibuat, tetapi penyimpanan data domain belum terverifikasi. Perlu rekonsiliasi.',
 SAAS_REGISTRATION_OUTCOME_UNKNOWN:'Hasil pendaftaran belum dapat dipastikan. Periksa status sebelum mencoba lagi.',
 SAAS_REGISTRATION_UNAVAILABLE:'Pemeriksaan pendaftaran belum berhasil. Hostname baru belum dibuat oleh permintaan ini.',
 SAAS_UPSTREAM_REJECTED:'Layanan menolak permintaan. Gunakan kode dan tahap kegagalan untuk pemeriksaan.'
});
const BEFORE_WRITE=new Set(['SAAS_HTTP_CONFIGURATION_REQUIRED','INVALID_SITE','INVALID_CUSTOMER_DOMAIN','DOMAIN_ALREADY_USED','DOMAIN_PROVIDER_MIGRATION_REQUIRED','DOMAIN_RECOVERY_REQUIRED','DOMAIN_SNAPSHOT_UNVERIFIED','PROVIDER_SNAPSHOT_UNVERIFIED','PROVIDER_HOSTNAME_ALREADY_EXISTS','SAAS_REGISTRATION_UNAVAILABLE']);
const STAGES=new Set(['authenticate','authorize','domain_snapshot','provider_snapshot','provider_create','domain_storage']);
export function safeRegistrationFailure(data){
 const known=Object.hasOwn(MESSAGES,data?.code),code=known?data.code:'BYOD_REGISTRATION_NOT_COMPLETED';
 const changed=known&&typeof data?.mayHaveChangedProvider==='boolean'?data.mayHaveChangedProvider:!BEFORE_WRITE.has(code);
 const out={code,error:known?MESSAGES[code]:'Pendaftaran belum selesai. Hasil provider perlu diperiksa sebelum mencoba lagi.',mayHaveChangedProvider:changed,requiresNameserverChange:false};
 if(known&&STAGES.has(data?.stage))out.stage=data.stage;
 if(known&&Number.isInteger(data?.upstreamStatus)&&data.upstreamStatus>=400&&data.upstreamStatus<=599)out.upstreamStatus=data.upstreamStatus;
 if(known&&Array.isArray(data?.providerErrorCodes))out.providerErrorCodes=[...new Set(data.providerErrorCodes.filter(x=>Number.isSafeInteger(x)&&x>=1000))].slice(0,8);
 return out;
}
