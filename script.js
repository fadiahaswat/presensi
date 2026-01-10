// --- 1. DATA MASTER & CONFIG ---

let DATA_SANTRI = []; 
let DATA_KELAS = {};

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

const STATUS_UI = {
    'Hadir': { class: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 dark:shadow-none shadow-lg', label: 'icon-check' },
    'Ya': { class: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 dark:shadow-none shadow-lg', label: 'icon-check' },
    'Sakit': { class: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700', label: 'S' },
    'Izin': { class: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700', label: 'I' },
    'Alpa': { class: 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800', label: 'icon-x' },
    'Tidak': { class: 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700', label: 'icon-minus' }
};

let appState = {
    currentSlotId: 'shubuh',
    attendanceData: {}, 
    noteOpenId: null,
    searchQuery: '',
    filterProblemOnly: false,
    darkMode: false,
    selectedDate: new Date().toISOString().split('T')[0]
};

const STORAGE_KEY = 'musyrif_app_v4';

function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved) {
        appState.attendanceData = JSON.parse(saved);
    }
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

// --- 3. CORE INIT LOGIC (FIXED) ---

function getTodayKey() { return appState.selectedDate; }

async function init() {
    const loadingEl = document.getElementById('view-loading');
    if(loadingEl) loadingEl.classList.remove('opacity-0', 'pointer-events-none');
    
    loadFromStorage();
    startClock();
    autoDetectSlot();

    try {
        // 1. Load Data Kelas
        if (window.loadClassData) {
            DATA_KELAS = await window.loadClassData();
            console.log("RAW DATA KELAS:", DATA_KELAS); // Debugging
        }
        
        // 2. Load Data Santri
        if (window.loadSantriData) {
            const rawSantriData = await window.loadSantriData();
            console.log("RAW DATA SANTRI:", rawSantriData); // Debugging

            if (rawSantriData && rawSantriData.length > 0) {
                // 3. Map Data dengan Pengecekan Nama Kolom (Case Insensitive)
                DATA_SANTRI = rawSantriData.map(s => {
                    // Cek berbagai kemungkinan nama kolom
                    const idVal = s.nis || s.NIS || s.id || s.ID;
                    const id = idVal ? idVal.toString() : `temp_${Math.random().toString(36).substr(2, 9)}`;
                    
                    const nama = s.nama || s.Nama || s.NAMA || "Tanpa Nama";
                    const kamar = s.kelas || s.Kelas || s.rombel || s.kamar || "Umum";
                    
                    const prefs = (window.SantriManager) ? window.SantriManager.getPrefs(id) : {};
                    
                    return {
                        id: id,
                        nama: nama,
                        kamar: kamar, 
                        avatar: prefs.avatar || generateInitials(nama)
                    };
                });
            } else {
                console.warn("Data Santri dari server KOSONG.");
            }
            
            // 4. Parse untuk SantriManager
            if (window.parseSantriData) {
                window.parseSantriData(); 
            }
        }

    } catch (error) {
        console.error("Error initializing data:", error);
        alert("Gagal memuat data dari server. Aplikasi berjalan dengan data cache (jika ada).");
    }

    lucide.createIcons();
    updateDashboard();
    updateProfileInfo(); // Update Tampilan Profil Musyrif
    
    setTimeout(() => {
        if(loadingEl) loadingEl.classList.add('opacity-0', 'pointer-events-none');
    }, 800);
}

// FUNGSI BARU: Update Info Musyrif di Tab Profil
function updateProfileInfo() {
    const profileNameEl = document.getElementById('profile-name');
    const profileRoleEl = document.getElementById('profile-role');
    
    if(!profileNameEl || !profileRoleEl) return;

    // Logika Sederhana: Ambil nama musyrif dari kelas pertama yang ditemukan
    // Karena kita tidak tahu user login sebagai siapa, kita ambil sampel data kelas
    const kelasKeys = Object.keys(DATA_KELAS);
    
    if (kelasKeys.length > 0) {
        // Ambil kelas pertama sebagai contoh
        const sampleKelas = DATA_KELAS[kelasKeys[0]];
        if (sampleKelas && sampleKelas.musyrif) {
            profileNameEl.textContent = sampleKelas.musyrif;
            profileRoleEl.textContent = "Musyrif Asrama";
        } else {
            profileNameEl.textContent = "Ustadz Musyrif";
            profileRoleEl.textContent = "Data Kelas Belum Lengkap";
        }
    } else {
        profileNameEl.textContent = "Ustadz Musyrif";
        profileRoleEl.textContent = "Mode Offline / Tanpa Data";
    }
}

function generateInitials(name) {
    if(!name) return "??";
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

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
    
    // Sinkronisasi data baru
    DATA_SANTRI.forEach(santri => {
        if(!appState.attendanceData[dateKey][slotId][santri.id]) {
             const statuses = {};
             SLOT_WAKTU[slotId].activities.forEach(act => {
                statuses[act.id] = act.type === 'mandator' ? STATUS.HADIR : STATUS.YA;
            });
            appState.attendanceData[dateKey][slotId][santri.id] = { status: statuses, note: '' };
        }
    });

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
    const inputField = document.getElementById('login-pin');
    const inputPin = inputField.value;
    const storedPin = localStorage.getItem('musyrif_pin') || '1234';

    if (inputPin === storedPin) {
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-main').classList.remove('hidden');
        switchTab('home');
        inputField.value = ''; 
    } else {
        alert("PIN SALAH! Silakan coba lagi.");
        inputField.value = '';
        inputField.focus();
    }
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
    if (tabName === 'profile') updateProfileInfo();
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
        emerald: 'from-emerald-600 to-teal-500',
        orange: 'from-orange-500 to-red-500',
        indigo: 'from-indigo-600 to-blue-500',
        slate: 'from-slate-700 to-slate-900',
    };
    
    card.className = `cursor-pointer rounded-[2.5rem] p-7 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ring-1 ring-white/10 bg-gradient-to-br ${themes[currentSlot.theme]}`;
    
    document.getElementById('dash-card-title').textContent = currentSlot.label;
    document.getElementById('dash-card-time').textContent = currentSlot.subLabel;

    const listContainer = document.getElementById('dash-other-slots');
    listContainer.innerHTML = ''; 
    const tpl = document.getElementById('tpl-slot-item');

    Object.values(SLOT_WAKTU).forEach(slot => {
        if (slot.id === appState.currentSlotId) return;

        const clone = tpl.content.cloneNode(true);
        const itemDiv = clone.querySelector('.slot-item');
        
        const iconBg = clone.querySelector('.slot-icon-bg');
        iconBg.classList.add(`bg-${slot.theme}-50`, `dark:bg-${slot.theme}-900/30`, `text-${slot.theme}-600`, `dark:text-${slot.theme}-400`);
        
        const label = clone.querySelector('.slot-label');
        label.classList.add(`group-hover:text-${slot.theme}-600`, `dark:group-hover:text-${slot.theme}-400`);

        itemDiv.onclick = () => { appState.currentSlotId = slot.id; openAttendance(); };

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
        
        const progressBar = clone.querySelector('.slot-progress');
        progressBar.style.width = progressWidth;
        progressBar.classList.remove('from-emerald-400', 'to-teal-400');
        progressBar.classList.add(`bg-${slot.theme}-500`); 

        listContainer.appendChild(clone);
    });
    lucide.createIcons();
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
            div.className = 'bg-white/80 dark:bg-slate-800 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-700 transition slide-up shadow-sm hover:shadow-md';
            div.onclick = () => openSantriModal(santri.id);
            div.innerHTML = `
                <div class="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm ring-1 ring-red-100 dark:ring-red-900 shadow-sm">${santri.avatar}</div>
                <div class="flex-1">
                    <h4 class="font-bold text-slate-700 dark:text-white text-sm">${santri.nama}</h4>
                    <p class="text-xs text-red-500 dark:text-red-400 font-medium mt-0.5">Alpa: ${details.join(', ')}</p>
                </div>
                <button class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Detail</button>
            `;
            container.appendChild(div);
        }
    });

    if(problemCount === 0) {
        container.innerHTML = `
            <div class="text-center py-10 bg-white/50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                <div class="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="check-circle" class="w-8 h-8 text-emerald-500 dark:text-emerald-400"></i>
                </div>
                <p class="text-slate-400 text-sm font-medium">Alhamdulillah, nihil pelanggaran.</p>
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
        btn.classList.add('bg-red-100', 'text-red-600', 'border-red-200');
        btn.classList.remove('bg-slate-100', 'text-slate-400');
        showToast('Filter: Masalah Saja');
    } else {
        btn.classList.remove('bg-red-100', 'text-red-600', 'border-red-200');
        btn.classList.add('bg-slate-100', 'text-slate-400');
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

    const historyList = document.getElementById('modal-history-list');
    historyList.innerHTML = '';
    
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
             item.className = 'text-xs bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl flex justify-between border border-slate-100 dark:border-slate-700';
             item.innerHTML = `
                <span class="font-bold text-slate-600 dark:text-slate-300">${date}</span>
                <span class="text-red-500 font-bold">${dailyStatus.join(', ')}</span>
             `;
             historyList.appendChild(item);
        }
    });

    if(!foundHistory) {
        historyList.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">Tidak ada catatan pelanggaran.</p>';
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
    }).sort((a, b) => {
        if (a.kamar < b.kamar) return -1;
        if (a.kamar > b.kamar) return 1;
        return a.nama.localeCompare(b.nama);
    });

    document.getElementById('att-santri-count').textContent = `${filteredSantri.length} Santri`;

    if (filteredSantri.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60"><i data-lucide="search-x" class="w-16 h-16 mb-4 opacity-50"></i><p class="text-sm font-bold">Tidak ada data.</p></div>`;
    }

    filteredSantri.forEach(santri => {
        const sData = data[santri.id];
        const isProblematic = sData.status['shalat'] === STATUS.ALPA || sData.status['shalat'] === STATUS.SAKIT;
        const rowClone = rowTpl.content.cloneNode(true);
        const rowDiv = rowClone.querySelector('.santri-row');
        
        if (isProblematic) {
            rowDiv.classList.add('ring-2', 'ring-red-200', 'bg-red-50/50', 'dark:bg-red-900/10', 'dark:ring-red-900/50');
            rowDiv.classList.remove('bg-white', 'dark:bg-slate-800');
            rowClone.querySelector('.santri-avatar').className = 'santri-avatar w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shadow-sm border border-red-200 dark:border-red-800';
            rowClone.querySelector('.bar-indicator').className = 'absolute left-0 top-0 bottom-0 w-2 bg-red-400 transition-colors bar-indicator';
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

        rowClone.querySelectorAll('.chip-note').forEach(chip => {
            chip.onclick = () => updateNote(chip.textContent);
        });

        if (appState.noteOpenId === santri.id) {
            noteSection.classList.remove('hidden');
            btnEdit.classList.add('text-emerald-600', 'bg-emerald-50', 'dark:bg-emerald-900/30', 'dark:text-emerald-400');
            btnEdit.classList.remove('text-slate-300');
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

            btn.className = `btn-status w-[3.5rem] h-[3.5rem] rounded-[1.2rem] flex items-center justify-center shadow-sm transition-all duration-300 active:scale-90 border-[3px] hover:-translate-y-1 relative overflow-hidden ${uiConfig.class}`;
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
    if (navigator.vibrate) navigator.vibrate(50);
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

function bukaMenuSantri() {
    renderListEditorSantri();
    document.getElementById('modal-manage-santri').showModal();
}

function renderListEditorSantri() {
    const container = document.getElementById('list-manage-santri');
    container.innerHTML = '';
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'p-3 mb-3 bg-blue-50 text-blue-700 text-xs rounded-xl border border-blue-100';
    infoDiv.innerText = "Info: Data santri diambil dari Server (Google Sheet). Perubahan di sini bersifat sementara.";
    container.appendChild(infoDiv);

    const sortedSantri = [...DATA_SANTRI].sort((a, b) => a.nama.localeCompare(b.nama));
    sortedSantri.forEach((santri, index) => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700';
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-xs font-bold dark:text-white shadow-sm">${santri.avatar}</div>
                <div>
                    <h4 class="font-bold text-sm text-slate-800 dark:text-white">${santri.nama}</h4>
                    <span class="text-[10px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 px-2 py-0.5 rounded text-slate-500">${santri.kamar}</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
}

function tambahSantriBaru() {
    alert("Fitur Tambah Santri dimatikan karena data diambil otomatis dari Google Sheet. Silakan tambahkan di Spreadsheet.");
}

function hapusSantri(id) {
    alert("Fitur Hapus Santri dimatikan. Silakan hapus data dari Google Sheet.");
}

function handleGantiPin() {
    const storedPin = localStorage.getItem('musyrif_pin') || '1234';
    const pinLama = prompt("Masukkan PIN Lama Anda:");
    if (pinLama !== storedPin) { alert("PIN Lama salah!"); return; }
    const pinBaru = prompt("Masukkan PIN Baru (Min 4 angka):");
    if (!pinBaru || pinBaru.length < 4) { alert("PIN terlalu pendek."); return; }
    const konfirmasi = prompt("Ketik ulang PIN Baru Anda:");
    if (pinBaru !== konfirmasi) { alert("Konfirmasi tidak cocok."); return; }
    localStorage.setItem('musyrif_pin', pinBaru);
    alert("BERHASIL! PIN Login telah diganti.");
}

function handleClearData() {
    if(!confirm('PERINGATAN: Data presensi hari ini akan dihapus permanen. Lanjutkan?')) {
        return;
    }
    let pinInput = prompt("Masukkan PIN Keamanan untuk menghapus:");
    const storedPin = localStorage.getItem('musyrif_pin') || '1234';

    if(pinInput === storedPin) {
        delete appState.attendanceData[getTodayKey()];
        saveToLocalStorage();
        showToast("Data hari ini direset");
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
    if (!dataHariIni) {
        alert("Belum ada data presensi hari ini untuk dilaporkan.");
        return;
    }
    let listAlpa = [];
    let listSakit = [];
    let totalHadir = 0;
    
    DATA_SANTRI.forEach(santri => {
        let statusShalat = "Belum Absen";
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

    let teks = `*LAPORAN PRESENSI ASRAMA* %0A`;
    teks += `📅 Tanggal: ${dateKey} %0A`;
    teks += `🕌 Waktu: ${SLOT_WAKTU[appState.currentSlotId].label} %0A`;
    teks += `--------------------------- %0A`;
    teks += `✅ Hadir: ${totalHadir} %0A`;
    teks += `🤒 Sakit: ${listSakit.length} %0A`;
    teks += `❌ Alpa: ${listAlpa.length} %0A`;
    teks += `--------------------------- %0A`;

    if (listAlpa.length > 0) teks += `*DAFTAR ALPA:* %0A${listAlpa.join('%0A')} %0A %0A`;
    if (listSakit.length > 0) teks += `*DAFTAR SAKIT:* %0A${listSakit.join('%0A')} %0A`;

    teks += `_Digenerate oleh MusyrifApp_`;
    window.open(`https://wa.me/?text=${teks}`, '_blank');
}

window.onload = init;
