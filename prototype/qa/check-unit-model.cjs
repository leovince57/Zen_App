// Regression checks for the whole-course assignment boundary and content permissions.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),map=JSON.parse(fs.readFileSync(path.join(root,'curriculum.json'),'utf8'));
const toolsSource=fs.readFileSync(path.join(root,'study-tools.js'),'utf8');
const noticesSource=fs.readFileSync(path.join(root,'study-notices.js'),'utf8');
const toolsContext={};vm.createContext(toolsContext);vm.runInContext(toolsSource,toolsContext);
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const source=app.replace(/\nrender\(\);\n\}\)\(\);\s*$/,`\nglobalThis.model={COURSES,seed,newAssignment,courseById,definitionGaps,canSubmit,publishCourses,checkOptions,url,current,normalizeRoute,resumeStudy,recordStudy,actualStudyPosition,reflectionValues,saveReflectionSnapshot,flushReflection,noticeItems,markNoticeRead,saveGuidance,categoryCourses,setCategory:branch=>{ui.categoryBranch=branch;},
 routeGroups,courseRoute,courseProgress,courseNext,isOpened,T,timeline,recordTitle,recordDescription,timerDaySummary,historyPanel,pathEntries,pathKind,matchesPath,eventTime,learningContext,syncLearningTimer,timerRibbon,setHidden:hidden=>{document.hidden=hidden;},DEMO_ARTICLE,ui,getData:()=>data,go:(r,p,id='karma',student='m1',c='karma')=>{role=r;page=p;activeId=id;activeStudent=student;courseId=c;normalizeRoute();prepareArticle();syncLearningTimer();},
 views:{home,category,tools,reader,article,reflect,timer,'timer-review':timerReview,'timer-saved':timerSaved,counter,'course-progress':courseProgress,'record-detail':recordDetail,course,task,read,think,practice,submit,daily,journey,records,learning,guide,directory,pending,profile,students:teacherHome,student:teacherStudent,assign,review,configure,published,'arrangement-history':historyPage}};\n})();`);
assert.notEqual(source,app);
function load(search='',protocol='http:',hash='',raw=null,storage={}){const writes=[];const c={STUDY_MAP:map,URLSearchParams,Intl,Date,setTimeout(){},location:{search,protocol,hash},localStorage:{getItem(){return raw;},setItem(k,v){if(storage.fail)throw Error('storage full');writes.push(k);}},document:{addEventListener(){},querySelector(){return null;}},addEventListener(){},history:{replaceState(){}}};vm.createContext(c);vm.runInContext(toolsSource,c);vm.runInContext(noticesSource,c);vm.runInContext(source,c);return c.model;}
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
for(const role of ['student','teacher'])for(const [page,view] of Object.entries(model.views)){model.go(role,page);if((role==='student'&&['students','assign','review','configure','student','pending','arrangement-history','published'].includes(page))||(role==='teacher'&&['home','category','tools','reader','timer','timer-review','timer-saved','counter','task','read','article','think','reflect','practice','submit','daily','records','learning','guide'].includes(page)))continue;const out=view();assert.equal(typeof out.body,'string',role+' '+page);assert.ok(!out.body.includes('undefined'),role+' '+page+' must render valid data');}
assert.equal(model.seed().version,5);
for(const initial of ['','#role=teacher&page=assign&student=m2']){const m=load('','file:',initial);assert.ok(m.url().startsWith('#'));assert.equal(new URLSearchParams(m.url().slice(1)).get('role'),initial?'teacher':'student');}
const old=load('','http:','',JSON.stringify({version:4,assignments:[]}));assert.equal(old.getData().version,5,'old storage cannot become fabricated new assignments');
const jsContext={};vm.createContext(jsContext);vm.runInContext(fs.readFileSync(path.join(root,'curriculum.js'),'utf8'),jsContext);assert.deepEqual(JSON.parse(JSON.stringify(jsContext.STUDY_MAP)),map,'JSON and browser catalog stay identical');
console.log('Course model passed: 24 courses (8/7/2/7), source preservation, fixed pairing gaps, scoped self-checks, parallel assignment, content gates, route permissions and offline hashes.');
// Petals navigate, and browsing never changes actual study history.
const m=load();m.go('student','home');let html=m.views.home().body;
assert.equal((html.match(/data-go="category"/g)||[]).length,5);
assert.doesNotMatch(html,/home-course|data-go="catalog"|课程目录|aria-pressed=/);
assert.match(html,/开始学习/);assert.equal(m.resumeStudy().hasHistory,false,'no fabricated last-study history');
const a1=m.getData().assignments.find(a=>a.id==='mindfulness');assert.equal(m.recordStudy(a1,'think'),false);assert.equal(m.recordStudy(a1,'reflect'),true);
assert.equal(m.resumeStudy().a.id,'mindfulness');assert.equal(m.resumeStudy().page,'reflect');
assert.match(m.views.home().body,/继续上次学习/);
m.setCategory('正人');m.views.category();assert.equal(m.resumeStudy().a.id,'mindfulness','browsing a category never changes resume');
assert.equal(m.recordStudy(m.getData().assignments.find(a=>a.id==='bodhi'),'read'),false,'another learner cannot change resume');
assert.equal(m.recordStudy(a1,'category'),false);
for(const [branch,count] of [['正人',8],['正信',7],['正愿',2],['正行',7]]){m.setCategory(branch);assert.equal(m.categoryCourses(branch).length,count);const out=m.views.category().body;assert.ok(out.indexOf('已安排')<out.indexOf('未安排'));}
m.setCategory('正见');const theory=m.views.category().body;assert.match(theory,/因缘果/);assert.match(theory,/四念处/);assert.doesNotMatch(theory,/菩提心|轮回路险|data-go="course"/,'theory aggregates only this learner opened courses');
assert.match(theory,/data-go="read"/);
const reload=load('','http:','',JSON.stringify(m.getData()));assert.equal(reload.resumeStudy().a.id,'mindfulness');assert.equal(reload.resumeStudy().page,'reflect');
const empty=m.seed();empty.assignments=empty.assignments.filter(a=>a.student!=='m1');const emptyModel=load('','http:','',JSON.stringify(empty));assert.equal(emptyModel.resumeStudy().a,undefined);assert.match(emptyModel.views.home().body,/暂无已安排课程/);
for(const protocol of ['http:','file:']){const q='role=student&page=category&branch='+encodeURIComponent('正信'),r=load(protocol==='file:'?'':'?'+q,protocol,protocol==='file:'?'#'+q:'');assert.equal(new URLSearchParams(r.url().slice(1)).get('branch'),'正信');assert.match(r.views.category().bar,/正信课程/);}
const locked=load('?role=student&page=course&course=samsara&from=category&branch='+encodeURIComponent('正信'));assert.match(locked.views.course().bar,/data-go="category"/);assert.match(locked.views.course().body,/内容锁定/);
const theoryRead=load('?role=student&page=read&task=karma&from=category&branch='+encodeURIComponent('正见'));assert.match(theoryRead.views.read().bar,/data-go="category"/);assert.match(theoryRead.views.read().footer,/返回正见/);
console.log('Category navigation passed: 5 direct petals, 24 courses, opened theory aggregation, locked entries, persistent independent resume, empty state and offline routes.');

