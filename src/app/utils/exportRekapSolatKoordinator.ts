import { format, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay, isToday } from "date-fns";
import { id } from "date-fns/locale";
import { isFieldMusyrif } from "./roleAccessUtils";
import { getEffectiveAttendanceStatus } from "./prayerTimes";

export interface RekapMusyrifRow {
  rank: number;
  id: string;
  name: string;
  asrama: string;
  kamar: string;
  kelas: string;
  pamong: string;
  // Kehadiran Sholat
  subuhHadir: number;
  asharHadir: number;
  maghribHadir: number;
  totalHadir: number;
  // Absensi lainnya
  totalIzin: number;
  totalSakit: number;
  totalAlpa: number;
  // Total Slot dan Persentase
  totalSlots: number;
  pct: number;
  // Status Kategori
  statusColor: "green" | "yellow" | "red";
  statusLabel: string;
}

export interface CampusRekapData {
  campusName: string;
  campusTag: "sparman" | "sedayu";
  musyrifCount: number;
  avgPct: number;
  mumtazCount: number;
  jayyidJiddanCount: number;
  jayyidCount: number;
  maqbulCount: number;
  naqishCount: number;
  highCount: number;
  midCount: number;
  lowCount: number;
  rows: RekapMusyrifRow[];
}

/**
 * Memisahkan dan menghitung rekap salat bulanan musyrif untuk Kampus Sparman dan Sedayu
 */
