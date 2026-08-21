import glob, json, zipfile, re
import xml.etree.ElementTree as ET

dk_fpath = './DATA SANTRI/daftar_kelas_2026_2027.xlsx'
daftar_kelas_order = []

def map_dk_kelas_to_standard(raw_k):
    k = raw_k.strip()
    
    # Kelas 1
    if k in ['1 A', 'I A']: return '1 A'
    if k in ['1 B', 'I B']: return '1 B'
    if k in ['1 C', 'I C']: return '1 C'
    if k in ['1 D', 'I D']: return '1 D'
    if k in ['1 E', 'I E']: return '1 E'
    if k in ['1 F', 'I F']: return '1 F'
    if k in ['1 G', 'I G']: return '1 G'
    if k in ['1 LSA', 'I LSA', '1 Lower A', 'I Lower A']: return '1 Lower A'
    if k in ['1 LSB', 'I LSB', '1 Lower B', 'I Lower B']: return '1 Lower B'
    if k in ['1 LSC', 'I LSC', '1 Lower C', 'I Lower C']: return '1 Lower C'
    
    # Kelas 2
    if k in ['2 A', 'II A']: return '2 A'
    if k in ['2 B', 'II B']: return '2 B'
    if k in ['2 C', 'II C']: return '2 C'
    if k in ['2 D', 'II D']: return '2 D'
    if k in ['2 E', 'II E']: return '2 E'
    if k in ['2 F', 'II F']: return '2 F'
    if k in ['2 G', 'II G']: return '2 G'
    if k in ['2 H', 'II H']: return '2 H'
    if k in ['2 LSA', 'II LSA', '2 Lower A', 'II Lower A']: return '2 Lower A'
    if k in ['2 LSB', 'II LSB', '2 Lower B', 'II Lower B']: return '2 Lower B'
    if k in ['2 LSC', 'II LSC', '2 Lower C', 'II Lower C']: return '2 Lower C'

    # Kelas 3
    if k in ['3 A', 'III A']: return '3 A'
    if k in ['3 B', 'III B']: return '3 B'
    if k in ['3 C', 'III C']: return '3 C'
    if k in ['3 D', 'III D']: return '3 D'
    if k in ['3 E', 'III E']: return '3 E'
    if k in ['3 F', 'III F']: return '3 F'
    if k in ['3 G', 'III G']: return '3 G'
    if k in ['3 H', 'III H']: return '3 H'
    if k in ['3 USA', 'III USA', '3 Upper A', 'III Upper A']: return '3 Upper A'
    if k in ['3 USB', 'III USB', '3 Upper B', 'III Upper B']: return '3 Upper B'

    # Kelas 4
    if k in ['4 A', 'IV A']: return '4 A'
    if k in ['4 B', 'IV B']: return '4 B'
    if k in ['4 C', 'IV C']: return '4 C'
    if k in ['4 D', 'IV D']: return '4 D'
    if k in ['4 E', 'IV E']: return '4 E'
    if k in ['4 F', 'IV F']: return '4 F'
    if k in ['4 USA', 'IV USA', '4 Upper A', 'IV Upper A']: return '4 Upper A'
    if k in ['4 USB', 'IV USB', '4 Upper B', 'IV Upper B']: return '4 Upper B'

    # Kelas 5
    if k in ['5 A', 'V A']: return '5 A'
    if k.startswith('V B') or k.startswith('5 B'): return '5 B'
    if k.startswith('V C') or k.startswith('5 C'): return '5 C'
    if k.startswith('V D') or k.startswith('5 D'): return '5 D'
    if k.startswith('V E') or k.startswith('5 E'): return '5 E'
    if k.startswith('V F') or k.startswith('5 F'): return '5 F'
    if 'SCIENCE A' in k.upper() or 'SCIA' in k.upper() or '5 UPPER A' in k.upper(): return '5 Upper A'
    if 'SCIENCE B' in k.upper() or 'SCIB' in k.upper() or '5 UPPER B' in k.upper(): return '5 Upper B'
    if 'SOCIAL' in k.upper() or 'SOC' in k.upper() or '5 UPPER C' in k.upper(): return '5 Upper C'

    # Kelas 6
    if 'ADV' in k.upper(): return '6 Internasional'
    if k.startswith('VI A') or k.startswith('6 A'): return '6 A'
    if k.startswith('VI B') or k.startswith('6 B'): return '6 B'
    if k.startswith('VI C') or k.startswith('6 C'): return '6 C'
    if k.startswith('VI D') or k.startswith('6 D'): return '6 D'
    if k.startswith('VI E') or k.startswith('6 E'): return '6 E'
    if k.startswith('VI F') or k.startswith('6 F'): return '6 F'
    if k.startswith('VI G') or k.startswith('6 G'): return '6 G'

    return k

