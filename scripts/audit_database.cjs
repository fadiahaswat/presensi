const fs = require('fs');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxDargFr4lg3KqDkXZRHGzHvpEUgAZsGKgMKiuyFAlXz0l0MwsOUhXyA7dbbYuiscEe/exec';

async function audit() {
  console.log('Connecting to Google Apps Script Database...');
  const t0 = Date.now();
  const res = await fetch(`${GAS_URL}?action=get_all&_t=${Date.now()}`);
  console.log(`Fetch completed in ${(Date.now() - t0)/1000}s`);
  const json = await res.json();
  const data = json.data || {};

  console.log('Tables found:');
  const tableSummary = {};
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      tableSummary[key] = val.length;
      console.log(`- ${key}: ${val.length} rows`);
    } else {
      console.log(`- ${key}: ${typeof val}`);
    }
  }

  // Check for anomalies and injection patterns
  // Common injection patterns: SQL syntax (SELECT, DROP, UNION, --, 1=1), Script tags (<script>, javascript:), Formula injection (=cmd, @SUM, +/-, etc. in sheets)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /UNION\s+SELECT/i,
    /DROP\s+TABLE/i,
    /--/,
    /\bOR\s+1=1\b/i,
    /^[=+\-@]/ // Spreadsheet formula injection in text fields
  ];

  console.log('\n--- SCANNING FOR INJECTION & ANOMALIES ---');
  let suspiciousEntries = [];
  let totalScanned = 0;

  for (const [tableName, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) continue;
    rows.forEach((row, idx) => {
      totalScanned++;
      for (const [col, val] of Object.entries(row)) {
        if (typeof val === 'string') {
          // Check XSS / SQLi
          if (/<script|javascript:|UNION\s+SELECT|DROP\s+TABLE|OR\s+1=1/i.test(val)) {
            suspiciousEntries.push({
              table: tableName,
              rowIdx: idx,
              id: row.id,
              col,
              val,
              type: 'Potential XSS or SQLi'
            });
          }
          // Check Formula Injection if starting with = and looks like formula
          if (/^=[A-Z]+\(/i.test(val) || /^=cmd/i.test(val)) {
            suspiciousEntries.push({
              table: tableName,
              rowIdx: idx,
              id: row.id,
              col,
              val,
              type: 'Potential Formula Injection'
            });
          }
        }
      }
    });
  }

  console.log(`Total scanned rows: ${totalScanned}`);
  console.log(`Suspicious entries found: ${suspiciousEntries.length}`);
  if (suspiciousEntries.length > 0) {
    console.log('Details:', JSON.stringify(suspiciousEntries, null, 2));
  }

  // Check Records (Presensi) table specifically for anomalies
  const records = data.Records || data.records || [];
  console.log(`\nAnalyzing Attendance (Records) count: ${records.length}`);
  
  // Date format checks, invalid status checks, duplicate attendance
  let invalidStatusCount = 0;
  let invalidDateCount = 0;
  const duplicateCheck = new Map();
  let duplicates = 0;

  records.forEach((r, idx) => {
    // Unique key: musyrifId + date
    const mId = r.musyrifId || r.musyrif_id || r.id;
    const date = r.date;
    const key = `${mId}_${date}`;
    if (duplicateCheck.has(key)) {
      duplicates++;
    } else {
      duplicateCheck.set(key, true);
    }

    const validStatus = ['hadir', 'sakit', 'izin', 'alfa', 'alpa', undefined, null, ''];
    if (r.subuh && !validStatus.includes(String(r.subuh).toLowerCase())) invalidStatusCount++;
    if (r.ashar && !validStatus.includes(String(r.ashar).toLowerCase())) invalidStatusCount++;
    if (r.maghrib && !validStatus.includes(String(r.maghrib).toLowerCase())) invalidStatusCount++;

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      invalidDateCount++;
      if (invalidDateCount <= 5) console.log('Invalid date sample:', date, 'at row', idx);
    }
  });

  console.log(`- Duplicates found: ${duplicates}`);
  console.log(`- Invalid status values found: ${invalidStatusCount}`);
  console.log(`- Invalid date formats: ${invalidDateCount}`);

  // Musyrif breakdown
  const musyrifs = data.Musyrif || data.musyrif || [];
  console.log(`\nMusyrif list count: ${musyrifs.length}`);
  let sparmanCount = 0;
  let sedayuCount = 0;
  let otherAsramaCount = 0;
  const asramasFound = new Set();

  musyrifs.forEach(m => {
    const asr = (m.asrama || '').toLowerCase();
    asramasFound.add(m.asrama);
    if (asr.includes('sedayu')) {
      sedayuCount++;
    } else {
      // Typically Sparman includes campus 1 / Sparman
      sparmanCount++;
    }
  });

  console.log(`- Asrama list:`, Array.from(asramasFound));
  console.log(`- Sedayu Musyrifs: ${sedayuCount}`);
  console.log(`- Sparman Musyrifs: ${sparmanCount}`);

  // Months available in records
  const monthsFound = new Set();
  records.forEach(r => {
    if (r.date && /^\d{4}-\d{2}/.test(r.date)) {
      monthsFound.add(r.date.substring(0, 7));
    }
  });
  console.log(`- Months present in Records:`, Array.from(monthsFound).sort());

  // Save audit report to json
  fs.writeFileSync('scripts/audit_result.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    tableSummary,
    suspiciousEntries,
    attendanceStats: {
      totalRecords: records.length,
      duplicates,
      invalidStatusCount,
      invalidDateCount,
      months: Array.from(monthsFound).sort(),
    },
    musyrifStats: {
      total: musyrifs.length,
      sedayuCount,
      sparmanCount,
      asramas: Array.from(asramasFound)
    }
  }, null, 2));

  console.log('\nAudit report written to scripts/audit_result.json');
}

audit().catch(console.error);
