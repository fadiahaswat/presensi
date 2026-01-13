// File: app-core.js
// Core application functionality: Init, Auth, Dashboard, UI, Calculations, Attendance

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
                
                // G. Load homecoming data in background
                if(window.loadHomecomingData) window.loadHomecomingData();

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
        // Load homecoming data
        if(window.loadHomecomingData) window.loadHomecomingData();
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
    const stats = { h: 0, s: 0, i: 0, a: 0, p: 0, total: 0, isFilled: false };
    
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
            else if (status === 'Pulang') stats.p++;
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

    if(!appState.attendanceData[dateKey]) appState.attendanceData[dateKey] = {};
    if(!appState.attendanceData[dateKey][slot.id]) appState.attendanceData[dateKey][slot.id] = {};
    
    const dbSlot = appState.attendanceData[dateKey][slot.id];
    let hasAutoChanges = false;

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

    const tplRow = document.getElementById('tpl-santri-row');
    const tplBtn = document.getElementById('tpl-activity-btn');
    const fragment = document.createDocumentFragment();

    list.forEach(santri => {
        const id = String(santri.nis || santri.id);
        
        // --- LOGIKA PERIZINAN OTOMATIS ---
        const activePermit = window.checkActivePermit(id, dateKey, slot.id);
        
        // --- LOGIKA PERPULANGAN (HOMECOMING) ---
        let isPulang = false;
        try {
            isPulang = window.checkActiveHomecoming && window.checkActiveHomecoming(id, dateKey);
        } catch (e) {
            console.error('Error checking Pulang status:', e);
        }
        
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

        slot.activities.forEach(act => {
            let targetStatus = null;
            
            // 1. PRIORITAS UTAMA: Cek Izin (Sakit/Izin)
            if (activePermit) {
                if (act.category === 'fardu' || act.category === 'kbm') targetStatus = activePermit.type; 
                else targetStatus = 'Tidak'; 
            } 
            // 2. PRIORITAS KEDUA: Cek Pulang (Homecoming) - MENGIKUTI LOGIKA IZIN
            else if (isPulang) {
                // Shalat Fardu, KBM, dan Dzikir/Rawatib (Dependent) menjadi 'Pulang'
                if (act.category === 'fardu' || act.category === 'kbm' || act.category === 'dependent') {
                    targetStatus = 'Pulang'; 
                } 
                // Ibadah Sunnah Mandiri (Tahajjud, Puasa, Kahfi) menjadi Strip '-'
                else if (act.category === 'sunnah') {
                    targetStatus = 'Tidak'; 
                }
            }
            // 3. PRIORITAS KETIGA: Reset jika sebelumnya Auto tapi sekarang sudah tidak Pulang/Izin
            else if (isAutoMarked) {
                if (act.category === 'sunnah') targetStatus = 'Tidak';
                else if (act.category === 'fardu' || act.category === 'kbm') targetStatus = 'Hadir';
                else targetStatus = 'Ya';
            }
        
            // Terapkan perubahan ke data santri jika ada target status baru
            if (targetStatus !== null && sData.status[act.id] !== targetStatus) {
                sData.status[act.id] = targetStatus;
                hasAutoChanges = true; // Memicu window.saveData() di akhir fungsi
            }
        });

        // Update auto-note di renderAttendanceList
        if (activePermit) {
            const autoNote = `[Auto] ${activePermit.type} s/d ${window.formatDate(activePermit.end)}`;
            if (!sData.note || sData.note === '-' || (isAutoMarked && sData.note !== autoNote)) {
                sData.note = autoNote;
                hasAutoChanges = true;
            }
        } else if (isPulang) {
            const homecoming = window.checkActiveHomecoming(id, dateKey);
            const autoNote = homecoming ? `[Auto] Pulang ke ${homecoming.city}` : `[Auto] Pulang`;
            if (!sData.note || sData.note === '-' || (isAutoMarked && sData.note !== autoNote)) {
                sData.note = autoNote;
                hasAutoChanges = true;
            }
        } else if (isAutoMarked) {
            sData.note = '';
            hasAutoChanges = true;
        }

        // Render UI Baris (Standar)
        const clone = tplRow.content.cloneNode(true);
        const rowElement = clone.querySelector('.santri-row'); // Ambil element untuk styling

        clone.querySelector('.santri-name').textContent = santri.nama;
        clone.querySelector('.santri-kamar').textContent = santri.asrama || santri.kelas;
        clone.querySelector('.santri-avatar').textContent = santri.nama.substring(0,2).toUpperCase();

        if (activePermit) {
            const nameEl = clone.querySelector('.santri-name');
            const badge = document.createElement('span');
            badge.className = `ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border align-middle ${activePermit.type === 'Sakit' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`;
            badge.textContent = activePermit.type;
            nameEl.appendChild(badge);
            
            // Visual highlight baris (optional)
            if(rowElement) {
                if(activePermit.type === 'Sakit') rowElement.classList.add('ring-1', 'ring-amber-200', 'bg-amber-50/30');
                else rowElement.classList.add('ring-1', 'ring-blue-200', 'bg-blue-50/30');
            }
        } else if (isPulang) {
            const nameEl = clone.querySelector('.santri-name');
            const badge = document.createElement('span');
            badge.className = `ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border align-middle bg-indigo-100 text-indigo-600 border-indigo-200`;
            badge.textContent = 'Pulang';
            nameEl.appendChild(badge);
            
            // Visual highlight baris
            if(rowElement) {
                rowElement.classList.add('ring-1', 'ring-indigo-200', 'bg-indigo-50/30');
            }
        }

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

            if (activePermit && (curr === activePermit.type || curr === 'Tidak')) {
                btn.classList.add('ring-2', 'ring-offset-1', activePermit.type === 'Sakit' ? 'ring-amber-400' : 'ring-blue-400');
            } else if (isPulang && (curr === 'Pulang' || curr === 'Tidak')) {
                btn.classList.add('ring-2', 'ring-offset-1', 'ring-indigo-400');
            }

            btn.onclick = () => window.toggleStatus(id, act.id, act.type);
            btnCont.appendChild(bClone);
        });

        const noteInp = clone.querySelector('.input-note');
        const noteBox = clone.querySelector('.note-section');
        noteInp.value = sData.note || "";
        noteInp.onchange = (e) => {
            sData.note = e.target.value;
            window.saveData();
        };
        clone.querySelector('.btn-edit-note').onclick = () => noteBox.classList.toggle('hidden');

        // Langsung append clone (Tanpa Wrapper Swipe)
        fragment.appendChild(clone);
    });

    container.appendChild(fragment);
    
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
        else if(curr === 'Izin') next = 'Pulang';
        else if(curr === 'Pulang') next = 'Alpa';
        else next = 'Hadir';
    } else {
        next = (curr === 'Ya') ? 'Tidak' : 'Ya';
    }
    
    // Simpan status baru
    sData.status[actId] = next;
    
    // 2. LOGIKA DEPENDENCY (Jika Shalat Berubah)
    if(actId === 'shalat') {
        const activities = SLOT_WAKTU[slotId].activities;
        const isNonHadir = ['Sakit', 'Izin', 'Alpa', 'Pulang'].includes(next);

        activities.forEach(act => {
            if (act.id === 'shalat') return; // Skip diri sendiri

            // KASUS A: Shalat jadi S/I/P/A (Tidak Hadir)
            // Semua kegiatan lain ikut "Sakit/Izin" atau "Tidak"
            if (isNonHadir) {
                if(act.type === 'mandator') sData.status[act.id] = next; // KBM ikut S/I/P/A
                else sData.status[act.id] = 'Tidak'; // Dependent & Sunnah jadi Strip (-)
            } 
            
            // KASUS B: Shalat kembali jadi H (Hadir)
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
    let stats = { h: 0, s: 0, i: 0, a: 0, p: 0 };
    let activeSlots = 0; // Untuk menghitung berapa sesi yang sudah diisi data

    Object.values(SLOT_WAKTU).forEach(slot => {
         const slotStats = window.calculateSlotStats(slot.id);
         
         // Kita hanya menjumlahkan sesi yang SUDAH DIISI (isFilled = true)
         if(slotStats.isFilled) {
             stats.h += slotStats.h;
             stats.s += slotStats.s;
             stats.i += slotStats.i;
             stats.a += slotStats.a;
             stats.p += slotStats.p || 0;
             activeSlots++;
         }
    });
    
    // Pembagi: Jika belum ada sesi yang diisi, bagi dengan 1 (biar tidak error/infinity)
    // Jika sudah ada (misal shubuh & ashar), bagi dengan 2.
    const divider = activeSlots > 0 ? activeSlots : 1;
    
    // Tampilkan hasil RATA-RATA (dibulatkan dengan Math.round)
    // Sehingga angkanya kembali ke skala jumlah santri (misal: 30), bukan akumulasi (120)
    // Count Pulang together with Izin for display purposes
    document.getElementById('stat-hadir').textContent = Math.round(stats.h / divider);
    document.getElementById('stat-sakit').textContent = Math.round(stats.s / divider);
    document.getElementById('stat-izin').textContent = Math.round((stats.i + stats.p) / divider);
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
    let stats = { h: 0, s: 0, i: 0, a: 0, p: 0 };
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
                stats.p += sStats.p || 0;
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
    setLegend('legend-izin', Math.round((stats.i + stats.p) / divider)); // Combine Izin + Pulang
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
        { value: stats.i + stats.p, color: '#3b82f6' }, // Blue (Izin + Pulang)
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
