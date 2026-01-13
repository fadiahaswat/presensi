// File: app-features.js
// Extended features: Tabs, Navigation, Permits, Analysis, Notifications, Homecoming, Events

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

window.savePermit = function() {
    // Ambil santri yang dicentang
    const checkboxes = document.querySelectorAll('input[name="permit_santri_select"]:checked');
    const selectedNis = Array.from(checkboxes).map(cb => cb.value);

    const type = document.getElementById('permit-type').value;
    const session = document.getElementById('permit-session').value;
    const start = document.getElementById('permit-start').value;
    const end = document.getElementById('permit-end').value;

    if(selectedNis.length === 0) return window.showToast("Pilih minimal 1 santri", "warning");
    if(!start || !end) return window.showToast("Lengkapi tanggal", "warning");
    if(start > end) return window.showToast("Tanggal mulai tidak boleh > selesai", "warning");

    // Simpan data per santri
    let count = 0;
    selectedNis.forEach(nis => {
        const newPermit = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5), // ID Unik
            nis: nis,
            type,
            session,
            start,
            end,
            timestamp: new Date().toISOString()
        };
        appState.permits.push(newPermit);
        count++;
    });

    localStorage.setItem(APP_CONFIG.permitKey, JSON.stringify(appState.permits));
    
    window.showToast(`${count} izin berhasil disimpan`, "success");
    window.renderPermitList(); 
    
    // Uncheck semua setelah simpan
    checkboxes.forEach(cb => cb.checked = false);
    window.updatePermitCount();

    // Refresh dashboard jika tanggal relevan
    if (appState.date >= start && appState.date <= end) {
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

        const div = document.createElement('div');
        div.className = 'p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm';
        div.innerHTML = `
            <div>
                <p class="font-bold text-slate-800 dark:text-white text-sm">${santri.nama}</p>
                <div class="flex flex-wrap gap-2 mt-1.5">
                    <span class="px-2 py-0.5 rounded-md ${p.type === 'Sakit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'} font-black text-[10px] uppercase tracking-wide border border-black/5">${p.type}</span>
                    <span class="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${window.formatDate(p.start).split(',')[1]} - ${window.formatDate(p.end).split(',')[1]}</span>
                    ${p.session !== 'all' ? `<span class="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md uppercase">${p.session}</span>` : ''}
                </div>
            </div>
            <button onclick="window.deletePermit('${p.id}')" class="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        `;
        container.appendChild(div);
    });
    if(window.lucide) window.lucide.createIcons();
};

window.checkActivePermit = function(nis, dateStr, slotId) {
    return appState.permits.find(p => {
        const isDateMatch = dateStr >= p.start && dateStr <= p.end;
        const isSlotMatch = p.session === 'all' || p.session === slotId;
        const isNisMatch = p.nis === String(nis);
        return isNisMatch && isDateMatch && isSlotMatch;
    });
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
        const dateKey = curr.toISOString().split('T')[0]; // YYYY-MM-DD (Local approx)
        // Fix timezone offset issue for pure YYYY-MM-DD loop
        // Gunakan string manipulation agar aman
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
                            if(st === 'Hadir') stats.fardu.h++;
                            else stats.fardu.m++;
                        }
                        else if(act.category === 'kbm') {
                            stats.kbm.total++;
                            if(st === 'Hadir') stats.kbm.h++;
                            else stats.kbm.m++;
                        }
                        else if(act.category === 'sunnah' || act.category === 'dependent') {
                            // Dependent (rawatib) kita anggap sunnah di analisis ini
                            stats.sunnah.total++;
                            if(st === 'Ya' || st === 'Hadir') stats.sunnah.y++;
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
    const { error } = await dbClient // <--- GANTI JADI dbClientsupabase
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

// 1. Buka Modal & Load Data
/* =========================================
   FITUR PERPULANGAN (VIEW MODE)
   ========================================= */

// 1. Buka View Halaman Penuh
window.openHomecomingView = async function() {
    if(!appState.selectedClass) return window.showToast("Pilih kelas dulu!", "warning");
    
    // Ganti View (Main -> Homecoming)
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('view-homecoming').classList.remove('hidden');
    
    // Reset/Loading State
    document.getElementById('hc-view-title').textContent = "Memuat...";
    document.getElementById('hc-list-container').innerHTML = getSkeletonHTML(5); // Pakai skeleton yang sudah ada
    
    try {
        // A. Ambil Event Aktif
        const { data: events } = await dbClient
            .from('homecoming_events')
            .select('*')
            .eq('is_active', true)
            .limit(1);
            
        if(!events || events.length === 0) {
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
        
        hcState.activeEvent = events[0];
        document.getElementById('hc-view-title').textContent = hcState.activeEvent.title;
        document.getElementById('hc-view-date').textContent = `${window.formatDate(hcState.activeEvent.start_date)} - ${window.formatDate(hcState.activeEvent.end_date)}`;

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

        // C. Render List
        window.renderHomecomingList();

    } catch (e) {
        console.error(e);
        window.showToast("Gagal memuat data", "error");
        document.getElementById('hc-view-title').textContent = "Error";
    }
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

// Start App
window.onload = window.initApp;