// Tools feed the shared timeline, without completing or changing a course definition.
const toolsModel=load();toolsModel.go('student','task','karma');const state=toolsModel.getData();
toolsModel.T.start(state.tools,'karma',1000);toolsModel.T.saveTimer(state.tools,6000);
toolsModel.T.addCount(state.tools,8);toolsModel.T.saveCount(state.tools,7000);
assert.equal(toolsModel.timeline('m1').filter(r=>r.kind==='timer').length,1);
assert.equal(toolsModel.timeline('m1').filter(r=>r.kind==='chant').length,1);
assert.ok(toolsModel.timeline('m2').every(r=>r.student==='m2'&&r.kind==='assignment'),'another learner sees only their own arrangement, no m1 tools');
assert.equal(toolsModel.canSubmit(state.assignments.find(a=>a.id==='karma')),false);
assert.equal(state.assignments.find(a=>a.id==='karma').status,'active');
assert.match(toolsModel.views.read().body,/课程教材|教材|讲解资料待接入/);
assert.match(toolsModel.views.reader().body,/暂无可阅读正文/);assert.doesNotMatch(toolsModel.views.reader().body,/讲义示例|学习之前/);
console.log('Shared timeline passed: actual tool records, learner isolation and course completion gates remain intact.');

// Entry context and date/record filters do not mutate course rules.
for(const view of ['task','read','article','think','practice'])assert.doesNotMatch(toolsModel.views[view]().body,/data-go="timer"|data-action="start-timer"/,'course does not expose a separate timer entry');
assert.match(toolsModel.views.practice().body,/data-action="start-practice" disabled/,'unconfirmed practice cannot start');
assert.match(toolsModel.views.think().body,/data-go="reflect"/);assert.doesNotMatch(toolsModel.views.think().body,/textarea/,'pending forms and actual reflection are distinct surfaces');
const automatic=load();for(const page of ['home','category','task','read','think','practice','reader']){automatic.go('student',page,'karma');assert.equal(automatic.getData().tools.timer,null,page+' without content must not start timing');}
automatic.go('student','reflect','karma');assert.equal(automatic.getData().tools.timer.stage,'si');assert.equal(automatic.getData().tools.timer.assignmentId,'karma');assert.match(automatic.views.reflect().body,/textarea/);automatic.go('student','read','karma');assert.equal(automatic.getData().tools.timer,null,'leaving reflection closes the automatic session');
const personalReader=load();personalReader.T.importText(personalReader.getData().tools,'user.txt','actual personal text');personalReader.go('student','reader');assert.equal(personalReader.getData().tools.timer.stage,'wen');assert.equal(personalReader.getData().tools.timer.assignmentId,null);personalReader.go('teacher','students');assert.equal(personalReader.getData().tools.timer,null,'leaving personal reading closes its automatic session');
const recordState=toolsModel.getData();toolsModel.T.start(recordState.tools,'karma',Date.now()-5000,'si');toolsModel.T.prepareTimerEnd(recordState.tools);recordState.tools.timer.review.reflection='计时心得验证';const sessionRecord=toolsModel.T.saveTimer(recordState.tools);toolsModel.ui.historyDay=toolsModel.T.dayKey(sessionRecord.at);toolsModel.ui.recordFilter='reflection';
assert.match(toolsModel.historyPanel('m1'),/有心得/);assert.match(toolsModel.historyPanel('m1'),/每日修学计时累计/);
assert.doesNotMatch(toolsModel.historyPanel('m2'),/有心得/);
assert.equal(recordState.assignments.find(a=>a.id==='karma').reflection,'','session note does not overwrite course reflection');
assert.equal(toolsModel.canSubmit(recordState.assignments.find(a=>a.id==='karma')),false);
const restoredRoute=load('?role=student&page=timer&scope=karma&stage=wen');assert.match(restoredRoute.url(),/stage=wen/);assert.doesNotMatch(restoredRoute.views.timer().body,/id="timer-scope"/,'personal timer does not offer course association');assert.match(restoredRoute.views.timer().body,/value="wen" checked/);
const backToReview=toolsModel.seed();toolsModel.T.start(backToReview.tools,'karma',1000,'wen');toolsModel.T.prepareTimerEnd(backToReview.tools,2000);toolsModel.T.start(backToReview.tools,null,3000);const staleReview=load('?role=student&page=timer-review','http:','',JSON.stringify(backToReview));assert.equal(new URLSearchParams(staleReview.url().slice(1)).get('page'),'timer','back navigation cannot confirm a running timer as paused');
const detailDate=load('?role=student&page=record-detail&record=not-found&day=2026-10-22');assert.match(detailDate.url(),/day=2026-10-22/,'record detail keeps selected history date across refresh');
console.log('Timer product flow passed: contextual course/stage entry, reflection filter, daily learner isolation and unchanged course gates.');

