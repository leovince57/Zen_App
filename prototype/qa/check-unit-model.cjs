// Regression checks for the whole-course assignment boundary and content permissions.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),map=JSON.parse(fs.readFileSync(path.join(root,'curriculum.json'),'utf8'));
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const source=app.replace(/\nrender\(\);\n\}\)\(\);\s*$/,`\nglobalThis.model={COURSES,seed,newAssignment,courseById,definitionGaps,canSubmit,publishCourses,checkOptions,url,current,normalizeRoute,
 getData:()=>data,go:(r,p,id='karma',student='m1',c='karma')=>{role=r;page=p;activeId=id;activeStudent=student;courseId=c;normalizeRoute();},
 views:{home,course,task,read,think,practice,submit,daily,journey,records,learning,guide,directory,pending,profile,students:teacherHome,student:teacherStudent,assign,review,configure,published,'arrangement-history':historyPage}};\n})();`);
assert.notEqual(source,app);
function load(search='',protocol='http:',hash='',raw=null){const writes=[];const c={STUDY_MAP:map,URLSearchParams,Intl,Date,setTimeout(){},location:{search,protocol,hash},localStorage:{getItem(){return raw;},setItem(k,v){writes.push(k);}},document:{addEventListener(){}},addEventListener(){},history:{replaceState(){}}};vm.createContext(c);vm.runInContext(source,c);return c.model;}
const model=load(),courses=model.COURSES;
assert.equal(courses.length,24);assert.equal(new Set(courses.map(c=>c.id)).size,24);
for(const [b,n] of [['正人',8],['正信',7],['正愿',2],['正行',7]])assert.equal(courses.filter(c=>c.branch===b).length,n);
assert.deepEqual(courses.filter(c=>c.branch==='正人').map(c=>c.title),['专修国家','专修儒家','专修道家','专修佛家','选修国家','选修儒家','选修道家','选修佛家']);
assert.equal(map.sourceGroups.length,39,'original map directories survive packaging');
assert.equal(map.sourceGroups.find(g=>g.title==='七信自检').children.length,8);
assert.ok(map.sourceGroups.some(g=>g.title==='菩萨戒忏悔与自检'));
assert.ok(map.sourceGroups.some(g=>g.title==='计数念佛'&&g.children.some(c=>c.title==='念佛总数')));
assert.equal(map.publicGuide.children.length,7);assert.equal(map.introExtras.length,3);
assert.equal(courses.filter(c=>c.theoryPath[0]==='正见').length,24);
assert.deepEqual(model.courseById('mindfulness').checks,['观身不净','观受是苦','观心无常','观法无我']);
assert.deepEqual(model.courseById('bodhi').checks,['菩提心自检']);
assert.ok(courses.every(c=>c.practices.length===0&&c.pairingConfirmed===false),'do not invent practice pairings');
for(const c of courses){assert.ok(c.pending.length>0);const a=model.newAssignment(c.id,'m1','x',{reflection:'done',target:108,practiceTotal:108});assert.equal(model.canSubmit(a),false,'reflection or counters cannot bypass missing content');}
const prior=model.getData().assignments.length,created=model.publishCourses(['bodhi','bodhi','merit','karma','not-a-course'],'m1','guidance','requirements');
assert.equal(created.length,2,'deduplicate and preserve existing courses');assert.equal(model.getData().assignments.length,prior+2);
assert.equal(model.getData().assignments.filter(a=>a.student==='m2').length,1,'assignments remain isolated by learner');
assert.ok(created.every(a=>a.status==='active'&&a.requirements==='requirements'));
assert.ok(model.getData().assignments.some(a=>a.id==='karma'));
const options=model.checkOptions();assert.equal(options.length,6,'karma + four mindfulness items + opened bodhi');
assert.ok(!options.some(o=>/戒|轮回|定课/.test(o.title)),'no guessed forms or unopened permissions');
const untouched=JSON.stringify(model.courseById('karma'));model.getData().daily.selected=[];assert.equal(JSON.stringify(model.courseById('karma')),untouched,'personal daily choices cannot cancel course checks');
model.go('student','task','bodhi');assert.equal(model.current().student,'m1','direct links cannot expose another learner assignment');
model.go('student','course','karma','m1','cremation');assert.match(model.views.course().body,/内容锁定/);assert.doesNotMatch(model.views.course().body,/正见 → 正行/,'locked course exposes no learning contents');
model.go('student','task','karma');assert.match(model.views.task().body,/闻/);assert.match(model.views.think().body,/课程专项自检/);assert.doesNotMatch(model.views.think().body,/type="radio"/,'no fabricated generic self-check questions');
assert.match(model.views.submit().footer,/disabled/);assert.match(model.views.practice().body,/待法师确认/);
for(const role of ['student','teacher'])for(const [page,view] of Object.entries(model.views)){model.go(role,page);if((role==='student'&&['students','assign','review','configure','student','pending','arrangement-history','published'].includes(page))||(role==='teacher'&&['home','task','read','think','practice','submit','daily','records','learning','guide'].includes(page)))continue;const out=view();assert.equal(typeof out.body,'string',role+' '+page);assert.ok(!out.body.includes('undefined'),role+' '+page+' must render valid data');}
assert.equal(model.seed().version,5);
for(const initial of ['','#role=teacher&page=assign&student=m2']){const m=load('','file:',initial);assert.ok(m.url().startsWith('#'));assert.equal(new URLSearchParams(m.url().slice(1)).get('role'),initial?'teacher':'student');}
const old=load('','http:','',JSON.stringify({version:4,assignments:[]}));assert.equal(old.getData().version,5,'old storage cannot become fabricated new assignments');
const jsContext={};vm.createContext(jsContext);vm.runInContext(fs.readFileSync(path.join(root,'curriculum.js'),'utf8'),jsContext);assert.deepEqual(JSON.parse(JSON.stringify(jsContext.STUDY_MAP)),map,'JSON and browser catalog stay identical');
console.log('Course model passed: 24 courses (8/7/2/7), source preservation, fixed pairing gaps, scoped self-checks, parallel assignment, content gates, route permissions and offline hashes.');
// The shipped offline snapshot must contain exactly the current sources, with no external dependencies.
const offline=fs.readFileSync(path.join(root,'..','delivery','1.html'),'utf8');
assert.ok(!/<script[^>]+src=|<link[^>]+href="styles\.css"/.test(offline));
const blocks=[...offline.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)].map(m=>m[1]);
assert.equal(blocks.length,2);for(const block of blocks)new vm.Script(block);
for(const [i,name] of ['curriculum.js','app.js'].entries())assert.equal(blocks[i],fs.readFileSync(path.join(root,name),'utf8').replace(/<\/script/gi,'<\\/script'));
console.log('Offline snapshot passed: current catalog/app inline, syntax valid, no external CSS/script dependencies.');
