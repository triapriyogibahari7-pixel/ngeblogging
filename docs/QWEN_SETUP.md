# Mengaktifkan Nara dengan Qwen

Nara memakai Alibaba Cloud Model Studio melalui API Qwen yang kompatibel dengan OpenAI. Untuk pengguna Indonesia, gunakan region **Singapore** agar endpoint dekat dan semua nilai berasal dari workspace yang sama.

## 1. Buat API key Qwen

1. Masuk ke [Alibaba Cloud Model Studio](https://modelstudio.console.alibabacloud.com/).
2. Pilih region **Singapore** dan aktifkan Model Studio jika diminta menyetujui ketentuan layanan.
3. Buka **Workspace Management**, gunakan workspace yang tersedia atau buat satu workspace untuk Ngeblogging.
4. Salin **Workspace ID** dari halaman detail workspace. Yang diperlukan adalah ID-nya, bukan nama tampilannya.
5. Buka **API Key**, pilih workspace yang sama, lalu tekan **Create API key**.
6. Salin key saat ditampilkan dan simpan di pengelola sandi. Jangan kirim key ke chat dan jangan menaruhnya di GitHub.

API key dan Workspace ID harus berasal dari region dan workspace yang sama. Jika berbeda, Qwen akan menolak permintaan meskipun keduanya terlihat valid.

## 2. Masukkan ke Netlify

1. Buka **Netlify → ngeblogging → Project configuration → Environment variables**.
2. Tekan **Add a variable**, lalu tambahkan tiga variabel berikut untuk konteks **Production**:

| Key | Value |
|---|---|
| `QWEN_API_KEY` | API key dari Model Studio |
| `QWEN_WORKSPACE_ID` | Workspace ID region Singapore |
| `QWEN_REGION` | `singapore` |

`QWEN_API_BASE_URL` tidak perlu diisi. Server Ngeblogging otomatis membentuk URL resmi:

```text
https://WORKSPACE_ID.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
```

3. Tekan **Save**.
4. Buka **Deploys → Trigger deploy → Deploy site** agar Netlify Function membaca nilai baru.
5. Tunggu deployment berstatus **Published**.

## 3. Periksa koneksi

Buka salah satu alamat berikut di browser:

```text
https://ngeblogging.com/api/nara
https://ngeblogging.netlify.app/api/nara
```

Jika konfigurasi terbaca, hasilnya memuat:

```json
{
  "ready": true,
  "provider": "Qwen · Alibaba Cloud Model Studio",
  "region": "singapore"
}
```

Setelah `ready` bernilai `true`, buka Nara dan kirim pertanyaan singkat dengan **Nara Mini + Ringan**. Pemeriksaan ini melakukan panggilan model sungguhan, bukan hanya memeriksa keberadaan environment variable.

## 4. Model Nara yang aktif

| Pilihan di Ngeblogging | Model Qwen server | Fungsi |
|---|---|---|
| Nara Mini | `qwen3.6-flash` | Cepat, hemat, dan mendukung masukan visual |
| Nara Writer | `qwen3.7-plus` | Penulisan, struktur, merek, dan SEO |
| Nara Vision | `qwen3-vl-plus` | Analisis foto, gambar, dan dokumen visual |
| Nara Max | `qwen3.7-max` | Pekerjaan kompleks dengan kualitas tertinggi |

Nama internal tersebut hanya berada di Netlify Function. Tampilan pengguna tetap memakai nama produk Nara. Jika suatu model berubah di kemudian hari, ganti variabel `NARA_MODEL_MINI`, `NARA_MODEL_WRITER`, `NARA_MODEL_VISION`, atau `NARA_MODEL_MAX` di Netlify tanpa mengubah antarmuka.

Gateway lebih dahulu memakai model utama di tabel. Jika Alibaba mengembalikan HTTP 400/404 karena model terbaru atau parameter opsional belum aktif pada workspace, gateway otomatis mencoba payload kompatibilitas dan alias Singapore yang stabil (`qwen-flash`, `qwen-plus`, `qwen-vl-plus`, atau `qwen-max`). Pengguna tidak perlu mengubah environment variable untuk pemulihan ini.

Jika domain workspace baru ditolak dengan `Workspace endpoint is invalid`, gateway otomatis beralih ke domain Singapore lama `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. Alibaba menyatakan domain lama tersebut tetap berfungsi penuh. API key tidak pernah dikirim ke browser; kedua endpoint dipanggil langsung oleh Netlify Function.

## 5. Perbedaan tingkat kecerdasan

| Tingkat | Deep thinking Qwen | Riwayat | Batas jawaban | Paket |
|---|---:|---:|---:|---|
| Ringan | Nonaktif | 4 pesan | 900 token | Gratis |
| Sedang | Nonaktif | 8 pesan | 1.800 token | Gratis |
| Tinggi | Aktif | 12 pesan | 3.200 token | Pro |
| Ekstra tinggi | Aktif | 16 pesan | 5.000 token | Pro |

Server mengirim parameter `enable_thinking` ke Qwen. Jadi Tinggi dan Ekstra tinggi bukan label tampilan; model benar-benar diberi waktu penalaran tambahan. Server juga memeriksa paket pengguna melalui Supabase sehingga pilihan Pro tidak dapat dibuka hanya dengan mengubah HTML browser.

## 6. Jika terjadi error

| Kode | Penyebab umum | Cara memperbaiki |
|---|---|---|
| `QWEN_NOT_CONFIGURED` | Key atau Workspace ID belum terbaca | Periksa ejaan variable di Netlify, simpan, lalu deploy ulang |
| `QWEN_AUTH_FAILED` | Key salah atau berasal dari region/workspace lain | Buat key baru di workspace Singapore yang sama, ganti `QWEN_API_KEY`, lalu deploy ulang |
| `QWEN_ACCESS_DENIED` | Model Studio belum aktif, izin workspace kurang, atau akun tidak dapat menagih | Aktifkan Model Studio dan periksa akses/billing akun Alibaba Cloud |
| `QWEN_NOT_FOUND` | Workspace ID, region, endpoint, atau model tidak cocok | Salin ulang Workspace ID; hapus `QWEN_API_BASE_URL` agar URL dibuat otomatis |
| `QWEN_RATE_LIMIT` | Batas request/token penyedia tercapai | Tunggu, kurangi tingkat kecerdasan, atau ajukan kenaikan limit di Model Studio |
| `QWEN_BAD_REQUEST` | Model utama dan mode kompatibilitas sama-sama ditolak | Catat `providerCode` yang tampil pada respons dan periksa akses model di workspace Singapore |
| HTTP `504` | Jawaban melewati batas waktu fungsi sinkron Netlify | Pendekkan permintaan atau gunakan Tinggi; untuk pekerjaan sangat panjang, pindahkan proses ke antrean/background worker dan tampilkan hasilnya setelah selesai |

Jangan menambahkan awalan `VITE_` pada `QWEN_API_KEY`. Variabel berawalan `VITE_` ikut masuk ke bundle browser dan dapat membocorkan key. Cara yang benar adalah menyimpan `QWEN_API_KEY` hanya sebagai environment variable server di Netlify.
