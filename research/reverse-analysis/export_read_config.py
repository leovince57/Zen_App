import json,csv,hashlib,sys
from pathlib import Path
from urllib.parse import urlparse
root=Path('/Users/chenliu/Zen_App/research/reverse-analysis');priv=Path('/Users/chenliu/.local/share/zen-rea/private-runtime');out=root/'config';out.mkdir(exist_ok=True)
def load(n):return json.loads((priv/n).read_text())
def save(n,v):(out/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
levels=load('getMindLevelName-authenticated.json')['data'][0]
save('心理阶段表.json',{'source_action':'getMindLevelName','captured_date':'2026-10-20',**levels})
items=load('all-score-config.json')['items']
allowed=['mind_practice_id','mp_tag_id','mp_tag_or_id','mind_practice_name','mind_practice_exam_num','mind_practice_short_name','mind_practice_exam','mind_practice_intro','mind_practice_type','mind_iscan_see','mind_iscan_detection','mind_standard_score','mind_standard_score_remind','mind_standard_open']
opt=['mp_level_id','mind_practice_id','score_name','score','level','level_name','mp_level_intro','mp_level_intro_group','level_note']
def clean(e):
 r={k:e[k] for k in allowed if k in e};r['scoreInfo']=[{k:v[k] for k in opt if k in v} for v in e.get('scoreInfo',[])];r['mind_children']=[clean(c) for c in e.get('mind_children',[])];return r
cleaned=[clean(e) for e in items]
save('心理评分配置-身份1-普通检测.json',{'source_action':'getMpTestListNew','captured_date':'2026-10-20','request_scope':{'user_identity':'1','user_mp_detection_type':'1','source':'调研副本实际保存的身份；目录返回的26项逐项读取'},'items':cleaned,'errors':load('all-score-config.json')['errors']})
flat=[]
def walk(e,parent=None):
 flat.append((parent,e))
 for c in e['mind_children']:walk(c,e['mind_practice_id'])
for e in cleaned:walk(e)
with (out/'心理评分选项.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['parent_id','mind_practice_id','name','mp_tag_id','can_detect','standard_open','standard_score','score','level','level_name','score_name','option_intro','level_note'])
 for parent,e in flat:
  for o in e['scoreInfo']:w.writerow([parent,e['mind_practice_id'],e['mind_practice_name'],e['mp_tag_id'],e['mind_iscan_detection'],e['mind_standard_open'],e['mind_standard_score'],o.get('score'),o.get('level'),o.get('level_name'),o.get('score_name'),o.get('mp_level_intro'),o.get('level_note')])
model=load('getMindPracticeAllNew-authenticated.json')['data'];rows=[]
for g in model:
 for e in g['mind_practice']:
  rows.append({'mp_tag_id':g['mp_tag_id'],'mp_tag_name':g['mp_tag_name'],**{k:e[k] for k in ['mind_practice_id','mind_practice_name','mind_practice_short_name','isHas','mind_standard_score'] if k in e}})
save('人格模型目录与可用状态.json',{'source_action':'getMindPracticeAllNew','request_identity':'1','rows':rows,'note':'保留isHas原始值，不把2一概解释为服务器拒绝。仅26个普通检测目录项被请求；其余未强行请求。'})
ocean=load('getLifeOceanVideo-authenticated.json')['data'][0];u=urlparse(ocean['lifeOceanVideoUrl'])
save('生命海洋响应摘要.json',{'source_action':'getLifeOceanVideo','filename':ocean['lifeOceanVideoName'],'url_host':u.hostname,'url_path_sha256':hashlib.sha256(u.path.encode()).hexdigest(),'signed_query_removed':bool(u.query),'note':'URL签名及查询参数未导出；单次返回无法反推出五位文件名的编码规则或心理变化条件。'})
summary={'top_level_items':len(items),'nested_items':len(flat)-len(items),'items_with_options':sum(bool(e['scoreInfo']) for _,e in flat),'option_rows':sum(len(e['scoreInfo']) for _,e in flat),'can_detect_items_with_options':sum(bool(e['scoreInfo']) and e['mind_iscan_detection']==1 for _,e in flat),'blocked_nested_items':[e['mind_practice_id'] for _,e in flat if e['mind_iscan_detection']!=1],'model_directory_rows':len(rows),'model_unique_ids':len(set(e['mind_practice_id'] for e in rows)),'fetch_errors':0}
save('导出清单.json',summary);print(json.dumps(summary,ensure_ascii=False))