// User-authorized article sample stays labeled and cannot become formal course progress.
const sample=load('?role=student&page=article&task=mindfulness&from=category');const sampleData=sample.getData();
assert.equal(sampleData.tools.timer.demo,true);assert.equal(sampleData.tools.timer.assignmentId,'mindfulness');assert.equal(sampleData.tools.timer.stage,'wen');assert.equal(sampleData.tools.reader.document,null,'sample never overwrites a personal file');
assert.match(sample.views.article().body,/原型演示|正式教材待接入/);assert.match(sample.views.read().body,/开始学习/);
sample.T.turnDemo(sampleData.tools,'mindfulness',1,sample.DEMO_ARTICLE.title,3);sample.T.bookmarkDemo(sampleData.tools,'mindfulness',sample.DEMO_ARTICLE.title,3);
const sampleReload=load('?role=student&page=article&task=mindfulness&from=category','http:','',JSON.stringify(sampleData));assert.equal(sampleReload.getData().tools.demoReadings.mindfulness.page,1);assert.equal(sampleReload.getData().tools.demoReadings.mindfulness.bookmarks.length,1);assert.equal(sampleReload.timeline('m1').filter(r=>r.kind==='reading'&&r.demo).length,1);assert.ok(sampleReload.timeline('m2').every(r=>r.kind==='assignment'&&r.student==='m2'));
assert.match(sampleReload.url(),/from=category/);assert.match(sampleReload.views.article().body,/看见念头，也看见感受/);assert.equal(sampleReload.canSubmit(sampleData.assignments.find(a=>a.id==='mindfulness')),false);
sample.T.prepareTimerEnd(sampleData.tools,Date.now()+5000);const sampleRecord=sample.T.saveTimer(sampleData.tools,Date.now()+5000);assert.equal(sampleRecord.demo,true);const actualTotals=sample.T.dailyTimers(sampleData.tools,sample.T.dayKey(sampleRecord.at));assert.equal(actualTotals.seconds,0);assert.ok(actualTotals.demoSeconds>=5,'demo time is separate from actual totals');
console.log('Article sample passed: direct learning entry, labeled body, restored chapter/bookmark, personal-file isolation, learner isolation and separate demo totals.');

// Reader overlays pause the same reading session; old manual reader pauses migrate to automatic behavior.
const readingPanel=load('?role=student&page=article&task=karma');
for(const panel of ['reader-settings','reader-directory','reader-bookmarks']){
 readingPanel.ui.modal=panel;readingPanel.syncLearningTimer();
 assert.equal(readingPanel.getData().tools.timer.status,'paused');
 readingPanel.ui.modal=null;readingPanel.syncLearningTimer();
 assert.equal(readingPanel.getData().tools.timer.status,'running');
}
readingPanel.T.userPause(readingPanel.getData().tools);readingPanel.ui.modal='reader-settings';readingPanel.syncLearningTimer();
readingPanel.ui.modal=null;readingPanel.syncLearningTimer();assert.equal(readingPanel.getData().tools.timer.status,'running');
readingPanel.T.setReaderPreference(readingPanel.getData().tools,'fontFamily','sans');
assert.match(readingPanel.views.article().body,/font-family:-apple-system/);
assert.doesNotMatch(readingPanel.views.article().body,/目录与阅读设置/);
assert.match(readingPanel.views.article().footer,/阅读工具/);
console.log('Reader overlays passed: explicit settings entry, applied font, automatic pause/resume and legacy-reading-pause migration.');