export function calculateRekapSolatBulanan(
  records: any[],
  month: Date,
  musyrifListAll: any[]
): {
  sparman: CampusRekapData;
  sedayu: CampusRekapData;
  activeDaysCount: number;
  periodLabel: string;
} {
  const monthKey = format(month, "yyyy-MM");
  const periodLabel = format(month, "MMMM yyyy", { locale: id });

  // Hari-hari aktif pada bulan yang dipilih
  const allMonthDays = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  const now = new Date();
  const currentMonthKey = format(now, "yyyy-MM");

  // Jika bulan berjalan, hanya evaluasi hari hingga hari ini. Jika bulan lalu, seluruh hari.
  const evalDays = (monthKey === currentMonthKey)
    ? allMonthDays.filter(d => !isBefore(now, startOfDay(d)) || isToday(d))
    : (monthKey < currentMonthKey ? allMonthDays : []);

  const activeDaysCount = evalDays.length;

  // Filter musyrif lapangan aktif (Pastikan akun Koordinator/Andi Aqillah & testing tidak masuk)
  const fieldMusyrifs = (musyrifListAll || []).filter(m => {
    if (!m) return false;
    const nameLow = (m.name || m.nama || "").toLowerCase();
    const idLow = (m.id || "").toLowerCase();
    if (
      nameLow.includes("andi aqillah") ||
      nameLow.includes("andi testing") ||
      idLow.includes("test_andi") ||
      idLow === "k1" ||
      idLow === "admin"
    ) {
      return false;
    }
    return isFieldMusyrif(m);
  });

  // Pisahkan Sparman & Sedayu
  const sparmanMusyrifs = fieldMusyrifs.filter(m => {
    const asr = (m.asrama || "").toLowerCase();
    return !asr.includes("sedayu");
  });

  const sedayuMusyrifs = fieldMusyrifs.filter(m => {
    const asr = (m.asrama || "").toLowerCase();
    return asr.includes("sedayu");
  });

  const processMusyrifList = (
    list: any[],
    campusName: string,
    campusTag: "sparman" | "sedayu"
  ): CampusRekapData => {
    const computedRows: Omit<RekapMusyrifRow, "rank">[] = list.map(m => {
      const rs = records.filter(r => r.musyrifId === m.id && r.date && r.date.startsWith(monthKey));
      
      let sh = 0, ss = 0, si = 0, sa = 0;
      let ah = 0, as = 0, ai = 0, aa = 0;
      let mh = 0, ms = 0, mi = 0, ma = 0;

      evalDays.forEach(d => {
        const ds = format(d, "yyyy-MM-dd");
        const r = rs.find(x => x.date === ds);
        const subuhSt = getEffectiveAttendanceStatus(r, "subuh", ds, now);
        const asharSt = getEffectiveAttendanceStatus(r, "ashar", ds, now);
        const maghribSt = getEffectiveAttendanceStatus(r, "maghrib", ds, now);

        if (subuhSt === "hadir") sh++;
        else if (subuhSt === "sakit") ss++;
        else if (subuhSt === "izin") si++;
        else if (subuhSt === "alfa") sa++;

        if (asharSt === "hadir") ah++;
        else if (asharSt === "sakit") as++;
        else if (asharSt === "izin") ai++;
        else if (asharSt === "alfa") aa++;

        if (maghribSt === "hadir") mh++;
        else if (maghribSt === "sakit") ms++;
        else if (maghribSt === "izin") mi++;
        else if (maghribSt === "alfa") ma++;
      });

      const totalHadir = sh + ah + mh;
      const totalIzin = si + ai + mi;
      const totalSakit = ss + as + ms;
      const totalAlpa = sa + aa + ma;
      const totalSlots = activeDaysCount * 3;

      const pct = totalSlots > 0 ? Math.round((totalHadir / totalSlots) * 100) : 0;

      // Predikat: Mumtaz (>=85%), Jayyid Jiddan (75-84%), Jayyid (60-74%), Maqbul (50-59%), Naqish (<50%)
      let statusColor: "green" | "yellow" | "red" = "red";
      let statusLabel = "Naqish";
      if (pct >= 85) {
        statusColor = "green";
        statusLabel = "Mumtaz";
      } else if (pct >= 75) {
        statusColor = "green";
        statusLabel = "Jayyid Jiddan";
      } else if (pct >= 60) {
        statusColor = "yellow";
        statusLabel = "Jayyid";
      } else if (pct >= 50) {
        statusColor = "yellow";
        statusLabel = "Maqbul";
      } else {
        statusColor = "red";
        statusLabel = "Naqish";
      }

      return {
        id: m.id,
        name: String(m.name || m.nama || "Musyrif").trim(),
        asrama: m.asrama || "-",
        kamar: m.kamar || "-",
        kelas: m.kelas || "-",
        pamong: m.pamong || "-",
        subuhHadir: sh,
        asharHadir: ah,
        maghribHadir: mh,
        totalHadir,
        totalIzin,
        totalSakit,
        totalAlpa,
        totalSlots,
        pct,
        statusColor,
        statusLabel,
      };
    });

    // Urutkan dari yang paling sering hadir / persentase tertinggi ke terendah
    computedRows.sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      if (b.totalHadir !== a.totalHadir) return b.totalHadir - a.totalHadir;
      return (a.name || "").localeCompare(b.name || "");
    });

    const rowsWithRank: RekapMusyrifRow[] = computedRows.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    const totalPct = rowsWithRank.reduce((acc, cur) => acc + cur.pct, 0);
    const avgPct = rowsWithRank.length > 0 ? Math.round(totalPct / rowsWithRank.length) : 0;
    
    const mumtazCount = rowsWithRank.filter(r => r.statusLabel === "Mumtaz").length;
    const jayyidJiddanCount = rowsWithRank.filter(r => r.statusLabel === "Jayyid Jiddan").length;
    const jayyidCount = rowsWithRank.filter(r => r.statusLabel === "Jayyid").length;
    const maqbulCount = rowsWithRank.filter(r => r.statusLabel === "Maqbul").length;
    const naqishCount = rowsWithRank.filter(r => r.statusLabel === "Naqish").length;

    const highCount = mumtazCount + jayyidJiddanCount;
    const midCount = jayyidCount + maqbulCount;
    const lowCount = naqishCount;

    return {
      campusName,
      campusTag,
      musyrifCount: rowsWithRank.length,
      avgPct,
      mumtazCount,
      jayyidJiddanCount,
      jayyidCount,
      maqbulCount,
      naqishCount,
      highCount,
      midCount,
      lowCount,
      rows: rowsWithRank,
    };
  };

  return {
    sparman: processMusyrifList(sparmanMusyrifs, "Kampus 1 S. Parman", "sparman"),
    sedayu: processMusyrifList(sedayuMusyrifs, "Kampus Terpadu Sedayu", "sedayu"),
    activeDaysCount,
    periodLabel,
  };
}

