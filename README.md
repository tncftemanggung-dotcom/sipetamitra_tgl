# SIPETA MITRA — PWA (Registrasi Petani & Lahan)

Panduan lengkap memasang backend Google Apps Script, men-deploy PWA ke **Vercel** atau **GitHub Pages**, dan memasang aplikasi di HP atau komputer.

---

## Daftar Isi

1. [Cara Kerja](#1-cara-kerja)
2. [Isi Paket](#2-isi-paket)
3. [Prasyarat](#3-prasyarat)
4. [Bagian A — Siapkan Backend Apps Script](#4-bagian-a--siapkan-backend-apps-script)
5. [Bagian B — Deploy Frontend (Vercel / GitHub Pages)](#5-bagian-b--deploy-frontend-vercel--github-pages)
6. [Bagian C — Pasang Aplikasi di Perangkat (PWA)](#6-bagian-c--pasang-aplikasi-di-perangkat-pwa)
7. [Bagian D — Pengujian & Sinkronisasi](#7-bagian-d--pengujian--sinkronisasi)
8. [Update Aplikasi di Kemudian Hari](#8-update-aplikasi-di-kemudian-hari)
9. [Perilaku Offline](#9-perilaku-offline)
10. [Keamanan](#10-keamanan)
11. [Troubleshooting](#11-troubleshooting)
12. [Pertanyaan Umum (FAQ)](#12-pertanyaan-umum-faq)

---

## 1. Cara Kerja

Halaman bawaan Apps Script (`HtmlService`) berjalan di dalam `iframe` Google, sehingga **tidak mendukung** pendaftaran Manifest PWA dan Service Worker secara penuh. Oleh karena itu, arsitektur aplikasi dipisah:

```
[ Perangkat HP / Komputer ]
           │
           │  Membuka PWA (HTML, CSS, JS, Service Worker, Manifest)
           ▼
[ Frontend Host: Vercel / GitHub Pages ]  ──( sipetamitra.vercel.app )
           │
           │  Panggilan API via fetch() POST (JSON)
           ▼
[ Backend: Google Apps Script (/exec) ]   ──( Api.gs & Code.gs )
           │
           ▼
[ Database: Google Sheets ]
```

- **Frontend (PWA):** Di-host pada platform statis/Jamstack seperti **Vercel** atau **GitHub Pages**. Dapat di-install ke layar utama HP dan dapat berjalan offline.
- **Backend:** Di-host di Google Apps Script via `Api.gs` yang memproses permintaan `doPost` untuk CRUD data petani, lahan, penugasan, dan autentikasi.
- **Versi Apps Script Web App (`/exec`):** Tetap berfungsi sebagai fallback/cadangan jika diakses langsung di browser.

---

## 2. Isi Paket

| File / Folder | Fungsi |
|---|---|
| `index.html` (atau `docs/index.html`) | Tampilan antarmuka utama PWA |
| `manifest.json` | Konfigurasi PWA (nama aplikasi, ikon, warna tema) |
| `sw.js` | Service Worker untuk strategi caching offline & background sync |
| `gas-bridge.js` | Modul penghubung penganti `google.script.run` menggunakan HTTP `fetch()` |
| `pwa-config.js` | Konfigurasi endpoint Apps Script `/exec` dan daftar fungsi |
| `icons/` | Aset ikon PWA (192px, 512px, maskable, apple-touch, favicon) |
| `Api.gs` | Router backend Apps Script, menangani endpoint `doPost` |
| `Code.gs` | Logic backend utama (database Google Sheets, penomoran ID, otentikasi) |
| `Index.html` *(Apps Script)* | Versi cadangan/fallback untuk editor Apps Script (opsional) |

---

## 3. Prasyarat

1. Akun **Google** pemilik spreadsheet database SIPETA MITRA dan proyek Apps Script.
2. Akun **GitHub** dan/atau akun **Vercel** (keduanya gratis).
3. Browser modern (Google Chrome, Microsoft Edge, atau Safari iOS).
4. Spreadsheet SIPETA sudah menjalankan fungsi `setupDatabase()`.

---

## 4. Bagian A — Siapkan Backend Apps Script

### A1. Pasang Kode `Api.gs` dan `Code.gs`

1. Buka Google Sheets SIPETA, lalu pilih **Ekstensi → Apps Script**.
2. Pastikan file `Code.gs` telah diperbarui dengan fungsi-fungsi utama SIPETA.
3. Buat file script baru: klik tanda **+** → pilih **Script**, beri nama `Api` (otomatis menjadi `Api.gs`).
4. Tempelkan seluruh kode `Api.gs`.
5. Klik **Save** (Ctrl + S).

Daftar fungsi yang dizinkan pada `Api.gs`:
```js
const PWA_ALLOWED_FUNCTIONS = [
  'loginUser', 'destroySession', 'getAppData', 'saveKoordinator', 'savePetani', 'saveLahan',
  'toggleStatusEntity', 'saveUser', 'saveTrader', 'savePenugasanPic',
  'saveVerifikasiLahan',
];
```

> **Catatan Penguncian (LockService):** `saveKoordinator`, `savePetani`, `saveLahan`, dan `saveVerifikasiLahan` telah mengimplementasikan `LockService` internal di `Code.gs`. Jangan mengunci ulang di `Api.gs` agar tidak menyebabkan error "Sistem sibuk".

### A2. Catatan Khusus untuk `Index.html` di Apps Script (Opsional)

File `Index.html` pada editor Apps Script **tidak wajib** di-update jika seluruh pengguna mengakses aplikasi via Vercel (`sipetamitra.vercel.app`). 

Namun, jika ingin menyalin `index.html` terbaru ke Apps Script sebagai fallback:
- **Hapus 5 tag khusus PWA** di dalam tag `<head>`:
  1. `<link rel="manifest" href="manifest.json">`
  2. `<meta name="theme-color" ...>`
  3. `<link rel="apple-touch-icon" ...>`
  4. `<script src="pwa-config.js"></script>`
  5. `<script src="gas-bridge.js"></script>`
- *Mengapa?* Karena Apps Script tidak menyimpan file pendukung tersebut di servernya. Menghapusnya akan mencegah munculnya error *404 Not Found* pada Console browser saat URL `/exec` dibuka langsung.

### A3. Deploy Web App (Pengaturan Wajib)

1. Pilih **Deploy → Manage deployments** (atau **New deployment**).
2. Klik ikon **Edit (Pensil)** pada deployment yang ada.
3. Atur konfigurasi berikut:
   - **Execute as:** `Me` (Akun Anda)
   - **Who has access:** `Anyone` *(Wajib "Anyone", jangan "Anyone with Google Account" agar fetch CORS lancar)*
4. Pada dropdown **Version**, pilih **New version**.
5. Klik **Deploy** dan berikan otorisasi (*Authorize access*) jika diminta.
6. Salin **Web App URL** berakhiran `/exec`.

> **PENTING:** Setiap kali ada perubahan pada `Code.gs` atau `Api.gs`, Anda **wajib** melakukan **New version** di **Manage deployments**. Alamat URL `/exec` tidak akan berubah.

### A4. Sesuaikan Endpoint pada Frontend

Buka file `pwa-config.js` pada proyek frontend dan pastikan `endpoint` mengarah ke URL Web App Anda:

```javascript
window.PWA_CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKfycbx.../exec",
  // ...
};
```

---

## 5. Bagian B — Deploy Frontend (Vercel / GitHub Pages)

### Pilihan 1: Deploy ke Vercel (Rekomendasi)

Vercel memberikan performa HTTPS yang sangat cepat, otokomit via GitHub, dan kustomisasi domain mudah (`sipetamitra.vercel.app`).

1. Push seluruh repositori proyek PWA ke GitHub Anda.
2. Login ke dashboard [Vercel](https://vercel.com).
3. Klik **Add New... → Project**.
4. Hubungkan akun GitHub Anda dan pilih repositori `sipeta-pwa`.
5. Pada bagian **Framework Preset**, biarkan **Other** (karena ini file statis HTML/JS).
6. Jika file frontend berada di folder root, biarkan **Root Directory** kosong (atau pilih `./docs` jika file PWA ada di folder `docs`).
7. Klik **Deploy**.
8. Dalam hitungan detik, aplikasi aktif di URL produksi Vercel (misal: `https://sipetamitra.vercel.app`).

### Pilihan 2: Deploy ke GitHub Pages

1. Masuk ke repositori GitHub Anda.
2. Buka menu **Settings → Pages**.
3. Pada **Source**, pilih **Deploy from a branch**.
4. Pilih branch `main` dan folder `/` (Root) atau `/docs` sesuai struktur repositori Anda, lalu klik **Save**.
5. Tunggu 1–2 menit hingga URL `https://USERNAME.github.io/sipeta-pwa/` aktif.

---

## 6. Bagian C — Pasang Aplikasi di Perangkat (PWA)

### Android (Google Chrome)
1. Buka URL PWA (`https://sipetamitra.vercel.app`) di Chrome.
2. Login pertama kali saat terhubung internet.
3. Ketuk ikon titik tiga **⋮ → Install app** (atau **Tambahkan ke Layar Utama**).
4. Aplikasi akan terpasang layaknya aplikasi native Android.

### iPhone / iPad (Safari)
1. Buka URL PWA di **Safari iOS** (bukan Chrome iOS).
2. Ketuk tombol **Share** (kotak dengan panah ke atas).
3. Gulir ke bawah dan pilih **Add to Home Screen (Tambahkan ke Layar Utama)**.
4. Ketuk **Add**.

### Komputer (Chrome / Edge)
1. Buka URL di Chrome atau Edge.
2. Klik ikon **Install SIPETA MITRA** di sudut kanan *address bar*, atau via menu **⋮ → Save and share → Install page as app**.

---

## 7. Bagian D — Pengujian & Sinkronisasi

1. **Uji Online:** Login, muat data petani & lahan, buat 1 data baru. Cek apakah data bertambah di Google Sheets.
2. **Uji Perilaku Offline:** 
   - Aktifkan **Mode Pesawat** di HP Anda.
   - Buka kembali aplikasi SIPETA MITRA.
   - Tambahkan data Petani dan Lahan baru. Data akan tersimpan lokal dengan ID sementara (contoh: `TMP-9A8B`).
   - Indikator status bawah layar akan menampilkan tulisan **Offline · 2 Menunggu**.
3. **Uji Auto Sync:** 
   - Matikan Mode Pesawat.
   - Aplikasi akan otomatis mengirimkan antrean data ke Apps Script.
   - ID sementara `TMP-...` diubah otomatis oleh server menjadi ID resmi (`TMG....`), dan data baru akan masuk ke Google Sheets.

---

## 8. Update Aplikasi di Kemudian Hari

### Update Backend (`Code.gs` / `Api.gs`)
1. Edit kode di editor Apps Script.
2. Klik **Deploy → Manage deployments → Edit (Pensil)**.
3. Pada **Version**, wajib pilih **New version** → Klik **Deploy**.

### Update Frontend (`index.html`, `pwa-config.js`, `gas-bridge.js`)
1. Edit file pada komputer/editor lokal.
2. **Wajib naikkan versi Service Worker:** Buka `sw.js` dan ubah konstanta versi di baris atas:
   ```javascript
   const VERSION = 'v1.0.1'; // Ubah menjadi v1.0.2 dst.
   ```
3. Commit & Push ke GitHub. Vercel / GitHub Pages akan otomatis memperbarui file web.
4. Pengguna cukup menutup dan membuka aplikasi **2 kali** untuk mengaktifkan Service Worker terbaru.

---

## 9. Perilaku Offline

| Fitur | Status Offline | Catatan |
|---|---|---|
| Membuka App & Navigasi | ✅ Bisa | Memakai cache Service Worker |
| Melihat Data Petani & Lahan | ✅ Bisa | Berdasarkan cache terakhir |
| Input Petani / Lahan Baru | ✅ Bisa | Tersimpan ke antrean IndexedDB local |
| Verifikasi Lahan | ✅ Bisa | Tersimpan ke antrean local |
| Login / Logout Resmi | ❌ Perlu Internet | Membutuhkan otentikasi server |
| Manajemen User / Admin | ❌ Perlu Internet | Wajib koneksi online |

---

## 10. Keamanan

- Akses Web App diset ke **Anyone** agar PWA dapat mengirimkan POST request via `fetch`.
- Keamanan data ditangani oleh **Token Session** pada Apps Script (Hash SHA-256, expired sesi 8 jam, dan proteksi brute-force login).
- **Penting:** Segera ganti password default admin setelah instalasi pertama.
- Jaga agar kredensial sensitif tidak di-commit ke repositori GitHub publik.

---

## 11. Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| `Endpoint did not return JSON` | Web App Apps Script belum di-set ke **Anyone** atau belum **New version**. | Buka Apps Script → Manage Deployments → Edit → Akses set `Anyone` → Pilih **New Version** → Deploy. |
| Console error 404 pada file PWA *(di URL `/exec` Apps Script)* | File `Index.html` di Apps Script masih membawa tag PWA. | Hapus 5 tag script/link PWA di `<head>` pada file `Index.html` di editor Apps Script. |
| `Function not allowed: xxx` | Fungsi belum didaftarkan di `PWA_ALLOWED_FUNCTIONS`. | Tambahkan nama fungsi ke array `PWA_ALLOWED_FUNCTIONS` di `Api.gs` lalu buat **New Version**. |
| Data offline tidak tersinkron | Sesi login 8 jam telah kadaluarsa saat offline. | Re-login aplikasi saat online. Antrean lokal akan otomatis terkirim setelah otentikasi berhasil. |
| Tampilan lama tidak berubah | Service Worker masih menyimpan cache lama. | Naikkan `VERSION` pada `sw.js`, commit/push, lalu buka-tutup app 2x atau lakukan Clear Site Data. |

---

## 12. Pertanyaan Umum (FAQ)

**Q: Apakah file `Index.html` di Google Apps Script harus diganti jika sudah pakai Vercel?**  
A: Tidak wajib. Jika seluruh pengguna sudah mengakses dari `sipetamitra.vercel.app`, Apps Script hanya bertindak sebagai API server. Namun jika diganti untuk cadangan, hapus 5 tag PWA di `<head>` agar tidak ada error 404.

**Q: Apakah bisa menggunakan Custom Domain di Vercel?**  
A: Bisa. Anda dapat mengarahkan domain sendiri (misal `sipeta.namadomain.com`) di menu *Settings → Domains* pada dashboard Vercel secara gratis.

---

*Dikelola & Diperbarui untuk Sistem Informasi Peta & Kemitraan (SIPETA MITRA).*