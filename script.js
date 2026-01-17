// File: script.js

// ==========================================
// KONEKSI SUPABASE (GUDANG DATA)
// ==========================================
// 1. Ambil URL dari Tahap 3 (Project URL)
const SUPABASE_URL = 'https://gtfqebengsazursaamzf.supabase.co'; 

// 2. Ambil Key dari Tahap 3 (anon public)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0ZnFlYmVuZ3NhenVyc2FhbXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjc1ODIsImV4cCI6MjA4MzcwMzU4Mn0.bkhDWAcBa04lyFk_P2bBjblAtkz2qj4aRkNkrhhJw_Q';

// 3. Nyalakan Mesin Supabase
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase Siap!");

let saveTimeout = null;
let clockInterval = null;
let lucideTimeout = null;
let modalStack = [];

window.addEventListener('beforeunload', () => {
    if(clockInterval) clearInterval(clockInterval);
    if(saveTimeout) clearTimeout(saveTimeout);
    if(lucideTimeout) clearTimeout(lucideTimeout);
});

// ==========================================
// CONFIG & CONSTANTS
// ==========================================
const APP_CONFIG = {
    storageKey: 'musyrif_app_v5_fix',
    permitKey: 'musyrif_permits_db', // <-- TAMBAHAN BARU
    pinDefault: '1234',
    activityLogKey: 'musyrif_activity_log',
    settingsKey: 'musyrif_settings',
    googleAuthKey: 'musyrif_google_session', // Key penyimpanan sesi
    googleClientId: '694043281368-cqf9tji9rsv2k2gtfu7pbicdsc1gcvk7.apps.googleusercontent.com' // <-- PASTE CLIENT ID DARI TAHAP 1
};

// ==========================================
// KONFIGURASI LOKASI (GEOFENCING)
// ==========================================
const GEO_CONFIG = {
    useGeofencing: false, // Set ke false jika ingin mematikan fitur ini sementara
    maxRadiusMeters: 200, // Radius toleransi dalam meter (misal: 50 meter)
    locations: [
        { 
            name: "Masjid Jami' Mu'allimin", 
            lat: -7.807757309250455, // GANTI DENGAN KOORDINAT ASLI
            lng: 110.35091531948025 // GANTI DENGAN KOORDINAT ASLI
        },
        { 
            name: "Aula Asrama 10", 
            lat: -7.807645469455366,  // GANTI DENGAN KOORDINAT ASLI
            lng: 110.35180282962452 // GANTI DENGAN KOORDINAT ASLI
        },
        { 
            name: "Mushola Asrama 8", 
            lat: -7.806781091907755,  // GANTI DENGAN KOORDINAT ASLI
            lng: 110.34871697299599 // GANTI DENGAN KOORDINAT ASLI
        },
        { 
            name: "Masjid Hajah Yuliana", 
            lat: -7.807337010430911, // GANTI DENGAN KOORDINAT ASLI
            lng: 110.26653812830205 // GANTI DENGAN KOORDINAT ASLI
        }
    ]
};

const UI_COLORS = {
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500'
};

window.sanitizeHTML = function(str) {
    if(!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.textContent; // Return text, NOT innerHTML
};

window.refreshIcons = function() {
    clearTimeout(lucideTimeout);
    lucideTimeout = setTimeout(() => {
        if(window.lucide) {
            try {
                window.lucide.createIcons();
            } catch(e) {
                console.warn('Lucide render error:', e);
            }
        }
    }, 150);
};


// ==========================================
// HELPER FUNCTIONS
// ==========================================

window.parseJwt = function (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
};

// Helper Tanggal yang Aman (Local Time YYYY-MM-DD)
window.getLocalDateStr = function(dateObj = new Date()) {
    try {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch(e) {
        console.error('Date conversion error:', e);
        return new Date().toISOString().split('T')[0];
    }
};

// Format tanggal ke "Senin, 1 Jan 2025"
window.formatDate = function(dateStr) {
    if (!dateStr) return '-';
    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    
    const d = new Date(dateStr);
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Polyfill Canvas roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radii) {
        const radius = Array.isArray(radii) ? radii[0] : radii;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
        return this;
    };
}

// ==========================================
// STATE MANAGEMENT
// ==========================================
let appState = {
    selectedClass: null,
    currentSlotId: 'shubuh',
    attendanceData: {},
    searchQuery: '',
    analysisMode: 'daily', // daily, weekly, monthly, semester
    reportMode: 'daily', // daily, weekly, monthly, semester, yearly <-- BARU
    analysisSantriId: null,
    filterProblemOnly: false,
    date: window.getLocalDateStr(),
    activityLog: [],
    settings: {
        darkMode: false,
        notifications: true,
        autoSave: true
    }
};

// DATA STORE
let MASTER_SANTRI = [];
let MASTER_KELAS = {};
let FILTERED_SANTRI = [];

// ==========================================
// SLOT & STATUS CONFIGURATION (UPDATED)
// ==========================================
const SLOT_WAKTU = {
    shubuh: { 
        id: 'shubuh', label: 'Shubuh', subLabel: '04:00 - 06:00', theme: 'emerald', 
        startHour: 4, 
        style: {
            icon: 'sunrise', 
            gradient: 'from-emerald-50 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/20',
            border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
            text: 'text-emerald-700 dark:text-emerald-300',
            iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-200'
        },
        activities: [
            { id: 'shalat', label: 'Shubuh', type: 'mandator', category: 'fardu' },
            { id: 'qabliyah', label: 'Qabliyah', type: 'sunnah', category: 'dependent' },
            { id: 'dzikir_pagi', label: 'Dzikir', type: 'sunnah', category: 'dependent' },
            { id: 'tahfizh', label: 'Tahfizh', type: 'mandator', category: 'kbm' }, // KBM Asrama
            { id: 'tahajjud', label: 'Tahajjud', type: 'sunnah', category: 'sunnah' },
            { id: 'conversation', label: 'Conver', type: 'mandator', category: 'kbm', showOnDays: [0] }
    ]},
    // --- SESI BARU: SEKOLAH ---
    sekolah: { 
        id: 'sekolah', label: 'Sekolah', subLabel: '06:00 - 15:00', theme: 'cyan', 
        startHour: 6, 
        style: {
            icon: 'graduation-cap', 
            gradient: 'from-cyan-50 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/20',
            border: 'hover:border-cyan-300 dark:hover:border-cyan-700',
            text: 'text-cyan-700 dark:text-cyan-300',
            iconBg: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-800 dark:text-cyan-200'
        },
        activities: [
            // Kategori khusus 'school' agar terpisah statistiknya
            { id: 'kbm_sekolah', label: 'KBM Sekolah', type: 'mandator', category: 'school' } 
    ]},
    ashar: { 
        id: 'ashar', label: 'Ashar', subLabel: '15:00 - 17:00', theme: 'orange', 
        startHour: 15,
        style: {
            icon: 'sun',
            gradient: 'from-orange-50 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/20',
            border: 'hover:border-orange-300 dark:hover:border-orange-700',
            text: 'text-orange-700 dark:text-orange-300',
            iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-800 dark:text-orange-200'
        },
        activities: [
            { id: 'shalat', label: 'Ashar', type: 'mandator', category: 'fardu' },
            { id: 'dzikir_petang', label: 'Dzikir', type: 'sunnah', category: 'dependent' }
    ]},
    maghrib: { 
        id: 'maghrib', label: 'Maghrib', subLabel: '18:00 - 19:00', theme: 'indigo', 
        startHour: 18,
        style: {
            icon: 'sunset',
            gradient: 'from-indigo-50 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/20',
            border: 'hover:border-indigo-300 dark:hover:border-indigo-700',
            text: 'text-indigo-700 dark:text-indigo-300',
            iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-200'
        },
        activities: [
            { id: 'shalat', label: 'Maghrib', type: 'mandator', category: 'fardu' },
            { id: 'bakdiyah', label: 'Ba\'diyah', type: 'sunnah', category: 'dependent' },
            { id: 'dhuha', label: 'Dhuha', type: 'sunnah', category: 'sunnah' },
            { id: 'puasa', label: 'Puasa', type: 'sunnah', category: 'sunnah' },
            { id: 'tahsin', label: 'Tahsin', type: 'mandator', category: 'kbm', showOnDays: [4, 5] },
            { id: 'conversation', label: 'Conver', type: 'mandator', category: 'kbm', showOnDays: [3] },
            { id: 'vocabularies', label: 'Vocab', type: 'mandator', category: 'kbm', showOnDays: [1, 2] }
    ]},
    isya: { 
        id: 'isya', label: 'Isya', subLabel: '19:00 - 21:00', theme: 'slate', 
        startHour: 19,
        style: {
            icon: 'moon', 
            gradient: 'from-slate-50 to-blue-100 dark:from-slate-800 dark:to-blue-900/40',
            border: 'hover:border-blue-300 dark:hover:border-blue-700',
            text: 'text-slate-700 dark:text-slate-300',
            iconBg: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        },
        activities: [
            { id: 'shalat', label: 'Isya', type: 'mandator', category: 'fardu' },
            { id: 'bakdiyah', label: 'Ba\'diyah', type: 'sunnah', category: 'dependent' },
            { id: 'alkahfi', label: 'Al-Kahfi', type: 'sunnah', category: 'sunnah', showOnDays: [4] }
    ]}
};

// Konfigurasi Desain: DOUBLE LAYER BORDER
const STATUS_UI = {
    'Hadir': { 
        // SOLID BASE + TEXT PUTIH
        // Border Dalam: Emerald-300 (Tint), Border Luar: Emerald-600 (Solid)
        class: 'bg-emerald-500 text-white border-4 border-emerald-300 shadow-[0_0_0_1.5px_#059669] hover:scale-105', 
        label: 'H',
        // Konfigurasi Warna Kartu (Akan dipakai di logic render)
        card: { bg: 'bg-white dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' }
    },
    'Ya': { 
        // SAMA SEPERTI HADIR
        class: 'bg-emerald-500 text-white border-4 border-emerald-300 shadow-[0_0_0_1.5px_#059669] hover:scale-105', 
        label: 'Y',
        card: { bg: 'bg-white dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' }
    },
    'Alpa': { 
        // SOLID BASE + TEXT PUTIH (Khusus Alpa)
        // Border Dalam: Rose-300, Border Luar: Rose-600
        class: 'bg-rose-500 text-white border-4 border-rose-300 shadow-[0_0_0_1.5px_#be123c] hover:scale-105', 
        label: 'A',
        // Kartu Alpa: Merah Pudar + Garis Merah Solid
        card: { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-500' }
    },
    'Telat': { 
        // TINT BASE (Pengecualian, Telat masuk kategori "biasa" untuk kartu)
        class: 'bg-emerald-50 text-emerald-700 border-4 border-emerald-200 shadow-[0_0_0_1.5px_#059669] hover:scale-105', 
        label: 'T',
        card: { bg: 'bg-white dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' }
    },
    'Sakit': { 
        // TINT BASE + TEXT WARNA
        // Border Dalam: Amber-200, Border Luar: Amber-500
        class: 'bg-amber-50 text-amber-700 border-4 border-amber-200 shadow-[0_0_0_1.5px_#d97706] hover:scale-105', 
        label: 'S',
        // Kartu Sakit: Kuning Pudar + Garis Kuning Solid
        card: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500' }
    },
    'Izin': { 
        // TINT BASE + TEXT WARNA
        class: 'bg-blue-50 text-blue-700 border-4 border-blue-200 shadow-[0_0_0_1.5px_#2563eb] hover:scale-105', 
        label: 'I',
        // Kartu Izin: Biru Pudar + Garis Biru Solid
        card: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500' }
    },
    'Pulang': { 
        // TINT BASE + TEXT WARNA
        class: 'bg-purple-50 text-purple-700 border-4 border-purple-200 shadow-[0_0_0_1.5px_#9333ea] hover:scale-105', 
        label: 'P',
        // Kartu Pulang: Ungu Pudar + Garis Ungu Solid
        card: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-500' }
    },
    'Tidak': { 
        // DEFAULT GRAY
        class: 'bg-slate-50 text-slate-400 border-4 border-slate-100 shadow-[0_0_0_1.5px_#cbd5e1]', 
        label: '-',
        card: { bg: 'bg-white dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' }
    }
};

// Tambahkan 'kemarin': 0 agar logika matematika berjalan
const SESSION_ORDER = { 'kemarin': 0, 'shubuh': 1, 'sekolah': 2, 'ashar': 3, 'maghrib': 4, 'isya': 5 };

// ==========================================
// KONFIGURASI PEMBINAAN (Disciplinary Rules)
// ==========================================
const PEMBINAAN_RULES = [
    { min: 1, max: 10, level: 1, label: "Bimbingan Musyrif", action: "Lembar Pembinaan", color: "text-yellow-600 bg-yellow-100 border-yellow-200" },
    { min: 11, max: 20, level: 2, label: "SP1 - Pamong", action: "Surat Pernyataan I", color: "text-orange-600 bg-orange-100 border-orange-200" },
    { min: 21, max: 30, level: 3, label: "SP2 - SU. KIS", action: "Panggil Ortu & SP II", color: "text-orange-700 bg-orange-200 border-orange-300" },
    { min: 31, max: 40, level: 4, label: "SP3 - Wadir IV", action: "Panggil Ortu & SP III", color: "text-red-600 bg-red-100 border-red-200" },
    { min: 41, max: 999, level: 5, label: "Direktur - SPT", action: "Surat Pernyataan Terakhir/Keluar", color: "text-white bg-red-600 border-red-700" }
];

// Helper: Hitung Total Alpa Santri
window.countTotalAlpa = function(studentId) {
    let total = 0;
    // Loop semua tanggal yang ada di data
    Object.keys(appState.attendanceData).forEach(date => {
        const dayData = appState.attendanceData[date];
        // Loop semua slot (shubuh, ashar, etc)
        Object.values(SLOT_WAKTU).forEach(slot => {
            const status = dayData[slot.id]?.[studentId]?.status?.shalat;
            if (status === 'Alpa') total++;
        });
    });
    return total;
};

// Helper: Tentukan Status Pembinaan
window.getPembinaanStatus = function(alpaCount) {
    if (alpaCount === 0) return null;
    return PEMBINAAN_RULES.find(r => alpaCount >= r.min && alpaCount <= r.max) || PEMBINAAN_RULES[PEMBINAAN_RULES.length - 1];
};

// ==========================================
// 1. INIT & STARTUP
// ==========================================

window.initApp = async function() {
    const loadingEl = document.getElementById('view-loading');
    
    try {
        // 1. UI RENDERING (Synchronous)
        try {
            window.startClock();
            window.updateDateDisplay();
            window.refreshIcons();
        } catch (uiError) {
            console.error("UI Init Error:", uiError);
        }
        
        // 2. Local Storage (Synchronous)
        try {
            const savedSettings = localStorage.getItem(APP_CONFIG.settingsKey);
            if(savedSettings) {
                appState.settings = { ...appState.settings, ...JSON.parse(savedSettings) };
                if(appState.settings.darkMode) document.documentElement.classList.add('dark');
            }

            const savedData = localStorage.getItem(APP_CONFIG.storageKey);
            if(savedData) appState.attendanceData = JSON.parse(savedData);

            const savedLog = localStorage.getItem(APP_CONFIG.activityLogKey);
            if(savedLog) appState.activityLog = JSON.parse(savedLog);
            
            appState.permits = [];
            const savedPermits = localStorage.getItem(APP_CONFIG.permitKey);
            if(savedPermits) {
                try {
                    appState.permits = JSON.parse(savedPermits);
                } catch(permitError) {
                    console.error("Error parsing permits:", permitError);
                    appState.permits = [];
                }
            }

        } catch (storageError) {
            console.error("Storage Error:", storageError);
            if(!appState.permits) appState.permits = [];
        }

        // 3. Determine Slot
        appState.currentSlotId = window.determineCurrentSlot();

        // 4. FETCH DATA (Async with timeout)
        const dataLoadingPromise = Promise.all([
            window.loadClassData ? window.loadClassData() : Promise.resolve({}),
            window.loadSantriData ? window.loadSantriData() : Promise.resolve([])
        ]);

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Koneksi lambat (Timeout)")), 8000)
        );

        try {
            const [kelasData, santriData] = await Promise.race([dataLoadingPromise, timeoutPromise]);

            MASTER_KELAS = kelasData || {};
            MASTER_SANTRI = santriData || [];
            window.populateClassDropdown();

            // 5. AUTO LOGIN CHECK (AFTER DATA LOADED)
            const savedAuth = localStorage.getItem(APP_CONFIG.googleAuthKey);
            if(savedAuth) {
                try {
                    const authData = JSON.parse(savedAuth);
                    
                    if (authData.kelas && MASTER_KELAS[authData.kelas]) {
                        appState.selectedClass = authData.kelas;
                        appState.userProfile = authData.profile;
                        
                        FILTERED_SANTRI = MASTER_SANTRI.filter(s => {
                            const sKelas = String(s.kelas || s.rombel || "").trim();
                            return sKelas === appState.selectedClass;
                        }).sort((a,b) => a.nama.localeCompare(b.nama));

                        if(FILTERED_SANTRI.length > 0) {
                            document.getElementById('view-login').classList.add('hidden');
                            document.getElementById('view-main').classList.remove('hidden');
                            
                            window.updateDashboard(); 
                            window.updateProfileInfo();
                            
                            // AWAIT SUPABASE SYNC
                            await window.fetchAttendanceFromSupabase();
                            
                            setTimeout(() => window.showToast(`Ahlan, ${authData.profile.given_name}`, 'success'), 500);
                        }
                    } else {
                        throw new Error("Data kelas tidak valid");
                    }
                } catch(authError) {
                    console.error("Auto-login error:", authError);
                    localStorage.removeItem(APP_CONFIG.googleAuthKey);
                }
            }

        } catch (fetchError) {
            console.error("Data Fetch Error:", fetchError);
            window.showToast("Gagal memuat data santri (Offline/Lambat)", 'warning');
        }

    } catch (criticalError) {
        console.error("Critical Init Error:", criticalError);
        alert("Terjadi kesalahan sistem: " + criticalError.message);
    } finally {
        if(loadingEl) {
            loadingEl.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                loadingEl.style.display = 'none';
            }, 500); 
        }
    }
};

window.populateClassDropdown = function() {
    const select = document.getElementById('login-kelas');
    if(!select) return;
    
    select.innerHTML = '<option value="" disabled selected>-- Pilih Kelas --</option>';
    Object.keys(MASTER_KELAS).sort().forEach(k => {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = `${k} - ${MASTER_KELAS[k].musyrif}`;
        select.appendChild(opt);
    });
};

// ==========================================
// 2. LOGIN LOGIC
// ==========================================

window.handleLogin = function() {
    const kelas = document.getElementById('login-kelas').value;
    const pin = document.getElementById('login-pin').value;
    const savedPin = localStorage.getItem('musyrif_pin') || APP_CONFIG.pinDefault;

    if(!kelas) return alert("Pilih kelas dulu!");
    if(pin !== savedPin) return alert("PIN Salah!");

    // Simpan kelas sementara
    appState.tempClass = kelas;

    // Tampilkan Modal Google
    const modal = document.getElementById('modal-google-auth');
    document.getElementById('lbl-google-class').textContent = kelas;
    
    if(modal) {
        modal.classList.remove('hidden');
        
        // Render Tombol Google
        if(window.google) {
            google.accounts.id.initialize({
                client_id: APP_CONFIG.googleClientId,
                callback: window.handleGoogleCallback
            });
            google.accounts.id.renderButton(
                document.getElementById("google-btn-container"),
                { theme: "outline", size: "large", type: "standard" }
            );
        } else {
            alert("Gagal memuat Google. Cek koneksi internet.");
        }
    }
};

