// File: script.js

// --- CONFIG ---
const APP_CONFIG = {
    storageKey: 'musyrif_app_v5_presensi',
    pinDefault: '1234'
};

// --- GLOBAL STATE ---
let appState = {
    selectedClass: null,    // Kelas yang sedang aktif (Login)
    currentSlotId: 'shubuh',
    attendanceData: {},     // Data presensi harian
    searchQuery: '',
    filterProblemOnly: false,
    date: new Date().toISOString().split('T')[0]
};

// --- DATA MASTERS ---
let MASTER_SANTRI = []; 
let MASTER_KELAS = {};  
let FILTERED_SANTRI = []; 

// --- SLOT WAKTU CONFIG ---
const SLOT_WAKTU = {
    shubuh: { id: 'shubuh', label: 'Shubuh', subLabel: '04:00 - 06:00', theme: 'emerald', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator', icon: 'users' },
        { id: 'qabliyah', label: 'Qabliyah', type: 'sunnah', icon: 'heart' },
        { id: 'tahfizh', label: 'Tahfizh', type: 'mandator', icon: 'book-open' },
        { id: 'tahajjud', label: 'Tahajjud', type: 'sunnah', icon: 'moon' }
    ]},
    ashar: { id: 'ashar', label: 'Ashar', subLabel: '15:00 - 17:00', theme: 'orange', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator', icon: 'users' },
        { id: 'dzikir', label: 'Dzikir', type: 'sunnah', icon: 'volume-2' }
    ]},
    maghrib: { id: 'maghrib', label: 'Maghrib', subLabel: '18:00 - 19:00', theme: 'indigo', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator', icon: 'users' },
        { id: 'bakdiyah', label: 'Bakdiyah', type: 'sunnah', icon: 'heart' },
        { id: 'tahsin', label: 'Tahsin', type: 'mandator', icon: 'book-open' }
    ]},
    isya: { id: 'isya', label: 'Isya', subLabel: '19:00 - 21:00', theme: 'slate', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator', icon: 'users' },
        { id: 'bakdiyah', label: 'Bakdiyah', type: 'sunnah', icon: 'heart' }
    ]}
};

const STATUS_UI = {
    'Hadir': { class: 'bg-emerald-500 text-white border-emerald-500', label: 'icon-check' },
    'Ya': { class: 'bg-emerald-500 text-white border-emerald-500', label: 'icon-check' },
    'Sakit': { class: 'bg-amber-100 text-amber-600 border-amber-300', label: 'S' },
    'Izin': { class: 'bg-blue-100 text-blue-600 border-blue-300', label: 'I' },
    'Alpa': { class: 'bg-red-50 text-red-500 border-red-200', label: 'icon-x' },
    'Tidak': { class: 'bg-slate-100 text-slate-300 border-slate-200', label: 'icon-minus' }
};

// ==========================================
// 1. INITIALIZATION FLOW
// ==========================================

async function initApp() {
    const loadingEl = document.getElementById('view-loading');
    
    // Load Local Storage
    const savedData = localStorage.getItem(APP_CONFIG.storageKey);
    if (savedData) appState.attendanceData = JSON.parse(savedData);

    // Load Data Master
    try {
        if (!window.loadClassData || !window.loadSantriData) {
            throw new Error("Script data-kelas.js atau data-santri.js belum terpasang!");
        }

        await Promise.all([
            window.loadClassData().then(data => MASTER_KELAS = data),
            window.loadSantriData().then(data => MASTER_SANTRI = data)
        ]);

        console.log("🚀 Init Selesai. Santri:", MASTER_SANTRI.length, "Kelas:", Object.keys(MASTER_KELAS).length);
        populateClassDropdown();
        
        if(loadingEl) loadingEl.classList.add('opacity-0', 'pointer-events-none');

    } catch (err) {
        console.error("Critical Init Error:", err);
        alert("Gagal memuat data: " + err.message);
    }

    startClock();
    if(window.lucide) lucide.createIcons();
}

