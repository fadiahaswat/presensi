# Perpulangan Management Implementation

## Overview
This document describes the implementation of the new perpulangan (homecoming) management system that follows the same pattern as the perizinan (permit) management system.

## Task Requirements
**Indonesian**: "coba perhatikan kode yang menangani manajemen perizinan, lalu amati tiru lalu modifikasi untuk manajemen perpulangan."

**English**: "Observe the code that handles permit management, then imitate and modify it for homecoming management."

## Implementation Summary

### 1. Data Storage
- **Storage Location**: localStorage (like permits)
- **Storage Key**: `musyrif_homecoming_db` (defined in `config.js`)
- **Data Structure**:
```javascript
{
  id: string,          // Unique ID (timestamp + random)
  nis: string,         // Student ID
  city: string,        // Destination city
  transport: string,   // Transportation method (Jemputan/Bus/Kereta/Pesawat)
  start: string,       // Start date (YYYY-MM-DD)
  end: string,         // End date (YYYY-MM-DD)
  timestamp: string    // ISO timestamp when created
}
```

### 2. User Interface

#### Modal Dialog (`modal-homecoming` in index.html)
- **Title**: "Input Perpulangan"
- **Description**: "Pilih santri (bisa banyak) dan periode pulang"

#### Form Fields:
1. **Student Selection**:
   - Checklist with multi-select capability
   - Search/filter functionality
   - Shows count of selected students

2. **Details**:
   - Kota Tujuan (Destination City) - text input
   - Transportasi (Transportation) - dropdown
     - 🚗 Jemputan
     - 🚌 Bus
     - 🚂 Kereta
     - ✈️ Pesawat

3. **Date Range**:
   - Mulai (Start date)
   - Kembali (Return date)

4. **Actions**:
   - Save button
   - Active homecoming list with delete functionality

### 3. JavaScript Functions (app-features.js)

#### Main Functions:
- `openHomecomingModal()` - Opens the modal and initializes form
- `renderHomecomingChecklist(list)` - Renders student checklist
- `filterHomecomingSantri(val)` - Filters students by search query
- `updateHomecomingCount()` - Updates selected count badge
- `saveHomecoming()` - Saves homecoming data to localStorage
- `deleteHomecoming(id)` - Deletes homecoming record
- `renderHomecomingList()` - Displays active homecoming records
- `checkActiveHomecoming(nis, dateStr)` - Checks if student has active homecoming

#### Validation:
- At least 1 student must be selected
- Start and end dates must be filled
- Start date cannot be greater than end date

### 4. Auto-Sync Integration (app-core.js)

#### Priority System:
1. **Permits** (highest priority)
2. **localStorage Homecoming** (new modal system)
3. **Supabase Homecoming** (old event system)

#### Behavior:
When a student has active homecoming:
- **Mandatory activities** (fardu, kbm, dependent): Status → "Pulang"
- **Optional activities** (sunnah): Status → "Tidak"
- **Auto-note**: "[Auto] Pulang ke {city}"
- **Badge**: Shows "Pulang" badge on student name
- **Visual**: Highlighted row with indigo color

### 5. Data Loading
Homecoming data is loaded on app initialization in both:
- `app-core.js`: Line 29-32
- `app-features.js`: Line 249-252

### 6. Comparison with Perizinan

| Feature | Perizinan | Perpulangan |
|---------|-----------|-------------|
| Storage | localStorage | localStorage |
| Multi-select | ✅ Yes | ✅ Yes |
| Date range | ✅ Yes | ✅ Yes |
| Type selector | Sakit/Izin | - |
| Session selector | all/shubuh/ashar/maghrib/isya | - |
| Extra fields | - | City, Transport |
| Auto-sync | ✅ Yes | ✅ Yes |
| Delete | ✅ Yes | ✅ Yes |
| List view | ✅ Yes | ✅ Yes |

## Key Differences from Perizinan

1. **No Session Selection**: Perpulangan applies to the full day
2. **Additional Metadata**: 
   - City destination
   - Transportation method
3. **Status Type**: Always sets to "Pulang" (vs "Sakit" or "Izin" for permits)
4. **Auto-note Format**: "Pulang ke {city}" vs "{type} s/d {date}"

## Compatibility

### Coexistence with Old System
The implementation supports both systems:
- **Old System**: Supabase-based event management (`isStudentPulang`)
- **New System**: localStorage-based modal management (`checkActiveHomecoming`)

Priority: localStorage data takes precedence when both exist for the same student.

## Usage Flow

1. User clicks "Perpulangan Santri" button on dashboard
2. Modal opens with:
   - List of all students in selected class
   - Empty form with today's date as default
3. User:
   - Searches and selects students (multi-select)
   - Fills in city and transportation
   - Sets date range
   - Clicks "Simpan Data"
4. System:
   - Validates input
   - Saves to localStorage
   - Shows success message
   - Updates active homecoming list
   - Refreshes attendance if date range includes today
5. Auto-sync automatically marks students as "Pulang" during the date range

## Files Modified

1. **config.js**: Added `homecomingKey`
2. **state.js**: Added `homecomings` array
3. **index.html**: Added modal dialog and updated button
4. **app-features.js**: Added all homecoming management functions
5. **app-core.js**: Updated auto-sync logic with priority system

## Security
- ✅ CodeQL scan passed with 0 alerts
- ✅ No SQL injection risk (uses localStorage)
- ✅ Input validation implemented
- ✅ No deprecated functions (replaced `substr` with `substring`)

## Testing Checklist
- ✅ Syntax validation passed
- ✅ Function definitions verified
- ✅ Modal HTML structure verified
- ✅ Button integration verified
- ✅ Code review completed
- ✅ Security scan passed

## Future Enhancements
1. Add arrival tracking (like old system)
2. Add late arrival reasons
3. Export homecoming reports
4. Sync between localStorage and Supabase
5. Bulk import from CSV
