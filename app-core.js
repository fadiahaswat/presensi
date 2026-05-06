// File: app-core.js

// ==========================================
// CONFIG & CONSTANTS
// ==========================================
window.APP_CONFIG = {
    storageKey: 'musyrif_app_v5_fix',
    permitKey: 'musyrif_permits_db',
    pinDefault: '1234',
    activityLogKey: 'musyrif_activity_log',
    settingsKey: 'musyrif_settings',
    googleAuthKey: 'musyrif_google_session',
    googleClientId: window.APP_CREDENTIALS.googleClientId
};

// ==========================================
// KONFIGURASI LOKASI (GEOFENCING)
// ==========================================
window.GEO_CONFIG = {
    useGeofencing: true, // Set ke false jika ingin mematikan fitur ini sementara
    maxRadiusMeters: 200, // Radius toleransi dalam meter (misal: 50 meter)
    locations: [
        { 
            name: "Masjid Jami' Mu'allimin", 
            lat: -7.807757309250455, // GANTI DENGAN KOORDINAT ASLI
            lng: 110.35091531948025 // GANTI DENGAN KOORDINAT ASLI
        },
        { 
            name: "Aula Asrama 10", 
            lat: -7.807645469455366,  // GANTI DENGAN KOORDINAT ASLI
            lng: 110.35180282962452 // GANTI DENGAN KOORDINAT ASLI
        },
        { 
            name: "Mushola Asrama 8", 
            lat: -7.806781091907755,  // GANTI DENGAN KOORDINAT ASLI
            lng: 110.34871697299599 // GANTI DENGAN KOORDINAT ASLI
        },
        { 
            name: "Masjid Hajah Yuliana", 
            lat: -7.807337010430911, // GANTI DENGAN KOORDINAT ASLI
            lng: 110.26653812830205 // GANTI DENGAN KOORDINAT ASLI
        }
    ]
};

window.UI_COLORS = {
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500'
};

window.sanitizeHTML = function(str) {
    if(!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.textContent; // Return text, NOT innerHTML
};

window.refreshIcons = function() {
    clearTimeout(window.lucideTimeoutRef.current);
    window.lucideTimeoutRef.current = setTimeout(() => {
        if(window.lucide) {
            try {
                window.lucide.createIcons();
            } catch(e) {
                console.warn('Lucide render error:', e);
            }
        }
    }, 150);
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

window.parseJwt = function (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
};

// Helper Tanggal yang Aman (Local Time YYYY-MM-DD)
window.getLocalDateStr = function(dateObj = new Date()) {
    try {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch(e) {
        console.error('Date conversion error:', e);
        return new Date().toISOString().split('T')[0];
    }
};

// Format tanggal ke "Senin, 1 Jan 2025"
window.formatDate = function(dateStr) {
    if (!dateStr) return '-';
    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    
    const d = new Date(dateStr + 'T12:00:00');
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Cek apakah tanggal Masehi (YYYY-MM-DD) jatuh di bulan Ramadhan (Hijriyah ke-9)
window.isRamadhan = function(dateStr) {
    try {
        const d = new Date(dateStr + 'T12:00:00');
        // Gunakan Intl.DateTimeFormat untuk mendapatkan bulan Hijriyah
        const hijriMonth = new Intl.DateTimeFormat('id-ID-u-ca-islamic', { month: 'numeric' }).format(d);
        return Number(hijriMonth) === 9;
    } catch(e) {
        return false;
    }
};

// Polyfill Canvas roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radii) {
        const radius = Array.isArray(radii) ? radii[0] : radii;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
        return this;
    };
}