window.handleGoogleCallback = function(response) {
    try {
        const profile = window.parseJwt(response.credential);
        const userEmail = profile.email;
        const targetClass = appState.tempClass;

        // 1. AMBIL DATA KELAS DARI VARIABLE GLOBAL (yang diload data-kelas.js)
        // Pastikan variabelnya window.classData (sesuai data-kelas.js Anda)
        const classInfo = window.classData[targetClass];

        if (!classInfo) {
            return window.showToast("Data kelas tidak ditemukan.", "error");
        }

        // 2. VALIDASI EMAIL (KEAMANAN UTAMA)
        // Jika di sheet kolom email kosong, kita tolak demi keamanan
        if (!classInfo.email) {
            return window.showToast("Admin belum mendaftarkan email untuk kelas ini.", "warning");
        }

        // Bandingkan (kecilkan huruf biar aman)
        if (classInfo.email.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
            return window.showToast("AKSES DITOLAK! Email Anda tidak terdaftar untuk kelas ini.", "error");
        }

        // 3. JIKA LOLOS -> SIMPAN SESI
        const authData = {
            kelas: targetClass,
            profile: profile,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(APP_CONFIG.googleAuthKey, JSON.stringify(authData));
        
        // 4. Masuk Dashboard
        appState.selectedClass = targetClass;
        appState.userProfile = profile;
        
        // Filter Santri Ulang (Sesuai kelas)
        FILTERED_SANTRI = MASTER_SANTRI.filter(s => {
            const sKelas = String(s.kelas || s.rombel || "").trim();
            return sKelas === targetClass;
        }).sort((a,b) => a.nama.localeCompare(b.nama));

        // --- TAMBAHAN: SIMPAN PROFIL KE SUPABASE ---
        // Kita simpan data musyrif ke tabel 'musyrif_profiles'
        dbClient.from('musyrif_profiles').upsert({
            email: profile.email,
            name: profile.name,
            photo_url: profile.picture,
            last_login: new Date().toISOString()
        }, { onConflict: 'email' }).then(({ error }) => {
            if(error) console.error("Gagal simpan profil:", error);
            else console.log("Profil Musyrif tersimpan di Cloud");
        });
        // -------------------------------------------

        window.closeModal('modal-google-auth');
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-main').classList.remove('hidden');
        
        window.updateDashboard();
        window.updateProfileInfo();
        // [BARU] Tarik data Supabase saat login sukses
        window.fetchAttendanceFromSupabase();
        window.showToast("Login Berhasil!", "success");

    } catch (e) {
        console.error(e);
        window.showToast("Gagal memproses login Google.", "error");
    }
};

window.handleLogout = function() {
    if(!confirm("Keluar dari akun ini?")) return;

    if(clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }

    localStorage.removeItem(APP_CONFIG.googleAuthKey);
    appState.selectedClass = null;
    
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('login-pin').value = "";
    document.getElementById('login-kelas').value = "";
    
    location.reload();
};

// ==========================================
// 3. DASHBOARD LOGIC
// ==========================================

window.updateDashboard = function() {
    // 1. Greeting
    const h = new Date().getHours();
    const greet = h < 11 ? "Selamat Pagi" : h < 15 ? "Selamat Siang" : h < 18 ? "Selamat Sore" : "Selamat Malam";
    const elGreet = document.getElementById('dash-greeting');
    if(elGreet) elGreet.textContent = greet;

    // 2. Main Card Logic
    const isToday = (appState.date === window.getLocalDateStr());
    const mainCard = document.getElementById('dash-main-card');
    
    if (isToday && mainCard) {
        mainCard.classList.remove('hidden');
        const slot = SLOT_WAKTU[appState.currentSlotId];
        document.getElementById('dash-card-title').textContent = slot.label;
        
        const access = window.isSlotAccessible(appState.currentSlotId, appState.date);
        const timeEl = document.getElementById('dash-card-time');
        
        if(access.locked && access.reason === 'wait') {
             timeEl.innerHTML = `<i data-lucide="clock" class="w-3 h-3"></i> Belum Masuk Waktu`;
             mainCard.classList.add('opacity-80', 'grayscale');
             mainCard.onclick = () => window.showToast("Belum masuk waktu " + slot.label, 'warning');
        } else {
             timeEl.innerHTML = `<i data-lucide="clock" class="w-3 h-3"></i> ${slot.subLabel}`;
             mainCard.classList.remove('opacity-80', 'grayscale');
             mainCard.onclick = () => window.openAttendance();
        }
    } else if (mainCard) {
        mainCard.classList.add('hidden');
    }

    // 3. Render List Slot
    window.renderSchoolStatsWidget();
    window.renderSlotList();
    window.renderKBMBanner();
    window.renderActivePermitsWidget();

    window.renderDashboardPembinaan(); // Refresh widget pembinaan
    
    // 4. Update Stats Chart
    window.updateQuickStats();
    window.drawDonutChart();
    if(window.lucide) window.lucide.createIcons();



    window.updateLocationStatus();
};

// ==========================================
// FITUR STATUS LOKASI DASHBOARD
// ==========================================

window.updateLocationStatus = function() {
    const card = document.getElementById('location-status-card');
    
    // Jika fitur dimatikan di config, sembunyikan kartu
    if (!GEO_CONFIG.useGeofencing) {
        if(card) card.classList.add('hidden');
        return;
    }
    
    if(card) card.classList.remove('hidden');
    
    // Ambil Elemen UI
    const elLoading = document.getElementById('loc-loading');
    const elDetails = document.getElementById('loc-details');
    const elError = document.getElementById('loc-error');
    
    const elNearest = document.getElementById('loc-nearest-name');
    const elDistance = document.getElementById('loc-distance');
    const elBadge = document.getElementById('loc-badge');
    const elMessage = document.getElementById('loc-message');
    const elIcon = document.getElementById('loc-icon');
    const elIconBg = document.getElementById('loc-icon-bg');

    // Reset Tampilan ke Loading
    if(elLoading) elLoading.classList.remove('hidden');
    if(elDetails) elDetails.classList.add('hidden');
    if(elError) elError.classList.add('hidden');
    
    // Cek Support Browser
    if (!navigator.geolocation) {
        if(elLoading) elLoading.classList.add('hidden');
        if(elError) {
            elError.classList.remove('hidden');
            elError.innerHTML = '<p class="text-[10px] font-bold text-red-500">Browser tidak dukung GPS</p>';
        }
        return;
    }

    // Eksekusi GPS
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            let nearestDist = Infinity;
            let nearestName = "Tidak diketahui";
            let isInside = false;

            // 1. Cari Lokasi Terdekat dari Array GEO_CONFIG
            GEO_CONFIG.locations.forEach(loc => {
                const dist = window.getDistanceFromLatLonInMeters(userLat, userLng, loc.lat, loc.lng);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestName = loc.name;
                }
            });
            
            // 2. Cek apakah masuk radius
            if (nearestDist <= GEO_CONFIG.maxRadiusMeters) {
                isInside = true;
            }

            // 3. Update Tampilan
            if(elLoading) elLoading.classList.add('hidden');
            if(elDetails) elDetails.classList.remove('hidden');
            
            if(elNearest) elNearest.textContent = nearestName;
            if(elDistance) elDistance.textContent = Math.round(nearestDist) + "m";
            
            if (isInside) {
                // Tampilan HIJAU (Aman)
                elBadge.textContent = "AMAN";
                elBadge.className = "px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-600 border border-emerald-200";
                
                elMessage.innerHTML = `<span class="text-emerald-600 flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Posisi sesuai. Silakan isi presensi.</span>`;
                
                elIcon.setAttribute('data-lucide', 'map-pin');
                elIcon.classList.remove('text-slate-400', 'text-red-500', 'text-amber-500');
                elIcon.classList.add('text-emerald-500');
                
                elIconBg.classList.remove('bg-slate-100', 'bg-red-100', 'bg-amber-100');
                elIconBg.classList.add('bg-emerald-100');
            } else {
                // Tampilan MERAH (Jauh)
                elBadge.textContent = "JAUH";
                elBadge.className = "px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-100 text-red-600 border border-red-200";
                
                const selisih = Math.round(nearestDist - GEO_CONFIG.maxRadiusMeters);
                elMessage.innerHTML = `<span class="text-red-500 flex items-center gap-1"><i data-lucide="alert-circle" class="w-3 h-3"></i> Terlalu jauh ${selisih}m dari batas radius.</span>`;
                
                elIcon.setAttribute('data-lucide', 'map-pin-off');
                elIcon.classList.remove('text-slate-400', 'text-emerald-500', 'text-amber-500');
                elIcon.classList.add('text-red-500');
                
                elIconBg.classList.remove('bg-slate-100', 'bg-emerald-100', 'bg-amber-100');
                elIconBg.classList.add('bg-red-100');
            }
            
            if(window.lucide) window.lucide.createIcons();
        },
        (error) => {
            if(elLoading) elLoading.classList.add('hidden');
            if(elError) {
                elError.classList.remove('hidden');
                let msg = "Gagal deteksi lokasi.";
                if(error.code === 1) msg = "Izin lokasi ditolak.";
                else if(error.code === 2) msg = "Sinyal GPS lemah.";
                else if(error.code === 3) msg = "Waktu GPS habis.";
                elError.innerHTML = `<p class="text-[10px] font-bold text-red-500 leading-tight">${msg}</p>`;
            }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
};

window.renderSlotList = function() {
    const container = document.getElementById('dash-other-slots');
    if(!container) return;

    container.innerHTML = '';
    const tpl = document.getElementById('tpl-slot-item');
    const isToday = (appState.date === window.getLocalDateStr());
    const fragment = document.createDocumentFragment();

    Object.values(SLOT_WAKTU).forEach(s => {
        const clone = tpl.content.cloneNode(true);
        const item = clone.querySelector('.slot-item');
        const access = window.isSlotAccessible(s.id, appState.date);
        const stats = window.calculateSlotStats(s.id);
        
        // 1. Terapkan Tema Unik per Sesi
        // Hapus class default jika ada, lalu tambah gradient spesifik
        item.classList.add(...s.style.gradient.split(' '));
        item.classList.add(...s.style.border.split(' '));
        item.classList.add(...s.style.text.split(' '));

        // Set Warna Decorative Blob
        const decor = clone.querySelector('.slot-decor');
        if(decor) decor.classList.add(`bg-${s.theme}-400`); // emerald/orange/indigo/slate

        // 2. Setup Icon Unik (Sun/Moon/etc)
        const iconContainer = clone.querySelector('.slot-icon-bg');
        const iconEl = clone.querySelector('.slot-icon');
        
        if(iconContainer) iconContainer.classList.add(...s.style.iconBg.split(' '));
        if(iconEl) iconEl.setAttribute('data-lucide', s.style.icon);

        // 3. Label & Data
        clone.querySelector('.slot-label').textContent = s.label;
        const timeEl = clone.querySelector('.slot-time-range');
        if(timeEl) timeEl.textContent = s.subLabel;

        clone.querySelector('.slot-stat-h').textContent = stats.h;
        clone.querySelector('.slot-stat-s').textContent = stats.s;
        clone.querySelector('.slot-stat-i').textContent = stats.i;
        clone.querySelector('.slot-stat-a').textContent = stats.a;

        // 4. Progress Bar Styling
        const totalSantri = FILTERED_SANTRI.length || 1; 
        const filledCount = stats.total;
        const percentage = Math.round((filledCount / totalSantri) * 100);

        const progressText = clone.querySelector('.slot-progress-text');
        const progressBar = clone.querySelector('.slot-progress-bar');
        
        if(progressText) progressText.textContent = `${percentage}%`;
        if(progressBar) {
            progressBar.style.width = `${percentage}%`;
            // Warna progress bar mengikuti tema
            progressBar.classList.add(`bg-${s.theme}-500`); 
        }

        // 5. Logic Locked/Unlocked
        const badge = clone.querySelector('.slot-status-badge');
        
        if (access.locked) {
            item.classList.remove(...s.style.gradient.split(' ')); // Hapus gradient cerah
            item.classList.add('bg-slate-100', 'dark:bg-slate-800', 'grayscale', 'opacity-75'); // Jadi abu-abu
            
            let lockText = access.reason === 'wait' ? 'Menunggu' : 'Terkunci';
            if(access.reason === 'limit') lockText = 'Expired';
            
            badge.textContent = lockText;
            
            if(iconEl) iconEl.setAttribute('data-lucide', 'lock'); // Ganti icon jadi gembok
            
            item.onclick = () => window.showToast(`🔒 Akses ${s.label} ${lockText}`, "error");
        } else {
            if (stats.isFilled) {
                badge.textContent = "Selesai";
                badge.className += " text-emerald-700 bg-emerald-100/80 border-emerald-200";
            } else {
                badge.textContent = "Belum Diisi";
            }

            item.onclick = () => {
                appState.currentSlotId = s.id;
                if(isToday && s.id === window.determineCurrentSlot()) {
                    window.updateDashboard();
                    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.openAttendance();
                }
            };
        }
        
        fragment.appendChild(clone);
    });

    container.appendChild(fragment);
};

window.updateProfileInfo = function() {
    const elHeaderName = document.getElementById('header-user-name');
    const elHeaderRole = document.getElementById('header-user-role'); // UNIQUE ID
    const elHeaderAvatar = document.getElementById('header-avatar');
    
    const elName = document.getElementById('profile-name');
    const elRoleTab = document.getElementById('profile-role-tab'); // UNIQUE ID

    if(appState.selectedClass && MASTER_KELAS[appState.selectedClass]) {
        const musyrifName = MASTER_KELAS[appState.selectedClass].musyrif;
        const className = appState.selectedClass;

        if(elHeaderName) elHeaderName.textContent = musyrifName.split(' ')[0];
        if(elHeaderRole) elHeaderRole.textContent = className;
        
        if(elHeaderAvatar) {
            const initials = musyrifName
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
            elHeaderAvatar.textContent = initials;
        }

        if(elName) elName.textContent = musyrifName;
        if(elRoleTab) elRoleTab.textContent = `Musyrif ${className}`;
    }
};

// ==========================================
// 4. LOGIC PERHITUNGAN (REFACTORED)
// ==========================================

// Fungsi Terpusat untuk menghitung statistik per slot
window.calculateSlotStats = function(slotId, customDate = null) {
    const stats = { h: 0, s: 0, i: 0, a: 0, total: 0, isFilled: false };
    
    if (FILTERED_SANTRI.length === 0) return stats;
    
    const dateKey = customDate || appState.date;
    const slotData = appState.attendanceData[dateKey]?.[slotId];
    
    if (!slotData) return stats;

    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        const firstActId = SLOT_WAKTU[slotId].activities[0].id;
        const status = slotData[id]?.status?.[firstActId]; 
        
        if (status) {
            stats.isFilled = true;
            // Telat dihitung Hadir di statistik angka
            if (status === 'Hadir' || status === 'Telat') stats.h++; 
            else if (status === 'Sakit') stats.s++;
            else if (status === 'Izin' || status === 'Pulang') stats.i++;
            else if (status === 'Alpa') stats.a++;
            stats.total++;
        }
    });
    
    return stats;
};

// Global Percentage (Untuk Chart)
window.calculateGlobalStats = function() {
    if(!appState.selectedClass) return 0;
    
    let checks = 0, totalExpected = 0;
    
    Object.values(SLOT_WAKTU).forEach(slot => {
        // Cek apakah slot ini sudah ada datanya
        const stats = window.calculateSlotStats(slot.id);
        if(stats.isFilled) {
             checks += stats.h;
             totalExpected += stats.total;
        }
    });

    return totalExpected === 0 ? 0 : Math.round((checks/totalExpected)*100);
};

// ==========================================
// 5. ATTENDANCE ACTIONS
// ==========================================

window.openAttendance = async function() {
    // 1. Cek Kunci Waktu (Logic Lama)
    const access = window.isSlotAccessible(appState.currentSlotId, appState.date);
    if (access.locked) {
        let msg = "Akses ditolak.";
        if(access.reason === 'wait') msg = "Belum masuk waktu presensi";
        if(access.reason === 'limit') msg = "Data lampau (>3 hari) terkunci.";
        if(access.reason === 'future') msg = "Belum bisa mengisi masa depan.";
        return window.showToast(msg, 'warning');
    }

    // 2. CEK LOKASI (LOGIC BARU)
    if (GEO_CONFIG.useGeofencing) {
        try {
            await window.verifyLocation();
            window.showToast("Lokasi Terverifikasi ✅", "success");
        } catch (errorMsg) {
            window.showToast("🚫 Akses Ditolak: " + errorMsg, "error");
            
            // Log aktivitas percobaan akses ilegal (Opsional)
            window.logActivity("Akses Ditolak", `Gagal GPS: ${errorMsg}`);
            return; // STOP! Jangan buka halaman absen
        }
    }

    // 3. Buka Halaman Absen (Logic Lama)
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-attendance').classList.remove('hidden');
    
    const slot = SLOT_WAKTU[appState.currentSlotId];
    document.getElementById('att-slot-title').textContent = slot.label;
    window.renderAttendanceList();
};

window.closeAttendance = function() {
    document.getElementById('view-attendance').classList.add('hidden');
    document.getElementById('view-main').classList.remove('hidden');
    window.updateDashboard();
};