function populateClassDropdown() {
    const select = document.getElementById('login-kelas');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>-- Pilih Kelas --</option>';
    const sortedKeys = Object.keys(MASTER_KELAS).sort();
    
    sortedKeys.forEach(kelas => {
        const option = document.createElement('option');
        option.value = kelas;
        const musyrif = MASTER_KELAS[kelas].musyrif || "Tanpa Musyrif";
        option.textContent = `${kelas} - ${musyrif}`;
        select.appendChild(option);
    });
}

// ==========================================
// 2. LOGIN & FILTERING LOGIC
// ==========================================

function handleLogin() {
    const selectKelas = document.getElementById('login-kelas');
    const inputPin = document.getElementById('login-pin');
    const selectedClass = selectKelas.value;
    const pin = inputPin.value;
    
    if (!selectedClass) {
        alert("Silakan pilih kelas terlebih dahulu!");
        return;
    }
    
    const savedPin = localStorage.getItem('musyrif_pin') || APP_CONFIG.pinDefault;
    
    if (pin === savedPin) {
        appState.selectedClass = selectedClass;
        
        // FILTER DATA (Core Logic)
        FILTERED_SANTRI = MASTER_SANTRI.filter(s => {
            const sKelas = String(s.kelas || "").trim();
            return sKelas === selectedClass;
        }).sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));

        if (FILTERED_SANTRI.length === 0) {
            alert(`Peringatan: Data santri untuk kelas ${selectedClass} kosong.`);
        }

        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-main').classList.remove('hidden');
        
        updateProfileInfo();
        updateDashboard();
        
        inputPin.value = "";
    } else {
        alert("PIN Salah! Coba lagi.");
        inputPin.value = "";
        inputPin.focus();
    }
}

function handleLogout() {
    appState.selectedClass = null;
    FILTERED_SANTRI = [];
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
}

// ==========================================
// 3. DASHBOARD & RENDER
// ==========================================

function updateProfileInfo() {
    const nameEl = document.getElementById('profile-name');
    const roleEl = document.getElementById('profile-role');
    
    if (appState.selectedClass && MASTER_KELAS[appState.selectedClass]) {
        const info = MASTER_KELAS[appState.selectedClass];
        if(nameEl) nameEl.textContent = info.musyrif || "Ustadz Musyrif";
        if(roleEl) roleEl.textContent = `Musyrif Kelas ${appState.selectedClass}`;
    }
}

function updateDashboard() {
    // Update Jam
    // Render Jadwal
    const container = document.getElementById('dash-other-slots');
    if(!container) return;
    
    container.innerHTML = '';
    const template = document.getElementById('tpl-slot-item');

    Object.values(SLOT_WAKTU).forEach(slot => {
        if (slot.id === appState.currentSlotId) {
            updateMainCard(slot);
            return;
        }

        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.slot-item');
        
        clone.querySelector('.slot-label').textContent = slot.label;
        const iconBg = clone.querySelector('.slot-icon-bg');
        iconBg.className = `slot-icon-bg w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm flex-shrink-0 bg-${slot.theme}-50 text-${slot.theme}-600`;
        
        const progress = calculateSlotProgress(slot.id);
        clone.querySelector('.slot-status').textContent = progress.text;
        
        const bar = clone.querySelector('.slot-progress');
        bar.style.width = progress.percent + "%";
        bar.className = `slot-progress h-full w-0 rounded-full transition-all duration-700 ease-out relative bg-${slot.theme}-500`;

        item.onclick = () => {
            appState.currentSlotId = slot.id;
            openAttendance(); // Call the renamed function
        };

        container.appendChild(clone);
    });
    
    if(window.lucide) lucide.createIcons();
}