// Reading exits save automatically, while transient overlays and backgrounding do not end a session.
const autoRead=load('?role=student&page=article&task=karma'),autoTools=autoRead.getData().tools;
const readingId=autoTools.timer.id;autoTools.timer.elapsedMs=6000;
assert.match(autoRead.timerRibbon(),/本次阅读/);
assert.doesNotMatch(autoRead.timerRibbon(),/<button|data-go|data-action|暂停|结束并记录/);
autoRead.setHidden(true);autoRead.syncLearningTimer();
assert.equal(autoTools.timer.status,'paused');assert.equal(autoTools.records.filter(r=>r.kind==='timer').length,0);
autoRead.setHidden(false);autoRead.syncLearningTimer();
assert.equal(autoTools.timer.status,'running');assert.equal(autoTools.timer.id,readingId);
autoRead.T.turnDemo(autoTools,'karma',1,autoRead.DEMO_ARTICLE.title,3);autoRead.syncLearningTimer();
assert.equal(autoTools.timer.id,readingId,'chapter changes stay in the same reading session');
autoRead.go('student','read');
const savedReading=autoTools.records.find(r=>r.id===readingId);
assert.equal(autoTools.timer,null);assert.ok(savedReading.seconds>=6);
assert.equal(savedReading.assignmentId,'karma');assert.equal(savedReading.stage,'wen');assert.equal(savedReading.demo,true);
assert.match(autoRead.ui.toast,/本次阅读.*已记录/);assert.equal(autoRead.T.dailyTimers(autoTools).seconds,0);
autoRead.go('student','home');assert.equal(autoTools.records.filter(r=>r.id===readingId).length,1);
autoRead.go('student','article','mindfulness');
assert.notEqual(autoTools.timer.id,readingId);assert.equal(autoTools.timer.assignmentId,'mindfulness');
assert.equal(autoRead.getData().assignments.find(a=>a.id==='karma').status,'active');
const reloadReading=load('?role=student&page=article&task=mindfulness','http:','',JSON.stringify(autoRead.getData()));
assert.equal(reloadReading.getData().tools.timer.id,autoTools.timer.id,'refresh restores the checkpoint without a new record');
const storage={fail:false},failedReading=load('?role=student&page=article&task=karma','http:','',null,storage);
failedReading.getData().tools.timer.elapsedMs=5000;const unsavedId=failedReading.getData().tools.timer.id;
storage.fail=true;failedReading.go('student','read');
assert.equal(failedReading.getData().tools.timer.id,unsavedId);assert.equal(failedReading.getData().tools.timer.status,'paused');
assert.equal(failedReading.getData().tools.records.filter(r=>r.kind==='timer').length,0);assert.match(failedReading.ui.toast,/暂未保存/);
storage.fail=false;failedReading.syncLearningTimer();
assert.equal(failedReading.getData().tools.timer,null);assert.equal(failedReading.getData().tools.records.filter(r=>r.id===unsavedId).length,1);
console.log('Automatic reading exit passed: display-only ribbon, settings/background boundaries, one record per session, refresh, demo isolation and failed-save recovery.');

// Resume points belong to actual learning, not browsing or returning through directories.
const resumed=load('?role=student&page=article&task=karma'),resumedData=resumed.getData(),resumeKarma=resumedData.assignments.find(a=>a.id==='karma'),resumeMind=resumedData.assignments.find(a=>a.id==='mindfulness');
resumed.T.turnDemo(resumedData.tools,'karma',1,resumed.DEMO_ARTICLE.title,3);resumedData.tools.demoReadings.karma.scrollTop=325;
for(const destination of ['read','task','think','practice','category','course-progress']){
 assert.equal(resumed.recordStudy(resumeMind,destination),false);resumed.go('student',destination,'mindfulness');
 assert.equal(resumed.resumeStudy().a.id,'karma');assert.equal(resumed.resumeStudy().page,'article','directory navigation cannot overwrite actual-content resume');
}
resumed.recordStudy(resumeMind,'reflect');assert.equal(resumed.resumeStudy().a.id,'mindfulness');assert.equal(resumed.resumeStudy().page,'reflect');
assert.equal(resumed.actualStudyPosition(resumeKarma).page,'article');assert.equal(resumed.courseNext(resumeKarma).page,'article','each course retains its own learning position');
assert.equal(resumed.recordStudy(resumedData.assignments.find(a=>a.student==='m2'),'article'),false);assert.equal(resumed.resumeStudy().a.id,'mindfulness');
const resumedReload=load('?role=student&page=home','http:','',JSON.stringify(resumedData));assert.equal(resumedReload.resumeStudy().page,'reflect');assert.equal(resumedReload.getData().tools.demoReadings.karma.page,1);assert.equal(resumedReload.getData().tools.demoReadings.karma.scrollTop,325);
resumeMind.status='completed';assert.equal(resumed.actualStudyPosition(resumeMind),null);assert.equal(resumed.resumeStudy().a.id,'karma','completed assignments cannot steal the continue action');
const oldResume=resumed.seed();oldResume.lastStudy={assignmentId:'karma',page:'practice'};oldResume.assignments[0].events.push({kind:'study',page:'article',atISO:'2026-10-23T02:00:00Z'});
const migratedResume=load('?role=student&page=home','http:','',JSON.stringify(oldResume));assert.equal(migratedResume.resumeStudy().page,'article','actual legacy study evidence recovers a pointer formerly overwritten by a placeholder');
console.log('Actual-content resume passed: directory returns, per-course positions, chapter/scroll persistence, learner isolation and legacy recovery.');

