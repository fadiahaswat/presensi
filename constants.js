// File: constants.js
// Slot and status configurations (UPDATED)

// ==========================================
// SLOT CONFIGURATION
// ==========================================
window.SLOT_WAKTU = {
    shubuh: { 
        id: 'shubuh', label: 'Shubuh', subLabel: '04:00 - 06:00', theme: 'emerald', 
        startHour: 4, 
        style: {
            icon: 'sunrise', 
            gradient: 'from-emerald-50 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/20',
            border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
            text: 'text-emerald-700 dark:text-emerald-300',
            iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-200'
        },
        activities: [
            { id: 'shalat', label: 'Shubuh', type: 'mandator', category: 'fardu' },
            { id: 'qabliyah', label: 'Qabliyah', type: 'sunnah', category: 'dependent' },
            { id: 'dzikir_pagi', label: 'Dzikir', type: 'sunnah', category: 'dependent' },
            { id: 'tahfizh', label: 'Tahfizh', type: 'mandator', category: 'kbm' },
            { id: 'tahajjud', label: 'Tahajjud', type: 'sunnah', category: 'sunnah' },
            { id: 'conversation', label: 'Conver', type: 'mandator', category: 'kbm', showOnDays: [0] }
    ]},
    ashar: { 
        id: 'ashar', label: 'Ashar', subLabel: '15:00 - 17:00', theme: 'orange', 
        startHour: 15,
        style: {
            icon: 'sun',
            gradient: 'from-orange-50 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/20',
            border: 'hover:border-orange-300 dark:hover:border-orange-700',
            text: 'text-orange-700 dark:text-orange-300',
            iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-800 dark:text-orange-200'
        },
        activities: [
            { id: 'shalat', label: 'Ashar', type: 'mandator', category: 'fardu' },
            { id: 'dzikir_petang', label: 'Dzikir', type: 'sunnah', category: 'dependent' }
    ]},
    maghrib: { 
        id: 'maghrib', label: 'Maghrib', subLabel: '18:00 - 19:00', theme: 'indigo', 
        startHour: 18,
        style: {
            icon: 'sunset',
            gradient: 'from-indigo-50 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/20',
            border: 'hover:border-indigo-300 dark:hover:border-indigo-700',
            text: 'text-indigo-700 dark:text-indigo-300',
            iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-200'
        },
        activities: [
            { id: 'shalat', label: 'Maghrib', type: 'mandator', category: 'fardu' },
            { id: 'bakdiyah', label: 'Ba\'diyah', type: 'sunnah', category: 'dependent' },
            { id: 'dhuha', label: 'Dhuha', type: 'sunnah', category: 'sunnah' },
            { id: 'puasa', label: 'Puasa', type: 'sunnah', category: 'sunnah' },
            { id: 'tahsin', label: 'Tahsin', type: 'mandator', category: 'kbm', showOnDays: [4, 5] },
            { id: 'conversation', label: 'Conver', type: 'mandator', category: 'kbm', showOnDays: [3] },
            { id: 'vocabularies', label: 'Vocab', type: 'mandator', category: 'kbm', showOnDays: [1, 2] }
    ]},
    isya: { 
        id: 'isya', label: 'Isya', subLabel: '19:00 - 21:00', theme: 'slate', 
        startHour: 19,
        style: {
            icon: 'moon', 
            gradient: 'from-slate-50 to-blue-100 dark:from-slate-800 dark:to-blue-900/40',
            border: 'hover:border-blue-300 dark:hover:border-blue-700',
            text: 'text-slate-700 dark:text-slate-300',
            iconBg: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        },
        activities: [
            { id: 'shalat', label: 'Isya', type: 'mandator', category: 'fardu' },
            { id: 'bakdiyah', label: 'Ba\'diyah', type: 'sunnah', category: 'dependent' },
            { id: 'alkahfi', label: 'Al-Kahfi', type: 'sunnah', category: 'sunnah', showOnDays: [4] }
    ]}
};

// ==========================================
// STATUS UI CONFIGURATION (MODERN)
// ==========================================
window.STATUS_UI = {
    'Hadir': { 
        label: 'H', 
        fullLabel: 'Hadir',
        icon: 'check-circle-2',
        btnClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
        activeClass: 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900',
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
    },
    'Ya': { 
        label: 'Y', 
        fullLabel: 'Terlaksana',
        icon: 'check',
        btnClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
        activeClass: 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900',
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
    },
    'Sakit': { 
        label: 'S', 
        fullLabel: 'Sakit',
        icon: 'thermometer',
        btnClass: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
        activeClass: 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900',
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
    },
    'Izin': { 
        label: 'I', 
        fullLabel: 'Izin',
        icon: 'file-text',
        btnClass: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
        activeClass: 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900',
        badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
    },
    'Alpa': { 
        label: 'A', 
        fullLabel: 'Alpa',
        icon: 'x-circle',
        btnClass: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30',
        activeClass: 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/30 ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-900',
        badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
    },
    'Pulang': { 
        label: 'P', 
        fullLabel: 'Pulang',
        icon: 'home',
        btnClass: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30',
        activeClass: 'bg-violet-500 text-white border-violet-600 shadow-lg shadow-violet-500/30 ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-900',
        badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400'
    },
    'Tidak': { 
        label: '-', 
        fullLabel: 'Tidak',
        icon: 'minus',
        btnClass: 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700',
        activeClass: 'bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-700 dark:text-slate-400',
        badgeClass: 'bg-slate-100 text-slate-400'
    }
};
