/**
 * ============================================================================
 * SISTEM DATABASE GOOGLE SHEETS - PRESENSI ASRAMA MU'ALLIMIN
 * Google Apps Script (Code.gs)
 * ============================================================================
 * 
 * FITUR UTAMA:
 * 1. Multi-Table Support: Records, Izin, Kegiatan, Logbook, Mutabaah, SantriSakit, Musyrif
 * 2. Concurrency Safety: Menggunakan LockService untuk mencegah data collision multi-user
 * 3. High Performance: Operasi in-memory array manipulation (1x read / 1x write per batch)
 * 4. Delta Sync: Mendukung query delta (hanya ambil data yang berubah sejak timestamp tertentu)
 * 5. Auto-Migration: Otomatis membuat sheet dan kolom header jika belum ada
 * 
 * CARA DEPLOY:
 * 1. Buka spreadsheet Google Sheets baru atau yang sudah ada.
 * 2. Klik Extensions (Ekstensi) > Apps Script.
 * 3. Hapus semua kode default, lalu tempel kode di bawah ini.
 * 4. Klik "Deploy" (Terapkan) > "New deployment" (Penerapan baru).
 * 5. Pilih tipe "Web app" (Aplikasi web).
 * 6. Set "Execute as": "Me" (Saya).
 * 7. Set "Who has access": "Anyone" (Siapa saja).
 * 8. Klik "Deploy", salin "Web app URL", dan masukkan ke aplikasi Presensi.
 * ============================================================================
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Daftar sheet yang didukung beserta konfigurasi nama tab
const TABLES = {
  RECORDS: "Records",
  IZIN: "Izin",
  KEGIATAN: "Kegiatan",
  LOGBOOK: "Logbook",
  MUTABAAH: "Mutabaah",
  SANTRI_SAKIT: "SantriSakit",
  MUSYRIF: "Musyrif",
  SANTRI: "Santri",
  SUNNAH_FASTS: "SunnahFasts",
  SANTRI_IZIN: "SantriIzin",
  DATA_PERIZINAN: "DataPerizinan",
  SANTRI_REQUESTS: "SantriRequests",
  PHOTOS: "Photos",
  FOTO_LOGBOOK: "Foto_Logbook",
  FOTO_IZIN: "Foto_Izin",
  FOTO_SANTRI_SAKIT: "Foto_SantriSakit"
};

const STANDARD_HEADERS = ["id", "created_at", "updated_at", "is_deleted", "data_json"];

/**
 * Handle HTTP POST Request (Batch Upsert & Soft Delete)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Tunggu hingga 15 detik untuk mendapatkan antrean lock
  if (!lock.tryLock(15000)) {
    return createResponse({
      status: "error",
      message: "Server sibuk memproses antrean lain. Silakan coba sesaat lagi."
    }, 429);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: "error", message: "Payload POST kosong" }, 400);
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || "batch_upsert";
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === "batch_upsert") {
      const table = payload.table;
      const records = payload.records || [];
      if (!table) throw new Error("Parameter 'table' wajib disertakan.");
      
      const sheet = getOrCreateSheet(ss, table);
      const count = executeBatchUpsert(sheet, records);
      
      return createResponse({
        status: "success",
        action: "batch_upsert",
        table: table,
        affectedRows: count,
        serverTime: new Date().toISOString()
      });
    }

    if (action === "multi_table_upsert") {
      // payload.tables = { records: [...], izin: [...], ... }
      const tablesData = payload.tables || {};
      const results = {};

      for (const tableName in tablesData) {
        if (Object.prototype.hasOwnProperty.call(tablesData, tableName)) {
          const recs = tablesData[tableName] || [];
          if (recs.length > 0) {
            const sheet = getOrCreateSheet(ss, tableName);
            results[tableName] = executeBatchUpsert(sheet, recs);
          }
        }
      }

      return createResponse({
        status: "success",
        action: "multi_table_upsert",
        results: results,
        serverTime: new Date().toISOString()
      });
    }

    if (action === "reset_all_data") {
      const sheets = ss.getSheets();
      sheets.forEach(sh => {
        const name = sh.getName();
        if (!name.startsWith("_")) {
          sh.clear();
          sh.getRange(1, 1, 1, STANDARD_HEADERS.length).setValues([STANDARD_HEADERS]);
          sh.setFrozenRows(1);
        }
      });

      return createResponse({
        status: "success",
        action: "reset_all_data",
        message: "Seluruh data sheet berhasil di-reset bersih",
        serverTime: new Date().toISOString()
      });
    }

    if (action === "migrate_photos") {
      const result = migrateExistingPhotosToPhotoTable();
      return createResponse({
        status: "success",
        action: "migrate_photos",
        result: result,
        serverTime: new Date().toISOString()
      });
    }

    return createResponse({ status: "error", message: "Action tidak dikenal: " + action }, 400);
  } catch (err) {
    return createResponse({ status: "error", message: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle HTTP GET Request (Delta Fetch & Full Hydration)
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || "get_all";
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. Health check & Ping
    if (action === "ping") {
      return createResponse({
        status: "success",
        message: "Google Apps Script Database Online",
        spreadsheetName: ss.getName(),
        serverTime: new Date().toISOString()
      });
    }

    // 2. Fetch Single Table (Delta or Full)
    if (action === "get_table" || action === "get_delta") {
      const table = params.table;
      if (!table) throw new Error("Parameter 'table' wajib disertakan.");
      
      const since = params.since ? new Date(params.since).getTime() : 0;
      const sheet = ss.getSheetByName(table);
      
      if (!sheet) {
        return createResponse({
          status: "success",
          table: table,
          data: [],
          serverTime: new Date().toISOString()
        });
      }

      const rows = readSheetData(sheet, since);
      return createResponse({
        status: "success",
        table: table,
        data: rows,
        count: rows.length,
        serverTime: new Date().toISOString()
      });
    }

    // 3. Fetch All Tables in 1 Request (Initial App Hydration)
    if (action === "get_all" || action === "get_all_delta") {
      const since = params.since ? new Date(params.since).getTime() : 0;
      const allData = {};
      const sheets = ss.getSheets();

      sheets.forEach(sh => {
        const name = sh.getName();
        // Skip sheet sistem jika ada
        if (!name.startsWith("_")) {
          allData[name] = readSheetData(sh, since);
        }
      });

      return createResponse({
        status: "success",
        action: "get_all",
        data: allData,
        serverTime: new Date().toISOString()
      });
    }

    return createResponse({ status: "error", message: "Action tidak dikenal: " + action }, 400);
  } catch (err) {
    return createResponse({ status: "error", message: err.toString() }, 500);
  }
}

/**
 * Utility: Membaca data sheet secara in-memory dan memfilter berdasarkan waktu delta
 */
