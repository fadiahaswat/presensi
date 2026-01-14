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
    useGeofencing: true, // Set ke false jika ingin mematikan fitur ini sementara
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
    const offset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
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
            // category: fardu (sholat utama), dependent (ikut sholat), kbm (belajar), sunnah (mandiri)
            { id: 'shalat', label: 'Shubuh', type: 'mandator', category: 'fardu' },
            { id: 'qabliyah', label: 'Qabliyah', type: 'sunnah', category: 'dependent' },
            { id: 'dzikir_pagi', label: 'Dzikir', type: 'sunnah', category: 'dependent' },
            { id: 'tahfizh', label: 'Tahfizh', type: 'mandator', category: 'kbm' },
            { id: 'tahajjud', label: 'Tahajjud', type: 'sunnah', category: 'sunnah' },
            { id: 'conversation', label: 'Conver', type: 'mandator', category: 'kbm', showOnDays: [0] }
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
            { id: 'dhuha', label: 'Dhuha', type: 'sunnah', category: 'sunnah' }, // BARU: Dhuha
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

const STATUS_UI = {
    'Hadir': { class: 'bg-emerald-500 text-white border-emerald-500', label: 'H' },
    'Ya': { class: 'bg-emerald-500 text-white border-emerald-500', label: 'Y' },
    'Sakit': { class: 'bg-amber-100 text-amber-600 border-amber-300', label: 'S' },
    'Izin': { class: 'bg-blue-100 text-blue-600 border-blue-300', label: 'I' },
    'Alpa': { class: 'bg-red-50 text-red-500 border-red-200', label: 'A' },
    'Pulang': { class: 'bg-indigo-100 text-indigo-600 border-indigo-300', label: 'P' },
    'Tidak': { class: 'bg-slate-100 text-slate-300 border-slate-200', label: '-' }
};

// ==========================================
// 1. INIT & STARTUP
// ==========================================

