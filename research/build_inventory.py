from pathlib import Path
import json,re,xml.etree.ElementTree as ET

root=Path(__file__).parent
entries=[]
for f in sorted((root/'ui').glob('*.xml')):
    screenshot=root/'screens'/f'{f.stem}.png'
    if not screenshot.exists(): continue
    try:
        nodes=list(ET.parse(f).iter('node'))
    except ET.ParseError:
        print('Invalid XML:',f.name)
        continue
    strings=list(dict.fromkeys(n.get('text') or n.get('content-desc') for n in nodes if n.get('text') or n.get('content-desc')))
    packages=list(dict.fromkeys(n.get('package') for n in nodes if n.get('package')))
    entries.append({'id':f.stem,'packages':packages,'screenshot':f'screens/{f.stem}.png','ui':f'ui/{f.name}','visible_text':strings})
(root/'页面记录.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2))
report=root/'菩提导航功能梳理.md'
links=re.findall(r'\]\(([^)]+)\)',report.read_text())
missing=[x for x in links if not x.startswith('https:') and not (root/x).exists()]
print(json.dumps({'captured_states':len(entries),'report_links':len(links),'missing_links':missing},ensure_ascii=False))