// Reflection draft and automatic duration close together without a second timer confirmation.
const reflected=load('?role=student&page=reflect&task=karma'),reflectionData=reflected.getData(),reflectionCourse=reflectionData.assignments.find(a=>a.id==='karma');
assert.match(reflected.timerRibbon(),/本次反思/);assert.doesNotMatch(reflected.timerRibbon(),/<button|结束并记录|暂停计时/);
reflectionCourse.reflectionDraft={text:'  测试心得  ',question:'测试问题'};assert.equal(reflected.reflectionValues(reflectionCourse).text,'  测试心得  ');
reflectionData.tools.timer.elapsedMs=5000;const reflectionTimerId=reflectionData.tools.timer.id;
reflected.go('student','article','karma');
assert.equal(reflectionCourse.reflection,'测试心得');assert.equal(reflectionCourse.question,'测试问题');assert.equal(reflectionCourse.reflectionDraft,undefined);
assert.equal(reflectionCourse.events.filter(e=>e.kind==='reflection').length,1);assert.equal(reflectionData.tools.records.find(r=>r.id===reflectionTimerId).stage,'si');assert.equal(reflectionData.tools.timer.origin,'article','reflection exit frees the slot for immediate reading');
reflectionCourse.reflectionDraft={text:'测试心得',question:'测试问题'};reflected.saveReflectionSnapshot(reflectionCourse);assert.equal(reflectionCourse.events.filter(e=>e.kind==='reflection').length,1,'saving an unchanged draft does not duplicate reflection');
const emptyReflection=reflected.getData().assignments.find(a=>a.id==='mindfulness');emptyReflection.reflectionDraft={text:'  ',question:''};reflected.saveReflectionSnapshot(emptyReflection);assert.equal(emptyReflection.events.filter(e=>e.kind==='reflection').length,0,'empty untouched drafts create no fake reflection event');
const failingStore={fail:false},reflectionFailure=load('?role=student&page=reflect&task=karma','http:','',null,failingStore),failureCourse=reflectionFailure.getData().assignments[0];failureCourse.reflectionDraft={text:'尚未保存的心得',question:'待保留问题'};failingStore.fail=true;assert.equal(reflectionFailure.flushReflection(failureCourse),false);assert.equal(failureCourse.reflectionDraft.text,'尚未保存的心得');assert.equal(failureCourse.events.filter(e=>e.kind==='reflection').length,0);failingStore.fail=false;assert.equal(reflectionFailure.flushReflection(failureCourse),true);assert.equal(failureCourse.events.filter(e=>e.kind==='reflection').length,1);
const preservedManual=load(),manualTools=preservedManual.getData().tools;preservedManual.T.start(manualTools,null,Date.now(),'xiu');const manualId=manualTools.timer.id;preservedManual.go('student','reflect','karma');preservedManual.go('student','read','karma');assert.equal(manualTools.timer.id,manualId);assert.equal(manualTools.timer.stage,'xiu');assert.equal(manualTools.timer.status,'running');
for(const field of ['review','draftReview']){const pending=load('?role=student&page=reflect&task=karma'),pendingTools=pending.getData().tools;pending.T.pause(pendingTools);pendingTools.timer[field]={seconds:5,measuredSeconds:5,reflection:'原有待确认内容'};const id=pendingTools.timer.id;pending.go('student','read');assert.equal(pendingTools.timer.id,id);assert.equal(pendingTools.timer[field].reflection,'原有待确认内容');assert.equal(pendingTools.records.filter(r=>r.kind==='timer').length,0);}
assert.equal(reflected.canSubmit(reflectionCourse),false);assert.equal(reflectionCourse.status,'active');
console.log('Reflection wrap-up passed: draft commit/deduplication, empty and failed save protection, measured si record, reading handoff and manual/legacy session isolation.');

