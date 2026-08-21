import pandas as pd
import numpy as np
from collections import defaultdict

files = [
    ('DATA SANTRI/25 06  2026_DATA SISWA KELAS 1 GABUNGAN 26-27ds.xlsx', 'Kelas 1'),
    ('DATA SANTRI/16072026_Terbaru DATA SISWA KELAS 2 GABUNGAN 26-27.xlsx', 'Kelas 2'),
    ('DATA SANTRI/18072026_Terbaru DATA SISWA KELAS 3 GABUNGAN 26-27ds.xlsx', 'Kelas 3'),
    ('DATA SANTRI/03 08 2026_DATA SISWA KELAS 4 GABUNGAN 26-27ds.xlsx', 'Kelas 4'),
    ('DATA SANTRI/20 07 2026_DATA SISWA KELAS 5 GABUNGAN 26-27ds.xlsx', 'Kelas 5'),
    ('DATA SANTRI/30 06 2026_DATA SISWA KELAS 6 GABUNGAN 26-27ds.xlsx', 'Kelas 6'),
]

all_students = []

for fpath, label in files:
    df = pd.read_excel(fpath)

    for i, row in df.iterrows():
        row_data = row.tolist()
        n_cols = len(row_data)

        if n_cols == 62:
            nama = row_data[4]
            nis = row_data[2]
            nisn = row_data[3]
            jk = row_data[11]
            tempat = row_data[12]
            tgl_lahir = row_data[14]
            ayah = row_data[27]
            ibu = row_data[34]
            alamat = row_data[18]
            asal_sekolah = row_data[24]
            desa = row_data[20]
            kecamatan = row_data[21]
            kota = row_data[22]
            anak_ke = row_data[8]
            jml_saudara = row_data[9]
            telp_ayah = row_data[32]
        else:
            nama = row_data[5]
            nis = row_data[3]
            nisn = row_data[4]
            jk = row_data[12]
            tempat = row_data[13]
            tgl_lahir = row_data[15]
            ayah = row_data[28]
            ibu = row_data[35]
            alamat = row_data[19]
            asal_sekolah = row_data[25]
            desa = row_data[21]
            kecamatan = row_data[22]
            kota = row_data[23]
            anak_ke = row_data[9]
            jml_saudara = row_data[10]
            telp_ayah = row_data[33]

        all_students.append({
            'nama': nama, 'nis': nis, 'nisn': nisn, 'jk': jk,
            'tempat': tempat, 'tgl_lahir': tgl_lahir,
            'ayah': ayah, 'ibu': ibu, 'alamat': alamat,
            'asal_sekolah': asal_sekolah, 'desa': desa,
            'kecamatan': kecamatan, 'kota': kota,
            'anak_ke': anak_ke, 'jml_saudara': jml_saudara,
            'telp_ayah': telp_ayah,
            'tingkat': label,
        })

def norm(s):
    if s is None or pd.isna(s):
        return ''
    return str(s).lower().strip()

print("="*80)
print("TRIANGULASI KAKAK BERADIK")
print("="*80)

# STRATEGI 1: AYAH + IBU + ALAMAT SAMA
print("\n--- STRATEGI 1: AYAH + IBU + ALAMAT SAMA ---")
groups1 = defaultdict(list)
for s in all_students:
    ayah = norm(s['ayah'])
    ibu = norm(s['ibu'])
    alamat = norm(s['alamat'])[:50] if s['alamat'] else ''

    if ayah and ibu and alamat and ayah != 'nan' and ibu != 'nan' and alamat != 'nan':
        key = (ayah, ibu, alamat)
        groups1[key].append(s)

siblings1 = {k: v for k, v in groups1.items() if len(v) > 1}
print(f"Hasil: {len(siblings1)} keluarga")

# STRATEGI 2: AYAH + IBU + TELEPON SAMA
print("\n--- STRATEGI 2: AYAH + IBU + TELEPON SAMA ---")
groups2 = defaultdict(list)
for s in all_students:
    ayah = norm(s['ayah'])
    ibu = norm(s['ibu'])
    telp = str(s['telp_ayah'])[:10] if s['telp_ayah'] else ''

    if ayah and ibu and telp and ayah != 'nan' and ibu != 'nan' and len(telp) >= 8:
        key = (ayah, ibu, telp)
        groups2[key].append(s)

siblings2 = {k: v for k, v in groups2.items() if len(v) > 1}
print(f"Hasil: {len(siblings2)} keluarga")

