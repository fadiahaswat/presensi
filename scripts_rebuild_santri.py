import glob, json, zipfile, re
import xml.etree.ElementTree as ET

files_mapping = [
    (1, './DATA SANTRI/25 06  2026_DATA SISWA KELAS 1 GABUNGAN 26-27ds.xlsx', 'VII MTs', 'MTs'),
    (2, './DATA SANTRI/16072026_Terbaru DATA SISWA KELAS 2 GABUNGAN 26-27.xlsx', 'VIII MTs', 'MTs'),
    (3, './DATA SANTRI/18072026_Terbaru DATA SISWA KELAS 3 GABUNGAN 26-27ds.xlsx', 'IX MTs', 'MTs'),
    (4, './DATA SANTRI/03 08 2026_DATA SISWA KELAS 4 GABUNGAN 26-27ds.xlsx', 'X MA', 'MA'),
    (5, './DATA SANTRI/20 07 2026_DATA SISWA KELAS 5 GABUNGAN 26-27ds.xlsx', 'XI MA', 'MA'),
    (6, './DATA SANTRI/30 06 2026_DATA SISWA KELAS 6 GABUNGAN 26-27ds.xlsx', 'XII MA', 'MA')
]

def format_kelas(tingkat_num, paralel):
    p = str(paralel).strip()
    if p.startswith('LS '):
        return f"{tingkat_num} Lower {p.replace('LS ', '').strip()}"
    if p.startswith('US '):
        return f"{tingkat_num} Upper {p.replace('US ', '').strip()}"
    
    # Kelas 5 International Class Program (ICP): SciA -> 5 Upper A, SciB -> 5 Upper B, Soc -> 5 Upper C
    if tingkat_num == 5:
        if p.upper() in ['SCIA', 'SCI A']:
            return '5 Upper A'
        if p.upper() in ['SCIB', 'SCI B']:
            return '5 Upper B'
        if p.upper() in ['SOC', 'SOC A', 'SOCA']:
            return '5 Upper C'
            
    # Kelas 6 International Class Program (ICP): INT / UPPER -> 6 Internasional
    if tingkat_num == 6:
        if p.upper() in ['INT', 'INTERNASIONAL', 'UPPER']:
            return '6 Internasional'
            
    return f"{tingkat_num} {p}"

all_santri = []
global_id = 1