function readSheetData(sheet, sinceTimestamp) {
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const idIdx = headers.indexOf("id");
  const createdIdx = headers.indexOf("created_at");
  const updatedIdx = headers.indexOf("updated_at");
  const isDeletedIdx = headers.indexOf("is_deleted");
  const dataIdx = headers.indexOf("data_json");

  if (idIdx === -1) return [];

  const results = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = row[idIdx];
    if (!id) continue;

    const updatedAt = row[updatedIdx];
    const updatedTime = updatedAt ? new Date(updatedAt).getTime() : 0;

    // Filter delta: hanya ambil data jika diubah setelah sinceTimestamp
    if (!sinceTimestamp || updatedTime >= sinceTimestamp) {
      let parsedData = {};
      if (dataIdx !== -1 && row[dataIdx]) {
        try {
          parsedData = JSON.parse(row[dataIdx]);
        } catch (_) {
          parsedData = {};
        }
      }

      results.push({
        id: String(id),
        created_at: createdIdx !== -1 ? row[createdIdx] : "",
        updated_at: updatedIdx !== -1 ? row[updatedIdx] : "",
        is_deleted: isDeletedIdx !== -1 ? (row[isDeletedIdx] === true || row[isDeletedIdx] === "TRUE") : false,
        ...parsedData
      });
    }
  }

  return results;
}

/**
 * Utility: Batch Upsert (Update jika ID ada, Insert jika baru)
 */
