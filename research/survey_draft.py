"""Select test-only draft options in the visible survey; never submit or continue."""
import sys, subprocess, re, time, xml.etree.ElementTree as ET
from pathlib import Path
from device_guard import guard

base=sys.argv[1]
seen=set()
types={'android.widget.RadioButton','android.widget.CheckBox'}
for step in range(55):
    guard()
    active=subprocess.check_output(['adb','shell','dumpsys','activity','activities']).decode().split('topResumedActivity=')[-1].split('\n')[0]
    if 'SelfCheckActivity' not in active: raise SystemExit('Survey is not foreground; stopped.')
    name=f'{base}-{step:02d}'
    subprocess.run(['python3','research/inspect.py','snap',name],check=True,stdout=subprocess.DEVNULL)
    root=ET.parse(Path('research/ui')/f'{name}.xml').getroot()
    parents={c:p for p in root.iter() for c in p}
    paths={root:()}
    for p in root.iter():
        for i,c in enumerate(p): paths[c]=paths[p]+(i,)
    containers={}
    for n in root.iter('node'):
        if n.get('class') in types:
            row=parents[n];c=parents[row];containers[paths[c]]=c
    groups=[]
    for path,c in containers.items():
        cur=[];typ=None;start=None
        for i,row in enumerate(c):
            ops=[n for n in row if n.get('class') in types]
            t=ops[0].get('class') if ops else None
            if t and t==typ: cur.extend(ops)
            else:
                if cur: groups.append((path+(start,),cur))
                cur=ops;typ=t;start=i
        if cur:groups.append((path+(start,),cur))
    picked=0
    for key,options in groups:
        if key in seen:continue
        for n in options:
            b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
            if len(b)!=4:continue
            x1,y1,x2,y2=b
            if y1>=900 and y2<=2940 and y2-y1>40 and x2>x1:
                guard()
                subprocess.run(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)],check=True)
                seen.add(key);picked+=1;time.sleep(.15);break
    print(f'Draft screen {step}: selected {picked}, total {len(seen)}/{len(groups)}',flush=True)
    end=False
    for n in root.iter('node'):
        if (n.get('text') or '').strip() in {'继 续','继续','提交','提 交'}:
            b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
            if len(b)==4 and b[3]-b[1]>30 and b[1]>=900 and b[3]<=3040:end=True
    if end:
        print('Reached navigation button; stopped without continuing or submitting.',flush=True)
        break
    guard();subprocess.run(['adb','shell','input','swipe','1100','2800','1100','1050','400'],check=True);time.sleep(.25)