function updateMainCard(slot) {
    const card = document.getElementById('dash-main-card');
    const title = document.getElementById('dash-card-title');
    const time = document.getElementById('dash-card-time');
    
    // Reset & Apply Class
    card.className = "cursor-pointer rounded-[2.5rem] p-7 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ring-1 ring-white/10";
    
    const gradients = {
        emerald: 'bg-gradient-to-br from-emerald-600 to-teal-500',
        orange: 'bg-gradient-to-br from-orange-500 to-red-500',
        indigo: 'bg-gradient-to-br from-indigo-600 to-blue-500',
        slate: 'bg-gradient-to-br from-slate-700 to-slate-900'
    };
    const gradientClass = gradients[slot.theme] || gradients['emerald'];
    gradientClass.split(' ').forEach(c => card.classList.add(c));
    
    title.textContent = slot.label;
    time.textContent = slot.subLabel;
}

function calculateSlotProgress(slotId) {
    if (FILTERED_SANTRI.length === 0) return { percent: 0, text: "0/0 Santri" };

    const dateKey = appState.date;
    const dataHarian = appState.attendanceData[dateKey];
    
    if (!dataHarian || !dataHarian[slotId]) {
        return { percent: 0, text: `0/${FILTERED_SANTRI.length} Santri` };
    }

    let checkedCount = 0;
    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        const record = dataHarian[slotId][id];
        if (record && record.status && record.status.shalat) {
            checkedCount++;
        }
    });

    const percent = Math.round((checkedCount / FILTERED_SANTRI.length) * 100);
    return { percent: percent, text: `${checkedCount}/${FILTERED_SANTRI.length} Santri` };
}

// ==========================================
// 4. ATTENDANCE LIST (CORE FEATURE)
// ==========================================

// PERBAIKAN: Nama fungsi disamakan dengan HTML onclick="openAttendance()"
function openAttendance() {
    if (!appState.selectedClass) {
        alert("Sesi kadaluarsa. Silakan login ulang.");
        handleLogout();
        return;
    }
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-attendance').classList.remove('hidden');
    
    const slot = SLOT_WAKTU[appState.currentSlotId];
    document.getElementById('att-slot-title').textContent = slot.label;
    
    renderAttendanceList();
}

function closeAttendance() {
    document.getElementById('view-attendance').classList.add('hidden');
    document.getElementById('view-main').classList.remove('hidden');
    updateDashboard(); 
}