window.initApp = async function() {
    const loadingEl = document.getElementById('view-loading');
    
    // 1. Load Settings & LocalStorage Data (Presensi Harian)
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
        
        // Load Izin
        appState.permits = [];
        const savedPermits = localStorage.getItem(APP_CONFIG.permitKey);
        if(savedPermits) appState.permits = JSON.parse(savedPermits);

        // Load Homecoming
        appState.homecomings = [];
        const savedHomecomings = localStorage.getItem(APP_CONFIG.homecomingKey);
        if(savedHomecomings) appState.homecomings = JSON.parse(savedHomecomings);

    } catch (e) {
        console.error("Storage Error:", e);
    }

    // 2. Determine Logic Waktu Shalat
    appState.currentSlotId = window.determineCurrentSlot();

    // 3. FETCH DATA EXTERNAL (KELAS & SANTRI) DULU!
    try {
        if (!window.loadClassData || !window.loadSantriData) {
            throw new Error("Library data belum termuat.");
        }

        // Tunggu sampai data selesai diambil
        const [kelasData, santriData] = await Promise.all([
            window.loadClassData(),
            window.loadSantriData()
        ]);

        MASTER_KELAS = kelasData || {};
        MASTER_SANTRI = santriData || [];

        window.populateClassDropdown();
        
        // Hilangkan Loading Screen
        if(loadingEl) loadingEl.classList.add('opacity-0', 'pointer-events-none');

        // ============================================================
        // 4. BARU CEK AUTO LOGIN (Setelah Data Tersedia)
        // ============================================================
        const savedAuth = localStorage.getItem(APP_CONFIG.googleAuthKey);
        
        if(savedAuth) {
            try {
                const authData = JSON.parse(savedAuth);
                
                // A. Restore State
                appState.selectedClass = authData.kelas;
                appState.userProfile = authData.profile;
                
                // B. PENTING: ISI ULANG FILTERED_SANTRI!
                FILTERED_SANTRI = MASTER_SANTRI.filter(s => {
                    const sKelas = String(s.kelas || s.rombel || "").trim();
                    return sKelas === appState.selectedClass;
                }).sort((a,b) => a.nama.localeCompare(b.nama));

                if(FILTERED_SANTRI.length === 0) throw new Error("Data kelas kosong");

                // D. Bypass Login & Masuk Dashboard
                document.getElementById('view-login').classList.add('hidden');
                document.getElementById('view-main').classList.remove('hidden');
                
                // E. Update UI Dashboard
                window.updateDashboard(); 
                window.updateProfileInfo();
                
                // F. [BARU] SINKRONISASI DATA DARI CLOUD!
                // Ini kuncinya: Begitu masuk, langsung tarik data terbaru dari Supabase
                window.fetchAttendanceFromSupabase(); 

                setTimeout(() => window.showToast(`Ahlan, ${authData.profile.given_name}`, 'success'), 500);

            } catch(e) {
                console.error("Auto-login error:", e);
                localStorage.removeItem(APP_CONFIG.googleAuthKey);
            }
        }
        // ============================================================
        
    } catch (e) {
        window.showToast("Gagal memuat data: " + e.message, 'error');
        if(loadingEl) loadingEl.classList.add('opacity-0', 'pointer-events-none');
    }

    // 5. Start UI Clocks
    window.startClock();
    window.updateDateDisplay();
    if(window.lucide) window.lucide.createIcons();
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
        dbClient.from('musyrif_profiles').upsert({ // <--- GANTI JADI dbClient
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

    // Hapus sesi
    localStorage.removeItem(APP_CONFIG.googleAuthKey);
    appState.selectedClass = null;
    
    // Reset UI
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('login-pin').value = "";
    document.getElementById('login-kelas').value = "";
    
    // Refresh halaman agar data bersih
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
    window.renderSlotList();
    
    // 4. Update Stats Chart
    window.updateQuickStats();
    window.drawDonutChart();
    if(window.lucide) window.lucide.createIcons();

    window.renderTodayProblems(); // Pindahkan logic render masalah kesini

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
    // Referensi Elemen Header Baru
    const elHeaderName = document.getElementById('header-user-name');
    const elHeaderRole = document.getElementById('profile-role');
    const elHeaderAvatar = document.getElementById('header-avatar');
    
    // Referensi Elemen Tab Profil (Lama)
    const elName = document.getElementById('profile-name');
    const elRole = document.getElementById('profile-role-tab'); // Pastikan ID di tab profile unik jika perlu

    if(appState.selectedClass && MASTER_KELAS[appState.selectedClass]) {
        const musyrifName = MASTER_KELAS[appState.selectedClass].musyrif;
        const className = appState.selectedClass;

        // Update Header Baru
        if(elHeaderName) elHeaderName.textContent = musyrifName.split(' ')[0]; // Ambil nama depan saja
        if(elHeaderRole) elHeaderRole.textContent = className;
        
        // Buat Inisial untuk Avatar (Misal: "Ahmad Fulan" -> "AF")
        if(elHeaderAvatar) {
            const initials = musyrifName
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
            elHeaderAvatar.textContent = initials;
            // Hapus icon user default jika sudah ada inisial
            elHeaderAvatar.innerHTML = initials; 
        }

        // Update Tab Profil (Existing)
        if(elName) elName.textContent = musyrifName;
        // ... kode lama lainnya
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
        const status = slotData[id]?.status?.shalat; // Primary Activity Status
        
        if (status) {
            stats.isFilled = true;
            if (status === 'Hadir') stats.h++;
            else if (status === 'Sakit') stats.s++;
            else if (status === 'Izin') stats.i++;
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
    container.innerHTML = '';
    
    const slot = SLOT_WAKTU[appState.currentSlotId];
    const dateKey = appState.date;
    const currentDay = new Date(appState.date).getDay();

    // 1. Pastikan struktur data slot tersedia
    if(!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if(!appState.attendanceData[dateKey][slot.id]) appState.attendanceData[dateKey][slot.id] = {};
    
    const dbSlot = appState.attendanceData[dateKey][slot.id];
    let hasAutoChanges = false;

    // 2. Filter List Santri (Pencarian & Filter Masalah)
    const search = appState.searchQuery.toLowerCase();
    const list = FILTERED_SANTRI.filter(s => {
        const matchName = s.nama.toLowerCase().includes(search);
        if(appState.filterProblemOnly) {
            const st = dbSlot[String(s.nis || s.id)]?.status?.shalat;
            // Filter masalah: Alpa, Sakit, Izin, atau Pulang
            return matchName && (st === 'Alpa' || st === 'Sakit' || st === 'Izin' || st === 'Pulang');
        }
        return matchName;
    });

    // Update counter jumlah santri
    document.getElementById('att-santri-count').textContent = `${list.length} Santri`;

    const tplRow = document.getElementById('tpl-santri-row');
    const tplBtn = document.getElementById('tpl-activity-btn');
    const fragment = document.createDocumentFragment();

    list.forEach(santri => {
        const id = String(santri.nis || santri.id);
        
        // --- CEK STATUS OTOMATIS (PERIZINAN & PERPULANGAN) ---
        const activePermit = window.checkActivePermit(id, dateKey, slot.id); // Cek Izin/Sakit
        const activeHomecoming = window.checkActiveHomecoming(id, dateKey);   // Cek Pulang [BARU]
        
        // Inisialisasi data jika belum ada
        if(!dbSlot[id]) {
            const defStatus = {};
            slot.activities.forEach(a => {
                if(a.category === 'sunnah') defStatus[a.id] = 'Tidak'; 
                else defStatus[a.id] = a.type === 'mandator' ? 'Hadir' : 'Ya';
            });
            dbSlot[id] = { status: defStatus, note: '' };
        }

        const sData = dbSlot[id];
        const isAutoMarked = sData.note && sData.note.includes('[Auto]');

        // --- LOOP AKTIVITAS UNTUK PENENTUAN STATUS ---
        slot.activities.forEach(act => {
            let targetStatus = null;

            // A. PRIORITAS 1: IZIN / SAKIT (Existing)
            if (activePermit) {
                if (act.category === 'fardu' || act.category === 'kbm') targetStatus = activePermit.type; 
                else targetStatus = 'Tidak'; 
            } 
            // B. PRIORITAS 2: PULANG (Homecoming) [BARU & PENTING]
            else if (activeHomecoming) {
                // Kegiatan Wajib (Shalat, KBM, Dependent) -> Status 'Pulang'
                if (act.category === 'fardu' || act.category === 'kbm' || act.category === 'dependent') {
                    targetStatus = 'Pulang';
                } 
                // Kegiatan Sunnah -> Status 'Tidak' (Strip)
                else {
                    targetStatus = 'Tidak';
                }
            }
            // C. PRIORITAS 3: BERSIHKAN STATUS AUTO LAMA
            // Jika sebelumnya ditandai auto, tapi sekarang tidak ada permit/homecoming, kembalikan ke default
            else if (isAutoMarked) {
                if (act.category === 'sunnah') targetStatus = 'Tidak';
                else if (act.category === 'fardu' || act.category === 'kbm') targetStatus = 'Hadir';
                else targetStatus = 'Ya';
            }

            // EKSEKUSI PENGUNCIAN STATUS (LOCKING)
            // Jika targetStatus terdeteksi, PAKSA status di database mengikuti targetStatus
            if (targetStatus !== null && sData.status[act.id] !== targetStatus) {
                sData.status[act.id] = targetStatus;
                hasAutoChanges = true;
            }
        });

        // --- UPDATE CATATAN OTOMATIS (AUTO NOTE) ---
        if (activePermit) {
            // Note untuk Sakit/Izin
            let permitDetail = '';
            if (activePermit.illness_type) permitDetail = ` (${activePermit.illness_type})`;
            else if (activePermit.reason) permitDetail = ` (${activePermit.reason})`;
            
            let autoNote = '';
            if (activePermit.type === 'Sakit') {
                 autoNote = `[Auto] Sakit${permitDetail}`;
            } else {
                 const endDate = activePermit.end_date || activePermit.end;
                 autoNote = `[Auto] ${activePermit.type} s/d ${window.formatDate(endDate).split(',')[1]}${permitDetail}`;
            }

            if (!sData.note || sData.note === '-' || (isAutoMarked && sData.note !== autoNote)) {
                sData.note = autoNote;
                hasAutoChanges = true;
            }
        } 
        else if (activeHomecoming) {
            // Note untuk Pulang [BARU]
            const cityName = activeHomecoming.city || 'Pulang';
            const autoNote = `[Auto] Pulang ke ${cityName}`;
            
            if (!sData.note || sData.note === '-' || (isAutoMarked && sData.note !== autoNote)) {
                sData.note = autoNote;
                hasAutoChanges = true;
            }
        } 
        else if (isAutoMarked) {
            // Hapus note auto jika status sudah normal
            sData.note = '';
            hasAutoChanges = true;
        }

        // --- RENDER TAMPILAN (UI) ---
        const clone = tplRow.content.cloneNode(true);
        const rowElement = clone.querySelector('.santri-row'); // Element baris utama

        clone.querySelector('.santri-name').textContent = santri.nama;
        clone.querySelector('.santri-kamar').textContent = santri.asrama || santri.kelas;
        clone.querySelector('.santri-avatar').textContent = santri.nama.substring(0,2).toUpperCase();
        
        const nameEl = clone.querySelector('.santri-name');

        // BADGE & HIGHLIGHT: IZIN / SAKIT
        if (activePermit) {
            const badge = document.createElement('span');
            badge.className = `ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border align-middle ${activePermit.type === 'Sakit' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`;
            badge.textContent = activePermit.type;
            nameEl.appendChild(badge);
            
            if(rowElement) {
                if(activePermit.type === 'Sakit') rowElement.classList.add('ring-1', 'ring-amber-200', 'bg-amber-50/30');
                else rowElement.classList.add('ring-1', 'ring-blue-200', 'bg-blue-50/30');
            }
        } 
        // BADGE & HIGHLIGHT: PULANG [BARU]
        else if (activeHomecoming) {
            const badge = document.createElement('span');
            badge.className = `ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border align-middle bg-indigo-100 text-indigo-600 border-indigo-200`;
            badge.textContent = "PULANG";
            nameEl.appendChild(badge);

            if(rowElement) {
                rowElement.classList.add('ring-1', 'ring-indigo-200', 'bg-indigo-50/30');
            }
        }

        // RENDER TOMBOL AKTIVITAS
        const btnCont = clone.querySelector('.activity-container');
        
        slot.activities.forEach(act => {
            if (act.showOnDays && !act.showOnDays.includes(currentDay)) return;

            const bClone = tplBtn.content.cloneNode(true);
            const btn = bClone.querySelector('.btn-status');
            const lbl = bClone.querySelector('.lbl-status');
            
            const curr = sData.status[act.id];
            const ui = STATUS_UI[curr] || STATUS_UI['Hadir'];
            
            btn.className = `btn-status w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border-2 font-black text-lg transition-all active:scale-95 ${ui.class}`;
            btn.textContent = ui.label;
            lbl.textContent = act.label;

            // Visual Ring pada tombol jika status otomatis aktif
            if (activePermit && (curr === activePermit.type || curr === 'Tidak')) {
                btn.classList.add('ring-2', 'ring-offset-1', activePermit.type === 'Sakit' ? 'ring-amber-400' : 'ring-blue-400');
            } else if (activeHomecoming && (curr === 'Pulang' || curr === 'Tidak')) {
                btn.classList.add('ring-2', 'ring-offset-1', 'ring-indigo-400'); // Ring warna Indigo untuk Pulang
            }

            btn.onclick = () => window.toggleStatus(id, act.id, act.type);
            btnCont.appendChild(bClone);
        });

        // INPUT CATATAN
        const noteInp = clone.querySelector('.input-note');
        const noteBox = clone.querySelector('.note-section');
        noteInp.value = sData.note || "";
        noteInp.onchange = (e) => {
            sData.note = e.target.value;
            window.saveData();
        };
        clone.querySelector('.btn-edit-note').onclick = () => noteBox.classList.toggle('hidden');

        fragment.appendChild(clone);
    });

    container.appendChild(fragment);
    
    // Simpan otomatis jika ada perubahan status massal (Auto locking)
    if(hasAutoChanges) {
        window.saveData(); 
    }
};

window.toggleStatus = function(id, actId, type) {
    const slotId = appState.currentSlotId;
    const sData = appState.attendanceData[appState.date]?.[slotId]?.[id];
    
    if(!sData) return; // Safety

    const curr = sData.status[actId];
    let next = 'Hadir';

    // 1. Tentukan Status Berikutnya (Cycle)
    if(type === 'mandator') {
        if(curr === 'Hadir') next = 'Sakit';
        else if(curr === 'Sakit') next = 'Izin';
        else if(curr === 'Izin') next = 'Alpa';
        else next = 'Hadir';
    } else {
        next = (curr === 'Ya') ? 'Tidak' : 'Ya';
    }
    
    // Simpan status baru
    sData.status[actId] = next;
    
    // 2. LOGIKA DEPENDENCY (Jika Shalat Berubah)
    if(actId === 'shalat') {
        const activities = SLOT_WAKTU[slotId].activities;
        const isNonHadir = ['Sakit', 'Izin', 'Alpa'].includes(next);

        activities.forEach(act => {
            if (act.id === 'shalat') return; // Skip diri sendiri

            // KASUS A: Shalat jadi S/I/A (Tidak Hadir)
            // Semua kegiatan lain ikut "Sakit/Izin" atau "Tidak"
            if (isNonHadir) {
                if(act.type === 'mandator') sData.status[act.id] = next; // KBM ikut S/I/A
                else sData.status[act.id] = 'Tidak'; // Sunnah/Dependent jadi Strip (-)
            } 
            
            // KASUS B: Shalat kembali jadi H (Hadir)
            // --- PERBAIKAN DISINI ---
            else if (next === 'Hadir') {
                // 1. KBM (Wajib) -> Kembali ke Hadir
                if (act.category === 'kbm' || act.category === 'fardu') {
                    sData.status[act.id] = 'Hadir';
                }
                // 2. Dependent (Dzikir/Rawatib) -> Kembali ke Ya (karena shalat hadir)
                else if (act.category === 'dependent') {
                    sData.status[act.id] = 'Ya';
                }
                // 3. Sunnah Murni (Tahajjud/Dhuha) -> Tetap Tidak (Defaultnya)
                else if (act.category === 'sunnah') {
                    sData.status[act.id] = 'Tidak'; 
                }
            }
        });
    }

    window.saveData();
    window.renderAttendanceList();
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
    if(appState.filterProblemOnly) btn.classList.add('text-red-500', 'bg-red-50');
    else btn.classList.remove('text-red-500', 'bg-red-50');
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
    if(modal) modal.classList.add('hidden');
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
window.showToast = function(message, type = 'info', isPersistent = false) {
    if(!appState.settings.notifications) return;
    
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = `${UI_COLORS[type] || UI_COLORS.info} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-[slideUp_0.3s_ease-out] mb-3 z-[100]`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}" class="w-5 h-5"></i>
        <span class="font-bold text-xs">${message}</span>
    `;
    
    container.appendChild(toast);
    if(window.lucide) window.lucide.createIcons();
    
    if (!isPersistent) {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    } else {
        // Hapus otomatis setelah 10 detik just in case agar tidak nyangkut
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
    try {
        // 1. Simpan ke HP (Cara Lama - Tetap Biarkan)
        localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(appState.attendanceData));
        
        // Indikator visual simpan (Centang hijau)
        if(appState.settings.autoSave) {
            const indicator = document.getElementById('save-indicator');
            if(indicator) {
                indicator.innerHTML = '<i data-lucide="check" class="w-5 h-5 text-emerald-500"></i>';
                if(window.lucide) window.lucide.createIcons();
                setTimeout(() => indicator.innerHTML = '', 1000);
            }
        }

        // 2. KIRIM KE SUPABASE (Cara Baru)
        // Kita kirim di background agar aplikasi tidak macet
        window.syncToSupabase();

    } catch (e) {
        window.showToast("Gagal menyimpan lokal: " + e.message, "error");
    }
};

window.updateQuickStats = function() {
    if(!appState.selectedClass) return;
    
    // Inisialisasi variabel penghitung
    let stats = { h: 0, s: 0, i: 0, a: 0 };
    let activeSlots = 0; // Untuk menghitung berapa sesi yang sudah diisi data

    Object.values(SLOT_WAKTU).forEach(slot => {
         const slotStats = window.calculateSlotStats(slot.id);
         
         // Kita hanya menjumlahkan sesi yang SUDAH DIISI (isFilled = true)
         if(slotStats.isFilled) {
             stats.h += slotStats.h;
             stats.s += slotStats.s;
             stats.i += slotStats.i;
             stats.a += slotStats.a;
             activeSlots++;
         }
    });
    
    // Pembagi: Jika belum ada sesi yang diisi, bagi dengan 1 (biar tidak error/infinity)
    // Jika sudah ada (misal shubuh & ashar), bagi dengan 2.
    const divider = activeSlots > 0 ? activeSlots : 1;
    
    // Tampilkan hasil RATA-RATA (dibulatkan dengan Math.round)
    // Sehingga angkanya kembali ke skala jumlah santri (misal: 30), bukan akumulasi (120)
    document.getElementById('stat-hadir').textContent = Math.round(stats.h / divider);
    document.getElementById('stat-sakit').textContent = Math.round(stats.s / divider);
    document.getElementById('stat-izin').textContent = Math.round(stats.i / divider);
    document.getElementById('stat-alpa').textContent = Math.round(stats.a / divider);
};

// Ganti fungsi window.drawDonutChart yang lama dengan ini:

window.drawDonutChart = function() {
    const canvas = document.getElementById('weekly-chart');
    if(!canvas) return;
    
    // --- FIX ERROR: Cek apakah canvas punya ukuran (tidak hidden) ---
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // Stop jika hidden/nol

    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    
    // --- 1. Setup Resolusi Layar (Agar tidak buram) ---
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
    
    // --- FIX ERROR: Pastikan radius tidak negatif ---
    let radius = Math.min(width, height) / 2 - 10;
    if (radius <= 0) radius = 0; // Safety prevent negative radius

    ctx.clearRect(0, 0, width, height);

    // --- 2. Hitung Data (Total & Rata-rata) ---
    let stats = { h: 0, s: 0, i: 0, a: 0 };
    let totalPeristiwa = 0; // Total insiden (misal: 60 kejadian dari 2 sesi)
    let activeSlots = 0;    // Jumlah sesi yang sudah diisi (misal: 2 sesi)

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

    // --- 3. ISI ANGKA KE KOTAK LEGENDA ---
    const divider = activeSlots > 0 ? activeSlots : 1;

    const setLegend = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.textContent = val; 
    };
    
    setLegend('legend-hadir', Math.round(stats.h / divider));
    setLegend('legend-sakit', Math.round(stats.s / divider));
    setLegend('legend-izin', Math.round(stats.i / divider));
    setLegend('legend-alpa', Math.round(stats.a / divider));

    // --- 4. Menggambar Grafik Lingkaran ---
    if (totalPeristiwa === 0 || radius === 0) {
        // Jika Data Kosong atau Radius 0: Gambar lingkaran abu-abu (hanya jika radius > 0)
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

    // Definisi Segmen Warna
    const segments = [
        { value: stats.h, color: '#10b981' }, // Emerald (Hadir)
        { value: stats.s, color: '#f59e0b' }, // Amber (Sakit)
        { value: stats.i, color: '#3b82f6' }, // Blue (Izin)
        { value: stats.a, color: '#f43f5e' }  // Rose (Alpa)
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

    // Tulis Persentase di Tengah
    const percentHadir = Math.round((stats.h / totalPeristiwa) * 100);
    drawCenterText(ctx, centerX, centerY, `${percentHadir}%`, "Hadir");
    
    // Update teks badge kecil di pojok kanan HTML
    const statsText = document.getElementById('dash-stats-text');
    if(statsText) statsText.textContent = `${percentHadir}% KEHADIRAN`;
};

// --- FUNGSI PEMBANTU (Letakkan di luar fungsi di atas, atau pastikan sudah ada) ---
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
    
    if(!tbody) return;
    
    tbody.innerHTML = '';
    
    // Update Label Tanggal
    const range = window.getReportDateRange(appState.reportMode);
    if(rangeLabel) rangeLabel.textContent = range.label;

    if (!appState.selectedClass || FILTERED_SANTRI.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-xs text-slate-400">Pilih kelas terlebih dahulu</td></tr>';
        return;
    }

    // --- AGGREGATION LOGIC ---
    // Kita hitung statistik untuk SETIAP santri dalam rentang tanggal
    const santriStats = {}; // { nis: { fardu: {h:0, m:0}, kbm: {h:0}, score: 0 } }

    FILTERED_SANTRI.forEach(s => {
        santriStats[s.nis || s.id] = { 
            fardu: { h:0, total:0 }, 
            kbm: { h:0, total:0 }, 
            sunnah: { y:0, total:0 },
            scoreTotal: 0,
            scoreMax: 0
        };
    });

    let curr = new Date(range.start);
    const end = new Date(range.end);
    let loopGuard = 0;

    // Loop setiap hari dalam rentang
    while(curr <= end && loopGuard < 370) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth()+1).padStart(2,'0');
        const d = String(curr.getDate()).padStart(2,'0');
        const dateKey = `${y}-${m}-${d}`;
        const dayNum = curr.getDay();

        const dayData = appState.attendanceData[dateKey]; // Ambil data hari itu

        if (dayData) {
            Object.values(SLOT_WAKTU).forEach(slot => {
                // Loop semua santri
                FILTERED_SANTRI.forEach(s => {
                    const id = String(s.nis || s.id);
                    const sData = dayData[slot.id]?.[id];
                    const stats = santriStats[id];

                    if(sData) {
                        slot.activities.forEach(act => {
                            if(act.showOnDays && !act.showOnDays.includes(dayNum)) return;
                            
                            const st = sData.status[act.id];
                            let weight = 0;
                            let point = 0;

                            // Tentukan Bobot
                            if(act.category === 'fardu') weight = 3;
                            else if(act.category === 'kbm') weight = 2;
                            else weight = 1;

                            // Hitung Point
                            if(st === 'Hadir' || st === 'Ya') point = weight;
                            else if(st === 'Sakit' || st === 'Izin') point = weight * 0.5;
                            else point = 0;

                            // Akumulasi Score Global
                            stats.scoreTotal += point;
                            stats.scoreMax += weight;

                            // Akumulasi Kategori
                            if(act.category === 'fardu') {
                                stats.fardu.total++;
                                if(st === 'Hadir') stats.fardu.h++;
                            } else if(act.category === 'kbm') {
                                stats.kbm.total++;
                                if(st === 'Hadir') stats.kbm.h++;
                            } else {
                                stats.sunnah.total++;
                                if(st === 'Ya' || st === 'Hadir') stats.sunnah.y++;
                            }
                        });
                    }
                });
            });
        }
        curr.setDate(curr.getDate() + 1);
        loopGuard++;
    }

    // --- RENDER TABLE ---
    const fragment = document.createDocumentFragment();

    FILTERED_SANTRI.forEach((s, idx) => {
        const id = String(s.nis || s.id);
        const stats = santriStats[id];
        
        // Final Score Calculation
        const finalScore = stats.scoreMax === 0 ? 0 : Math.round((stats.scoreTotal / stats.scoreMax) * 100);
        
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-50 dark:border-slate-700/50";

        // Logic Tampilan Kolom (Beda Daily vs Period)
        let shalatCol, kbmCol, sunnahCol;

        if (appState.reportMode === 'daily') {
            // MODE HARIAN: Tampilkan Badge S/A/I untuk Shalat
            const dateKey = appState.date;
            const dayData = appState.attendanceData[dateKey] || {};
            
            let badges = '';
            ['shubuh', 'ashar', 'maghrib', 'isya'].forEach(sid => {
                const st = dayData[sid]?.[id]?.status?.shalat;
                let color = 'bg-slate-100 text-slate-300';
                let label = sid[0].toUpperCase();
                if(st === 'Hadir') color = 'bg-emerald-100 text-emerald-600';
                else if(st === 'Alpa') color = 'bg-red-100 text-red-600';
                else if(st === 'Sakit' || st === 'Izin') color = 'bg-amber-100 text-amber-600';
                badges += `<span class="w-5 h-5 flex items-center justify-center rounded ${color} text-[9px] font-black">${label}</span>`;
            });
            shalatCol = `<div class="flex justify-center gap-1">${badges}</div>`;
            kbmCol = `<span class="font-bold text-slate-600 dark:text-slate-400">${stats.kbm.h}</span>`;
            sunnahCol = `<span class="font-bold text-slate-600 dark:text-slate-400">${stats.sunnah.y}</span>`;
        } 
        else {
            // MODE PERIODE (Mingguan/Bulanan): Tampilkan Persentase
            const pctFardu = stats.fardu.total ? Math.round((stats.fardu.h / stats.fardu.total)*100) : 0;
            const pctKbm = stats.kbm.total ? Math.round((stats.kbm.h / stats.kbm.total)*100) : 0;
            const pctSunnah = stats.sunnah.total ? Math.round((stats.sunnah.y / stats.sunnah.total)*100) : 0;

            // Helper visual bar kecil
            const makeBar = (pct, color) => `
                <div class="flex flex-col items-center">
                    <span class="text-[10px] font-bold ${pct<60?'text-red-500':'text-slate-600'}">${pct}%</span>
                    <div class="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full ${color}" style="width: ${pct}%"></div>
                    </div>
                </div>`;

            shalatCol = makeBar(pctFardu, 'bg-emerald-500');
            kbmCol = makeBar(pctKbm, 'bg-blue-500');
            sunnahCol = makeBar(pctSunnah, 'bg-amber-500');
        }

        // Warna Score Akhir
        let scoreColor = 'text-red-500';
        if(finalScore >= 85) scoreColor = 'text-emerald-500';
        else if(finalScore >= 70) scoreColor = 'text-blue-500';
        else if(finalScore >= 50) scoreColor = 'text-amber-500';

        tr.innerHTML = `
            <td class="p-3 text-center text-slate-500 text-[10px] font-bold">${idx + 1}</td>
            <td class="p-3">
                <div class="font-bold text-slate-700 dark:text-slate-200 text-xs">${s.nama}</div>
                ${appState.reportMode !== 'daily' ? `<div class="text-[9px] text-slate-400 mt-0.5">Total Point: ${stats.scoreTotal}</div>` : ''}
            </td>
            <td class="p-3 text-center align-middle">${shalatCol}</td>
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
    const updateClock = () => {
        const el = document.getElementById('dash-clock');
        if(el) {
            const now = new Date();
            el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const secEl = document.getElementById('dash-clock-sec');
            if(secEl) secEl.textContent = String(now.getSeconds()).padStart(2, '0');
        }
        window.checkScheduledNotifications();    
    };
    updateClock();
    setInterval(updateClock, 1000);
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
// PERMIT VIEW FUNCTIONS (NEW - Full Page)
// ==========================================

window.openPermitView = function() {
    if(!appState.selectedClass) return window.showToast("Pilih kelas terlebih dahulu!", "warning");
    
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-permit').classList.remove('hidden');
    
    // Reset form
    const today = appState.date;
    document.getElementById('permit-view-type').value = 'Sakit';
    document.getElementById('permit-view-session').value = 'all';
    document.getElementById('permit-view-start').value = today;
    document.getElementById('permit-view-end').value = today;
    document.getElementById('permit-view-end-time').value = '';
    document.getElementById('permit-view-illness').value = '';
    document.getElementById('permit-view-reason').value = '';
    document.getElementById('permit-view-pulang-session').value = 'all';
    document.getElementById('permit-view-event-name').value = '';
    document.getElementById('permit-view-search').value = '';
    
    window.togglePermitViewFields();
    window.renderPermitViewSantriList(FILTERED_SANTRI);
    window.renderPermitViewList();
    
    if(window.lucide) window.lucide.createIcons();
};

window.closePermitView = function() {
    document.getElementById('view-permit').classList.add('hidden');
    document.getElementById('view-main').classList.remove('hidden');
    window.updateDashboard();
};

window.togglePermitViewFields = function() {
    const type = document.getElementById('permit-view-type').value;
    const endContainer = document.getElementById('permit-view-end-container');
    const endTimeContainer = document.getElementById('permit-view-end-time-container');
    const illnessContainer = document.getElementById('permit-view-illness-container');
    const reasonContainer = document.getElementById('permit-view-reason-container');
    const pulangContainer = document.getElementById('permit-view-pulang-container');
    const selectAllCheckbox = document.getElementById('permit-view-select-all');
    
    if (type === 'Sakit') {
        if (endContainer) endContainer.classList.add('hidden');
        if (endTimeContainer) endTimeContainer.classList.add('hidden');
        if (illnessContainer) illnessContainer.classList.remove('hidden');
        if (reasonContainer) reasonContainer.classList.add('hidden');
        if (pulangContainer) pulangContainer.classList.add('hidden');
        // Uncheck all for Sakit
        window.toggleAllPermitViewSantri(false);
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    } else if (type === 'Izin') {
        if (endContainer) endContainer.classList.remove('hidden');
        if (endTimeContainer) endTimeContainer.classList.add('hidden');
        if (illnessContainer) illnessContainer.classList.add('hidden');
        if (reasonContainer) reasonContainer.classList.remove('hidden');
        if (pulangContainer) pulangContainer.classList.add('hidden');
        // Uncheck all for Izin
        window.toggleAllPermitViewSantri(false);
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    } else if (type === 'Pulang') {
        if (endContainer) endContainer.classList.remove('hidden');
        if (endTimeContainer) endTimeContainer.classList.remove('hidden');
        if (illnessContainer) illnessContainer.classList.add('hidden');
        if (reasonContainer) reasonContainer.classList.add('hidden');
        if (pulangContainer) pulangContainer.classList.remove('hidden');
        // Check all by default for Pulang
        window.toggleAllPermitViewSantri(true);
        if (selectAllCheckbox) selectAllCheckbox.checked = true;
    }
};

window.renderPermitViewSantriList = function(list) {
    const container = document.getElementById('permit-view-santri-list');
    if(!container) return;
    container.innerHTML = '';

    list.forEach(s => {
        const id = String(s.nis || s.id);
        const div = document.createElement('label');
        div.className = 'flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500 transition-all group select-none';
        div.innerHTML = `
            <input type="checkbox" name="permit_view_santri_select" value="${id}" class="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 rounded-md cursor-pointer accent-emerald-500">
            <span class="text-xs font-bold text-slate-600 dark:text-slate-300 truncate group-hover:text-slate-800 dark:group-hover:text-white">${s.nama}</span>
        `;
        container.appendChild(div);
    });
};

window.filterPermitViewSantri = function(val) {
    const search = val.toLowerCase();
    const filtered = FILTERED_SANTRI.filter(s => s.nama.toLowerCase().includes(search));
    window.renderPermitViewSantriList(filtered);
};

window.toggleAllPermitViewSantri = function(checked) {
    if (typeof checked !== 'boolean') {
        console.error('toggleAllPermitViewSantri: checked parameter must be a boolean');
        return;
    }
    const checkboxes = document.querySelectorAll('input[name="permit_view_santri_select"]');
    checkboxes.forEach(cb => cb.checked = checked);
};

window.savePermitFromView = function() {
    const checkboxes = document.querySelectorAll('input[name="permit_view_santri_select"]:checked');
    const selectedNis = Array.from(checkboxes).map(cb => cb.value);

    const type = document.getElementById('permit-view-type').value;
    const session = document.getElementById('permit-view-session').value;
    const start = document.getElementById('permit-view-start').value;
    const end = document.getElementById('permit-view-end').value;
    const endTime = document.getElementById('permit-view-end-time').value;
    const illness = document.getElementById('permit-view-illness').value.trim();
    const reason = document.getElementById('permit-view-reason').value.trim();
    const pulangSession = document.getElementById('permit-view-pulang-session').value;
    const eventName = document.getElementById('permit-view-event-name').value.trim();

    if(selectedNis.length === 0) return window.showToast("Pilih minimal 1 anak", "warning");
    if(!start) return window.showToast("Tanggal mulai harus diisi", "warning");
    
    if(type === 'Sakit') {
        if(!illness) return window.showToast("Keterangan sakit harus diisi", "warning");
    } else if (type === 'Izin') {
        if(!end) return window.showToast("Tanggal selesai harus diisi untuk Izin", "warning");
        if(start > end) return window.showToast("Tanggal mulai tidak boleh > selesai", "warning");
        if(!reason) return window.showToast("Alasan izin harus diisi", "warning");
    } else if (type === 'Pulang') {
        if(!end) return window.showToast("Sampai tanggal harus diisi untuk Pulang", "warning");
        if(!endTime) return window.showToast("Jam akhir kepulangan harus diisi untuk tipe Pulang", "warning");
        if(start > end) return window.showToast("Tanggal mulai tidak boleh > selesai", "warning");
        if(!eventName) return window.showToast("Nama event perpulangan harus diisi", "warning");
    }

    let count = 0;
    selectedNis.forEach(nis => {
        const newPermit = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            nis: nis,
            type,
            session: type === 'Pulang' ? pulangSession : session,
            start_date: start,
            timestamp: new Date().toISOString()
        };
        
        if(type === 'Sakit') {
            newPermit.status = 'Sakit';
            newPermit.recovered_date = null;
            newPermit.illness_type = illness;
        } else if(type === 'Izin') {
            newPermit.status = 'Izin';
            newPermit.end_date = end;
            newPermit.arrival_date = null;
            newPermit.reason = reason;
        } else if(type === 'Pulang') {
            newPermit.status = 'Pulang';
            newPermit.end_date = end;
            newPermit.end_time = endTime;
            newPermit.arrival_date = null;
            newPermit.event_name = eventName;
        }
        
        appState.permits.push(newPermit);
        count++;
    });

    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    window.showToast(`${count} ${type} berhasil disimpan`, "success");
    
    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById('permit-view-illness').value = '';
    document.getElementById('permit-view-reason').value = '';
    document.getElementById('permit-view-event-name').value = '';
    document.getElementById('permit-view-end-time').value = '';
    const selectAllCheckbox = document.getElementById('permit-view-select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    window.renderPermitViewList();
    window.renderAttendanceList();
    window.updateDashboard();
};

window.renderPermitViewList = function() {
    const container = document.getElementById('permit-view-list');
    if(!container) return;
    container.innerHTML = '';
    
    const classNisList = FILTERED_SANTRI.map(s => String(s.nis || s.id));
    const activePermits = appState.permits.filter(p => classNisList.includes(p.nis));

    if(activePermits.length === 0) {
        container.innerHTML = '<div class="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p class="text-xs text-slate-400 font-bold">Belum ada data izin aktif</p></div>';
        return;
    }

    activePermits.forEach(p => {
        const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === p.nis);
        if(!santri) return;

        const startDate = p.start_date || p.start;
        const endDate = p.end_date || p.end;
        const status = p.status || p.type;
        
        const canEdit = (p.type === 'Sakit' && status === 'Sakit') || (p.type === 'Izin' && status !== 'Datang') || (p.type === 'Pulang' && status !== 'Datang');
        
        let dateDisplay = '';
        if (p.type === 'Sakit') {
            dateDisplay = `Mulai ${window.formatDate(startDate).split(',')[1]}`;
            if (status === 'Sembuh' && p.recovered_date) {
                dateDisplay += ` • Sembuh ${window.formatDate(p.recovered_date).split(',')[1]}`;
            }
        } else if (p.type === 'Pulang') {
            dateDisplay = `${window.formatDate(startDate).split(',')[1]} - ${window.formatDate(endDate).split(',')[1]}`;
            if (p.end_time) {
                dateDisplay += ` (${p.end_time})`;
            }
            if (status === 'Datang' && p.arrival_date) {
                dateDisplay += ` • Kembali ${window.formatDate(p.arrival_date).split(',')[1]}`;
            }
        } else {
            dateDisplay = `${window.formatDate(startDate).split(',')[1]} - ${window.formatDate(endDate).split(',')[1]}`;
            if (status === 'Datang' && p.arrival_date) {
                dateDisplay += ` • Kembali ${window.formatDate(p.arrival_date).split(',')[1]}`;
            }
        }
        
        let statusBadgeClass = '';
        if (status === 'Sakit') statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
        else if (status === 'Sembuh') statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        else if (status === 'Izin') statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
        else if (status === 'Pulang') statusBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        else if (status === 'Datang') statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        else if (status === 'Alpa') statusBadgeClass = 'bg-red-50 text-red-700 border-red-200';
        
        let description = '';
        if (p.illness_type) {
            description = `<span class="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md flex items-center gap-1"><i data-lucide="activity" class="w-3 h-3"></i> ${p.illness_type}</span>`;
        } else if (p.event_name) {
            description = `<span class="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md flex items-center gap-1"><i data-lucide="flag" class="w-3 h-3"></i> ${p.event_name}</span>`;
        } else if (p.reason) {
            description = `<span class="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md flex items-center gap-1"><i data-lucide="message-circle" class="w-3 h-3"></i> ${p.reason}</span>`;
        }

        let typeColor = 'bg-blue-100 text-blue-700';
        if (p.type === 'Sakit') typeColor = 'bg-amber-100 text-amber-700';
        else if (p.type === 'Pulang') typeColor = 'bg-indigo-100 text-indigo-700';

        const div = document.createElement('div');
        div.className = 'p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm';
        div.innerHTML = `
            <div class="flex-1">
                <p class="font-bold text-slate-800 dark:text-white text-sm">${santri.nama}</p>
                <div class="flex flex-wrap gap-2 mt-1.5">
                    <span class="px-2 py-0.5 rounded-md ${typeColor} font-black text-[10px] uppercase tracking-wide border border-black/5">${p.type}</span>
                    <span class="px-2 py-0.5 rounded-md ${statusBadgeClass} font-bold text-[10px] border">${status}</span>
                    ${description}
                    <span class="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${dateDisplay}</span>
                    ${p.session !== 'all' ? `<span class="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md uppercase">${p.session}</span>` : ''}
                </div>
            </div>
            <div class="flex gap-2 ml-2">
                ${canEdit ? `<button onclick="window.openEditPermitModal('${p.id}')" class="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"><i data-lucide="edit-2" class="w-4 h-4"></i></button>` : ''}
                <button onclick="window.deletePermitFromView('${p.id}')" class="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
    if(window.lucide) window.lucide.createIcons();
};

window.deletePermitFromView = function(id) {
    if(!confirm("Hapus data izin ini? Status akan dikembalikan ke default.")) return;
    
    appState.permits = appState.permits.filter(p => p.id !== id);
    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    window.renderPermitViewList();
    window.showToast("Data izin dihapus", "info");
    
    window.renderAttendanceList();
    window.updateDashboard();
};

// ==========================================
// FITUR PERIZINAN / SAKIT (DURASI)
// ==========================================

// --- FITUR PERIZINAN (UPDATED) ---

// Variabel temp untuk filter
let permitSantriList = [];

window.openPermitModal = function() {
    if(!appState.selectedClass) return window.showToast("Pilih kelas terlebih dahulu!", "warning");
    
    const modal = document.getElementById('modal-permit');
    
    // 1. Reset Form Tanggal ke Hari Ini
    const today = appState.date;
    document.getElementById('permit-start').value = today;
    document.getElementById('permit-end').value = today;
    document.getElementById('permit-type').value = 'Sakit';
    document.getElementById('permit-session').value = 'all';
    
    // 2. Reset Pencarian
    const searchInput = document.getElementById('permit-search-santri');
    if(searchInput) searchInput.value = '';
    
    // 3. Render Checklist Santri
    window.renderPermitChecklist(FILTERED_SANTRI);
    window.updatePermitCount();

    // 4. Render List Izin yang sudah ada
    window.renderPermitList();
    
    if(modal) {
        modal.classList.remove('hidden');
        if(window.lucide) window.lucide.createIcons();
    }
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

window.togglePermitEndDate = function() {
    const type = document.getElementById('permit-type').value;
    const endContainer = document.getElementById('permit-end-container');
    const infoText = document.getElementById('permit-info-text');
    const illnessContainer = document.getElementById('permit-illness-container');
    const reasonContainer = document.getElementById('permit-reason-container');
    
    if (type === 'Sakit') {
        // Hide end date for Sakit
        if (endContainer) endContainer.classList.add('hidden');
        if (infoText) {
            infoText.classList.remove('hidden');
            if(window.lucide) window.lucide.createIcons();
        }
        // Show illness input, hide reason input
        if (illnessContainer) illnessContainer.classList.remove('hidden');
        if (reasonContainer) reasonContainer.classList.add('hidden');
    } else {
        // Show end date for Izin
        if (endContainer) endContainer.classList.remove('hidden');
        if (infoText) infoText.classList.add('hidden');
        // Hide illness input, show reason input
        if (illnessContainer) illnessContainer.classList.add('hidden');
        if (reasonContainer) reasonContainer.classList.remove('hidden');
    }
};

window.savePermit = function() {
    // Ambil santri yang dicentang
    const checkboxes = document.querySelectorAll('input[name="permit_santri_select"]:checked');
    const selectedNis = Array.from(checkboxes).map(cb => cb.value);

    const type = document.getElementById('permit-type').value;
    const session = document.getElementById('permit-session').value;
    const start = document.getElementById('permit-start').value;
    const end = document.getElementById('permit-end').value;
    const illness = document.getElementById('permit-illness').value.trim();
    const reason = document.getElementById('permit-reason').value.trim();

    if(selectedNis.length === 0) return window.showToast("Pilih minimal 1 santri", "warning");
    if(!start) return window.showToast("Tanggal mulai harus diisi", "warning");
    
    // Validasi berbeda untuk Sakit dan Izin
    if(type === 'Sakit') {
        // Sakit tidak perlu end_date
        if(!illness) return window.showToast("Keterangan sakit harus diisi", "warning");
    } else {
        // Izin harus punya end_date
        if(!end) return window.showToast("Tanggal selesai harus diisi untuk Izin", "warning");
        if(start > end) return window.showToast("Tanggal mulai tidak boleh > selesai", "warning");
        if(!reason) return window.showToast("Alasan izin harus diisi", "warning");
    }

    // Simpan data per santri
    let count = 0;
    selectedNis.forEach(nis => {
        const newPermit = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7), // ID Unik
            nis: nis,
            type,
            session,
            start_date: start,  // Changed from 'start' to 'start_date'
            timestamp: new Date().toISOString()
        };
        
        // Set status dan fields sesuai tipe
        if(type === 'Sakit') {
            newPermit.status = 'Sakit';
            newPermit.recovered_date = null;
            newPermit.illness_type = illness;  // NEW: Simpan keterangan sakit
            // Sakit tidak punya end_date
        } else {
            newPermit.status = 'Izin';
            newPermit.end_date = end;  // Changed from 'end' to 'end_date'
            newPermit.arrival_date = null;
            newPermit.reason = reason;  // NEW: Simpan alasan izin
        }
        
        appState.permits.push(newPermit);
        count++;
    });

    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    window.showToast(`${count} ${type} berhasil disimpan`, "success");
    window.renderPermitList(); 
    
    // Uncheck semua setelah simpan
    checkboxes.forEach(cb => cb.checked = false);
    window.updatePermitCount();

    // Refresh dashboard jika tanggal relevan
    const checkDate = type === 'Sakit' ? start : end;
    if (appState.date >= start && appState.date <= (checkDate || start)) {
        window.renderAttendanceList(); 
        window.updateDashboard();
    }
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
    const activePermits = appState.permits.filter(p => classNisList.includes(p.nis));

    if(activePermits.length === 0) {
        container.innerHTML = '<div class="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p class="text-xs text-slate-400 font-bold">Belum ada data izin aktif</p></div>';
        return;
    }

    activePermits.forEach(p => {
        const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === p.nis);
        if(!santri) return;

        // Handle backward compatibility
        const startDate = p.start_date || p.start;
        const endDate = p.end_date || p.end;
        const status = p.status || p.type; // Default to type if no status
        
        // Determine if permit can be edited (not yet "Sembuh" or "Datang")
        const canEdit = (p.type === 'Sakit' && status === 'Sakit') || (p.type === 'Izin' && status !== 'Datang');
        
        // Build date display
        let dateDisplay = '';
        if (p.type === 'Sakit') {
            dateDisplay = `Mulai ${window.formatDate(startDate).split(',')[1]}`;
            if (status === 'Sembuh' && p.recovered_date) {
                dateDisplay += ` • Sembuh ${window.formatDate(p.recovered_date).split(',')[1]}`;
            }
        } else {
            dateDisplay = `${window.formatDate(startDate).split(',')[1]} - ${window.formatDate(endDate).split(',')[1]}`;
            if (status === 'Datang' && p.arrival_date) {
                dateDisplay += ` • Kembali ${window.formatDate(p.arrival_date).split(',')[1]}`;
            }
        }
        
        // Status badge color
        let statusBadgeClass = '';
        if (status === 'Sakit') statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
        else if (status === 'Sembuh') statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        else if (status === 'Izin') statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
        else if (status === 'Datang') statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        else if (status === 'Alpa') statusBadgeClass = 'bg-red-50 text-red-700 border-red-200';
        
        // Build description (illness or reason)
        let description = '';
        if (p.illness_type) {
            description = `<span class="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md flex items-center gap-1"><i data-lucide="activity" class="w-3 h-3"></i> ${p.illness_type}</span>`;
        } else if (p.reason) {
            description = `<span class="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md flex items-center gap-1"><i data-lucide="message-circle" class="w-3 h-3"></i> ${p.reason}</span>`;
        }

        const div = document.createElement('div');
        div.className = 'p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm';
        div.innerHTML = `
            <div class="flex-1">
                <p class="font-bold text-slate-800 dark:text-white text-sm">${santri.nama}</p>
                <div class="flex flex-wrap gap-2 mt-1.5">
                    <span class="px-2 py-0.5 rounded-md ${p.type === 'Sakit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'} font-black text-[10px] uppercase tracking-wide border border-black/5">${p.type}</span>
                    <span class="px-2 py-0.5 rounded-md ${statusBadgeClass} font-bold text-[10px] border">${status}</span>
                    ${description}
                    <span class="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${dateDisplay}</span>
                    ${p.session !== 'all' ? `<span class="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md uppercase">${p.session}</span>` : ''}
                </div>
            </div>
            <div class="flex gap-2 ml-2">
                ${canEdit ? `<button onclick="window.openEditPermitModal('${p.id}')" class="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"><i data-lucide="edit-2" class="w-4 h-4"></i></button>` : ''}
                <button onclick="window.deletePermit('${p.id}')" class="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
    if(window.lucide) window.lucide.createIcons();
};

window.checkActivePermit = function(nis, dateStr, slotId) {
    const permit = appState.permits.find(p => {
        const isNisMatch = p.nis === String(nis);
        if (!isNisMatch) return false;
        
        const isSlotMatch = p.session === 'all' || p.session === slotId;
        if (!isSlotMatch) return false;
        
        // Handle backward compatibility for old permits
        const startDate = p.start_date || p.start;
        const endDate = p.end_date || p.end;
        
        if (p.type === 'Sakit') {
            // SAKIT LOGIC
            if (p.status === 'Sakit') {
                // Active sick leave - check if current date is after start date
                return dateStr >= startDate;
            } else if (p.status === 'Sembuh' && p.recovered_date) {
                // Recovered - only active BEFORE recovery date
                return dateStr >= startDate && dateStr < p.recovered_date;
            }
            return false;
        } else if (p.type === 'Izin' || p.type === 'Pulang') {
            // IZIN & PULANG LOGIC (Fixed duration)
            if (p.status === 'Datang') {
                // Student has returned - permit no longer active
                return false;
            }
            
            // Check if within permit date range
            const isDateMatch = dateStr >= startDate && dateStr <= endDate;
            if (!isDateMatch) {
                // Date is after end_date - check for auto-Alpa
                if (dateStr > endDate && (p.status === 'Izin' || p.status === 'Pulang')) {
                    // Auto-transition to Alpa
                    p.status = 'Alpa';
                    // Save the update
                    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
                    return true; // Still return permit but status is now Alpa
                }
                return false;
            }
            
            return true;
        }
        
        return false;
    });
    
    return permit;
};

// ==========================================
// EDIT PERMIT FUNCTIONS (NEW)
// ==========================================

window.openEditPermitModal = function(permitId) {
    const permit = appState.permits.find(p => p.id === permitId);
    if (!permit) return;
    
    const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === permit.nis);
    if (!santri) return;
    
    // Open modal
    const modal = document.getElementById('modal-edit-permit');
    if (!modal) {
        console.error('Modal edit permit not found');
        return;
    }
    
    // Set permit ID in hidden field
    document.getElementById('edit-permit-id').value = permitId;
    
    // Update modal title and info
    document.getElementById('edit-permit-santri-name').textContent = santri.nama;
    document.getElementById('edit-permit-type-display').textContent = permit.type;
    
    // Setup form based on type
    if (permit.type === 'Sakit') {
        // Show recovery date input
        document.getElementById('edit-permit-sakit-section').classList.remove('hidden');
        document.getElementById('edit-permit-izin-section').classList.add('hidden');
        
        const today = window.getLocalDateStr();
        document.getElementById('edit-permit-recovery-date').value = today;
        document.getElementById('edit-permit-recovery-session').value = 'all';
    } else if (permit.type === 'Izin' || permit.type === 'Pulang') {
        // Show arrival date input for both Izin and Pulang
        document.getElementById('edit-permit-sakit-section').classList.add('hidden');
        document.getElementById('edit-permit-izin-section').classList.remove('hidden');
        
        const today = window.getLocalDateStr();
        document.getElementById('edit-permit-arrival-date').value = today;
        document.getElementById('edit-permit-arrival-session').value = 'all';
    }
    
    modal.classList.remove('hidden');
    if(window.lucide) window.lucide.createIcons();
};

window.saveEditPermit = function() {
    const permitId = document.getElementById('edit-permit-id').value;
    const permit = appState.permits.find(p => p.id === permitId);
    if (!permit) return;
    
    if (permit.type === 'Sakit') {
        // Update to Sembuh
        const recoveryDate = document.getElementById('edit-permit-recovery-date').value;
        const recoverySession = document.getElementById('edit-permit-recovery-session').value;
        
        if (!recoveryDate) {
            return window.showToast("Pilih tanggal sembuh", "warning");
        }
        
        // Validate recovery date is not before start date
        const startDate = permit.start_date || permit.start;
        if (recoveryDate < startDate) {
            return window.showToast("Tanggal sembuh tidak boleh sebelum tanggal mulai sakit", "warning");
        }
        
        permit.status = 'Sembuh';
        permit.recovered_date = recoveryDate;
        permit.session = recoverySession; // Update session if needed
        
        window.showToast("Status diubah: Sembuh", "success");
    } else {
        // Update to Datang
        const arrivalDate = document.getElementById('edit-permit-arrival-date').value;
        const arrivalSession = document.getElementById('edit-permit-arrival-session').value;
        
        if (!arrivalDate) {
            return window.showToast("Pilih tanggal datang", "warning");
        }
        
        // Validate arrival date is not before start date
        const startDate = permit.start_date || permit.start;
        if (arrivalDate < startDate) {
            return window.showToast("Tanggal datang tidak boleh sebelum tanggal mulai izin", "warning");
        }
        
        permit.status = 'Datang';
        permit.arrival_date = arrivalDate;
        permit.session = arrivalSession; // Update session if needed
        
        window.showToast("Status diubah: Datang", "success");
    }
    
    // Save to localStorage
    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    // Close modal
    document.getElementById('modal-edit-permit').classList.add('hidden');
    
    // Refresh displays
    window.renderPermitList();
    window.renderAttendanceList();
    window.updateDashboard();
};

// ==========================================
// EXTEND PERMIT FUNCTIONS (NEW)
// ==========================================

window.openExtendPermitModal = function(permitId) {
    const permit = appState.permits.find(p => p.id === permitId);
    if (!permit) return;
    
    const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === permit.nis);
    if (!santri) return;
    
    const modal = document.getElementById('modal-extend-permit');
    if (!modal) {
        console.error('Modal extend permit not found');
        return;
    }
    
    document.getElementById('extend-permit-id').value = permitId;
    document.getElementById('extend-permit-santri-name').textContent = santri.nama;
    document.getElementById('extend-permit-type-display').textContent = permit.type;
    
    const currentEndDate = permit.end_date || permit.end;
    document.getElementById('extend-permit-current-end').textContent = window.formatDate(currentEndDate);
    
    // Set new end date default to +3 days from current end
    const suggestedDate = new Date(currentEndDate);
    suggestedDate.setDate(suggestedDate.getDate() + 3);
    document.getElementById('extend-permit-new-end').value = window.getLocalDateStr(suggestedDate);
    document.getElementById('extend-permit-reason').value = '';
    
    modal.classList.remove('hidden');
    if(window.lucide) window.lucide.createIcons();
};

window.saveExtendPermit = function() {
    const permitId = document.getElementById('extend-permit-id').value;
    const permit = appState.permits.find(p => p.id === permitId);
    if (!permit) return;
    
    const newEndDate = document.getElementById('extend-permit-new-end').value;
    const extendReason = document.getElementById('extend-permit-reason').value.trim();
    
    if (!newEndDate) {
        return window.showToast("Pilih tanggal akhir baru", "warning");
    }
    
    if (!extendReason) {
        return window.showToast("Alasan perpanjangan harus diisi", "warning");
    }
    
    const currentEndDate = permit.end_date || permit.end;
    if (newEndDate <= currentEndDate) {
        return window.showToast("Tanggal baru harus lebih lama dari sekarang", "warning");
    }
    
    // Update permit
    permit.end_date = newEndDate;
    permit.status = 'Izin'; // Reset from Alpa to Izin if needed
    
    // Add extension note
    if (!permit.extensions) {
        permit.extensions = [];
    }
    permit.extensions.push({
        original_end: currentEndDate,
        new_end: newEndDate,
        reason: extendReason,
        timestamp: new Date().toISOString()
    });
    
    // Update reason to include extension note
    const extendNote = `Diperpanjang s/d ${window.formatDate(newEndDate).split(',')[1]} (${extendReason})`;
    if (permit.reason) {
        permit.reason += ` | ${extendNote}`;
    } else {
        permit.reason = extendNote;
    }
    
    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    window.showToast(`${permit.type} diperpanjang hingga ${window.formatDate(newEndDate).split(',')[1]}`, "success");
    
    document.getElementById('modal-extend-permit').classList.add('hidden');
    
    window.renderPermitList();
    window.renderAttendanceList();
    window.updateDashboard();
};

// ==========================================
// DASHBOARD ACTIVE PERMITS SECTION (NEW)
// ==========================================

window.renderDashboardActivePermits = function() {
    const container = document.getElementById('dashboard-active-permits');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!appState.selectedClass || FILTERED_SANTRI.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-xs text-slate-400">Pilih kelas dahulu</div>';
        return;
    }
    
    const today = appState.date;
    const classNisList = FILTERED_SANTRI.map(s => String(s.nis || s.id));
    
    // Categorize active permits
    const sakit = [];
    const izin = [];
    const pulang = [];
    const processedNis = new Set(); // Track which students we've already counted
    
    // Check permits (PRIORITY: Process permits first)
    appState.permits.filter(p => classNisList.includes(p.nis)).forEach(p => {
        if (p.type === 'Sakit' && p.status === 'Sakit') {
            sakit.push(p);
            processedNis.add(p.nis);
        } else if (p.type === 'Izin' && (p.status === 'Izin' || p.status === 'Alpa')) {
            const endDate = p.end_date || p.end;
            if (today <= endDate || p.status === 'Alpa') {
                izin.push(p);
                processedNis.add(p.nis);
            }
        } else if (p.type === 'Pulang' && (p.status === 'Pulang' || p.status === 'Alpa')) {
            const endDate = p.end_date || p.end;
            if (today <= endDate || p.status === 'Alpa') {
                pulang.push(p);
                processedNis.add(p.nis);
            }
        }
    });
    
    // Check homecomings ONLY for students not in permits (backward compatibility)
    appState.homecomings.filter(h => classNisList.includes(h.nis) && !processedNis.has(h.nis)).forEach(h => {
        const status = h.status || 'Pulang';
        if (status === 'Pulang' || status === 'Alpa') {
            const endDate = h.end_date || h.end;
            if (today <= endDate || status === 'Alpa') {
                pulang.push(h);
            }
        }
    });
    
    if (sakit.length === 0 && izin.length === 0 && pulang.length === 0) {
        container.innerHTML = `
            <div class="glass-card p-4 rounded-2xl flex items-center justify-center gap-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-500"></i>
                <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">Semua santri hadir normal!</span>
            </div>`;
        if(window.lucide) window.lucide.createIcons();
        return;
    }
    
    // Render sections
    const fragment = document.createDocumentFragment();
    
    if (sakit.length > 0) {
        fragment.appendChild(window.renderPermitSection('Masih Sakit', sakit, 'amber', 'Sembuh'));
    }
    
    if (izin.length > 0) {
        fragment.appendChild(window.renderPermitSection('Masih Izin', izin, 'blue', 'Datang'));
    }
    
    if (pulang.length > 0) {
        fragment.appendChild(window.renderHomecomingSection('Masih Pulang', pulang, 'indigo', 'Datang'));
    }
    
    container.appendChild(fragment);
    if(window.lucide) window.lucide.createIcons();
};

window.renderPermitSection = function(title, permits, color, actionLabel) {
    const section = document.createElement('div');
    section.className = 'mb-4';
    
    let html = `
        <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-${color}-500"></span>
                ${title} (${permits.length})
            </h4>
        </div>
        <div class="space-y-2">
    `;
    
    permits.forEach(p => {
        const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === p.nis);
        if (!santri) return;
        
        const startDate = p.start_date || p.start;
        const endDate = p.end_date || p.end;
        const status = p.status || p.type;
        
        let dateInfo = '';
        if (p.type === 'Sakit') {
            dateInfo = `sejak ${window.formatDate(startDate).split(',')[1]}`;
        } else {
            dateInfo = `s/d ${window.formatDate(endDate).split(',')[1]}`;
        }
        
        let statusBadge = '';
        if (status === 'Alpa') {
            statusBadge = '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200">ALPA</span>';
        }
        
        html += `
            <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-${color}-100 dark:border-${color}-800/30 flex justify-between items-center">
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-800 dark:text-white text-xs truncate">${santri.nama}</p>
                    <p class="text-[10px] text-slate-500 mt-0.5">${dateInfo} ${statusBadge}</p>
                </div>
                <div class="flex gap-1 ml-2">
                    ${p.type === 'Izin' && status !== 'Datang' ? `<button onclick="window.openExtendPermitModal('${p.id}')" class="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-[10px] font-bold" title="Perpanjang"><i data-lucide="clock" class="w-3 h-3"></i></button>` : ''}
                    <button onclick="window.quickUpdatePermit('${p.id}', '${actionLabel}')" class="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[10px] font-bold">${actionLabel}</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    section.innerHTML = html;
    return section;
};

window.renderHomecomingSection = function(title, homecomings, color, actionLabel) {
    const section = document.createElement('div');
    section.className = 'mb-4';
    
    let html = `
        <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-${color}-500"></span>
                ${title} (${homecomings.length})
            </h4>
        </div>
        <div class="space-y-2">
    `;
    
    homecomings.forEach(h => {
        const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === h.nis);
        if (!santri) return;
        
        const endDate = h.end_date || h.end;
        const status = h.status || 'Pulang';
        const city = h.city || 'Pulang';
        
        let statusBadge = '';
        if (status === 'Alpa') {
            statusBadge = '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200">ALPA</span>';
        }
        
        html += `
            <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-${color}-100 dark:border-${color}-800/30 flex justify-between items-center">
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-800 dark:text-white text-xs truncate">${santri.nama}</p>
                    <p class="text-[10px] text-slate-500 mt-0.5">${city} • s/d ${window.formatDate(endDate).split(',')[1]} ${statusBadge}</p>
                </div>
                <div class="flex gap-1 ml-2">
                    ${status !== 'Datang' ? `<button onclick="window.openExtendHomecomingModal('${h.id}')" class="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-[10px] font-bold" title="Perpanjang"><i data-lucide="clock" class="w-3 h-3"></i></button>` : ''}
                    <button onclick="window.quickUpdateHomecoming('${h.id}', '${actionLabel}')" class="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[10px] font-bold">${actionLabel}</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    section.innerHTML = html;
    return section;
};

window.quickUpdatePermit = function(permitId, action) {
    const permit = appState.permits.find(p => p.id === permitId);
    if (!permit) return;
    
    const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === permit.nis);
    if (!santri) return;
    
    if (!confirm(`Ubah status ${santri.nama} menjadi "${action}"?`)) return;
    
    const today = window.getLocalDateStr();
    
    if (action === 'Sembuh') {
        permit.status = 'Sembuh';
        permit.recovered_date = today;
        window.showToast(`${santri.nama} sudah sembuh`, "success");
    } else if (action === 'Datang') {
        permit.status = 'Datang';
        permit.arrival_date = today;
        window.showToast(`${santri.nama} sudah hadir`, "success");
    }
    
    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    window.renderDashboardActivePermits();
    window.renderPermitList();
    window.renderAttendanceList();
    window.updateDashboard();
};

window.quickUpdateHomecoming = function(homecomingId, action) {
    const homecoming = appState.homecomings.find(h => h.id === homecomingId);
    if (!homecoming) return;
    
    const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === homecoming.nis);
    if (!santri) return;
    
    if (!confirm(`Ubah status ${santri.nama} menjadi "${action}"?`)) return;
    
    const today = window.getLocalDateStr();
    
    if (action === 'Datang') {
        homecoming.status = 'Datang';
        homecoming.arrival_date = today;
        window.showToast(`${santri.nama} sudah datang dari pulang`, "success");
    }
    
    localStorage.setItem(APP_CONFIG.homecomingKey, JSON.stringify(appState.homecomings));
    
    window.renderDashboardActivePermits();
    window.renderHomecomingList();
    window.renderAttendanceList();
    window.updateDashboard();
};

window.openExtendHomecomingModal = function(homecomingId) {
    const homecoming = appState.homecomings.find(h => h.id === homecomingId);
    if (!homecoming) return;
    
    const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === homecoming.nis);
    if (!santri) return;
    
    const modal = document.getElementById('modal-extend-homecoming');
    if (!modal) {
        console.error('Modal extend homecoming not found');
        return;
    }
    
    document.getElementById('extend-homecoming-id').value = homecomingId;
    document.getElementById('extend-homecoming-santri-name').textContent = santri.nama;
    
    const currentEndDate = homecoming.end_date || homecoming.end;
    document.getElementById('extend-homecoming-current-end').textContent = window.formatDate(currentEndDate);
    
    const suggestedDate = new Date(currentEndDate);
    suggestedDate.setDate(suggestedDate.getDate() + 3);
    document.getElementById('extend-homecoming-new-end').value = window.getLocalDateStr(suggestedDate);
    document.getElementById('extend-homecoming-reason').value = '';
    
    modal.classList.remove('hidden');
    if(window.lucide) window.lucide.createIcons();
};

window.saveExtendHomecoming = function() {
    const homecomingId = document.getElementById('extend-homecoming-id').value;
    const homecoming = appState.homecomings.find(h => h.id === homecomingId);
    if (!homecoming) return;
    
    const newEndDate = document.getElementById('extend-homecoming-new-end').value;
    const extendReason = document.getElementById('extend-homecoming-reason').value.trim();
    
    if (!newEndDate) {
        return window.showToast("Pilih tanggal akhir baru", "warning");
    }
    
    if (!extendReason) {
        return window.showToast("Alasan perpanjangan harus diisi", "warning");
    }
    
    const currentEndDate = homecoming.end_date || homecoming.end;
    if (newEndDate <= currentEndDate) {
        return window.showToast("Tanggal baru harus lebih lama dari sekarang", "warning");
    }
    
    // Update homecoming - change status from Pulang to Izin when extended
    homecoming.end_date = newEndDate;
    homecoming.status = 'Izin'; // Changed from Pulang to Izin as per requirement
    
    if (!homecoming.extensions) {
        homecoming.extensions = [];
    }
    homecoming.extensions.push({
        original_end: currentEndDate,
        new_end: newEndDate,
        reason: extendReason,
        timestamp: new Date().toISOString()
    });
    
    const extendNote = `Diperpanjang s/d ${window.formatDate(newEndDate).split(',')[1]} (${extendReason})`;
    if (homecoming.city) {
        homecoming.city += ` | ${extendNote}`;
    }
    
    localStorage.setItem(APP_CONFIG.homecomingKey, JSON.stringify(appState.homecomings));
    
    window.showToast(`Pulang diperpanjang hingga ${window.formatDate(newEndDate).split(',')[1]} (status: Izin)`, "success");
    
    document.getElementById('modal-extend-homecoming').classList.add('hidden');
    
    window.renderDashboardActivePermits();
    window.renderHomecomingList();
    window.renderAttendanceList();
    window.updateDashboard();
};

// ==========================================
// FITUR PERPULANGAN MANAGEMENT (LIKE PERIZINAN)
// ==========================================

window.openHomecomingModal = function() {
    // DEPRECATED: Homecoming functionality has been moved to Permit View with type "Pulang"
    console.warn('openHomecomingModal is deprecated. Use openPermitView with type "Pulang" instead.');
    return;
    
    if(!appState.selectedClass) return window.showToast("Pilih kelas terlebih dahulu!", "warning");
    
    const modal = document.getElementById('modal-homecoming');
    
    // 1. Reset Form Tanggal ke Hari Ini
    const today = appState.date;
    document.getElementById('homecoming-start').value = today;
    document.getElementById('homecoming-end').value = today;
    document.getElementById('homecoming-city').value = '';
    document.getElementById('homecoming-transport').value = 'Jemputan';
    
    // 2. Reset Pencarian
    const searchInput = document.getElementById('homecoming-search-santri');
    if(searchInput) searchInput.value = '';
    
    // 3. Render Checklist Santri
    window.renderHomecomingChecklist(FILTERED_SANTRI);
    window.updateHomecomingCount();

    // 4. Render List Perpulangan yang sudah ada
    window.renderHomecomingList();
    
    if(modal) {
        modal.classList.remove('hidden');
        if(window.lucide) window.lucide.createIcons();
    }
};

window.renderHomecomingChecklist = function(list) {
    const container = document.getElementById('homecoming-santri-checklist');
    if(!container) return;
    container.innerHTML = '';

    list.forEach(s => {
        const id = String(s.nis || s.id);
        const div = document.createElement('label');
        div.className = 'flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-indigo-500 transition-all group select-none';
        div.innerHTML = `
            <input type="checkbox" name="homecoming_santri_select" value="${id}" checked onchange="window.updateHomecomingCount()" class="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 rounded-md cursor-pointer accent-indigo-500">
            <span class="text-xs font-bold text-slate-600 dark:text-slate-300 truncate group-hover:text-slate-800 dark:group-hover:text-white">${s.nama}</span>
        `;
        container.appendChild(div);
    });
};

window.filterHomecomingSantri = function(val) {
    const search = val.toLowerCase();
    const filtered = FILTERED_SANTRI.filter(s => s.nama.toLowerCase().includes(search));
    window.renderHomecomingChecklist(filtered);
};

window.updateHomecomingCount = function() {
    const checked = document.querySelectorAll('input[name="homecoming_santri_select"]:checked').length;
    const el = document.getElementById('homecoming-selected-count');
    if(el) el.textContent = checked;
};

window.saveHomecoming = function() {
    // Ambil santri yang dicentang
    const checkboxes = document.querySelectorAll('input[name="homecoming_santri_select"]:checked');
    const selectedNis = Array.from(checkboxes).map(cb => cb.value);

    const city = document.getElementById('homecoming-city').value;
    const transport = document.getElementById('homecoming-transport').value;
    const start = document.getElementById('homecoming-start').value;
    const end = document.getElementById('homecoming-end').value;

    if(selectedNis.length === 0) return window.showToast("Pilih minimal 1 santri", "warning");
    if(!start || !end) return window.showToast("Lengkapi tanggal", "warning");
    if(start > end) return window.showToast("Tanggal mulai tidak boleh > kembali", "warning");

    // Simpan data per santri
    let count = 0;
    selectedNis.forEach(nis => {
        const newHomecoming = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7), // ID Unik
            nis: nis,
            city: city || 'Pulang',
            transport: transport,
            start_date: start,  // Changed from 'start' to 'start_date'
            end_date: end,      // Changed from 'end' to 'end_date'
            status: 'Pulang',   // NEW: Initial status
            arrival_date: null, // NEW: Will be set when student returns
            timestamp: new Date().toISOString()
        };
        appState.homecomings.push(newHomecoming);
        count++;
    });

    localStorage.setItem(APP_CONFIG.homecomingKey, JSON.stringify(appState.homecomings));
    
    window.showToast(`${count} data perpulangan berhasil disimpan`, "success");
    window.renderHomecomingList(); 
    
    // Uncheck semua setelah simpan
    checkboxes.forEach(cb => cb.checked = false);
    window.updateHomecomingCount();

    // Refresh dashboard jika tanggal relevan
    if (appState.date >= start && appState.date <= end) {
        window.renderAttendanceList(); 
        window.updateDashboard();
    }
};