// Reminders come from real local assignment/guidance events; reads and new updates remain independent.
const feedback=load(),feedbackData=feedback.getData(),feedbackCourse=feedbackData.assignments.find(a=>a.id==='karma');
assert.equal(feedback.noticeItems().filter(n=>n.kind==='guidance').length,0,'no fabricated teacher feedback');
feedback.go('teacher','configure','karma','m1');assert.equal(feedback.saveGuidance(feedbackCourse,'测试法师指导',''),true);
let feedbackItems=feedback.noticeItems(),firstFeedback=feedbackItems.find(n=>n.kind==='guidance');assert.ok(firstFeedback);assert.equal(firstFeedback.assignmentId,'karma');assert.equal(firstFeedback.unread,true);
const guidanceCount=feedbackCourse.events.filter(e=>e.kind==='guidance').length;assert.equal(feedback.saveGuidance(feedbackCourse,'测试法师指导',''),false);assert.equal(feedbackCourse.events.filter(e=>e.kind==='guidance').length,guidanceCount,'unchanged save creates no duplicate alert');
feedback.go('student','notices');assert.equal(feedback.markNoticeRead(firstFeedback),true);assert.equal(feedback.noticeItems().find(n=>n.token===firstFeedback.token).unread,false);
const feedbackReload=load('?role=student&page=home','http:','',JSON.stringify(feedbackData));assert.equal(feedbackReload.noticeItems().find(n=>n.token===firstFeedback.token).unread,false,'read state survives reload');
feedback.go('teacher','configure','karma','m1');assert.equal(feedback.saveGuidance(feedbackCourse,'第二次测试指导',''),true);feedbackItems=feedback.noticeItems();assert.equal(feedbackItems.filter(n=>n.kind==='guidance'&&n.unread).length,1);assert.equal(feedbackItems.find(n=>n.token===firstFeedback.token).unread,false,'new guidance does not re-mark an old notice unread');
const m2Before=JSON.stringify(feedback.noticeItems('m2'));feedback.go('student','home');assert.equal(feedback.saveGuidance(feedbackCourse,'学员不能发布指导',''),false);assert.equal(JSON.stringify(feedback.noticeItems('m2')),m2Before);
const otherCourse=feedbackData.assignments.find(a=>a.student==='m2');feedback.go('teacher','configure',otherCourse.id,'m2');assert.equal(feedback.saveGuidance(feedbackCourse,'不能替其他学员修改',''),false);assert.equal(feedback.saveGuidance(otherCourse,'仅给另一位学员的指导',''),true);assert.ok(feedback.noticeItems('m2').some(n=>n.text==='仅给另一位学员的指导'));assert.ok(feedback.noticeItems().every(n=>n.student==='m1'&&n.text!=='仅给另一位学员的指导'));
feedback.go('student','home');assert.equal(feedback.markNoticeRead(feedback.noticeItems('m2').find(n=>n.kind==='guidance')),false,'learner cannot mark another learner reminder read');
assert.equal(feedbackCourse.status,'active');assert.equal(feedback.canSubmit(feedbackCourse),false);
console.log('Teacher reminders passed: real changes only, unchanged-save deduplication, selected read persistence, new update unread state, role/learner isolation and unchanged course gates.');

// A personal journey combines evidence, without inventing stages or missing dates.
const route=load(),rd=route.getData();assert.equal(route.ui.tab,'path');assert.equal(route.ui.historyDay,'');assert.equal(route.timeline('m1').filter(r=>r.kind==='assignment').length,2);assert.equal(route.timeline('m1').filter(r=>r.kind==='completion').length,0);for(const title of ['已完成','正在修学','后续安排'])assert.ok(route.views.journey().body.includes(title));assert.doesNotMatch(route.views.journey().body,/path-day|history-entry/,'event feed stays behind detailed records');assert.doesNotMatch(route.views.journey().body,/修学入门|正信基础|本周计划|本周修学|本周回顾/);
const ra=rd.assignments.find(a=>a.id==='karma');assert.equal(route.eventTime(route.timeline('m1').find(r=>r.kind==='assignment')),'具体时刻未记录');
route.recordStudy(ra,'task');route.recordStudy(ra,'read');route.recordStudy(ra,'think');assert.equal(ra.events.length,0,'directory visits create no learning milestones');route.recordStudy(ra,'reflect');route.recordStudy(ra,'reflect');assert.equal(ra.events.filter(e=>e.kind==='study').length,1,'refresh/re-entry on the same day is not a new start');
ra.events.push({kind:'guidance',atISO:'2026-10-24T01:00:00Z',text:'fixture guidance'},{kind:'reflection',at:'old partial time',text:'legacy note'});const mixed=route.timeline('m1');assert.equal(mixed[0].kind,'guidance');assert.ok(mixed.some(r=>r.kind==='reflection'&&r.at===null),'partial old times are not assigned a made-up date');assert.equal(route.matchesPath(mixed[0],'guidance'),true);assert.equal(route.pathKind({kind:'timer',stage:'xiu'}),'practice');assert.equal(route.pathKind({kind:'chant'}),'practice');assert.equal(route.pathKind({kind:'timer',stage:'wen'}),'learning');
const ownBefore=route.timeline('m2').map(r=>r.id).join();ra.events.push({kind:'completion',atISO:'2026-10-25T01:00:00Z',text:'unconfirmed fixture'});assert.equal(route.timeline('m1').some(r=>r.kind==='completion'),false,'a raw event cannot override an unconfirmed course');ra.status='completed';assert.equal(route.timeline('m1').filter(r=>r.kind==='completion'&&r.assignmentId==='karma').length,1);assert.equal(route.timeline('m2').map(r=>r.id).join(),ownBefore);
route.ui.recordFilter='completion';assert.match(route.historyPanel('m1'),/法师确认课程完成/);assert.doesNotMatch(route.historyPanel('m2'),/法师确认课程完成<\/strong>/);route.ui.recordFilter='all';route.ui.historyDay='2026-10-24';assert.match(route.historyPanel('m1'),/fixture guidance/);assert.doesNotMatch(route.historyPanel('m1'),/legacy note/);
const fresh=load();const published=fresh.publishCourses(['bodhi'],'m1','first instruction','first requirements')[0];assert.ok(published.assignedAtISO);assert.equal(published.initialGuidance,'first instruction');published.guidance='changed';assert.equal(fresh.timeline('m1').find(r=>r.id==='assignment-'+published.id).text,'first instruction','later guidance does not rewrite the original arrangement');
assert.equal(load('?role=student&page=journey&tab=arrangements').ui.tab,'path');assert.equal(load('?role=student&page=journey&tab=records').ui.tab,'records');assert.match(load('?role=teacher&page=records&student=m2&task=bodhi').url(),/page=records/);
const compact=route.pathEntries([{id:'p',kind:'reading',demo:true,assignmentId:'karma',at:'2026-10-23T03:00:00Z'},{id:'s',kind:'study',page:'article',demo:true,assignmentId:'karma',at:'2026-10-23T02:00:00Z'}]);assert.equal(compact.length,1,'reading position metadata is attached to learning, not repeated as another path step');
console.log('Personal journey passed: arrangement/study/practice/guidance/completion evidence, no fake stages/times, deduped starts, immutable arrangement snapshot, filters and learner isolation.');

