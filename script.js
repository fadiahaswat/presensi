// File: script.js

// --- CONFIG ---
const APP_CONFIG = {
    storageKey: 'musyrif_app_v5_fix', // Kunci baru agar fresh
    pinDefault: '1234'
};

// --- STATE ---
let appState = {
    selectedClass: null,
    currentSlotId: 'shubuh',
    attendanceData: {},
    searchQuery: '',
    filterProblemOnly: false,
    date: new Date().toISOString().split('T')[0]
};

// --- DATA ---
let MASTER_SANTRI = [];
let MASTER_KELAS = {};
let FILTERED_SANTRI = []; // Santri hasil filter kelas

// --- SLOT CONFIG ---
const SLOT_WAKTU = {
    shubuh: { id: 'shubuh', label: 'Shubuh', subLabel: '04:00 - 06:00', theme: 'emerald', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator' },
        { id: 'qabliyah', label: 'Qabliyah', type: 'sunnah' },
        { id: 'tahfizh', label: 'Tahfizh', type: 'mandator' },
        { id: 'tahajjud', label: 'Tahajjud', type: 'sunnah' }
    ]},
    ashar: { id: 'ashar', label: 'Ashar', subLabel: '15:00 - 17:00', theme: 'orange', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator' },
        { id: 'dzikir', label: 'Dzikir', type: 'sunnah' }
    ]},
    maghrib: { id: 'maghrib', label: 'Maghrib', subLabel: '18:00 - 19:00', theme: 'indigo', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator' },
        { id: 'bakdiyah', label: 'Bakdiyah', type: 'sunnah' },
        { id: 'tahsin', label: 'Tahsin', type: 'mandator' }
    ]},
    isya: { id: 'isya', label: 'Isya', subLabel: '19:00 - 21:00', theme: 'slate', activities: [
        { id: 'shalat', label: 'Shalat', type: 'mandator' },
        { id: 'bakdiyah', label: 'Bakdiyah', type: 'sunnah' }
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
    
    // Load Local Storage
    const saved = localStorage.getItem(APP_CONFIG.storageKey);
    if(saved) appState.attendanceData = JSON.parse(saved);

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
        alert("Gagal memuat data: " + e.message);
    }

    window.startClock();
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

    // FILTER DATA
    appState.selectedClass = kelas;
    FILTERED_SANTRI = MASTER_SANTRI.filter(s => {
        const sKelas = String(s.kelas || "").trim();
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
    // Greeting
    const h = new Date().getHours();
    const greet = h < 11 ? "Selamat Pagi" : h < 15 ? "Selamat Siang" : h < 18 ? "Selamat Sore" : "Selamat Malam";
    document.getElementById('dash-greeting').textContent = greet;

    // Stats Chart (Global)
    const stats = window.calculateGlobalStats();
    document.getElementById('dash-stats-text').textContent = stats + "%";
    document.getElementById('dash-stats-pie').style.setProperty('--percent', stats + "%");

    // Main Card
    const slot = SLOT_WAKTU[appState.currentSlotId];
    document.getElementById('dash-card-title').textContent = slot.label;
    document.getElementById('dash-card-time').textContent = slot.subLabel;
    
    // Other Slots List
    const container = document.getElementById('dash-other-slots');
    container.innerHTML = '';
    const tpl = document.getElementById('tpl-slot-item');

    Object.values(SLOT_WAKTU).forEach(s => {
        if(s.id === appState.currentSlotId) return;

        const clone = tpl.content.cloneNode(true);
        const item = clone.querySelector('.slot-item');
        
        clone.querySelector('.slot-label').textContent = s.label;
        const iconBg = clone.querySelector('.slot-icon-bg');
        iconBg.classList.add(`bg-${s.theme}-50`, `text-${s.theme}-600`);
        
        // Slot Progress
        const prog = window.calculateSlotProgress(s.id);
        clone.querySelector('.slot-status').textContent = prog.text;
        const bar = clone.querySelector('.slot-progress');
        bar.style.width = prog.percent + "%";
        bar.classList.add(`bg-${s.theme}-500`);

        item.onclick = () => {
            appState.currentSlotId = s.id;
            window.openAttendance();
        };
        container.appendChild(clone);
    });
    
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
    
    // Ensure Data Structure
    if(!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if(!appState.attendanceData[dateKey][slot.id]) appState.attendanceData[dateKey][slot.id] = {};
    const dbSlot = appState.attendanceData[dateKey][slot.id];

    // Filter
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

    list.forEach(santri => {
        const id = String(santri.nis || santri.id);
        
        // Init Default
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
        slot.activities.forEach(act => {
            const bClone = tplBtn.content.cloneNode(true);
            const btn = bClone.querySelector('.btn-status');
            const lbl = bClone.querySelector('.lbl-status');
            
            const curr = sData.status[act.id];
            const ui = STATUS_UI[curr] || STATUS_UI['Hadir'];
            
            btn.className = `btn-status w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border-2 font-black text-lg transition-all active:scale-95 ${ui.class}`;
            btn.textContent = ui.label;
            lbl.textContent = act.label;
            
            btn.onclick = () => window.toggleStatus(id, act.id, act.type);
            btnCont.appendChild(bClone);
        });

        // Note
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
    
    // Dependency Logic
    if(actId === 'shalat' && ['Sakit','Izin','Alpa'].includes(next)) {
        Object.keys(sData.status).forEach(k => { if(k !== 'shalat') sData.status[k] = 'Tidak'; });
    } else if (actId === 'shalat' && next === 'Hadir') {
        Object.keys(sData.status).forEach(k => { if(k !== 'shalat') sData.status[k] = 'Ya'; });
    }

    window.saveData();
    window.renderAttendanceList();
};

window.handleBulkAction = function(type) {
    const slotId = appState.currentSlotId;
    const dbSlot = appState.attendanceData[appState.date][slotId];
    const activities = SLOT_WAKTU[slotId].activities;

    FILTERED_SANTRI.forEach(s => {
        const id = String(s.nis || s.id);
        if(!dbSlot[id]) return; // Should exist by render
        
        activities.forEach(act => {
            if(type === 'alpa') {
                dbSlot[id].status[act.id] = act.type === 'mandator' ? 'Alpa' : 'Tidak';
            } else {
                dbSlot[id].status[act.id] = act.type === 'mandator' ? 'Hadir' : 'Ya';
            }
        });
    });
    
    window.saveData();
    window.renderAttendanceList();
    alert("Berhasil ubah status massal.");
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

window.saveData = function() {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(appState.attendanceData));
};

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    if(tabName === 'home') window.updateDashboard();
};

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
};

window.handleClearData = function() {
    if(confirm("Hapus data hari ini?")) {
        delete appState.attendanceData[appState.date];
        window.saveData();
        window.location.reload();
    }
};

window.startClock = function() {
    setInterval(() => {
        const el = document.getElementById('dash-clock');
        if(el) el.textContent = new Date().toLocaleTimeString();
    }, 1000);
};

// Start
window.onload = window.initApp;
