# SIPETA MITRA — PWA (Registrasi Petani & Lahan)

Panduan lengkap memasang backend Google Apps Script, men-deploy PWA ke **GitHub Pages**, dan memasangnya di HP atau komputer.

## Daftar isi

1. [Cara kerja](#1-cara-kerja)
2. [Isi paket](#2-isi-paket)
3. [Prasyarat](#3-prasyarat)
4. [Bagian A — Siapkan backend Apps Script](#4-bagian-a--siapkan-backend-apps-script)
5. [Bagian B — Deploy ke GitHub Pages](#5-bagian-b--deploy-ke-github-pages)
6. [Bagian C — Pasang aplikasi di HP / komputer](#6-bagian-c--pasang-aplikasi-di-hp--komputer)
7. [Bagian D — Uji](#7-bagian-d--uji)
8. [Update aplikasi di kemudian hari](#8-update-aplikasi-di-kemudian-hari)
9. [Perilaku offline](#9-perilaku-offline)
10. [Keamanan](#10-keamanan)
11. [Troubleshooting](#11-troubleshooting)
12. [Pertanyaan umum](#12-pertanyaan-umum)

---

## 1. Cara kerja

Halaman Apps Script (`HtmlService`) berjalan di dalam iframe Google, sehingga **tidak bisa** memasang manifest atau service worker. Karena itu aplikasi dipisah menjadi dua bagian:

```
HP / Browser  ──►  GitHub Pages (tampilan PWA: HTML, manifest, service worker)
                        │
                        │  fetch() POST
                        ▼
                  Google Apps Script (/exec)  ──►  Google Sheets (database)
```

- **Tampilan** (`docs/`) di-host di GitHub Pages, jadi bisa dipasang sebagai aplikasi dan dibuka offline.
- **Backend** tetap Apps Script + Google Sheets. File `Api.gs` menerima permintaan dari PWA dan memanggil fungsi yang sama seperti sebelumnya (`loginUser`, `getAppData`, `savePetani`, dst).
- Versi lama (alamat `/exec` dibuka langsung di browser) **tetap berfungsi** karena `doGet` tidak diubah.

## 2. Isi paket

| File | Fungsi |
|---|---|
| `docs/` | Folder PWA yang siap di-upload ke GitHub |
| `docs/index.html` | Tampilan aplikasi (hasil build) |
| `docs/manifest.json` | Nama, ikon, warna aplikasi |
| `docs/sw.js` | Service worker (cache offline) |
| `docs/gas-bridge.js` | Pengganti `google.script.run` berbasis `fetch`, plus antrean offline |
| `docs/pwa-config.js` | Pengaturan: alamat `/exec`, fungsi yang di-cache |
| `docs/icons/` | Ikon 192, 512, maskable, apple-touch, favicon |
| `Api.gs` | Router backend, **ditambahkan** ke proyek Apps Script |
| `Index.html` | Versi sumber (untuk dipasang kembali di proyek Apps Script, opsional) |

## 3. Prasyarat

- Akun **Google** pemilik proyek Apps Script dan Google Sheets SIPETA.
- Akun **GitHub** (gratis). Untuk akun gratis, repositori harus **Public** agar bisa memakai GitHub Pages.
- Browser modern (Chrome / Edge / Safari). Untuk cara terminal: **Git** terpasang di komputer (opsional, ada cara tanpa Git).
- Pastikan database sudah disiapkan (fungsi `setupDatabase()` sudah pernah dijalankan) dan Anda tahu username/password admin.

---

## 4. Bagian A — Siapkan backend Apps Script

### A1. Tambahkan `Api.gs`

1. Buka Google Sheets SIPETA, lalu menu **Ekstensi → Apps Script**.
2. Di panel kiri klik tanda **+** di samping **Files**, pilih **Script**.
3. Beri nama `Api` (otomatis menjadi `Api.gs`).
4. Hapus isi bawaan, lalu tempel seluruh isi file `Api.gs` dari paket ini.
5. Klik ikon **Save** (Ctrl + S).

Daftar fungsi yang diizinkan sudah terisi:

```js
const PWA_ALLOWED_FUNCTIONS = [
  'loginUser', 'destroySession', 'getAppData', 'saveKoordinator', 'savePetani', 'saveLahan',
  'toggleStatusEntity', 'saveUser', 'saveTrader', 'savePenugasanPic',
  'saveVerifikasiLahan',
];
```

> **Catatan penguncian:** `saveKoordinator`, `savePetani`, `saveLahan`, dan `saveVerifikasiLahan` sudah memakai `LockService` di dalam fungsinya, jadi sengaja **tidak** dimasukkan ke `PWA_SERIALIZED_FUNCTIONS`. Mengunci dua kali membuat simpan gagal dengan pesan "Sistem sibuk".
>
> **Catatan `saveVerifikasiLahan`:** pastikan fungsi ini hanya didefinisikan **sekali** di `Code.gs`. Jika ada dua definisi, Apps Script memakai yang terakhir dan yang pertama tidak pernah dijalankan.

### A2. Pastikan tidak ada `doPost` ganda

Proyek asli hanya punya `doGet`, jadi aman. Jika Anda pernah menambahkan `doPost` sendiri, ganti namanya (mis. `originalDoPost_`) agar tidak bentrok dengan `doPost` di `Api.gs`.

### A3. Deploy sebagai Web App (pengaturan wajib)

1. Klik **Deploy → Manage deployments**.
   - Jika belum pernah, pilih **Deploy → New deployment**, klik ikon roda gigi, pilih **Web app**.
2. Klik ikon **pensil (Edit)** pada deployment yang ada.
3. Atur:
   - **Execute as:** `Me` (akun Anda)
   - **Who has access:** `Anyone`

   > Harus **Anyone**, bukan "Anyone with Google account". Pilihan kedua mengalihkan PWA ke halaman login Google dan menyebabkan galat *Endpoint did not return JSON*.
4. Pada **Version**, pilih **New version**.
5. Klik **Deploy**, lalu izinkan otorisasi bila diminta (*Authorize access → pilih akun → Advanced → Go to ... → Allow*).
6. Salin **Web app URL** yang berakhiran `/exec`.

> Setiap kali Anda mengubah kode server, ulangi langkah 2–5 dan pilih **New version**. Tanpa itu, perubahan tidak terlihat di `/exec`. Alamat URL tidak berubah.

### A4. Cocokkan alamat `/exec`

PWA di paket ini sudah memakai alamat:

```
https://script.google.com/macros/s/AKfycbxMt5b-AvFI29amFHmnkQxsC4gZNTxN6IQ3MA5CErOhVNYmS91VCSqaFftDBmU1NLkPVQ/exec
```

Jika URL deployment Anda **berbeda** (mis. membuat deployment baru), buka `docs/pwa-config.js` dan ganti nilai `endpoint`:

```js
endpoint: "https://script.google.com/macros/s/ID_DEPLOYMENT_ANDA/exec",
```

### A5. Tes cepat backend

Buka tab browser mana pun, tekan **F12 → Console**, tempel:

```js
fetch("URL_EXEC_ANDA", {
  method: "POST",
  body: JSON.stringify({ fn: "loginUser", args: ["admin", "PASSWORD_ANDA"], id: "tes1" })
}).then(r => r.text()).then(console.log)
```

Hasil yang benar berupa JSON, misalnya `{"ok":true,"result":{"success":true,...}}`.
Jika yang muncul HTML, berarti pengaturan akses atau versi deployment belum benar (lihat [Troubleshooting](#11-troubleshooting)).

---

## 5. Bagian B — Deploy ke GitHub Pages

Pilih **salah satu**: Cara 1 (tanpa Git, lewat browser) atau Cara 2 (Git di terminal).

### B1. Buat repositori

1. Login ke [github.com](https://github.com), klik **+ → New repository**.
2. Isi:
   - **Repository name:** mis. `sipeta-pwa`
   - **Visibility:** **Public**
   - Jangan centang *Add a README* jika memakai Cara 2.
3. Klik **Create repository**.

### Cara 1 — Upload lewat browser (tanpa Git)

1. Ekstrak `sipeta-pwa-docs.zip` di komputer. Anda akan mendapat folder `docs`.
2. Di halaman repositori, klik **uploading an existing file** (atau **Add file → Upload files**).
3. Buka folder `docs` hasil ekstrak, **pilih semua isinya** (`index.html`, `manifest.json`, `sw.js`, `gas-bridge.js`, `pwa-config.js`, folder `icons`, dan file `.nojekyll`), lalu seret ke halaman upload.

   > Struktur akhir di repositori harus berupa `docs/index.html`, `docs/sw.js`, dst. Karena GitHub upload web tidak otomatis membuat folder dari seret-lepas file, cara paling mudah adalah **menyeret folder `docs` itu sendiri** (bukan isinya) ke halaman upload.
   >
   > File yang namanya diawali titik (`.nojekyll`) sering tersembunyi di pengelola file. Jika tidak terlihat, tidak masalah: Anda bisa membuatnya nanti lewat **Add file → Create new file**, nama `docs/.nojekyll`, isi kosong.
4. Tulis pesan commit, mis. `Tambah PWA SIPETA`, pilih **Commit directly to the main branch**, klik **Commit changes**.
5. Pastikan di repositori terlihat folder `docs/` yang berisi `index.html`.

### Cara 2 — Lewat Git (terminal)

```bash
# 1. Ekstrak zip, masuk ke folder induk yang berisi folder docs
unzip sipeta-pwa-docs.zip -d sipeta-pwa
cd sipeta-pwa

# 2. Inisialisasi repo
git init
git branch -M main

# 3. Commit
git add docs
git commit -m "Tambah PWA SIPETA"

# 4. Hubungkan ke GitHub (ganti USERNAME)
git remote add origin https://github.com/USERNAME/sipeta-pwa.git
git push -u origin main
```

Saat diminta password, GitHub memakai **Personal Access Token**, bukan password akun: **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate** dengan izin `repo`.

> Pastikan `.nojekyll` ikut ter-commit: `git add -f docs/.nojekyll` bila perlu.

### B2. Aktifkan GitHub Pages

1. Di repositori buka **Settings → Pages**.
2. Pada **Build and deployment → Source**, pilih **Deploy from a branch**.
3. **Branch:** `main`, **Folder:** `/docs`, klik **Save**.
4. Tunggu 1–2 menit. Muat ulang halaman Pages hingga muncul tulisan *Your site is live at*:

```
https://USERNAME.github.io/sipeta-pwa/
```

5. Buka alamat itu. Halaman login SIPETA harus tampil. Alamat inilah yang dibagikan ke pengguna.

> Status build bisa dipantau di tab **Actions** (workflow `pages build and deployment`). Tanda centang hijau berarti berhasil.

---

## 6. Bagian C — Pasang aplikasi di HP / komputer

### Android (Chrome)

1. Buka alamat GitHub Pages di **Chrome**.
2. Login satu kali dengan koneksi internet.
3. Ketuk menu **⋮ → Install app** (atau **Add to Home screen**).
4. Konfirmasi. Ikon **SIPETA** muncul di layar utama dan aplikasi terbuka tanpa bilah alamat.

### iPhone / iPad (Safari)

1. Buka alamat di **Safari** (bukan Chrome iOS).
2. Ketuk tombol **Share** (kotak dengan panah ke atas).
3. Pilih **Add to Home Screen → Add**.

> Di iOS, data situs yang **tidak dipasang** ke layar utama bisa dihapus Safari setelah sekitar 7 hari tidak dipakai. Aplikasi yang sudah dipasang tidak terkena. Minta pengguna iOS selalu memasangnya.

### Komputer (Chrome / Edge)

Klik ikon **Install** di ujung kanan bilah alamat, atau menu **⋮ → Cast, save, and share → Install page as app**.

---

## 7. Bagian D — Uji

Lakukan urutan berikut pada perangkat sungguhan:

1. **Online:** login, buka daftar petani/lahan, simpan satu data uji. Pastikan baris baru muncul di Google Sheets.
2. **Cache data:** setelah data tampil, aktifkan **mode pesawat**, tutup aplikasi, buka lagi. Halaman harus tetap terbuka dan data terakhir masih tampil. Indikator **Offline** muncul.
3. **Simpan saat offline:** tambah satu petani, lalu satu lahan untuk petani itu. Keduanya muncul di daftar dengan ID `TMP-...` dan indikator menampilkan `2 menunggu`.
4. **Sinkron:** matikan mode pesawat. Dalam beberapa detik indikator hilang, ID berubah menjadi `TMG....`, dan baris baru muncul di Google Sheets. Lahan harus terhubung ke ID petani yang resmi.
5. **Logout:** cache data dibersihkan otomatis agar data tidak tertinggal di perangkat bersama.

Uji otomatis di komputer sebelum push (opsional):

```bash
cd docs
python -m http.server 8000
# buka http://localhost:8000 , lalu DevTools → Application → Manifest / Service Workers
```

`localhost` dianggap aman sehingga service worker tetap jalan tanpa HTTPS. Di Chrome **DevTools → Lighthouse** bisa dijalankan audit PWA sebagai pemeriksaan akhir.

---

## 8. Update aplikasi di kemudian hari

**Jika Anda mengubah kode server (`Code.gs` / `Api.gs`):**

1. Simpan di editor Apps Script.
2. **Deploy → Manage deployments → Edit → New version → Deploy.**

**Jika Anda mengubah tampilan (`docs/index.html`):**

1. Edit file di repositori (atau ganti file yang di-upload).
2. **Wajib naikkan versi cache** supaya aplikasi terpasang mengambil versi baru: buka `docs/sw.js` dan ubah nilai pada baris 2, `const VERSION = '...';`, menjadi nilai baru apa saja (mis. `'v2'`, lalu `'v3'` pada update berikutnya).
3. Commit dan push.
4. Pada perangkat pengguna, **tutup lalu buka aplikasi 2 kali**: service worker baru terpasang di latar saat peluncuran pertama dan aktif pada peluncuran berikutnya.

> Edit tampilan sebaiknya dilakukan pada `Index.html` sumber lalu di-build ulang, karena perubahan langsung pada `docs/index.html` akan tertimpa pada build berikutnya.

---

## 9. Perilaku offline

Aplikasi bisa dipakai **tanpa internet** setelah login dan data pertama dimuat.

| Fitur | Offline |
|---|---|
| Membuka aplikasi (tampilan, ikon, gaya) | Bisa |
| Melihat data terakhir (`getAppData`) | Bisa, dari cache terakhir |
| Tambah / ubah **petani**, **lahan**, **koordinator**, dan **verifikasi lahan** | Bisa, masuk antrean |
| Ubah status aktif/nonaktif petani, lahan, koordinator | Bisa, masuk antrean |
| Login, logout resmi | Tidak bisa (perlu server) |
| Data pengguna (user), trader, penugasan PIC | Tidak bisa (tugas admin, wajib online) |

### Cara kerjanya

1. Saat offline, data yang disimpan masuk **antrean** di perangkat dan langsung tampil di daftar.
2. Petani atau lahan baru memakai **ID sementara** seperti `TMP-3F2A91` sampai tersinkron.
3. Saat internet kembali, antrean dikirim **berurutan**. Server memberi ID resmi (mis. `TMG0007`), lalu ID sementara diganti otomatis di semua data yang merujuknya (mis. lahan milik petani itu).
4. Indikator kecil di bawah layar menunjukkan status, misalnya `Offline · 3 menunggu`. **Ketuk indikator** untuk membuka panel **Antrean Sinkronisasi**.

### Panel Antrean Sinkronisasi

- **Sinkronkan sekarang**: memaksa kirim tanpa menunggu.
- **Coba lagi yang gagal**: mengirim ulang item yang ditolak.
- **Buang data ini**: menghapus satu item yang gagal.

### Bila ada yang gagal

Server tetap memeriksa semua aturan, jadi item bisa **ditolak** saat sinkron, misalnya NIK petani sudah terdaftar. Item seperti itu **tidak hilang**: ia berstatus `gagal` beserta pesan dari server. Lahan yang bergantung pada petani yang gagal ikut berstatus gagal dengan pesan "Bergantung pada data yang gagal disinkronkan". Perbaiki dengan membuang item lalu menginput ulang data yang benar.

### Sesi dan akun

- Sesi login berlaku **8 jam**. Jika habis sebelum sinkron, aplikasi kembali ke layar login dan **antrean tetap tersimpan**. Setelah login ulang, antrean terkirim otomatis dengan token baru.
- Antrean milik satu akun **tidak akan dikirim** dari akun lain. Login dengan akun pemilik data untuk menyinkronkannya.
- Saat logout, aplikasi memberi peringatan bila masih ada antrean. Data itu tetap aman di perangkat.

### Batasan yang perlu diketahui

- **Konflik edit:** bila dua orang mengubah petani yang sama, yang tersinkron terakhir yang berlaku.
- **Data pengguna lain:** perubahan orang lain baru terlihat setelah Anda online dan data dimuat ulang.
- **Perangkat bersama:** antrean yang belum tersinkron tersimpan di perangkat sampai terkirim atau dibuang.
- **Lama offline:** pengiriman ulang yang sama dikenali server selama 6 jam. Jika respons hilang lalu dicoba lagi lebih dari 6 jam kemudian, NIK petani yang sama ditolak sebagai duplikat, tetapi lahan bisa tercatat dua kali. Periksa daftar lahan setelah sinkron sesudah offline berhari-hari.
- **iOS:** pasang aplikasi ke layar utama. Tanpa itu Safari bisa menghapus antrean setelah sekitar 7 hari tidak dipakai.
- Pustaka dari CDN (Tailwind, Font Awesome, font Google) baru tersimpan untuk offline **setelah aplikasi dibuka sekali dengan internet**.

## 10. Keamanan

- Karena akses **Anyone**, siapa pun yang tahu alamat `/exec` dapat memanggil 10 fungsi yang diizinkan. Perlindungan datanya adalah **login berbasis token** yang sudah ada di aplikasi (password di-hash SHA-256, sesi 8 jam, kunci 15 menit setelah 5 kali gagal).
- **Ganti password admin awal `Admin@2026`** segera setelah login pertama.
- Repositori GitHub bersifat **publik**: jangan taruh kata sandi, kunci API, atau data petani di dalamnya. Berkas `docs/` hanya berisi kode tampilan dan alamat `/exec`.
- Pada perangkat bersama, selalu **logout** agar cache data dibersihkan.
- `PWA_TOKEN` pada `Api.gs` bersifat opsional dan **bukan** autentikasi sungguhan (bisa dibaca dari kode tampilan), hanya penghalang ringan.

## 11. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `Endpoint did not return JSON` | Akses bukan **Anyone**, atau belum **New version**. Ulangi [A3](#a3-deploy-sebagai-web-app-pengaturan-wajib). |
| Galat CORS di console | Ada header `Content-Type` yang ditambahkan ke `fetch`. Hapus; permintaan harus "simple". |
| `Function not allowed: xxx` | Tambahkan ke `PWA_ALLOWED_FUNCTIONS` di `Api.gs`, lalu deploy **New version**. |
| `Unknown function: xxx` | Fungsi dideklarasikan dengan `const`/`let`. Ubah menjadi `function xxx() {}`. |
| `Unknown function: saveVerifikasiLahan` | Fungsinya belum ada di `Code.gs`. Lihat catatan di [A1](#a1-tambahkan-apigs). |
| Halaman kosong / 404 di GitHub | Source Pages bukan `main` + `/docs`, repositori masih Private (akun gratis), atau folder `docs` belum berisi `index.html`. |
| Tampilan lama terus muncul | Versi cache belum dinaikkan. Naikkan, push, lalu tutup-buka aplikasi 2 kali. Di desktop: DevTools → Application → Service Workers → **Unregister**. |
| Tombol **Install** tidak muncul | Pastikan memakai HTTPS (GitHub Pages sudah HTTPS), `manifest.json` terbaca, dan Anda belum memasangnya. Di iOS tidak ada tombol, gunakan Add to Home Screen. |
| Indikator `gagal` muncul setelah sinkron | Ketuk indikator untuk melihat pesan server (mis. NIK ganda). Buang atau input ulang data. |
| Pesan "Sistem sibuk melakukan penomoran ID" | `Api.gs` lama masih terpasang. Pakai `Api.gs` terbaru (tidak mengunci ganda) lalu deploy **New version**. |
| Login selalu gagal setelah deploy | Cek **Executions** di editor Apps Script untuk melihat galat server. Pastikan `setupDatabase()` sudah dijalankan dan sheet `Pengguna` ada. |
| "Sesi berakhir" berulang | Token sesi memakai `CacheService` (8 jam). Login ulang; ini normal bila cache Apps Script dibersihkan. |
| Lambat pada panggilan pertama | Apps Script butuh 1–3 detik untuk *cold start*; panggilan berikutnya lebih cepat. |

Tempat paling cepat mencari galat server: editor Apps Script → menu kiri **Executions**.

## 12. Pertanyaan umum

**Apakah harus memakai domain sendiri?**
Tidak. Alamat `github.io` sudah HTTPS dan cukup. Domain sendiri bisa diatur di Settings → Pages → Custom domain.

**Apakah alamat `/exec` lama masih bisa dipakai?**
Ya. Halaman Apps Script asli tetap berjalan, tetapi versi itu tidak bisa dipasang sebagai PWA.

**Bagaimana mengganti nama atau warna aplikasi?**
Edit `docs/manifest.json` (`name`, `short_name`, `theme_color`, `background_color`), push, lalu naikkan versi cache. Ikon dapat diganti dengan file PNG baru di `docs/icons/` berukuran sama.

**Apakah bisa menyembunyikan repositori?**
Akun gratis memerlukan repositori Public untuk Pages. Repositori Private dengan Pages tersedia pada paket GitHub berbayar tertentu. Alternatif lain: hosting statis seperti Netlify atau Cloudflare Pages dengan langkah serupa (unggah isi `docs/`).

---

*Dihasilkan dari proyek Apps Script "SIPETA MITRA - Registrasi Petani & Lahan".*