// One node per assigned course; actual status determines the personal route, not reading time or catalog order.
const personal=load('?role=student&page=journey&week=2026-10-19&weekOnly=1'),pd=personal.getData();
let groups=personal.routeGroups('m1');
assert.equal(groups.completed.length,0);assert.equal(groups.current.length,2);assert.equal(groups.planned.length,0);
assert.deepEqual(Array.from(groups.current,a=>a.courseId).sort(),['karma','mindfulness']);
assert.ok(groups.current.every(a=>a.status==='active'),'unvisited assigned courses remain current');
const overview=personal.views.journey().body;
for(const title of ['已完成','正在修学','后续安排'])assert.ok(overview.includes(title));
assert.equal((overview.match(/data-go="course-progress"/g)||[]).length,2,'only two actual assignments become course nodes');
assert.doesNotMatch(overview,/菩提心|轮回路险|四正勤|四如意足|人间净土<\/|信自信他/,'unassigned catalog entries do not become future steps');
assert.doesNotMatch(overview,/本周修学|本周计划|本周回顾|加入计划|标记落实|weekly-plan-row|path-event|history-entry|修学入门|正信基础/);
assert.doesNotMatch(personal.url(),/week=|weekOnly=/,'old weekly filters do not persist in route URLs');
assert.equal(new URLSearchParams(load('?role=student&page=weekly-review&week=2026-10-19').url().slice(1)).get('page'),'journey','old review URLs open the personal route');
const beforeProgress=JSON.stringify(pd.assignments);
personal.go('student','course-progress','karma');
let progress=personal.courseProgress();
assert.match(progress.body,/因缘果/);assert.match(progress.body,/待.*确认|待接入/);
assert.equal(pd.tools.timer,null,'course detail and requirement placeholders never start automatic timing');
assert.equal(JSON.stringify(pd.assignments),beforeProgress,'viewing course progress never writes a study event');
assert.match(personal.url(),/page=course-progress/);assert.match(personal.url(),/task=karma/);
assert.doesNotMatch(progress.body,/完成度\s*\d+%|已完成\s*\d+\/\d+|周计划/,'unknown course requirements do not yield a fabricated percentage');
const pa=pd.assignments.find(a=>a.id==='karma');
pa.events.push({kind:'completion',atISO:'2026-10-25T01:00:00Z',text:'未经确认的完成事件'});
assert.equal(personal.routeGroups('m1').completed.length,0,'a raw completion event cannot promote an active course');
pa.reflection='保存过心得';pa.reflectionAt='2026-10-24';
pd.tools.records.push({id:'route-duration',student:'m1',assignmentId:'karma',kind:'timer',stage:'si',seconds:36000,at:'2026-10-24T01:00:00Z'});
assert.equal(personal.routeGroups('m1').completed.length,0,'duration and reflection cannot generate a completed node');
assert.equal(personal.canSubmit(pa),false);
pa.events=pa.events.filter(e=>e.kind!=='completion');
pa.status='completed';pa.completedAt='2026-10-25T01:00:00Z';pa.confirmationComment='已核对本课修学记录';
groups=personal.routeGroups('m1');assert.equal(groups.completed.length,1);assert.equal(groups.current.length,1);
personal.go('student','course-progress','karma');progress=personal.courseProgress();
assert.match(progress.body,/因缘果/);assert.match(progress.body,/确认|完成/);
assert.doesNotMatch(progress.body,/data-go="(?:task|read|article|think|reflect|practice|submit)"|data-action="course-next"/,'completed detail only reviews existing evidence');
assert.equal(personal.isOpened(personal.courseById('karma'),'m1'),false,'completed course does not silently reopen');
assert.equal(pd.tools.timer,null);
const planned=personal.newAssignment('samsara','m1','future-samsara',{status:'planned',guidance:'法师明确的后续安排',requirements:'尚未确认'});
pd.assignments.push(planned);groups=personal.routeGroups('m1');
assert.equal(groups.planned.length,1);assert.equal(groups.planned[0].id,'future-samsara');
assert.equal(personal.isOpened(personal.courseById('samsara'),'m1'),false,'future arrangement does not grant current learning permission');
assert.ok(!personal.checkOptions().some(o=>o.courseId==='samsara'),'future arrangement does not unlock personal self-checks');
personal.go('student','course-progress','future-samsara');progress=personal.courseProgress();
assert.match(progress.body,/轮回路险/);assert.match(progress.body,/法师明确的后续安排/);
assert.doesNotMatch(progress.body,/data-go="(?:task|read|article|think|reflect|practice|submit)"|data-action="course-next"/,'planned detail has no learning action');
assert.equal(pd.tools.timer,null);
personal.go('student','article','future-samsara');assert.equal(new URLSearchParams(personal.url().slice(1)).get('page'),'course-progress','direct links cannot bypass future-course read-only state');assert.equal(pd.tools.timer,null);
personal.go('student','reflect','karma');assert.equal(new URLSearchParams(personal.url().slice(1)).get('page'),'course-progress','direct links cannot bypass completed-course read-only state');assert.equal(pd.tools.timer,null);
const repeated=personal.newAssignment('karma','m1','repeat-karma',{status:'active'});pd.assignments.push(repeated);
groups=personal.routeGroups('m1');assert.equal(groups.completed.filter(a=>a.courseId==='karma').length,0);assert.equal(groups.current.filter(a=>a.courseId==='karma').length,1,'repeated arrangements occupy one current course node');
assert.equal(groups.current.find(a=>a.courseId==='karma').id,'repeat-karma');
personal.go('teacher','course-progress','bodhi','m2');assert.match(personal.courseProgress().body,/菩提心/);assert.doesNotMatch(personal.courseProgress().body,/保存过心得|已核对本课修学记录|法师明确的后续安排/);
personal.go('teacher','course-progress','karma','m2');assert.equal(personal.current().student,'m2','teacher detail matches the selected learner even with a stale assignment URL');
personal.go('student','course-progress','bodhi');assert.equal(personal.current().student,'m1','student detail cannot expose another learner');assert.doesNotMatch(personal.courseProgress().body,/菩提心/);
const evidence=load(),ed=evidence.getData();assert.equal(evidence.courseNext(ed.assignments[0]).page,'read');
ed.assignments[0].events.push({kind:'guidance',text:'actual new guidance',atISO:'2026-10-23T02:00:00Z'});assert.equal(evidence.courseNext(ed.assignments[0]).label,'查看新指导');const nextGuidance=evidence.courseNext(ed.assignments[0]).record;ed.planner.guidanceSeen.karma=nextGuidance.id+'|'+nextGuidance.at;assert.equal(evidence.courseNext(ed.assignments[0]).page,'read');
const legacy=evidence.seed();legacy.planner.weeks={'m1|2026-10-19':{review:{gain:'旧回顾保留'},items:[{title:'旧计划'}]}};
const preserved=load('?role=student&page=journey','http:','',JSON.stringify(legacy));assert.equal(JSON.stringify(preserved.getData().planner.weeks),JSON.stringify(legacy.planner.weeks),'removing weekly UI preserves existing local storage');assert.doesNotMatch(preserved.views.journey().body,/旧回顾保留|旧计划/);
const noPlanner=evidence.seed();delete noPlanner.planner;const migrated=load('','http:','',JSON.stringify(noPlanner));assert.equal(migrated.getData().assignments.length,4);assert.deepEqual(Object.keys(migrated.getData().planner.guidanceSeen),[]);
const completedOnly=evidence.seed();completedOnly.assignments=completedOnly.assignments.filter(a=>a.student!=='m1');for(const [i,id] of ['karma','mindfulness','bodhi'].entries())completedOnly.assignments.push(evidence.newAssignment(id,'m1','done-'+i,{status:'completed',completedAt:`2026-10-${23+i}T01:00:00Z`}));
const archive=load('?role=student&page=journey','http:','',JSON.stringify(completedOnly));assert.equal(archive.routeGroups('m1').completed.length,3);assert.match(archive.views.journey().body,/<details[\s>]/,'older completed courses are expandable');
console.log('Personal course route passed: three factual groups, course-level nodes, scoped progress detail, read-only completed/future courses, no invented sequence or requirements, preserved old storage and no weekly UI.');

// The shipped offline snapshot must contain exactly the current sources, with no external dependencies.
const offline=fs.readFileSync(path.join(root,'..','delivery','1.html'),'utf8');
assert.ok(!/<script[^>]+src=|<link[^>]+href="styles\.css"/.test(offline));
const blocks=[...offline.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)].map(m=>m[1]);
assert.equal(blocks.length,4);for(const block of blocks)new vm.Script(block);
for(const [i,name] of ['curriculum.js','study-tools.js','study-notices.js','app.js'].entries())assert.equal(blocks[i],fs.readFileSync(path.join(root,name),'utf8').replace(/<\/script/gi,'<\\/script'));
console.log('Offline snapshot passed: current catalog/app inline, syntax valid, no external CSS/script dependencies.');