window.renderAttendanceList = function() {
    const container = document.getElementById('attendance-list-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // --- LOGIC START (TIDAK DIUBAH) ---
    const slot = SLOT_WAKTU[appState.currentSlotId];
    const dateKey = appState.date;
    const currentDay = new Date(appState.date).getDay();

    if(!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if(!appState.attendanceData[dateKey][slot.id]) appState.attendanceData[dateKey][slot.id] = {};
    
    const dbSlot = appState.attendanceData[dateKey][slot.id];
    let hasAutoChanges = false;

    let summaryCount = { Sakit: 0, Izin: 0, Pulang: 0, Alpa: 0, Telat: 0 };
    let summaryList = [];

    const PREV_SLOT_MAP = { 'ashar': 'shubuh', 'maghrib': 'ashar', 'isya': 'maghrib' };
    const prevSlotId = PREV_SLOT_MAP[slot.id];
    const prevSlotData = prevSlotId ? appState.attendanceData[dateKey][prevSlotId] : null;

    const mainActId = slot.activities[0]?.id || 'shalat';

    const list = FILTERED_SANTRI.filter(s => {
        const matchName = s.nama.toLowerCase().includes(appState.searchQuery.toLowerCase());
        if(appState.filterProblemOnly) {
            const st = dbSlot[String(s.nis || s.id)]?.status?.[mainActId];
            return matchName && ['Alpa','Sakit','Izin','Pulang','Telat'].includes(st);
        }
        return matchName;
    });

    const countEl = document.getElementById('att-santri-count');
    if(countEl) countEl.textContent = `${list.length} Santri`;

    const tplRow = document.getElementById('tpl-santri-row');
    const tplBtn = document.getElementById('tpl-activity-btn');
    
    if(!tplRow || !tplBtn) {
        console.error("Template HTML tidak ditemukan!");
        return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach(santri => {
        const id = String(santri.nis || santri.id);
        
        if(!dbSlot[id]) {
            const defStatus = {};
            slot.activities.forEach(a => {
                if(a.category === 'sunnah') defStatus[a.id] = 'Tidak'; 
                else defStatus[a.id] = a.type === 'mandator' ? 'Hadir' : 'Ya';
            });

            if (slot.id === 'sekolah') {
                const shubuhData = appState.attendanceData[dateKey]?.['shubuh']?.[id];
                if (shubuhData?.status?.shalat === 'Sakit') {
                    defStatus['kbm_sekolah'] = 'Sakit';
                }
            }

            if (prevSlotData && prevSlotData[id]) {
                const prevSt = prevSlotData[id].status?.shalat;
                if (['Sakit', 'Izin', 'Pulang'].includes(prevSt)) {
                    const mainKey = slot.activities[0].id;
                    defStatus[mainKey] = prevSt;
                    
                    slot.activities.forEach(a => {
                        if (a.id === mainKey) return;
                        if (['fardu','kbm','school'].includes(a.category)) {
                            defStatus[a.id] = prevSt;
                        } else {
                            defStatus[a.id] = 'Tidak';
                        }
                    });
                }
            }
            
            dbSlot[id] = { status: defStatus, note: '' };

            if (slot.id === 'sekolah' && appState.attendanceData[dateKey]?.['shubuh']?.[id]?.status?.shalat === 'Sakit') {
                dbSlot[id].note = '[Auto] Sakit sejak Shubuh';
            }
        }

        const sData = dbSlot[id];
        const activePermit = window.checkActivePermit(id, dateKey, slot.id);
        const isAutoMarked = sData.note && sData.note.includes('[Auto]');

        if (activePermit) {
            slot.activities.forEach(act => {
                let target = null;
                if (['fardu','kbm','school'].includes(act.category)) target = activePermit.type;
                else target = 'Tidak';
                
                if (sData.status[act.id] !== target) {
                    sData.status[act.id] = target;
                    hasAutoChanges = true;
                }
            });
            const autoNote = `[Auto] ${activePermit.type} s/d ${window.formatDate(activePermit.end)}`;
            if (!sData.note || !sData.note.includes(activePermit.type)) {
                sData.note = autoNote;
                hasAutoChanges = true;
            }
        } 
        else if (isAutoMarked) {
            slot.activities.forEach(act => {
                if (['fardu','kbm','school'].includes(act.category)) sData.status[act.id] = 'Hadir';
                else if (act.category === 'dependent') sData.status[act.id] = 'Ya';
                else sData.status[act.id] = 'Tidak';
            });
            sData.note = ''; 
            hasAutoChanges = true;
        }

        const currentStatus = sData.status?.[mainActId] || 'Hadir';
        
        if (['Sakit', 'Izin', 'Pulang', 'Alpa', 'Telat'].includes(currentStatus)) {
            summaryCount[currentStatus] = (summaryCount[currentStatus] || 0) + 1;
            summaryList.push({ nama: santri.nama, status: currentStatus });
        }
        // --- LOGIC END ---

        // --- DESIGN IMPLEMENTATION START ---
        
        const clone = tplRow.content.cloneNode(true);
        const cardContainer = clone.querySelector('.santri-row') || clone.querySelector('div');
        
        const uiConfig = STATUS_UI[currentStatus] || STATUS_UI['Hadir'];

        // 1. Container Styling (Rounded modern, shadow halus, border tipis)
        cardContainer.className = `santri-row relative overflow-hidden transition-all duration-300 hover:shadow-lg p-4 rounded-[1.5rem] border flex flex-col gap-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700`;
        
        // Border Kiri Warna-warni (Indikator Cepat untuk Status Non-Hadir)
        if (['Sakit', 'Izin', 'Pulang', 'Alpa'].includes(currentStatus) || activePermit) {
            cardContainer.classList.add('border-l-[6px]'); // Border kiri tebal
            if(currentStatus === 'Sakit') cardContainer.classList.add('border-l-amber-500');
            else if(currentStatus === 'Izin') cardContainer.classList.add('border-l-blue-500');
            else if(currentStatus === 'Pulang') cardContainer.classList.add('border-l-purple-500');
            else if(currentStatus === 'Alpa') cardContainer.classList.add('border-l-rose-500');
        }

        // 2. Name & Avatar Styling
        const nameEl = clone.querySelector('.santri-name');
        nameEl.textContent = window.sanitizeHTML(santri.nama);
        nameEl.className = `santri-name font-bold text-sm leading-tight line-clamp-1 text-slate-800 dark:text-white`;
        
        clone.querySelector('.santri-kamar').textContent = santri.asrama || santri.kelas;
        
        const avatar = clone.querySelector('.santri-avatar');
        avatar.textContent = santri.nama.substring(0,2).toUpperCase();
        
        // Avatar Style: Pudar jika tidak hadir
        if(currentStatus !== 'Hadir') {
            avatar.classList.add('opacity-50', 'grayscale');
        }

        // 3. Badge Status (Desain "Chip" Kecil di sebelah nama)
        if (['Sakit', 'Izin', 'Pulang', 'Alpa', 'Telat'].includes(currentStatus)) {
            const badge = document.createElement('span');
            let colorClass = 'bg-slate-100 text-slate-500 border-slate-200';
            let iconCode = '';

            // Icon kecil (Opsional, jika menggunakan lucide)
            if (activePermit) iconCode = ''; // Bisa ditambah icon
            
            // Pewarnaan Badge sesuai Desain Outline/Tint
            if(currentStatus === 'Sakit') colorClass = 'bg-amber-50 text-amber-700 border border-amber-200';
            else if(currentStatus === 'Izin') colorClass = 'bg-blue-50 text-blue-700 border border-blue-200';
            else if(currentStatus === 'Pulang') colorClass = 'bg-purple-50 text-purple-700 border border-purple-200';
            else if(currentStatus === 'Alpa') colorClass = 'bg-rose-50 text-rose-700 border border-rose-200'; // Rose untuk Alpa
            else if(currentStatus === 'Telat') colorClass = 'bg-teal-50 text-teal-700 border border-teal-200';

            // Styling Badge: Kecil, Font Tebal, Uppercase
            badge.className = `ml-2 px-1.5 py-[2px] rounded-[6px] text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 align-middle ${colorClass}`;
            badge.innerHTML = `${iconCode} ${currentStatus}`;
            
            if(nameEl.parentNode) {
                nameEl.parentNode.appendChild(badge);
            }
        }

        // 4. Activity Buttons Grid (FORCE HORIZONTAL LAYOUT)
        const btnCont = clone.querySelector('.activity-container');
        if (btnCont) {
            // INLINE STYLE: Memastikan layout Grid 5 kolom walau Tailwind belum di-build
            btnCont.style.cssText = "display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; align-items: start;";

            slot.activities.forEach(act => {
                if (act.showOnDays && !act.showOnDays.includes(currentDay)) return;

                const bClone = tplBtn.content.cloneNode(true);
                const btnWrapper = bClone.querySelector('div'); // Wrapper flex col
                if(btnWrapper) btnWrapper.style.width = '100%'; // Pastikan wrapper full width di grid

                const btn = bClone.querySelector('.btn-status');
                const lbl = bClone.querySelector('.lbl-status');
                
                const curr = sData.status?.[act.id] || 'Tidak';
                const uiBtn = STATUS_UI[curr] || STATUS_UI['Tidak'];
                const hasPermitConflict = activePermit && ['fardu','kbm','school'].includes(act.category);

                // Styling Tombol: Aspect Square, Rounded Modern, Border Tebal (2px)
                // Warna diambil dari uiBtn.class yang sudah kita konfigurasi (Solid/Dashed/Outline)
                let btnClass = `btn-status w-full aspect-square rounded-[14px] flex items-center justify-center font-black text-sm transition-all duration-200 ${uiBtn.class} `;
                
                if (hasPermitConflict) {
                    btnClass += ' ring-4 ring-amber-200/50 ring-offset-1 opacity-80'; // Efek konflik
                } else {
                    btnClass += ' active:scale-95 hover:shadow-md'; // Efek klik & hover
                }

                btn.className = btnClass;
                btn.textContent = uiBtn.label;
                
                // Event Handling (Tetap sama)
                const handleToggle = (e) => {
                    e.stopPropagation();
                    if (hasPermitConflict) {
                        if(!confirm(`Santri tercatat ${activePermit.type}. Ubah manual jadi HADIR?`)) return;
                        if(sData.note && sData.note.includes('[Auto]')) sData.note = '';
                    }
                    window.toggleStatus(id, act.id, act.type);
                };
                
                btn.onclick = handleToggle;
                
                // Label Styling
                lbl.textContent = act.label;
                lbl.className = `lbl-status text-[9px] font-bold mt-1 text-center truncate w-full text-slate-400 group-hover:text-slate-600 dark:text-slate-500`;
                
                btnCont.appendChild(bClone);
            });
        }

        // 5. Note Section Styling (Input yang lebih bersih)
        const noteInp = clone.querySelector('.input-note');
        const noteBox = clone.querySelector('.note-section');
        
        if (noteInp && noteBox) {
            noteInp.value = sData.note || "";
            // Input style: Background muda, border tipis, rounded
            noteInp.className = `input-note w-full text-xs font-semibold p-3 rounded-xl border outline-none transition-all bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder-slate-400 dark:bg-slate-900 dark:border-slate-700`;
            
            noteInp.onchange = (e) => {
                sData.note = window.sanitizeHTML(e.target.value);
                window.saveData();
            };
            
            // Toggle Button logic
            const editBtn = clone.querySelector('.btn-edit-note'); // Jika ada tombol edit
            if(editBtn) {
                editBtn.onclick = () => noteBox.classList.toggle('hidden');
            }
        }

        fragment.appendChild(clone);
    });

    container.appendChild(fragment);
    
    // --- SUMMARY WIDGET (Final Touch) ---
    const summaryWidget = document.getElementById('att-summary-widget');
    const summaryBadges = document.getElementById('att-summary-badges');
    const summaryNames = document.getElementById('att-summary-names');
    
    const totalProblem = summaryCount.Sakit + summaryCount.Izin + summaryCount.Pulang + summaryCount.Alpa + summaryCount.Telat;

    if (summaryWidget && summaryBadges && summaryNames) {
        if (totalProblem > 0) {
            summaryWidget.classList.remove('hidden');
            summaryBadges.innerHTML = '';
            summaryNames.innerHTML = '';

            // Helper untuk badge ringkasan
            const makeBadge = (count, label, color) => {
                if(count > 0) summaryBadges.innerHTML += `<div class="px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap border bg-white dark:bg-slate-800 shadow-sm ${color}">${count} ${label}</div>`;
            };

            makeBadge(summaryCount.Sakit, 'Sakit', 'text-amber-700 border-amber-200');
            makeBadge(summaryCount.Izin, 'Izin', 'text-blue-700 border-blue-200');
            makeBadge(summaryCount.Pulang, 'Pulang', 'text-purple-700 border-purple-200');
            makeBadge(summaryCount.Alpa, 'Alpa', 'text-rose-700 border-rose-200'); // Merah Rose
            makeBadge(summaryCount.Telat, 'Telat', 'text-teal-700 border-teal-200 border-dashed');

            summaryList.forEach(item => {
                let color = 'bg-slate-50 text-slate-600 border-slate-200';
                // Styling chip nama siswa yang bermasalah
                if(item.status === 'Sakit') color = 'bg-amber-50 text-amber-700 border-amber-200';
                else if(item.status === 'Izin') color = 'bg-blue-50 text-blue-700 border-blue-200';
                else if(item.status === 'Alpa') color = 'bg-rose-50 text-rose-700 border-rose-200';
                else if(item.status === 'Telat') color = 'bg-teal-50 text-teal-700 border-teal-200 border-dashed';
                else if(item.status === 'Pulang') color = 'bg-purple-50 text-purple-700 border-purple-200';

                const badge = document.createElement('span');
                badge.className = `px-2 py-1 rounded-md text-[10px] font-bold border ${color} inline-block m-0.5`;
                badge.textContent = window.sanitizeHTML(item.nama);
                summaryNames.appendChild(badge);
            });
        } else {
            summaryWidget.classList.add('hidden');
        }
    }

    if(hasAutoChanges) window.saveData(); 
    if(window.refreshIcons) window.refreshIcons();
};

// ==========================================
// PERBAIKAN FUNGSI TOGGLE STATUS
// ==========================================

window.toggleStatus = function(id, actId, type) {
    const slotId = appState.currentSlotId;
    const dateKey = appState.date;
    
    // Safety check data
    if(!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if(!appState.attendanceData[dateKey][slotId]) appState.attendanceData[dateKey][slotId] = {};
    if(!appState.attendanceData[dateKey][slotId][id]) appState.attendanceData[dateKey][slotId][id] = { status: {}, note: '' };

    const sData = appState.attendanceData[dateKey][slotId][id];
    const curr = sData.status[actId] || (type === 'mandator' ? 'Hadir' : 'Ya');
    let next = '';

    // 1. TENTUKAN STATUS BARU (LOGIKA SIKLUS)
    if(type === 'mandator') {
        // SIKLUS UNIVERSAL (Sekolah & Shalat sama-sama bisa Telat)
        // Hadir -> Telat -> Sakit -> Izin -> Alpa -> Hadir
        if(curr === 'Hadir') next = 'Telat';
        else if(curr === 'Telat') next = 'Sakit'; // <-- Masbuk/Telat
        else if(curr === 'Sakit') next = 'Izin';
        else if(curr === 'Izin') next = 'Alpa';
        else next = 'Hadir';
    } else {
        // Siklus Sunnah: Ya -> Tidak -> Ya
        next = (curr === 'Ya') ? 'Tidak' : 'Ya';
    }

    // Terapkan status baru ke tombol yang diklik
    sData.status[actId] = next;

    // 2. LOGIKA OTOMATIS (CASCADING)
    // Cek konfigurasi kegiatan yang sedang diklik
    const currentSlotConfig = SLOT_WAKTU[slotId];
    const clickedActConfig = currentSlotConfig.activities.find(a => a.id === actId);

    // JIKA YANG DIKLIK ADALAH 'FARDU' (SHALAT UTAMA)
    // Maka kegiatan lain harus menyesuaikan
    if (clickedActConfig && clickedActConfig.category === 'fardu') {
        
        const isNonHadir = ['Sakit', 'Izin', 'Pulang', 'Alpa'].includes(next);

        currentSlotConfig.activities.forEach(otherAct => {
            if (otherAct.id === actId) return; // Jangan ubah diri sendiri

            if (isNonHadir) {
                // KASUS: SHALAT TIDAK HADIR (S/I/A)
                
                if (otherAct.category === 'dependent') {
                    // Dzikir/Rawatib -> Otomatis TIDAK
                    sData.status[otherAct.id] = 'Tidak';
                } 
                else if (otherAct.category === 'kbm') {
                    // Tahfizh/Conver -> Mengikuti status shalat (misal: Sakit)
                    sData.status[otherAct.id] = next;
                }
                else if (otherAct.category === 'sunnah') {
                    // Tahajjud/Dhuha -> Otomatis TIDAK
                    sData.status[otherAct.id] = 'Tidak';
                }

            } else {
                // KASUS: SHALAT KEMBALI HADIR
                
                if (otherAct.category === 'dependent') {
                    // Dzikir/Rawatib -> Reset ke YA
                    sData.status[otherAct.id] = 'Ya';
                } 
                else if (otherAct.category === 'kbm') {
                    // Tahfizh/Conver -> Reset ke HADIR
                    sData.status[otherAct.id] = 'Hadir';
                }
                // Untuk kategori 'sunnah' biasa (Tahajjud), biarkan apa adanya 
                // agar tidak mereset inputan manual musyrif.
            }
        });
    }

    // Simpan & Refresh UI
    window.saveData();
    window.renderAttendanceList(); // Render ulang agar perubahan otomatis terlihat
    
    if (appState.date === window.getLocalDateStr()) {
        window.updateDashboard();
    }
};

// Fungsi untuk membuka Modal Menu Bulk (Akan dipanggil dari HTML)
window.openBulkMenu = function() {
    const modal = document.getElementById('modal-bulk-actions');
    if(modal) {
        modal.classList.remove('hidden');
        window.generateBulkButtons(); // Generate tombol sesuai slot aktif
    }
};

// Fungsi generate tombol dinamis berdasarkan kegiatan yang ada di slot saat ini
window.generateBulkButtons = function() {
    const container = document.getElementById('bulk-actions-content');
    const slot = SLOT_WAKTU[appState.currentSlotId];
    const currentDay = new Date(appState.date).getDay();
    
    container.innerHTML = '';
    
    // Cek ketersediaan kategori di slot ini
    const acts = slot.activities.filter(a => !a.showOnDays || a.showOnDays.includes(currentDay));
    const hasFardu = acts.some(a => a.category === 'fardu');
    const hasKbm = acts.some(a => a.category === 'kbm');
    const sunnahActs = acts.filter(a => a.category === 'sunnah');

    let html = '';

    // 1. Bagian Shalat Fardu (Otomatis handle dependent: Qabliyah/Badiyah/Dzikir)
    if(hasFardu) {
        html += `
        <div class="mb-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Shalat & Rawatib</p>
            <div class="flex gap-2">
                <button onclick="window.applyBulkAction('fardu', 'Hadir')" class="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 active:scale-95 transition-all">
                    Hadir Semua
                </button>
                <button onclick="window.applyBulkAction('fardu', 'Alpa')" class="flex-1 py-3 rounded-xl bg-red-100 text-red-600 font-bold text-xs border border-red-200 active:scale-95 transition-all">
                    Alpa Semua
                </button>
            </div>
            <p class="text-[9px] text-slate-400 mt-1.5 italic">*Dzikir & Rawatib akan menyesuaikan status shalat.</p>
        </div>`;
    }

    // 2. Bagian KBM Asrama
    if(hasKbm) {
        html += `
        <div class="mb-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pembelajaran Asrama</p>
            <div class="flex gap-2">
                <button onclick="window.applyBulkAction('kbm', 'Hadir')" class="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/30 active:scale-95 transition-all">
                    Hadir Semua
                </button>
                <button onclick="window.applyBulkAction('kbm', 'Alpa')" class="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200 active:scale-95 transition-all">
                    Kosongkan
                </button>
            </div>
        </div>`;
    }

    // 3. Bagian Sunnah Spesifik (Tahajjud, Dhuha, dll)
    if(sunnahActs.length > 0) {
        html += `<div class="mb-2"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ibadah Sunnah</p><div class="grid grid-cols-2 gap-2">`;
        
        sunnahActs.forEach(act => {
            html += `
            <div class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${act.label}</span>
                </div>
                <div class="flex gap-1">
                    <button onclick="window.applyBulkAction('specific', 'Ya', '${act.id}')" class="flex-1 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold hover:bg-emerald-500 hover:text-white transition-colors">Ya</button>
                    <button onclick="window.applyBulkAction('specific', 'Tidak', '${act.id}')" class="flex-1 py-1.5 rounded-lg bg-slate-200 text-slate-500 text-[10px] font-bold hover:bg-slate-300 transition-colors">Tdk</button>
                </div>
            </div>`;
        });
        
        html += `</div></div>`;
    }

    container.innerHTML = html;
};

// Logika Eksekusi Bulk Action
window.applyBulkAction = function(targetCategory, value, specificId = null) {
    const slotId = appState.currentSlotId;
    const dateKey = appState.date;
    const slot = SLOT_WAKTU[slotId];
    const currentDay = new Date(appState.date).getDay();

    // Prepare structure
    if(!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if(!appState.attendanceData[dateKey][slotId]) appState.attendanceData[dateKey][slotId] = {};
    const dbSlot = appState.attendanceData[dateKey][slotId];

    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        if(!dbSlot[id]) dbSlot[id] = { status: {}, note: '' };
        
        slot.activities.forEach(act => {
            if (act.showOnDays && !act.showOnDays.includes(currentDay)) return;

            // LOGIKA 1: Fardu & Dependent (Ikut Shalat)
            if (targetCategory === 'fardu') {
                if (act.category === 'fardu') {
                    dbSlot[id].status[act.id] = value; // Hadir / Alpa
                } 
                else if (act.category === 'dependent') {
                    // Jika Shalat Hadir -> Dependent = Ya
                    // Jika Shalat Alpa/Sakit -> Dependent = Tidak
                    dbSlot[id].status[act.id] = (value === 'Hadir') ? 'Ya' : 'Tidak';
                }
            }

            // LOGIKA 2: KBM Asrama
            else if (targetCategory === 'kbm' && act.category === 'kbm') {
                dbSlot[id].status[act.id] = value; // Hadir / Alpa
            }

            // LOGIKA 3: Specific Sunnah (Dhuha, Tahajjud, dll)
            else if (targetCategory === 'specific' && act.id === specificId) {
                dbSlot[id].status[act.id] = value; // Ya / Tidak
            }
        });
    });
    
    window.saveData();
    window.renderAttendanceList();
    window.showToast('Data berhasil diperbarui secara massal', 'success');
    window.closeModal('modal-bulk-actions');
};

window.toggleProblemFilter = function() {
    appState.filterProblemOnly = !appState.filterProblemOnly;
    const btn = document.getElementById('btn-filter-problem');
    
    if(appState.filterProblemOnly) {
        btn.classList.add('text-red-500', 'bg-red-50', 'border-red-200');
        btn.classList.remove('text-slate-500', 'bg-white');
    } else {
        btn.classList.remove('text-red-500', 'bg-red-50', 'border-red-200');
        btn.classList.add('text-slate-500', 'bg-white');
    }
    
    window.renderAttendanceList();
};

window.handleSearch = function(val) {
    appState.searchQuery = val;
    window.renderAttendanceList();
};

// ==========================================
// 6. DATE ACTIONS
// ==========================================

window.changeDateView = function(direction) {
    const current = new Date(appState.date);
    current.setDate(current.getDate() + direction);
    
    const nextDateStr = window.getLocalDateStr(current);
    const todayStr = window.getLocalDateStr();

    if (nextDateStr > todayStr) {
        return window.showToast("Masa depan belum terjadi 🚫", "warning");
    }

    appState.date = nextDateStr;
    window.updateDateDisplay();
    window.updateDashboard();
    window.fetchAttendanceFromSupabase();
    window.showToast(`📅 ${window.formatDate(appState.date)}`, 'info');
};

window.updateDateDisplay = function() {
    const el = document.getElementById('current-date-display');
    const input = document.getElementById('date-picker-input');
    
    if(el) el.textContent = window.formatDate(appState.date);
    if(input) input.value = appState.date;
};

window.handleDateChange = function(value) {
    if(!value) return;
    const todayStr = window.getLocalDateStr();

    if (value > todayStr) {
        window.showToast("Tidak bisa memilih tanggal masa depan 🚫", "warning");
        const input = document.getElementById('date-picker-input');
        if(input) input.value = appState.date; 
        return;
    }

    appState.date = value;
    window.updateDateDisplay();
    window.updateDashboard();
    window.fetchAttendanceFromSupabase();
    window.showToast('Tanggal berhasil diubah', 'success');
};

// ==========================================
// 7. EXPORT & REPORT
// ==========================================

window.exportToExcel = function() {
    if(!appState.selectedClass || FILTERED_SANTRI.length === 0) {
        return window.showToast('Pilih kelas terlebih dahulu', 'warning');
    }
    
    const dateKey = appState.date;
    const data = appState.attendanceData[dateKey];
    
    if(!data) {
        return window.showToast('Tidak ada data untuk tanggal ini', 'warning');
    }
    
    // CSV Logic with Quote Escaping for Names
    let csv = 'No,Nama,NIS,Kelas';
    Object.values(SLOT_WAKTU).forEach(slot => csv += `,${slot.label}`);
    csv += '\n';
    
    FILTERED_SANTRI.forEach((s, idx) => {
        const id = String(s.nis || s.id);
        csv += `${idx + 1},"${s.nama}",${s.nis || s.id},${s.kelas}`;
        
        Object.values(SLOT_WAKTU).forEach(slot => {
            const status = data[slot.id]?.[id]?.status?.shalat || '-';
            csv += `,${status}`;
        });
        csv += '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Presensi_${appState.selectedClass}_${appState.date}.csv`;
    link.click();
    
    window.showToast('File berhasil diunduh', 'success');
    window.logActivity('Export Data', `Mengexport data ke Excel`);
};

window.viewRekapBulanan = function() {
    const modal = document.getElementById('modal-rekap');
    if(modal) {
        modal.classList.remove('hidden');
        window.generateRekapBulanan();
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(!modal) return;
    
    modal.classList.add('hidden');
    
    const index = modalStack.indexOf(modalId);
    if(index > -1) modalStack.splice(index, 1);
    
    if(modal._escHandler) {
        document.removeEventListener('keydown', modal._escHandler);
        delete modal._escHandler;
    }
    
    modal.removeAttribute('aria-modal');
    modal.removeAttribute('role');
};

window.generateRekapBulanan = function() {
    const container = document.getElementById('rekap-list');
    if(!container) return;
    
    container.innerHTML = '';
    
    if(FILTERED_SANTRI.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-8">Tidak ada data</p>';
        return;
    }
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const fragment = document.createDocumentFragment();

    FILTERED_SANTRI.forEach(santri => {
        const id = String(santri.nis || santri.id);
        let h = 0, s = 0, i = 0, a = 0;
        
        // Loop Days of Month (Max 31)
        for(let day = 1; day <= 31; day++) {
            // Optimasi: Buat string date manual daripada new Date() di loop
            const dayStr = String(day).padStart(2, '0');
            const monthStr = String(month + 1).padStart(2, '0');
            const dateKey = `${year}-${monthStr}-${dayStr}`;
            
            // Cek apakah tanggal valid (misal 31 Feb tidak ada)
            // Tapi karena akses object undefined aman, kita skip validasi ketat demi performa
            
            const dayData = appState.attendanceData[dateKey];
            if(dayData) {
                Object.values(SLOT_WAKTU).forEach(slot => {
                    const st = dayData[slot.id]?.[id]?.status?.shalat;
                    if(st === 'Hadir') h++;
                    else if(st === 'Sakit') s++;
                    else if(st === 'Izin') i++;
                    else if(st === 'Alpa') a++;
                });
            }
        }
        
        const total = h + s + i + a;
        const percent = total === 0 ? 0 : Math.round((h/total)*100);
        
        const div = document.createElement('div');
        div.className = 'glass-card p-4 rounded-2xl flex items-center justify-between mb-2';
        div.innerHTML = `
            <div class="flex-1">
                <h4 class="font-bold text-slate-800 dark:text-white">${santri.nama}</h4>
                <div class="flex gap-4 mt-2 text-xs font-bold">
                    <span class="text-emerald-600">H: ${h}</span>
                    <span class="text-amber-600">S: ${s}</span>
                    <span class="text-blue-600">I: ${i}</span>
                    <span class="text-red-600">A: ${a}</span>
                </div>
            </div>
            <div class="text-right">
                <div class="text-2xl font-black ${percent >= 80 ? 'text-emerald-500' : percent >= 60 ? 'text-amber-500' : 'text-red-500'}">${percent}%</div>
                <div class="w-20 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div class="h-full bg-emerald-500 rounded-full transition-all" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
        fragment.appendChild(div);
    });
    
    container.appendChild(fragment);
};

// ==========================================
// 8. LOG & MISC
// ==========================================

window.logActivity = function(action, detail) {
    const log = {
        timestamp: new Date().toISOString(),
        action: action,
        detail: detail,
        user: appState.selectedClass ? MASTER_KELAS[appState.selectedClass].musyrif : 'Unknown'
    };
    
    appState.activityLog.unshift(log);
    if(appState.activityLog.length > 50) {
        appState.activityLog = appState.activityLog.slice(0, 50);
    }
    
    localStorage.setItem(APP_CONFIG.activityLogKey, JSON.stringify(appState.activityLog));
};

window.viewActivityLog = function() {
    const modal = document.getElementById('modal-activity');
    if(modal) {
        modal.classList.remove('hidden');
        const container = document.getElementById('activity-list');
        if(!container) return;
        
        container.innerHTML = '';
        if(appState.activityLog.length === 0) {
            container.innerHTML = '<p class="text-center text-slate-400 py-8">Belum ada aktivitas</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        appState.activityLog.forEach(log => {
            const time = new Date(log.timestamp);
            const div = document.createElement('div');
            div.className = 'glass-card p-4 rounded-2xl flex gap-4 mb-2';
            div.innerHTML = `
                <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="activity" class="w-5 h-5 text-emerald-600"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 dark:text-white text-sm">${log.action}</h4>
                    <p class="text-xs text-slate-500 truncate">${log.detail}</p>
                    <p class="text-[10px] text-slate-400 mt-1">${time.toLocaleString('id-ID')}</p>
                </div>
            `;
            fragment.appendChild(div);
        });
        container.appendChild(fragment);
        if(window.lucide) window.lucide.createIcons();
    }
};

window.kirimLaporanWA = function() {
    if(!FILTERED_SANTRI.length) return alert("Pilih kelas dulu");
    
    const slot = SLOT_WAKTU[appState.currentSlotId];
    const stats = window.calculateSlotStats(slot.id);
    const dbSlot = appState.attendanceData[appState.date]?.[slot.id];

    let msg = `*LAPORAN ${appState.selectedClass} - ${slot.label}*\n`;
    msg += `📅 ${window.formatDate(appState.date)}\n\n`;
    msg += `✅ Hadir: ${stats.h}\n`;
    msg += `🤒 Sakit: ${stats.s}\n`;
    msg += `📝 Izin: ${stats.i}\n`;
    msg += `❌ Alpa: ${stats.a}\n\n`;
    
    // List Detail Alpa/Izin/Sakit
    const notPresent = [];
    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        const st = dbSlot?.[id]?.status?.shalat;
        if(st === 'Alpa' || st === 'Sakit' || st === 'Izin') {
            notPresent.push(`- ${s.nama} (${st})`);
        }
    });

    if(notPresent.length) {
        msg += `*Detail Tidak Hadir:*\n${notPresent.join('\n')}\n`;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
};

// Update parameter ke-3 (isPersistent) agar toast tidak hilang otomatis jika perlu
const toastQueue = [];
let isShowingToast = false;

window.showToast = function(message, type = 'info', isPersistent = false) {
    if(!appState.settings.notifications && !isPersistent) return;
    
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    toast.className = `${UI_COLORS[type] || UI_COLORS.info} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-[slideUp_0.3s_ease-out] mb-3 z-[9999]`;
    toast.innerHTML = `
        <i data-lucide="${icons[type] || 'info'}" class="w-5 h-5" aria-hidden="true"></i>
        <span class="font-bold text-xs" role="alert">${window.sanitizeHTML(message)}</span>
    `;
    
    container.appendChild(toast);
    window.refreshIcons();
    
    if (!isPersistent) {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    } else {
        setTimeout(() => toast.remove(), 10000);
    }
    
    return toast;
};

window.toggleDarkMode = function() {
    document.documentElement.classList.toggle('dark');
    appState.settings.darkMode = document.documentElement.classList.contains('dark');
    localStorage.setItem(APP_CONFIG.settingsKey, JSON.stringify(appState.settings));
    window.showToast(`Mode ${appState.settings.darkMode ? 'Gelap' : 'Terang'} Aktif`, 'success');
};

window.toggleNotifications = function() {
    appState.settings.notifications = !appState.settings.notifications;
    localStorage.setItem(APP_CONFIG.settingsKey, JSON.stringify(appState.settings));
    
    const btn = document.getElementById('btn-notifications');
    if(btn) btn.classList.toggle('opacity-50', !appState.settings.notifications);
    
    window.showToast(`Notifikasi ${appState.settings.notifications ? 'Aktif' : 'Nonaktif'}`, 'info');
};

window.saveData = function() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            const dataStr = JSON.stringify(appState.attendanceData);
            
            // Check localStorage quota (iOS Safari limit ~5MB)
            if(dataStr.length > 4500000) { // 4.5MB limit
                console.warn('Data mendekati batas storage!');
                window.showToast('Data hampir penuh. Pertimbangkan export.', 'warning');
            }
            
            localStorage.setItem(APP_CONFIG.storageKey, dataStr);
            
            if(appState.settings.autoSave) {
                const indicator = document.getElementById('save-indicator');
                if(indicator) {
                    indicator.innerHTML = '<i data-lucide="check" class="w-5 h-5 text-emerald-500"></i>';
                    window.refreshIcons();
                    setTimeout(() => indicator.innerHTML = '', 1000);
                }
            }

            window.syncToSupabase();

        } catch (e) {
            if(e.name === 'QuotaExceededError') {
                window.showToast("Storage penuh! Hapus data lama.", "error");
            } else {
                window.showToast("Gagal menyimpan: " + e.message, "error");
            }
            console.error('Save error:', e);
        }
    }, 500); // Increased debounce for better batching
};

window.updateQuickStats = function() {
    if(!appState.selectedClass) return;
    
    // Gunakan slot yang sedang aktif di dashboard (misal: Shubuh)
    // Jika ingin total harian, logika bisa disesuaikan.
    // Di sini kita pakai "Current Slot Snapshot" agar akurat.
    const slotId = appState.currentSlotId; 
    const stats = window.calculateSlotStats(slotId);
    
    // Tampilkan Angka Asli (Bukan Rata-rata)
    document.getElementById('stat-hadir').textContent = stats.h;
    document.getElementById('stat-sakit').textContent = stats.s;
    document.getElementById('stat-izin').textContent = stats.i;
    document.getElementById('stat-alpa').textContent = stats.a;
};

// Ganti fungsi window.drawDonutChart yang lama dengan ini:

window.drawDonutChart = function() {
    const canvas = document.getElementById('weekly-chart');
    
    if(!canvas || canvas.offsetParent === null) return;
    
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }
    
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    let radius = Math.min(width, height) / 2 - 10;
    if (radius <= 0) {
        console.warn("Canvas too small for chart");
        return;
    }

    ctx.clearRect(0, 0, width, height);

    let stats = { h: 0, s: 0, i: 0, a: 0 };
    let totalPeristiwa = 0;
    let activeSlots = 0;

    if(appState.selectedClass) {
        Object.values(SLOT_WAKTU).forEach(slot => {
            const sStats = window.calculateSlotStats(slot.id);
            if(sStats.isFilled) {
                stats.h += sStats.h;
                stats.s += sStats.s;
                stats.i += sStats.i;
                stats.a += sStats.a;
                totalPeristiwa += sStats.total;
                activeSlots++;
            }
        });
    }

    const divider = activeSlots > 0 ? activeSlots : 1;

    const setLegend = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.textContent = val; 
    };
    
    setLegend('legend-hadir', Math.round(stats.h / divider));
    setLegend('legend-sakit', Math.round(stats.s / divider));
    setLegend('legend-izin', Math.round(stats.i / divider));
    setLegend('legend-alpa', Math.round(stats.a / divider));

    if (totalPeristiwa === 0 || radius === 0) {
        if(radius > 0) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0';
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.stroke();
            drawCenterText(ctx, centerX, centerY, "0%", "Belum Ada Data");
        }
        return;
    }

    const segments = [
        { value: stats.h, color: '#10b981' },
        { value: stats.s, color: '#f59e0b' },
        { value: stats.i, color: '#3b82f6' },
        { value: stats.a, color: '#f43f5e' }
    ];

    let startAngle = -Math.PI / 2;

    segments.forEach(seg => {
        if(seg.value > 0) {
            const sliceAngle = (seg.value / totalPeristiwa) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.strokeStyle = seg.color;
            ctx.lineWidth = 14;
            ctx.lineCap = 'butt'; 
            ctx.stroke();

            startAngle = endAngle;
        }
    });

    const percentHadir = Math.round((stats.h / totalPeristiwa) * 100);
    drawCenterText(ctx, centerX, centerY, `${percentHadir}%`, "Hadir");
    
    const statsText = document.getElementById('dash-stats-text');
    if(statsText) statsText.textContent = `${percentHadir}% KEHADIRAN`;
};

function drawCenterText(ctx, x, y, mainText, subText) {
    ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b';
    ctx.font = '800 28px "Plus Jakarta Sans", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mainText, x, y - 5);
    
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(subText, x, y + 18);
}

// ==========================================
// 9. TABS & NAVIGATION
// ==========================================

window.switchTab = function(tabName) {
    // 1. Sembunyikan semua konten tab
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    // 2. Atur visibilitas Main Content (Dashboard)
    const mainContent = document.getElementById('main-content');
    if (tabName === 'home') {
        mainContent.classList.remove('hidden');
    } else {
        mainContent.classList.add('hidden');
    }
    
    // 3. Tampilkan Tab Target (Laporan/Profil/Analisis)
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');

    // 4. Update Style Tombol Navigasi
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === tabName) {
            btn.classList.add('active', 'text-emerald-500');
            btn.classList.remove('text-slate-400');
        } else {
            btn.classList.remove('active', 'text-emerald-500');
            btn.classList.add('text-slate-400');
        }
    });

    // 5. Jalankan Logika Spesifik per Tab
    if(tabName === 'home') {
        window.updateDashboard();
    }
    else if(tabName === 'report') {
        window.updateReportTab(); 
    }
    else if(tabName === 'profile') {
        window.updateProfileStats();
        window.renderTimesheetCalendar(); 
        window.renderPembinaanManagement(); // Refresh list di profil
        window.renderPermitHistory();
    }
    else if(tabName === 'analysis') {
        window.populateAnalysisDropdown();
        window.runAnalysis();
    }
    
    // 6. Refresh Icon Lucide
    if(window.lucide) window.lucide.createIcons();
};

window.updateReportTab = function() {
    const tbody = document.getElementById('daily-recap-tbody');
    const rangeLabel = document.getElementById('report-date-range');
    const thead = document.querySelector('#tab-report thead tr');
    
    if (thead) {
        thead.innerHTML = `
            <th class="p-3 font-bold w-8 text-center" scope="col">No</th>
            <th class="p-3 font-bold min-w-[120px]" scope="col">Nama Santri</th>
            <th class="p-3 font-bold text-center" scope="col">Shalat</th>
            <th class="p-3 font-bold text-center bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400" scope="col">Sekolah</th>
            <th class="p-3 font-bold text-center" scope="col">KBM Asrama</th>
            <th class="p-3 font-bold text-center" scope="col">Sunnah</th>
            <th class="p-3 font-bold text-center" scope="col">Nilai</th>
        `;
    }
    
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const range = window.getReportDateRange(appState.reportMode);
    if(rangeLabel) rangeLabel.textContent = range.label;

    if (!appState.selectedClass || FILTERED_SANTRI.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-xs text-slate-400">Pilih kelas terlebih dahulu</td></tr>';
        return;
    }

    // OPTIMIZATION: Use Map for O(1) lookup
    const santriStatsMap = new Map();
    FILTERED_SANTRI.forEach(s => {
        santriStatsMap.set(s.nis || s.id, { 
            fardu: { h:0, total:0 }, 
            school: { h:0, total:0 },
            kbm: { h:0, total:0 }, 
            sunnah: { y:0, total:0 },
            scoreTotal: 0,
            scoreMax: 0
        });
    });

    // OPTIMIZATION: Pre-calculate date range (avoid while loop)
    const startTime = range.start.getTime();
    const endTime = range.end.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.min(Math.ceil((endTime - startTime) / dayInMs) + 1, 370);

    for(let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startTime + (i * dayInMs));
        const dateKey = window.getLocalDateStr(currentDate);
        const dayNum = currentDate.getDay();
        const dayData = appState.attendanceData[dateKey];

        if (!dayData) continue;

        Object.values(SLOT_WAKTU).forEach(slot => {
            FILTERED_SANTRI.forEach(s => {
                const id = String(s.nis || s.id);
                const sData = dayData[slot.id]?.[id];
                const stats = santriStatsMap.get(id);
                
                if(!sData || !stats) return;

                slot.activities.forEach(act => {
                    if(act.showOnDays && !act.showOnDays.includes(dayNum)) return;
                    
                    const st = sData.status[act.id];
                    let weight = 0;
                    let point = 0;

                    if (act.category === 'school') weight = 4;
                    else if(act.category === 'fardu') weight = 3;
                    else if(act.category === 'kbm') weight = 2;
                    else weight = 1;

                    if(st === 'Hadir' || st === 'Ya' || st === 'Telat') point = weight;
                    else if(st === 'Sakit' || st === 'Izin' || st === 'Pulang') point = weight * 0.5; 
                    else point = 0;

                    stats.scoreTotal += point;
                    stats.scoreMax += weight;

                    if(act.category === 'fardu') {
                        stats.fardu.total++;
                        if(st === 'Hadir') stats.fardu.h++;
                    } 
                    else if (act.category === 'school') {
                        stats.school.total++;
                        if(st === 'Hadir' || st === 'Telat') stats.school.h++;
                    }
                    else if(act.category === 'kbm') {
                        stats.kbm.total++;
                        if(st === 'Hadir') stats.kbm.h++;
                    } else {
                        stats.sunnah.total++;
                        if(st === 'Ya' || st === 'Hadir') stats.sunnah.y++;
                    }
                });
            });
        });
    }

    // RENDER with DocumentFragment
    const fragment = document.createDocumentFragment();
    const makeBar = (pct, color) => `
        <div class="flex flex-col items-center">
            <span class="text-[10px] font-bold ${pct<60?'text-red-500':'text-slate-600'}">${pct}%</span>
            <div class="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full ${color} transition-all duration-300" style="width: ${pct}%"></div>
            </div>
        </div>`;

    FILTERED_SANTRI.forEach((s, idx) => {
        const id = String(s.nis || s.id);
        const stats = santriStatsMap.get(id);
        if(!stats) return;
        
        const finalScore = stats.scoreMax === 0 ? 0 : Math.round((stats.scoreTotal / stats.scoreMax) * 100);
        
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-50 dark:border-slate-700/50";

        let shalatCol, schoolCol, kbmCol, sunnahCol;

        if (appState.reportMode === 'daily') {
            const dateKey = appState.date;
            const dayData = appState.attendanceData[dateKey] || {};
            
            let badges = '';
            ['shubuh', 'ashar', 'maghrib', 'isya'].forEach(sid => {
                const st = dayData[sid]?.[id]?.status?.shalat;
                let color = 'bg-slate-100 text-slate-300';
                
                if(st === 'Hadir') color = 'bg-emerald-100 text-emerald-600';
                else if(st === 'Sakit') color = 'bg-amber-100 text-amber-600';
                else if(st === 'Izin') color = 'bg-blue-100 text-blue-600';
                else if(st === 'Pulang') color = 'bg-purple-100 text-purple-600';
                else if(st === 'Alpa') color = 'bg-red-100 text-red-600';
                
                const label = sid[0].toUpperCase();
                badges += `<span class="w-5 h-5 flex items-center justify-center rounded ${color} text-[9px] font-black" aria-label="${sid}: ${st || 'Belum diisi'}">${label}</span>`;
            });
            shalatCol = `<div class="flex justify-center gap-1" role="list">${badges}</div>`;

            const stSchool = dayData['sekolah']?.[id]?.status?.kbm_sekolah;
            let schColor = 'bg-slate-100 text-slate-300';
            let schLabel = '-';
            
            if(stSchool === 'Hadir') { schColor = 'bg-cyan-100 text-cyan-600'; schLabel = 'H'; }
            else if(stSchool === 'Telat') { schColor = 'bg-teal-100 text-teal-600'; schLabel = 'T'; }
            else if(stSchool === 'Sakit') { schColor = 'bg-amber-100 text-amber-600'; schLabel = 'S'; }
            else if(stSchool === 'Izin') { schColor = 'bg-blue-100 text-blue-600'; schLabel = 'I'; }
            else if(stSchool === 'Alpa') { schColor = 'bg-red-100 text-red-600'; schLabel = 'A'; }

            schoolCol = `<div class="flex justify-center"><span class="w-6 h-6 flex items-center justify-center rounded-lg ${schColor} text-[10px] font-black shadow-sm" aria-label="Sekolah: ${stSchool || 'Belum diisi'}">${schLabel}</span></div>`;

            kbmCol = `<span class="font-bold text-slate-600 dark:text-slate-400">${stats.kbm.h}</span>`;
            sunnahCol = `<span class="font-bold text-slate-600 dark:text-slate-400">${stats.sunnah.y}</span>`;
        } 
        else {
            const pctFardu = stats.fardu.total ? Math.round((stats.fardu.h / stats.fardu.total)*100) : 0;
            const pctSchool = stats.school.total ? Math.round((stats.school.h / stats.school.total)*100) : 0;
            const pctKbm = stats.kbm.total ? Math.round((stats.kbm.h / stats.kbm.total)*100) : 0;
            const pctSunnah = stats.sunnah.total ? Math.round((stats.sunnah.y / stats.sunnah.total)*100) : 0;

            shalatCol = makeBar(pctFardu, 'bg-emerald-500');
            schoolCol = makeBar(pctSchool, 'bg-cyan-500');
            kbmCol = makeBar(pctKbm, 'bg-blue-500');
            sunnahCol = makeBar(pctSunnah, 'bg-amber-500');
        }

        let scoreColor = 'text-red-500';
        if(finalScore >= 85) scoreColor = 'text-emerald-500';
        else if(finalScore >= 70) scoreColor = 'text-blue-500';
        else if(finalScore >= 50) scoreColor = 'text-amber-500';

        tr.innerHTML = `
            <td class="p-3 text-center text-slate-500 text-[10px] font-bold">${idx + 1}</td>
            <td class="p-3">
                <div class="font-bold text-slate-700 dark:text-slate-200 text-xs">${window.sanitizeHTML(s.nama)}</div>
                ${appState.reportMode !== 'daily' ? `<div class="text-[9px] text-slate-400 mt-0.5">Total Point: ${stats.scoreTotal}</div>` : ''}
            </td>
            <td class="p-3 text-center align-middle">${shalatCol}</td>
            <td class="p-3 text-center align-middle bg-cyan-50/30 dark:bg-cyan-900/10 border-x border-cyan-100 dark:border-cyan-900/20">${schoolCol}</td>
            <td class="p-3 text-center align-middle">${kbmCol}</td>
            <td class="p-3 text-center align-middle">${sunnahCol}</td>
            <td class="p-3 text-center font-black ${scoreColor} text-sm">${finalScore}</td>
        `;
        fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
};

window.getSkeletonHTML = function(count) {
    let html = '';
    for(let i = 0; i < count; i++) {
        html += `
            <div class="glass-card p-4 rounded-2xl animate-pulse mb-2">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                        <div class="flex-1 space-y-2">
                            <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                            <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                        </div>
                    </div>
                    <div class="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>
            </div>`;
    }
    return html;
};

window.updateProfileStats = function() {
    if(!appState.selectedClass) return;
    
    // Hitung rata-rata
    let totalPercent = 0, daysCount = 0;
    
    // Loop semua tanggal yang ada di DB
    Object.keys(appState.attendanceData).forEach(dateKey => {
         const dailyStats = { h:0, total:0 };
         let hasData = false;

         // Loop Slots
         Object.values(SLOT_WAKTU).forEach(slot => {
             const stats = window.calculateSlotStats(slot.id, dateKey);
             if(stats.isFilled) {
                 dailyStats.h += stats.h;
                 dailyStats.total += stats.total;
                 hasData = true;
             }
         });

         if(hasData) {
             const pct = dailyStats.total === 0 ? 0 : (dailyStats.h / dailyStats.total);
             totalPercent += pct;
             daysCount++;
         }
    });
    
    const avgEl = document.getElementById('profile-avg-attendance');
    if(avgEl) {
        const avg = daysCount === 0 ? 0 : Math.round((totalPercent / daysCount) * 100);
        avgEl.textContent = avg + '%';
    }
    
    const daysEl = document.getElementById('profile-days-count');
    if(daysEl) daysEl.textContent = daysCount;
};

// 1. Cek Slot Accessible
window.isSlotAccessible = function(slotId, dateStr) {
    const todayStr = window.getLocalDateStr();
    
    if (dateStr > todayStr) return { locked: true, reason: 'future' };

    // Hitung selisih hari (Ms ke Hari)
    const diffTime = Math.abs(new Date(todayStr) - new Date(dateStr));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays > 3) return { locked: true, reason: 'limit' };

    if (dateStr === todayStr) {
        const currentHour = new Date().getHours();
        const slotStart = SLOT_WAKTU[slotId].startHour;
        if (currentHour < slotStart) return { locked: true, reason: 'wait' };
    }

    return { locked: false, reason: '' };
};

// 2. Default Slot
window.determineCurrentSlot = function() {
    const h = new Date().getHours();
    if (h >= 19) return 'isya';
    if (h >= 18) return 'maghrib';
    if (h >= 15) return 'ashar';
    if (h >= 6)  return 'sekolah'; // <-- JAM 06:00 - 15:00 = SEKOLAH
    return 'shubuh';
};

window.handleClearData = function() {
    window.showConfirmModal(
        'Hapus Data Hari Ini?',
        'Data presensi hari ini akan dihapus permanen.',
        'Hapus', 'Batal',
        () => {
            delete appState.attendanceData[appState.date];
            window.saveData();
            window.updateDashboard();
            window.showToast('Data berhasil dihapus', 'success');
            window.logActivity('Hapus Data', `Menghapus data tanggal ${appState.date}`);
        }
    );
};

window.showConfirmModal = function(title, message, confirmText, cancelText, onConfirm) {
    const modal = document.getElementById('modal-confirm');
    if(modal) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        
        const btnYes = document.getElementById('confirm-yes');
        const btnNo = document.getElementById('confirm-no');
        
        btnYes.textContent = confirmText;
        btnYes.onclick = () => { onConfirm(); modal.classList.add('hidden'); };
        
        btnNo.textContent = cancelText;
        btnNo.onclick = () => modal.classList.add('hidden');
        
        modal.classList.remove('hidden');
    }
};

// Backup Restore Logic
window.backupData = function() {
    const backup = {
        version: '1.0',
        date: new Date().toISOString(),
        class: appState.selectedClass,
        attendance: appState.attendanceData,
        activityLog: appState.activityLog
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_${appState.selectedClass}_${window.getLocalDateStr()}.json`;
    link.click();
    
    window.showToast('Backup berhasil diunduh', 'success');
};

window.restoreData = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const backup = JSON.parse(event.target.result);
                if(!backup.attendance) throw new Error('Format salah');
                
                window.showConfirmModal('Restore Data?', 'Data saat ini akan tertimpa.', 'Restore', 'Batal', () => {
                    appState.attendanceData = backup.attendance;
                    if(backup.activityLog) appState.activityLog = backup.activityLog;
                    window.saveData();
                    window.updateDashboard();
                    window.showToast('Data berhasil di-restore', 'success');
                });
            } catch(err) {
                window.showToast('Gagal: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

window.startClock = function() {
    if(clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    
    const updateClock = () => {
        const el = document.getElementById('dash-clock');
        if(el) {
            const now = new Date();
            el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const secEl = document.getElementById('dash-clock-sec');
            if(secEl) secEl.textContent = String(now.getSeconds()).padStart(2, '0');
        }
        
        try {
            window.checkScheduledNotifications();
        } catch(e) {
            console.error('Notification error:', e);
        }
    };
    
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
};

window.handleGantiPin = function() {
    const p = prompt("PIN Baru:");
    if(p) {
        localStorage.setItem('musyrif_pin', p);
        alert("PIN Tersimpan");
    }
};

window.exportToCSV = function() { alert("Gunakan tombol Export Excel di atas."); };
window.printReport = function() { window.print(); };

// ==========================================
// FITUR PERIZINAN / SAKIT (DURASI)
// ==========================================

// --- FITUR PERIZINAN (UPDATED) ---

// Variabel temp untuk filter
let permitSantriList = [];

// Variable state tambahan
let currentPermitTab = 'sakit';

// 1. Fungsi Buka Modal & Setup Tab
// Update Open Modal untuk Reset State juga
// Variable global untuk mode modal saat ini
let currentModalMode = 'daily'; // 'daily' atau 'pulang'

// Update fungsi Open Modal untuk menerima parameter mode
let isAllSelected = false;

window.openPermitModal = function(mode = 'daily') {
    if(!appState.selectedClass) return window.showToast("Pilih kelas terlebih dahulu!", "warning");
    
    // RESET STATE
    isAllSelected = false;
    currentModalMode = mode;
    
    const modal = document.getElementById('modal-permit');
    const btnSelect = document.getElementById('btn-select-all-permit');
    if(btnSelect) btnSelect.textContent = "Pilih Semua";

    const tabSakit = document.getElementById('tab-btn-sakit');
    const tabIzin = document.getElementById('tab-btn-izin');
    const tabPulang = document.getElementById('tab-btn-pulang');
    const modalTitle = modal.querySelector('h3');
    const modalDesc = modal.querySelector('p');

    tabSakit.classList.remove('hidden');
    tabIzin.classList.remove('hidden');
    tabPulang.classList.remove('hidden');

    if (mode === 'daily') {
        tabPulang.classList.add('hidden');
        window.setPermitTab('sakit');
        if(modalTitle) modalTitle.textContent = "Input Perizinan Harian";
        if(modalDesc) modalDesc.textContent = "Sakit & Izin Kegiatan";
    } else {
        tabSakit.classList.add('hidden');
        tabIzin.classList.add('hidden');
        window.setPermitTab('pulang');
        if(modalTitle) modalTitle.textContent = "Manajemen Perpulangan";
        if(modalDesc) modalDesc.textContent = "Izin Pulang & Liburan";
    }
    
    document.getElementById('permit-search-santri').value = '';
    window.renderPermitChecklist(FILTERED_SANTRI);
    window.updatePermitCount();
    window.renderPermitList();
    
    window.openModal('modal-permit'); // Use improved modal function
};

window.renderPermitChecklist = function(list) {
    const container = document.getElementById('permit-santri-checklist');
    if(!container) return;
    container.innerHTML = '';

    list.forEach(s => {
        const id = String(s.nis || s.id);
        const div = document.createElement('label');
        div.className = 'flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-emerald-500 transition-all group select-none';
        div.innerHTML = `
            <input type="checkbox" name="permit_santri_select" value="${id}" onchange="window.updatePermitCount()" class="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 rounded-md cursor-pointer accent-emerald-500">
            <span class="text-xs font-bold text-slate-600 dark:text-slate-300 truncate group-hover:text-slate-800 dark:group-hover:text-white">${s.nama}</span>
        `;
        container.appendChild(div);
    });
};

window.filterPermitSantri = function(val) {
    const search = val.toLowerCase();
    const filtered = FILTERED_SANTRI.filter(s => s.nama.toLowerCase().includes(search));
    window.renderPermitChecklist(filtered);
};

window.updatePermitCount = function() {
    const checked = document.querySelectorAll('input[name="permit_santri_select"]:checked').length;
    const el = document.getElementById('permit-selected-count');
    if(el) el.textContent = checked;
};

window.deletePermit = function(id) {
    if(!confirm("Hapus data izin ini? Status akan dikembalikan ke default.")) return;
    
    appState.permits = appState.permits.filter(p => p.id !== id);
    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    window.renderPermitList();
    window.showToast("Data izin dihapus", "info");
    
    // Trigger re-render untuk menjalankan logika RESET
    window.renderAttendanceList();
    window.updateDashboard();
};

window.renderPermitList = function() {
    const container = document.getElementById('permit-list-container');
    container.innerHTML = '';
    
    const classNisList = FILTERED_SANTRI.map(s => String(s.nis || s.id));
    // Filter izin aktif milik kelas ini
    let activePermits = appState.permits.filter(p => {
        const isMyClass = classNisList.includes(p.nis);
        const isActive = p.is_active;
        
        // Cek jika ini sakit yang sudah sembuh (punya end_date)
        const isRecoveredSakit = (p.category === 'sakit' && p.end_date !== null);
        
        return isMyClass && isActive && !isRecoveredSakit; 
    });

    if (currentModalMode === 'daily') {
        activePermits = activePermits.filter(p => p.category === 'sakit' || p.category === 'izin');
    } else {
        activePermits = activePermits.filter(p => p.category === 'pulang');
    }
    
    // --- TAMBAHAN FILTER BERDASARKAN MODE ---
    if (currentModalMode === 'daily') {
        // Jika mode harian, tampilkan Sakit & Izin saja
        activePermits = activePermits.filter(p => p.category === 'sakit' || p.category === 'izin');
    } else {
        // Jika mode perpulangan, tampilkan Pulang saja
        activePermits = activePermits.filter(p => p.category === 'pulang');
    }

    if(activePermits.length === 0) {
        container.innerHTML = '<div class="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold">Tidak ada yang izin/sakit</div>';
        return;
    }

    activePermits.forEach(p => {
        const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === p.nis);
        if(!santri) return;

        // Tampilan Beda Tiap Kategori
        let badgeColor = 'bg-slate-100 text-slate-600';
        let detailText = '';
        let actionBtn = '';

        if(p.category === 'sakit') {
            badgeColor = 'bg-amber-100 text-amber-600 border border-amber-200';
            detailText = `Mulai: ${window.formatDate(p.start_date)} (${p.start_session}) • ${p.location}`;
            // Tombol Sembuh
            actionBtn = `<button onclick="window.markAsRecovered('${p.id}')" class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow hover:bg-emerald-600">Sembuh</button>`;
        } 
        else {
            if(p.category === 'izin') badgeColor = 'bg-blue-100 text-blue-600 border border-blue-200';
            else badgeColor = 'bg-purple-100 text-purple-600 border border-purple-200';
            
            detailText = `Sampai: ${window.formatDate(p.end_date)} ${p.end_time_limit}`;
            
            // Tombol Perpanjang / Sudah Kembali
            actionBtn = `
                <div class="flex gap-1">
                    <button onclick="window.extendPermit('${p.id}')" class="px-2 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-[10px] font-bold">Perpanjang</button>
                    <button onclick="window.markAsReturned('${p.id}')" class="px-2 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-bold">Kembali</button>
                </div>
            `;
        }

        const div = document.createElement('div');
        div.className = 'p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center';
        div.innerHTML = `
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${badgeColor}">${p.category}</span>
                    <span class="font-bold text-slate-800 dark:text-white text-xs">${santri.nama}</span>
                </div>
                <p class="text-[10px] font-bold text-slate-500">${p.reason}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">${detailText}</p>
            </div>
            <div class="flex flex-col gap-1 items-end">
                ${actionBtn}
                <button onclick="window.deletePermit('${p.id}')" class="text-[9px] text-red-400 underline mt-1">Hapus Data</button>
            </div>
        `;
        container.appendChild(div);
    });
};

window.checkActivePermit = function(nis, currentDateStr, currentSlotId) {
    const permit = appState.permits.find(p => String(p.nis) === String(nis) && p.is_active);
    if (!permit) return null;

    // --- LOGIKA SAKIT ---
    if (permit.category === 'sakit') {
        // Validasi Awal Tanggal
        if (currentDateStr < permit.start_date) return null;
        if (currentDateStr === permit.start_date && SESSION_ORDER[currentSlotId] < SESSION_ORDER[permit.start_session]) return null;

        // Validasi Sembuh (End Date)
        if (permit.end_date) {
            // Jika sudah lewat tanggal sembuh -> Sehat
            if (currentDateStr > permit.end_date) return null; 
            
            // Jika hari ini tanggal sembuh, cek sesinya
            if (currentDateStr === permit.end_date && permit.end_session) {
                // Logic: Jika sesi sekarang SUDAH MELEWATI atau SAMA DENGAN sesi sembuh -> Sehat
                // Contoh: End Session = Shubuh. Buka Ashar (2) > Shubuh (1) -> Sehat.
                // Tapi tunggu, "End Session" biasanya menandakan sesi TERAKHIR dia sakit.
                // Jadi: Jika Sesi Sekarang > Sesi Terakhir Sakit, maka Null.
                if (SESSION_ORDER[currentSlotId] > SESSION_ORDER[permit.end_session]) {
                    return null; 
                }
            }
        }
        return { type: 'Sakit', label: 'S', end: permit.end_date, note: `[Sakit] ${permit.reason}` };
    }

    // --- LOGIKA IZIN & PULANG ---
    else {
        if (currentDateStr < permit.start_date) return null;
        if (currentDateStr === permit.start_date && SESSION_ORDER[currentSlotId] < SESSION_ORDER[permit.start_session]) return null;

        // Cek Deadline Kembali
        if (currentDateStr > permit.end_date) {
             return { type: 'Alpa', label: 'A', end: permit.end_date, note: `[Terlambat] Deadline ${window.formatDate(permit.end_date)}` };
        }

        if (currentDateStr === permit.end_date) {
            const deadlineTime = permit.end_time_limit || '17:00';
            const deadlineHour = parseInt(deadlineTime.split(':')[0]);
            const slotStartHour = SLOT_WAKTU[currentSlotId].startHour; 
            
            // Jika waktu presensi sudah melewati jam deadline -> Alpa
            if (slotStartHour >= deadlineHour) {
                return { type: 'Alpa', label: 'A', end: permit.end_date, note: `[Terlambat] Deadline jam ${deadlineTime}` };
            }
        }

        const cat = (permit.category || '').toLowerCase();
        const label = cat === 'pulang' ? 'Pulang' : 'Izin';
        const code = cat === 'pulang' ? 'P' : 'I';
        
        return { type: label, label: code, end: permit.end_date, note: `[${label}] ${permit.reason}` };
    }
};

// ==========================================
// FITUR ANALISIS SANTRI (BARU)
// ==========================================

// 1. Setup Dropdown Santri saat buka tab Analysis
window.populateAnalysisDropdown = function() {
    const select = document.getElementById('analysis-santri');
    if (!select) return;

    // Simpan value lama jika ada
    const oldVal = select.value;
    
    select.innerHTML = '<option value="">-- Pilih Santri --</option>';
    
    // Sort nama santri
    const sorted = [...FILTERED_SANTRI].sort((a,b) => a.nama.localeCompare(b.nama));
    
    sorted.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.nis || s.id;
        opt.textContent = s.nama;
        select.appendChild(opt);
    });

    if(oldVal) select.value = oldVal;
};

// 2. Ganti Mode (Harian/Pekan/Bulan/Semester)
window.setAnalysisMode = function(mode) {
    appState.analysisMode = mode;
    
    // Update UI Button
    document.querySelectorAll('.anl-btn').forEach(btn => {
        if(btn.dataset.mode === mode) {
            btn.classList.add('active-mode', 'text-white');
            btn.classList.remove('text-slate-500');
        } else {
            btn.classList.remove('active-mode', 'text-white');
            btn.classList.add('text-slate-500');
        }
    });

    window.runAnalysis();
};

// 3. Helper: Mendapatkan Rentang Tanggal
window.getDateRange = function(mode) {
    const today = new Date(appState.date); // Gunakan tanggal dari Date Picker dashboard
    let start = new Date(today);
    let end = new Date(today);
    let label = "";

    if (mode === 'daily') {
        label = window.formatDate(appState.date);
    } 
    else if (mode === 'weekly') {
        const day = today.getDay(); // 0 (Sun) - 6 (Sat)
        // Adjust agar Senin jadi hari pertama (Opsional, tergantung kebiasaan pondok)
        // Disini asumsi Senin = start
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
        start.setDate(diff);
        end.setDate(start.getDate() + 6);
        label = `${start.getDate()}/${start.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1}/${end.getFullYear()}`;
    } 
    else if (mode === 'monthly') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        label = `${months[today.getMonth()]} ${today.getFullYear()}`;
    } 
    else if (mode === 'semester') {
        // Semester 1: Jan - Jun, Semester 2: Jul - Des
        if(today.getMonth() < 6) {
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 5, 30);
            label = `Semester Ganjil (Jan-Jun ${today.getFullYear()})`;
        } else {
            start = new Date(today.getFullYear(), 6, 1);
            end = new Date(today.getFullYear(), 11, 31);
            label = `Semester Genap (Jul-Des ${today.getFullYear()})`;
        }
    }

    return { start, end, label };
};

// 4. ENGINE ANALISIS UTAMA
window.runAnalysis = function() {
    const santriId = document.getElementById('analysis-santri').value;
    if(!santriId) {
        document.getElementById('analysis-result').classList.add('hidden');
        document.getElementById('analysis-empty').classList.remove('hidden');
        return;
    }

    document.getElementById('analysis-result').classList.remove('hidden');
    document.getElementById('analysis-empty').classList.add('hidden');

    const range = window.getDateRange(appState.analysisMode);
    document.getElementById('analysis-date-range').textContent = range.label;

    let stats = {
        fardu: { h:0, m:0, total:0 },
        kbm: { h:0, m:0, total:0 },
        sunnah: { y:0, t:0, total:0 }
    };

    let curr = new Date(range.start);
    const end = new Date(range.end);
    let loopGuard = 0;

    while(curr <= end && loopGuard < 370) {
        const prevTime = curr.getTime();
        
        const y = curr.getFullYear();
        const m = String(curr.getMonth()+1).padStart(2,'0');
        const d = String(curr.getDate()).padStart(2,'0');
        const safeDateKey = `${y}-${m}-${d}`;

        const dayData = appState.attendanceData[safeDateKey];
        const dayNum = curr.getDay();

        if (dayData) {
            Object.values(SLOT_WAKTU).forEach(slot => {
                const sData = dayData[slot.id]?.[santriId];
                if(sData) {
                    slot.activities.forEach(act => {
                        if(act.showOnDays && !act.showOnDays.includes(dayNum)) return;

                        const st = sData.status[act.id];
                        if(!st) return;

                        if(act.category === 'fardu') {
                            stats.fardu.total++;
                            if(st === 'Hadir') stats.fardu.h++;
                            else stats.fardu.m++;
                        }
                        else if(act.category === 'kbm') {
                            stats.kbm.total++;
                            if(st === 'Hadir') stats.kbm.h++;
                            else stats.kbm.m++;
                        }
                        else if(act.category === 'sunnah' || act.category === 'dependent') {
                            stats.sunnah.total++;
                            if(st === 'Ya' || st === 'Hadir') stats.sunnah.y++;
                            else stats.sunnah.t++;
                        }
                    });
                }
            });
        }
        
        curr.setDate(curr.getDate() + 1);
        loopGuard++;
        
        if(curr.getTime() === prevTime) {
            console.error("Date increment stuck! Breaking loop.");
            break;
        }
    }

    window.renderBar('fardu', stats.fardu.h, stats.fardu.m);
    window.renderBar('kbm', stats.kbm.h, stats.kbm.m);
    window.renderBar('sunnah', stats.sunnah.y, stats.sunnah.t);

    const pctFardu = stats.fardu.total ? (stats.fardu.h / stats.fardu.total) * 100 : 0;
    const pctKbm = stats.kbm.total ? (stats.kbm.h / stats.kbm.total) * 100 : 0;
    const pctSunnah = stats.sunnah.total ? (stats.sunnah.y / stats.sunnah.total) * 100 : 0;

    let totalScore = 0;
    let divider = 0;
    
    if(stats.fardu.total) { totalScore += pctFardu * 0.5; divider += 0.5; }
    if(stats.kbm.total) { totalScore += pctKbm * 0.3; divider += 0.3; }
    if(stats.sunnah.total) { totalScore += pctSunnah * 0.2; divider += 0.2; }

    const finalScore = divider ? Math.round(totalScore / divider) : 0;
    
    document.getElementById('anl-total-score').textContent = `${finalScore}%`;
    
    const elVerdict = document.getElementById('anl-verdict');
    if(finalScore >= 90) { elVerdict.textContent = "Mumtaz (Sangat Baik)"; elVerdict.className = "text-sm font-bold text-emerald-500"; }
    else if(finalScore >= 75) { elVerdict.textContent = "Jayyid (Baik)"; elVerdict.className = "text-sm font-bold text-blue-500"; }
    else if(finalScore >= 60) { elVerdict.textContent = "Maqbul (Cukup)"; elVerdict.className = "text-sm font-bold text-amber-500"; }
    else { elVerdict.textContent = "Naqis (Kurang)"; elVerdict.className = "text-sm font-bold text-red-500"; }

    document.getElementById('anl-score-fardu').textContent = Math.round(pctFardu) + '%';
    document.getElementById('anl-score-kbm').textContent = Math.round(pctKbm) + '%';
    document.getElementById('anl-score-sunnah').textContent = Math.round(pctSunnah) + '%';
};

// 5. Render Bar Helper
window.renderBar = function(type, good, bad) {
    const total = good + bad;
    if(total === 0) {
        document.getElementById(`bar-${type}-h`).style.width = '0%';
        document.getElementById(`txt-${type}-h`).textContent = '0';
        // Untuk Sunnah id nya beda (y/t) tapi kita mapping manual disini biar gampang
        if(type === 'sunnah') {
             document.getElementById(`bar-${type}-y`).style.width = '0%';
             document.getElementById(`txt-${type}-y`).textContent = '0';
             document.getElementById(`bar-${type}-t`).style.width = '0%';
             document.getElementById(`txt-${type}-t`).textContent = '0';
        } else {
             document.getElementById(`bar-${type}-m`).style.width = '0%';
             document.getElementById(`txt-${type}-m`).textContent = '0';
        }
        return;
    }

    const pctGood = (good / total) * 100;
    const pctBad = (bad / total) * 100;

    if(type === 'sunnah') {
        document.getElementById(`bar-${type}-y`).style.width = `${pctGood}%`;
        document.getElementById(`txt-${type}-y`).textContent = good;
        document.getElementById(`bar-${type}-t`).style.width = `${pctBad}%`;
        document.getElementById(`txt-${type}-t`).textContent = bad;
    } else {
        document.getElementById(`bar-${type}-h`).style.width = `${pctGood}%`;
        document.getElementById(`txt-${type}-h`).textContent = good;
        document.getElementById(`bar-${type}-m`).style.width = `${pctBad}%`;
        document.getElementById(`txt-${type}-m`).textContent = bad;
    }
};

window.renderTimesheetCalendar = function() {
    const container = document.getElementById('timesheet-calendar');
    const label = document.getElementById('timesheet-month-label');
    if(!container) return;

    container.innerHTML = '';
    
    // Header Hari (Sen-Min)
    const daysHeader = ['Sen','Sel','Rab','Kam','Jum','Sab','Ahd'];
    daysHeader.forEach(d => {
        const div = document.createElement('div');
        div.className = 'text-[9px] font-bold text-slate-400 py-2';
        div.textContent = d;
        container.appendChild(div);
    });

    const now = new Date();
    // Gunakan tanggal dari appState jika ingin melihat bulan yang dipilih di dashboard, 
    // atau gunakan bulan sekarang (Realtime). Kita gunakan bulan dari appState.date agar sinkron.
    const currentViewDate = new Date(appState.date);
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    // Set Label
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    if(label) label.textContent = `${months[month]} ${year}`;

    // Logika Kalender
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Adjustment agar Senin = index 0 (JS default Minggu = 0)
    let startDayIndex = firstDay.getDay() - 1; 
    if(startDayIndex === -1) startDayIndex = 6; 

    const totalDays = lastDay.getDate();

    // Empty cells before start
    for(let i=0; i<startDayIndex; i++) {
        const div = document.createElement('div');
        container.appendChild(div);
    }

    // Date cells
    for(let d=1; d<=totalDays; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        
        // Cek Status Pengisian Data
        const dayData = appState.attendanceData[dateStr];
        let status = 'empty'; // empty, partial, full
        
        if(dayData) {
            const filledSlots = Object.keys(dayData).length;
            const totalSlots = Object.keys(SLOT_WAKTU).length; // 4 slot
            
            if(filledSlots === 0) status = 'empty';
            else if(filledSlots >= totalSlots) status = 'full';
            else status = 'partial';
        }

        // Style
        let bgClass = 'bg-slate-100 text-slate-400 dark:bg-slate-700'; // Empty
        if(status === 'full') bgClass = 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30';
        else if(status === 'partial') bgClass = 'bg-amber-400 text-white shadow-lg shadow-amber-500/30';

        // Highlight Hari Ini
        const isToday = (dateStr === window.getLocalDateStr());
        const borderClass = isToday ? 'ring-2 ring-indigo-500 ring-offset-2' : '';

        const div = document.createElement('div');
        div.className = `aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all hover:scale-110 cursor-pointer ${bgClass} ${borderClass}`;
        div.textContent = d;
        div.onclick = () => {
            // Klik tanggal di kalender -> Pindah tanggal dashboard
            window.handleDateChange(dateStr);
            window.switchTab('home');
        };

        container.appendChild(div);
    }
};

// --- LOGIKA LAPORAN REKAP ---

// 1. Set Mode Laporan
window.setReportMode = function(mode) {
    appState.reportMode = mode;
    
    // Update UI Button
    document.querySelectorAll('.rpt-btn').forEach(btn => {
        if(btn.dataset.mode === mode) {
            btn.classList.add('active-mode', 'text-white');
            btn.classList.remove('text-slate-500');
        } else {
            btn.classList.remove('active-mode', 'text-white');
            btn.classList.add('text-slate-500');
        }
    });

    window.updateReportTab(); // Refresh tabel
};

// 2. Helper Range Tanggal (Update support Yearly)
window.getReportDateRange = function(mode) {
    const today = new Date(appState.date);
    let start = new Date(today);
    let end = new Date(today);
    let label = "";

    if (mode === 'daily') {
        label = window.formatDate(appState.date);
    } 
    else if (mode === 'weekly') {
        const day = today.getDay(); 
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
        start.setDate(diff);
        end.setDate(start.getDate() + 6);
        label = `${start.getDate()}/${start.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1}/${end.getFullYear()}`;
    } 
    else if (mode === 'monthly') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
        label = `${months[today.getMonth()]} ${today.getFullYear()}`;
    } 
    else if (mode === 'semester') {
        if(today.getMonth() < 6) {
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 5, 30);
            label = `Sem. Ganjil ${today.getFullYear()}`;
        } else {
            start = new Date(today.getFullYear(), 6, 1);
            end = new Date(today.getFullYear(), 11, 31);
            label = `Sem. Genap ${today.getFullYear()}`;
        }
    }
    else if (mode === 'yearly') {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        label = `Tahun ${today.getFullYear()}`;
    }

    return { start, end, label };
};

// --- FITUR GEOFENCING ---

// Rumus Haversine untuk menghitung jarak antar 2 koordinat (dalam meter)
window.getDistanceFromLatLonInMeters = function(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius bumi dalam meter
    const dLat = window.deg2rad(lat2 - lat1);
    const dLon = window.deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(window.deg2rad(lat1)) * Math.cos(window.deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Jarak dalam meter
    return d;
};

window.deg2rad = function(deg) {
    return deg * (Math.PI/180);
};

// Fungsi Utama Verifikasi Lokasi (Async)
window.verifyLocation = function() {
    return new Promise((resolve, reject) => {
        if (!GEO_CONFIG.useGeofencing) {
            resolve(true);
            return;
        }

        if (!navigator.geolocation) {
            reject("Browser tidak mendukung GPS.");
            return;
        }

        const toastId = window.showToast("📡 Memeriksa lokasi GPS...", "info", true);

        const timeout = setTimeout(() => {
            reject("Timeout: GPS tidak merespons dalam 10 detik");
            if(toastId) toastId.remove();
        }, 10000);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timeout);
                if(toastId) toastId.remove();
                
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                let isInside = false;
                let nearestDist = 9999999;
                let nearestName = "Unknown";

                GEO_CONFIG.locations.forEach(loc => {
                    const dist = window.getDistanceFromLatLonInMeters(userLat, userLng, loc.lat, loc.lng);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestName = loc.name;
                    }
                    
                    if (dist <= GEO_CONFIG.maxRadiusMeters) {
                        isInside = true;
                    }
                });

                if (isInside) {
                    resolve(true);
                } else {
                    reject(`Lokasi Anda terlalu jauh (${Math.round(nearestDist)}m dari ${nearestName}). Radius maksimal: ${GEO_CONFIG.maxRadiusMeters}m.`);
                }
            },
            (error) => {
                clearTimeout(timeout);
                if(toastId) toastId.remove();
                
                let msg = "Gagal mendeteksi lokasi.";
                if(error.code === 1) msg = "Izin lokasi ditolak. Aktifkan GPS di browser.";
                else if(error.code === 2) msg = "Sinyal GPS tidak ditemukan. Pastikan Anda di luar ruangan.";
                else if(error.code === 3) msg = "Waktu deteksi GPS habis. Coba lagi.";
                
                reject(msg);
            },
            { 
                enableHighAccuracy: true, 
                timeout: 9000, 
                maximumAge: 0 
            }
        );
    });
};

