# Integrasi Perpulangan ke Manajemen Perizinan - Summary

## Tanggal Implementasi
2026-01-13

## Ringkasan Perubahan

Fitur Manajemen Perpulangan yang sebelumnya terpisah telah berhasil diintegrasikan ke dalam Manajemen Perizinan dengan menambahkan opsi "Pulang" sebagai salah satu tipe perizinan.

## Fitur Baru yang Ditambahkan

### 1. Opsi "Pulang" di Manajemen Perizinan (`index.html`)
- Ditambahkan opsi "Pulang" pada dropdown tipe perizinan
- Lokasi: `#permit-view-type` select element
- Pilihan sekarang: Sakit, Izin, **Pulang**

### 2. Form Khusus untuk Perpulangan
Ketika tipe "Pulang" dipilih, form menampilkan field-field berikut:

#### Field Khusus Pulang (`permit-view-pulang-container`):
- **Sesi Pulang** (`permit-view-pulang-session`): Dropdown untuk memilih sesi kapan pulang dimulai
- **Nama Event Perpulangan** (`permit-view-event-name`): Input teks untuk nama event (contoh: "Liburan Maulid", "Liburan Semester")

#### Field Tanggal & Waktu:
- **Mulai Tanggal** (`permit-view-start`): Date picker untuk tanggal mulai
- **Sampai Tanggal** (`permit-view-end`): Date picker untuk tanggal akhir
- **Sampai Jam** (`permit-view-end-time`): Time picker untuk jam akhir kepulangan (hanya muncul untuk Pulang)

### 3. Fitur "Pilih Semua" Anak
- Checkbox "Pilih Semua" (`permit-view-select-all`) ditambahkan di bagian pilih anak
- **Behavior Khusus untuk Pulang**: Ketika tipe Pulang dipilih, semua anak akan otomatis tercentang
- **Use Case**: Musyrif hanya perlu un-check anak yang TIDAK pulang (lebih efisien)

## Perubahan Backend/Logic (`app-features.js`)

### 1. Fungsi `togglePermitViewFields()`
Ditingkatkan untuk menangani tiga tipe: Sakit, Izin, dan Pulang
- Menampilkan/menyembunyikan field sesuai tipe yang dipilih
- Auto-check semua anak ketika Pulang dipilih

### 2. Fungsi `savePermitFromView()`
Ditingkatkan untuk menyimpan data Pulang dengan struktur:
```javascript
{
    id: "unique_id",
    nis: "student_id",
    type: "Pulang",
    session: "sesi_pulang", // dari permit-view-pulang-session
    start_date: "YYYY-MM-DD",
    end_date: "YYYY-MM-DD",
    end_time: "HH:MM",
    event_name: "Nama Event",
    status: "Pulang",
    arrival_date: null, // akan diisi ketika sudah kembali
    timestamp: "ISO_timestamp"
}
```

### 3. Fungsi `checkActivePermit()`
Ditingkatkan untuk mengenali dan memproses permit dengan tipe "Pulang"
- Memperlakukan Pulang sama seperti Izin (fixed duration)
- Auto-transition ke "Alpa" jika melewati end_date

### 4. Fungsi `renderPermitViewList()`
Ditingkatkan untuk menampilkan permit Pulang dengan:
- Badge warna indigo untuk membedakan dari Sakit (amber) dan Izin (blue)
- Menampilkan event name dan end time
- Mendukung edit dan delete

### 5. Fungsi Baru: `toggleAllPermitViewSantri()`
Mencentang/un-check semua checkbox santri sekaligus

## Perubahan Rendering UI (`app-core.js`)

### 1. Badge Display
Permit dengan tipe "Pulang" ditampilkan dengan badge indigo:
```javascript
{
    type: 'Pulang',
    badgeClass: 'bg-indigo-100 text-indigo-600 border-indigo-200'
}
```

### 2. Auto-Note untuk Pulang
Format catatan otomatis:
```
[Auto] Pulang s/d DD MMM YYYY HH:MM - Nama Event
```

