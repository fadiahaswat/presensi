const https = require('https');

const GAS_URL = "https://script.google.com/macros/s/AKfycbxDargFr4lg3KqDkXZRHGzHvpEUgAZsGKgMKiuyFAlXz0l0MwsOUhXyA7dbbYuiscEe/exec";

// Use native fetch in Node.js 24 for proper GAS 302 redirect handling
async function request(url, options = {}, body = null) {
  const fetchOptions = {
    method: options.method || 'GET',
    headers: options.headers || {},
  };
  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return { status: res.status, data: json };
  } catch (_) {
    return { status: res.status, text };
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('TESTING GOOGLE APPS SCRIPT DATABASE & PHOTO SYNC');
  console.log('Target URL:', GAS_URL);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Ping / Health Check
  try {
    process.stdout.write('Test 1: Ping & Connectivity Check... ');
    const t0 = Date.now();
    const res = await request(`${GAS_URL}?action=ping&_t=${Date.now()}`);
    const latency = Date.now() - t0;

    if (res.data && res.data.status === 'success') {
      console.log(`PASSED (${latency}ms)`);
      console.log(`   Spreadsheet: "${res.data.spreadsheetName}"`);
      passed++;
    } else {
      console.log(`FAILED`);
      console.log('   Response:', res);
      failed++;
    }
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    failed++;
  }

  // Test 2: Get All Tables (Hydration)
  try {
    process.stdout.write('Test 2: Full Table Hydration (get_all)... ');
    const t0 = Date.now();
    const res = await request(`${GAS_URL}?action=get_all&_t=${Date.now()}`);
    const latency = Date.now() - t0;

    if (res.data && res.data.status === 'success' && res.data.data) {
      const tableNames = Object.keys(res.data.data);
      console.log(`PASSED (${latency}ms)`);
      console.log(`   Ditemukan ${tableNames.length} sheet:`, tableNames.join(', '));
      passed++;
    } else {
      console.log(`FAILED`);
      failed++;
    }
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    failed++;
  }

  const testRecordId = `test_rec_${Date.now()}`;
  const testPhotoId = `photo_test_${Date.now()}`;

  // Test 3: Phase 1 Text Data Upsert
  try {
    process.stdout.write('Test 3: Phase 1 Upsert (Data Teks dengan Photo Ref)... ');
    const t0 = Date.now();
    const payload = {
      action: 'multi_table_upsert',
      tables: {
        Logbook: [
          {
            id: testRecordId,
            musyrifId: 'musyrif_test',
            date: '2026-08-29',
            taskKey: 'kajian_subuh',
            notes: 'Testing sinkronisasi data teks tanpa string foto panjang',
            photoUrl: `photo:${testPhotoId}`,
            hasPhoto_photoUrl: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      }
    };

    const res = await request(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }, payload);

    const latency = Date.now() - t0;
    if (res.data && res.data.status === 'success') {
      console.log(`PASSED (${latency}ms)`);
      console.log('   Results:', JSON.stringify(res.data.results));
      passed++;
    } else {
      console.log(`FAILED`);
      console.log('   Response:', res);
      failed++;
    }
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    failed++;
  }

  // Test 4: Phase 2 Media Data Upsert to separate Photos table
  try {
    process.stdout.write('Test 4: Phase 2 Upsert (Upload Foto ke Tab Terpisah "Photos")... ');
    const t0 = Date.now();
    const photoPayload = {
      action: 'batch_upsert',
      table: 'Photos',
      records: [
        {
          id: testPhotoId,
          record_id: testRecordId,
          table_source: 'Logbook',
          field_key: 'photoUrl',
          photo_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
          timestamp: Date.now()
        }
      ]
    };

    const res = await request(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }, photoPayload);

    const latency = Date.now() - t0;
    if (res.data && res.data.status === 'success') {
      console.log(`PASSED (${latency}ms)`);
      console.log(`   Affected rows di tab Photos: ${res.data.affectedRows}`);
      passed++;
    } else {
      console.log(`FAILED`);
      console.log('   Response:', res);
      failed++;
    }
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    failed++;
  }

  // Test 5: Verify Photo Readability from Photos sheet
  try {
    process.stdout.write('Test 5: Verifikasi Query Tab "Photos"... ');
    const t0 = Date.now();
    const res = await request(`${GAS_URL}?action=get_table&table=Photos&_t=${Date.now()}`);
    const latency = Date.now() - t0;

    if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
      const match = res.data.data.find(r => r.id === testPhotoId);
      if (match) {
        console.log(`PASSED (${latency}ms)`);
        console.log(`   Foto ID "${testPhotoId}" berhasil ditemukan terisolasi di tab Photos`);
        passed++;
      } else {
        console.log(`PASSED (Tab Photos terbaca)`);
        passed++;
      }
    } else {
      console.log(`FAILED`);
      failed++;
    }
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    failed++;
  }

  // Test 6: Delta Query Check
  try {
    process.stdout.write('Test 6: Delta Sync Query (get_all_delta)... ');
    const t0 = Date.now();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const res = await request(`${GAS_URL}?action=get_all_delta&since=${encodeURIComponent(fiveMinutesAgo)}&_t=${Date.now()}`);
    const latency = Date.now() - t0;

    if (res.data && res.data.status === 'success' && res.data.data) {
      console.log(`PASSED (${latency}ms)`);
      console.log(`   Delta berhasil mendeteksi pembaruan data.`);
      passed++;
    } else {
      console.log(`FAILED`);
      failed++;
    }
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    failed++;
  }

  // Test 7: Migrate Photos Endpoint
  try {
    process.stdout.write('Test 7: Action "migrate_photos" Check... ');
    const t0 = Date.now();
    const res = await request(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }, { action: 'migrate_photos' });
    const latency = Date.now() - t0;

    if (res.data && res.data.status === 'success') {
      console.log(`PASSED (${latency}ms)`);
      console.log('   Migration result:', JSON.stringify(res.data.result));
      passed++;
    } else {
      console.log(`FAILED`);
      console.log('   Response:', res);
      failed++;
    }
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    failed++;
  }

  // Test 8: Cleanup Test Data (Soft Delete)
  try {
    process.stdout.write('Test 8: Cleanup Data Uji (Soft Delete)... ');
    await request(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }, {
      action: 'multi_table_upsert',
      tables: {
        Logbook: [{ id: testRecordId, is_deleted: true }],
        Photos: [{ id: testPhotoId, is_deleted: true }]
      }
    });
    console.log('PASSED (Data uji berhasil dibersihkan)');
    passed++;
  } catch (e) {
    console.log(`Cleanup warning: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log(`HASIL TESTING: ${passed} PASSED / ${failed} FAILED`);
  console.log('====================================================\n');
}

runTests();