window.deleteHomecoming = function(id) {
    if(!confirm("Hapus data perpulangan ini? Status akan dikembalikan ke default.")) return;
    
    appState.homecomings = appState.homecomings.filter(h => h.id !== id);
    localStorage.setItem(APP_CONFIG.homecomingKey, JSON.stringify(appState.homecomings));
    
    window.renderHomecomingList();
    window.showToast("Data perpulangan dihapus", "info");
    
    // Trigger re-render untuk menjalankan logika RESET
    window.renderAttendanceList();
    window.updateDashboard();
};

window.renderHomecomingList = function() {
    const container = document.getElementById('homecoming-list-container');
    container.innerHTML = '';
    
    const classNisList = FILTERED_SANTRI.map(s => String(s.nis || s.id));
    const activeHomecomings = appState.homecomings.filter(h => classNisList.includes(h.nis));

    if(activeHomecomings.length === 0) {
        container.innerHTML = '<div class="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p class="text-xs text-slate-400 font-bold">Belum ada data perpulangan aktif</p></div>';
        return;
    }

    activeHomecomings.forEach(h => {
        const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === h.nis);
        if(!santri) return;

        const div = document.createElement('div');
        div.className = 'p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm';
        div.innerHTML = `
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-800 dark:text-white text-sm truncate">${santri.nama}</h4>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">🚌 ${h.city}</span>
                    <span class="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">${h.transport}</span>
                    <span class="text-[10px] font-bold text-slate-400">${window.formatDate(h.start)} - ${window.formatDate(h.end)}</span>
                </div>
            </div>
            <button onclick="window.deleteHomecoming('${h.id}')" class="ml-3 p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shrink-0">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        container.appendChild(div);
    });
    if(window.lucide) window.lucide.createIcons();
};

window.checkActiveHomecoming = function(nis, dateStr) {
    const homecoming = appState.homecomings.find(h => {
        const isNisMatch = h.nis === String(nis);
        if (!isNisMatch) return false;
        
        // Handle backward compatibility
        const startDate = h.start_date || h.start;
        const endDate = h.end_date || h.end;
        const status = h.status || 'Pulang'; // Default to Pulang if no status
        
        // If student has already returned, homecoming is not active
        if (status === 'Datang') {
            return false;
        }
        
        // Check if within homecoming date range
        const isDateMatch = dateStr >= startDate && dateStr <= endDate;
        if (!isDateMatch) {
            // Date is after end_date - check for auto-Alpa
            if (dateStr > endDate && status === 'Pulang') {
                // Auto-transition to Alpa
                h.status = 'Alpa';
                // Save the update
                localStorage.setItem(APP_CONFIG.homecomingKey, JSON.stringify(appState.homecomings));
                return true; // Still return homecoming but status is now Alpa
            }
            return false;
        }
        
        return true;
    });
    
    return homecoming;
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

    // --- INIT COUNTERS ---
    let stats = {
        fardu: { h:0, m:0, total:0 }, // m = masalah (s/i/a)
        kbm: { h:0, m:0, total:0 },
        sunnah: { y:0, t:0, total:0 }
    };

    // --- LOOP DATES ---
    // Loop dari start date sampai end date
    let curr = new Date(range.start);
    const end = new Date(range.end);
    
    // Safety break loop (max 366 days)
    let loopGuard = 0;

    while(curr <= end && loopGuard < 370) {
        // Generate safe date key (YYYY-MM-DD) using local time components
        // to avoid timezone issues with toISOString()
        const y = curr.getFullYear();
        const m = String(curr.getMonth()+1).padStart(2,'0');
        const d = String(curr.getDate()).padStart(2,'0');
        const safeDateKey = `${y}-${m}-${d}`;

        const dayData = appState.attendanceData[safeDateKey];
        const dayNum = curr.getDay(); // 0-6

        if (dayData) {
            Object.values(SLOT_WAKTU).forEach(slot => {
                const sData = dayData[slot.id]?.[santriId];
                if(sData) {
                    slot.activities.forEach(act => {
                        // Skip jika kegiatan tidak ada di hari ini
                        if(act.showOnDays && !act.showOnDays.includes(dayNum)) return;

                        const st = sData.status[act.id];
                        if(!st) return;

                        // Logic Kategori
                        if(act.category === 'fardu') {
                            stats.fardu.total++;
                            if(st === 'Hadir' || st === 'Pulang') stats.fardu.h++;
                            else stats.fardu.m++;
                        }
                        else if(act.category === 'kbm') {
                            stats.kbm.total++;
                            if(st === 'Hadir' || st === 'Pulang') stats.kbm.h++;
                            else stats.kbm.m++;
                        }
                        else if(act.category === 'sunnah' || act.category === 'dependent') {
                            // Dependent (rawatib) kita anggap sunnah di analisis ini
                            stats.sunnah.total++;
                            if(st === 'Ya' || st === 'Hadir' || st === 'Pulang') stats.sunnah.y++;
                            else stats.sunnah.t++;
                        }
                    });
                }
            });
        }
        
        // Next Day
        curr.setDate(curr.getDate() + 1);
        loopGuard++;
    }

    // --- RENDER STATS ---
    window.renderBar('fardu', stats.fardu.h, stats.fardu.m);
    window.renderBar('kbm', stats.kbm.h, stats.kbm.m);
    window.renderBar('sunnah', stats.sunnah.y, stats.sunnah.t); // y=Yes, t=No

    // --- TOTAL SCORE ---
    // Bobot: Fardu (50%), KBM (30%), Sunnah (20%)
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
    
    // Teks Kesimpulan
    const elVerdict = document.getElementById('anl-verdict');
    if(finalScore >= 90) { elVerdict.textContent = "Mumtaz (Sangat Baik)"; elVerdict.className = "text-sm font-bold text-emerald-500"; }
    else if(finalScore >= 75) { elVerdict.textContent = "Jayyid (Baik)"; elVerdict.className = "text-sm font-bold text-blue-500"; }
    else if(finalScore >= 60) { elVerdict.textContent = "Maqbul (Cukup)"; elVerdict.className = "text-sm font-bold text-amber-500"; }
    else { elVerdict.textContent = "Naqis (Kurang)"; elVerdict.className = "text-sm font-bold text-red-500"; }

    // Persentase Kategori
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

window.renderTodayProblems = function() {
    const container = document.getElementById('dashboard-problem-list');
    const badge = document.getElementById('problem-count-badge');
    if(!container) return;

    container.innerHTML = '';
    
    if (!appState.selectedClass || FILTERED_SANTRI.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-xs text-slate-400">Pilih kelas dahulu</div>';
        if(badge) badge.classList.add('hidden');
        return;
    }

    const dateKey = appState.date;
    const data = appState.attendanceData[dateKey];
    let problems = [];

    // Kumpulkan Data Masalah
    if (data) {
        Object.values(SLOT_WAKTU).forEach(slot => {
            if (data[slot.id]) {
                FILTERED_SANTRI.forEach(s => {
                    const id = String(s.nis || s.id);
                    const st = data[slot.id][id]?.status?.shalat; // Cek status utama
                    if (st === 'Alpa' || st === 'Sakit' || st === 'Izin') {
                        problems.push({
                            nama: s.nama,
                            slot: slot.label,
                            status: st,
                            note: data[slot.id][id]?.note || '-',
                            slotTheme: slot.theme
                        });
                    }
                });
            }
        });
    }

    // Render Badge Count
    if(badge) {
        if(problems.length > 0) {
            badge.textContent = `${problems.length} Kasus`;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Render Empty State
    if (problems.length === 0) {
        container.innerHTML = `
        <div class="glass-card p-4 rounded-2xl flex items-center justify-center gap-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
            <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-500"></i>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">Alhamdulillah, nihil masalah hari ini!</span>
        </div>`;
        if(window.lucide) window.lucide.createIcons();
        return;
    }

    // Render List
    const fragment = document.createDocumentFragment();
    problems.forEach(p => {
        const div = document.createElement('div');
        div.className = 'bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-start shadow-sm';
        
        // Warna status
        let stClass = 'bg-slate-100 text-slate-600';
        if(p.status === 'Sakit') stClass = 'bg-amber-100 text-amber-600';
        else if(p.status === 'Izin') stClass = 'bg-blue-100 text-blue-600';
        else if(p.status === 'Alpa') stClass = 'bg-red-100 text-red-600';

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-${p.slotTheme}-100 dark:bg-${p.slotTheme}-900/30 flex items-center justify-center text-${p.slotTheme}-600">
                    <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 dark:text-white text-xs">${p.nama}</h4>
                    <p class="text-[10px] text-slate-500">${p.slot} • ${p.note !== '-' ? p.note : 'Tanpa Ket.'}</p>
                </div>
            </div>
            <span class="px-2 py-1 rounded-md text-[10px] font-black uppercase ${stClass}">${p.status}</span>
        `;
        fragment.appendChild(div);
    });
    container.appendChild(fragment);
    if(window.lucide) window.lucide.createIcons();
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
            resolve(true); // Bypass jika fitur dimatikan
            return;
        }

        if (!navigator.geolocation) {
            reject("Browser tidak mendukung GPS.");
            return;
        }

        // Tampilkan loading toast manual karena proses GPS bisa 1-5 detik
        const toastId = window.showToast("📡 Sedang memeriksa lokasi GPS...", "info", true); 

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                let isInside = false;
                let nearestDist = 9999999;

                // Cek jarak ke setiap titik target
                GEO_CONFIG.locations.forEach(loc => {
                    const dist = window.getDistanceFromLatLonInMeters(userLat, userLng, loc.lat, loc.lng);
                    if (dist < nearestDist) nearestDist = dist;
                    
                    if (dist <= GEO_CONFIG.maxRadiusMeters) {
                        isInside = true;
                    }
                });

                // Hapus toast loading (logika hapus toast perlu penyesuaian sedikit jika showToast return ID, 
                // tapi untuk simplisitas kita biarkan tertimpa toast baru)

                if (isInside) {
                    resolve(true);
                } else {
                    reject(`Lokasi Anda terlalu jauh (${Math.round(nearestDist)}m). Harap mendekat ke titik absen.`);
                }
            },
            (error) => {
                let msg = "Gagal mendeteksi lokasi.";
                if(error.code === 1) msg = "Izin lokasi ditolak. Aktifkan GPS browser.";
                else if(error.code === 2) msg = "Sinyal GPS tidak ditemukan.";
                else if(error.code === 3) msg = "Waktu deteksi GPS habis.";
                reject(msg);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
};