### 3. Row Highlight
Baris santri dengan status Pulang mendapat highlight indigo:
```
ring-1 ring-indigo-200 bg-indigo-50/30
```

## Penghapusan Fitur Lama

### HTML (`index.html`)
Dihapus:
- ✅ Section `view-homecoming` (full-page view)
- ✅ Modal `modal-homecoming` (input perpulangan lama)
- ✅ Modal `modal-hc-edit` (edit data perpulangan)
- ✅ Modal `modal-event-manager` (manage event perpulangan)
- ✅ Modal `modal-extend-homecoming` (perpanjang pulang)
- ✅ Button "Perpulangan Santri" di dashboard

### JavaScript (`app-features.js`)
Deprecated (dengan guard clause):
- ✅ `openHomecomingView()` - Menampilkan toast redirect ke Permit View
- ✅ `openHomecomingModal()` - Console warning

Fungsi lainnya tetap ada untuk backward compatibility dengan data lama, namun tidak akan digunakan untuk data baru.

### Data Storage
- **homecomingKey**: Tetap ada untuk backward compatibility
- **appState.homecomings**: Tetap ada untuk data lama
- **Data Baru**: Disimpan di `permitKey` dengan type "Pulang"

## Validasi Form

Untuk tipe "Pulang", validasi memastikan:
1. Minimal 1 anak dipilih
2. Tanggal mulai harus diisi
3. Tanggal akhir harus diisi
4. Jam akhir harus diisi
5. Nama event harus diisi
6. Tanggal mulai ≤ tanggal akhir

## User Experience Improvements

1. **Satu Tempat untuk Semua**: Sakit, Izin, dan Pulang sekarang dalam satu interface
2. **Lebih Efisien**: Default semua anak tercentang untuk Pulang, hanya perlu un-check yang tidak pulang
3. **Lebih Terstruktur**: Form Pulang memiliki field khusus (sesi, event name, end time)
4. **Konsisten**: Styling dan behavior konsisten dengan permit lainnya
5. **Edit & Delete**: Mendukung edit status kedatangan dan delete data

## File yang Dimodifikasi

1. `index.html` - UI changes
2. `app-features.js` - Logic changes  
3. `app-core.js` - Rendering changes

## Backward Compatibility

- Data perpulangan lama (dari homecoming) masih tersimpan dan dapat diakses
- Tidak ada data loss
- Sistem tetap dapat membaca data lama untuk keperluan laporan/riwayat
- Data baru menggunakan struktur permit dengan type "Pulang"

## Testing Checklist

- [x] Form Pulang muncul ketika tipe "Pulang" dipilih
- [x] Semua field Pulang (sesi, event name, tanggal, waktu) ada dan berfungsi
- [x] Default all children checked untuk Pulang
- [x] Checkbox "Pilih Semua" berfungsi
- [x] Validasi form berjalan dengan benar
- [x] Data tersimpan ke localStorage dengan struktur yang benar
- [x] Display di permit list menampilkan badge indigo dan info lengkap
- [x] Active permit rendering di attendance list bekerja
- [x] Old homecoming UI removed
- [x] Old homecoming functions deprecated

## Next Steps (Optional Future Enhancements)

1. Migration tool untuk convert old homecoming data ke permit format
2. Report/export untuk data Pulang
3. Notifikasi untuk santri yang belum kembali setelah deadline
4. Statistik perpulangan per periode

## Catatan Penting

⚠️ **BACKWARD COMPATIBILITY**: Meskipun UI lama sudah dihapus, data lama masih tetap ada di localStorage dengan key `musyrif_homecoming_db`. Jika diperlukan, bisa dibuat tool untuk migrasi data atau membersihkan data lama.

✅ **PRODUCTION READY**: Implementasi sudah siap untuk production use. Semua fitur yang diminta sudah diimplementasikan dengan perubahan minimal pada codebase.
