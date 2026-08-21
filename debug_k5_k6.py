import glob, zipfile, xml.etree.ElementTree as ET

for tingkat, fpath in [
    (5, './DATA SANTRI/20 07 2026_DATA SISWA KELAS 5 GABUNGAN 26-27ds.xlsx'),
    (6, './DATA SANTRI/30 06 2026_DATA SISWA KELAS 6 GABUNGAN 26-27ds.xlsx')
]:
    with zipfile.ZipFile(fpath, 'r') as z:
        tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
        print(f'=== KELAS {tingkat} PARALEL DUMP ===')
        header_cells = rows[0].findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
        h_vals = [c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v') is not None else (c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') is not None else '') for c in header_cells]
        print('Header:', h_vals[:8])
        
        paralels = {}
        samples = {}
        for r in rows[1:]:
            cells = r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
            vals = [c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v') is not None else (c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') is not None else '') for c in cells]
            if len(vals) > 5:
                p = vals[2]
                nama = vals[5]
                paralels[p] = paralels.get(p, 0) + 1
                if p not in samples:
                    samples[p] = (vals[3], vals[4], nama)
        print('Paralels found with count:', paralels)
        for p, s in sorted(samples.items()):
            print(f'  Paralel "{p}": NIS={s[0]}, NISN={s[1]}, Nama={s[2]}')