// Fungsi Pengirim Paket ke Gudang (Supabase)
window.syncToSupabase = async function() {
    // Cek apakah ada data hari ini untuk dikirim
    const dateKey = appState.date;
    const slotId = appState.currentSlotId;
    const classId = appState.selectedClass;

    if (!dateKey || !slotId || !classId) return;

    const dayData = appState.attendanceData[dateKey]?.[slotId];
    if (!dayData) return;

    // Ambil Email Musyrif yang sedang login (untuk info siapa yang ngisi)
    const musyrifEmail = appState.userProfile ? appState.userProfile.email : 'manual-pin';

    // Loop semua santri yang sudah diabsen hari ini
    const updates = [];
    Object.keys(dayData).forEach(studentId => {
        const studentData = dayData[studentId];
        
        // Siapkan paket data
        updates.push({
            date: dateKey,
            class_name: classId,
            slot: slotId,
            student_id: studentId,
            activity_data: studentData, // Simpan status H/S/I beserta catatannya
            musyrif_email: musyrifEmail
        });
    });

    if (updates.length === 0) return;

    // KIRIM PAKET! (Upsert = Update jika ada, Insert jika belum ada)
    const { error } = await dbClient
        .from('attendance')
        .upsert(updates, { onConflict: 'date, class_name, slot, student_id' });

    if (error) {
        console.error("Gagal kirim ke Supabase:", error);
        // Jangan ganggu user dengan popup error terus menerus, cukup di console
    } else {
        console.log("✅ Data tersimpan di Awan (Supabase)");
    }
};

