# MusyrifApp Pro - Code Structure

This document describes the modular structure of the MusyrifApp Pro codebase.

## File Organization

### Core Configuration Files
- **config.js** - Application configuration (app settings, geofencing, UI colors)
- **constants.js** - Slot and status configurations (SLOT_WAKTU, STATUS_UI)
- **state.js** - Global application state management
- **utils.js** - Utility functions (date formatting, JWT parsing, slot determination)

### Data Management
- **data-kelas.js** - Class/room data loading and caching
- **data-santri.js** - Student data loading and caching
- **santri-manager.js** - Student preference management (passwords, avatars, email linking)

### Application Logic
- **app-core.js** (58KB) - Core functionality
  - App initialization and startup
  - Authentication (login/logout, Google OAuth)
  - Dashboard rendering and updates
  - Location status and geofencing
  - Statistics calculations
  - Attendance actions and list rendering

- **app-features.js** (75KB) - Extended features
  - Tab navigation and view switching
  - Date actions and calendar
  - Export and reports (Excel, WhatsApp)
  - Activity logging
  - Permit/sick leave management
  - Student analysis and statistics
  - Smart notifications/reminders
  - Homecoming tracking
  - Event management
  - Auto-arrival logic

### Entry Point
- **main.js** - Application entry point (calls window.initApp on load)

### UI
- **index.html** - Main HTML structure with Tailwind CSS
- **style.css** - Additional custom styles
- **sw.js** - Service worker for offline functionality

## Load Order

Scripts are loaded in the following order in `index.html`:

1. config.js - Configuration first
2. utils.js - Utilities (needed by state.js)
3. state.js - State management
4. constants.js - Constants
5. data-kelas.js - Data loaders
6. data-santri.js - Data loaders
7. santri-manager.js - Student management
8. app-core.js - Core application logic
9. app-features.js - Extended features
10. main.js - Entry point

## Global Variables

All major configuration and state is attached to the `window` object for cross-module access:

- `window.APP_CONFIG` - App configuration object
- `window.GEO_CONFIG` - Geofencing configuration
- `window.UI_COLORS` - UI color constants
- `window.SLOT_WAKTU` - Prayer slot configurations
- `window.STATUS_UI` - Status UI configurations
- `window.appState` - Application state
- `window.MASTER_SANTRI` - Student master data
- `window.MASTER_KELAS` - Class master data
- `window.FILTERED_SANTRI` - Filtered student list

## Development Notes

- The app uses vanilla JavaScript (no build step required)
- All external dependencies are loaded via CDN
- LocalStorage is used for data persistence and caching
- The app is a Progressive Web App (PWA) with service worker support

## Refactoring History

Previously, all application logic was in a single `script.js` file (141KB, 3,592 lines). The code has been refactored into a modular structure for better maintainability and organization.
