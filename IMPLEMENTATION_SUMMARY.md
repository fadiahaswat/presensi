# Implementation Summary: Pulang Status Synchronization

## Overview
This implementation adds automatic synchronization of attendance status for students who are marked as "Pulang" (going home) during homecoming events.

## Changes Made

### 1. New Status: 'Pulang' (P)
**File:** `constants.js`
- Added new status to `STATUS_UI` configuration:
  ```javascript
  'Pulang': { class: 'bg-indigo-100 text-indigo-600 border-indigo-300', label: 'P' }
  ```

### 2. Homecoming Data Loading
**File:** `app-features.js`
- Added `window.isStudentPulang(studentId, dateKey)` helper function to check if a student is currently marked as "Pulang"
- Added `window.loadHomecomingData()` function to load homecoming data in background at app startup
- Modified `window.openHomecomingView()` to use the shared data loading function

**File:** `app-core.js`
- Added calls to `window.loadHomecomingData()` in:
  - Auto-login flow (after successful authentication)
  - Manual login flow (after Google OAuth callback)

### 3. Attendance Auto-Sync Logic
**File:** `app-core.js` - `renderAttendanceList()` function
- Added check for homecoming status using `window.isStudentPulang()`
- Auto-apply status based on priority:
  1. **Active Permit** (Sakit/Izin) - highest priority
  2. **Pulang Status** - second priority
     - Mandatory activities (fardu/kbm): Set to 'Pulang'
     - Dependent activities (qabliyah, ba'diyah, dzikir): Set to 'Pulang'
     - Optional activities (sunnah): Set to 'Tidak' (-)
  3. **Previously auto-marked** - reset to default

- Added auto-note: `[Auto] Pulang` for students marked as going home
- Added visual indicators:
  - Badge showing "Pulang" on student name
  - Indigo ring and background highlighting
  - Ring indicator on status buttons

### 4. Status Toggle Cycle
**File:** `app-core.js` - `toggleStatus()` function
- Updated status cycle for mandatory activities:
  - Old: H → S → I → A → H
  - New: H → S → I → **P** → A → H
- Updated dependency logic to handle 'Pulang' status:
  - When shalat is set to 'Pulang', dependent activities (rawatib/dzikir) also get 'Pulang'
  - Sunnah activities get 'Tidak' (-)

### 5. Statistics and Reporting
**File:** `app-core.js`
- Updated `calculateSlotStats()` to track 'Pulang' count separately
- Updated `updateQuickStats()` to combine Pulang with Izin for display (both are excused absences)
- Updated `drawDonutChart()` to include Pulang in the chart (grouped with Izin using blue color)
- Updated legend displays to show combined Izin+Pulang count

**File:** `app-features.js`
- Updated `runAnalysis()` to count 'Pulang' as present for:
  - Fardu (mandatory prayers)
  - KBM (boarding school learning)
  - Dependent activities (rawatib/dzikir)

## How It Works

1. **At App Startup:**
   - System loads active homecoming events and student logs from localStorage
   - Data is stored in `hcState` global state

2. **When Opening Attendance:**
   - System checks each student's homecoming status for the current date
   - If student is marked as "Pulang" and date falls within the event period:
     - Mandatory activities automatically get 'P' status
     - Optional activities automatically get '-' (Tidak) status
   - Visual indicators (badge, highlighting) are applied

3. **When Toggling Status:**
   - Users can manually cycle through statuses including 'Pulang'
   - Dependency rules ensure consistency (e.g., if shalat is 'Pulang', rawatib follows)

4. **In Statistics:**
   - 'Pulang' is counted separately but displayed together with 'Izin'
   - Both represent excused absences
   - In analysis, 'Pulang' counts as present for mandatory activities

## Testing Checklist

- [ ] Login and verify homecoming data loads
- [ ] Create a homecoming event with some students marked as "Pulang"
- [ ] Navigate to attendance page on a date within the event period
- [ ] Verify students marked as "Pulang" show:
  - Badge "Pulang" on their name
  - Indigo highlighting
  - 'P' status on mandatory activities
  - '-' status on optional activities
  - Auto-note: `[Auto] Pulang`
- [ ] Test manual status toggling (cycle should include 'Pulang')
- [ ] Verify statistics include Pulang count
- [ ] Check donut chart includes Pulang data
- [ ] Run analysis on a student with Pulang status
- [ ] Verify data persists after refresh

## Notes

- The 'P' status is styled with indigo colors to distinguish it from other statuses
- Pulang is treated as an excused absence, similar to Izin
- The auto-sync only applies when there's an active homecoming event
- Manual status changes override auto-sync
- The system respects permission hierarchy: Active Permit > Pulang > Default
