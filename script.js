// --- 1. DATA MASTER & CONFIG ---
// Kita ubah agar data diambil dari penyimpanan lokal HP (LocalStorage)
// Jika kosong, baru kita pakai data bawaan (default)
let DATA_SANTRI = JSON.parse(localStorage.getItem('musyrif_data_santri')) || [
    { id: 1, nama: "Ahmad Fulan", kamar: "101", avatar: "AF" },
    { id: 2, nama: "Budi Santoso", kamar: "101", avatar: "BS" }
];

// Fungsi untuk menyimpan perubahan data santri ke memori HP
function saveSantriData() {
    localStorage.setItem('musyrif_data_santri', JSON.stringify(DATA_SANTRI));
}

const SLOT_WAKTU = {
    shubuh: { id: 'shubuh', label: 'Shubuh', subLabel: '04:00 - 06:00', theme: 'emerald', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator', icon: 'users' },
        { id: 'qabliyah', label: 'Qabliyah', type: 'sunnah', icon: 'heart' },
        { id: 'tahfizh', label: 'Tahfizh', type: 'mandator', icon: 'book-open' },
        { id: 'dzikir', label: 'Dzikir', type: 'sunnah', icon: 'volume-2' },
        { id: 'tahajjud', label: 'Tahajjud', type: 'sunnah', icon: 'moon' }
    ]},
    ashar: { id: 'ashar', label: 'Ashar', subLabel: '15:00 - 17:00', theme: 'orange', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator', icon: 'users' },
        { id: 'dzikir', label: 'Dzikir', type: 'sunnah', icon: 'volume-2' }
    ]},
    maghrib: { id: 'maghrib', label: 'Maghrib', subLabel: '18:00 - 19:00', theme: 'indigo', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator', icon: 'users' },
        { id: 'bakdiyah', label: 'Bakdiyah', type: 'sunnah', icon: 'heart' },
        { id: 'tahsin', label: 'Tahsin', type: 'mandator', icon: 'book-open' },
        { id: 'conversation', label: 'Hiwar', type: 'mandator', icon: 'message-circle' },
        { id: 'vocab', label: 'Vocab', type: 'mandator', icon: 'mic' },
        { id: 'puasa', label: 'Puasa', type: 'sunnah', icon: 'coffee' }
    ]},
    isya: { id: 'isya', label: 'Isya', subLabel: '19:00 - 21:00', theme: 'slate', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator', icon: 'users' },
        { id: 'bakdiyah', label: 'Bakdiyah', type: 'sunnah', icon: 'heart' }
    ]}
};

