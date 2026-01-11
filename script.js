// File: script.js

// --- CONFIG ---
const APP_CONFIG = {
    storageKey: 'musyrif_app_v5_fix',
    pinDefault: '1234',
    activityLogKey: 'musyrif_activity_log',
    settingsKey: 'musyrif_settings'
};

// --- HELPER DATE ---
// Fungsi untuk mendapatkan tanggal format YYYY-MM-DD sesuai waktu lokal HP (bukan UTC)
window.getLocalDateStr = function() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

// Polyfill for CanvasRenderingContext2D.roundRect
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

// --- STATE ---
let appState = {
    selectedClass: null,
    currentSlotId: 'shubuh',
    attendanceData: {},
    searchQuery: '',
    filterProblemOnly: false,
    date: window.getLocalDateStr(), // <-- GANTI INI (Pakai fungsi helper)
    activityLog: [],
    settings: {
        darkMode: false,
        notifications: true,
        autoSave: true
    }
};

// --- DATA ---
let MASTER_SANTRI = [];
let MASTER_KELAS = {};
let FILTERED_SANTRI = []; // Santri hasil filter kelas

// --- SLOT CONFIG (UPDATED WITH TIME LOGIC) ---
const SLOT_WAKTU = {
    shubuh: { 
        id: 'shubuh', label: 'Shubuh', subLabel: '04:00 - 06:00', theme: 'emerald', 
        startHour: 4, // Jam 4 Pagi
        activities: [
            { id: 'shalat', label: 'Shubuh', type: 'mandator' },
            { id: 'qabliyah', label: 'Qabliyah', type: 'sunnah' },
            { id: 'tahfizh', label: 'Tahfizh', type: 'mandator' },
            { id: 'dzikir_pagi', label: 'Dzikir', type: 'sunnah' },
            { id: 'tahajjud', label: 'Tahajjud', type: 'sunnah' },
            { id: 'conversation', label: 'Conver', type: 'mandator', showOnDays: [0] }
    ]},
    ashar: { 
        id: 'ashar', label: 'Ashar', subLabel: '15:00 - 17:00', theme: 'orange', 
        startHour: 15, // Jam 15 (3 Sore)
        activities: [
            { id: 'shalat', label: 'Ashar', type: 'mandator' },
            { id: 'dzikir_petang', label: 'Dzikir', type: 'sunnah' }
    ]},
    maghrib: { 
        id: 'maghrib', label: 'Maghrib', subLabel: '18:00 - 19:00', theme: 'indigo', 
        startHour: 18, // Jam 18 (6 Sore)
        activities: [
            { id: 'shalat', label: 'Maghrib', type: 'mandator' },
            { id: 'bakdiyah', label: 'Ba\'diyah', type: 'sunnah' },
            { id: 'tahsin', label: 'Tahsin', type: 'mandator', showOnDays: [4, 5] },
            { id: 'conversation', label: 'Conver', type: 'mandator', showOnDays: [3] },
            { id: 'vocabularies', label: 'Vocab', type: 'mandator', showOnDays: [1, 2] },
            { id: 'puasa', label: 'Puasa', type: 'sunnah' }
    ]},
    isya: { 
        id: 'isya', label: 'Isya', subLabel: '19:00 - 21:00', theme: 'slate', 
        startHour: 19, // Jam 19 (7 Malam)
        activities: [
            { id: 'shalat', label: 'Isya', type: 'mandator' },
            { id: 'bakdiyah', label: 'Ba\'diyah', type: 'sunnah' },
            { id: 'alkahfi', label: 'Al-Kahfi', type: 'sunnah', showOnDays: [4] }
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
// 1. INIT
// ==========================================

window.initApp = async function() {
    const loadingEl = document.getElementById('view-loading');
    
    // Load Settings
    const savedSettings = localStorage.getItem(APP_CONFIG.settingsKey);
    if(savedSettings) {
        appState.settings = JSON.parse(savedSettings);
        if(appState.settings.darkMode) {
            document.documentElement.classList.add('dark');
        }
    }
    
    // Load Local Storage
    const saved = localStorage.getItem(APP_CONFIG.storageKey);
    if(saved) appState.attendanceData = JSON.parse(saved);
    
    // Load Activity Log
    const savedLog = localStorage.getItem(APP_CONFIG.activityLogKey);
    if(savedLog) appState.activityLog = JSON.parse(savedLog);

    // --- TAMBAHAN BARU: Set Slot Otomatis ---
    appState.currentSlotId = window.determineCurrentSlot();

    // Fetch Data
    try {
        if (!window.loadClassData || !window.loadSantriData) {
            throw new Error("Library data belum termuat.");
        }

        await Promise.all([
            window.loadClassData().then(d => MASTER_KELAS = d),
            window.loadSantriData().then(d => MASTER_SANTRI = d)
        ]);

        console.log("Data Loaded:", MASTER_SANTRI.length, "Santri");
        window.populateClassDropdown();
        
        if(loadingEl) loadingEl.classList.add('opacity-0', 'pointer-events-none');

    } catch (e) {
        window.showToast("Gagal memuat data: " + e.message, 'error');
    }

    window.startClock();
    window.updateDateDisplay();
    lucide.createIcons();
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

    // FILTER DATA (PERBAIKAN: Cek juga kolom 'rombel' jika 'kelas' kosong)
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
    document.getElementById('login-pin').value = "";
};

window.handleLogout = function() {
    appState.selectedClass = null;
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
};

// ==========================================
// 3. DASHBOARD
// ==========================================

window.updateDashboard = function() {
    // 1. Greeting & Jam
    const h = new Date().getHours();
    const greet = h < 11 ? "Selamat Pagi" : h < 15 ? "Selamat Siang" : h < 18 ? "Selamat Sore" : "Selamat Malam";
    document.getElementById('dash-greeting').textContent = greet;

    // 2. Cek apakah Hari Ini?
    const selectedDateStr = appState.date;
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = (selectedDateStr === todayStr);

    // 3. Logika Kartu Utama (Sesi Aktif)
    const mainCard = document.getElementById('dash-main-card');
    
    if (isToday) {
        // Tampilkan Kartu jika Hari Ini
        mainCard.classList.remove('hidden');
        
        const slot = SLOT_WAKTU[appState.currentSlotId];
        document.getElementById('dash-card-title').textContent = slot.label;
        
        // Cek akses waktu
        const access = window.isSlotAccessible(appState.currentSlotId, appState.date);
        if(access.locked && access.reason === 'wait') {
             document.getElementById('dash-card-time').innerHTML = `<i data-lucide="clock" class="w-3 h-3"></i> Belum Masuk Waktu`;
             document.querySelector('.card-gradient')?.classList.add('opacity-75', 'grayscale');
        } else {
             document.getElementById('dash-card-time').innerHTML = `<i data-lucide="clock" class="w-3 h-3"></i> ${slot.subLabel}`;
             document.querySelector('.card-gradient')?.classList.remove('opacity-75', 'grayscale');
        }
    } else {
        // Sembunyikan Kartu jika Tanggal Lampau
        mainCard.classList.add('hidden');
    }

    // 4. Render List Semua Sesi (Tanpa Kecuali)
    const container = document.getElementById('dash-other-slots');
    container.innerHTML = '';
    const tpl = document.getElementById('tpl-slot-item');

    // Ubah Judul Section List
    const listTitle = document.querySelector('#main-content h3');
    if(listTitle) listTitle.innerHTML = `<i data-lucide="list" class="w-5 h-5 text-emerald-500"></i> Daftar Sesi Presensi`;

    Object.values(SLOT_WAKTU).forEach(s => {
        // KITA HAPUS filter 'if(s.id === appState.currentSlotId) return;' 
        // Agar semua sesi muncul di list bawah

        const clone = tpl.content.cloneNode(true);
        const item = clone.querySelector('.slot-item');
        
        // Cek Akses
        const access = window.isSlotAccessible(s.id, appState.date);
        
        clone.querySelector('.slot-label').textContent = s.label;
        const iconBg = clone.querySelector('.slot-icon-bg');
        
        // Hitung Progress
        const prog = window.calculateSlotProgress(s.id);
        const bar = clone.querySelector('.slot-progress');
        
        if (access.locked) {
            // Tampilan Terkunci
            item.classList.add('opacity-60', 'grayscale');
            
            let statusText = 'Terkunci';
            if(access.reason === 'wait') statusText = 'Menunggu';
            if(access.reason === 'limit') statusText = 'Expired';
            
            clone.querySelector('.slot-status').textContent = statusText;
            bar.style.width = "0%";
            iconBg.classList.add('bg-slate-100', 'text-slate-400');
            
            item.onclick = () => window.showToast(`🔒 ${statusText}`, "error");
        } else {
            // Tampilan Terbuka
            iconBg.classList.add(`bg-${s.theme}-50`, `text-${s.theme}-600`);
            clone.querySelector('.slot-status').textContent = prog.text;
            bar.style.width = prog.percent + "%";
            bar.classList.add(`bg-${s.theme}-500`);

            // Klik untuk buka absen
            item.onclick = () => {
                appState.currentSlotId = s.id;
                // Jika hari ini, update dashboard biar kartu utama berubah
                // Jika masa lalu, langsung buka halaman absen
                if(isToday) {
                    window.updateDashboard();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.openAttendance();
                }
            };
        }

        container.appendChild(clone);
    });
    
    // Update Statistik
    window.updateQuickStats();
    
    // Update Grafik Lingkaran (Donut)
    window.drawDonutChart();
    
    lucide.createIcons();
};

window.updateProfileInfo = function() {
    const elName = document.getElementById('profile-name');
    const elRole = document.getElementById('profile-role');
    
    if(appState.selectedClass && MASTER_KELAS[appState.selectedClass]) {
        if(elName) elName.textContent = MASTER_KELAS[appState.selectedClass].musyrif;
        if(elRole) elRole.textContent = "Kelas " + appState.selectedClass;
    }
};

window.calculateGlobalStats = function() {
    if(!appState.selectedClass) return 0;
    const dateKey = appState.date;
    const data = appState.attendanceData[dateKey];
    if(!data) return 0;

    let checks = 0, total = 0;
    Object.values(SLOT_WAKTU).forEach(slot => {
        if(data[slot.id]) {
            FILTERED_SANTRI.forEach(s => {
                const id = String(s.nis || s.id);
                if(data[slot.id][id]?.status?.shalat === 'Hadir') checks++;
                if(data[slot.id][id]?.status?.shalat) total++;
            });
        }
    });
    return total === 0 ? 0 : Math.round((checks/total)*100);
};

window.calculateSlotProgress = function(slotId) {
    if(FILTERED_SANTRI.length === 0) return { percent: 0, text: "0/0" };
    
    const dateKey = appState.date;
    const slotData = appState.attendanceData[dateKey]?.[slotId];
    if(!slotData) return { percent: 0, text: `0/${FILTERED_SANTRI.length}` };

    let count = 0;
    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        if(slotData[id]?.status?.shalat) count++;
    });

    const pct = Math.round((count / FILTERED_SANTRI.length) * 100);
    return { percent: pct, text: `${count}/${FILTERED_SANTRI.length}` };
};

// ==========================================
// 4. ATTENDANCE ACTIONS
// ==========================================

window.openAttendance = function() {
    // --- CEK KEAMANAN ---
    const access = window.isSlotAccessible(appState.currentSlotId, appState.date);
    if (access.locked) {
        let msg = "Akses ditolak.";
        if(access.reason === 'wait') msg = "Belum masuk waktu " + SLOT_WAKTU[appState.currentSlotId].label;
        if(access.reason === 'limit') msg = "Data lampau (>3 hari) tidak dapat diedit.";
        if(access.reason === 'future') msg = "Belum bisa mengisi data masa depan.";
        
        return window.showToast(msg, 'warning');
    }
    // --------------------

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
    
    // --- CEK HARI INI (0=Ahad, 1=Senin, ..., 5=Jumat) ---
    const currentDay = new Date(appState.date).getDay();

    // Pastikan Struktur Data Ada
    if(!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if(!appState.attendanceData[dateKey][slot.id]) appState.attendanceData[dateKey][slot.id] = {};
    const dbSlot = appState.attendanceData[dateKey][slot.id];

    // Filter Pencarian & Masalah
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

    // Ambil Template HTML
    const tplRow = document.getElementById('tpl-santri-row');
    const tplBtn = document.getElementById('tpl-activity-btn');

    list.forEach(santri => {
        const id = String(santri.nis || santri.id);
        
        // Inisialisasi Data Default Santri
        if(!dbSlot[id]) {
            const defStatus = {};
            slot.activities.forEach(a => defStatus[a.id] = a.type === 'mandator' ? 'Hadir' : 'Ya');
            dbSlot[id] = { status: defStatus, note: '' };
        }
        
        const sData = dbSlot[id];
        const clone = tplRow.content.cloneNode(true);
        
        clone.querySelector('.santri-name').textContent = santri.nama;
        clone.querySelector('.santri-kamar').textContent = santri.asrama || santri.kelas;
        clone.querySelector('.santri-avatar').textContent = santri.nama.substring(0,2).toUpperCase();

        const btnCont = clone.querySelector('.activity-container');
        
        // --- LOOPING AKTIVITAS ---
        slot.activities.forEach(act => {
            // LOGIKA FILTER HARI: 
            // Jika aktivitas punya aturan 'showOnDays' dan hari ini tidak termasuk, sembunyikan.
            if (act.showOnDays && !act.showOnDays.includes(currentDay)) {
                return; // Skip (jangan dirender)
            }

            const bClone = tplBtn.content.cloneNode(true);
            const btn = bClone.querySelector('.btn-status');
            const lbl = bClone.querySelector('.lbl-status');
            
            // Ambil status saat ini, atau gunakan default jika data lama belum punya field ini
            const defaultVal = act.type === 'mandator' ? 'Hadir' : 'Ya';
            const curr = sData.status[act.id] || defaultVal;
            
            const ui = STATUS_UI[curr] || STATUS_UI['Hadir'];
            
            btn.className = `btn-status w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border-2 font-black text-lg transition-all active:scale-95 ${ui.class}`;
            btn.textContent = ui.label;
            lbl.textContent = act.label;
            
            btn.onclick = () => window.toggleStatus(id, act.id, act.type);
            btnCont.appendChild(bClone);
        });

        // Bagian Catatan
        const noteInp = clone.querySelector('.input-note');
        const noteBox = clone.querySelector('.note-section');
        noteInp.value = sData.note || "";
        noteInp.onchange = (e) => {
            sData.note = e.target.value;
            window.saveData();
        };
        clone.querySelector('.btn-edit-note').onclick = () => noteBox.classList.toggle('hidden');

        container.appendChild(clone);
    });
};

window.toggleStatus = function(id, actId, type) {
    const slotId = appState.currentSlotId;
    const sData = appState.attendanceData[appState.date][slotId][id];
    const curr = sData.status[actId];
    let next = 'Hadir';

    if(type === 'mandator') {
        if(curr === 'Hadir') next = 'Sakit';
        else if(curr === 'Sakit') next = 'Izin';
        else if(curr === 'Izin') next = 'Alpa';
        else next = 'Hadir';
    } else {
        next = (curr === 'Ya') ? 'Tidak' : 'Ya';
    }
    
    sData.status[actId] = next;
    
    // ... kode sebelumnya ...
    
    // Dependency Logic (Perbaikan untuk support kegiatan baru)
    if(actId === 'shalat') {
        // Ambil semua daftar kegiatan dari konfigurasi, bukan cuma yang tersimpan
        const allActivities = SLOT_WAKTU[slotId].activities;

        allActivities.forEach(act => {
            if (act.id === 'shalat') return; // Jangan ubah status shalat itu sendiri

            // Tentukan status baru
            let newStatus = 'Ya'; // Default
            
            if (['Sakit', 'Izin', 'Alpa'].includes(next)) {
                // Jika Shalat bermasalah, maka kegiatan lain ikut bermasalah
                newStatus = act.type === 'mandator' ? next : 'Tidak'; // Ikuti status induk atau set Tidak
            } else {
                // Jika Shalat Hadir, reset kegiatan lain ke default
                newStatus = act.type === 'mandator' ? 'Hadir' : 'Ya';
            }

            // Update status
            sData.status[act.id] = newStatus;
        });
    }

    // ... kode sesudahnya ...

    window.saveData();
    window.renderAttendanceList();
};

window.handleBulkAction = function(type) {
    const slotId = appState.currentSlotId;
    const dateKey = appState.date;
    
    // Pastikan struktur slot ada
    if(!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if(!appState.attendanceData[dateKey][slotId]) appState.attendanceData[dateKey][slotId] = {};
    
    const dbSlot = appState.attendanceData[dateKey][slotId];
    const activities = SLOT_WAKTU[slotId].activities;
    const currentDay = new Date(appState.date).getDay();

    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        
        // --- PERBAIKAN DI SINI ---
        // Jika data santri belum ada, buat baru sekarang juga!
        if(!dbSlot[id]) {
            dbSlot[id] = { status: {}, note: '' };
        }
        // -------------------------
        
        activities.forEach(act => {
            // Skip aktivitas yang tidak muncul hari ini
            if (act.showOnDays && !act.showOnDays.includes(currentDay)) return;

            if(type === 'alpa') {
                dbSlot[id].status[act.id] = act.type === 'mandator' ? 'Alpa' : 'Tidak';
            } else {
                dbSlot[id].status[act.id] = act.type === 'mandator' ? 'Hadir' : 'Ya';
            }
        });
    });
    
    window.saveData();
    window.renderAttendanceList(); // Refresh tampilan list
    
    // Opsional: Refresh dashboard di background agar saat kembali angkanya sudah update
    window.updateDashboard(); 
    
    if (type === 'alpa') {
        window.showToast("Semua santri ditandai Alpa", 'warning');
    } else {
        window.showToast("Semua santri ditandai Hadir", 'success');
    }
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
// 5. MISC
// ==========================================

window.showToast = function(message, type = 'info') {
    if(!appState.settings.notifications) return;
    
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    const colors = {
        info: 'bg-blue-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500'
    };
    
    toast.className = `${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-[slideUp_0.3s_ease-out] mb-3`;
    toast.innerHTML = `
        <i data-lucide="check-circle" class="w-5 h-5"></i>
        <span class="font-bold">${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.changeDateView = function(direction) {
    const currentDateObj = new Date(appState.date);
    currentDateObj.setDate(currentDateObj.getDate() + direction);
    
    // Konversi hasil pindah tanggal ke String YYYY-MM-DD
    const offset = currentDateObj.getTimezoneOffset() * 60000;
    const nextDateStr = new Date(currentDateObj.getTime() - offset).toISOString().split('T')[0];
    
    const todayStr = window.getLocalDateStr();

    // Validasi Sederhana (String Comparison)
    if (nextDateStr > todayStr) {
        return window.showToast("Tidak bisa melihat masa depan", "warning");
    }

    appState.date = nextDateStr;
    
    window.updateDateDisplay();
    window.updateDashboard();
    window.showToast(`Menampilkan data ${window.formatDate(appState.date)}`, 'info');
};

window.updateDateDisplay = function() {
    const el = document.getElementById('current-date-display');
    if(el) el.textContent = window.formatDate(appState.date);
};

window.formatDate = function(dateStr) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    
    const d = new Date(dateStr);
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

window.openDatePicker = function() {
    const input = document.getElementById('date-picker-input');
    if(input) {
        input.value = appState.date;
        input.showPicker();
    }
};

window.handleDateChange = function(value) {
    const selected = new Date(value);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (selected > today) {
        window.showToast("Tidak bisa memilih tanggal masa depan", "warning");
        // Reset ke hari ini atau tanggal sebelumnya
        document.getElementById('date-picker-input').value = appState.date; 
        return;
    }

    appState.date = value;
    window.updateDateDisplay();
    window.updateDashboard();
    window.showToast('Tanggal berhasil diubah', 'success');
};

window.exportToExcel = function() {
    if(!appState.selectedClass || FILTERED_SANTRI.length === 0) {
        return window.showToast('Pilih kelas terlebih dahulu', 'warning');
    }
    
    const dateKey = appState.date;
    const data = appState.attendanceData[dateKey];
    
    if(!data) {
        return window.showToast('Tidak ada data untuk tanggal ini', 'warning');
    }
    
    // Create CSV content
    let csv = 'No,Nama,NIS,Kelas';
    Object.values(SLOT_WAKTU).forEach(slot => {
        csv += `,${slot.label}`;
    });
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
    
    // Download
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
    if(!modal) return;
    
    modal.classList.remove('hidden');
    window.generateRekapBulanan();
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
    
    // Get current month data
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    FILTERED_SANTRI.forEach(santri => {
        const id = String(santri.nis || santri.id);
        let hadir = 0, sakit = 0, izin = 0, alpa = 0;
        
        // Count for the month
        for(let day = 1; day <= 31; day++) {
            const date = new Date(year, month, day);
            if(date.getMonth() !== month) break;
            
            const dateKey = date.toISOString().split('T')[0];
            const dayData = appState.attendanceData[dateKey];
            
            if(dayData) {
                Object.values(SLOT_WAKTU).forEach(slot => {
                    if(dayData[slot.id]?.[id]) {
                        const status = dayData[slot.id][id].status.shalat;
                        if(status === 'Hadir') hadir++;
                        else if(status === 'Sakit') sakit++;
                        else if(status === 'Izin') izin++;
                        else if(status === 'Alpa') alpa++;
                    }
                });
            }
        }
        
        const total = hadir + sakit + izin + alpa;
        const percent = total === 0 ? 0 : Math.round((hadir/total)*100);
        
        const div = document.createElement('div');
        div.className = 'glass-card p-4 rounded-2xl flex items-center justify-between';
        div.innerHTML = `
            <div class="flex-1">
                <h4 class="font-bold text-slate-800 dark:text-white">${santri.nama}</h4>
                <div class="flex gap-4 mt-2 text-xs font-bold">
                    <span class="text-emerald-600">H: ${hadir}</span>
                    <span class="text-amber-600">S: ${sakit}</span>
                    <span class="text-blue-600">I: ${izin}</span>
                    <span class="text-red-600">A: ${alpa}</span>
                </div>
            </div>
            <div class="text-right">
                <div class="text-2xl font-black ${percent >= 80 ? 'text-emerald-500' : percent >= 60 ? 'text-amber-500' : 'text-red-500'}">${percent}%</div>
                <div class="w-20 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div class="h-full bg-emerald-500 rounded-full transition-all" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
};

window.logActivity = function(action, detail) {
    const log = {
        timestamp: new Date().toISOString(),
        action: action,
        detail: detail,
        user: appState.selectedClass ? MASTER_KELAS[appState.selectedClass].musyrif : 'Unknown'
    };
    
    appState.activityLog.unshift(log);
    
    // Keep only last 50 logs
    if(appState.activityLog.length > 50) {
        appState.activityLog = appState.activityLog.slice(0, 50);
    }
    
    localStorage.setItem(APP_CONFIG.activityLogKey, JSON.stringify(appState.activityLog));
};

window.viewActivityLog = function() {
    const modal = document.getElementById('modal-activity');
    if(!modal) return;
    
    modal.classList.remove('hidden');
    
    const container = document.getElementById('activity-list');
    if(!container) return;
    
    container.innerHTML = '';
    
    if(appState.activityLog.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-8">Belum ada aktivitas</p>';
        return;
    }
    
    appState.activityLog.forEach(log => {
        const time = new Date(log.timestamp);
        const div = document.createElement('div');
        div.className = 'glass-card p-4 rounded-2xl flex gap-4';
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
        container.appendChild(div);
    });
    
    lucide.createIcons();
};

// ==========================================
// 5. MISC
// ==========================================

window.kirimLaporanWA = function() {
    if(!FILTERED_SANTRI.length) return alert("Pilih kelas dulu");
    
    const slot = SLOT_WAKTU[appState.currentSlotId];
    const dbSlot = appState.attendanceData[appState.date]?.[slot.id];
    
    if(!dbSlot) return alert("Belum ada data.");

    let sakit=[], izin=[], alpa=[], countHadir=0;

    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        const st = dbSlot[id]?.status?.shalat;
        if(st === 'Hadir') countHadir++;
        else if(st === 'Sakit') sakit.push(s.nama);
        else if(st === 'Izin') izin.push(s.nama);
        else if(st === 'Alpa') alpa.push(s.nama);
    });

    let msg = `*LAPORAN ${appState.selectedClass} - ${slot.label}*\n\n`;
    msg += `✅ Hadir: ${countHadir}\n`;
    msg += `🤒 Sakit: ${sakit.length}\n`;
    msg += `📝 Izin: ${izin.length}\n`;
    msg += `❌ Alpa: ${alpa.length}\n\n`;
    
    if(alpa.length) msg += `*List Alpa:*\n${alpa.join('\n')}\n`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
};

