import pandas as pd
import re
from collections import defaultdict

def clean_address(addr):
    if not addr or pd.isna(addr):
        return addr

    addr = str(addr)

    # 1. Remove extra spaces (multiple spaces -> single space)
    addr = re.sub(r'\s+', ' ', addr)

    # 2. Strip leading/trailing spaces
    addr = addr.strip()

    # 3. Standardize Jl. prefix (first letter uppercase)
    addr = re.sub(r'^jl\.?\s+', 'Jl. ', addr, flags=re.IGNORECASE)
    addr = re.sub(r'^jl\s+', 'Jl. ', addr, flags=re.IGNORECASE)

    # 4. Standardize RT/RW format
    # RT 001 -> RT 001
    addr = re.sub(r'\bRT\s*0*(\d+)\b', r'RT \1', addr, flags=re.IGNORECASE)
    # RW 001 -> RW 001
    addr = re.sub(r'\bRW\s*0*(\d+)\b', r'RW \1', addr, flags=re.IGNORECASE)

    # 5. If has RT but no RW, check if RT has 3 digits (might be typo)
    # e.g., "RT 001" alone might mean they meant RW

    # 6. Standardize common prefixes
    addr = re.sub(r'^Perum\s+', 'Perum. ', addr, flags=re.IGNORECASE)
    addr = re.sub(r'^Perumahan\s+', 'Perum. ', addr, flags=re.IGNORECASE)
    addr = re.sub(r'^Kp\.?\s+', 'Kp. ', addr, flags=re.IGNORECASE)
    addr = re.sub(r'^Dsn\.?\s+', 'Dusun ', addr, flags=re.IGNORECASE)
    addr = re.sub(r'^Ds\.?\s+', 'Desa ', addr, flags=re.IGNORECASE)
    addr = re.sub(r'^Dsng\.?\s+', 'Desa ', addr, flags=re.IGNORECASE)

    # 7. Standardize "Dusun" (avoid "Dusun " prefix if already present)
    addr = re.sub(r'^Dusun\s+', 'Dusun ', addr)

    # 8. Remove "Kota" prefix if it's redundant
    addr = re.sub(r'\bKota\s+(?=\w)', '', addr, flags=re.IGNORECASE)

    # 9. Standardize comma usage (space after comma)
    addr = re.sub(r',', ', ', addr)
    addr = re.sub(r',\s*,', ',', addr)

    # 10. Remove double commas
    addr = re.sub(r',+', ',', addr)

    # 11. Remove trailing comma
    addr = re.sub(r',\s*$', '', addr)

    # 12. Standardize "No." format
    addr = re.sub(r'\bNO\.?\s*', 'No. ', addr, flags=re.IGNORECASE)
    addr = re.sub(r'\bNO\s+', 'No. ', addr, flags=re.IGNORECASE)

    # 13. Final cleanup - multiple spaces again
    addr = re.sub(r'\s+', ' ', addr)
    addr = addr.strip()

    # 14. Capitalize first letter of each sentence
    if addr and addr[0].islower():
        addr = addr[0].upper() + addr[1:]

    return addr

# Files to process
files = [
    ('DATA SANTRI/25 06  2026_DATA SISWA KELAS 1 GABUNGAN 26-27ds.xlsx', 'Kelas 1'),
    ('DATA SANTRI/16072026_Terbaru DATA SISWA KELAS 2 GABUNGAN 26-27.xlsx', 'Kelas 2'),
    ('DATA SANTRI/18072026_Terbaru DATA SISWA KELAS 3 GABUNGAN 26-27ds.xlsx', 'Kelas 3'),
    ('DATA SANTRI/03 08 2026_DATA SISWA KELAS 4 GABUNGAN 26-27ds.xlsx', 'Kelas 4'),
    ('DATA SANTRI/20 07 2026_DATA SISWA KELAS 5 GABUNGAN 26-27ds.xlsx', 'Kelas 5'),
    ('DATA SANTRI/30 06 2026_DATA SISWA KELAS 6 GABUNGAN 26-27ds.xlsx', 'Kelas 6'),
]

print("="*80)
print("MERAPIKAN DATA ALAMAT")
print("="*80)

changes_count = 0
sample_changes = []

for fpath, label in files:
    df = pd.read_excel(fpath)
    n_cols = len(df.columns)

    # Determine alamat column
    alamat_col = 18 if n_cols == 62 else 19

    changes_in_file = 0
    for i, row in df.iterrows():
        row_data = row.tolist()
        if alamat_col < len(row_data):
            old_addr = row_data[alamat_col]
            if old_addr and not pd.isna(old_addr):
                new_addr = clean_address(old_addr)
                if old_addr != new_addr:
                    changes_in_file += 1
                    if len(sample_changes) < 20:
                        sample_changes.append({
                            'file': label,
                            'old': old_addr,
                            'new': new_addr
                        })
                    # Update the dataframe
                    df.at[i, df.columns[alamat_col]] = new_addr

    # Save the file
    df.to_excel(fpath, index=False)
    print(f"{label}: {changes_in_file} alamat dirapikan")

print()
print("="*80)
print("SAMPLE PERUBAHAN:")
print("="*80)
for idx, change in enumerate(sample_changes[:10], 1):
    print(f"\n{idx}. [{change['file']}]")
    print(f"   OLD: {change['old'][:70]}..." if len(change['old']) > 70 else f"   OLD: {change['old']}")
    print(f"   NEW: {change['new'][:70]}..." if len(change['new']) > 70 else f"   NEW: {change['new']}")

print()
print("="*80)
print("VERIFIKASI")
print("="*80)

# Verify by reading back
total_addresses = 0
clean_addresses = 0
for fpath, label in files:
    df = pd.read_excel(fpath)
    total_addresses += len(df)
    for i, row in df.iterrows():
        addr = row.iloc[18] if len(df.columns) == 62 else row.iloc[19]
        if addr and not pd.isna(addr):
            addr_str = str(addr)
            if '  ' not in addr_str and addr_str == addr_str.strip():
                clean_addresses += 1

print(f"Total alamat: {total_addresses}")
print(f"Alamat terverifikasi bersih: {clean_addresses}")
print()
print("[DONE] Semua alamat telah dirapikan!")