const STATUS = { HADIR: 'Hadir', SAKIT: 'Sakit', IZIN: 'Izin', ALPA: 'Alpa', YA: 'Ya', TIDAK: 'Tidak' };
// UI Config: Dark mode adjustments handled via class structure in render logic
const STATUS_UI = {
    'Hadir': { class: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 dark:shadow-none shadow-lg', label: 'icon-check' },
    'Ya': { class: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 dark:shadow-none shadow-lg', label: 'icon-check' },
    'Sakit': { class: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700', label: 'S' },
    'Izin': { class: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700', label: 'I' },
    'Alpa': { class: 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800', label: 'icon-x' },
    'Tidak': { class: 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700', label: 'icon-minus' }
};

// --- 2. STATE MANAGEMENT & STORAGE ---
let appState = {
    currentSlotId: 'shubuh',
    attendanceData: {}, 
    noteOpenId: null,
    searchQuery: '',
    filterProblemOnly: false,
    darkMode: false
};

const STORAGE_KEY = 'musyrif_app_v4';

function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved) {
        appState.attendanceData = JSON.parse(saved);
    }
    // Load theme
    const theme = localStorage.getItem('theme');
    if(theme === 'dark') {
        appState.darkMode = true;
        document.documentElement.classList.add('dark');
    }
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.attendanceData));
}

function toggleDarkMode() {
    appState.darkMode = !appState.darkMode;
    if(appState.darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
}

function handleClearData() {
    // 1. Tanya konfirmasi dulu
    if(!confirm('PERINGATAN: Data presensi hari ini akan dihapus permanen. Lanjutkan?')) {
        return; // Batalkan jika pilih No
    }

    // 2. Minta PIN keamanan
    let pinInput = prompt("Masukkan PIN Keamanan untuk menghapus:");

    // 3. Cek apakah PIN benar (PIN bawaan '1234')
    if(pinInput === '1234') {
        localStorage.removeItem(STORAGE_KEY);
        appState.attendanceData = {};
        showToast("Data berhasil direset");
        // Refresh halaman agar bersih
        window.location.reload();
    } else {
        alert("PIN SALAH! Penghapusan dibatalkan.");
    }
}

function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Tanggal,Slot,Nama Santri,Kamar,Kegiatan,Status,Catatan\n";

    const data = appState.attendanceData;
    Object.keys(data).forEach(date => {
        const slots = data[date];
        Object.keys(slots).forEach(slotId => {
            const santris = slots[slotId];
            Object.keys(santris).forEach(santriId => {
                const sData = santris[santriId];
                const santri = DATA_SANTRI.find(s => s.id == santriId);
                if(santri) {
                        Object.keys(sData.status).forEach(actId => {
                            const status = sData.status[actId];
                            const slotName = SLOT_WAKTU[slotId].label;
                            const actName = SLOT_WAKTU[slotId].activities.find(a => a.id === actId).label;
                            const note = sData.note || "-";
                            const row = `${date},${slotName},${santri.nama},${santri.kamar},${actName},${status},"${note}"`;
                            csvContent += row + "\n";
                        });
                }
            });
        });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Presensi_${getTodayKey()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Laporan berhasil diunduh!");
}

function kirimLaporanWA() {
    const dateKey = getTodayKey();
    const dataHariIni = appState.attendanceData[dateKey];

    // Cek jika belum ada data sama sekali
    if (!dataHariIni) {
        alert("Belum ada data presensi hari ini untuk dilaporkan.");
        return;
    }

    // Siapkan wadah untuk menampung daftar pelanggaran
    let listAlpa = [];
    let listSakit = [];
    let totalHadir = 0;
    let totalSantri = DATA_SANTRI.length;

    // Loop (putar) semua data santri untuk dicek satu-satu
    DATA_SANTRI.forEach(santri => {
        let statusShalat = "Belum Absen";
        
        // Cek status di slot waktu saat ini (misal: Shubuh)
        if (dataHariIni[appState.currentSlotId] && dataHariIni[appState.currentSlotId][santri.id]) {
            statusShalat = dataHariIni[appState.currentSlotId][santri.id].status.shalat;
        }

        if (statusShalat === 'Hadir') {
            totalHadir++;
        } else if (statusShalat === 'Alpa') {
            listAlpa.push(`- ${santri.nama} (${santri.kamar})`);
        } else if (statusShalat === 'Sakit') {
            listSakit.push(`- ${santri.nama}`);
        }
    });

    // Susun kata-kata laporan
    // %0A adalah kode untuk "Enter" (Ganti Baris) di link WhatsApp
    let teks = `*LAPORAN PRESENSI ASRAMA* %0A`;
    teks += `📅 Tanggal: ${dateKey} %0A`;
    teks += `🕌 Waktu: ${SLOT_WAKTU[appState.currentSlotId].label} %0A`;
    teks += `--------------------------- %0A`;
    teks += `✅ Hadir: ${totalHadir} %0A`;
    teks += `🤒 Sakit: ${listSakit.length} %0A`;
    teks += `❌ Alpa: ${listAlpa.length} %0A`;
    teks += `--------------------------- %0A`;

    if (listAlpa.length > 0) {
        teks += `*DAFTAR ALPA:* %0A${listAlpa.join('%0A')} %0A %0A`;
    }
    
    if (listSakit.length > 0) {
        teks += `*DAFTAR SAKIT:* %0A${listSakit.join('%0A')} %0A`;
    }

    teks += `_Digenerate oleh MusyrifApp_`;

    // Buka WhatsApp
    window.open(`https://wa.me/?text=${teks}`, '_blank');
}

// --- 3. CORE LOGIC ---
function getTodayKey() { return new Date().toISOString().split('T')[0]; }

function getSlotData(slotId) {
    const dateKey = getTodayKey();
    if (!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if (!appState.attendanceData[dateKey][slotId]) {
        const slotConfig = SLOT_WAKTU[slotId];
        appState.attendanceData[dateKey][slotId] = {};
        DATA_SANTRI.forEach(santri => {
            const statuses = {};
            slotConfig.activities.forEach(act => {
                statuses[act.id] = act.type === 'mandator' ? STATUS.HADIR : STATUS.YA;
            });
            appState.attendanceData[dateKey][slotId][santri.id] = { status: statuses, note: '' };
        });
    }
    return appState.attendanceData[dateKey][slotId];
}

function calculateStats() {
    let totalChecks = 0, totalHadir = 0;
    const data = appState.attendanceData[getTodayKey()] || {};
    Object.keys(data).forEach(slotId => {
        Object.values(data[slotId]).forEach(santri => {
            if (santri.status.shalat) {
                totalChecks++;
                if (santri.status.shalat === STATUS.HADIR) totalHadir++;
            }
        });
    });
    if (totalChecks === 0 && Object.keys(data).length === 0) return 0;
    if (totalChecks === 0) return 100; 
    return Math.round((totalHadir / totalChecks) * 100);
}

// --- 4. NAVIGATION & TIME ---
function init() {
    loadFromStorage();
    autoDetectSlot();
    startClock();
}

function startClock() {
    function update() {
        const now = new Date();
        const dateString = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
        const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const el = document.getElementById('dash-clock');
        if(el) el.textContent = `${dateString} • ${timeString} WIB`;
    }
    update();
    setInterval(update, 1000);
}

function getGreeting() {
    const h = new Date().getHours();
    if(h < 11) return "Selamat Pagi";
    if(h < 15) return "Selamat Siang";
    if(h < 18) return "Selamat Sore";
    return "Selamat Malam";
}

function autoDetectSlot() {
    const hour = new Date().getHours();
    if (hour >= 3 && hour < 10) appState.currentSlotId = 'shubuh';
    else if (hour >= 15 && hour < 17) appState.currentSlotId = 'ashar';
    else if (hour >= 17 && hour < 19) appState.currentSlotId = 'maghrib';
    else appState.currentSlotId = 'isya';
}

function handleLogin() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-main').classList.remove('hidden');
    switchTab('home'); 
}

function handleLogout() {
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.target === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    if (tabName === 'home') updateDashboard();
    if (tabName === 'report') updateReportTab();
    lucide.createIcons();
}

function openAttendance() {
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-attendance').classList.remove('hidden');
    updateAttendanceView();
}

function closeAttendance() {
    document.getElementById('view-attendance').classList.add('hidden');
    document.getElementById('view-main').classList.remove('hidden');
    switchTab('home');
}

// --- 5. RENDER LOGIC ---

function updateDashboard() {
    document.getElementById('dash-greeting').textContent = getGreeting();
    const percent = calculateStats();
    document.getElementById('dash-stats-pie').style.setProperty('--percent', `${percent}%`);
    document.getElementById('dash-stats-text').textContent = `${percent}%`;

    const currentSlot = SLOT_WAKTU[appState.currentSlotId];
    const card = document.getElementById('dash-main-card');
    
    const themes = {
        emerald: 'from-emerald-400 to-emerald-600 shadow-emerald-500/30',
        orange: 'from-orange-400 to-orange-600 shadow-orange-500/30',
        indigo: 'from-indigo-400 to-indigo-600 shadow-indigo-500/30',
        slate: 'from-slate-700 to-slate-900 shadow-slate-500/30',
    };
    
    card.className = `p-1 rounded-[2rem] bg-gradient-to-br ${themes[currentSlot.theme]} shadow-lg transform transition-all duration-300 hover:scale-[1.01] cursor-pointer`;
    document.getElementById('dash-card-title').textContent = currentSlot.label;
    document.getElementById('dash-card-time').textContent = currentSlot.subLabel;

    const listContainer = document.getElementById('dash-other-slots');
    listContainer.innerHTML = ''; 
    const tpl = document.getElementById('tpl-slot-item');

    Object.values(SLOT_WAKTU).forEach(slot => {
        if (slot.id === appState.currentSlotId) return;

        const clone = tpl.content.cloneNode(true);
        const itemDiv = clone.querySelector('.slot-item');
        itemDiv.onclick = () => { appState.currentSlotId = slot.id; openAttendance(); };

        clone.querySelector('.slot-icon-bg').className = `slot-icon-bg w-12 h-12 rounded-xl flex items-center justify-center transition-colors bg-${slot.theme}-50 dark:bg-${slot.theme}-900/50 text-${slot.theme}-600 dark:text-${slot.theme}-400 group-hover:bg-${slot.theme}-100 dark:group-hover:bg-${slot.theme}-900`;
        clone.querySelector('.slot-label').textContent = slot.label;
        
        const dateKey = getTodayKey();
        const hasData = appState.attendanceData[dateKey] && appState.attendanceData[dateKey][slot.id];
        
        let statusText = "Belum dimulai";
        let progressWidth = "0%";
        
        if(hasData) {
            statusText = `${DATA_SANTRI.length}/${DATA_SANTRI.length} Santri`;
            progressWidth = "100%";
        }

        clone.querySelector('.slot-status').textContent = statusText;
        clone.querySelector('.slot-progress').style.width = progressWidth;
        clone.querySelector('.slot-progress').className = `slot-progress h-full bg-${slot.theme}-500 w-0 progress-bar rounded-full`;

        listContainer.appendChild(clone);
    });
}

function updateReportTab() {
    const container = document.getElementById('report-problem-list');
    container.innerHTML = '';
    
    const dateKey = getTodayKey();
    const todayData = appState.attendanceData[dateKey] || {};
    let problemCount = 0;

    DATA_SANTRI.forEach(santri => {
        let alpaCount = 0;
        let details = [];
        Object.keys(todayData).forEach(slotId => {
            const sData = todayData[slotId][santri.id];
            if (sData && (sData.status.shalat === STATUS.ALPA)) {
                alpaCount++;
                details.push(SLOT_WAKTU[slotId].label);
            }
        });

        if (alpaCount > 0) {
            problemCount++;
            const div = document.createElement('div');
            div.className = 'bg-white dark:bg-dark-card p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition slide-up';
            div.onclick = () => openSantriModal(santri.id);
            div.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm ring-2 ring-white dark:ring-slate-700 shadow-sm">${santri.avatar}</div>
                <div class="flex-1">
                    <h4 class="font-bold text-slate-700 dark:text-white text-sm">${santri.nama}</h4>
                    <p class="text-xs text-red-500 dark:text-red-400 font-medium">Alpa: ${details.join(', ')}</p>
                </div>
                <button class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">Detail</button>
            `;
            container.appendChild(div);
        }
    });

    if(problemCount === 0) {
        container.innerHTML = `
            <div class="text-center py-8 bg-white dark:bg-dark-card rounded-3xl border border-slate-100 dark:border-slate-700 border-dashed">
                <i data-lucide="check-circle" class="w-12 h-12 text-emerald-200 dark:text-emerald-900 mx-auto mb-2"></i>
                <p class="text-slate-400 text-sm">Alhamdulillah, nihil pelanggaran hari ini.</p>
            </div>
        `;
    }
    lucide.createIcons();
}

function updateAttendanceView() {
    const slot = SLOT_WAKTU[appState.currentSlotId];
    document.getElementById('att-slot-title').textContent = slot.label;
    appState.searchQuery = '';
    document.getElementById('att-search').value = '';
    renderAttendanceList();
}

function handleSearch(val) {
    appState.searchQuery = val.toLowerCase();
    renderAttendanceList();
}

function toggleProblemFilter() {
    appState.filterProblemOnly = !appState.filterProblemOnly;
    const btn = document.getElementById('btn-filter-problem');
    if (appState.filterProblemOnly) {
        btn.classList.add('bg-red-100', 'text-red-600', 'border-red-200', 'dark:bg-red-900/30', 'dark:text-red-400', 'dark:border-red-800');
        btn.classList.remove('bg-slate-100', 'text-slate-500', 'border-transparent', 'dark:bg-slate-800', 'dark:text-slate-400');
        showToast('Filter: Masalah Saja');
    } else {
        btn.classList.remove('bg-red-100', 'text-red-600', 'border-red-200', 'dark:bg-red-900/30', 'dark:text-red-400', 'dark:border-red-800');
        btn.classList.add('bg-slate-100', 'text-slate-500', 'border-transparent', 'dark:bg-slate-800', 'dark:text-slate-400');
        showToast('Filter: Semua');
    }
    renderAttendanceList();
}

function openSantriModal(santriId) {
    const santri = DATA_SANTRI.find(s => s.id === santriId);
    if (!santri) return;
    
    document.getElementById('modal-avatar').textContent = santri.avatar;
    document.getElementById('modal-name').textContent = santri.nama;
    document.getElementById('modal-kamar').textContent = santri.kamar;

    // Stats Hari Ini
    const dateKey = getTodayKey();
    const todayData = appState.attendanceData[dateKey] || {};
    let countHadir = 0;
    let countAlpa = 0;

    Object.keys(todayData).forEach(slotId => {
        const sData = todayData[slotId][santri.id];
        if(sData) {
            Object.values(sData.status).forEach(status => {
                if(status === STATUS.HADIR || status === STATUS.YA) countHadir++;
                if(status === STATUS.ALPA || status === STATUS.TIDAK) countAlpa++;
            });
        }
    });

    document.getElementById('modal-stat-hadir').textContent = countHadir;
    document.getElementById('modal-stat-alpa').textContent = countAlpa;

    // Riwayat list (Last 5 days)
    const historyList = document.getElementById('modal-history-list');
    historyList.innerHTML = '';
    
    // Get all stored dates, sort desc
    const dates = Object.keys(appState.attendanceData).sort().reverse();
    let foundHistory = false;

    dates.forEach(date => {
        const sSlots = appState.attendanceData[date];
        let dailyStatus = [];
        Object.keys(sSlots).forEach(slotKey => {
            const statusShalat = sSlots[slotKey][santri.id]?.status.shalat;
            if(statusShalat === STATUS.ALPA) dailyStatus.push(`${SLOT_WAKTU[slotKey].label}: Alpa`);
        });

        if(dailyStatus.length > 0) {
             foundHistory = true;
             const item = document.createElement('div');
             item.className = 'text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded flex justify-between';
             item.innerHTML = `
                <span class="font-bold text-slate-600 dark:text-slate-300">${date}</span>
                <span class="text-red-500">${dailyStatus.join(', ')}</span>
             `;
             historyList.appendChild(item);
        } else if (date !== getTodayKey()) {
             // Show safe days too maybe? Just show problems for now to keep it clean
        }
    });

    if(!foundHistory) {
        historyList.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-2">Tidak ada catatan pelanggaran.</p>';
    }

    document.getElementById('modal-santri').showModal();
}

function renderAttendanceList() {
    const container = document.getElementById('attendance-list-container');
    container.innerHTML = '';
    
    const slot = SLOT_WAKTU[appState.currentSlotId];
    const data = getSlotData(appState.currentSlotId);
    const rowTpl = document.getElementById('tpl-santri-row');
    const btnTpl = document.getElementById('tpl-activity-btn');

    const filteredSantri = DATA_SANTRI.filter(santri => {
        const sData = data[santri.id];
        const matchesSearch = santri.nama.toLowerCase().includes(appState.searchQuery);
        let hasProblem = sData.status['shalat'] !== STATUS.HADIR;
        return appState.filterProblemOnly ? (matchesSearch && hasProblem) : matchesSearch;
    });

    document.getElementById('att-santri-count').textContent = `${filteredSantri.length} Santri`;

    if (filteredSantri.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-10 text-slate-400"><i data-lucide="search-x" class="w-12 h-12 mb-2 opacity-50"></i><p class="text-sm">Tidak ada data.</p></div>`;
    }

    filteredSantri.forEach(santri => {
        const sData = data[santri.id];
        const isProblematic = sData.status['shalat'] === STATUS.ALPA || sData.status['shalat'] === STATUS.SAKIT;
        const rowClone = rowTpl.content.cloneNode(true);
        const rowDiv = rowClone.querySelector('.santri-row');
        
        if (isProblematic) {
            rowDiv.classList.add('ring-1', 'ring-red-200', 'bg-red-50/30', 'dark:bg-red-900/20', 'dark:ring-red-900');
            rowDiv.classList.remove('bg-white', 'dark:bg-dark-card');
            rowClone.querySelector('.santri-avatar').className = 'santri-avatar w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 ring-2 ring-white dark:ring-red-900 shadow-sm';
        }

        rowClone.querySelector('.santri-avatar').textContent = santri.avatar;
        rowClone.querySelector('.santri-name').textContent = santri.nama;
        rowClone.querySelector('.santri-kamar').textContent = santri.kamar;
        rowClone.querySelector('.btn-profile').onclick = () => openSantriModal(santri.id);

        const noteSection = rowClone.querySelector('.note-section');
        const noteInput = rowClone.querySelector('.input-note');
        const btnEdit = rowClone.querySelector('.btn-edit-note');

        noteInput.value = sData.note;
        const updateNote = (val) => {
             saveNote(santri.id, val);
             noteInput.value = val;
        };
        noteInput.onchange = (e) => updateNote(e.target.value);

        // Quick Chips Logic
        rowClone.querySelectorAll('.chip-note').forEach(chip => {
            chip.onclick = () => updateNote(chip.textContent);
        });

        if (appState.noteOpenId === santri.id) {
            noteSection.classList.remove('hidden');
            btnEdit.classList.add('text-emerald-600', 'bg-emerald-50', 'dark:bg-emerald-900/30', 'dark:text-emerald-400');
            btnEdit.classList.remove('text-slate-300', 'dark:text-slate-500');
        }
        btnEdit.onclick = () => {
            appState.noteOpenId = appState.noteOpenId === santri.id ? null : santri.id;
            renderAttendanceList(); 
        };

        const activityContainer = rowClone.querySelector('.activity-container');
        slot.activities.forEach(act => {
            const btnClone = btnTpl.content.cloneNode(true);
            const btn = btnClone.querySelector('.btn-status');
            const label = btnClone.querySelector('.lbl-status');
            const currentStatus = sData.status[act.id];
            const uiConfig = STATUS_UI[currentStatus] || STATUS_UI['Hadir'];

            btn.className = `btn-status w-[3.25rem] h-[3.25rem] rounded-2xl flex items-center justify-center shadow-sm transition-all active:scale-90 border-[3px] group-hover:-translate-y-1 ${uiConfig.class}`;
            label.textContent = act.label;

            if (uiConfig.label.startsWith('icon-')) {
                const iconName = uiConfig.label === 'icon-check' ? 'check' : (uiConfig.label === 'icon-minus' ? 'minus' : 'x');
                btn.innerHTML = `<i data-lucide="${iconName}" class="w-6 h-6 stroke-[3px]"></i>`;
            } else {
                btn.innerHTML = `<span class="text-lg font-extrabold">${uiConfig.label}</span>`;
            }
            btn.onclick = () => handleStatusChange(santri.id, act.id, act.type);
            activityContainer.appendChild(btnClone);
        });
        container.appendChild(rowClone);
    });
    lucide.createIcons();
}

// --- 6. ACTIONS ---
function handleStatusChange(studentId, activityId, activityType) {
    const slotId = appState.currentSlotId;
    const data = getSlotData(slotId);
    const studentData = data[studentId];
    const currentStatus = studentData.status[activityId];
    let nextStatus;

    if (activityType === 'mandator') {
        if (currentStatus === STATUS.HADIR) nextStatus = STATUS.SAKIT;
        else if (currentStatus === STATUS.SAKIT) nextStatus = STATUS.IZIN;
        else if (currentStatus === STATUS.IZIN) nextStatus = STATUS.ALPA;
        else nextStatus = STATUS.HADIR;
    } else {
        nextStatus = currentStatus === STATUS.YA ? STATUS.TIDAK : STATUS.YA;
    }

    studentData.status[activityId] = nextStatus;

    // CASCADE LOGIC
    if (activityId === 'shalat' && (nextStatus === STATUS.ALPA || nextStatus === STATUS.SAKIT || nextStatus === STATUS.IZIN)) {
        SLOT_WAKTU[slotId].activities.forEach(act => {
            if (act.id !== 'shalat') {
                studentData.status[act.id] = act.type === 'mandator' ? nextStatus : STATUS.TIDAK;
            }
        });
    }
    saveToLocalStorage();
    renderAttendanceList();
    showToast('Tersimpan');
}

function handleBulkAction(type) {
    const data = getSlotData(appState.currentSlotId);
    const slotConfig = SLOT_WAKTU[appState.currentSlotId];
    const visibleSantriIds = Array.from(document.querySelectorAll('.santri-name')).map(el => {
        return DATA_SANTRI.find(s => s.nama === el.textContent).id;
    });
    visibleSantriIds.forEach(id => {
        slotConfig.activities.forEach(act => {
            if (type === 'reset') {
                data[id].status[act.id] = act.type === 'mandator' ? STATUS.HADIR : STATUS.YA;
            } else if (type === 'alpa') {
                data[id].status[act.id] = act.type === 'mandator' ? STATUS.ALPA : STATUS.TIDAK;
            }
        });
    });
    saveToLocalStorage();
    renderAttendanceList();
    showToast(type === 'reset' ? 'Semua Hadir' : 'Semua Alpa');
}

function saveNote(studentId, note) {
    const data = getSlotData(appState.currentSlotId);
    data[studentId].note = note;
    saveToLocalStorage();
}

function showToast(msg = 'Saved') {
    const indicator = document.getElementById('save-indicator');
    if(!indicator) {
        let toast = document.createElement('div');
        toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-white text-white dark:text-slate-800 text-xs font-bold py-3 px-6 rounded-full shadow-2xl z-[100] fade-in flex items-center gap-2';
        toast.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 dark:text-emerald-600"></i> ${msg}`;
        document.body.appendChild(toast);
        lucide.createIcons();
        setTimeout(() => toast.remove(), 2500);
        return;
    }
    indicator.innerHTML = `<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full fade-in shadow-sm border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">${msg}</span>`;
    setTimeout(() => { if(indicator) indicator.innerHTML = ''; }, 2000);
}

// --- FITUR BARU: MANAJEMEN SANTRI ---

function bukaMenuSantri() {
    renderListEditorSantri();
    document.getElementById('modal-manage-santri').showModal();
}

function renderListEditorSantri() {
    const container = document.getElementById('list-manage-santri');
    container.innerHTML = '';

    // Urutkan santri berdasarkan nama biar rapi
    const sortedSantri = [...DATA_SANTRI].sort((a, b) => a.nama.localeCompare(b.nama));

    sortedSantri.forEach((santri, index) => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-white dark:bg-dark-card p-3 rounded-xl border border-slate-100 dark:border-slate-700';
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold dark:text-white">${santri.avatar}</div>
                <div>
                    <h4 class="font-bold text-sm text-slate-800 dark:text-white">${santri.nama}</h4>
                    <span class="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">${santri.kamar}</span>
                </div>
            </div>
            <button onclick="hapusSantri(${santri.id})" class="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
}

function tambahSantriBaru() {
    const namaInput = document.getElementById('input-nama-baru');
    const kamarInput = document.getElementById('input-kamar-baru');
    
    const nama = namaInput.value.trim();
    const kamar = kamarInput.value.trim();

    if (!nama || !kamar) {
        alert("Nama dan Kamar wajib diisi!");
        return;
    }

    // Buat ID baru (ambil ID terbesar + 1)
    const newId = DATA_SANTRI.length > 0 ? Math.max(...DATA_SANTRI.map(s => s.id)) + 1 : 1;
    
    // Buat inisial avatar (misal: Ahmad Fulan -> AF)
    const avatar = nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Masukkan ke data
    DATA_SANTRI.push({
        id: newId,
        nama: nama,
        kamar: kamar,
        avatar: avatar
    });

    saveSantriData(); // Simpan ke HP
    
    // Reset form
    namaInput.value = '';
    kamarInput.value = '';
    
    // Refresh tampilan
    renderListEditorSantri();
    showToast("Santri berhasil ditambahkan");
}

function hapusSantri(id) {
    if(confirm('Yakin hapus santri ini? Data presensi lama mungkin akan error jika tidak dibersihkan.')) {
        DATA_SANTRI = DATA_SANTRI.filter(s => s.id !== id);
        saveSantriData();
        renderListEditorSantri();
        showToast("Santri dihapus");
    }
}

window.onload = init;
