// File: config.js
// Application configuration and constants

// ==========================================
// KONEKSI SUPABASE (GUDANG DATA)
// ==========================================
// 1. Ambil URL dari Tahap 3 (Project URL)
window.SUPABASE_URL = 'https://gtfqebengsazursaamzf.supabase.co'; 

// 2. Ambil Key dari Tahap 3 (anon public)
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0ZnFlYmVuZ3NhenVyc2FhbXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjc1ODIsImV4cCI6MjA4MzcwMzU4Mn0.bkhDWAcBa04lyFk_P2bBjblAtkz2qj4aRkNkrhhJw_Q';

// 3. Nyalakan Mesin Supabase dengan error handling
if (typeof window.supabase !== 'undefined') {
    try {
        window.dbClient = window.supabase.createClient(
            window.SUPABASE_URL, 
            window.SUPABASE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                },
                global: {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            }
        );
        console.log("✅ Supabase Siap!");
    } catch (error) {
        console.error("❌ Gagal inisialisasi Supabase:", error);
        window.dbClient = null;
    }
} else {
    console.warn("⚠️ Supabase library belum dimuat. Database fitur tidak tersedia.");
    window.dbClient = null;
}

// ==========================================
// CONFIG & CONSTANTS
// ==========================================
window.APP_CONFIG = {
    storageKey: 'musyrif_app_v5_fix',
    permitKey: 'musyrif_permits_db',
    homecomingKey: 'musyrif_homecoming_db',
    pinDefault: '1234',
    activityLogKey: 'musyrif_activity_log',
    settingsKey: 'musyrif_settings',
    googleAuthKey: 'musyrif_google_session',
    googleClientId: '694043281368-cqf9tji9rsv2k2gtfu7pbicdsc1gcvk7.apps.googleusercontent.com'
};

// ==========================================
// KONFIGURASI LOKASI (GEOFENCING)
// ==========================================
window.GEO_CONFIG = {
    useGeofencing: true,
    maxRadiusMeters: 200,
    locations: [
        { 
            name: "Masjid Jami' Mu'allimin", 
            lat: -7.807757309250455,
            lng: 110.35091531948025
        },
        { 
            name: "Aula Asrama 10", 
            lat: -7.807645469455366,
            lng: 110.35180282962452
        },
        { 
            name: "Mushola Asrama 8", 
            lat: -7.806781091907755,
            lng: 110.34871697299599
        },
        { 
            name: "Masjid Hajah Yuliana", 
            lat: -7.807337010430911,
            lng: 110.26653812830205
        }
    ]
};

window.UI_COLORS = {
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500'
};