// Fungsi Pengirim Paket ke Gudang (Supabase)
window.syncToSupabase = async function() {
    try {
        const dateKey = appState.date;
        const slotId = appState.currentSlotId;
        const classId = appState.selectedClass;

        if (!dateKey || !slotId || !classId) return;

        const dayData = appState.attendanceData[dateKey]?.[slotId];
        if (!dayData) return;

        const musyrifEmail = appState.userProfile ? appState.userProfile.email : 'manual-pin';

        const updates = [];
        Object.keys(dayData).forEach(studentId => {
            const studentData = dayData[studentId];
            
            updates.push({
                date: dateKey,
                class_name: classId,
                slot: slotId,
                student_id: studentId,
                activity_data: studentData,
                musyrif_email: musyrifEmail
            });
        });

        if (updates.length === 0) return;

        const { error } = await dbClient
            .from('attendance')
            .upsert(updates, { onConflict: 'date, class_name, slot, student_id' });

        if (error) throw error;
        
        console.log("✅ Data tersimpan di Cloud (Supabase)");
        
    } catch (error) {
        console.error("❌ Supabase Sync Error:", error);
        
        // Don't spam user with errors
        if(error.message && !error.message.includes('fetch')) {
            if(window.logActivity) {
                window.logActivity('Sync Error', `Gagal cloud sync: ${error.message}`);
            }
        }
    }
};