# STRATEGI 3: ALAMAT SAMA + ANAK KE BERURUTAN
print("\n--- STRATEGI 3: ALAMAT + ANAK KE BERURUTAN ---")
groups3 = defaultdict(list)
for s in all_students:
    alamat = norm(s['alamat'])[:40] if s['alamat'] else ''
    anak_ke = s['anak_ke']

    if alamat and anak_ke and alamat != 'nan' and pd.notna(anak_ke):
        groups3[alamat].append(s)

def has_consecutive(students):
    anak_kes = sorted([s['anak_ke'] for s in students if pd.notna(s['anak_ke'])])
    if len(anak_kes) >= 2:
        for i in range(len(anak_kes) - 1):
            if anak_kes[i+1] - anak_kes[i] <= 2:
                return True
    return False

siblings3 = {k: v for k, v in groups3.items() if has_consecutive(v)}
print(f"Hasil: {len(siblings3)} keluarga")

# STRATEGI 4: DESA + KECAMATAN + ANAK KE BERURUTAN
print("\n--- STRATEGI 4: DESA + KECAMATAN + ANAK KE ---")
groups4 = defaultdict(list)
for s in all_students:
    desa = norm(s['desa'])
    kecamatan = norm(s['kecamatan'])
    anak_ke = s['anak_ke']

    if desa and kecamatan and anak_ke and desa != 'nan' and kecamatan != 'nan' and pd.notna(anak_ke):
        key = f"{desa}|{kecamatan}"
        groups4[key].append(s)

siblings4 = {k: v for k, v in groups4.items() if has_consecutive(v)}
print(f"Hasil: {len(siblings4)} keluarga")

# ============================================
# VERIFIKASI SILANG
# ============================================
print("\n" + "="*80)
print("VERIFIKASI SILANG (MINIMAL 2 STRATEGI MATCH)")
print("="*80)

student_scores = defaultdict(set)
all_groups = [
    (siblings1, 'Alamat'),
    (siblings2, 'Telp'),
    (siblings3, 'AnakKe'),
    (siblings4, 'Desa')
]

for groups, strat_name in all_groups:
    for key, students in groups.items():
        for s in students:
            nisn = str(s['nisn']) if pd.notna(s['nisn']) else id(s)
            student_scores[nisn].add(strat_name)

# Families with members verified by multiple strategies
verified_nisns = {n for n, strats in student_scores.items() if len(strats) >= 2}

# Collect unique families
unique_families = []
seen_nisns = set()

for groups, _ in all_groups:
    for key, students in groups.items():
        family_verified = sum(1 for s in students if str(s['nisn']) in verified_nisns)
        if family_verified >= 2 and len(students) >= 2:
            family_students = []
            for s in students:
                nisn = str(s['nisn']) if pd.notna(s['nisn']) else id(s)
                if nisn not in seen_nisns:
                    seen_nisns.add(nisn)
                    family_students.append(s)
            if len(family_students) >= 2:
                unique_families.append((key, family_students))

# Remove duplicate families
seen_sigs = set()
final_families = []
for key, students in unique_families:
    sig = tuple(sorted([str(s['nisn']) for s in students if pd.notna(s['nisn'])]))
    if sig not in seen_sigs and len(sig) >= 2:
        seen_sigs.add(sig)
        final_families.append((key, students))

print(f"\nTotal keluarga terverifikasi: {len(final_families)}")

for i, (key, students) in enumerate(final_families[:30]):
    print(f"\n{'='*70}")
    print(f"KELUARGA {i+1}: {len(students)} anak")
    print(f"{'='*70}")

    if isinstance(key, tuple) and len(key) >= 2:
        print(f"Ayah: {key[0].title()}")
        print(f"Ibu: {key[1].title()}")
        if len(key) > 2:
            print(f"Alamat: {key[2][:60]}...")
    else:
        print(f"Alamat: {str(key)[:60]}...")

    for s in students:
        tgl = str(s['tgl_lahir'])[:10] if pd.notna(s['tgl_lahir']) else '?'
        anak = int(s['anak_ke']) if pd.notna(s['anak_ke']) else '?'
        ttl = f"{s['tempat']}, {tgl}" if s['tempat'] else tgl
        print(f"\n  [{s['tingkat']}] {s['nama']}")
        print(f"       JK: {s['jk']} | Anak ke: {anak} | TTL: {ttl}")
        print(f"       NISN: {s['nisn']} | Kota: {s['kota']}")
