// File: state.js
// Application state management

// ==========================================
// STATE MANAGEMENT
// ==========================================
let appState = {
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
    settings: {
        darkMode: false,
        notifications: true,
        autoSave: true
    }
};

// DATA STORE
let MASTER_SANTRI = [];
let MASTER_KELAS = {};
let FILTERED_SANTRI = [];
