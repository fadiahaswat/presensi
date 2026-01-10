// File: script.js

// --- CONFIG ---
const APP_CONFIG = {
    storageKey: 'musyrif_app_v5_fix',
    pinDefault: '1234',
    activityLogKey: 'musyrif_activity_log',
    settingsKey: 'musyrif_settings'
};

// --- STATE ---
let appState = {
    selectedClass: null,
    currentSlotId: 'shubuh',
    attendanceData: {},
    searchQuery: '',
    filterProblemOnly: false,
    date: new Date().toISOString().split('T')[0],
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
    
    // Update Quick Stats
    window.updateQuickStats();
    
    // Update Weekly Chart
    window.updateWeeklyChart();
    
    lucide.createIcons();
};

window.updateQuickStats = function() {
    if(!appState.selectedClass || FILTERED_SANTRI.length === 0) return;
    
    const dateKey = appState.date;
    const data = appState.attendanceData[dateKey];
    
    let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlpa = 0;
    
    if(data) {
        Object.values(SLOT_WAKTU).forEach(slot => {
            if(data[slot.id]) {
                FILTERED_SANTRI.forEach(s => {
                    const id = String(s.nis || s.id);
                    const status = data[slot.id][id]?.status?.shalat;
                    if(status === 'Hadir') totalHadir++;
                    else if(status === 'Sakit') totalSakit++;
                    else if(status === 'Izin') totalIzin++;
                    else if(status === 'Alpa') totalAlpa++;
                });
            }
        });
    }
    
    const stats = [
        { id: 'stat-hadir', value: totalHadir, color: 'emerald' },
        { id: 'stat-sakit', value: totalSakit, color: 'amber' },
        { id: 'stat-izin', value: totalIzin, color: 'blue' },
        { id: 'stat-alpa', value: totalAlpa, color: 'red' }
    ];
    
    stats.forEach(stat => {
        const el = document.getElementById(stat.id);
        if(el) el.textContent = stat.value;
    });
};

window.updateWeeklyChart = function() {
    const canvas = document.getElementById('weekly-chart');
    if(!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get last 7 days data
    const days = [];
    const today = new Date();
    for(let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    
    const data = days.map(date => {
        const dayData = appState.attendanceData[date];
        if(!dayData) return 0;
        
        let count = 0, total = 0;
        Object.values(SLOT_WAKTU).forEach(slot => {
            if(dayData[slot.id]) {
                FILTERED_SANTRI.forEach(s => {
                    const id = String(s.nis || s.id);
                    if(dayData[slot.id][id]?.status?.shalat === 'Hadir') count++;
                    if(dayData[slot.id][id]?.status?.shalat) total++;
                });
            }
        });
        return total === 0 ? 0 : Math.round((count/total)*100);
    });
    
    // Draw chart
    const maxVal = Math.max(...data, 100);
    const barWidth = width / (days.length * 2);
    const gap = barWidth;
    
    ctx.fillStyle = '#10b981';
    data.forEach((val, i) => {
        const barHeight = (val / maxVal) * (height - 20);
        const x = i * (barWidth + gap) + gap;
        const y = height - barHeight;
        
        // Gradient
        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#059669');
        ctx.fillStyle = gradient;
        
        // Rounded bar
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
        
        // Value text
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 10px Plus Jakarta Sans';
        ctx.textAlign = 'center';
        ctx.fillText(val + '%', x + barWidth/2, y - 5);
    });
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
    const current = new Date(appState.date);
    current.setDate(current.getDate() + direction);
    appState.date = current.toISOString().split('T')[0];
    
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

// Start
window.onload = window.initApp;
