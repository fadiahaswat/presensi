import pandas as pd
import numpy as np
from collections import defaultdict

# File yang akan diupdate - Kelas 4
file_k4 = 'DATA SANTRI/03 08 2026_DATA SISWA KELAS 4 GABUNGAN 26-27ds.xlsx'

print("="*80)
print("MENGHAPUS DATA DOBEL")
print("="*80)

# Baca file
df = pd.read_excel(file_k4)

print(f"\nTotal siswa sebelum: {len(df)}")

# Untuk struktur baru (Kelas 4-6): NISN ada di kolom 4
# Struktur: [0]=NO, [1]=Paralel, [2]=Kelas, [3]=NIS, [4]=NISN, [5]=Nama

nisn_groups = defaultdict(list)
for i, row in df.iterrows():
    row_data = row.tolist()
    nisn = row_data[4] if len(row_data) > 4 else None  # NISN di kolom 4
    if nisn and not pd.isna(nisn):
        nisn_groups[nisn].append(i)

print("\nNISN yang dobel:")
for nisn, indices in nisn_groups.items():
    if len(indices) > 1:
        print(f"  NISN: {nisn}")
        for idx in indices:
            row_data = df.iloc[idx].tolist()
            nama = row_data[5] if len(row_data) > 5 else 'Unknown'
            print(f"    Row {idx}: {nama}")

# Hapus baris duplikat (keep yang pertama saja)
rows_to_drop = []
for nisn, indices in nisn_groups.items():
    if len(indices) > 1:
        # Keep first, drop the rest
        for idx in indices[1:]:
            rows_to_drop.append(idx)

print(f"\nBaris yang akan dihapus: {len(rows_to_drop)}")
for idx in rows_to_drop:
    row_data = df.iloc[idx].tolist()
    print(f"  - Row {idx}: {row_data[5]} (NISN: {row_data[4]})")

# Drop rows
df_cleaned = df.drop(rows_to_drop)

print(f"\nTotal siswa setelah dihapus: {len(df_cleaned)}")

# Reset index
df_cleaned = df_cleaned.reset_index(drop=True)

# Save file
df_cleaned.to_excel(file_k4, index=False)
print(f"\nFile disimpan: {file_k4}")

print("\n" + "="*80)
print("VERIFIKASI")
print("="*80)

# Baca ulang untuk verifikasi
df_verify = pd.read_excel(file_k4)
print(f"Total siswa di file: {len(df_verify)}")

# Cek apakah masih ada dobel
nisn_verify = defaultdict(int)
for _, row in df_verify.iterrows():
    row_data = row.tolist()
    nisn = row_data[4] if len(row_data) > 4 else None
    if nisn and not pd.isna(nisn):
        nisn_verify[nisn] += 1

doubles = {n: c for n, c in nisn_verify.items() if c > 1}
if doubles:
    print(f"Masih ada {len(doubles)} NISN dobel!")
    for nisn, count in doubles.items():
        print(f"  {nisn}: {count}x")
else:
    print("✓ Tidak ada lagi NISN dobel!")

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"Kelas 4 sebelum: 218")
print(f"Kelas 4 sesudah: {len(df_cleaned)}")
print(f"Data dihapus: {218 - len(df_cleaned)}")
print(f"\nTotal Santri sekarang: {267 + 298 + (len(df_cleaned)) + 211 + 225} (estimasi)")
