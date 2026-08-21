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
    
    k6_rows = []
    for idx, r in enumerate(rows[1:]):
        cells = r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
        vals = []
        for c in cells:
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else (c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') is not None else '')
            if c.attrib.get('t') == 's' and val:
                val = sst[int(val)] if int(val) < len(sst) else val
            vals.append(str(val))
        
        if len(vals) >= 4 and vals[1] and ('VI' in vals[3] or '6' in vals[3]):
            k6_rows.append((vals[0].replace('.0',''), vals[1], vals[2], vals[3], vals[4] if len(vals)>4 else ''))

    print(f'Total Kelas 6 rows: {len(k6_rows)}')
    k6_classes = {}
    for r in k6_rows:
        k6_classes[r[3]] = k6_classes.get(r[3], 0) + 1
    for k, v in sorted(k6_classes.items()):
        print(f"  {k}: {v} santri")
    print('\nSample 5 records of VI ADV:')
    for r in [x for x in k6_rows if 'ADV' in x[3]][:5]:
        print('  ', r)