// --- FITUR SINKRONISASI (READ) ---
window.fetchAttendanceFromSupabase = async function() {
    const classId = appState.selectedClass;
    const dateKey = appState.date;

    if (!classId || !dateKey) return;

    // Tampilkan indikator loading kecil (opsional) di console
    console.log("🔄 Syncing from Cloud...");

    try {
        // 1. Ambil data dari tabel 'attendance' sesuai Kelas & Tanggal
        const { data, error } = await dbClient
            .from('attendance')
            .select('*')
            .eq('class_name', classId)
            .eq('date', dateKey);

        if (error) throw error;

        if (data && data.length > 0) {
            // 2. Masukkan data dari Cloud ke State Aplikasi
            if (!appState.attendanceData[dateKey]) {
                appState.attendanceData[dateKey] = {};
            }

            data.forEach(row => {
                // row.slot = 'shubuh', row.student_id = '12345', row.activity_data = {status:..., note:...}
                if (!appState.attendanceData[dateKey][row.slot]) {
                    appState.attendanceData[dateKey][row.slot] = {};
                }
                
                // KITA TIMPA data lokal dengan data Cloud (Cloud is Truth)
                appState.attendanceData[dateKey][row.slot][row.student_id] = row.activity_data;
            });

            // 3. Update LocalStorage agar sinkron untuk sesi berikutnya
            localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(appState.attendanceData));

            // 4. Refresh Tampilan Dashboard agar data muncul
            window.renderSlotList();     // Refresh slot progress bar
            window.updateQuickStats();   // Refresh angka statistik
            window.drawDonutChart();     // Refresh grafik
            window.renderTodayProblems();// Refresh list masalah
            
            console.log(`✅ Berhasil load ${data.length} data dari Supabase.`);
        } else {
            console.log("☁️ Tidak ada data di Cloud untuk tanggal ini (Murni Lokal/Kosong).");
        }

    } catch (err) {
        console.error("Gagal ambil data Supabase:", err);
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

// ==========================================
// FITUR PERPULANGAN (HOMECOMING)
// ==========================================

let hcState = {
    activeEvent: null,
    logs: {}, // { student_id: { status: 'Pulang', city: '...', ... } }
    filter: 'all' // all, Pulang, Mukim
};

// Helper function to check if student is currently "Pulang"
window.isStudentPulang = function(studentId, dateKey) {
    // Check if there's an active homecoming event
    if (!hcState.activeEvent) return false;
    
    try {
        // Normalize date strings to YYYY-MM-DD format for comparison
        // dateKey is already in YYYY-MM-DD format from appState.date
        const checkDateStr = dateKey;
        const startDateStr = hcState.activeEvent.start_date; // Should be YYYY-MM-DD from DB
        const endDateStr = hcState.activeEvent.end_date;     // Should be YYYY-MM-DD from DB
        
        // Simple string comparison works for YYYY-MM-DD format
        if (checkDateStr < startDateStr || checkDateStr > endDateStr) return false;
        
        // Check student's homecoming status
        const log = hcState.logs[studentId];
        return log && log.status === 'Pulang';
    } catch (e) {
        console.error('Error in isStudentPulang:', e);
        return false;
    }
};

// Load homecoming data in background (called at app startup)
window.loadHomecomingData = async function() {
    try {
        // A. Ambil Event Aktif
        const { data: events } = await dbClient
            .from('homecoming_events')
            .select('*')
            .eq('is_active', true)
            .limit(1);
            
        if(!events || events.length === 0) {
            hcState.activeEvent = null;
            hcState.logs = {};
            return;
        }
        
        hcState.activeEvent = events[0];

        // B. Ambil Data Logs
        const { data: logs } = await dbClient
            .from('homecoming_logs')
            .select('*')
            .eq('event_id', hcState.activeEvent.id);
            
        hcState.logs = {};
        if(logs) {
            logs.forEach(log => {
                hcState.logs[log.student_id] = log;
            });
        }
    } catch (e) {
        console.error("Error loading homecoming data:", e);
        hcState.activeEvent = null;
        hcState.logs = {};
    }
};

// 1. Buka Modal & Load Data
/* =========================================
   FITUR PERPULANGAN (VIEW MODE)
   ========================================= */

// 1. Buka View Halaman Penuh
window.openHomecomingView = async function() {
    // DEPRECATED: Homecoming functionality has been moved to Permit View with type "Pulang"
    console.warn('openHomecomingView is deprecated. Use openPermitView with type "Pulang" instead.');
    window.showToast("Perpulangan sekarang dikelola melalui Input Perizinan", "info");
    
    // Redirect to Permit View and pre-select Pulang
    window.openPermitView();
    setTimeout(() => {
        const typeSelect = document.getElementById('permit-view-type');
        if (typeSelect) {
            typeSelect.value = 'Pulang';
            window.togglePermitViewFields();
        }
    }, 100);
    return;
    
    if(!appState.selectedClass) return window.showToast("Pilih kelas dulu!", "warning");
    
    // Ganti View (Main -> Homecoming)
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-homecoming').classList.remove('hidden');
    
    // Reset/Loading State
    document.getElementById('hc-view-title').textContent = "Memuat...";
    document.getElementById('hc-list-container').innerHTML = getSkeletonHTML(5); // Pakai skeleton yang sudah ada
    
    // Reload fresh data
    await window.loadHomecomingData();
    
    if(!hcState.activeEvent) {
        document.getElementById('hc-view-title').textContent = "Tidak Ada Event";
        document.getElementById('hc-view-date').textContent = "-";
        document.getElementById('hc-list-container').innerHTML = `
            <div class="text-center py-12">
                <div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="calendar-off" class="w-8 h-8 text-slate-300"></i>
                </div>
                <p class="text-sm font-bold text-slate-400">Belum ada jadwal perpulangan aktif.</p>
                <button onclick="window.manageEvents()" class="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">Buat Jadwal</button>
            </div>`;
        if(window.lucide) window.lucide.createIcons();
        return;
    }
    
    document.getElementById('hc-view-title').textContent = hcState.activeEvent.title;
    document.getElementById('hc-view-date').textContent = `${window.formatDate(hcState.activeEvent.start_date)} - ${window.formatDate(hcState.activeEvent.end_date)}`;

    // C. Render List
    window.renderHomecomingList();
};

// 2. Tutup View (Kembali ke Dashboard)
window.closeHomecomingView = function() {
    document.getElementById('view-homecoming').classList.add('hidden');
    document.getElementById('view-main').classList.remove('hidden');
    window.updateDashboard(); // Optional: Refresh dashboard
};

// 3. Render List (Update UI agar lebih rapi di View)
window.renderHomecomingList = function() {
    const container = document.getElementById('hc-list-container');
    const search = document.getElementById('hc-search').value.toLowerCase();
    container.innerHTML = '';
    
    let countMukim = 0;
    let countPulang = 0;

    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        const log = hcState.logs[id] || { status: 'Mukim' };
        
        // Hitung Statistik
        if(log.status === 'Pulang') countPulang++; else countMukim++;

        // Filter Logic
        if(hcState.filter !== 'all' && log.status !== hcState.filter) return;
        if(!s.nama.toLowerCase().includes(search)) return;

        // Styling
        const isPulang = log.status === 'Pulang';
        const cardClass = isPulang 
            ? 'bg-white dark:bg-slate-800 border-l-4 border-l-indigo-500' 
            : 'bg-white dark:bg-slate-800 border-l-4 border-l-slate-200 dark:border-l-slate-700';
            
        // Icon & Info
        const iconInfo = isPulang 
            ? `<div class="flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold mt-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded w-fit">
                 <i data-lucide="bus" class="w-3 h-3"></i> ${log.kota_tujuan || 'Pulang'}
               </div>`
            : `<div class="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-1 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded w-fit">
                 <i data-lucide="home" class="w-3 h-3"></i> Mukim di Pondok
               </div>`;
        
        // Badge Kedatangan
        let arrivalBadge = '';
        if(isPulang) {
            if(log.status_kedatangan === 'Tepat Waktu') arrivalBadge = '<div class="absolute top-3 right-3 text-emerald-500"><i data-lucide="check-circle-2" class="w-5 h-5"></i></div>';
            else if(log.status_kedatangan === 'Terlambat') arrivalBadge = '<div class="absolute top-3 right-3 text-red-500"><i data-lucide="alert-circle" class="w-5 h-5"></i></div>';
            else arrivalBadge = '<div class="absolute top-3 right-3 text-slate-300"><i data-lucide="clock" class="w-5 h-5"></i></div>';
        }

        const div = document.createElement('div');
        div.className = `${cardClass} p-4 rounded-xl shadow-sm border-y border-r border-slate-100 dark:border-slate-700 relative active:scale-[0.98] transition-transform cursor-pointer`;
        div.onclick = () => window.openHcEdit(id);
        
        div.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-500">
                    ${s.nama.substring(0,2).toUpperCase()}
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">${s.nama}</h4>
                    <p class="text-[10px] text-slate-400">${s.asrama || s.kelas}</p>
                    ${iconInfo}
                </div>
            </div>
            ${arrivalBadge}
        `;
        container.appendChild(div);
    });

    // Update Angka Statistik
    document.getElementById('hc-stat-mukim').textContent = countMukim;
    document.getElementById('hc-stat-pulang').textContent = countPulang;
    
    if(window.lucide) window.lucide.createIcons();
};

// 4. Update Tab UI (Filter)
window.filterHcList = function(type) {
    hcState.filter = type;
    document.querySelectorAll('.hc-tab').forEach(btn => {
        if(btn.dataset.filter === type) {
            btn.classList.remove('text-slate-400', 'hover:bg-slate-50');
            btn.classList.add('bg-indigo-50', 'text-indigo-600', 'shadow-sm');
        } else {
            btn.classList.add('text-slate-400', 'hover:bg-slate-50');
            btn.classList.remove('bg-indigo-50', 'text-indigo-600', 'shadow-sm');
        }
    });
    window.renderHomecomingList();
};

// 5. Update tombol Sync agar refresh halaman View
window.syncHomecoming = function() {
    window.openHomecomingView(); 
    window.showToast("Data disinkronkan", "info");
};

// 4. Edit Santri
window.openHcEdit = function(studentId) {
    const santri = FILTERED_SANTRI.find(s => String(s.nis || s.id) === studentId);
    if(!santri) return;

    const log = hcState.logs[studentId] || {};

        // Di dalam window.openHcEdit (Baris ~1572)
    const arrivalEl = document.getElementById('hc-edit-arrival');
    if(arrivalEl) {
        arrivalEl.value = log.status_kedatangan || 'Belum';
    }
    
    document.getElementById('modal-hc-edit').classList.remove('hidden');
    document.getElementById('hc-edit-name').textContent = santri.nama;
    document.getElementById('hc-edit-id').value = studentId;
    
    // Set Value Form
    document.getElementById('hc-edit-status').value = log.status || 'Mukim';
    document.getElementById('hc-edit-city').value = log.kota_tujuan || '';
    document.getElementById('hc-edit-transport').value = log.transportasi || 'Jemputan';
    document.getElementById('hc-edit-arrival').value = log.status_kedatangan || 'Belum';
    
    window.toggleHcInputs();
};

window.toggleHcInputs = function() {
    const status = document.getElementById('hc-edit-status').value;
    const group = document.getElementById('hc-input-group');
    if(status === 'Pulang') group.classList.remove('hidden');
    else group.classList.add('hidden');
};

// 1. Fungsi Simpan Data Santri (Versi Final & Bersih)
window.saveHcStudent = async function() {
    const studentId = document.getElementById('hc-edit-id').value;
    const status = document.getElementById('hc-edit-status').value;
    
    // Inisialisasi object log jika belum ada di state lokal
    if(!hcState.logs[studentId]) {
        hcState.logs[studentId] = { 
            student_id: studentId, 
            event_id: hcState.activeEvent.id 
        };
    }
    
    // Copy object agar tidak merusak referensi langsung sebelum sukses
    const log = { ...hcState.logs[studentId] };
    log.status = status;
    
    // --- LOGIKA KHUSUS STATUS PULANG ---
    if(status === 'Pulang') {
        log.kota_tujuan = document.getElementById('hc-edit-city').value;
        log.transportasi = document.getElementById('hc-edit-transport').value;
        
        // Cek Input Kedatangan (Prioritas: Input Manual > Auto Scan)
        const manualArrival = document.getElementById('hc-edit-arrival').value;
        const autoStatus = document.getElementById('hc-final-status').value;
        
        // Gunakan hasil scan jika user baru saja melakukan scan dan belum ubah manual
        // Atau default ke apa yang dipilih di dropdown
        log.status_kedatangan = manualArrival;

        // --- LOGIKA PENYIMPANAN ALASAN TERLAMBAT ---
        // Jika statusnya terlambat, kita cek apakah ada alasan yang dipilih
        if (log.status_kedatangan === 'Terlambat') {
            const reasonBox = document.getElementById('hc-late-reason');
            if (reasonBox && reasonBox.value) {
                const reason = reasonBox.value;
                // Hack: Simpan alasan di dalam teks 'kota_tujuan' agar tersimpan di DB
                // Format: "Surabaya (Alasan: Macet)"
                if (log.kota_tujuan && !log.kota_tujuan.includes('(Alasan:')) {
                    log.kota_tujuan = `${log.kota_tujuan} (Alasan: ${reason})`;
                }
            }
        }
    } else {
        // Reset data jika status diubah jadi Mukim
        log.kota_tujuan = null;
        log.transportasi = null;
        log.status_kedatangan = 'Belum';
    }

    // Tampilkan Loading pada tombol
    const btnSave = document.querySelector('#modal-hc-edit button.bg-indigo-500');
    const originalText = btnSave ? btnSave.textContent : 'Simpan';
    if(btnSave) {
        btnSave.textContent = "Menyimpan...";
        btnSave.disabled = true;
    }

    // Kirim ke Supabase
    const { error } = await dbClient
        .from('homecoming_logs')
        .upsert(log, { onConflict: 'event_id, student_id' });
        
    // Kembalikan Tombol
    if(btnSave) {
        btnSave.textContent = originalText;
        btnSave.disabled = false;
    }

    if(error) {
        console.error(error);
        window.showToast("Gagal simpan: " + error.message, "error");
    } else {
        // Sukses: Update State Lokal & UI
        hcState.logs[studentId] = log; // Update state asli
        window.showToast("Data tersimpan ✅", "success");
        document.getElementById('modal-hc-edit').classList.add('hidden');
        window.renderHomecomingList(); // Refresh list
    }
};

// ==========================================
// MANAJEMEN EVENT (PERBAIKAN FULL)
// ==========================================

window.manageEvents = async function() {
    const modal = document.getElementById('modal-event-manager');
    if(modal) modal.classList.remove('hidden');
    window.loadEventList();
};

window.loadEventList = async function() {
    const container = document.getElementById('event-list-container');
    container.innerHTML = '<div class="flex justify-center p-4"><span class="loading-spinner"></span></div>';

    const { data, error } = await dbClient
        .from('homecoming_events')
        .select('*')
        .order('created_at', { ascending: false });

    if(error || !data) {
        container.innerHTML = '<p class="text-center text-xs text-red-400">Gagal memuat data.</p>';
        return;
    }

    container.innerHTML = '';
    
    if(data.length === 0) {
        container.innerHTML = '<p class="text-center text-xs text-slate-400 py-4">Belum ada jadwal dibuat.</p>';
        return;
    }

    data.forEach(evt => {
        const isActive = evt.is_active;
        const div = document.createElement('div');
        // Styling beda untuk yang aktif
        div.className = `p-3 rounded-xl border ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100'} flex justify-between items-center transition-all`;
        
        div.innerHTML = `
            <div class="flex-1 min-w-0 pr-2">
                <div class="flex items-center gap-2">
                    <h4 class="text-xs font-bold ${isActive ? 'text-indigo-700' : 'text-slate-700'} truncate">${evt.title}</h4>
                    ${isActive ? '<span class="text-[8px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded">AKTIF</span>' : ''}
                </div>
                <p class="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <i data-lucide="calendar" class="w-3 h-3"></i> 
                    ${window.formatDate(evt.start_date)} - ${window.formatDate(evt.end_date)}
                </p>
                <p class="text-[10px] font-bold text-red-400 mt-0.5">
                    Deadline: ${evt.deadline_time ? evt.deadline_time.slice(0,5) : '17:00'}
                </p>
            </div>
            <div class="flex gap-1 shrink-0">
                <button onclick="window.editEvent('${evt.id}')" class="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                    <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                </button>
                
                <button onclick="window.deleteEvent('${evt.id}')" class="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>

                ${!isActive ? `
                <button onclick="window.activateEvent('${evt.id}')" class="p-2 bg-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-200 transition-colors" title="Aktifkan Event Ini">
                    <i data-lucide="power" class="w-3.5 h-3.5"></i>
                </button>` : ''}
            </div>
        `;
        container.appendChild(div);
    });
    
    if(window.lucide) window.lucide.createIcons();
};

