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
    
    for idx, r in enumerate(rows[:25]):
        cells = r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
        vals = []
        for c in cells:
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else (c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t').text if c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') is not None else '')
            if c.attrib.get('t') == 's' and val:
                val = sst[int(val)] if int(val) < len(sst) else val
            vals.append(str(val))
        print(f'Row {idx}:', vals)
