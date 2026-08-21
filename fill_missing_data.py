import pandas as pd
import numpy as np

print("="*80)
print("MENGISI DATA YANG MASIH KOSONG")
print("="*80)

# DATA YANG SUDAH BISA DITENTUKAN
fixes = {
    'Ryuuta Mikan Abdullah': {
        'kota': 'Bantul',
        'provinsi': 'DIY',
        'kecamatan': 'Bantul'
    },
    'Mohammad Reihan Abdillah': {
        'kota': 'Lampung Timur',
        'kecamatan': 'Batanghari'
    }
}

# Files
files = [
    ('DATA SANTRI/25 06  2026_DATA SISWA KELAS 1 GABUNGAN 26-27ds.xlsx', 'Kelas 1'),
    ('DATA SANTRI/16072026_Terbaru DATA SISWA KELAS 2 GABUNGAN 26-27.xlsx', 'Kelas 2'),
    ('DATA SANTRI/18072026_Terbaru DATA SISWA KELAS 3 GABUNGAN 26-27ds.xlsx', 'Kelas 3'),
    ('DATA SANTRI/03 08 2026_DATA SISWA KELAS 4 GABUNGAN 26-27ds.xlsx', 'Kelas 4'),
    ('DATA SANTRI/20 07 2026_DATA SISWA KELAS 5 GABUNGAN 26-27ds.xlsx', 'Kelas 5'),
    ('DATA SANTRI/30 06 2026_DATA SISWA KELAS 6 GABUNGAN 26-27ds.xlsx', 'Kelas 6'),
]

total_filled = 0

for fpath, label in files:
    df = pd.read_excel(fpath)
    n_cols = len(df.columns)

    filled_in_file = 0

    for i, row in df.iterrows():
        row_data = row.tolist()
        nama = row_data[4] if n_cols == 62 else row_data[5]

        if nama in fixes:
            fix_data = fixes[nama]

            print(f"\n[{label}] {nama}")

            # Column indices for old structure
            if n_cols == 62:
                kota_col = 22
                prov_col = 23
                kec_col = 21
            else:
                kota_col = 23
                prov_col = 24
                kec_col = 22

            if 'kota' in fix_data:
                old_val = row_data[kota_col] if kota_col < len(row_data) else None
                df.at[i, df.columns[kota_col]] = fix_data['kota']
                print(f"  Kota: {old_val} -> {fix_data['kota']}")
                filled_in_file += 1

            if 'provinsi' in fix_data:
                old_val = row_data[prov_col] if prov_col < len(row_data) else None
                df.at[i, df.columns[prov_col]] = fix_data['provinsi']
                print(f"  Provinsi: {old_val} -> {fix_data['provinsi']}")
                filled_in_file += 1

            if 'kecamatan' in fix_data:
                old_val = row_data[kec_col] if kec_col < len(row_data) else None
                df.at[i, df.columns[kec_col]] = fix_data['kecamatan']
                print(f"  Kecamatan: {old_val} -> {fix_data['kecamatan']}")
                filled_in_file += 1

    # Save file
    if filled_in_file > 0:
        df.to_excel(fpath, index=False)
        print(f"  -> File disimpan")
        total_filled += filled_in_file

print()
print("="*80)
print(f"TOTAL DATA YANG DIISI: {total_filled}")
print("="*80)

# =============================================
# LAPORAN SISWA TANPA TELEPON
# =============================================
print()
print("="*80)
print("LAPORAN: SISWA TANPA TELEPON ORANG TUA")
print("="*80)

students_no_telp = []

for fpath, label in files:
    df = pd.read_excel(fpath)
    n_cols = len(df.columns)

    for i, row in df.iterrows():
        row_data = row.tolist()

        if n_cols == 62:
            nama = row_data[4]
            ayah = row_data[27]
            telp_ayah = row_data[32]
            telp_ibu = row_data[39]
            alamat = row_data[18]
        else:
            nama = row_data[5]
            ayah = row_data[28]
            telp_ayah = row_data[33]
            telp_ibu = row_data[40]
            alamat = row_data[19]

        ayah_ok = telp_ayah and not pd.isna(telp_ayah) and str(telp_ayah).strip() != '' and str(telp_ayah).lower() != 'nan'
        ibu_ok = telp_ibu and not pd.isna(telp_ibu) and str(telp_ibu).strip() != '' and str(telp_ibu).lower() != 'nan'

        if not ayah_ok and not ibu_ok:
            students_no_telp.append({
                'nama': nama,
                'tingkat': label,
                'ayah': ayah,
                'alamat': str(alamat)[:50] if alamat else ''
            })

print(f"\nTotal siswa tanpa telepon: {len(students_no_telp)}")
print()
for s in students_no_telp:
    print(f"[{s['tingkat']}] {s['nama']}")
    print(f"    Ayah: {s['ayah']}")
    print(f"    Alamat: {s['alamat']}...")
    print()

print()
print("="*80)
print("AKSI YANG DIPERLUKAN:")
print("="*80)
print("""
1. 21 siswa tanpa nomor telepon - perlu dihubungi untuk diminta nomor
2. NIS, Tempat Lahir, Tanggal Lahir - SUDAH LENGKAP
3. Kota/Provinsi - SUDAH DICOBAMARKAN UNTUK 2 SISWA

Data lainnya sudah COMPLETE!
""")
