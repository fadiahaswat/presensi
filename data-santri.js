// File: data-santri.js

const API_SANTRI_URL = "https://script.google.com/macros/s/AKfycbw-URYAsLTWCdnGurQhM1ZXa9N8vm-GBlHwtetDlin73-Ma8G0aAbFoboGGUI8GgVDl/exec";

window.santriData = []; // Variabel global penampung data santri

async function loadSantriData() {
    const CACHE_KEY = 'cache_data_santri_full';
    const CACHE_TIME = 'time_data_santri';
    const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 Jam

    try {
        console.log("📥 Mengambil data Santri...");
        const now = new Date().getTime();
        const cachedStr = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME);

        // 1. Gunakan Cache jika Valid
        if (cachedStr && cachedTime && (now - cachedTime < EXPIRY_MS)) {
            console.log("✅ Data Santri dimuat dari cache (Cepat).");
            window.santriData = JSON.parse(cachedStr);
            return window.santriData;
        }

        // 2. Jika Cache Expired/Kosong, Download Baru
        console.log("🌐 Mengunduh data santri terbaru dari server...");
        const response = await fetch(API_SANTRI_URL); // Default parameter doGet adalah santri
        
        if (!response.ok) throw new Error("Gagal koneksi server santri");

        const data = await response.json();
        
        if (!Array.isArray(data)) throw new Error("Format data santri salah");

        // Simpan ke Global & Cache
        window.santriData = data;
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIME, now);
        
        console.log("✅ Data Santri berhasil diunduh:", data.length, "santri.");
        return window.santriData;

    } catch (error) {
        console.error("❌ Error loadSantriData:", error);
        
        // Fallback: Pakai cache lama meskipun expired daripada error
        const oldCache = localStorage.getItem(CACHE_KEY);
        if (oldCache) {
            console.warn("⚠️ Menggunakan data cache lawas (Offline Mode).");
            window.santriData = JSON.parse(oldCache);
            return window.santriData;
        }
        
        return [];
    }
}

// Ekspos ke global window
window.loadSantriData = loadSantriData;