window.exportToCSV = function() {
    alert("Fitur CSV belum diaktifkan di versi lite.");
};

window.handleGantiPin = function() {
    const p = prompt("PIN Baru:");
    if(p) {
        localStorage.setItem('musyrif_pin', p);
        alert("PIN Tersimpan");
    }
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
    if(btn) {
        if(appState.settings.notifications) {
            btn.classList.remove('opacity-50');
        } else {
            btn.classList.add('opacity-50');
        }
    }
    
    window.showToast(`Notifikasi ${appState.settings.notifications ? 'Aktif' : 'Nonaktif'}`, 'info');
};

window.saveData = function() {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(appState.attendanceData));
    
    if(appState.settings.autoSave) {
        const indicator = document.getElementById('save-indicator');
        if(indicator) {
            indicator.innerHTML = '<i data-lucide="check" class="w-5 h-5 text-emerald-500"></i>';
            lucide.createIcons();
            setTimeout(() => indicator.innerHTML = '', 1000);
        }
    }
};


window.updateQuickStats = function() {
    if(!appState.selectedClass || FILTERED_SANTRI.length === 0) return;
    
    const dateKey = appState.date;
    const data = appState.attendanceData[dateKey];
    
    let stats = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    
    if(data) {
        Object.values(SLOT_WAKTU).forEach(slot => {
            if(data[slot.id]) {
                FILTERED_SANTRI.forEach(s => {
                    const id = String(s.nis || s.id);
                    const status = data[slot.id][id]?.status?.shalat;
                    if(status && stats[status] !== undefined) {
                        stats[status]++;
                    }
                });
            }
        });
    }
    
    // Update Text Langsung (Tanpa Animasi Glitchy)
    document.getElementById('stat-hadir').textContent = stats.Hadir;
    document.getElementById('stat-sakit').textContent = stats.Sakit;
    document.getElementById('stat-izin').textContent = stats.Izin;
    document.getElementById('stat-alpa').textContent = stats.Alpa;
};
window.animateValue = function(id, start, end, duration) {
    const el = document.getElementById(id);
    if(!el) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        el.textContent = Math.round(current);
    }, 16);
};