with zipfile.ZipFile(dk_fpath, 'r') as z:
    sst = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree_sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in tree_sst.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            text = ''.join([t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text])
            sst.append(text)

    tree_sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = tree_sheet.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
    
    class_counter = {}
    for r in rows[1:]:
        cells = r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
        vals = []
        for c in cells:
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else (c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') is not None else '')
            if c.attrib.get('t') == 's' and val:
                val = sst[int(val)] if int(val) < len(sst) else val
            vals.append(str(val))
        
        if len(vals) >= 4 and vals[1]:
            no_global = vals[0].replace('.0', '').strip()
            nis = vals[1].strip()
            nama = vals[2].strip()
            raw_kelas = vals[3].strip()
            col4 = vals[4].strip() if len(vals) > 4 else ''
            
            std_kelas = map_dk_kelas_to_standard(raw_kelas)
            class_counter[std_kelas] = class_counter.get(std_kelas, 0) + 1
            no_absen_kelas = class_counter[std_kelas]
            
            info = {
                'nis': nis,
                'nama': nama,
                'raw_kelas': raw_kelas,
                'kelasLengkap': std_kelas,
                'no_presensi_kelas': no_absen_kelas,
                'no_global': no_global
            }
            daftar_kelas_order.append(info)

print(f"Total santri loaded from daftar_kelas: {len(daftar_kelas_order)}")
print(f"Unique classes: {len(class_counter)}")
for k in sorted(class_counter.keys()):
    print(f"  {k}: {class_counter[k]} santri")

# Read detailed bio from 6 Gabungan files
files_mapping = [
    (1, './DATA SANTRI/25 06  2026_DATA SISWA KELAS 1 GABUNGAN 26-27ds.xlsx', 'VII MTs', 'MTs'),
    (2, './DATA SANTRI/16072026_Terbaru DATA SISWA KELAS 2 GABUNGAN 26-27.xlsx', 'VIII MTs', 'MTs'),
    (3, './DATA SANTRI/18072026_Terbaru DATA SISWA KELAS 3 GABUNGAN 26-27ds.xlsx', 'IX MTs', 'MTs'),
    (4, './DATA SANTRI/03 08 2026_DATA SISWA KELAS 4 GABUNGAN 26-27ds.xlsx', 'X MA', 'MA'),
    (5, './DATA SANTRI/20 07 2026_DATA SISWA KELAS 5 GABUNGAN 26-27ds.xlsx', 'XI MA', 'MA'),
    (6, './DATA SANTRI/30 06 2026_DATA SISWA KELAS 6 GABUNGAN 26-27ds.xlsx', 'XII MA', 'MA')
]

bio_by_nis = {}
for tingkat_num, fpath, romawi, jenjang in files_mapping:
    with zipfile.ZipFile(fpath, 'r') as z:
        tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
        
        header_cells = rows[0].findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
        col_map = {}
        for c_i, c in enumerate(header_cells):
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else (c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') is not None else '')
            if val: col_map[val.strip()] = c_i

        for r in rows[1:]:
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

            if not nis_val: continue
            
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
            
            bio_by_nis[nis_val] = {
                'tingkat': f'Kelas {tingkat_num}',
                'tingkatRomawi': romawi,
                'jenjang': jenjang,
                'asalMts': get_val_by_name('3 MTs', 1) if tingkat_num in [4,5] else (get_val_by_name('ASAL', 1) if tingkat_num == 6 else ''),
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
                'nbmWaliKelas': get_val_by_name('NBM WK', 59 + base_offset + row_shift)
            }

final_santri = []
global_id = 1

for dk in daftar_kelas_order:
    nis = dk['nis']
    bio = bio_by_nis.get(nis, {})
    
    tingkat_num = int(dk['kelasLengkap'][0])
    jenjang = "MTs" if tingkat_num <= 3 else "MA"
    romawi = ["VII MTs", "VIII MTs", "IX MTs", "X MA", "XI MA", "XII MA"][tingkat_num - 1]
    paralel = dk['kelasLengkap'][2:].strip()
    
    final_santri.append({
        'id': f's{global_id}',
        'no': global_id,
        'noPresensi': dk['no_presensi_kelas'],
        'tingkat': f'Kelas {tingkat_num}',
        'tingkatRomawi': romawi,
        'jenjang': jenjang,
        'paralel': paralel,
        'kelasLengkap': dk['kelasLengkap'],
        'asalMts': bio.get('asalMts', ''),
        'nis': nis,
        'nisn': bio.get('nisn', '-'),
        'nama': dk['nama'] or bio.get('nama', ''),
        'jk': bio.get('jk', 'Laki-laki'),
        'tempatLahir': bio.get('tempatLahir', ''),
        'tanggalLahir': bio.get('tanggalLahir', ''),
        'nik': bio.get('nik', ''),
        'agama': bio.get('agama', 'Islam'),
        'alamat': bio.get('alamat', ''),
        'kodepos': bio.get('kodepos', ''),
        'desa': bio.get('desa', ''),
        'kecamatan': bio.get('kecamatan', ''),
        'kabupaten': bio.get('kabupaten', ''),
        'provinsi': bio.get('provinsi', ''),
        'asalSekolah': bio.get('asalSekolah', ''),
        'prestasi': bio.get('prestasi', ''),
        'namaAyah': bio.get('namaAyah', ''),
        'agamaAyah': bio.get('agamaAyah', 'Islam'),
        'pendidikanAyah': bio.get('pendidikanAyah', ''),
        'pekerjaanAyah': bio.get('pekerjaanAyah', ''),
        'penghasilanAyah': bio.get('penghasilanAyah', ''),
        'telpAyah': bio.get('telpAyah', ''),
        'emailAyah': bio.get('emailAyah', ''),
        'namaIbu': bio.get('namaIbu', ''),
        'agamaIbu': bio.get('agamaIbu', 'Islam'),
        'pendidikanIbu': bio.get('pendidikanIbu', ''),
        'pekerjaanIbu': bio.get('pekerjaanIbu', ''),
        'penghasilanIbu': bio.get('penghasilanIbu', ''),
        'telpIbu': bio.get('telpIbu', ''),
        'emailIbu': bio.get('emailIbu', ''),
        'namaWali': bio.get('namaWali', ''),
        'pekerjaanWali': bio.get('pekerjaanWali', ''),
        'telpWali': bio.get('telpWali', ''),
        'waliKelas': bio.get('waliKelas', ''),
        'nbmWaliKelas': bio.get('nbmWaliKelas', ''),
        'statusSantri': 'aktif'
    })
    global_id += 1

print(f"Final assembled santri count: {len(final_santri)}")

# Generate TS code
ts_header = '''/**
 * DATA SANTRI RESMI MADRASAH MU'ALLIMIIN MUHAMMADIYAH YOGYAKARTA
 * Tahun Pelajaran 2026/2027 (Kelas 1 - Kelas 6)
 * Total: ''' + str(len(final_santri)) + ''' Santri
 * Sumber Rombel & No Urut Presensi: daftar_kelas_2026_2027.xlsx
 */

export interface SantriData {
  id: string;
  no: number;
  noPresensi?: number;
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
    kelas: ["4 A", "4 B", "4 C", "4 D", "4 E", "4 F", "4 Upper A", "4 Upper B"]
  },
  {
    tingkat: "Kelas 5",
    label: "Kelas 5 (XI MA)",
    kelas: ["5 A", "5 B", "5 C", "5 D", "5 E", "5 F", "5 Upper A", "5 Upper B", "5 Upper C"]
  },
  {
    tingkat: "Kelas 6",
    label: "Kelas 6 (XII MA)",
    kelas: ["6 A", "6 B", "6 C", "6 D", "6 E", "6 F", "6 G", "6 Internasional"]
  }
];

export const LIST_ALL_KELAS_FLAT: string[] = [
  "1 A", "1 B", "1 C", "1 D", "1 E", "1 F", "1 G", "1 Lower A", "1 Lower B", "1 Lower C",
  "2 A", "2 B", "2 C", "2 D", "2 E", "2 F", "2 G", "2 H", "2 Lower A", "2 Lower B", "2 Lower C",
  "3 A", "3 B", "3 C", "3 D", "3 E", "3 F", "3 G", "3 H", "3 Upper A", "3 Upper B",
  "4 A", "4 B", "4 C", "4 D", "4 E", "4 F", "4 Upper A", "4 Upper B",
  "5 A", "5 B", "5 C", "5 D", "5 E", "5 F", "5 Upper A", "5 Upper B", "5 Upper C",
  "6 A", "6 B", "6 C", "6 D", "6 E", "6 F", "6 G", "6 Internasional"
];

export const ALL_SANTRI_DATA: SantriData[] = ''' + json.dumps(final_santri, indent=2, ensure_ascii=False) + ''';

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

print("Successfully updated santriData.ts!")