function executeBatchUpsert(sheet, records) {
  if (!records || records.length === 0) return 0;

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const idMap = new Map();

  for (let i = 1; i < values.length; i++) {
    const rowId = String(values[i][0]);
    if (rowId) {
      idMap.set(rowId, i + 1); // 1-based row index
    }
  }

  const now = new Date().toISOString();
  const newRows = [];

  records.forEach(rec => {
    const id = String(rec.id);
    const createdAt = rec.created_at || now;
    const updatedAt = rec.updated_at || now;
    const isDeleted = rec.is_deleted ? true : false;

    // Simpan field payload non-standar ke dalam JSON
    const payload = { ...rec };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.is_deleted;

    const rowData = [id, createdAt, updatedAt, isDeleted, JSON.stringify(payload)];

    if (idMap.has(id)) {
      const rowNumber = idMap.get(id);
      sheet.getRange(rowNumber, 1, 1, STANDARD_HEADERS.length).setValues([rowData]);
    } else {
      newRows.push(rowData);
    }
  });

  if (newRows.length > 0) {
    sheet.getRange(values.length + 1, 1, newRows.length, STANDARD_HEADERS.length).setValues(newRows);
  }

  return records.length;
}

/**
 * Utility: Dapatkan atau buat sheet baru dengan header standar
 */
function getOrCreateSheet(spreadsheet, tableName) {
  let sheet = spreadsheet.getSheetByName(tableName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(tableName);
    sheet.getRange(1, 1, 1, STANDARD_HEADERS.length).setValues([STANDARD_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Utility: Membuat Response JSON yang valid & mendukung CORS
 */
function createResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Migration Utility: Memindahkan foto Base64 yang sudah terlanjur ada di sheet utama ke sheet Photos
 * Dapat dijalankan langsung dari Apps Script editor atau dipanggil via POST action: "migrate_photos"
 */
function migrateExistingPhotosToPhotoTable() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const targetTables = ["Logbook", "Izin", "SantriSakit", "Mutabaah", "SantriIzin", "DataPerizinan"];
  const photoFields = ["photoUrl", "fotoSantriUrl", "lampiranUrl", "imageUrl", "avatarUrl", "photo", "foto"];
  
  const photoSheet = getOrCreateSheet(ss, TABLES.PHOTOS);
  const extractedPhotos = [];
  let migratedCount = 0;

  targetTables.forEach(tableName => {
    const sheet = ss.getSheetByName(tableName);
    if (!sheet) return;

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    if (values.length <= 1) return;

    const headers = values[0];
    const idIdx = headers.indexOf("id");
    const dataIdx = headers.indexOf("data_json");
    if (idIdx === -1 || dataIdx === -1) return;

    let modified = false;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const id = row[idIdx];
      const rawJson = row[dataIdx];
      if (!id || !rawJson) continue;

      let obj = {};
      try {
        obj = JSON.parse(rawJson);
      } catch (_) {
        continue;
      }

      let rowHasPhoto = false;

      // Recursive scan untuk menemukan base64 image
      function scanAndExtract(node, path) {
        if (!node || typeof node !== "object") return;
        for (const k in node) {
          const val = node[k];
          if (typeof val === "string" && val.startsWith("data:image")) {
            const photoId = "photo_" + id + "_" + k + "_" + Date.now();
            extractedPhotos.push({
              id: photoId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: false,
              record_id: id,
              table_source: tableName,
              field_key: k,
              photo_data: val
            });
            node[k] = "photo:" + photoId;
            rowHasPhoto = true;
            migratedCount++;
          } else if (val && typeof val === "object") {
            scanAndExtract(val, path + "." + k);
          }
        }
      }

      scanAndExtract(obj, "");

      if (rowHasPhoto) {
        row[dataIdx] = JSON.stringify(obj);
        modified = true;
      }
    }

    if (modified) {
      sheet.getDataRange().setValues(values);
    }
  });

  if (extractedPhotos.length > 0) {
    executeBatchUpsert(photoSheet, extractedPhotos);
  }

  return {
    success: true,
    totalMigrated: migratedCount,
    extractedPhotosCount: extractedPhotos.length
  };
}