window.drawDonutChart = function() {
    const canvas = document.getElementById('weekly-chart'); // ID di HTML tetap sama biar ga perlu ubah HTML
    if(!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Resolusi Tinggi
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    // Hitung Persentase Hari Ini
    const percent = window.calculateGlobalStats(); // 0 - 100

    ctx.clearRect(0, 0, width, height);

    // 1. Gambar Lingkaran Belakang (Abu-abu)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#f1f5f9'; // slate-100
    if (document.documentElement.classList.contains('dark')) {
        ctx.strokeStyle = '#334155'; // slate-700
    }
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Gambar Lingkaran Depan (Warna)
    const startAngle = -Math.PI / 2; // Mulai dari jam 12
    const endAngle = startAngle + ((percent / 100) * 2 * Math.PI);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 15;
    
    // Warna Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if(percent >= 80) {
        gradient.addColorStop(0, '#34d399'); // Emerald
        gradient.addColorStop(1, '#059669');
    } else if (percent >= 60) {
        gradient.addColorStop(0, '#fbbf24'); // Amber
        gradient.addColorStop(1, '#d97706');
    } else {
        gradient.addColorStop(0, '#f87171'); // Red
        gradient.addColorStop(1, '#dc2626');
    }
    
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. Teks di Tengah
    ctx.fillStyle = '#334155';
    if (document.documentElement.classList.contains('dark')) ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percent}%`, centerX, centerY);
    
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Kehadiran', centerX, centerY + 20);
    
    // Update text kecil di pojok kartu
    const statsText = document.getElementById('dash-stats-text');
    if(statsText) statsText.textContent = percent + "%";
};

// ==========================================
// 5. MISC
// ==========================================

window.switchTab = function(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    // Show main content for home tab
    const mainContent = document.getElementById('main-content');
    if (tabName === 'home') {
        mainContent.classList.remove('hidden');
        document.getElementById('tab-report')?.classList.add('hidden');
        document.getElementById('tab-profile')?.classList.add('hidden');
    } else {
        // Hide main content when switching to other tabs
        mainContent.classList.add('hidden');
    }
    
    // Show selected tab
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }
    
    // Update nav buttons with animation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === tabName) {
            btn.classList.add('active');
            btn.style.transform = 'scale(1.1)';
            setTimeout(() => btn.style.transform = '', 200);
        } else {
            btn.classList.remove('active');
        }
    });

    // Refresh data based on tab
    if(tabName === 'home') {
        window.updateDashboard();
    } else if(tabName === 'report') {
        window.updateReportTab();
    } else if(tabName === 'profile') {
        window.updateProfileStats();
    }
    
    lucide.createIcons();
};

window.updateReportTab = function() {
    const container = document.getElementById('report-problem-list');
    if (!container) return;
    
    // Show skeleton loading
    container.innerHTML = window.getSkeletonHTML(3);
    
    setTimeout(() => {
        container.innerHTML = '';
        
        if (!appState.selectedClass || FILTERED_SANTRI.length === 0) {
            container.innerHTML = '<div class="text-center py-12"><i data-lucide="inbox" class="w-16 h-16 mx-auto mb-4 text-slate-300"></i><p class="text-slate-400 font-bold">Belum ada data laporan</p></div>';
            lucide.createIcons();
            return;
        }
        
        const dateKey = appState.date;
        const data = appState.attendanceData[dateKey];
        
        if (!data) {
            container.innerHTML = '<div class="text-center py-12"><i data-lucide="calendar-x" class="w-16 h-16 mx-auto mb-4 text-slate-300"></i><p class="text-slate-400 font-bold">Belum ada data untuk hari ini</p></div>';
            lucide.createIcons();
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
            lucide.createIcons();
            return;
        }
        
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
            container.appendChild(div);
        });
        
        lucide.createIcons();
    }, 300);
};

window.getSkeletonHTML = function(count) {
    let html = '';
    for(let i = 0; i < count; i++) {
        html += `
            <div class="glass-card p-4 rounded-2xl animate-pulse">
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
            </div>
        `;
    }
    return html;
};

window.updateProfileStats = function() {
    if(!appState.selectedClass) return;
    
    // Calculate total activities
    let totalChecks = 0, totalDays = 0;
    
    Object.keys(appState.attendanceData).forEach(dateKey => {
        const dayData = appState.attendanceData[dateKey];
        Object.values(SLOT_WAKTU).forEach(slot => {
            if(dayData[slot.id]) {
                FILTERED_SANTRI.forEach(s => {
                    const id = String(s.nis || s.id);
                    if(dayData[slot.id][id]?.status?.shalat === 'Hadir') totalChecks++;
                });
            }
        });
        totalDays++;
    });
    
    const avgEl = document.getElementById('profile-avg-attendance');
    if(avgEl) {
        const avg = totalDays === 0 ? 0 : Math.round((totalChecks / (totalDays * FILTERED_SANTRI.length * Object.keys(SLOT_WAKTU).length)) * 100);
        avgEl.textContent = avg + '%';
    }
    
    const daysEl = document.getElementById('profile-days-count');
    if(daysEl) daysEl.textContent = totalDays;
};

// --- LOGIKA WAKTU & AKSES ---

// 1. Cek apakah Slot boleh diakses
window.isSlotAccessible = function(slotId, dateStr) {
    const selectedDate = new Date(dateStr);
    const today = new Date();
    
    // Reset jam agar perbandingan hari akurat
    selectedDate.setHours(0,0,0,0);
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);

    // Hitung selisih hari (dalam milidetik)
    const diffTime = todayDate - selectedDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    // ATURAN 1: MASA LALU (Maksimal 3 hari)
    if (diffDays > 3) {
        return { locked: true, reason: 'limit' }; // Terkunci karena sudah lewat 3 hari
    }

    // ATURAN 2: MASA DEPAN (Hari belum terjadi)
    if (selectedDate > todayDate) {
        return { locked: true, reason: 'future' };
    }

    // ATURAN 3: HARI INI (Cek Jam)
    if (diffDays === 0) { // Jika hari ini
        const currentHour = new Date().getHours();
        const slotStart = SLOT_WAKTU[slotId].startHour;
        
        // Jika jam sekarang belum sampai jam mulai slot
        if (currentHour < slotStart) {
            return { locked: true, reason: 'wait' };
        }
    }

    return { locked: false, reason: '' };
};

// 2. Tentukan Slot Default saat buka aplikasi
window.determineCurrentSlot = function() {
    const h = new Date().getHours();
    
    if (h >= 19) return 'isya';
    if (h >= 18) return 'maghrib';
    if (h >= 15) return 'ashar';
    return 'shubuh'; // Default pagi/siang kembali ke shubuh atau slot aktif terakhir
};

// ==========================================
// 6. DATA ACTIONS
// ==========================================

window.handleClearData = function() {
    window.showConfirmModal(
        'Hapus Data Hari Ini?',
        'Data presensi hari ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.',
        'Hapus',
        'Batal',
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
    if(!modal) return;
    
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-yes').textContent = confirmText;
    document.getElementById('confirm-no').textContent = cancelText;
    
    document.getElementById('confirm-yes').onclick = () => {
        onConfirm();
        modal.classList.add('hidden');
    };
    
    document.getElementById('confirm-no').onclick = () => {
        modal.classList.add('hidden');
    };
    
    modal.classList.remove('hidden');
};

window.backupData = function() {
    const backup = {
        version: '1.0',
        date: new Date().toISOString(),
        class: appState.selectedClass,
        attendance: appState.attendanceData,
        activityLog: appState.activityLog
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${appState.selectedClass}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    window.showToast('Backup berhasil diunduh', 'success');
    window.logActivity('Backup Data', 'Membuat backup data');
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
                
                if(!backup.version || !backup.attendance) {
                    throw new Error('Format backup tidak valid');
                }
                
                window.showConfirmModal(
                    'Restore Data?',
                    `Restore data dari backup tanggal ${new Date(backup.date).toLocaleDateString('id-ID')}? Data yang ada akan ditimpa.`,
                    'Restore',
                    'Batal',
                    () => {
                        appState.attendanceData = backup.attendance;
                        if(backup.activityLog) appState.activityLog = backup.activityLog;
                        
                        window.saveData();
                        localStorage.setItem(APP_CONFIG.activityLogKey, JSON.stringify(appState.activityLog));
                        
                        window.updateDashboard();
                        window.showToast('Data berhasil di-restore', 'success');
                        window.logActivity('Restore Data', 'Memulihkan data dari backup');
                    }
                );
            } catch(err) {
                window.showToast('Gagal membaca file backup: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
};

window.printReport = function() {
    window.print();
};

window.startClock = function() {
    const updateClock = () => {
        const el = document.getElementById('dash-clock');
        if(el) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            el.textContent = `${hours}:${minutes}`;
            
            // Update seconds indicator
            const secEl = document.getElementById('dash-clock-sec');
            if(secEl) secEl.textContent = seconds;
        }
    };
    
    updateClock();
    setInterval(updateClock, 1000);
};

// Start
window.onload = window.initApp;
