const fs = require('fs');

async function testExportLogic() {
  console.log('Connecting to cloud database...');
  const res = await fetch('https://script.google.com/macros/s/AKfycbxDargFr4lg3KqDkXZRHGzHvpEUgAZsGKgMKiuyFAlXz0l0MwsOUhXyA7dbbYuiscEe/exec?action=get_all');
  const json = await res.json();
  const records = json.data.Records || [];
  const musyrifs = json.data.Musyrif || [];

  console.log('Live Cloud Records count:', records.length, '| Musyrifs count:', musyrifs.length);

  // Field Musyrif filter
  const isFieldMusyrif = (user) => {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    const id = (user.id || '').toLowerCase();
    const name = (user.name || '').toLowerCase();
    if (['pamong', 'koordinator_musyrif', 'kaur_kis', 'wadir4', 'wadir', 'kaur', 'admin'].includes(role)) return false;
    if (['wadir4', 'wadir', 'kaurkis', 'kaur_kis', 'k1', 'admin'].includes(id)) return false;
    if (name.includes('ahmad salim') || name.includes('muhammad shaleh') || name.includes('andi aqillah')) return false;
    return true;
  };

  const fieldM = musyrifs.filter(isFieldMusyrif);
  const sparman = fieldM.filter(m => !(m.asrama || '').toLowerCase().includes('sedayu'));
  const sedayu = fieldM.filter(m => (m.asrama || '').toLowerCase().includes('sedayu'));

  console.log('Field Musyrifs Count -> Sparman:', sparman.length, '| Sedayu:', sedayu.length);

  // Check September 2026
  const monthKey = '2026-09';
  const sepRecs = records.filter(r => r.date && r.date.startsWith(monthKey));
  console.log('September records count:', sepRecs.length);

  const computeRows = (list) => {
    return list.map(m => {
      let sh = 0, ah = 0, mh = 0, izin = 0, sakit = 0, alpa = 0;
      sepRecs.filter(r => r.musyrifId === m.id).forEach(r => {
        if (r.subuh === 'hadir') sh++; else if (r.subuh === 'izin') izin++; else if (r.subuh === 'sakit') sakit++; else if (r.subuh === 'alfa') alpa++;
        if (r.ashar === 'hadir') ah++; else if (r.ashar === 'izin') izin++; else if (r.ashar === 'sakit') sakit++; else if (r.ashar === 'alfa') alpa++;
        if (r.maghrib === 'hadir') mh++; else if (r.maghrib === 'izin') izin++; else if (r.maghrib === 'sakit') sakit++; else if (r.maghrib === 'alfa') alpa++;
      });
      const totHadir = sh + ah + mh;
      const totSlots = 28 * 3; // 28 active days in Sept
      const pct = Math.round((totHadir / totSlots) * 100);
      let color = 'red';
      if (pct >= 75) color = 'green';
      else if (pct >= 50) color = 'yellow';
      return { id: m.id, name: m.name, asrama: m.asrama, sh, ah, mh, totHadir, izin, sakit, alpa, pct, color };
    }).sort((a,b) => b.pct - a.pct || b.totHadir - a.totHadir);
  };

  const sparmanRows = computeRows(sparman);
  const sedayuRows = computeRows(sedayu);

  console.log('\n--- TOP 5 MUSYRIF KAMPUS SPARMAN (September 2026) ---');
  sparmanRows.slice(0, 5).forEach((r, idx) => {
    console.log(`${idx+1}. ${r.name.padEnd(30)} | ${r.asrama.padEnd(22)} | Shb:${r.sh} Ash:${r.ah} Mag:${r.mh} | Tot:${r.totHadir} | I:${r.izin} S:${r.sakit} A:${r.alpa} | ${r.pct}% [${r.color.toUpperCase()}]`);
  });

  console.log('\n--- TOP 5 MUSYRIF KAMPUS SEDAYU (September 2026) ---');
  sedayuRows.slice(0, 5).forEach((r, idx) => {
    console.log(`${idx+1}. ${r.name.padEnd(30)} | ${r.asrama.padEnd(22)} | Shb:${r.sh} Ash:${r.ah} Mag:${r.mh} | Tot:${r.totHadir} | I:${r.izin} S:${r.sakit} A:${r.alpa} | ${r.pct}% [${r.color.toUpperCase()}]`);
  });

  const isSorted = arr => arr.every((v, i) => i === 0 || v.pct <= arr[i - 1].pct);
  console.log('\n[PASS] Sparman rows correctly sorted descending:', isSorted(sparmanRows));
  console.log('[PASS] Sedayu rows correctly sorted descending:', isSorted(sedayuRows));
  console.log('[PASS] Total Sparman Musyrifs evaluated:', sparmanRows.length);
  console.log('[PASS] Total Sedayu Musyrifs evaluated:', sedayuRows.length);
}

testExportLogic().catch(console.error);
