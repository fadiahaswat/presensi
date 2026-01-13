// File: state.js
// Application state management

// ==========================================
// STATE MANAGEMENT
// ==========================================
window.appState = {
    selectedClass: null,
    currentSlotId: 'shubuh',
    attendanceData: {},
    searchQuery: '',
    analysisMode: 'daily',
    reportMode: 'daily',
    analysisSantriId: null,
    filterProblemOnly: false,
    date: window.getLocalDateStr(),
    activityLog: [],
    permits: [],
    homecomings: [],
    settings: {
        darkMode: false,
        notifications: true,
        autoSave: true
    }
};

// DATA STORE
window.MASTER_SANTRI = [];
window.MASTER_KELAS = {};
window.FILTERED_SANTRI = [];