// --- FITUR SINKRONISASI (READ) ---
window.fetchAttendanceFromSupabase = async function() {
    const classId = appState.selectedClass;
    const dateKey = appState.date;

    if (!classId || !dateKey) return;

    console.log("🔄 Syncing from Cloud...");

    try {
        const { data, error } = await dbClient
            .from('attendance')
            .select('*')
            .eq('class_name', classId)
            .eq('date', dateKey);

        if (error) throw error;

        if (data && data.length > 0) {
            if (!appState.attendanceData[dateKey]) {
                appState.attendanceData[dateKey] = {};
            }

            data.forEach(row => {
                if (!appState.attendanceData[dateKey][row.slot]) {
                    appState.attendanceData[dateKey][row.slot] = {};
                }
                
                appState.attendanceData[dateKey][row.slot][row.student_id] = row.activity_data;
            });

            localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(appState.attendanceData));

            // Refresh UI safely
            if(typeof window.renderSlotList === 'function') window.renderSlotList();
            if(typeof window.updateQuickStats === 'function') window.updateQuickStats();
            if(typeof window.drawDonutChart === 'function') window.drawDonutChart();
            if(typeof window.renderDashboardPembinaan === 'function') window.renderDashboardPembinaan();
            
            console.log(`✅ Loaded ${data.length} records from Cloud`);
        } else {
            console.log("☁️ No cloud data for this date");
        }

    } catch (err) {
        console.error("❌ Fetch Supabase Error:", err);
        
        // Only show toast if not network error
        if(err.message && !err.message.includes('fetch') && !err.message.includes('network')) {
            if(window.logActivity) {
                window.logActivity('Fetch Error', `Cloud fetch failed: ${err.message}`);
            }
        }
    }
};

