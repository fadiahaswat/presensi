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

// --- DATA MASTERS (Diisi oleh data-*.js) ---
let MASTER_SANTRI = []; // Semua santri satu sekolah
let MASTER_KELAS = {};  // Data wali & musyrif per kelas
let FILTERED_SANTRI = []; // Santri HANYA kelas yang dipilih

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
    
    // 1. Load Local Storage (Presensi)
    const savedData = localStorage.getItem(APP_CONFIG.storageKey);
    if (savedData) appState.attendanceData = JSON.parse(savedData);

    // 2. Load Data Master (Parallel Fetch)
    try {
        // Cek apakah script pendukung sudah dimuat
        if (!window.loadClassData || !window.loadSantriData) {
            throw new Error("Script data-kelas.js atau data-santri.js belum terpasang!");
        }

        // Jalankan fetch bersamaan biar cepat
        await Promise.all([
            window.loadClassData().then(data => MASTER_KELAS = data),
            window.loadSantriData().then(data => MASTER_SANTRI = data)
        ]);

        console.log("🚀 Init Selesai. Santri:", MASTER_SANTRI.length, "Kelas:", Object.keys(MASTER_KELAS).length);

        // 3. Setup UI Login
        populateClassDropdown();
        
        // Hide Loading
        if(loadingEl) loadingEl.classList.add('opacity-0', 'pointer-events-none');

    } catch (err) {
        console.error("Critical Init Error:", err);
        alert("Gagal memuat data: " + err.message);
    }

    startClock();
    lucide.createIcons();
}

// Mengisi Dropdown Kelas di Halaman Login
function populateClassDropdown() {
    const select = document.getElementById('login-kelas');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>-- Pilih Kelas --</option>';
    
    // Urutkan kelas secara alfabetis
    const sortedKeys = Object.keys(MASTER_KELAS).sort();
    
    sortedKeys.forEach(kelas => {
        const option = document.createElement('option');
        option.value = kelas;
        // Tampilkan Nama Kelas + Nama Musyrif
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
    
    // Validasi
    if (!selectedClass) {
        alert("Silakan pilih kelas terlebih dahulu!");
        return;
    }
    
    const savedPin = localStorage.getItem('musyrif_pin') || APP_CONFIG.pinDefault;
    
    if (pin === savedPin) {
        // LOGIN SUKSES
        appState.selectedClass = selectedClass;
        
        // FILTER DATA SANTRI SEKARANG!
        // Logika: Filter data santri yg kolom 'kelas' nya sama dengan pilihan
        FILTERED_SANTRI = MASTER_SANTRI.filter(s => {
            // Normalisasi string agar aman (trim spasi)
            const sKelas = String(s.kelas || "").trim();
            return sKelas === selectedClass;
        }).sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));

        console.log(`✅ Login Kelas ${selectedClass}. Ditemukan ${FILTERED_SANTRI.length} santri.`);

        if (FILTERED_SANTRI.length === 0) {
            alert(`Peringatan: Tidak ada data santri untuk kelas ${selectedClass} di database.`);
        }

        // Pindah View
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-main').classList.remove('hidden');
        
        // Setup Dashboard
        updateProfileInfo();
        updateDashboard();
        
        inputPin.value = ""; // Clear PIN
    } else {
        alert("PIN Salah! Coba lagi.");
        inputPin.value = "";
        inputPin.focus();
    }
}

function handleLogout() {
    appState.selectedClass = null;
    FILTERED_SANTRI = []; // Reset filter
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
        nameEl.textContent = info.musyrif || "Ustadz Musyrif";
        roleEl.textContent = `Musyrif Kelas ${appState.selectedClass}`;
    }
}

function updateDashboard() {
    // Update Statistik
    document.getElementById('dash-greeting').textContent = getGreeting();
    
    // Render List Jadwal
    const container = document.getElementById('dash-other-slots');
    container.innerHTML = '';
    const template = document.getElementById('tpl-slot-item');

    Object.values(SLOT_WAKTU).forEach(slot => {
        // Skip slot yang sedang aktif (ditampilkan di kartu utama)
        if (slot.id === appState.currentSlotId) {
            updateMainCard(slot);
            return;
        }

        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.slot-item');
        
        // Styling
        clone.querySelector('.slot-label').textContent = slot.label;
        clone.querySelector('.slot-icon-bg').classList.add(`bg-${slot.theme}-50`, `text-${slot.theme}-600`);
        
        // Cek Progress
        const progress = calculateSlotProgress(slot.id);
        clone.querySelector('.slot-status').textContent = progress.text;
        
        const bar = clone.querySelector('.slot-progress');
        bar.style.width = progress.percent + "%";
        bar.classList.add(`bg-${slot.theme}-500`);

        item.onclick = () => {
            appState.currentSlotId = slot.id;
            openAttendanceView();
        };

        container.appendChild(clone);
    });
    
    lucide.createIcons();
}

