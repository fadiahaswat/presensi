import pandas as pd
import numpy as np
from datetime import datetime
import json

files = [
    ('DATA SANTRI/25 06  2026_DATA SISWA KELAS 1 GABUNGAN 26-27ds.xlsx', 'Kelas 1', 'VII MTs', 'MTs', '1'),
    ('DATA SANTRI/16072026_Terbaru DATA SISWA KELAS 2 GABUNGAN 26-27.xlsx', 'Kelas 2', 'VIII MTs', 'MTs', '2'),
    ('DATA SANTRI/18072026_Terbaru DATA SISWA KELAS 3 GABUNGAN 26-27ds.xlsx', 'Kelas 3', 'IX MTs', 'MTs', '3'),
    ('DATA SANTRI/03 08 2026_DATA SISWA KELAS 4 GABUNGAN 26-27ds.xlsx', 'Kelas 4', 'X MA', 'MA', '4'),
    ('DATA SANTRI/20 07 2026_DATA SISWA KELAS 5 GABUNGAN 26-27ds.xlsx', 'Kelas 5', 'XI MA', 'MA', '5'),
    ('DATA SANTRI/30 06 2026_DATA SISWA KELAS 6 GABUNGAN 26-27ds.xlsx', 'Kelas 6', 'XII MA', 'MA', '6'),
]

def clean_telp(val):
    """Clean telephone number"""
    if val is None or pd.isna(val):
        return ''
    val_str = str(val)
    if val_str.lower() == 'nan':
        return ''
    val_str = val_str.replace(' ', '').replace('.0', '').replace('.', '')
    digits = ''.join(c for c in val_str if c.isdigit())
    return digits

def clean_str(val):
    """Clean string for JSON/TypeScript output"""
    if val is None or pd.isna(val):
        return ''
    val_str = str(val)
    # Remove problematic characters
    val_str = val_str.replace('\\', '/')  # Replace backslash with forward slash
    val_str = val_str.replace('"', "'")  # Replace double quote with single quote
    val_str = val_str.replace('\n', ' ').replace('\r', ' ')  # Remove newlines
    val_str = val_str.strip()
    return val_str

all_students = []
no = 1

