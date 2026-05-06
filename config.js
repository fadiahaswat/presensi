// File: config.js
// Konfigurasi terpusat — edit file ini untuk menyesuaikan deployment.

// ==========================================
// KREDENSIAL & URL EKSTERNAL
// ==========================================
window.APP_CREDENTIALS = {
    // Google Apps Script (sumber data Santri & Kelas — URL yang sama)
    googleSheetUrl: 'https://script.google.com/macros/s/AKfycbw-URYAsLTWCdnGurQhM1ZXa9N8vm-GBlHwtetDlin73-Ma8G0aAbFoboGGUI8GgVDl/exec',

    // Google OAuth Client ID (untuk login Musyrif)
    googleClientId: '694043281368-cqf9tji9rsv2k2gtfu7pbicdsc1gcvk7.apps.googleusercontent.com'
};

// ==========================================
// KONSTANTA APLIKASI (MAGIC NUMBERS)
// ==========================================
window.APP_CONSTANTS = {
    // Kunci localStorage untuk PIN Musyrif
    pinKey: 'musyrif_pin',

    // Batas ukuran data sebelum peringatan storage penuh (~4.5 MB)
    maxStorageBytes: 4500000,

    // Batas maksimal entri log aktivitas yang disimpan
    maxActivityLogEntries: 50,

    // Berapa hari ke belakang data presensi masih bisa diedit
    maxEditDaysBack: 3,

    // Timeout (ms) untuk load data dari server saat startup
    dataLoadTimeoutMs: 8000,

    // Durasi cache data santri sebelum diperbarui dari server (24 jam)
    santriCacheExpiryMs: 24 * 60 * 60 * 1000
};
