import sys,json,time,hashlib
from pathlib import Path
sys.path.insert(0,'/Users/chenliu/Zen_App/research/reverse-analysis')
from app_read_client import ReadClient,PRIVATE
c=ReadClient(json.loads((PRIVATE/'research-auth.json').read_text()))
groups=json.loads((PRIVATE/'getMindPracticeListNew-authenticated.json').read_text())['data']
out=[];errors=[]
for g in groups:
 for e in g['mind_practice']:
  mid=e['mind_practice_id'];p=PRIVATE/('score-'+str(mid)+'.json')
  try:
   r=c.read('getMpTestListNew',{'mind_practice_ids':str(mid),'mp_tag_id':str(g['mp_tag_id']),'user_identity':'1','user_mp_detection_type':'1'})
   p.write_text(json.dumps(r,ensure_ascii=False));p.chmod(0o600)
   out.extend(r['data'])
   print(mid,e['mind_practice_name'],'ok',flush=True)
  except Exception as ex:errors.append({'mind_practice_id':mid,'error':str(ex)});print(mid,'error',str(ex)[:80],flush=True)
  time.sleep(.15)
p=PRIVATE/'all-score-config.json';p.write_text(json.dumps({'items':out,'errors':errors},ensure_ascii=False));p.chmod(0o600)
print({'items':len(out),'errors':len(errors)})
