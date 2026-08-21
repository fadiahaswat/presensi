import zipfile, xml.etree.ElementTree as ET

fpath = './DATA SANTRI/daftar_kelas_2026_2027.xlsx'
with zipfile.ZipFile(fpath, 'r') as z:
    sst = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree_sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in tree_sst.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            text = ''.join([t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text])
            sst.append(text)

    tree_sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = tree_sheet.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
    
    classes_samples = {}
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
            no_presensi = vals[0].replace('.0', '').strip()
            nis = vals[1].strip()
            nama = vals[2].strip()
            kelas = vals[3].strip()
            col4 = vals[4].strip() if len(vals) > 4 else ''
            if kelas not in classes_samples:
                classes_samples[kelas] = []
            classes_samples[kelas].append((no_presensi, nis, nama, col4))

    for k, v in sorted(classes_samples.items()):
        print(f"Kelas '{k}': {len(v)} santri. Sample #1: No={v[0][0]}, NIS={v[0][1]}, Nama={v[0][2]}, Col4='{v[0][3]}'")