// ==========================================
// FITUR NOTIFIKASI PINTAR (REMINDER)
// ==========================================

// 1. Meminta Izin Notifikasi (Dipanggil tombol lonceng)
window.requestNotificationPermission = async function() {
    if (!("Notification" in window)) {
        return window.showToast("Browser Anda tidak mendukung notifikasi", "error");
    }

    if (Notification.permission === "granted") {
        // Jika sudah aktif, kirim tes notifikasi
        window.sendLocalNotification("Notifikasi Aktif ✅", "Anda akan diingatkan saat waktu presensi tiba.", "info");
    } else {
        // Jika belum, minta izin
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            window.showToast("Notifikasi berhasil diaktifkan!", "success");
            window.sendLocalNotification("Assalamu'alaikum!", "Sistem pengingat presensi Musyrif aktif.", "info");
            
            // Sembunyikan badge merah di tombol jika ada
            const badge = document.getElementById('notif-badge');
            if(badge) badge.classList.add('hidden');
        } else {
            window.showToast("Izin notifikasi ditolak", "warning");
        }
    }
};

// 2. Fungsi Mengirim Notifikasi
window.sendLocalNotification = function(title, body, type = 'info') {
    if (Notification.permission === "granted") {
        // Cek mode HP (Vibrate)
        const options = {
            body: body,
            icon: "https://api.iconify.design/lucide/shield-check.svg?color=%2310b981", // Icon App
            badge: "https://api.iconify.design/lucide/bell.svg?color=%23ffffff",
            vibrate: [200, 100, 200], // Getaran: zzz-z-zzz
            tag: title // Agar notifikasi dengan judul sama tidak menumpuk
        };
        
        new Notification(title, options);
    }
};

// 3. Penjadwal Otomatis (Cek Waktu Setiap Menit)
window.checkScheduledNotifications = function() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();

    // Eksekusi hanya di detik ke-0 (setiap menit pas) agar tidak spam
    if (s !== 0) return;

    // --- TIPE 1: REMINDER MASUK WAKTU (Saat jam mulai pas) ---
    // Shubuh (04:00), Ashar (15:00), Maghrib (18:00), Isya (19:00)
    Object.values(SLOT_WAKTU).forEach(slot => {
        if (h === slot.startHour && m === 0) {
            window.sendLocalNotification(
                `Waktunya ${slot.label}! 🕌`,
                `Sudah masuk waktu ${slot.label}. Silakan cek kehadiran santri.`
            );
        }
    });

    // --- TIPE 2: REMINDER DEADLINE (30 Menit Sebelum Habis) ---
    // Shubuh habis jam 06:00 -> Ingatkan jam 05:30
    if (h === 5 && m === 30) {
        window.sendLocalNotification("30 Menit Lagi! ⏳", "Waktu presensi Shubuh segera berakhir.");
    }
    // Ashar habis jam 17:00 -> Ingatkan jam 16:30
    if (h === 16 && m === 30) {
        window.sendLocalNotification("Hampir Habis! ⏳", "Segera selesaikan presensi Ashar.");
    }
    // Maghrib habis jam 19:00 -> Ingatkan jam 18:45 (15 menit aja karena singkat)
    if (h === 18 && m === 45) {
        window.sendLocalNotification("Segera Isya! ⚠️", "Waktu Maghrib tinggal 15 menit.");
    }
    // Isya habis jam 21:00 -> Ingatkan jam 20:30
    if (h === 20 && m === 30) {
        window.sendLocalNotification("Jangan Lupa! 🌙", "Pastikan semua santri sudah diabsen Isya.");
    }

    // --- TIPE 3: MOTIVASI HARIAN (Opsional) ---
    // Jam 08:00 Pagi
    if (h === 8 && m === 0) {
        window.sendLocalNotification("Semangat Pagi! ☀️", "Semoga hari ini penuh keberkahan dalam mengasuh santri.");
    }
};


// 2. Logika Pindah Tab (UI Change)
window.setPermitTab = function(tab) {
    currentPermitTab = tab;
    
    // 1. Reset Semua Input Form agar bersih
    const inputsToReset = ['permit-reason', 'permit-pickup', 'permit-vehicle'];
    inputsToReset.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    // Reset Date ke Default Hari Ini (User Friendly)
    const today = window.getLocalDateStr();
    document.getElementById('permit-start-date').value = today;
    document.getElementById('permit-end-date').value = today;
    document.getElementById('permit-start-session').value = 'shubuh';
    
    // 2. UI Update (Sama seperti sebelumnya)
    document.querySelectorAll('.permit-tab').forEach(btn => {
        btn.className = "permit-tab flex-1 py-2 rounded-lg text-xs font-bold transition-all text-slate-500 hover:bg-slate-50";
    });
    const activeBtn = document.getElementById(`tab-btn-${tab}`);
    
    // Warna Tab
    if(tab === 'sakit') activeBtn.className = "permit-tab flex-1 py-2 rounded-lg text-xs font-bold transition-all bg-amber-50 text-amber-600 shadow-sm border border-amber-100";
    else if(tab === 'izin') activeBtn.className = "permit-tab flex-1 py-2 rounded-lg text-xs font-bold transition-all bg-blue-50 text-blue-600 shadow-sm border border-blue-100";
    else if(tab === 'pulang') activeBtn.className = "permit-tab flex-1 py-2 rounded-lg text-xs font-bold transition-all bg-purple-50 text-purple-600 shadow-sm border border-purple-100";

    // Show/Hide Fields
    const fieldEnd = document.getElementById('field-end-time');
    const fieldLoc = document.getElementById('field-location');
    const fieldTrans = document.getElementById('field-transport');
    const infoSakit = document.getElementById('info-sakit');
    const btnSelectAll = document.getElementById('btn-select-all-permit');
    const listReasons = document.getElementById('reasons-list');
    const lblReason = document.getElementById('lbl-reason');

    listReasons.innerHTML = ''; // Reset suggestion

    if (tab === 'sakit') {
        lblReason.textContent = "Sakit Apa?";
        fieldEnd.classList.add('hidden'); 
        fieldLoc.classList.remove('hidden');
        fieldTrans.classList.add('hidden');
        infoSakit.classList.remove('hidden');
        if(btnSelectAll) btnSelectAll.parentElement.classList.add('hidden'); // Sembunyikan pilih semua utk sakit
        
        ['Demam', 'Flu/Batuk', 'Sakit Gigi', 'Diare', 'Tifus', 'Cacar', 'Maag', 'Kecapekan'].forEach(r => {
            listReasons.innerHTML += `<option value="${r}">`;
        });
    } 
    else {
        // Logic Izin & Pulang
        fieldEnd.classList.remove('hidden');
        fieldLoc.classList.add('hidden');
        infoSakit.classList.add('hidden');
        if(btnSelectAll) btnSelectAll.parentElement.classList.remove('hidden'); // Munculkan utk izin/pulang

        if (tab === 'izin') {
            lblReason.textContent = "Keperluan Apa?";
            fieldTrans.classList.add('hidden');
            ['Acara Keluarga', 'Menikah', 'Wisuda Kakak', 'Lomba', 'Tugas Madrasah', 'Check-up Dokter'].forEach(r => {
                listReasons.innerHTML += `<option value="${r}">`;
            });
        } else {
            lblReason.textContent = "Jenis Kepulangan?";
            fieldTrans.classList.remove('hidden');
            ['Pulang Bulanan', 'Libur Semester', 'Libur Lebaran', 'Pulang Sakit Panjang'].forEach(r => {
                listReasons.innerHTML += `<option value="${r}">`;
            });
        }
    }
};

window.selectAllSantriPermit = function() {
    const checkboxes = document.querySelectorAll('input[name="permit_santri_select"]');
    checkboxes.forEach(cb => cb.checked = true);
    window.updatePermitCount();
};

// 3. Logic Simpan Data (Advanced)
window.savePermitLogic = function() {
    const checkboxes = document.querySelectorAll('input[name="permit_santri_select"]:checked');
    const selectedNis = Array.from(checkboxes).map(cb => cb.value);

    if(selectedNis.length === 0) return window.showToast("Pilih minimal 1 santri", "warning");

    const reason = document.getElementById('permit-reason').value;
    const startDate = document.getElementById('permit-start-date').value;
    const startSession = document.getElementById('permit-start-session').value;

    if(!reason) return window.showToast("Isi alasannya dulu", "warning");
    if(!startDate) return window.showToast("Tanggal mulai wajib diisi", "warning");

    let permitData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        category: currentPermitTab, // sakit, izin, pulang
        reason: reason,
        start_date: startDate,
        start_session: startSession,
        timestamp: new Date().toISOString(),
        is_active: true // Flag utama
    };

    // Tambahan Data per Kategori
    if (currentPermitTab === 'sakit') {
        // SAKIT: Open ended (end_date null)
        permitData.location = document.querySelector('input[name="loc_sakit"]:checked').value;
        permitData.end_date = null; 
        permitData.status_label = 'S';
    } 
    else {
        // IZIN & PULANG: Punya Deadline
        const endDate = document.getElementById('permit-end-date').value;
        const endTime = document.getElementById('permit-end-time').value;
        
        if(!endDate) return window.showToast("Tanggal selesai wajib diisi", "warning");
        if(endDate < startDate) return window.showToast("Tanggal selesai error", "error");

        permitData.end_date = endDate;
        permitData.end_time_limit = endTime;
        
        if (currentPermitTab === 'izin') {
            permitData.status_label = 'I';
        } else {
            permitData.status_label = 'P';
            permitData.pickup = document.getElementById('permit-pickup').value;
            permitData.vehicle = document.getElementById('permit-vehicle').value;
        }
    }

    // Simpan Loop
    selectedNis.forEach(nis => {
        appState.permits.push({ ...permitData, nis: nis });
    });

    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    window.showToast(`${selectedNis.length} Data Berhasil Disimpan`, "success");
    window.renderPermitList();
    
    // Reset Checkbox
    checkboxes.forEach(cb => cb.checked = false);
    window.updatePermitCount();

    // Refresh Dashboard jika tanggal relevan
    if (appState.date >= startDate) {
        window.renderAttendanceList();
        window.updateDashboard();
    }
};

// 1. SAKIT -> SEMBUH
window.markAsRecovered = function(id) {
    const permit = appState.permits.find(p => p.id === id);
    if(permit) {
        // PERBAIKAN: Dialog yang lebih jelas & Logika Default yang Aman
        // Default (OK) sekarang adalah: Sembuh SEKARANG (Sesi ini tetap dihitung sakit, baru sehat sesi depan)
        // Ini mencegah status Shubuh berubah jadi Hadir.
        
        const keepSick = confirm(
            "Konfirmasi Kesembuhan:\n\n" +
            "[OK] = Baru Sembuh SEKARANG (Sesi ini tetap tercatat Sakit)\n" +
            "[Cancel] = Sudah sehat SEJAK AWAL sesi ini (Ubah status sesi ini jadi Hadir)"
        );
        
        permit.end_date = appState.date; 
        
        // Logika Index Sesi
        const slots = ['shubuh', 'ashar', 'maghrib', 'isya']; // Pastikan urutan ini sesuai dengan SESSION_ORDER
        const currIdx = slots.indexOf(appState.currentSlotId);

        if (keepSick) {
            // Pilihan OK (Default): Sembuh NANTI/SEKARANG.
            // Sesi saat ini (Shubuh) masih dianggap Sakit.
            // End Session = Sesi Saat Ini.
            permit.end_session = appState.currentSlotId;
        } else {
            // Pilihan Cancel: Sembuh DARI TADI.
            // Sesi saat ini dianggap sudah sehat (Hadir).
            // End Session = Sesi Sebelumnya.
            if (currIdx === 0) permit.end_session = 'kemarin'; 
            else permit.end_session = slots[currIdx - 1];
        }

        // Simpan
        localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
        window.showToast("Status kesembuhan diperbarui", "success");
        
        // Refresh UI
        window.renderAttendanceList(); 
        window.renderActivePermitsWidget();
        window.renderPermitHistory(); // Refresh profil juga
    }
};

