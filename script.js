// File: script.js

// ==========================================
// CONFIG & CONSTANTS
// ==========================================
const APP_CONFIG = {
    storageKey: 'musyrif_app_v5_fix',
    pinDefault: '1234',
    activityLogKey: 'musyrif_activity_log',
    settingsKey: 'musyrif_settings'
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
// SLOT & STATUS CONFIGURATION
// ==========================================
const SLOT_WAKTU = {
    shubuh: { 
        id: 'shubuh', label: 'Shubuh', subLabel: '04:00 - 06:00', theme: 'emerald', 
        startHour: 4, 
        activities: [
            { id: 'shalat', label: 'Shubuh', type: 'mandator' },
            { id: 'qabliyah', label: 'Qabliyah', type: 'sunnah' },
            { id: 'tahfizh', label: 'Tahfizh', type: 'mandator' },
            { id: 'dzikir_pagi', label: 'Dzikir', type: 'sunnah' },
            { id: 'tahajjud', label: 'Tahajjud', type: 'sunnah' },
            { id: 'conversation', label: 'Conver', type: 'mandator', showOnDays: [0] } // 0 = Minggu
    ]},
    ashar: { 
        id: 'ashar', label: 'Ashar', subLabel: '15:00 - 17:00', theme: 'orange', 
        startHour: 15, 
        activities: [
            { id: 'shalat', label: 'Ashar', type: 'mandator' },
            { id: 'dzikir_petang', label: 'Dzikir', type: 'sunnah' }
    ]},
    maghrib: { 
        id: 'maghrib', label: 'Maghrib', subLabel: '18:00 - 19:00', theme: 'indigo', 
        startHour: 18, 
        activities: [
            { id: 'shalat', label: 'Maghrib', type: 'mandator' },
            { id: 'bakdiyah', label: 'Ba\'diyah', type: 'sunnah' },
            { id: 'tahsin', label: 'Tahsin', type: 'mandator', showOnDays: [4, 5] }, // Kamis, Jumat
            { id: 'conversation', label: 'Conver', type: 'mandator', showOnDays: [3] }, // Rabu
            { id: 'vocabularies', label: 'Vocab', type: 'mandator', showOnDays: [1, 2] }, // Senin, Selasa
            { id: 'puasa', label: 'Puasa', type: 'sunnah' }
    ]},
    isya: { 
        id: 'isya', label: 'Isya', subLabel: '19:00 - 21:00', theme: 'slate', 
        startHour: 19, 
        activities: [
            { id: 'shalat', label: 'Isya', type: 'mandator' },
            { id: 'bakdiyah', label: 'Ba\'diyah', type: 'sunnah' },
            { id: 'alkahfi', label: 'Al-Kahfi', type: 'sunnah', showOnDays: [4] } // Kamis Malam
    ]}
};

const STATUS_UI = {
    'Hadir': { class: 'bg-emerald-500 text-white border-emerald-500', label: 'H' },
    'Ya': { class: 'bg-emerald-500 text-white border-emerald-500', label: 'Y' },
    'Sakit': { class: 'bg-amber-100 text-amber-600 border-amber-300', label: 'S' },
    'Izin': { class: 'bg-blue-100 text-blue-600 border-blue-300', label: 'I' },
    'Alpa': { class: 'bg-red-50 text-red-500 border-red-200', label: 'A' },
    'Tidak': { class: 'bg-slate-100 text-slate-300 border-slate-200', label: '-' }
};

// ==========================================
// 1. INIT & STARTUP
// ==========================================

window.initApp = async function() {
    const loadingEl = document.getElementById('view-loading');
    
    // Load Settings & Theme
    try {
        const savedSettings = localStorage.getItem(APP_CONFIG.settingsKey);
        if(savedSettings) {
            appState.settings = { ...appState.settings, ...JSON.parse(savedSettings) };
            if(appState.settings.darkMode) document.documentElement.classList.add('dark');
        }

        // Load Main Data
        const savedData = localStorage.getItem(APP_CONFIG.storageKey);
        if(savedData) appState.attendanceData = JSON.parse(savedData);

        const savedLog = localStorage.getItem(APP_CONFIG.activityLogKey);
        if(savedLog) appState.activityLog = JSON.parse(savedLog);
    } catch (e) {
        console.error("Storage Error:", e);
        localStorage.clear(); // Extreme recovery if JSON corrupt
    }

    // Determine Logic
    appState.currentSlotId = window.determineCurrentSlot();

    // Fetch External Data
    try {
        if (!window.loadClassData || !window.loadSantriData) {
            throw new Error("Library data belum termuat.");
        }

        const [kelasData, santriData] = await Promise.all([
            window.loadClassData(),
            window.loadSantriData()
        ]);

        MASTER_KELAS = kelasData || {};
        MASTER_SANTRI = santriData || [];

        window.populateClassDropdown();
        
        if(loadingEl) loadingEl.classList.add('opacity-0', 'pointer-events-none');

    } catch (e) {
        window.showToast("Gagal memuat data: " + e.message, 'error');
    }

    // Start UI
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

    // FILTER DATA (Lebih robust terhadap struktur data yang mungkin berbeda)
    appState.selectedClass = kelas;
    FILTERED_SANTRI = MASTER_SANTRI.filter(s => {
        const sKelas = String(s.kelas || s.rombel || "").trim();
        return sKelas === kelas;
    }).sort((a,b) => a.nama.localeCompare(b.nama));

    if(FILTERED_SANTRI.length === 0) alert("Data santri kosong untuk kelas ini.");

    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-main').classList.remove('hidden');
    
    window.updateDashboard();
    window.updateProfileInfo();
    
    const pinInput = document.getElementById('login-pin');
    if(pinInput) pinInput.value = "";
};

window.handleLogout = function() {
    appState.selectedClass = null;
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
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
};

window.renderSlotList = function() {
    const container = document.getElementById('dash-other-slots');
    if(!container) return;

    container.innerHTML = '';
    const tpl = document.getElementById('tpl-slot-item');
    const isToday = (appState.date === window.getLocalDateStr());

    // Gunakan DocumentFragment untuk performa
    const fragment = document.createDocumentFragment();

    Object.values(SLOT_WAKTU).forEach(s => {
        const clone = tpl.content.cloneNode(true);
        const item = clone.querySelector('.slot-item');
        const access = window.isSlotAccessible(s.id, appState.date);
        
        // Label & Icon
        clone.querySelector('.slot-label').textContent = s.label;
        const iconBg = clone.querySelector('.slot-icon-bg');
        const badge = clone.querySelector('.slot-status-badge');

        // Stats
        const stats = window.calculateSlotStats(s.id);
        clone.querySelector('.slot-stat-h').textContent = stats.h;
        clone.querySelector('.slot-stat-s').textContent = stats.s;
        clone.querySelector('.slot-stat-i').textContent = stats.i;
        clone.querySelector('.slot-stat-a').textContent = stats.a;

        if (access.locked) {
            item.classList.add('opacity-60', 'grayscale');
            let lockText = access.reason === 'wait' ? 'Menunggu' : 'Terkunci';
            if(access.reason === 'limit') lockText = 'Expired';
            
            badge.textContent = lockText;
            badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-500";
            iconBg.classList.add('bg-slate-100', 'text-slate-400');
            
            item.onclick = () => window.showToast(`🔒 Akses ${s.label} ${lockText}`, "error");
        } else {
            iconBg.classList.add(`bg-${s.theme}-50`, `text-${s.theme}-600`);
            
            if (stats.isFilled) {
                badge.textContent = "Sudah Presensi";
                badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400";
            } else {
                badge.textContent = "Belum Presensi";
                badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400";
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
    const elName = document.getElementById('profile-name');
    const elRole = document.getElementById('profile-role');
    
    if(appState.selectedClass && MASTER_KELAS[appState.selectedClass]) {
        if(elName) elName.textContent = MASTER_KELAS[appState.selectedClass].musyrif;
        if(elRole) elRole.textContent = "Kelas " + appState.selectedClass;
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

window.openAttendance = function() {
    const access = window.isSlotAccessible(appState.currentSlotId, appState.date);
    if (access.locked) {
        let msg = "Akses ditolak.";
        if(access.reason === 'wait') msg = "Belum masuk waktu presensi";
        if(access.reason === 'limit') msg = "Data lampau (>3 hari) terkunci.";
        if(access.reason === 'future') msg = "Belum bisa mengisi masa depan.";
        return window.showToast(msg, 'warning');
    }

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
    const currentDay = new Date(appState.date).getDay(); // 0-6

    // Ensure Structure Exists
    if(!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if(!appState.attendanceData[dateKey][slot.id]) appState.attendanceData[dateKey][slot.id] = {};
    
    const dbSlot = appState.attendanceData[dateKey][slot.id];

    // Filter Logic
    const search = appState.searchQuery.toLowerCase();
    const list = FILTERED_SANTRI.filter(s => {
        const matchName = s.nama.toLowerCase().includes(search);
        if(appState.filterProblemOnly) {
            const st = dbSlot[String(s.nis || s.id)]?.status?.shalat;
            return matchName && (st === 'Alpa' || st === 'Sakit' || st === 'Izin');
        }
        return matchName;
    });

    document.getElementById('att-santri-count').textContent = `${list.length} Santri`;

    // Templates
    const tplRow = document.getElementById('tpl-santri-row');
    const tplBtn = document.getElementById('tpl-activity-btn');
    const fragment = document.createDocumentFragment();

    list.forEach(santri => {
        const id = String(santri.nis || santri.id);
        
        // Init Empty Data
        if(!dbSlot[id]) {
            const defStatus = {};
            slot.activities.forEach(a => defStatus[a.id] = a.type === 'mandator' ? 'Hadir' : 'Ya');
            dbSlot[id] = { status: defStatus, note: '' };
        }
        
        const sData = dbSlot[id];
        const clone = tplRow.content.cloneNode(true);
        
        // Basic Info
        clone.querySelector('.santri-name').textContent = santri.nama;
        clone.querySelector('.santri-kamar').textContent = santri.asrama || santri.kelas;
        clone.querySelector('.santri-avatar').textContent = santri.nama.substring(0,2).toUpperCase();

        const btnCont = clone.querySelector('.activity-container');
        
        // Render Activity Buttons
        slot.activities.forEach(act => {
            // Filter Hari (Misal Puasa Senin Kamis)
            if (act.showOnDays && !act.showOnDays.includes(currentDay)) return;

            const bClone = tplBtn.content.cloneNode(true);
            const btn = bClone.querySelector('.btn-status');
            const lbl = bClone.querySelector('.lbl-status');
            
            const defaultVal = act.type === 'mandator' ? 'Hadir' : 'Ya';
            const curr = sData.status[act.id] || defaultVal;
            const ui = STATUS_UI[curr] || STATUS_UI['Hadir'];
            
            btn.className = `btn-status w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border-2 font-black text-lg transition-all active:scale-95 ${ui.class}`;
            btn.textContent = ui.label;
            lbl.textContent = act.label;
            
            btn.onclick = () => window.toggleStatus(id, act.id, act.type);
            btnCont.appendChild(bClone);
        });

        // Notes
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
};

window.toggleStatus = function(id, actId, type) {
    const slotId = appState.currentSlotId;
    const sData = appState.attendanceData[appState.date]?.[slotId]?.[id];
    
    if(!sData) return; // Safety

    const curr = sData.status[actId];
    let next = 'Hadir';

    // Cycle Status Logic
    if(type === 'mandator') {
        if(curr === 'Hadir') next = 'Sakit';
        else if(curr === 'Sakit') next = 'Izin';
        else if(curr === 'Izin') next = 'Alpa';
        else next = 'Hadir';
    } else {
        next = (curr === 'Ya') ? 'Tidak' : 'Ya';
    }
    
    sData.status[actId] = next;
    
    // --- DEPENDENCY LOGIC (BUG FIX) ---
    // Jika Shalat (induk) berubah, pengaruhi kegiatan sunnah
    if(actId === 'shalat') {
        const activities = SLOT_WAKTU[slotId].activities;
        const isNonHadir = ['Sakit', 'Izin', 'Alpa'].includes(next);

        activities.forEach(act => {
            if (act.id === 'shalat') return;

            // Jika Shalat tidak hadir, maka sunnah juga dianggap tidak/sakit
            if (isNonHadir) {
                sData.status[act.id] = act.type === 'mandator' ? next : 'Tidak';
            } 
            // Jika Shalat kembali Hadir, sunnah kembali ke default 'Ya' atau 'Hadir'
            // (Opsional: bisa dibiarkan status terakhirnya, tapi reset lebih aman)
            else if (next === 'Hadir') {
                sData.status[act.id] = act.type === 'mandator' ? 'Hadir' : 'Ya';
            }
        });
    }

    window.saveData();
    window.renderAttendanceList();
};

window.handleBulkAction = function(type) {
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

            if(type === 'alpa') {
                dbSlot[id].status[act.id] = act.type === 'mandator' ? 'Alpa' : 'Tidak';
            } else {
                dbSlot[id].status[act.id] = act.type === 'mandator' ? 'Hadir' : 'Ya';
            }
        });
    });
    
    window.saveData();
    window.renderAttendanceList();
    
    const msg = type === 'alpa' ? "Semua santri ditandai Alpa" : "Semua santri ditandai Hadir";
    window.showToast(msg, type === 'alpa' ? 'warning' : 'success');
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

window.showToast = function(message, type = 'info') {
    if(!appState.settings.notifications) return;
    
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = `${UI_COLORS[type] || UI_COLORS.info} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-[slideUp_0.3s_ease-out] mb-3`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'info'}" class="w-5 h-5"></i>
        <span class="font-bold">${message}</span>
    `;
    
    container.appendChild(toast);
    if(window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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
        localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(appState.attendanceData));
        
        if(appState.settings.autoSave) {
            const indicator = document.getElementById('save-indicator');
            if(indicator) {
                indicator.innerHTML = '<i data-lucide="check" class="w-5 h-5 text-emerald-500"></i>';
                if(window.lucide) window.lucide.createIcons();
                setTimeout(() => indicator.innerHTML = '', 1000);
            }
        }
    } catch (e) {
        window.showToast("Gagal menyimpan: Memori Penuh!", "error");
    }
};

window.updateQuickStats = function() {
    if(!appState.selectedClass) return;
    
    // Hitung akumulasi dari semua slot hari ini
    let stats = { h: 0, s: 0, i: 0, a: 0 };
    Object.values(SLOT_WAKTU).forEach(slot => {
         const slotStats = window.calculateSlotStats(slot.id);
         stats.h += slotStats.h;
         stats.s += slotStats.s;
         stats.i += slotStats.i;
         stats.a += slotStats.a;
    });
    
    document.getElementById('stat-hadir').textContent = stats.h;
    document.getElementById('stat-sakit').textContent = stats.s;
    document.getElementById('stat-izin').textContent = stats.i;
    document.getElementById('stat-alpa').textContent = stats.a;
};

window.drawDonutChart = function() {
    const canvas = document.getElementById('weekly-chart');
    if(!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Only resize if needed to prevent blur
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }
    
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    const percent = window.calculateGlobalStats();

    ctx.clearRect(0, 0, width, height);

    // Background Circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 15;
    ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#334155' : '#f1f5f9';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Foreground Circle
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + ((percent / 100) * 2 * Math.PI);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 15;
    
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if(percent >= 80) {
        gradient.addColorStop(0, '#34d399'); gradient.addColorStop(1, '#059669');
    } else if (percent >= 60) {
        gradient.addColorStop(0, '#fbbf24'); gradient.addColorStop(1, '#d97706');
    } else {
        gradient.addColorStop(0, '#f87171'); gradient.addColorStop(1, '#dc2626');
    }
    
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Text
    ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#fff' : '#334155';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percent}%`, centerX, centerY);
    
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Kehadiran', centerX, centerY + 20);
    
    const statsText = document.getElementById('dash-stats-text');
    if(statsText) statsText.textContent = percent + "%";
};

// ==========================================
// 9. TABS & NAVIGATION
// ==========================================

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    const mainContent = document.getElementById('main-content');
    if (tabName === 'home') {
        mainContent.classList.remove('hidden');
    } else {
        mainContent.classList.add('hidden');
    }
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === tabName) {
            btn.classList.add('active');
            btn.style.transform = 'scale(1.1)';
            setTimeout(() => btn.style.transform = '', 200);
        } else {
            btn.classList.remove('active');
        }
    });

    if(tabName === 'home') window.updateDashboard();
    else if(tabName === 'report') window.updateReportTab();
    else if(tabName === 'profile') window.updateProfileStats();
    
    if(window.lucide) window.lucide.createIcons();
};

window.updateReportTab = function() {
    const container = document.getElementById('report-problem-list');
    if (!container) return;
    
    container.innerHTML = window.getSkeletonHTML(3);
    
    setTimeout(() => {
        container.innerHTML = '';
        
        if (!appState.selectedClass || FILTERED_SANTRI.length === 0) {
            container.innerHTML = '<div class="text-center py-12"><i data-lucide="inbox" class="w-16 h-16 mx-auto mb-4 text-slate-300"></i><p class="text-slate-400 font-bold">Belum ada data laporan</p></div>';
            if(window.lucide) window.lucide.createIcons();
            return;
        }
        
        const dateKey = appState.date;
        const data = appState.attendanceData[dateKey];
        
        if (!data) {
            container.innerHTML = '<div class="text-center py-12"><i data-lucide="calendar-x" class="w-16 h-16 mx-auto mb-4 text-slate-300"></i><p class="text-slate-400 font-bold">Belum ada data untuk hari ini</p></div>';
            if(window.lucide) window.lucide.createIcons();
            return;
        }
        
        let problems = [];
        Object.values(SLOT_WAKTU).forEach(slot => {
            if (data[slot.id]) {
                FILTERED_SANTRI.forEach(s => {
                    const id = String(s.nis || s.id);
                    const status = data[slot.id][id]?.status?.shalat;
                    if (status === 'Alpa' || status === 'Sakit' || status === 'Izin') {
                        problems.push({
                            nama: s.nama,
                            slot: slot.label,
                            status: status,
                            note: data[slot.id][id]?.note || '-',
                            slotTheme: slot.theme
                        });
                    }
                });
            }
        });
        
        if (problems.length === 0) {
            container.innerHTML = '<div class="text-center py-12"><i data-lucide="party-popper" class="w-16 h-16 mx-auto mb-4 text-emerald-500"></i><p class="text-emerald-600 dark:text-emerald-400 font-black text-xl">Tidak ada masalah kehadiran hari ini 🎉</p><p class="text-slate-400 text-sm mt-2">Semua santri hadir lengkap</p></div>';
            if(window.lucide) window.lucide.createIcons();
            return;
        }
        
        const fragment = document.createDocumentFragment();
        problems.forEach((p, idx) => {
            const statusClass = STATUS_UI[p.status]?.class || '';
            const div = document.createElement('div');
            div.className = 'glass-card p-4 rounded-2xl opacity-0 animate-[slideUp_0.3s_ease-out] hover:scale-[1.02] transition-all';
            div.style.animationDelay = `${idx * 50}ms`;
            div.style.animationFillMode = 'forwards';
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-${p.slotTheme}-100 dark:bg-${p.slotTheme}-900/30 flex items-center justify-center flex-shrink-0">
                            <i data-lucide="alert-triangle" class="w-5 h-5 text-${p.slotTheme}-600"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800 dark:text-white">${p.nama}</h4>
                            <p class="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                <i data-lucide="clock" class="w-3 h-3"></i> ${p.slot}
                            </p>
                        </div>
                    </div>
                    <span class="px-3 py-1 rounded-lg text-xs font-bold ${statusClass}">${p.status}</span>
                </div>
                ${p.note !== '-' ? `<div class="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-l-4 border-amber-500"><p class="text-xs text-slate-600 dark:text-slate-400 italic">"${p.note}"</p></div>` : ''}
            `;
            fragment.appendChild(div);
        });
        
        container.appendChild(fragment);
        if(window.lucide) window.lucide.createIcons();
    }, 300);
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
    const updateClock = () => {
        const el = document.getElementById('dash-clock');
        if(el) {
            const now = new Date();
            el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const secEl = document.getElementById('dash-clock-sec');
            if(secEl) secEl.textContent = String(now.getSeconds()).padStart(2, '0');
        }
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

// Start App
window.onload = window.initApp;
