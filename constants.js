// File: constants.js
// Slot and status configurations

// ==========================================
// SLOT & STATUS CONFIGURATION
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

window.STATUS_UI = {
    'Hadir': { class: 'bg-emerald-500 text-white border-emerald-500', label: 'H' },
    'Ya': { class: 'bg-emerald-500 text-white border-emerald-500', label: 'Y' },
    'Sakit': { class: 'bg-amber-100 text-amber-600 border-amber-300', label: 'S' },
    'Izin': { class: 'bg-blue-100 text-blue-600 border-blue-300', label: 'I' },
    'Alpa': { class: 'bg-red-50 text-red-500 border-red-200', label: 'A' },
    'Pulang': { class: 'bg-indigo-100 text-indigo-600 border-indigo-300', label: 'P' },
    'Tidak': { class: 'bg-slate-100 text-slate-300 border-slate-200', label: '-' }
};
