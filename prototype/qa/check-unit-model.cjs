const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'curriculum.json'),'utf8'));
let source=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/\nrender\(false\);\n\}\)\(\);\s*$/, '\nglobalThis.model={UNITS,newAssignment,snapshotOf,ready,seed,canAssignUnit,isReadOnly,refreshDefinition,definitionGaps,url,routeParams};\n})();');
const context={STUDY_MAP:catalog,URLSearchParams,Intl,Date,setTimeout(){},location:{search:''},localStorage:{getItem(){return null;}},document:{addEventListener(){}},addEventListener(){},history:{replaceState(){}}};
vm.createContext(context);vm.runInContext(source,context);
const {UNITS,newAssignment,snapshotOf,ready,seed,canAssignUnit,isReadOnly,refreshDefinition}=context.model;
assert.equal(new Set(UNITS.map(u=>u.id)).size,UNITS.length);
assert.equal(UNITS.filter(u=>!canAssignUnit(u)).length,2,'opaque 专修/选修 directories stay unassignable');
assert.ok(UNITS.filter(canAssignUnit).every(u=>!u.boundaryPending&&u.prerequisites.length===0));
assert.equal(catalog.sourceGroups.find(u=>u.title==='七信自检').children.length,8);
assert.equal(UNITS.filter(u=>u.path==='正信 · 七信自检').length,8);
assert.ok(!UNITS.some(u=>['诵','拜','念','忏','自检（习）','七信自检'].includes(u.title)),'practice groups are directories');
assert.ok(UNITS.some(u=>u.path==='正人 · 诵'&&u.title==='《弟子规》'));
assert.equal(UNITS.filter(u=>u.title==='定课自检').length,2,'expanded 正行 group becomes its three practices');
assert.equal(UNITS.filter(u=>u.path==='正行 · 定课自检').length,3);
assert.ok(!UNITS.some(u=>u.title==='念佛总数'),'a metric stays inside 计数念佛');
assert.equal(UNITS.filter(u=>u.title==='舍命念佛').length,2,'theory and practice retain separate paths');
const theory=UNITS.find(u=>u.title==='因缘果'),a=newAssignment(theory.id,'m1','a');
assert.equal(a.required.read,true);assert.equal(a.required.think,true);assert.equal(a.required.practice,true);
a.practiceInstruction='本次观察';a.target=2;a.period='本周';a.practiceTotal=2;a.reflectionSaved=true;refreshDefinition(a);
assert.equal(ready(a),false,'missing real materials/forms cannot be completed by counters');
const practice=UNITS.find(u=>u.title==='计数念佛'),b=newAssignment(practice.id,'m1','b'),c=newAssignment(practice.id,'m1','c');
assert.equal(b.required.read,false);assert.equal(b.required.think,false);assert.equal(b.required.practice,true);
assert.equal(isReadOnly(b),true);b.target=0;b.practiceInstruction='实际念佛';b.period='本周';refreshDefinition(b);assert.equal(ready(b),false);
b.target=10;refreshDefinition(b);assert.equal(b.pendingDefinition,false);assert.equal(isReadOnly(b),false);assert.equal(ready(b),false);
b.practiceTotal=10;b.records.push({count:10});assert.equal(ready(b),true);assert.equal(b.status,'active','meeting the target does not approve completion');
assert.equal(c.records.length,0);const snap=snapshotOf(b);b.records[0].count=20;assert.equal(snap.records[0].count,10);
const selfCheck=UNITS.find(u=>u.title==='六念自检'),d=newAssignment(selfCheck.id,'m1','d',{target:1,period:'本周',practiceInstruction:'按实际表单自检'});
assert.equal(d.pendingDefinition,true,'self-checks still need real forms');
assert.equal(seed().version,4);
console.log(`Approved-unit checks passed: ${UNITS.filter(canAssignUnit).length} units, 2 missing directories, configured practice lifecycle, content gates, parallel isolation.`);

// file: pages keep the pathname and use hash routes, avoiding History URL rewrite restrictions.
for(const initial of ['', '#role=teacher&page=assign&student=m2']){
 const fileContext={...context,location:{protocol:'file:',search:'',hash:initial},history:{replaceState(){}}};
 vm.createContext(fileContext);vm.runInContext(source,fileContext);
 const route=fileContext.model.url();assert.ok(route.startsWith('#'));
 const parsed=new URLSearchParams(route.slice(1));
 assert.equal(parsed.get('role'),initial?'teacher':'student');
 assert.equal(parsed.get('page'),initial?'assign':'home');
 if(initial)assert.equal(parsed.get('student'),'m2');
}
console.log('Offline hash route checks passed.');
