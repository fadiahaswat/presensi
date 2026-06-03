// File: config.js
// Konfigurasi terpusat — edit file ini untuk menyesuaikan deployment.

// ==========================================
// KREDENSIAL & URL EKSTERNAL
// ==========================================
window.APP_CREDENTIALS = {
    // Google Apps Script (sumber data Santri & Kelas — URL yang sama)
    googleSheetUrl: 'https://script.google.com/macros/s/AKfycbw-URYAsLTWCdnGurQhM1ZXa9N8vm-GBlHwtetDlin73-Ma8G0aAbFoboGGUI8GgVDl/exec',

    // Google OAuth Client ID (untuk login Musyrif)
    googleClientId: '694043281368-cqf9tji9rsv2k2gtfu7pbicdsc1gcvk7.apps.googleusercontent.com',
    
    // Tahfizh System - Google Apps Script URL
    tahfizhScriptUrl: 'https://script.google.com/macros/s/AKfycbyl2FCcGUtolkJIDsoiTYFKeKp8IQwHT0V3z8n1pOHH9CLiyvYZTBaimrojILJM_A-HLg/exec'
};

// ==========================================
// MODE AUTENTIKASI
// ==========================================
window.APP_AUTH = {
    // 'production' = PIN + Google OAuth
    // 'testing' = PIN + username/password lokal (tanpa Google)
    loginMode: 'production',
    allowTestingMode: false,

    // Akun khusus pengujian (password hash SHA-256 hex) — hanya untuk non-produksi
    // Contoh generate hash: echo -n "password-anda" | shasum -a 256
    // Catatan: kelas harus sesuai kelas yang valid di data-kelas
    testingAccounts: [
        {
            username: 'tester-musyrif',
            kelas: 'XI-A',
            passwordHash: 'b822f1cd2dcfc685b47e83e3980289fd5d8e3ff3a82def24d7d1d68bb272eb32'
        }
    ]
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

// ==========================================
// KONFIGURASI TAHFIZH SYSTEM
// ==========================================
window.APP_TAHFIZH_CONFIG = {
    // Konfigurasi Nama Grup Kelas Khusus
    classGroupOverrides: {
        'Muhammad Zhafir Setiaji': '2CDGH',
    },
    
    // Urutan Musyrif di Dropdown
    musyrifSortOrder: ['Andi Aqillah Fadia Haswat', 'Abdullah', 'Muhammad Zhafir Setiaji'], 
    
    // Deadline
    deadlineJuz30Score: new Date('2026-01-03T23:59:59'),
    deadlineTahfizhTuntas: new Date('2025-09-30T23:59:59'),

    // Perpulangan Periods
    perpulanganPeriods: [
        { name: 'Periode 1', deadline: new Date('2025-08-16T13:00:00'), required: ["An-Naba", "An-Nazi'at"], type: 'surat' },
        { name: 'Periode 2', deadline: new Date('2025-09-06T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa'], type: 'surat' },
        { name: 'Periode 3', deadline: new Date('2025-10-04T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir'], type: 'surat' },
        { name: 'Periode 4', deadline: new Date('2025-11-08T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin'], type: 'surat' },
        { name: 'Periode 5', deadline: new Date('2025-12-20T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin', 'Al-Insyiqaq', 'Al-Buruj', 'Ath-Thariq'], type: 'surat' },
        { name: 'Periode 6', deadline: new Date('2026-01-03T13:00:00'), required: ['juz30_setengah'], type: 'mutqin' }
    ],

    // Scoring Tiers
    scoringTiers: [
        { score: 80, required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin', 'Al-Insyiqaq', 'Al-Buruj', 'Ath-Thariq'] },
        { score: 76, required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin', 'Al-Insyiqaq', 'Al-Buruj'] },
        { score: 72, required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin', 'Al-Insyiqaq'] },
        { score: 64, required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin'] },
        { score: 52, required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor'] },
        { score: 44, required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir'] },
        { score: 36, required: ["An-Naba", "An-Nazi'at", 'Abasa'] },
        { score: 24, required: ["An-Naba", "An-Nazi'at"] },
        { score: 12, required: ['An-Naba'] }
    ],
    
    // Data akan diisi dari API
    hafalanData: null, 
    santriList: []
};
