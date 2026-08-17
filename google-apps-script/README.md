# Panduan Integrasi Google Sheets Database (Google Apps Script)

Dokumen ini menjelaskan cara menghubungkan aplikasi Presensi Asrama Mu'allimin dengan **Google Sheets** menggunakan **Google Apps Script (`Code.gs`)**.

---

## Langkah 1: Buat Spreadsheet Google Sheets
1. Buka [Google Sheets](https://sheets.new) di browser Anda.
2. Beri nama spreadsheet, contoh: `Database Presensi Mu'allimin`.

---

## Langkah 2: Pasang Kode `Code.gs`
1. Pada menu atas spreadsheet, klik **Ekstensi (Extensions)** > **Apps Script**.
2. Hapus kode default `function myFunction() { ... }`.
3. Buka file [`google-apps-script/Code.gs`](file:///d:/ANDI/presensi/google-apps-script/Code.gs) di proyek ini, lalu salin seluruh kodenya dan tempel ke editor Apps Script.
4. Klik ikon **Simpan (Save / Ctrl+S)**.

---

## Langkah 3: Deploy sebagai Web App
1. Di pojok kanan atas editor Apps Script, klik tombol biru **Deploy (Terapkan)** > **New deployment (Penerapan baru)**.
2. Klik ikon gear ⚙️ di sebelah *Select type* lalu pilih **Web app (Aplikasi web)**.
3. Atur konfigurasi berikut:
   - **Description**: `Database API Presensi v1`
   - **Execute as (Jalankan sebagai)**: `Me (email-anda@gmail.com)`
   - **Who has access (Siapa yang memiliki akses)**: `Anyone (Siapa saja)` *(Wajib agar aplikasi frontend dapat mengirim/menerima data)*.
4. Klik **Deploy**.
5. Jika muncul permintaan izin (*Authorization Required*):
   - Klik **Authorize access**.
   - Pilih akun Google Anda.
   - Klik **Advanced (Lanjutan)** > klik **Go to Untitled project (unsafe)**.
   - Klik **Allow (Izinkan)**.
6. Salin **Web app URL** yang berformat:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

## Langkah 4: Masukkan URL ke Aplikasi
1. Buka aplikasi Presensi di browser.
2. Klik indikator awan/status sinkronisasi di header (atau buka menu Pengaturan Cloud Sync).
3. Tempel URL Web App yang sudah disalin ke input **Google Apps Script URL**.
4. Klik **Uji Koneksi & Simpan**.
5. Klik **Tarik Data dari Cloud** untuk sinkronisasi awal.
