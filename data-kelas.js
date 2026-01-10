// File: data-kelas.js

const API_BASE_URL_KELAS = "https://script.google.com/macros/s/AKfycbw-URYAsLTWCdnGurQhM1ZXa9N8vm-GBlHwtetDlin73-Ma8G0aAbFoboGGUI8GgVDl/exec";

// [PERBAIKAN] Gunakan window.classMetaData
window.classMetaData = {};

async function loadClassData() {
    try {
        console.log("Sedang mengambil data Wali Kelas & Musyrif...");
        
        const response = await fetch(API_BASE_URL_KELAS + "?type=kelas");
        
        if (!response.ok) throw new Error("Gagal koneksi ke spreadsheet kelas");

        const data = await response.json();

        // [PERBAIKAN] Update variabel window langsung
        // Reset dulu biar bersih
        window.classMetaData = {};

        data.forEach(item => {
            window.classMetaData[item.kelas] = {
                wali: item.wali,
                musyrif: item.musyrif
            };
        });

        console.log("Data Kelas Berhasil Dimuat:", Object.keys(window.classMetaData).length, "kelas.");
        return window.classMetaData;

    } catch (error) {
        console.error("Gagal load data kelas:", error);
        return {};
    }
}

// [PERBAIKAN] Ekspos fungsi ke global window
window.loadClassData = loadClassData;