window.saveEvent = async function() {
    const id = document.getElementById('evt-id').value;
    const title = document.getElementById('evt-title').value;
    const start = document.getElementById('evt-start').value;
    const end = document.getElementById('evt-end').value;
    const deadline = document.getElementById('evt-deadline').value;

    // 1. Validasi Input Dasar
    if(!title || !start || !end || !deadline) return window.showToast("Lengkapi semua data!", "warning");

    // 2. Validasi Logika Tanggal (Fix Bug C)
    if(new Date(start) > new Date(end)) {
        return window.showToast("Tanggal mulai tidak boleh lebih akhir dari tanggal balik!", "error");
    }

    const payload = { 
        title, 
        start_date: start, 
        end_date: end, 
        deadline_time: deadline 
    };

    // Tombol Loading State
    const btnSave = document.querySelector('#modal-event-manager button.bg-indigo-600');
    if(btnSave) {
        btnSave.textContent = "Menyimpan...";
        btnSave.disabled = true;
    }

    let error;
    
    if(id) {
        // --- MODE UPDATE ---
        const res = await dbClient.from('homecoming_events').update(payload).eq('id', id);
        error = res.error;
    } else {
        // --- MODE CREATE BARU ---
        // Agar aman, kita insert dulu sebagai TIDAK AKTIF (is_active: false)
        // User harus mengaktifkannya manual agar logic 'matikan yang lain' berjalan atomic di fungsi activate
        // Atau kita biarkan logic lama tapi sadar risikonya.
        
        // Versi Aman: Insert dulu, nanti user klik tombol 'Power' untuk aktifkan
        const res = await dbClient.from('homecoming_events').insert({ ...payload, is_active: false }); 
        error = res.error;
        
        if(!error) window.showToast("Event dibuat. Silakan klik tombol Power untuk mengaktifkan.", "info");
    }

    // Kembalikan Tombol
    if(btnSave) {
        btnSave.textContent = "Simpan Event";
        btnSave.disabled = false;
    }

    if(error) {
        console.error(error);
        window.showToast("Gagal: " + error.message, "error");
    } else {
        if(id) window.showToast("Perubahan disimpan", "success");
        window.resetEventForm();
        window.loadEventList();
        
                // UPDATE BAGIAN INI:
        const hcView = document.getElementById('view-homecoming');
        if(hcView && !hcView.classList.contains('hidden')) {
            window.openHomecomingView(); // Refresh halaman view
        }
        
        // ----------------------------------------------------
    }
};