for fpath, tingkat, tingkatRomawi, jenjang, tingkatNum in files:
    df = pd.read_excel(fpath)
    n_cols = len(df.columns)

    for i, row in df.iterrows():
        row_data = row.tolist()

        if n_cols == 62:
            paralel = str(row_data[1]) if pd.notna(row_data[1]) else 'A'
            nis = str(int(row_data[2])) if pd.notna(row_data[2]) else ''
            nisn = str(int(row_data[3])) if pd.notna(row_data[3]) else ''
            nama = clean_str(row_data[4])
            jk = clean_str(row_data[11])
            tempatLahir = clean_str(row_data[12])
            tgl_lahir_raw = row_data[14]
            alamat = clean_str(row_data[18])
            kodepos = str(int(row_data[19])) if pd.notna(row_data[19]) else ''
            desa = clean_str(row_data[20])
            kecamatan = clean_str(row_data[21])
            kabupaten = clean_str(row_data[22])
            provinsi = clean_str(row_data[23])
            namaAyah = clean_str(row_data[27])
            agamaAyah = clean_str(row_data[28])
            pendidikanAyah = clean_str(row_data[29])
            pekerjaanAyah = clean_str(row_data[30])
            penghasilanAyah = clean_str(row_data[31])
            telpAyah = clean_telp(row_data[32])
            namaIbu = clean_str(row_data[34])
            agamaIbu = clean_str(row_data[35])
            pendidikanIbu = clean_str(row_data[36])
            pekerjaanIbu = clean_str(row_data[37])
            penghasilanIbu = clean_str(row_data[38])
            telpIbu = clean_telp(row_data[39])
            asalSekolah = clean_str(row_data[24])
            kelasParalel = f"{tingkatNum} {paralel}"
        else:
            paralel = str(row_data[1]) if pd.notna(row_data[1]) else 'A'
            nis = str(int(row_data[3])) if pd.notna(row_data[3]) else ''
            nisn = str(int(row_data[4])) if pd.notna(row_data[4]) else ''
            nama = clean_str(row_data[5])
            jk = clean_str(row_data[12])
            tempatLahir = clean_str(row_data[13])
            tgl_lahir_raw = row_data[15]
            alamat = clean_str(row_data[19])
            kodepos = str(int(row_data[20])) if pd.notna(row_data[20]) else ''
            desa = clean_str(row_data[21])
            kecamatan = clean_str(row_data[22])
            kabupaten = clean_str(row_data[23])
            provinsi = clean_str(row_data[24])
            namaAyah = clean_str(row_data[28])
            agamaAyah = clean_str(row_data[29])
            pendidikanAyah = clean_str(row_data[30])
            pekerjaanAyah = clean_str(row_data[31])
            penghasilanAyah = clean_str(row_data[32])
            telpAyah = clean_telp(row_data[33])
            namaIbu = clean_str(row_data[35])
            agamaIbu = clean_str(row_data[36])
            pendidikanIbu = clean_str(row_data[37])
            pekerjaanIbu = clean_str(row_data[38])
            penghasilanIbu = clean_str(row_data[39])
            telpIbu = clean_telp(row_data[40])
            asalSekolah = clean_str(row_data[25])
            kelasParalel = f"{tingkatNum} {paralel}"

        # Format tanggal lahir
        if tgl_lahir_raw and not pd.isna(tgl_lahir_raw):
            if hasattr(tgl_lahir_raw, 'strftime'):
                tanggalLahir = tgl_lahir_raw.strftime('%Y-%m-%d')
            else:
                tanggalLahir = str(tgl_lahir_raw)[:10]
        else:
            tanggalLahir = ''

        student = {
            'id': f's{no}',
            'no': no,
            'tingkat': tingkat,
            'tingkatRomawi': tingkatRomawi,
            'jenjang': jenjang,
            'paralel': paralel,
            'kelasLengkap': kelasParalel,
            'asalMts': '',
            'nis': nis,
            'nisn': nisn,
            'nama': nama,
            'jk': jk,
            'tempatLahir': tempatLahir,
            'tanggalLahir': tanggalLahir,
            'nik': '',
            'agama': 'Islam',
            'alamat': alamat,
            'kodepos': kodepos,
            'desa': desa,
            'kecamatan': kecamatan,
            'kabupaten': kabupaten,
            'provinsi': provinsi,
            'asalSekolah': asalSekolah,
            'namaAyah': namaAyah,
            'agamaAyah': agamaAyah,
            'pendidikanAyah': pendidikanAyah,
            'pekerjaanAyah': pekerjaanAyah,
            'penghasilanAyah': penghasilanAyah,
            'telpAyah': telpAyah,
            'emailAyah': '',
            'namaIbu': namaIbu,
            'agamaIbu': agamaIbu,
            'pendidikanIbu': pendidikanIbu,
            'pekerjaanIbu': pekerjaanIbu,
            'penghasilanIbu': penghasilanIbu,
            'telpIbu': telpIbu,
            'emailIbu': '',
            'namaWali': '',
            'pekerjaanWali': '',
            'telpWali': '',
            'waliKelas': '',
            'nbmWaliKelas': '',
            'statusSantri': 'aktif',
        }
        all_students.append(student)
        no += 1

print(f"Total siswa: {len(all_students)}")

# Generate TypeScript file
output = '''/**
 * DATA SANTRI GABUNGAN MADRASAH MU'ALLIMIIN MUHAMMADIYAH YOGYAKARTA
 * Tahun Pelajaran 2026/2027 (Kelas 1 - Kelas 6)
 * Total: ''' + str(len(all_students)) + ''' Santri
 * Auto-generated from DATA SANTRI folder - ''' + datetime.now().strftime('%Y-%m-%d %H:%M') + '''
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

export const ALL_SANTRI_DATA: SantriData[] = [
'''

