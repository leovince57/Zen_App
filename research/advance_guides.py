import pathlib,re,subprocess,sys,xml.etree.ElementTree as ET
root=pathlib.Path(__file__).parent
for i in range(15):
    subprocess.run(['adb','shell','uiautomator','dump','/sdcard/window.xml'],stdout=subprocess.DEVNULL)
    xml=subprocess.check_output(['adb','exec-out','cat','/sdcard/window.xml'])
    buttons=[n for n in ET.fromstring(xml).iter('node') if (n.get('text') or n.get('content-desc')) in ['下一步','知道了'] and n.get('clickable')=='true']
    if not buttons: break
    n=buttons[-1]; x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
    label=f'{sys.argv[1]}-{i:02d}'
    print('Guide',n.get('text'),flush=True)
    subprocess.run([sys.executable,str(root/'inspect.py'),'tap',str((x1+x2)//2),str((y1+y2)//2),label])
