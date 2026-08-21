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
    
    classes = {}
    records = []
    for r in rows[1:]:
        cells = r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
        vals = []
        for c in cells:
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else (c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') is not None else '')
            if c.attrib.get('t') == 's' and val:
                val = sst[int(val)] if int(val) < len(sst) else val
            vals.append(str(val))
        
        if len(vals) >= 4 and vals[1]: # has NIS
            no_presensi = vals[0].replace('.0', '').strip()
            nis = vals[1].strip()
            nama = vals[2].strip()
            kelas = vals[3].strip()
            records.append({
                'no_presensi': no_presensi,
                'nis': nis,
                'nama': nama,
                'kelas': kelas
            })
            classes[kelas] = classes.get(kelas, 0) + 1

    print(f'Total santri in daftar_kelas_2026_2027.xlsx: {len(records)}')
    print('\nDaftar Kelas & Rombel beserta jumlah santri:')
    for k in sorted(classes.keys()):
        print(f'  {k}: {classes[k]} santri')
        
    print('\nSample 5 records dari kelas internasional:')
    int_records = [r for r in records if any(x in r['kelas'].lower() for x in ['lower', 'upper', 'internasional', 'int'])]
    for r in int_records[:10]:
        print('  ', r)
