const GAS_URL = 'https://script.google.com/macros/s/AKfycbxDargFr4lg3KqDkXZRHGzHvpEUgAZsGKgMKiuyFAlXz0l0MwsOUhXyA7dbbYuiscEe/exec';

async function deepAudit() {
  console.log('Fetching all tables from GAS...');
  const res = await fetch(GAS_URL + '?action=get_all&_t=' + Date.now());
  const json = await res.json();
  const tables = json.data;

  console.log('\n--- 1. AGENDA RAPAT TABLES ---');
  const agendas = tables.agenda_rapat || [];
  console.log('Total Agendas in Cloud:', agendas.length);
  agendas.forEach(a => {
    console.log({
      id: a.id,
      title: a.title,
      date: a.date,
      invitedCount: (a.invitedMusyrifIds || []).length,
      is_deleted: a.is_deleted,
      _deleted: a._deleted
    });
  });

  console.log('\n--- 2. ALL LOGBOOK ENTRIES RELATED TO MEETINGS / RAPAT ---');
  const logbook = tables.Logbook || [];
  console.log('Total Logbook rows:', logbook.length);
  
  const meetingLogs = logbook.filter(l => {
    const k = (l.taskKey || '').toLowerCase();
    const id = (l.id || '').toLowerCase();
    const notes = (l.notes || '').toLowerCase();
    return k.includes('agenda') || k.includes('rapat') || id.includes('agenda') || id.includes('rapat') || notes.includes('rapat');
  });

  console.log('Meeting related logbook rows found:', meetingLogs.length);
  meetingLogs.forEach((l, idx) => {
    console.log(`[${idx+1}] ID: ${l.id} | Musyrif: ${l.musyrifId} | Date: ${l.date} | TaskKey: ${l.taskKey} | Done: ${l.done} | CompletedAt: ${l.completedAt} | HasPhoto: ${Boolean(l.photoUrl)} | Notes: ${l.notes || '-'}`);
  });

  console.log('\n--- 3. CHECKING WHY THEY MIGHT NOT MATCH ---');
  agendas.forEach(ag => {
    console.log(`\nAgenda [${ag.id}] "${ag.title}" (Date: ${ag.date}, Deleted: ${ag._deleted || ag.is_deleted}):`);
    let invited = ag.invitedMusyrifIds;
    if (typeof invited === 'string') {
      try { invited = JSON.parse(invited); } catch (_) { invited = invited.split(',').map(s => s.trim()); }
    }
    if (!Array.isArray(invited)) invited = [];
    console.log(`Invited Musyrifs (${invited.length}):`, invited.join(', '));
    
    // Find logs on that date
    const logsOnDate = meetingLogs.filter(l => l.date === ag.date);
    console.log(`Logs on date ${ag.date}: ${logsOnDate.length}`);
    logsOnDate.forEach(l => {
      const isInvited = invited.includes(l.musyrifId);
      const cleanAgId = ag.id.replace(/^agenda_/, '');
      const cleanLogKey = (l.taskKey || '').replace(/^agenda_/, '');
      const isKeyMatch = (l.taskKey === ag.id) || 
                         (l.taskKey === `agenda_${ag.id}`) || 
                         (cleanLogKey === cleanAgId) ||
                         (l.taskKey.includes(cleanAgId));
      console.log(` - Musyrif: ${l.musyrifId} | TaskKey: "${l.taskKey}" | In InvitedList: ${isInvited} | Matches Key: ${isKeyMatch} | Done: ${l.done}`);
    });
  });

  console.log('\n--- 4. CHECKING LOGBOOK ENTRIES THAT HAVE NO MATCHING AGENDA ---');
  meetingLogs.forEach(l => {
    const matchingAg = agendas.find(a => {
      const cleanAgId = a.id.replace(/^agenda_/, '');
      const cleanLogKey = (l.taskKey || '').replace(/^agenda_/, '');
      return (l.taskKey === a.id) || (l.taskKey === `agenda_${a.id}`) || (cleanLogKey === cleanAgId) || (l.taskKey.includes(cleanAgId));
    });
    if (!matchingAg) {
      console.log(`ORPHAN LOGBOOK ENTRY: Musyrif ${l.musyrifId} on ${l.date} with TaskKey "${l.taskKey}" (ID: ${l.id}) - NO AGENDA RECORD IN agenda_rapat!`);
    } else if (matchingAg._deleted || matchingAg.is_deleted) {
      console.log(`DELETED AGENDA LOGBOOK ENTRY: Musyrif ${l.musyrifId} on ${l.date} with TaskKey "${l.taskKey}" references DELETED agenda "${matchingAg.id}"!`);
    }
  });

  console.log('\n--- 5. MUSYRIF LIST CHECK ---');
  const musyrifs = tables.Musyrif || [];
  console.log('Total Musyrif in Cloud:', musyrifs.length);
}

deepAudit().catch(console.error);