function renderAttendanceList() {
    const container = document.getElementById('attendance-list-container');
    container.innerHTML = '';
    
    const slot = SLOT_WAKTU[appState.currentSlotId];
    const dateKey = appState.date;
    
    // Pastikan struktur data
    if (!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if (!appState.attendanceData[dateKey][slot.id]) appState.attendanceData[dateKey][slot.id] = {};

    const dbSlot = appState.attendanceData[dateKey][slot.id];

    // Filter Pencarian
    const search = appState.searchQuery.toLowerCase();
    const listToRender = FILTERED_SANTRI.filter(s => {
        const matchesName = s.nama.toLowerCase().includes(search);
        // Filter Problem (Hanya jika tombol warning diklik)
        if (appState.filterProblemOnly) {
            const id = String(s.nis || s.id);
            const status = dbSlot[id]?.status?.shalat;
            const isProblem = status === 'Alpa' || status === 'Sakit' || status === 'Izin';
            return matchesName && isProblem;
        }
        return matchesName;
    });

    const countEl = document.getElementById('att-santri-count');
    if(countEl) countEl.textContent = `${listToRender.length} Santri`;

    const rowTemplate = document.getElementById('tpl-santri-row');
    const btnTemplate = document.getElementById('tpl-activity-btn');

    listToRender.forEach(santri => {
        const santriId = String(santri.nis || santri.id);
        
        // Init default jika belum ada
        if (!dbSlot[santriId]) {
            const initialStatus = {};
            slot.activities.forEach(act => {
                initialStatus[act.id] = act.type === 'mandator' ? 'Hadir' : 'Ya'; 
            });
            dbSlot[santriId] = { status: initialStatus, note: '' };
        }

        const sData = dbSlot[santriId];
        const clone = rowTemplate.content.cloneNode(true);
        
        // Populate Data
        clone.querySelector('.santri-name').textContent = santri.nama;
        clone.querySelector('.santri-kamar').textContent = santri.asrama || santri.kelas; 
        clone.querySelector('.santri-avatar').textContent = getInitials(santri.nama);

        // Styling untuk Alpa/Sakit
        if (sData.status.shalat === 'Alpa' || sData.status.shalat === 'Sakit') {
            const row = clone.querySelector('.santri-row');
            row.className = "santri-row bg-red-50 border border-red-200 p-5 rounded-[1.8rem] shadow-sm relative overflow-hidden group";
        }

        // Render Tombol
        const btnContainer = clone.querySelector('.activity-container');
        slot.activities.forEach(act => {
            const btnClone = btnTemplate.content.cloneNode(true);
            const btn = btnClone.querySelector('.btn-status');
            const lbl = btnClone.querySelector('.lbl-status');
            
            const currentStatus = sData.status[act.id];
            const ui = STATUS_UI[currentStatus] || STATUS_UI['Hadir'];

            btn.className = `btn-status w-[3.5rem] h-[3.5rem] rounded-[1.2rem] flex items-center justify-center shadow-sm transition-all active:scale-95 border-2 ${ui.class}`;
            
            if (ui.label.startsWith('icon-')) {
                const iconMap = { 'icon-check': 'check', 'icon-x': 'x', 'icon-minus': 'minus' };
                btn.innerHTML = `<i data-lucide="${iconMap[ui.label]}" class="w-6 h-6 stroke-[3px]"></i>`;
            } else {
                btn.textContent = ui.label;
                btn.classList.add('font-black', 'text-lg');
            }
            lbl.textContent = act.label;

            btn.onclick = () => toggleStatus(santriId, act.id, act.type);
            btnContainer.appendChild(btnClone);
        });

        // Notes Logic
        const btnNote = clone.querySelector('.btn-edit-note');
        const noteSec = clone.querySelector('.note-section');
        const inputNote = clone.querySelector('.input-note');
        
        inputNote.value = sData.note || "";
        inputNote.onchange = (e) => {
            sData.note = e.target.value;
            saveData();
        };
        btnNote.onclick = () => { noteSec.classList.toggle('hidden'); };

        container.appendChild(clone);
    });

    if(window.lucide) lucide.createIcons();
}

function toggleStatus(santriId, actId, type) {
    const slotId = appState.currentSlotId;
    const dateKey = appState.date;
    const sData = appState.attendanceData[dateKey][slotId][santriId];
    
    const current = sData.status[actId];
    let next = 'Hadir';

    if (type === 'mandator') {
        if (current === 'Hadir') next = 'Sakit';
        else if (current === 'Sakit') next = 'Izin';
        else if (current === 'Izin') next = 'Alpa';
        else next = 'Hadir';
    } else {
        next = (current === 'Ya') ? 'Tidak' : 'Ya';
    }

    sData.status[actId] = next;
    
    // Logika Dependensi (Jika Shalat Alpa, lainnya otomatis Tidak)
    if (actId === 'shalat' && ['Sakit', 'Izin', 'Alpa'].includes(next)) {
        Object.keys(sData.status).forEach(k => {
            if (k !== 'shalat') sData.status[k] = 'Tidak';
        });
    } else if (actId === 'shalat' && next === 'Hadir') {
        Object.keys(sData.status).forEach(k => {
            if (k !== 'shalat') sData.status[k] = 'Ya';
        });
    }

    saveData();
    renderAttendanceList();
}

// ==========================================
// 5. UTILS & ACTIONS
// ==========================================

function saveData() {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(appState.attendanceData));
}

function handleSearch(val) {
    appState.searchQuery = val;
    renderAttendanceList();
}