// 2. IZIN/PULANG -> KEMBALI LEBIH AWAL
window.markAsReturned = function(id) {
    const permit = appState.permits.find(p => p.id === id);
    if(permit) {
        // Kalau pulang tepat waktu, kita set is_active false
        // Agar sesi hari ini bisa diisi Hadir manual oleh Musyrif
        permit.is_active = false; 
        
        localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
        window.showToast("Santri sudah kembali. Silakan presensi manual.", "success");
        window.renderPermitList();
        window.renderAttendanceList();
    }
};

// 3. PERPANJANG IZIN (P -> I atau I -> I)
// 2. PULANG -> PERPANJANG (Poin 5: Pulang -> Izin)
window.extendPermit = function(id) {
    const permit = appState.permits.find(p => p.id === id);
    if(!permit) return;

    const newDate = prompt("Perpanjang sampai tanggal berapa? (YYYY-MM-DD)", permit.end_date);
    if(!newDate) return;

    permit.end_date = newDate;
    
    // Poin 5: "mengabari jadi I Izin"
    // Jika asalnya Pulang, kita ubah jadi Izin karena sudah lewat jatah pulang.
    if(permit.category === 'pulang') {
        permit.category = 'izin'; 
        permit.status_label = 'I';
        permit.reason += " (Diperpanjang/Telat)";
        window.showToast("Status diubah ke Izin (Diperpanjang)", "info");
    } else {
        window.showToast("Masa izin diperpanjang", "success");
    }

    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    window.renderPermitList();
    window.renderAttendanceList();
};

window.toggleSelectAllPermit = function() {
    const btn = document.getElementById('btn-select-all-permit');
    const checkboxes = document.querySelectorAll('input[name="permit_santri_select"]');
    
    isAllSelected = !isAllSelected;
    
    let actuallySelected = 0;
    checkboxes.forEach(cb => {
        // Only toggle visible checkboxes
        if(cb.offsetParent !== null) {
            cb.checked = isAllSelected;
            if(isAllSelected) actuallySelected++;
        }
    });
    
    // Update button text based on actual state
    if(btn) {
        if(isAllSelected) {
            btn.innerHTML = '<i data-lucide="x-circle" class="w-4 h-4 mr-1"></i> Batal Pilih';
        } else {
            btn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 mr-1"></i> Pilih Semua';
        }
        window.refreshIcons();
    }
    
    window.updatePermitCount();
};

// Tambahkan fungsi ini di script.js Anda
window.goToToday = function() {
    const today = new Date();
    // Format YYYY-MM-DD sesuai zona waktu lokal (PENTING untuk input date)
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = new Date(today.getTime() - offset).toISOString().split('T')[0];
    
    // Panggil fungsi handleDateChange yang sudah ada di kode Anda
    handleDateChange(localISOTime);
};

// Tambahkan ini di script.js
window.quickOpen = function(slotId) {
    // 1. Set slot yang dipilih ke state global
    appState.currentSlotId = slotId;
    
    // 2. Update tampilan dashboard (opsional, agar chart/judul berubah)
    window.updateDashboard(); 
    
    // 3. Langsung buka halaman absensi
    window.openAttendance();
    
    // 4. Beri feedback visual
    const labels = { shubuh: 'Shubuh', ashar: 'Ashar', maghrib: 'Maghrib', isya: 'Isya' };
    window.showToast(`Membuka presensi ${labels[slotId]}`, 'info');
};

window.showStatDetails = function(statusType) {
    const modal = document.getElementById('modal-stat-detail');
    const container = document.getElementById('stat-detail-list');
    const title = document.getElementById('stat-detail-title');
    
    // 1. Setup UI Modal
    modal.classList.remove('hidden');
    container.innerHTML = '<div class="text-center py-4"><span class="loading-spinner"></span></div>';
    
    // Warna Judul sesuai Tipe
    let colorClass = 'text-slate-800';
    if(statusType === 'Sakit') colorClass = 'text-amber-500';
    else if(statusType === 'Izin') colorClass = 'text-blue-500';
    else if(statusType === 'Alpa') colorClass = 'text-rose-500';
    else if(statusType === 'Hadir') colorClass = 'text-emerald-500';
    // Tambahkan Handling Telat & Pulang (Jaga-jaga)
    else if(statusType === 'Telat') colorClass = 'text-teal-500';
    else if(statusType === 'Pulang') colorClass = 'text-purple-500';
    
    title.textContent = `Daftar ${statusType}`;
    title.className = `text-xl font-black ${colorClass}`;

    // 2. Ambil Data Real
    const dateKey = appState.date;
    const slotId = appState.currentSlotId; // Data berdasarkan slot aktif dashboard
    const slotData = appState.attendanceData[dateKey]?.[slotId] || {};
    
    // Filter Santri
    const list = FILTERED_SANTRI.filter(s => {
        const id = String(s.nis || s.id);
        const data = slotData[id];
        
        // Cek status Shalat (Utama)
        const currentStatus = data?.status?.shalat;
        
        // Logic Matching
        if(statusType === 'Hadir') return currentStatus === 'Hadir';
        if(statusType === 'Sakit') return currentStatus === 'Sakit';
        if(statusType === 'Izin') return currentStatus === 'Izin' || currentStatus === 'Pulang'; // Pulang masuk ke list Izin/Detail
        if(statusType === 'Alpa') return currentStatus === 'Alpa';
        
        return false;
    });

    container.innerHTML = '';

    // 3. Render List
    if(list.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-slate-400">
                <i data-lucide="user-x" class="w-12 h-12 mb-3 opacity-50"></i>
                <p class="text-xs font-bold">Tidak ada santri ${statusType}</p>
            </div>
        `;
    } else {
        list.forEach(s => {
            const id = String(s.nis || s.id);
            const note = slotData[id]?.note || '-';
            
            // Generate HTML Item
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700';
            div.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center font-black text-xs text-slate-600 border border-slate-200 shadow-sm">
                    ${s.nama.substring(0,2).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 dark:text-white text-sm truncate">${s.nama}</h4>
                    <p class="text-[10px] text-slate-500 truncate">${s.asrama || s.kelas}</p>
                </div>
                ${note !== '-' && note !== '' ? `
                <div class="max-w-[40%] text-right">
                    <span class="inline-block px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 text-[9px] text-slate-500 leading-tight">
                        ${note}
                    </span>
                </div>` : ''}
            `;
            container.appendChild(div);
        });
    }
    
    if(window.lucide) window.lucide.createIcons();
};

window.renderDashboardPembinaan = function() {
    const container = document.getElementById('dashboard-pembinaan-list');
    const badge = document.getElementById('pembinaan-count-badge');
    const cardTitle = document.querySelector('#dashboard-pembinaan-card h3');
    
    // Ubah Judul Widget agar mencakup semua (yang sudah & belum dibina)
    if(cardTitle) cardTitle.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4 text-red-500 mr-2 inline"></i>Pelanggaran Hari Ini`;

    if(!container) return;

    const dateKey = appState.date;
    const dayData = appState.attendanceData[dateKey];
    
    let violationList = [];
    let pendingCount = 0;
    
    if (dayData) {
        FILTERED_SANTRI.forEach(s => {
            const id = String(s.nis || s.id);
            
            Object.values(SLOT_WAKTU).forEach(slot => {
                const sData = dayData[slot.id]?.[id];
                const st = sData?.status?.shalat;
                
                // Syarat: Status ALPA (Tidak peduli sudah dibina atau belum)
                if (st === 'Alpa') {
                    const isCoached = sData.coaching && sData.coaching.done;
                    
                    // Hitung yang belum dibina untuk badge notifikasi
                    if(!isCoached) pendingCount++;

                    violationList.push({
                        ...s,
                        slotLabel: slot.label,
                        slotId: slot.id,
                        date: dateKey,
                        isCoached: isCoached,
                        coachingInfo: sData.coaching // Bawa info jika perlu ditampilkan
                    });
                }
            });
        });
    }

    // Update Badge (Merah jika ada pending, Hijau jika semua beres)
    if(badge) {
        if (pendingCount > 0) {
            badge.textContent = `${pendingCount} Perlu Dibina`;
            badge.className = "px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold shadow-sm animate-pulse";
        } else if (violationList.length > 0) {
            badge.textContent = `Tuntas (${violationList.length})`;
            badge.className = "px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 text-[10px] font-bold border border-emerald-200";
        } else {
            badge.textContent = "0 Pelanggaran";
            badge.className = "px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold";
        }
    }

    // Render UI
    container.innerHTML = '';
    
    if (violationList.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="inline-flex p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 mb-2 border border-emerald-100 dark:border-emerald-800">
                    <i data-lucide="shield-check" class="w-6 h-6"></i>
                </div>
                <p class="text-[10px] font-bold text-slate-400">Nihil pelanggaran hari ini</p>
            </div>`;
    } else {
        // SORTING: Yang BELUM DIBINA taruh paling atas
        violationList.sort((a, b) => (a.isCoached === b.isCoached) ? 0 : a.isCoached ? 1 : -1);

        violationList.forEach(p => {
            const div = document.createElement('div');
            
            // Visual Distinction: Jika sudah dibina, buat agak transparan/abu
            const bgClass = p.isCoached 
                ? "bg-slate-50 dark:bg-slate-900 opacity-75 grayscale-[0.5] border-slate-100" 
                : "bg-white dark:bg-slate-800 border-red-100 dark:border-red-900/30 shadow-sm";
            
            div.className = `flex items-center justify-between p-3 rounded-xl border mb-2 transition-all ${bgClass}`;
            
            let actionHtml = '';

            if (p.isCoached) {
                // TAMPILAN SUDAH DIBINA (Tetap Muncul)
                actionHtml = `
                    <div class="text-right">
                         <span class="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-bold border border-slate-200 dark:border-slate-600 flex items-center gap-1 cursor-default">
                            <i data-lucide="check-check" class="w-3 h-3 text-emerald-500"></i> Sudah Dibina
                        </span>
                    </div>
                `;
            } else {
                // TAMPILAN BELUM DIBINA (Tombol Action Hijau)
                const dataStr = JSON.stringify({
                    id: p.nis || p.id,
                    nama: p.nama,
                    slotId: p.slotId,
                    date: p.date,
                    slotLabel: p.slotLabel
                }).replace(/"/g, "&quot;");

                actionHtml = `
                    <button onclick="window.openPembinaanModal(${dataStr})" class="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1">
                        <i data-lucide="heart-handshake" class="w-3 h-3"></i> Bina
                    </button>
                `;
            }

            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-500 border border-slate-200">
                        ${p.nama.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">${p.nama}</h4>
                        <p class="text-[10px] text-red-500 font-medium flex items-center gap-1">
                            <i data-lucide="x" class="w-3 h-3"></i>
                            Alpa ${p.slotLabel}
                        </p>
                    </div>
                </div>
                ${actionHtml}
            `;
            container.appendChild(div);
        });
    }
    
    const card = document.getElementById('dashboard-pembinaan-card');
    if(card) card.classList.remove('hidden');
    
    if(window.lucide) window.lucide.createIcons();
};