for s in all_students:
    output += '  {\n'
    output += f'    "id": "{s["id"]}",\n'
    output += f'    "no": {s["no"]},\n'
    output += f'    "tingkat": "{s["tingkat"]}",\n'
    output += f'    "tingkatRomawi": "{s["tingkatRomawi"]}",\n'
    output += f'    "jenjang": "{s["jenjang"]}",\n'
    output += f'    "paralel": "{s["paralel"]}",\n'
    output += f'    "kelasLengkap": "{s["kelasLengkap"]}",\n'
    output += f'    "asalMts": "{s["asalMts"]}",\n'
    output += f'    "nis": "{s["nis"]}",\n'
    output += f'    "nisn": "{s["nisn"]}",\n'
    output += f'    "nama": "{s["nama"]}",\n'
    output += f'    "jk": "{s["jk"]}",\n'
    output += f'    "tempatLahir": "{s["tempatLahir"]}",\n'
    output += f'    "tanggalLahir": "{s["tanggalLahir"]}",\n'
    output += f'    "nik": "{s["nik"]}",\n'
    output += f'    "agama": "{s["agama"]}",\n'
    output += f'    "alamat": "{s["alamat"]}",\n'
    output += f'    "kodepos": "{s["kodepos"]}",\n'
    output += f'    "desa": "{s["desa"]}",\n'
    output += f'    "kecamatan": "{s["kecamatan"]}",\n'
    output += f'    "kabupaten": "{s["kabupaten"]}",\n'
    output += f'    "provinsi": "{s["provinsi"]}",\n'
    output += f'    "asalSekolah": "{s["asalSekolah"]}",\n'
    output += f'    "namaAyah": "{s["namaAyah"]}",\n'
    output += f'    "agamaAyah": "{s["agamaAyah"]}",\n'
    output += f'    "pendidikanAyah": "{s["pendidikanAyah"]}",\n'
    output += f'    "pekerjaanAyah": "{s["pekerjaanAyah"]}",\n'
    output += f'    "penghasilanAyah": "{s["penghasilanAyah"]}",\n'
    output += f'    "telpAyah": "{s["telpAyah"]}",\n'
    output += f'    "emailAyah": "{s["emailAyah"]}",\n'
    output += f'    "namaIbu": "{s["namaIbu"]}",\n'
    output += f'    "agamaIbu": "{s["agamaIbu"]}",\n'
    output += f'    "pendidikanIbu": "{s["pendidikanIbu"]}",\n'
    output += f'    "pekerjaanIbu": "{s["pekerjaanIbu"]}",\n'
    output += f'    "penghasilanIbu": "{s["penghasilanIbu"]}",\n'
    output += f'    "telpIbu": "{s["telpIbu"]}",\n'
    output += f'    "emailIbu": "{s["emailIbu"]}",\n'
    output += f'    "namaWali": "{s["namaWali"]}",\n'
    output += f'    "pekerjaanWali": "{s["pekerjaanWali"]}",\n'
    output += f'    "telpWali": "{s["telpWali"]}",\n'
    output += f'    "waliKelas": "{s["waliKelas"]}",\n'
    output += f'    "nbmWaliKelas": "{s["nbmWaliKelas"]}",\n'
    output += f'    "statusSantri": "{s["statusSantri"]}"\n'
    output += '  },\n'

output += '];\n'

# Write to file
with open('src/app/data/santriData.ts', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"\nFile generated: src/app/data/santriData.ts")
print(f"Total students: {len(all_students)}")

# Count by class
from collections import Counter
class_counts = Counter(s['tingkat'] for s in all_students)
print("\nPer kelas:")
for c in ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6']:
    print(f"  {c}: {class_counts.get(c, 0)}")

# Verify no backslashes
print("\nVerifikasi tidak ada backslash:")
backslash_found = False
for s in all_students:
    for key, val in s.items():
        if isinstance(val, str) and '\\' in val:
            print(f"  FOUND: {s['nama']} - {key}: {repr(val)}")
            backslash_found = True
if not backslash_found:
    print("  [OK] Tidak ada backslash!")