window.editEvent = async function(id) {
    // Reset dulu form biar bersih
    window.resetEventForm();
    
    const { data, error } = await dbClient.from('homecoming_events').select('*').eq('id', id).single();
    
    if(error) return window.showToast("Gagal mengambil data", "error");

    if(data) {
        document.getElementById('evt-id').value = data.id;
        document.getElementById('evt-title').value = data.title;
        document.getElementById('evt-start').value = data.start_date;
        document.getElementById('evt-end').value = data.end_date;
        
        // FIX BUG A: Handle format waktu & null safety
        // Ambil hanya HH:mm (5 karakter pertama)
        let timeVal = data.deadline_time || '17:00';
        if(timeVal.length > 5) timeVal = timeVal.substring(0, 5);
        
        document.getElementById('evt-deadline').value = timeVal;
    }
};

window.activateEvent = async function(id) {
    if(!confirm("Aktifkan event ini? Event lain akan otomatis non-aktif.")) return;

    // 1. Matikan semua dulu
    await dbClient.from('homecoming_events').update({ is_active: false }).neq('id', 0);
    
    // 2. Nyalakan target
    const { error } = await dbClient.from('homecoming_events').update({ is_active: true }).eq('id', id);
    
    if(error) {
        window.showToast("Gagal mengaktifkan event", "error");
    } else {
        window.loadEventList();
        window.showToast("Event berhasil diaktifkan!", "success");
        
        // Auto refresh halaman utama juga
        const hcView = document.getElementById('view-homecoming');
        if(hcView && !hcView.classList.contains('hidden')) {
            window.openHomecomingView(); // Refresh halaman view
        }
    }
};