/**
 * Generate dan buka dialog cetak PDF yang diformat presisi 1 halaman per kampus
 */
export function printRekapSolatKoordinatorPDF({
  sparman,
  sedayu,
  periodLabel,
  activeDaysCount,
  mode = "both", // "both" | "sparman" | "sedayu"
  koordinatorName = "Andi Aqillah Fadia Haswat, S.A.P.",
}: {
  sparman: CampusRekapData;
  sedayu: CampusRekapData;
  periodLabel: string;
  activeDaysCount: number;
  mode?: "both" | "sparman" | "sedayu";
  koordinatorName?: string;
}) {
  const currentDateFormatted = format(new Date(), "d MMMM yyyy", { locale: id });
  const printTimestamp = format(new Date(), "d MMM yyyy, HH:mm", { locale: id });

  const renderCampusPage = (campus: CampusRekapData, isLastPage: boolean) => {
    const tableRowsHtml = campus.rows.map((r) => {
      // Warna indikator untuk print
      let badgeStyle = "background:#dcfce7; color:#166534; border:1px solid #86efac;";
      if (r.statusColor === "yellow") {
        badgeStyle = "background:#fef9c3; color:#854d0e; border:1px solid #fde047;";
      } else if (r.statusColor === "red") {
        badgeStyle = "background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;";
      }

      return `
        <tr>
          <td class="text-center font-bold rank-cell">${r.rank}</td>
          <td class="font-semibold name-cell">${escapeHtml(r.name)}</td>
          <td class="text-center asrama-cell">${escapeHtml(r.asrama.replace("Asrama ", ""))}</td>
          <td class="text-center val-shubuh">${r.subuhHadir}</td>
          <td class="text-center val-ashar">${r.asharHadir}</td>
          <td class="text-center val-maghrib">${r.maghribHadir}</td>
          <td class="text-center font-bold val-total-hadir">${r.totalHadir}</td>
          <td class="text-center val-izin">${r.totalIzin}</td>
          <td class="text-center val-sakit">${r.totalSakit}</td>
          <td class="text-center font-semibold val-alpa">${r.totalAlpa}</td>
          <td class="text-center font-bold val-pct">${r.pct}%</td>
          <td class="text-center">
            <span class="badge" style="${badgeStyle}">
              ${r.statusLabel}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    return `
      <div class="page-container ${isLastPage ? "last-page" : ""}">
        <!-- KOP SURAT MADRASAH DENGAN LOGO MU'ALLIMIN & SYAMSA -->
        <div class="kop-header">
          <div class="kop-logo-box">
            <img src="/muallimin-logo.png" onerror="this.src='/assets/branding/Logo%20Mu\'allimin.webp'" alt="Logo Mu'allimin" class="kop-logo-img" />
          </div>
          <div class="kop-text">
            <h2 class="instansi-title">MADRASAH MU'ALLIMIN MUHAMMADIYAH YOGYAKARTA</h2>
            <h3 class="dept-title">KOORDINATOR MUSYRIF ASRAMA · BIDANG PENGASUHAN DAN KEPESANTRENAN</h3>
            <p class="kop-address">Jl. Letjen S. Parman No. 68, Patangpuluhan, Wirobrajan, Yogyakarta 55251</p>
          </div>
          <div class="kop-logo-box right-logo">
            <img src="/Syamsa.webp" onerror="this.src='/assets/Syamsa.webp'" alt="Logo Syamsa" class="kop-logo-img" />
          </div>
        </div>

        <div class="divider-line"></div>

        <!-- JUDUL LAPORAN & METADATA -->
        <div class="report-meta-box">
          <div class="meta-left">
            <h1 class="report-title">REKAPITULASI EVALUASI PRESENSI SALAT MUSYRIF</h1>
            <p class="report-subtitle">
              Wilayah: <b>${campus.campusName.toUpperCase()}</b> · Periode: <b>${periodLabel.toUpperCase()}</b>
            </p>
          </div>
          <div class="meta-right">
            <div class="stat-pill">
              <span>Personel: <b>${campus.musyrifCount} Musyrif</b></span>
              <span>Hari Aktif: <b>${activeDaysCount} Hari</b></span>
              <span>Rata-rata: <b>${campus.avgPct}%</b></span>
            </div>
          </div>
        </div>

        <!-- TABEL DATA PRESISI 1 HALAMAN -->
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th rowspan="2" class="th-rank">No</th>
                <th rowspan="2" class="th-name">Nama Musyrif</th>
                <th rowspan="2" class="th-asrama">Asrama</th>
                <th colspan="4" class="th-group-hadir">Kehadiran Salat (Hadir)</th>
                <th colspan="3" class="th-group-absen">Izin / Sakit / Alpa</th>
                <th rowspan="2" class="th-pct">% Hadir</th>
                <th rowspan="2" class="th-status">Predikat</th>
              </tr>
              <tr>
                <th class="th-sub">Shb</th>
                <th class="th-sub">Ash</th>
                <th class="th-sub">Mag</th>
                <th class="th-sub-tot">Tot</th>
                <th class="th-sub">Izn</th>
                <th class="th-sub">Skt</th>
                <th class="th-sub-alp">Alp</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- FOOTER & TANDA TANGAN -->
        <div class="footer-section">
          <div class="legend-box">
            <span class="legend-item"><span class="legend-dot green"></span> ≥85% Mumtaz (${campus.mumtazCount}) · 75-84% Jayyid Jiddan (${campus.jayyidJiddanCount})</span>
            <span class="legend-item"><span class="legend-dot yellow"></span> 60-74% Jayyid (${campus.jayyidCount}) · 50-59% Maqbul (${campus.maqbulCount})</span>
            <span class="legend-item"><span class="legend-dot red"></span> &lt;50% Naqish (${campus.naqishCount})</span>
            <span class="print-time">Dicetak: ${printTimestamp} WIB</span>
          </div>

          <div class="signature-box">
            <p class="sig-city">Yogyakarta, ${currentDateFormatted}</p>
            <p class="sig-title">Koordinator Musyrif,</p>
            <div class="sig-space"></div>
            <p class="sig-name">${koordinatorName}</p>
            <p class="sig-nip">NBM. 1.296.360</p>
          </div>
        </div>
      </div>
    `;
  };

  let pagesContent = "";
  if (mode === "both") {
    pagesContent = renderCampusPage(sparman, false) + renderCampusPage(sedayu, true);
  } else if (mode === "sparman") {
    pagesContent = renderCampusPage(sparman, true);
  } else {
    pagesContent = renderCampusPage(sedayu, true);
  }

  const printHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Rekap Presensi Salat Musyrif - ${periodLabel}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 8pt;
      line-height: 1.15;
    }

    @page {
      size: A4 portrait;
      margin: 6mm 7mm 6mm 7mm;
    }

    .page-container {
      width: 100%;
      height: 284mm; /* Tepat 1 lembar A4 (297mm - margin 12mm) */
      max-height: 284mm;
      page-break-after: always;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding: 0;
    }

    .page-container.last-page {
      page-break-after: auto;
    }

    /* KOP */
    .kop-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 4px;
    }
    .kop-logo-box {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kop-logo-img {
      max-width: 44px;
      max-height: 44px;
      object-fit: contain;
    }
    .kop-text {
      flex: 1;
      text-align: center;
    }
    .instansi-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0c4a6e;
      letter-spacing: 0.02em;
      line-height: 1.2;
    }
    .dept-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0284c7;
      margin-top: 1px;
      letter-spacing: 0.03em;
    }
    .kop-address {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 1px;
    }

    .divider-line {
      height: 2px;
      background: #0284c7;
      border-bottom: 0.5px solid #0369a1;
      margin-top: 3px;
      margin-bottom: 5px;
    }

    /* META */
    .report-meta-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.01em;
    }
    .report-subtitle {
      font-size: 7.5pt;
      color: #334155;
      margin-top: 1px;
    }
    .stat-pill {
      font-size: 6.8pt;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 2px 6px;
      border-radius: 4px;
      display: flex;
      gap: 8px;
      color: #1e293b;
    }

    /* TABLE DESIGN - Didesain khusus agar 40 baris pas 1 halaman */
    .table-wrapper {
      flex: 1;
      overflow: hidden;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7pt;
    }
    .data-table thead th {
      background: #0369a1;
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      padding: 3px 2px;
      border: 0.5px solid #0284c7;
      font-size: 6.5pt;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .th-rank { width: 22px; }
    .th-name { width: 155px; text-align: left !important; padding-left: 5px !important; }
    .th-asrama { width: 72px; text-align: center !important; }
    .th-group-hadir { background: #0284c7 !important; }
    .th-group-absen { background: #475569 !important; }
    .th-sub { width: 24px; font-size: 6pt; }
    .th-sub-tot { width: 28px; background: #0369a1; font-weight: 800; font-size: 6pt; }
    .th-sub-alp { width: 24px; background: #991b1b; color: white; }
    .th-pct { width: 44px; background: #0f766e !important; }
    .th-status { width: 68px; }

    .data-table tbody tr {
      height: 5.6mm; /* 40 baris x 5.6mm = 224mm (sempurna untuk sisa ruang A4) */
    }
    .data-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .data-table tbody td {
      padding: 1.5px 3px;
      border: 0.5px solid #e2e8f0;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 6.8pt;
    }
    .rank-cell { color: #0284c7; }
    .name-cell { font-weight: 600; color: #0f172a; }
    .asrama-cell { text-align: center !important; font-size: 6.2pt; color: #475569; }
    .val-shubuh { color: #166534; font-weight: 500; }
    .val-ashar { color: #15803d; font-weight: 500; }
    .val-maghrib { color: #16a34a; font-weight: 500; }
    .val-total-hadir { color: #0c4a6e; background: #f0f9ff; font-weight: 700; }
    .val-izin { color: #2563eb; }
    .val-sakit { color: #d97706; }
    .val-alpa { color: #dc2626; font-weight: 700; }
    .val-pct { font-weight: 800; color: #0f766e; }

    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }

    .badge {
      display: inline-block;
      padding: 0.8px 4px;
      border-radius: 3px;
      font-size: 5.8pt;
      font-weight: 700;
      line-height: 1.1;
      text-transform: uppercase;
    }

    /* FOOTER & TTD */
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 4px;
      border-top: 1px solid #cbd5e1;
      margin-top: 2px;
    }
    .legend-box {
      font-size: 6.2pt;
      color: #64748b;
      display: flex;
      flex-direction: column;
      gap: 1.5px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .legend-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .legend-dot.green { background: #16a34a; }
    .legend-dot.yellow { background: #ca8a04; }
    .legend-dot.red { background: #dc2626; }
    .print-time { font-size: 5.8pt; color: #94a3b8; margin-top: 2px; }

    .signature-box {
      text-align: center;
      width: 170px;
    }
    .sig-city { font-size: 6.5pt; color: #334155; }
    .sig-title { font-size: 6.8pt; font-weight: 700; color: #0f172a; margin-top: 1px; }
    .sig-space { height: 13mm; }
    .sig-name { font-size: 7.2pt; font-weight: 800; color: #0f172a; text-decoration: underline; }
    .sig-nip { font-size: 6pt; color: #64748b; }
  </style>
</head>
<body>
  ${pagesContent}
  <script>
    window.addEventListener("load", function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup diblokir oleh browser. Harap izinkan popup untuk mencetak laporan PDF.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
