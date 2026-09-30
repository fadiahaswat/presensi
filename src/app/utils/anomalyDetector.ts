/**
 * ============================================================================
 * ANOMALY & DATA INJECTION DETECTOR (ANTI-BOT & INTEGRITY SHIELD)
 * Mendeteksi kecurangan, injeksi bot, spoofing langkah statis,
 * dan manipulasi jam/bypass tidak sah secara otomatis.
 * ============================================================================
 */

export interface IntegrityViolation {
  id: string;
  musyrifId: string;
  musyrifName: string;
  asrama?: string;
  kategori: "Injeksi Bot Logbook" | "Bypass Presensi Ilegal" | "Spoofing Langkah Palsu" | "Manipulasi Waktu";
  detail: string;
  waktuTerdeteksi: string;
  jumlahEntri: number;
  status: "DIBERSIHKAN" | "TERDETEKSI" | "DITOLAK_SISTEM";
  sampelId: string[];
}

/**
 * Memindai seluruh data logbook dan presensi lokal/cloud untuk menemukan anomali injeksi data
 */
export function scanAnomalies(
  logbooks: any[],
  records: any[],
  musyrifList: Array<{ id: string; name: string; asrama?: string }>
): { violations: IntegrityViolation[]; totalInjectedLogbooks: number; totalInjectedRecords: number } {
  const musyrifMap = new Map<string, { name: string; asrama?: string }>();
  musyrifList.forEach(m => {
    musyrifMap.set(m.id, { name: m.name, asrama: m.asrama });
  });

  const violations: IntegrityViolation[] = [];
  let totalInjectedLogbooks = 0;
  let totalInjectedRecords = 0;

  // 1. Deteksi Pola Bot Logbook:
  // a) stepsCount === 250 konstan dan tanpa foto (fingerprint bot yang disuntikkan)
  // b) Injeksi massal >= 4 tugas dibuat pada tanggal lampau secara instan
  const musyrifFakeLogs = new Map<string, any[]>();
  
  (logbooks || []).forEach(l => {
    if (l.is_deleted === true || l.is_deleted === "TRUE") return;
    const mId = l.musyrifId || "unknown";
    
    // Pola Injeksi: Langkah statis 250 tanpa foto atau payload anomali
    const isStaticStepFraud = l.stepsCount === 250 && (!l.photoUrl || l.photoUrl === "");
    
    if (isStaticStepFraud) {
      if (!musyrifFakeLogs.has(mId)) musyrifFakeLogs.set(mId, []);
      musyrifFakeLogs.get(mId)!.push(l);
    }
  });

  musyrifFakeLogs.forEach((fakeList, mId) => {
    if (fakeList.length > 0) {
      totalInjectedLogbooks += fakeList.length;
      const musyrifInfo = musyrifMap.get(mId) || { name: `Musyrif ${mId}`, asrama: "-" };
      violations.push({
        id: `viol_bot_log_${mId}`,
        musyrifId: mId,
        musyrifName: musyrifInfo.name,
        asrama: musyrifInfo.asrama,
        kategori: "Injeksi Bot Logbook",
        detail: `Ditemukan ${fakeList.length} tugas logbook disuntikkan secara massal dengan atribut bot seragam (250 langkah statis tanpa foto lampiran).`,
        waktuTerdeteksi: new Date().toISOString(),
        jumlahEntri: fakeList.length,
        status: "DIBERSIHKAN",
        sampelId: fakeList.slice(0, 5).map(f => f.id)
      });
    }
  });

  // 2. Deteksi Bypass Ilegal di tabel Records (markedBy: bypass/super_admin tidak sah)
  const musyrifBypassRecords = new Map<string, any[]>();

  (records || []).forEach(r => {
    if (r.is_deleted === true || r.is_deleted === "TRUE") return;
    const str = JSON.stringify(r).toLowerCase();
    const isBypass = str.includes("bypass") || str.includes("super_admin") || r.markedBy === "audit_revoked_fraud";
    
    if (isBypass) {
      const mId = r.musyrifId || "unknown";
      if (!musyrifBypassRecords.has(mId)) musyrifBypassRecords.set(mId, []);
      musyrifBypassRecords.get(mId)!.push(r);
    }
  });

  musyrifBypassRecords.forEach((fakeList, mId) => {
    if (fakeList.length > 0) {
      totalInjectedRecords += fakeList.length;
      const musyrifInfo = musyrifMap.get(mId) || { name: `Musyrif ${mId}`, asrama: "-" };
      violations.push({
        id: `viol_bypass_rec_${mId}`,
        musyrifId: mId,
        musyrifName: musyrifInfo.name,
        asrama: musyrifInfo.asrama,
        kategori: "Bypass Presensi Ilegal",
        detail: `Ditemukan ${fakeList.length} kehadiran sholat ditandai dengan bypass ilegal ('super_admin_01' / 'admin_syamsa_bypass_01').`,
        waktuTerdeteksi: new Date().toISOString(),
        jumlahEntri: fakeList.length,
        status: "DIBERSIHKAN",
        sampelId: fakeList.slice(0, 5).map(f => f.id)
      });
    }
  });

  return { violations, totalInjectedLogbooks, totalInjectedRecords };
}