function getInitials(name) {
    if (!name) return "??";
    return name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        const el = document.getElementById('dash-clock');
        if (el) el.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }, 1000);
}

function getGreeting() {
    const h = new Date().getHours();
    if(h < 11) return "Selamat Pagi";
    if(h < 15) return "Selamat Siang";
    if(h < 18) return "Selamat Sore";
    return "Selamat Malam";
}

function toggleProblemFilter() {
    appState.filterProblemOnly = !appState.filterProblemOnly;
    const btn = document.getElementById('btn-filter-problem');
    
    if (appState.filterProblemOnly) {
        btn.classList.add('bg-red-100', 'text-red-600');
        btn.classList.remove('bg-slate-100', 'text-slate-400');
        showToast("Filter: Bermasalah Saja");
    } else {
        btn.classList.remove('bg-red-100', 'text-red-600');
        btn.classList.add('bg-slate-100', 'text-slate-400');
        showToast("Filter: Semua Santri");
    }
    renderAttendanceList();
}

function handleBulkAction(type) {
    const slotId = appState.currentSlotId;
    const dateKey = appState.date;
    const slot = SLOT_WAKTU[slotId];
    
    if (!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if (!appState.attendanceData[dateKey][slotId]) appState.attendanceData[dateKey][slotId] = {};
    
    const dbSlot = appState.attendanceData[dateKey][slotId];

    // Terapkan hanya pada santri yang difilter (kelas aktif)
    FILTERED_SANTRI.forEach(santri => {
        const id = String(santri.nis || santri.id);
        
        if (!dbSlot[id]) {
            const initialStatus = {};
            slot.activities.forEach(act => {
                initialStatus[act.id] = act.type === 'mandator' ? 'Hadir' : 'Ya';
            });
            dbSlot[id] = { status: initialStatus, note: '' };
        }

        const sData = dbSlot[id];
        
        slot.activities.forEach(act => {
            if (type === 'alpa') {
                if (act.type === 'mandator') sData.status[act.id] = 'Alpa';
                else sData.status[act.id] = 'Tidak';
            } else if (type === 'reset') {
                if (act.type === 'mandator') sData.status[act.id] = 'Hadir';
                else sData.status[act.id] = 'Ya';
            }
        });
    });

    saveData();
    renderAttendanceList();
    showToast(type === 'reset' ? 'Semua Hadir' : 'Semua Alpa');
}

function kirimLaporanWA() {
    if (!appState.selectedClass) {
        alert("Pilih kelas terlebih dahulu.");
        return;
    }

    const slot = SLOT_WAKTU[appState.currentSlotId];
    const dateKey = appState.date;
    const dbSlot = appState.attendanceData[dateKey]?.[slot.id];

    if (!dbSlot) {
        alert("Belum ada data absensi untuk slot ini.");
        return;
    }

    let hadir = 0, sakit = 0, izin = 0, alpa = 0;
    let listSakit = [], listIzin = [], listAlpa = [];

    FILTERED_SANTRI.forEach(santri => {
        const id = String(santri.nis || santri.id);
        const record = dbSlot[id];
        
        if (record && record.status && record.status.shalat) {
            const st = record.status.shalat;
            if (st === 'Hadir') hadir++;
            else if (st === 'Sakit') { sakit++; listSakit.push(santri.nama); }
            else if (st === 'Izin') { izin++; listIzin.push(santri.nama); }
            else if (st === 'Alpa') { alpa++; listAlpa.push(santri.nama); }
        }
    });

    let msg = `*LAPORAN ABSENSI KELAS ${appState.selectedClass}*\n`;
    msg += `📅 Tanggal: ${dateKey}\n`;
    msg += `🕌 Waktu: ${slot.label}\n`;
    msg += `--------------------------\n`;
    msg += `✅ Hadir: ${hadir}\n`;
    msg += `🤒 Sakit: ${sakit}\n`;
    msg += `📝 Izin: ${izin}\n`;
    msg += `❌ Alpa: ${alpa}\n`;
    msg += `--------------------------\n`;

    if (listSakit.length > 0) msg += `*Sakit:* \n- ${listSakit.join('\n- ')}\n\n`;
    if (listIzin.length > 0) msg += `*Izin:* \n- ${listIzin.join('\n- ')}\n\n`;
    if (listAlpa.length > 0) msg += `*Alpa:* \n- ${listAlpa.join('\n- ')}\n\n`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

function exportToCSV() {
    if (!FILTERED_SANTRI.length) {
        alert("Belum ada data untuk diexport.");
        return;
    }

    let csv = "Tanggal,Slot,Nama,Kelas,Kegiatan,Status,Catatan\n";
    const dateKey = appState.date;
    
    Object.keys(SLOT_WAKTU).forEach(slotKey => {
        const slotData = appState.attendanceData[dateKey]?.[slotKey];
        if (!slotData) return;

        FILTERED_SANTRI.forEach(s => {
            const id = String(s.nis || s.id);
            const record = slotData[id];
            if (record) {
                Object.keys(record.status).forEach(actId => {
                    const actName = SLOT_WAKTU[slotKey].activities.find(a => a.id === actId)?.label || actId;
                    csv += `${dateKey},${SLOT_WAKTU[slotKey].label},"${s.nama}","${s.kelas}","${actName}","${record.status[actId]}","${record.note || ''}"\n`;
                });
            }
        });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Presensi_${appState.selectedClass}_${dateKey}.csv`;
    a.click();
}

function handleClearData() {
    if (confirm("Yakin ingin menghapus data hari ini?")) {
        delete appState.attendanceData[appState.date];
        saveData();
        alert("Data hari ini telah dihapus.");
        updateDashboard();
    }
}

function handleGantiPin() {
    const oldPin = prompt("Masukkan PIN lama:");
    const savedPin = localStorage.getItem('musyrif_pin') || APP_CONFIG.pinDefault;
    
    if (oldPin === savedPin) {
        const newPin = prompt("Masukkan PIN baru:");
        if (newPin && newPin.length >= 4) {
            localStorage.setItem('musyrif_pin', newPin);
            alert("PIN berhasil diganti.");
        } else {
            alert("PIN minimal 4 karakter.");
        }
    } else {
        alert("PIN lama salah.");
    }
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
}

function bukaMenuSantri() {
    alert("Data santri dikelola melalui Google Spreadsheet.");
}

function showToast(msg = 'Saved') {
    if (navigator.vibrate) navigator.vibrate(50);
    const indicator = document.getElementById('save-indicator');
    if(!indicator) {
        let toast = document.createElement('div');
        toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-white text-white dark:text-slate-800 text-xs font-bold py-3 px-6 rounded-full shadow-2xl z-[100] fade-in flex items-center gap-2';
        toast.innerHTML = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
        return;
    }
    indicator.innerHTML = `<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full fade-in shadow-sm border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">${msg}</span>`;
    setTimeout(() => { if(indicator) indicator.innerHTML = ''; }, 2000);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === tab) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    if (tab === 'home') updateDashboard();
    if (tab === 'profile') updateProfileInfo();
}

// --- EXPOSE TO WINDOW (PENTING AGAR HTML ONCLICK BISA BACA) ---
window.initApp = initApp;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.switchTab = switchTab;
window.openAttendance = openAttendance;
window.closeAttendance = closeAttendance;
window.handleSearch = handleSearch;
window.toggleProblemFilter = toggleProblemFilter;
window.handleBulkAction = handleBulkAction;
window.kirimLaporanWA = kirimLaporanWA;
window.exportToCSV = exportToCSV;
window.toggleDarkMode = toggleDarkMode;
window.bukaMenuSantri = bukaMenuSantri;
window.handleGantiPin = handleGantiPin;
window.handleClearData = handleClearData;

// JALANKAN APLIKASI
window.onload = initApp;
