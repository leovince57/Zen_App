import subprocess, sys, pathlib, json, xml.etree.ElementTree as ET, time
from device_guard import guard
root=pathlib.Path(__file__).parent
def adb(*args): return subprocess.check_output(['adb',*map(str,args)])
action=sys.argv[1]
args=sys.argv[2:]
if action!='open': guard()
if action=='tap': adb('shell','input','tap',*args[:2]); name=args[2]
elif action=='swipe': adb('shell','input','swipe',*args[:4],400); name=args[4]
elif action=='back': adb('shell','input','keyevent',4); name=args[0]
elif action=='key': adb('shell','input','keyevent',args[0]); name=args[1]
elif action=='hide_keyboard':
    if b'mInputShown=true' in adb('shell','dumpsys','input_method'): adb('shell','input','keyevent',4)
    name=args[0]
elif action=='open': adb('shell','am','start','-n',args[0]); name=args[1]
else: name=args[0]
time.sleep(1)
guard()
p=root/'screens'/f'{name}.png'
adb('shell','rm','-f','/sdcard/window.xml')
dump=adb('shell','uiautomator','dump','/sdcard/window.xml')
if b'ERROR' in dump:
    time.sleep(1)
    adb('shell','uiautomator','dump','/sdcard/window.xml')
guard()
xml=adb('exec-out','cat','/sdcard/window.xml')
guard()
pixels=adb('exec-out','screencap','-p')
guard()
(root/'ui'/f'{name}.xml').write_bytes(xml)
p.write_bytes(pixels)
# Retain only the original evidence screenshot; avoid duplicate preview files.
nodes=[]
for n in ET.fromstring(xml).iter('node'):
    a=n.attrib
    if a.get('text') or a.get('content-desc'):
        nodes.append({'text':a.get('text'),'desc':a.get('content-desc'),'bounds':a.get('bounds'),'click':a.get('clickable')})
for n in nodes:
    label=n['text'] or n['desc']
    if len(label)>240: label=label[:240]+'… [long content omitted]'
    print(label+' '+n['bounds']+(' *' if n['click']=='true' else ''))
print(adb('shell','dumpsys','activity','activities').decode().split('topResumedActivity=')[-1].split('\n')[0])
