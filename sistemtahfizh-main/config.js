const AppConfig = {
    // URL Web App Google Apps Script Anda (PASTIKAN INI URL TERBARU SETELAH DEPLOY)
    scriptURL: 'https://script.google.com/macros/s/AKfycbyl2FCcGUtolkJIDsoiTYFKeKp8IQwHT0V3z8n1pOHH9CLiyvYZTBaimrojILJM_A-HLg/exec',

    // Konfigurasi Nama Grup Kelas Khusus
    classGroupOverrides: {
        'Muhammad Zhafir Setiaji': '2CDGH',
    },
    
    // Urutan Musyrif di Dropdown
    musyrifSortOrder: ['Andi Aqillah Fadia Haswat', 'Abdullah', 'Muhammad Zhafir Setiaji'], 
    
    // Deadline
    deadlineJuz30Score: new Date('2026-01-03T23:59:59'),
    deadlineTahfizhTuntas: new Date('2025-09-30T23:59:59'),

    // Perpulangan
    perpulanganPeriods: [
        { name: 'Periode 1', deadline: new Date('2025-08-16T13:00:00'), required: ["An-Naba", "An-Nazi'at"], type: 'surat' },
        { name: 'Periode 2', deadline: new Date('2025-09-06T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa'], type: 'surat' },
        { name: 'Periode 3', deadline: new Date('2025-10-04T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir'], type: 'surat' },
        { name: 'Periode 4', deadline: new Date('2025-11-08T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin'], type: 'surat' },
        { name: 'Periode 5', deadline: new Date('2025-12-20T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin', 'Al-Insyiqaq', 'Al-Buruj', 'Ath-Thariq'], type: 'surat' },
        { name: 'Periode 6', deadline: new Date('2026-01-03T13:00:00'), required: ['juz30_setengah'], type: 'mutqin' }
    ],

    // Scoring
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
    
    // [PENTING] Set null agar diisi oleh data dari Spreadsheet
    hafalanData: null, 
    
    santriList: []
};
