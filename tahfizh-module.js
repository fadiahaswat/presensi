// File: tahfizh-module.js
// Wrapper module untuk Tahfizh System sebagai bagian dari Presensi App

let tahfizhInitialized = false;
let tahfizhAppState = null;

window.initTahfizhModule = async function() {
    if (tahfizhInitialized) {
        console.log('Tahfizh sudah diinisialisasi');
        return;
    }

    try {
        console.log('Menginisialisasi Tahfizh Module...');
        
        const container = document.getElementById('tahfizh-container');
        if (!container) {
            console.error('Container tahfizh tidak ditemukan');
            return;
        }

        // Load Tahfizh HTML template
        await loadTahfizhUI(container);
        
        // Initialize Tahfizh App dengan data dari Presensi
        await initializeTahfizhApp();
        
        tahfizhInitialized = true;
        console.log('Tahfizh Module berhasil diinisialisasi');
    } catch (error) {
        console.error('Error initializing Tahfizh:', error);
        window.showToast('Gagal memuat modul Tahfizh', 'error');
    }
};

// Load Tahfizh UI
async function loadTahfizhUI(container) {
    // Create basic Tahfizh UI structure
    container.innerHTML = `
        <div id="tahfizh-app" class="w-full h-full">
            <!-- Loading -->
            <div id="tahfizh-loading" class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-slate-900">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                <p class="mt-4 text-slate-600 dark:text-slate-400">Memuat Sistem Tahfizh...</p>
            </div>

            <!-- Main Content (akan di-render oleh app.js) -->
            <div id="role-selection-modal" class="hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                    <h2 class="text-xl font-bold text-slate-800 dark:text-white mb-4">Pilih Mode Akses</h2>
                    
                    <div id="role-buttons" class="space-y-3">
                        <button onclick="window.tahfizhSetRole('santri')" class="w-full p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold hover:bg-blue-100 transition-all">
                            📚 Santri
                        </button>
                        <button onclick="window.tahfizhSetRole('musyrif')" class="w-full p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl font-bold hover:bg-amber-100 transition-all">
                            👨‍🏫 Musyrif
                        </button>
                        <button onclick="window.tahfizhSetRole('wali')" class="w-full p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl font-bold hover:bg-purple-100 transition-all">
                            👤 Wali
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tahfizh Main Layout -->
            <div id="main-layout" class="hidden w-full h-full">
                <!-- Sidebar Navigation -->
                <aside id="tahfizh-sidebar" class="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
                    <div class="p-4 text-center border-b border-slate-200 dark:border-slate-700">
                        <h1 class="text-lg font-bold text-slate-800 dark:text-white">Setor.in</h1>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Aplikasi Tahfizh</p>
                    </div>
                    <nav class="p-4 space-y-2" id="tahfizh-nav">
                        <!-- Navigation items akan di-generate oleh app.js -->
                    </nav>
                </aside>

                <!-- Main Content Area -->
                <main id="tahfizh-main-content" class="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                    <!-- Content akan di-generate oleh app.js -->
                </main>
            </div>
        </div>
    `;
}

// Initialize Tahfizh App
async function initializeTahfizhApp() {
    try {
        // Prepare shared config from Presensi
        const tahfizhConfig = {
            // API endpoint (gunakan yang sama dengan Presensi jika ada)
            scriptURL: window.APP_CONFIG?.tahfizhScriptURL || 'https://script.google.com/macros/s/AKfycbyl2FCcGUtolkJIDsoiTYFKeKp8IQwHT0V3z8n1pOHH9CLiyvYZTBaimrojILJM_A-HLg/exec',
            
            // Class overrides
            classGroupOverrides: {
                'Muhammad Zhafir Setiaji': '2CDGH',
            },
            
            // Musyrif sort order
            musyrifSortOrder: ['Andi Aqillah Fadia Haswat', 'Abdullah', 'Muhammad Zhafir Setiaji'],
            
            // Deadlines
            deadlineJuz30Score: new Date('2026-01-03T23:59:59'),
            deadlineTahfizhTuntas: new Date('2025-09-30T23:59:59'),
            
            // Perpulangan periods
            perpulanganPeriods: [
                { name: 'Periode 1', deadline: new Date('2025-08-16T13:00:00'), required: ["An-Naba", "An-Nazi'at"], type: 'surat' },
                { name: 'Periode 2', deadline: new Date('2025-09-06T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa'], type: 'surat' },
                { name: 'Periode 3', deadline: new Date('2025-10-04T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir'], type: 'surat' },
                { name: 'Periode 4', deadline: new Date('2025-11-08T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin'], type: 'surat' },
                { name: 'Periode 5', deadline: new Date('2025-12-20T13:00:00'), required: ["An-Naba", "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infithor', 'Al-Muthoffifin', 'Al-Insyiqaq', 'Al-Buruj', 'Ath-Thariq'], type: 'surat' },
                { name: 'Periode 6', deadline: new Date('2026-01-03T13:00:00'), required: ['juz30_setengah'], type: 'mutqin' }
            ],
            
            // Scoring tiers
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
            
            // Hafalan data (akan diisi dari server)
            hafalanData: null,
            santriList: []
        };

        // Expose config globally untuk tahfizh app
        window.AppConfig = tahfizhConfig;
        
        // Initialize Tahfizh UI dengan mode selection
        showTahfizhRoleSelection();
        
    } catch (error) {
        console.error('Error initializing Tahfizh app:', error);
        throw error;
    }
}

// Set Tahfizh Role dan Load Data
window.tahfizhSetRole = async function(role) {
    try {
        // Sembunyikan modal
        document.getElementById('role-selection-modal').classList.add('hidden');
        document.getElementById('tahfizh-loading').classList.remove('hidden');
        
        // Set role di Tahfizh state
        if (window.State) {
            window.State.currentRole = role;
        }
        
        // Load data dari Presensi atau Tahfizh API
        await loadTahfizhData();
        
        // Tampilkan main layout
        document.getElementById('tahfizh-loading').classList.add('hidden');
        document.getElementById('main-layout').classList.remove('hidden');
        
        // Initialize Tahfizh App logic
        if (window.Core && window.Core.reloadData) {
            await window.Core.reloadData();
        }
        
    } catch (error) {
        console.error('Error setting Tahfizh role:', error);
        document.getElementById('tahfizh-loading').classList.add('hidden');
        window.showToast('Gagal memuat data Tahfizh', 'error');
    }
};

// Load Tahfizh Data
async function loadTahfizhData() {
    try {
        // Fetch data dari API
        const response = await fetch(window.AppConfig?.scriptURL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        // Cache data
        localStorage.setItem('tahfizh_cached_data', JSON.stringify(data));
        
        return data;
    } catch (error) {
        console.warn('Gagal fetch data Tahfizh, menggunakan cache...');
        
        // Try to use cache
        const cached = localStorage.getItem('tahfizh_cached_data');
        if (cached) return JSON.parse(cached);
        
        throw error;
    }
}

// Show Role Selection Modal
function showTahfizhRoleSelection() {
    document.getElementById('role-selection-modal').classList.remove('hidden');
}

// Cleanup function
window.closeTahfizhModule = function() {
    tahfizhInitialized = false;
    tahfizhAppState = null;
    document.getElementById('tahfizh-container').innerHTML = '';
};

// Export untuk testing
window.TahfizhModule = {
    init: window.initTahfizhModule,
    close: window.closeTahfizhModule,
    setRole: window.tahfizhSetRole
};

console.log('Tahfizh Module loaded');
