import subprocess,xml.etree.ElementTree as ET,re,sys
from device_guard import guard
att={'面对自己','面对法','面对法师','专注','前行:发心','正行:修行','结行:回向','未修中间:日常','时间（按作息安排）','形式:模式规范','忠实完成','不随意攀缘','主动学习，\n做修学的主人'}
met={'解读文句','列提纲','问题意识','道理上理解','事实上理解','摆脱错误观念','建立正确观念（正见）','安住正见','运用正见','摆脱不良心念','建立正向心念（正念）','安住正念','持续安住正见、正念','持续摆脱不良心念','建立良性生命品质','安住良性生命品质'}
metta={'无敌意','无危险','无精神痛苦','无身体痛苦','保持快乐','真诚祝愿','观想慈心，温暖他人','自他同体，无缘大慈','自己','身边人','本地区','本国','世界','一切众生'}
daily={'发心','持戒','热忱','所缘','作意','专注','觉知','接纳','不评判','正见','无念','无住','正念钟','生活提醒'}
allowed={'att':att,'met':met,'metta':metta,'daily':daily}[sys.argv[1]]
seen=set()
for step in range(14):
    subprocess.run(['python3','research/inspect.py','snap',f'{sys.argv[2]}-{step}'],stdout=subprocess.DEVNULL,check=True)
    tree=ET.parse('research/ui/'+sys.argv[2]+f'-{step}.xml')
    done=None
    for n in tree.iter('node'):
        t=n.get('text'); b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
        if len(b)!=4: continue
        x1,y1,x2,y2=b
        if t in allowed and t not in seen and x1==344 and y1>=440 and y2<=3104:
            guard()
            subprocess.run(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)])
            seen.add(t)
            print('Selected',t,flush=True)
        if t=='完成' and y1>=440 and y2<=3104: done=b
    if done:
        if seen!=allowed: print('Missing',allowed-seen,flush=True)
        x1,y1,x2,y2=done
        subprocess.run(['python3','research/inspect.py','tap',str((x1+x2)//2),str((y1+y2)//2),f'{sys.argv[2]}-done'])
        break
    guard()
    subprocess.run(['adb','shell','input','swipe','1000','2800','1000','1400','400'])