for tingkat_num, fpath, romawi, jenjang in files_mapping:
    with zipfile.ZipFile(fpath, 'r') as z:
        tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
        
        # Read header row to build exact column name to index map
        header_cells = rows[0].findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
        col_map = {}
        for c_i, c in enumerate(header_cells):
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else (c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') is not None else '')
            if val:
                col_map[val.strip()] = c_i

        for r_idx, r in enumerate(rows[1:]):
            cells = r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
            
            def get_val_by_idx(idx):
                if idx is not None and idx < len(cells):
                    v = cells[idx].find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    if v is not None and v.text: return v.text.strip()
                    t = cells[idx].find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                    if t is not None and t.text: return t.text.strip()
                return ''
            
            def get_val_by_name(col_name, fallback_idx=None):
                idx = col_map.get(col_name, fallback_idx)
                return get_val_by_idx(idx)
            
            base_offset = 1 if tingkat_num >= 4 else 0
            
            paralel_val = get_val_by_name('PARALEL', 1 + base_offset)
            nis_val = get_val_by_name('NIS', 2 + base_offset)
            nisn_val = get_val_by_name('NISN', 3 + base_offset)
            nama_val = get_val_by_name('NAMA SISWA', 4 + base_offset)
            row_shift = 0
            
            if tingkat_num == 6 and not paralel_val and nis_val in ['A','B','C','D','E','F','G','H','I','J','INT','Upper']:
                paralel_val = nis_val
                nis_val = nisn_val
                nisn_val = nama_val
                nama_val = get_val_by_idx(5 + base_offset)
                row_shift = 1

            if not nama_val and not nis_val:
                continue

            kelas_lengkap = format_kelas(tingkat_num, paralel_val)
            
            # Clean kabupaten and provinsi
            kab = get_val_by_name('Kabupaten/kota', 22 + base_offset + row_shift)
            prov = get_val_by_name('Provinsi', 23 + base_offset + row_shift)
            if kab == 'Palangkaraya': kab = 'Kota Palangka Raya'
            if kab == 'Pangkal Pinang': kab = 'Kota Pangkalpinang'
            if kab == 'Kotawaringain Timur': kab = 'Kotawaringin Timur'
            if kab == 'Tulawng Bawang': kab = 'Tulang Bawang'
            if kab == 'Progo': kab = 'Kulon Progo'
            if kab == 'Muntilan': kab = 'Magelang'
            if kab == 'Sangatta': kab = 'Kutai Timur'
            if kab == 'Mandar': kab = 'Polewali Mandar'
            if kab == 'Tengah': kab = 'Kalimantan Tengah'
            if kab == 'Tangerang,': kab = 'Tangerang'
            if kab == 'Yapen': kab = 'Kepulauan Yapen'
            
            all_santri.append({
                'id': f's{global_id}',
                'no': global_id,
                'tingkat': f'Kelas {tingkat_num}',
                'tingkatRomawi': romawi,
                'jenjang': jenjang,
                'paralel': paralel_val,
                'kelasLengkap': kelas_lengkap,
                'asalMts': get_val_by_name('3 MTs', 1) if tingkat_num in [4,5] else (get_val_by_name('ASAL', 1) if tingkat_num == 6 else ''),
                'nis': nis_val,
                'nisn': nisn_val,
                'nama': nama_val,
                'jk': get_val_by_name('Jenis Kelamin', 11 + base_offset + row_shift) or 'Laki-laki',
                'tempatLahir': get_val_by_name('TEMPAT LAHIR', 12 + base_offset + row_shift),
                'tanggalLahir': get_val_by_name('TANGGAL LAHIR2', 15 + base_offset + row_shift) or get_val_by_name('TANGGAL LAHIR', 13 + base_offset + row_shift),
                'nik': get_val_by_name('NIK ANAK', 16 + base_offset + row_shift),
                'agama': get_val_by_name('Agama', 17 + base_offset + row_shift) or 'Islam',
                'alamat': get_val_by_name('ALAMAT', 18 + base_offset + row_shift),
                'kodepos': get_val_by_name('KODE POS', 19 + base_offset + row_shift),
                'desa': get_val_by_name('DESA/KELURAHAN', 20 + base_offset + row_shift),
                'kecamatan': get_val_by_name('KECAMATAN', 21 + base_offset + row_shift),
                'kabupaten': kab,
                'provinsi': prov,
                'asalSekolah': get_val_by_name('Asal Sekolah', 24 + base_offset + row_shift),
                'prestasi': get_val_by_name('Prestasi', 26 + base_offset + row_shift),
                'namaAyah': get_val_by_name('Nama Ayah', 27 + base_offset + row_shift),
                'agamaAyah': get_val_by_name('Agama Ayah', 28 + base_offset + row_shift) or 'Islam',
                'pendidikanAyah': get_val_by_name('Pendidikan', 29 + base_offset + row_shift),
                'pekerjaanAyah': get_val_by_name('Pekerjaan', 30 + base_offset + row_shift),
                'penghasilanAyah': get_val_by_name('Penghasilan', 31 + base_offset + row_shift),
                'telpAyah': get_val_by_name('Telp', 32 + base_offset + row_shift),
                'emailAyah': get_val_by_name('Email', 33 + base_offset + row_shift),
                'namaIbu': get_val_by_name('Nama Ibu', 34 + base_offset + row_shift),
                'agamaIbu': get_val_by_name('Agama Ibu', 35 + base_offset + row_shift) or 'Islam',
                'pendidikanIbu': get_val_by_name('Pendidikan.1', 36 + base_offset + row_shift),
                'pekerjaanIbu': get_val_by_name('Pekerjaan.1', 37 + base_offset + row_shift),
                'penghasilanIbu': get_val_by_name('Penghasilan.1', 38 + base_offset + row_shift),
                'telpIbu': get_val_by_name('Telp.1', 39 + base_offset + row_shift),
                'emailIbu': get_val_by_name('Email.1', 40 + base_offset + row_shift),
                'namaWali': get_val_by_name('Nama Wali', 50 + base_offset + row_shift),
                'pekerjaanWali': get_val_by_name('Pekerjaan.2', 53 + base_offset + row_shift),
                'telpWali': get_val_by_name('Telp.2', 56 + base_offset + row_shift),
                'waliKelas': get_val_by_name('Nama WK', 58 + base_offset + row_shift),
                'nbmWaliKelas': get_val_by_name('NBM WK', 59 + base_offset + row_shift),
                'statusSantri': 'aktif'
            })
            global_id += 1

print(f"Total parsed santri: {len(all_santri)}")

# Verification check for 5 Upper & 6 Internasional
sample_5u = [s for s in all_santri if 'Upper' in s['kelasLengkap'] and '5' in s['tingkat']]
print(f"Total 5 Upper santri: {len(sample_5u)}")
classes_5u = {}
for s in sample_5u:
    classes_5u[s['kelasLengkap']] = classes_5u.get(s['kelasLengkap'], 0) + 1
print("5 Upper breakdown:", classes_5u)

sample_6int = [s for s in all_santri if s['kelasLengkap'] == '6 Internasional']
print(f"Total 6 Internasional santri: {len(sample_6int)}")
for s in sample_6int[:3]:
    print(f"  Nama: {s['nama']}, NIS: {s['nis']}, Kelas: {s['kelasLengkap']}")

# Generate TS code
ts_header = '''/**
 * DATA SANTRI GABUNGAN MADRASAH MU'ALLIMIIN MUHAMMADIYAH YOGYAKARTA
 * Tahun Pelajaran 2026/2027 (Kelas 1 - Kelas 6)
 * Total: ''' + str(len(all_santri)) + ''' Santri
 * Auto-generated with exact column mapping across MTs and MA datasets
 */

export interface SantriData {
  id: string;
  no: number;
  tingkat: string;
  tingkatRomawi: string;
  jenjang: string;
  paralel: string;
  kelasLengkap: string;
  asalMts: string;
  nis: string;
  nisn: string;
  nama: string;
  jk: string;
  tempatLahir: string;
  tanggalLahir: string;
  nik: string;
  agama: string;
  alamat: string;
  kodepos: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  asalSekolah: string;
  namaAyah: string;
  agamaAyah: string;
  pendidikanAyah: string;
  pekerjaanAyah: string;
  penghasilanAyah: string;
  telpAyah: string;
  emailAyah: string;
  namaIbu: string;
  agamaIbu: string;
  pendidikanIbu: string;
  pekerjaanIbu: string;
  penghasilanIbu: string;
  telpIbu: string;
  emailIbu: string;
  namaWali: string;
  pekerjaanWali: string;
  telpWali: string;
  waliKelas: string;
  nbmWaliKelas: string;
  statusSantri?: "aktif" | "keluar" | "pindah" | "lulus";
  catatanStatus?: string;
}

export const LIST_ALL_KELAS_GROUPED: { tingkat: string; label: string; kelas: string[] }[] = [
  {
    tingkat: "Kelas 1",
    label: "Kelas 1 (VII MTs)",
    kelas: ["1 A", "1 B", "1 C", "1 D", "1 E", "1 F", "1 G", "1 Lower A", "1 Lower B", "1 Lower C"]
  },
  {
    tingkat: "Kelas 2",
    label: "Kelas 2 (VIII MTs)",
    kelas: ["2 A", "2 B", "2 C", "2 D", "2 E", "2 F", "2 G", "2 H", "2 Lower A", "2 Lower B", "2 Lower C"]
  },
  {
    tingkat: "Kelas 3",
    label: "Kelas 3 (IX MTs)",
    kelas: ["3 A", "3 B", "3 C", "3 D", "3 E", "3 F", "3 G", "3 H", "3 Upper A", "3 Upper B"]
  },
  {
    tingkat: "Kelas 4",
    label: "Kelas 4 (X MA)",
    kelas: ["4 A", "4 B", "4 C", "4 D", "4 E", "4 F", "4 G", "4 H", "4 Upper A", "4 Upper B", "4 Upper C"]
  },
  {
    tingkat: "Kelas 5",
    label: "Kelas 5 (XI MA)",
    kelas: ["5 A", "5 B", "5 C", "5 D", "5 E", "5 F", "5 Upper A", "5 Upper B", "5 Upper C"]
  },
  {
    tingkat: "Kelas 6",
    label: "Kelas 6 (XII MA)",
    kelas: ["6 A", "6 B", "6 C", "6 D", "6 E", "6 F", "6 G", "6 H", "6 Internasional"]
  }
];

export const LIST_ALL_KELAS_FLAT: string[] = [
  "1 A", "1 B", "1 C", "1 D", "1 E", "1 F", "1 G", "1 Lower A", "1 Lower B", "1 Lower C",
  "2 A", "2 B", "2 C", "2 D", "2 E", "2 F", "2 G", "2 H", "2 Lower A", "2 Lower B", "2 Lower C",
  "3 A", "3 B", "3 C", "3 D", "3 E", "3 F", "3 G", "3 H", "3 Upper A", "3 Upper B",
  "4 A", "4 B", "4 C", "4 D", "4 E", "4 F", "4 G", "4 H", "4 Upper A", "4 Upper B", "4 Upper C",
  "5 A", "5 B", "5 C", "5 D", "5 E", "5 F", "5 Upper A", "5 Upper B", "5 Upper C",
  "6 A", "6 B", "6 C", "6 D", "6 E", "6 F", "6 G", "6 H", "6 Internasional"
];

export const ALL_SANTRI_DATA: SantriData[] = ''' + json.dumps(all_santri, indent=2, ensure_ascii=False) + ''';

export function searchSantri(query: string, limit: number = 10): SantriData[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();
  const results: SantriData[] = [];
  for (let i = 0; i < ALL_SANTRI_DATA.length; i++) {
    const s = ALL_SANTRI_DATA[i];
    if (
      s.nama.toLowerCase().includes(q) ||
      s.nisn.includes(q) ||
      s.nis.includes(q) ||
      s.kelasLengkap.toLowerCase().includes(q)
    ) {
      results.push(s);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function getSantriForMusyrif(asrama?: string, kamar?: string, kelas?: string): SantriData[] {
  return ALL_SANTRI_DATA.filter(s => {
    if (kelas && s.kelasLengkap.toLowerCase() === kelas.toLowerCase()) return true;
    if (asrama && (s as any).asrama === asrama) {
      if (kamar) return (s as any).kamar === kamar;
      return true;
    }
    return false;
  });
}

export function normalizeClassName(className: string): string {
  return className.trim().replace(/\\s+/g, " ");
}

export interface SiblingItem {
  santri: SantriData;
  relationLabel: string;
}

export function getClassMetadata(kelas: string) {
  const clean = kelas.trim();
  const parts = clean.split(/\\s+/);
  const tingkatNum = parseInt(parts[0], 10) || 1;
  const tingkat = `Kelas ${tingkatNum}`;
  const jenjang = tingkatNum <= 3 ? "MTs" : "MA";
  
  let tingkatRomawi = "";
  if (tingkatNum === 1) tingkatRomawi = "VII MTs";
  else if (tingkatNum === 2) tingkatRomawi = "VIII MTs";
  else if (tingkatNum === 3) tingkatRomawi = "IX MTs";
  else if (tingkatNum === 4) tingkatRomawi = "X MA";
  else if (tingkatNum === 5) tingkatRomawi = "XI MA";
  else if (tingkatNum === 6) tingkatRomawi = "XII MA";

  const paralel = parts.slice(1).join(" ") || "A";

  return { tingkat, tingkatRomawi, paralel, jenjang };
}

export function getSantriStats(data: SantriData[] = ALL_SANTRI_DATA) {
  const total = data.length;
  const mts = data.filter(s => parseInt(s.tingkat, 10) <= 3).length;
  const ma = data.filter(s => parseInt(s.tingkat, 10) >= 4).length;
  return { total, mts, ma };
}

export function buildSiblingMap(data: SantriData[] = ALL_SANTRI_DATA): Map<string, SiblingItem[]> {
  const map = new Map<string, SiblingItem[]>();
  const phoneToSantri = new Map<string, SantriData[]>();

  data.forEach(s => {
    const phones = [s.telpAyah, s.telpIbu, s.telpWali].filter(p => Boolean(p && p.length >= 8));
    phones.forEach(p => {
      const cleanPhone = p!.replace(/\\D/g, "");
      if (cleanPhone.length >= 8) {
        const list = phoneToSantri.get(cleanPhone) || [];
        if (!list.some(item => item.id === s.id)) {
          list.push(s);
        }
        phoneToSantri.set(cleanPhone, list);
      }
    });
  });

  phoneToSantri.forEach((santris) => {
    if (santris.length > 1) {
      santris.forEach(s => {
        const myTingkat = parseInt(s.tingkat.replace(/\\D/g, ""), 10) || 1;
        const others: SiblingItem[] = santris
          .filter(x => x.id !== s.id)
          .map(sib => {
            const sibTingkat = parseInt(sib.tingkat.replace(/\\D/g, ""), 10) || 1;
            let relationLabel = "Saudara";
            if (sibTingkat > myTingkat) relationLabel = "Kakak";
            else if (sibTingkat < myTingkat) relationLabel = "Adik";
            else relationLabel = "Saudara";
            return {
              santri: sib,
              relationLabel
            };
          });

        if (others.length > 0) {
          const existing = map.get(s.id) || [];
          const merged = [...existing];
          others.forEach(o => {
            if (!merged.some(m => m.santri.id === o.santri.id)) {
              merged.push(o);
            }
          });
          map.set(s.id, merged);
        }
      });
    }
  });

  return map;
}
'''

with open('./src/app/data/santriData.ts', 'w', encoding='utf-8') as out:
    out.write(ts_header)

print("Successfully regenerated santriData.ts with SciA/SciB/Soc -> 5 Upper A/B/C and INT -> 6 Internasional!")