function updateMainCard(slot) {
    const card = document.getElementById('dash-main-card');
    const title = document.getElementById('dash-card-title');
    const time = document.getElementById('dash-card-time');
    
    // Reset Class
    card.className = "cursor-pointer rounded-[2.5rem] p-7 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ring-1 ring-white/10";
    
    // Tambah Gradient sesuai tema
    const gradients = {
        emerald: 'bg-gradient-to-br from-emerald-600 to-teal-500',
        orange: 'bg-gradient-to-br from-orange-500 to-red-500',
        indigo: 'bg-gradient-to-br from-indigo-600 to-blue-500',
        slate: 'bg-gradient-to-br from-slate-700 to-slate-900'
    };
    card.classList.add(...gradients[slot.theme].split(' '));
    
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

    // Hitung berapa santri di KELAS INI yang sudah punya status absen
    let checkedCount = 0;
    FILTERED_SANTRI.forEach(s => {
        // Ambil ID yg dinormalisasi string
        const id = String(s.nis || s.id);
        const record = dataHarian[slotId][id];
        
        // Anggap sudah absen jika record ada dan status shalat sudah diisi
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

function openAttendanceView() {
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-attendance').classList.remove('hidden');
    
    const slot = SLOT_WAKTU[appState.currentSlotId];
    document.getElementById('att-slot-title').textContent = slot.label;
    
    renderAttendanceList();
}

function closeAttendance() {
    document.getElementById('view-attendance').classList.add('hidden');
    document.getElementById('view-main').classList.remove('hidden');
    updateDashboard(); // Refresh data dashboard
}

function renderAttendanceList() {
    const container = document.getElementById('attendance-list-container');
    container.innerHTML = '';
    
    const slot = SLOT_WAKTU[appState.currentSlotId];
    
    // Pastikan struktur data hari ini ada
    const dateKey = appState.date;
    if (!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if (!appState.attendanceData[dateKey][slot.id]) appState.attendanceData[dateKey][slot.id] = {};

    const dbSlot = appState.attendanceData[dateKey][slot.id];

    // Filter Pencarian
    const search = appState.searchQuery.toLowerCase();
    const listToRender = FILTERED_SANTRI.filter(s => 
        s.nama.toLowerCase().includes(search)
    );

    document.getElementById('att-santri-count').textContent = `${listToRender.length} Santri`;

    const rowTemplate = document.getElementById('tpl-santri-row');
    const btnTemplate = document.getElementById('tpl-activity-btn');

    listToRender.forEach(santri => {
        const santriId = String(santri.nis || santri.id);
        
        // Init data santri jika belum ada di DB lokal
        if (!dbSlot[santriId]) {
            const initialStatus = {};
            slot.activities.forEach(act => {
                initialStatus[act.id] = act.type === 'mandator' ? 'Hadir' : 'Ya'; // Default Hadir
            });
            dbSlot[santriId] = { status: initialStatus, note: '' };
        }

        const sData = dbSlot[santriId];
        const clone = rowTemplate.content.cloneNode(true);
        
        // Isi Data Personal
        clone.querySelector('.santri-name').textContent = santri.nama;
        clone.querySelector('.santri-kamar').textContent = santri.asrama || santri.kelas; // Prioritas Asrama
        clone.querySelector('.santri-avatar').textContent = getInitials(santri.nama);

        // Jika Alpa/Sakit, beri highlight merah
        if (sData.status.shalat === 'Alpa' || sData.status.shalat === 'Sakit') {
            const row = clone.querySelector('.santri-row');
            row.classList.remove('bg-white', 'dark:bg-slate-800');
            row.classList.add('bg-red-50', 'border-red-200');
        }

        // Render Tombol Aktivitas
        const btnContainer = clone.querySelector('.activity-container');
        slot.activities.forEach(act => {
            const btnClone = btnTemplate.content.cloneNode(true);
            const btn = btnClone.querySelector('.btn-status');
            const lbl = btnClone.querySelector('.lbl-status');
            
            const currentStatus = sData.status[act.id];
            const ui = STATUS_UI[currentStatus] || STATUS_UI['Hadir'];

            // Style Tombol
            btn.className = `btn-status w-[3.5rem] h-[3.5rem] rounded-[1.2rem] flex items-center justify-center shadow-sm transition-all active:scale-95 border-2 ${ui.class}`;
            
            // Icon Logic
            if (ui.label.startsWith('icon-')) {
                const iconMap = { 'icon-check': 'check', 'icon-x': 'x', 'icon-minus': 'minus' };
                btn.innerHTML = `<i data-lucide="${iconMap[ui.label]}" class="w-6 h-6 stroke-[3px]"></i>`;
            } else {
                btn.textContent = ui.label;
                btn.classList.add('font-black', 'text-lg');
            }
            lbl.textContent = act.label;

            // Click Event
            btn.onclick = () => toggleStatus(santriId, act.id, act.type);
            
            btnContainer.appendChild(btnClone);
        });

        // Catatan
        const btnNote = clone.querySelector('.btn-edit-note');
        const noteSec = clone.querySelector('.note-section');
        const inputNote = clone.querySelector('.input-note');
        
        inputNote.value = sData.note || "";
        inputNote.onchange = (e) => {
            sData.note = e.target.value;
            saveData();
        };

        btnNote.onclick = () => {
            noteSec.classList.toggle('hidden');
        };

        container.appendChild(clone);
    });

    lucide.createIcons();
}

function toggleStatus(santriId, actId, type) {
    const slotId = appState.currentSlotId;
    const dateKey = appState.date;
    const sData = appState.attendanceData[dateKey][slotId][santriId];
    
    const current = sData.status[actId];
    let next = 'Hadir';

    if (type === 'mandator') {
        // Cycle: Hadir -> Sakit -> Izin -> Alpa -> Hadir
        if (current === 'Hadir') next = 'Sakit';
        else if (current === 'Sakit') next = 'Izin';
        else if (current === 'Izin') next = 'Alpa';
        else next = 'Hadir';
    } else {
        // Cycle: Ya -> Tidak -> Ya
        next = (current === 'Ya') ? 'Tidak' : 'Ya';
    }

    sData.status[actId] = next;
    
    // Auto-update related activities if Mandator changes to non-present
    if (actId === 'shalat' && ['Sakit', 'Izin', 'Alpa'].includes(next)) {
        // Jika Shalat tidak hadir, maka aktivitas sunnah/lainnya otomatis "Tidak"
        Object.keys(sData.status).forEach(k => {
            if (k !== 'shalat') sData.status[k] = 'Tidak';
        });
    } else if (actId === 'shalat' && next === 'Hadir') {
        // Reset ke default jika kembali hadir
        Object.keys(sData.status).forEach(k => {
            if (k !== 'shalat') sData.status[k] = 'Ya'; // Default sunnah
        });
    }

    saveData();
    renderAttendanceList();
}

// ==========================================
// 5. UTILS
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

// Fungsi Export CSV
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
        
        // Pastikan record ada
        if (!dbSlot[id]) {
            const initialStatus = {};
            slot.activities.forEach(act => {
                initialStatus[act.id] = act.type === 'mandator' ? 'Hadir' : 'Ya';
            });
            dbSlot[id] = { status: initialStatus, note: '' };
        }

        const sData = dbSlot[id];
        
        // Update Status
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
    alert(`Berhasil: Semua santri ${type === 'reset' ? 'Hadir' : 'Alpa'}.`);
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

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    // Update nav active state
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === tab) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    if (tab === 'home') updateDashboard();
    if (tab === 'profile') updateProfileInfo();
}

function toggleProblemFilter() {
    appState.filterProblemOnly = !appState.filterProblemOnly;
    const btn = document.getElementById('btn-filter-problem');
    
    if (appState.filterProblemOnly) {
        btn.classList.add('bg-red-100', 'text-red-600');
        btn.classList.remove('bg-slate-100', 'text-slate-400');
    } else {
        btn.classList.remove('bg-red-100', 'text-red-600');
        btn.classList.add('bg-slate-100', 'text-slate-400');
    }
    
    renderAttendanceList();
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
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

function bukaMenuSantri() {
    alert("Menu pengelolaan santri hanya tersedia di versi desktop/admin.");
}

// JALANKAN APLIKASI
window.onload = initApp;