window.renderPembinaanManagement = function() {
    const container = document.getElementById('pembinaan-full-list');
    if(!container) return;

    // 1. Akumulasi Data Pelanggaran (HANYA YANG SUDAH DIBINA)
    let problemList = [];
    let counts = { l1: 0, l2: 0, l3: 0 }; 

    if (!appState.attendanceData) appState.attendanceData = {};

    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        
        let dates = [];
        Object.keys(appState.attendanceData).forEach(date => {
            const dayData = appState.attendanceData[date];
            if (!dayData) return;

            let slots = [];
            
            Object.values(SLOT_WAKTU).forEach(slot => {
                const sData = dayData[slot.id]?.[id];
                const st = sData?.status?.shalat;
                
                // --- LOGIKA POIN BARU ---
                // Hanya hitung poin JIKA Alpa DAN sudah ada data coaching (done: true)
                if (st === 'Alpa' && sData.coaching && sData.coaching.done) {
                    slots.push({
                        label: slot.label,
                        id: slot.id,
                        action: sData.coaching.action // Simpan info tindakan utk ditampilkan
                    });
                }
            });

            if (slots.length > 0) {
                dates.push({ date: date, slots: slots });
            }
        });

        dates.sort((a,b) => b.date.localeCompare(a.date));

        // Hitung Total Poin (Total Slot yang sudah dibina)
        const totalAlpa = dates.reduce((acc, curr) => acc + curr.slots.length, 0);

        if (totalAlpa > 0) {
            const status = window.getPembinaanStatus(totalAlpa); 
            problemList.push({ ...s, totalAlpa, status, dates });

            if (status.level === 1) counts.l1++;
            else if (status.level <= 3) counts.l2++;
            else counts.l3++;
        }
    });

    // Update Statistik Header
    const elC1 = document.getElementById('count-level-1');
    const elC2 = document.getElementById('count-level-2');
    const elC3 = document.getElementById('count-level-3');
    if(elC1) elC1.textContent = counts.l1;
    if(elC2) elC2.textContent = counts.l2;
    if(elC3) elC3.textContent = counts.l3;

    // 2. Render List
    container.innerHTML = '';
    if (problemList.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                <div class="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="shield-check" class="w-8 h-8 text-emerald-500"></i>
                </div>
                <p class="text-sm font-bold text-slate-600">Nihil Poin Pelanggaran</p>
                <p class="text-xs text-slate-400 text-center max-w-[200px]">
                    Santri tertib atau pelanggaran belum dibina oleh Musyrif.
                </p>
            </div>`;
        if(window.lucide) window.lucide.createIcons();
        return;
    }

    problemList.sort((a, b) => b.totalAlpa - a.totalAlpa);

    problemList.forEach(p => {
        const percentage = Math.min((p.totalAlpa / 40) * 100, 100);
        const detailId = `detail-${p.nis || p.id}`;
        
        let detailHtml = '';
        p.dates.forEach(d => {
            const dateDisplay = window.formatDate(d.date);
            
            // Render slot dengan info pembinaan
            const slotHtml = d.slots.map(s => `
                <div class="mt-1 flex items-start gap-2">
                    <span class="px-1.5 py-0.5 bg-red-50 text-red-600 text-[9px] font-bold rounded border border-red-100 uppercase shrink-0">${s.label}</span>
                    <span class="text-[10px] text-slate-500 italic">" ${s.action} "</span>
                </div>
            `).join('');

            detailHtml += `
                <div class="py-3 px-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div class="flex items-center gap-2 mb-1">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-500"></i>
                        <span class="text-xs font-bold text-slate-700">${dateDisplay}</span>
                    </div>
                    <div class="ml-5">
                        ${slotHtml}
                    </div>
                </div>
            `;
        });

        const div = document.createElement('div');
        div.className = 'mb-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300';
        div.innerHTML = `
            <div onclick="document.getElementById('${detailId}').classList.toggle('hidden')" class="p-5 cursor-pointer relative overflow-hidden group">
                <div class="relative flex justify-between items-start mb-3">
                    <div class="flex gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-black text-slate-500 dark:text-slate-300 shadow-inner">
                            ${p.nama.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800 dark:text-white text-base">${p.nama}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${p.status.color}">
                                    ${p.status.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-3xl font-black text-slate-700 dark:text-white">${p.totalAlpa}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase block -mt-1 tracking-wider">Poin</span>
                    </div>
                </div>
                
                <div class="relative w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 via-orange-400 to-red-500" style="width: ${percentage}%"></div>
                </div>
                
                <div class="flex justify-between items-center">
                    <p class="text-[10px] text-slate-400">Total Pelanggaran Tervalidasi</p>
                    <button class="text-[10px] font-bold text-slate-400 group-hover:text-emerald-500 flex items-center gap-1 transition-colors">
                        Riwayat Pembinaan <i data-lucide="chevron-down" class="w-3 h-3"></i>
                    </button>
                </div>
            </div>
            
            <div id="${detailId}" class="hidden bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 animate-slideDown">
                ${detailHtml}
            </div>
        `;
        container.appendChild(div);
    });
    
    if(window.lucide) window.lucide.createIcons();
};

// --- FUNGSI BARU UNTUK HAPUS PELANGGARAN LANGSUNG ---
window.deleteViolationRecord = function(studentId, dateKey) {
    if(!confirm(`Hapus status ALPA untuk santri ini pada tanggal ${window.formatDate(dateKey)}?\n\nStatus akan diubah menjadi 'Hadir'.`)) return;

    const dayData = appState.attendanceData[dateKey];
    if(!dayData) return;

    let changed = false;

    // Loop semua slot di hari itu, jika Alpa ubah jadi Hadir
    Object.values(SLOT_WAKTU).forEach(slot => {
        const studentSlot = dayData[slot.id]?.[studentId];
        if(studentSlot && studentSlot.status?.shalat === 'Alpa') {
            studentSlot.status.shalat = 'Hadir'; // Ubah jadi Hadir
            
            // Reset juga status dependent jika ada
            slot.activities.forEach(act => {
                if(act.category === 'dependent') studentSlot.status[act.id] = 'Ya';
                else if(act.category === 'kbm') studentSlot.status[act.id] = 'Hadir';
            });
            
            changed = true;
        }
    });

    if(changed) {
        window.saveData(); // Simpan ke LocalStorage/Cloud
        window.renderPembinaanManagement(); // Refresh halaman manajemen ini
        window.showToast("Pelanggaran dihapus (Status diubah jadi Hadir)", "success");
        
        // Jika sedang membuka tanggal yang sama di dashboard, refresh juga
        if(appState.date === dateKey) {
            window.updateDashboard();
        }
    } else {
        window.showToast("Data tidak ditemukan / sudah berubah", "error");
    }
};

// Fungsi Helper Baru: Loncat ke tanggal tertentu dan buka tab presensi
window.jumpToDate = function(dateStr) {
    if(confirm(`Buka data presensi tanggal ${window.formatDate(dateStr)} untuk mengedit/menghapus pelanggaran?`)) {
        appState.date = dateStr;
        window.updateDateDisplay();
        window.updateDashboard(); // Refresh dashboard data sesuai tanggal baru
        
        // Pindah ke tab Home dan scroll ke atas
        window.switchTab('home'); 
        window.scrollTo(0,0);
        
        // Opsional: Langsung buka slot pertama yg ada alpa?
        // window.openAttendance(); 
        
        window.showToast(`Mode Edit: ${window.formatDate(dateStr)}`, 'info');
    }
};

// Helper untuk Scroll ke section ini dari Dashboard
window.scrollToPembinaan = function() {
    setTimeout(() => {
        const el = document.getElementById('pembinaan-section');
        if(el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
};

window.renderKBMBanner = function() {
    const banner = document.getElementById('kbm-active-banner');
    const titleEl = document.getElementById('kbm-banner-title');
    
    if(!banner) return;

    // 1. Ambil Data Slot & Waktu Saat Ini
    const currentSlotId = appState.currentSlotId;
    const slotData = SLOT_WAKTU[currentSlotId];
    
    // Cek hari ini hari apa (0=Ahad, 1=Senin, ...)
    // Gunakan tanggal dari appState jika ingin sinkron dengan tanggal yang dipilih, 
    // atau new Date() jika ingin strict realtime. Disini kita pakai appState agar konsisten.
    const currentDay = new Date(appState.date).getDay();

    // 2. Cari Kegiatan KBM yang Aktif Hari Ini di Slot Ini
    // Syarat: category == 'kbm' DAN (showOnDays tidak ada ATAU hari ini termasuk)
    const activeKBM = slotData.activities.find(act => 
        act.category === 'kbm' && 
        (!act.showOnDays || act.showOnDays.includes(currentDay))
    );

    // 3. Tampilkan atau Sembunyikan Banner
    if (activeKBM) {
        // Ada KBM! Tampilkan Banner
        titleEl.textContent = activeKBM.label; // Misal: "Tahfizh" atau "Conversation"
        
        // Ganti Icon (Opsional: Jika ada icon khusus per kegiatan)
        // Default kita pakai book-open di HTML
        
        banner.classList.remove('hidden');
    } else {
        // Tidak ada KBM saat ini
        banner.classList.add('hidden');
    }
    
    if(window.lucide) window.lucide.createIcons();
};

window.renderActivePermitsWidget = function() {
    const container = document.getElementById('dashboard-active-permits-list');
    const badgeCount = document.getElementById('active-permit-count');
    
    if (!container) return; 
    container.innerHTML = '';
    
    const combinedList = [];
    const processedNis = new Set(); // Hanya mencatat NIS yang AKTIF sakitnya
    const currentDate = appState.date; 

    // 1. DATA PERMIT (SURAT)
    const classNisList = FILTERED_SANTRI.map(s => String(s.nis || s.id));
    
    // Filter permit yang relevan (Aktif ATAU selesai hari ini)
    const relevantPermits = appState.permits.filter(p => {
        if (!classNisList.includes(p.nis)) return false;
        if (p.start_date > currentDate) return false; // Masa depan skip
        
        // Tampilkan jika belum ada end_date (aktif selamanya) 
        // ATAU range tanggal mencakup hari ini
        if (!p.end_date) return true;
        if (currentDate >= p.start_date && currentDate <= p.end_date) return true;
        return false;
    });

    relevantPermits.forEach(p => {
        let visualActive = p.is_active;
        const catSafe = (p.category || '').toLowerCase();

        // Logika Visual Selesai (Abu-abu)
        if (catSafe === 'sakit' && p.end_date) {
             // Jika hari ini > tanggal sembuh -> nonaktif
             if (currentDate > p.end_date) visualActive = false;
             // Jika hari ini == tanggal sembuh, cek sesi
             else if (currentDate === p.end_date && p.end_session) {
                  // Jika sesi sekarang > sesi akhir sakit -> nonaktif
                  if (SESSION_ORDER[appState.currentSlotId] > SESSION_ORDER[p.end_session]) {
                      visualActive = false;
                  }
             }
        }
        // Logika Izin/Pulang Selesai
        else if ((catSafe === 'izin' || catSafe === 'pulang') && p.end_date && currentDate > p.end_date) {
             visualActive = false;
        }
        else if (!p.is_active) {
            visualActive = false; // Jika database bilang false, maka false
        }

        // Filter tambahan: Pastikan Permit juga hanya S/I/P (jaga-jaga jika ada kategori lain)
        if (['sakit', 'izin', 'pulang'].includes(catSafe)) {
            combinedList.push({
                type: 'permit',
                id: p.id,
                nis: p.nis,
                category: p.category,
                startTime: p.start_date,
                endTime: p.end_date,
                isActive: visualActive, 
                reason: p.reason
            });

            // PENTING: Hanya block Manual Check jika permit ini MASIH AKTIF.
            if (visualActive) {
                processedNis.add(p.nis);
            }
        }
    });

    // 2. DATA MANUAL (PRESENSI HARIAN)
    const dayData = appState.attendanceData[currentDate];

    if (dayData) {
        FILTERED_SANTRI.forEach(s => {
            const id = String(s.nis || s.id);
            // Skip jika sudah tercover permit AKTIF
            if (processedNis.has(id)) return; 

            let foundStatus = null;
            // Cek status dari Isya mundur ke Shubuh (prioritas status terakhir)
            const slots = ['isya', 'maghrib', 'ashar', 'shubuh'];
            for (const slot of slots) {
                const st = dayData[slot]?.[id]?.status?.shalat;
                
                // [PERBAIKAN DISINI] Hapus 'Alpa' dari daftar pencarian
                if (st && ['Sakit', 'Izin', 'Pulang'].includes(st)) {
                    foundStatus = st;
                    break;
                }
            }

            if (foundStatus) {
                let category = foundStatus.toLowerCase(); 
                
                combinedList.push({
                    type: 'manual', // Penanda ini data manual
                    id: null,
                    nis: id,
                    category: category,
                    startTime: currentDate,
                    endTime: null,
                    isActive: true, // Manual yang tampil pasti Aktif
                    reason: 'Presensi Manual'
                });
            }
        });
    }

    // Update Badge & Sorting
    if (badgeCount) badgeCount.textContent = combinedList.filter(i => i.isActive).length;
    combinedList.sort((a, b) => (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1);

    // Render HTML
    if (combinedList.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-400 text-[10px] font-bold">Semua santri lengkap / Hadir</div>`;
        return;
    }

    combinedList.forEach(item => {
        const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === item.nis);
        if (!santri) return;

        let colorClass, iconName;
        const cat = item.category.toLowerCase();

        if (cat === 'sakit') { colorClass = 'bg-amber-100 text-amber-600 border-amber-200'; iconName = 'thermometer'; } 
        else if (cat === 'izin') { colorClass = 'bg-blue-100 text-blue-600 border-blue-200'; iconName = 'file-text'; } 
        else if (cat === 'pulang') { colorClass = 'bg-purple-100 text-purple-600 border-purple-200'; iconName = 'bus'; } 
        else { colorClass = 'bg-slate-100 text-slate-600 border-slate-200'; iconName = 'help-circle'; }

        let btnHTML = '';
        if (item.isActive) {
            let label = "Sembuh";
            let action = "";
            
            // Logic Action
            if (item.type === 'manual') {
                // Jika manual, tombolnya "Hadirkan"
                action = `window.resolveManualStatus('${item.nis}', '${cat.charAt(0).toUpperCase() + cat.slice(1)}')`;
                label = "Hadirkan";
            } else {
                // Jika permit
                if (cat === 'sakit') { action = `window.markAsRecovered('${item.id}')`; }
                else { label = "Kembali"; action = `window.markAsReturned('${item.id}')`; }
            }

            btnHTML = `
                <button onclick="${action}" class="ml-2 px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 shadow-md flex items-center gap-1">
                    <i data-lucide="check" class="w-3 h-3"></i> ${label}
                </button>`;
        } else {
            btnHTML = `
                <button disabled class="ml-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold cursor-not-allowed flex items-center gap-1">
                    <i data-lucide="check-check" class="w-3 h-3"></i> Selesai
                </button>`;
        }

        const div = document.createElement('div');
        div.className = `flex items-center justify-between p-3 rounded-2xl border transition-all mb-2 ${item.isActive ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-50 dark:bg-slate-900 opacity-60 grayscale'}`;
        div.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0 border shadow-sm"><i data-lucide="${iconName}" class="w-4 h-4"></i></div>
                <div class="min-w-0">
                    <h4 class="text-xs font-bold text-slate-800 dark:text-white truncate">${santri.nama}</h4>
                    <div class="flex items-center gap-1.5 mt-1">
                        <span class="text-[9px] font-black uppercase ${colorClass.split(' ')[1]}">${item.category}</span>
                        <span class="text-[9px] text-slate-400">• ${item.type === 'manual' ? 'Manual' : window.formatDate(item.startTime)}</span>
                    </div>
                </div>
            </div>
            ${btnHTML}
        `;
        container.appendChild(div);
    });
    if (window.lucide) window.lucide.createIcons();
};

window.resolveManualStatus = function(nis, statusType) {
    const dateKey = appState.date;
    const dayData = appState.attendanceData[dateKey];
    
    if (!dayData) return;

    let changed = false;

    // Cari di semua slot hari ini yang statusnya sesuai
    Object.keys(dayData).forEach(slotId => {
        const studentData = dayData[slotId][nis];
        if (studentData && studentData.status && studentData.status.shalat === statusType) {
            
            // Ubah Status ke Hadir
            studentData.status.shalat = 'Hadir';

            // Reset Kegiatan Lain
            const slotConfig = SLOT_WAKTU[slotId];
            if(slotConfig && slotConfig.activities) {
                slotConfig.activities.forEach(act => {
                    if(act.category === 'dependent') studentData.status[act.id] = 'Ya';
                    else if(act.category === 'kbm' || act.category === 'fardu') studentData.status[act.id] = 'Hadir';
                });
            }
            
            // PENTING: Hapus Catatan [Auto] agar renderAttendanceList tidak meresetnya
            if (studentData.note) {
                // Hapus string [Auto] ... sampai akhir baris, atau kosongkan note jika hanya berisi auto
                studentData.note = studentData.note.replace(/\[Auto\].*$/g, '').trim();
            }
            changed = true;
        }
    });

    if (changed) {
        window.saveData();
        window.renderActivePermitsWidget(); 
        window.renderAttendanceList();
        window.showToast("Status berhasil diubah menjadi Hadir", "success");
    } else {
        window.showToast("Tidak ada data yang perlu diubah", "info");
    }
};

// ==========================================
// MANAJEMEN RIWAYAT PERIZINAN (PROFIL)
// ==========================================

window.renderPermitHistory = function() {
    const container = document.getElementById('permit-history-list');
    if (!container) return;
    container.innerHTML = '';

    let history = [...appState.permits].map(p => ({...p, source: 'permit'}));
    const classNisList = FILTERED_SANTRI.map(s => String(s.nis || s.id));
    
    // Create Set for fast permit lookup
    const permitLookup = new Set();
    appState.permits.forEach(p => {
        if(p.start_date && p.end_date) {
            // Create keys for all dates in range
            const start = new Date(p.start_date);
            const end = new Date(p.end_date);
            for(let d = start; d <= end; d.setDate(d.getDate() + 1)) {
                const key = `${p.nis}_${window.getLocalDateStr(d)}_${p.category}`;
                permitLookup.add(key);
            }
        }
    });
    
    // Scan manual entries
    Object.keys(appState.attendanceData).forEach(date => {
        const daySlots = appState.attendanceData[date];
        
        classNisList.forEach(nis => {
            let foundSt = null;
            ['isya', 'maghrib', 'ashar', 'shubuh'].forEach(slot => {
                const st = daySlots[slot]?.[nis]?.status?.shalat;
                if(st && ['Sakit','Izin','Pulang'].includes(st)) foundSt = st;
            });

            // Check if NOT covered by permit
            const key = `${nis}_${date}_${foundSt?.toLowerCase()}`;
            const coveredByPermit = permitLookup.has(key);

            if (foundSt && !coveredByPermit) {
                history.push({
                    id: `manual_${date}_${nis}`,
                    nis: nis,
                    category: foundSt.toLowerCase(),
                    reason: "Input Manual (Tanpa Surat)",
                    start_date: date,
                    end_date: date,
                    is_active: false,
                    source: 'manual',
                    timestamp: date
                });
            }
        });
    });

    history.sort((a, b) => new Date(b.timestamp || b.start_date) - new Date(a.timestamp || a.start_date));
    history = history.filter(p => classNisList.includes(String(p.nis)));

    if (history.length === 0) {
        container.innerHTML = `<div class="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl"><i data-lucide="folder-open" class="w-12 h-12 mx-auto mb-3 text-slate-300"></i><p class="text-xs font-bold text-slate-400">Belum ada riwayat perizinan</p></div>`;
        window.refreshIcons();
        return;
    }

    history.forEach(p => {
        const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === String(p.nis));
        if(!santri) return;

        let colorTheme = 'bg-slate-100 text-slate-500';
        let iconName = 'file-text';
        let borderClass = 'border-slate-200';

        if (p.category === 'sakit') { 
            colorTheme = 'bg-amber-100 text-amber-600'; 
            borderClass = 'border-amber-200';
            iconName = 'thermometer'; 
        }
        else if (p.category === 'izin') { 
            colorTheme = 'bg-blue-100 text-blue-600'; 
            borderClass = 'border-blue-200';
            iconName = 'calendar'; 
        }
        else if (p.category === 'pulang') { 
            colorTheme = 'bg-purple-100 text-purple-600'; 
            borderClass = 'border-purple-200';
            iconName = 'bus'; 
        }

        let badge = '';
        
        if (p.source === 'manual') {
            badge = `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black border border-slate-200 uppercase tracking-wider">MANUAL</span>`;
        } else {
            let isActive = p.is_active;
            const catSafe = (p.category || '').toLowerCase();
            
            if (catSafe === 'sakit' && p.end_date) isActive = false;
            if ((catSafe === 'izin' || catSafe === 'pulang') && p.end_date && p.end_date < window.getLocalDateStr()) isActive = false;

            if (isActive) {
                badge = `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-200 uppercase tracking-wider shadow-sm">AKTIF</span>`;
            } else {
                badge = `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black border border-slate-200 uppercase tracking-wider">SELESAI</span>`;
            }
        }

        let actionButtons = '';
        if (p.source === 'permit') {
            actionButtons = `
                <div class="flex flex-col gap-2 ml-2 pl-2 border-l border-slate-100 dark:border-slate-700">
                    <button onclick="window.openEditHistory('${p.id}')" class="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100" title="Edit Data" aria-label="Edit izin ${window.sanitizeHTML(santri.nama)}">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.deleteHistoryPermit('${p.id}')" class="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100" title="Hapus Permanen" aria-label="Hapus izin ${window.sanitizeHTML(santri.nama)}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
        } else {
            actionButtons = `
                 <div class="flex flex-col gap-2 ml-2 pl-2 border-l border-slate-100 dark:border-slate-700 opacity-50">
                    <button disabled class="p-2 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed" aria-label="Manual entry tidak bisa diedit">
                        <i data-lucide="lock" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
        }

        const dateDisplay = p.end_date && p.end_date !== p.start_date
            ? `${window.formatDate(p.start_date)} — ${window.formatDate(p.end_date)}`
            : window.formatDate(p.start_date);

        const div = document.createElement('div');
        div.className = `p-4 rounded-2xl bg-white dark:bg-slate-800 border ${borderClass} mb-3 shadow-sm hover:shadow-md transition-all relative group`;
        
        div.innerHTML = `
            <div class="flex justify-between items-stretch">
                <div class="flex gap-3 flex-1">
                    <div class="w-10 h-10 rounded-xl ${colorTheme} flex items-center justify-center border border-white/20 shadow-sm flex-shrink-0">
                        <i data-lucide="${iconName}" class="w-5 h-5"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h4 class="font-bold text-slate-800 dark:text-white text-sm truncate">${window.sanitizeHTML(santri.nama)}</h4>
                            ${badge}
                        </div>
                        <p class="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                            <i data-lucide="clock" class="w-3 h-3"></i> ${dateDisplay}
                        </p>
                        <p class="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg inline-block border border-slate-100 dark:border-slate-700 max-w-full truncate">
                            "${window.sanitizeHTML(p.reason || '-')}"
                        </p>
                    </div>
                </div>
                ${actionButtons}
            </div>
        `;
        container.appendChild(div);
    });
    
    window.refreshIcons();
};

// 1. Fungsi Hapus (Khusus History)
window.deleteHistoryPermit = function(id) {
    if(!confirm("⚠️ PERINGATAN HAPUS\n\nApakah Anda yakin ingin menghapus data izin ini secara permanen? Data yang dihapus tidak bisa dikembalikan.")) return;

    // Filter array untuk membuang ID yang cocok
    appState.permits = appState.permits.filter(p => p.id !== id);
    
    // Simpan perubahan ke LocalStorage
    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));

    // Refresh UI
    window.renderPermitHistory(); // Refresh list profil
    window.renderActivePermitsWidget(); // Refresh widget dashboard (jika yang dihapus hari ini)
    window.renderAttendanceList(); // Refresh list absen (mungkin statusnya berubah jadi Hadir)
    
    window.showToast("Data izin berhasil dihapus", "success");
};

// 2. Fungsi Toggle Status (Aktif <-> Selesai)
window.togglePermitStatus = function(id) {
    const permit = appState.permits.find(p => p.id === id);
    if(!permit) return;

    permit.is_active = !permit.is_active;
    
    // Jika diaktifkan kembali, pastikan end_date dihapus jika itu permit Sakit (agar logic sembuh tidak bentrok)
    // Atau biarkan apa adanya jika itu izin berjangka.
    // Kita reset end_date hanya jika user mengaktifkan kembali permit Sakit yg sudah sembuh.
    if (permit.is_active && permit.category === 'sakit' && permit.end_date) {
        if(confirm("Hapus tanggal kesembuhan agar santri kembali berstatus Sakit?")) {
            permit.end_date = null;
        }
    }

    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    window.renderPermitHistory();
    window.renderActivePermitsWidget();
    window.renderAttendanceList();
    window.showToast(`Status izin: ${permit.is_active ? 'AKTIF' : 'SELESAI'}`, "info");
};

// 3. Fungsi Edit (Buka Modal)
window.openEditHistory = function(id) {
    const permit = appState.permits.find(p => p.id === id);
    if(!permit) return window.showToast("Data tidak ditemukan", "error");

    // Isi Form Modal dengan Data Lama
    document.getElementById('edit-permit-id').value = permit.id;
    document.getElementById('edit-permit-reason').value = permit.reason || '';
    document.getElementById('edit-permit-start').value = permit.start_date || '';
    document.getElementById('edit-permit-end').value = permit.end_date || '';
    document.getElementById('edit-permit-active').checked = permit.is_active;

    // Buka Modal
    const modal = document.getElementById('modal-edit-permit');
    modal.classList.remove('hidden');
};

// 4. Fungsi Simpan Edit
window.savePermitEdit = function() {
    const id = document.getElementById('edit-permit-id').value;
    const reason = document.getElementById('edit-permit-reason').value;
    const start = document.getElementById('edit-permit-start').value;
    const end = document.getElementById('edit-permit-end').value;
    const isActive = document.getElementById('edit-permit-active').checked;

    if(!reason || !start) return window.showToast("Alasan dan Tanggal Mulai wajib diisi", "warning");

    // Cari index data di array
    const index = appState.permits.findIndex(p => p.id === id);
    if(index === -1) return;

    // Update Data
    appState.permits[index].reason = reason;
    appState.permits[index].start_date = start;
    
    // Logic End Date: Jika kosong string, jadikan null (Sakit belum sembuh)
    appState.permits[index].end_date = end ? end : null;
    
    appState.permits[index].is_active = isActive;

    // Simpan ke Storage
    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));

    // Tutup Modal & Refresh
    window.closeModal('modal-edit-permit');
    window.showToast("Perubahan berhasil disimpan", "success");

    // Refresh Semua UI Terkait
    window.renderPermitHistory();
    window.renderActivePermitsWidget();
    window.renderAttendanceList();
};

// Helper: Debounce Save (Mencegah simpan data berlebihan)
window.debounceSave = function() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        window.saveData();
    }, 500); // Tunggu 500ms setelah perubahan terakhir baru simpan
};

// Helper: Sanitize Input (Mencegah XSS)
window.sanitizeInput = function(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

// --- FITUR PEMBINAAN (Baru) ---

window.openPembinaanModal = function(data) {
    const modal = document.getElementById('modal-input-pembinaan');
    if(!modal) return;

    // Isi Data UI
    document.getElementById('bina-nama').textContent = data.nama;
    document.getElementById('bina-avatar').textContent = data.nama.substring(0,2).toUpperCase();
    document.getElementById('bina-detail').textContent = `${data.slotLabel} • ${window.formatDate(data.date)}`;
    
    // Set Default Input
    document.getElementById('bina-date').value = window.getLocalDateStr();
    document.getElementById('bina-action').value = '';
    
    // Simpan target data di hidden input
    document.getElementById('bina-target-data').value = JSON.stringify(data);

    modal.classList.remove('hidden');
};

window.savePembinaan = function() {
    const rawData = document.getElementById('bina-target-data').value;
    if(!rawData) return;

    try {
        const target = JSON.parse(rawData);
        const dateBina = document.getElementById('bina-date').value;
        const actionBina = document.getElementById('bina-action').value;

        if(!dateBina || !actionBina) {
            return window.showToast("Tanggal dan Bentuk Pembinaan wajib diisi!", "warning");
        }

        // Validate date
        if(dateBina > window.getLocalDateStr()) {
            return window.showToast("Tanggal pembinaan tidak boleh di masa depan", "warning");
        }

        const dayData = appState.attendanceData[target.date];
        if(dayData && dayData[target.slotId] && dayData[target.slotId][target.id]) {
            const studentData = dayData[target.slotId][target.id];
            
            studentData.coaching = {
                done: true,
                date: dateBina,
                action: window.sanitizeHTML(actionBina),
                musyrif: appState.userProfile ? appState.userProfile.email : 'Admin',
                timestamp: new Date().toISOString()
            };

            window.saveData();
            
            // Refresh UI safely
            if(typeof window.renderDashboardPembinaan === 'function') {
                window.renderDashboardPembinaan();
            }
            if(typeof window.renderPembinaanManagement === 'function') {
                window.renderPembinaanManagement();
            }
            
            window.showToast("Pembinaan berhasil dicatat. Poin ditambahkan.", "success");
            window.closeModal('modal-input-pembinaan');
        } else {
            window.showToast("Data presensi tidak ditemukan (mungkin terhapus)", "error");
        }
    } catch(e) {
        console.error("Pembinaan save error:", e);
        window.showToast("Gagal menyimpan: " + e.message, "error");
    }
};

window.renderSchoolStatsWidget = function() {
    const stats = window.calculateSlotStats('sekolah');
    
    document.getElementById('sch-stat-h').textContent = stats.h;
    document.getElementById('sch-stat-s').textContent = stats.s;
    document.getElementById('sch-stat-i').textContent = stats.i;
    document.getElementById('sch-stat-a').textContent = stats.a;

    const total = stats.total || 1;
    const pct = Math.round((stats.h / total) * 100);
    
    document.getElementById('school-pct-badge').textContent = `${pct}%`;
    document.getElementById('school-progress-bar').style.width = `${pct}%`;

    // Render List Tidak Hadir
    const listContainer = document.getElementById('school-absent-list');
    if(!listContainer) return;
    listContainer.innerHTML = '';

    const dateKey = appState.date;
    const slotData = appState.attendanceData[dateKey]?.['sekolah'];

    if(slotData) {
        FILTERED_SANTRI.forEach(s => {
            const id = String(s.nis || s.id);
            const st = slotData[id]?.status?.kbm_sekolah;
            if(st && st !== 'Hadir') { // Termasuk Sakit, Izin, Alpa
                let color = 'text-slate-500';
                if(st === 'Sakit') color = 'text-amber-500';
                else if(st === 'Izin') color = 'text-blue-500';
                else if(st === 'Alpa') color = 'text-red-500';
                else if(st === 'Telat') color = 'text-teal-500';
                else if(st === 'Pulang') color = 'text-purple-500'; // <-- TAMBAHKAN INI

                // Tampilkan Telat juga kalau mau dipantau, atau exclude jika dihitung hadir
                const item = document.createElement('div');
                item.className = "flex justify-between items-center px-2 py-1 bg-slate-50 dark:bg-slate-800/50 rounded text-xs";
                item.innerHTML = `<span class="font-bold text-slate-700 dark:text-slate-200">${s.nama}</span> <span class="font-black ${color} text-[10px] uppercase">${st}</span>`;
                listContainer.appendChild(item);
            }
        });
    } else {
        listContainer.innerHTML = '<p class="text-center text-[10px] text-slate-400">Belum ada data sekolah</p>';
    }
};

window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(!modal) return;
    
    const baseZIndex = 1000;
    const zIndex = baseZIndex + (modalStack.length * 10);
    
    modal.style.zIndex = zIndex;
    modal.classList.remove('hidden');
    modalStack.push(modalId);
    
    const escHandler = (e) => {
        if(e.key === 'Escape') {
            window.closeModal(modalId);
        }
    };
    
    document.addEventListener('keydown', escHandler);
    modal._escHandler = escHandler;
    modal.setAttribute('aria-modal', 'true'); // Accessibility
    modal.setAttribute('role', 'dialog'); // Accessibility
};

window.deepClone = function(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch(e) {
        console.error('Deep clone error:', e);
        return obj;
    }
};

// Debounce helper
window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Throttle helper
window.throttle = function(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Safe array access
window.safeArrayAccess = function(arr, index, defaultValue = null) {
    return arr && arr[index] !== undefined ? arr[index] : defaultValue;
};

// Start App
window.onload = window.initApp;