// FITUR BARU: HAPUS EVENT
window.deleteEvent = async function(id) {
    if(!confirm("Yakin hapus event ini? Data kehadiran santri terkait mungkin akan error.")) return;
    
    const { error } = await dbClient.from('homecoming_events').delete().eq('id', id);
    
    if(error) {
        window.showToast("Gagal menghapus: " + error.message, "error");
    } else {
        window.showToast("Event dihapus", "info");
        window.loadEventList();
    }
};

window.resetEventForm = function() {
    document.getElementById('evt-id').value = '';
    document.getElementById('evt-title').value = '';
    document.getElementById('evt-start').value = '';
    document.getElementById('evt-end').value = '';
    document.getElementById('evt-deadline').value = '17:00'; // Default value
};

// ==========================================
// LOGIKA KEDATANGAN OTOMATIS
// ==========================================

// 2. Fungsi Cek Kedatangan Otomatis (Versi Final & Timezone Fix)
window.checkArrivalAuto = function() {
    if (!hcState.activeEvent) return;
    
    const now = new Date();
    
    // Gabungkan Tanggal & Jam Deadline agar akurat
    // Asumsi: Jam deadline diinput dalam WIB, Browser user juga WIB
    const deadlineStr = `${hcState.activeEvent.end_date}T${hcState.activeEvent.deadline_time}`;
    const deadline = new Date(deadlineStr);
    
    const isLate = now > deadline;
    
    // Ambil Elemen UI
    const resultBox = document.getElementById('hc-auto-result');
    const resultText = document.getElementById('hc-result-text');
    const hiddenInput = document.getElementById('hc-final-status');
    const dropdown = document.getElementById('hc-edit-arrival');
    const reasonBox = document.getElementById('hc-late-reason-box');

    // Tampilkan Box Hasil
    if(resultBox) resultBox.classList.remove('hidden');

    if (isLate) {
        // Hitung Keterlambatan
        const diffMs = now - deadline;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        
        if(resultText) resultText.innerHTML = `<span class="text-red-500">TERLAMBAT ${diffHrs}J ${diffMins}M</span>`;
        
        // Update Hidden Input & Dropdown
        if(hiddenInput) hiddenInput.value = 'Terlambat';
        if(dropdown) dropdown.value = 'Terlambat';
        
        // Munculkan Input Alasan
        if(reasonBox) reasonBox.classList.remove('hidden');
        
        // Efek Getar HP
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
    } else {
        // Tepat Waktu
        if(resultText) resultText.innerHTML = `<span class="text-emerald-500">TEPAT WAKTU (AMAN) ✅</span>`;
        
        if(hiddenInput) hiddenInput.value = 'Tepat Waktu';
        if(dropdown) dropdown.value = 'Tepat Waktu';
        
        // Sembunyikan Input Alasan
        if(reasonBox) reasonBox.classList.add('hidden');
        
        if(navigator.vibrate) navigator.vibrate(50);
    }
};
