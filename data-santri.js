// URL Web App dari Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbw-URYAsLTWCdnGurQhM1ZXa9N8vm-GBlHwtetDlin73-Ma8G0aAbFoboGGUI8GgVDl/exec";

// [PERBAIKAN] Gunakan window.santriData agar bisa dibaca oleh modul lain (main.js)
window.santriData = [];

/**
 * Fungsi Mengambil Data Santri dengan Sistem Caching (Local Storage)
 */
async function loadSantriData() {
    const CACHE_KEY = 'santri_data_cache';
    const CACHE_TIME_KEY = 'santri_data_time';
    const EXPIRY_HOURS = 24; // Data berlaku 24 jam

    // 1. Cek apakah ada cache yang valid di browser
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const now = new Date().getTime();

    // Jika cache ada DAN belum kadaluwarsa
    if (cachedData && cachedTime && (now - cachedTime < EXPIRY_HOURS * 3600 * 1000)) {
        console.log("Mengambil data santri dari Cache (Hemat Kuota)...");
        try {
            // [PERBAIKAN] Update variabel global window
            window.santriData = JSON.parse(cachedData);
            return window.santriData;
        } catch (e) {
            console.warn("Cache rusak, akan download ulang.");
        }
    }

    // 2. Jika tidak ada cache, ambil dari Server (GAS)
    try {
        console.log("Mengunduh data santri baru dari Server...");
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // [PERBAIKAN] Update variabel global window
        window.santriData = data;

        // 3. Simpan data baru ke Cache Browser
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TIME_KEY, now);
            console.log("Data santri berhasil disimpan ke cache.");
        } catch (e) {
            console.warn("Penyimpanan penuh, gagal caching data.");
        }
        
        return window.santriData;

    } catch (error) {
        console.error("Gagal mengambil data:", error);
        
        // Fallback: Gunakan cache lama jika ada
        if (cachedData) {
            console.warn("Menggunakan data cache lama karena koneksi error.");
            window.santriData = JSON.parse(cachedData);
            return window.santriData;
        }
        
        alert("Gagal memuat data santri. Pastikan internet lancar.");
        return [];
    }
}

// [PERBAIKAN] Pastikan fungsi ini menempel di window agar bisa dipanggil main.js
window.loadSantriData = loadSantriData;
